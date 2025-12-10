// src/wallet/wallet.service.ts

import {
  Injectable,
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Wallet } from './entities/wallet.entity';
import { User } from '../users/entities/user.entity';
import {
  Transaction,
  TransactionStatus,
  TransactionType,
} from './entities/transaction.entity';

@Injectable()
export class WalletService {
  constructor(
    @InjectRepository(Wallet)
    private readonly walletRepository: Repository<Wallet>,
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private dataSource: DataSource,
  ) {}

  async createWallet(user: User): Promise<Wallet> {
    const walletNumber = `WL-${user.id}`;

    const newWallet = this.walletRepository.create({
      balance: 0,
      user: user,
      walletNumber: walletNumber,
    });
    return this.walletRepository.save(newWallet);
  }
  async findWalletByUserId(userId: string): Promise<Wallet> {
    const wallet = await this.walletRepository.findOne({
      where: { user: { id: userId } },
    });

    if (!wallet) {
      throw new BadRequestException('Wallet not found for this user.');
    }
    return wallet;
  }

  async getBalance(userId: string): Promise<number> {
    const wallet = await this.findWalletByUserId(userId);
    return Number(wallet.balance);
  }

  async getTransactionHistory(userId: string) {
    // Find all transactions associated with user/wallet
    const transactions = await this.transactionRepository.find({
      where: { user: { id: userId } },
      order: { created_at: 'DESC' },
      select: ['type', 'amount', 'status', 'reference'],
    });

    return transactions.map((tx) => ({
      type: tx.type,
      amount: Number(tx.amount) / 100,
      status: tx.status,
    }));
  }

  /**
   * Atomic Wallet-to-Wallet Transfer
   */
  async transferFunds(
    senderId: string,
    recipientWalletNumber: string,
    amount: number,
  ): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction('SERIALIZABLE'); // Use highest isolation for money

    try {
      // Lock Sender Wallet
      const senderWallet = await queryRunner.manager.findOne(Wallet, {
        where: { user: { id: senderId } },
        lock: { mode: 'pessimistic_write' },
      });

      if (!senderWallet) {
        throw new NotFoundException('Sender wallet not found.');
      }

      // Lock Recipient Wallet
      const recipientWallet = await queryRunner.manager.findOne(Wallet, {
        where: { walletNumber: recipientWalletNumber },
        lock: { mode: 'pessimistic_write' },
        relations: ['user'],
      });

      if (!recipientWallet) {
        throw new NotFoundException('Recipient wallet not found.');
      }

      // Insufficient Balance Check
      if (Number(senderWallet.balance) < amount) {
        throw new BadRequestException('Insufficient balance for transfer.');
      }

      // Update Balances
      senderWallet.balance = Number(senderWallet.balance) - amount;
      recipientWallet.balance = Number(recipientWallet.balance) + amount;

      await queryRunner.manager.save(senderWallet);
      await queryRunner.manager.save(recipientWallet);

      // Find User entities needed for transaction records (can be optimized later)
      const senderUser = await this.userRepository.findOne({
        where: { id: senderId },
      });
      const recipientUser = await this.userRepository.findOne({
        where: { id: recipientWallet.user.id },
      }); // Assuming user FK link

      if (!senderUser || !recipientUser) {
        throw new InternalServerErrorException(
          'User lookup failed during transfer record creation.',
        );
      }

      // Record Debit Transaction (Sender)
      const debitTx = this.transactionRepository.create({
        wallet: senderWallet,
        user: senderUser,
        type: TransactionType.WITHDRAWAL,
        amount: amount, // Stored as positive, but implied debit
        status: TransactionStatus.SUCCESS,
        reference: `TX-OUT-${Date.now()}-${senderId}`,
      });

      // Record Credit Transaction (Recipient)
      const creditTx = this.transactionRepository.create({
        wallet: recipientWallet,
        user: recipientUser,
        type: TransactionType.DEPOSIT,
        amount: amount,
        status: TransactionStatus.SUCCESS,
        reference: `TX-IN-${Date.now()}-${recipientWallet.user.id}`,
      });

      await queryRunner.manager.save(debitTx);
      await queryRunner.manager.save(creditTx);

      // 6. Commit all changes
      await queryRunner.commitTransaction();
    } catch (err) {
      await queryRunner.rollbackTransaction();
      console.error('Failed to execute atomic transfer:', err); // Re-throw exceptions that should be handled by the controller (e.g., NotFound, BadRequest)
      if (
        err instanceof NotFoundException ||
        err instanceof BadRequestException
      ) {
        throw err;
      }
      throw new InternalServerErrorException(
        'Transfer failed due to system error.',
      );
    } finally {
      await queryRunner.release();
    }
  }

  async creditWalletFromDeposit(reference: string): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();

    // Safety check before starting transaction
    if (queryRunner.isTransactionActive) {
      await queryRunner.rollbackTransaction();
    }

    await queryRunner.startTransaction();

    try {
      // Idempotency Check & Transaction Lock
      const transaction = await queryRunner.manager.findOne(Transaction, {
        where: { reference },
        relations: ['user', 'wallet'],
      });

      if (!transaction) {
        await queryRunner.rollbackTransaction();
        throw new NotFoundException('Deposit transaction not found.');
      }

      if (transaction.status === TransactionStatus.SUCCESS) {
        await queryRunner.commitTransaction();
        return; // Already processed
      }

      const wallet = await queryRunner.manager.findOne(Wallet, {
        where: { id: transaction.wallet.id },
        lock: { mode: 'pessimistic_write' },
      });

      if (!wallet) {
        await queryRunner.rollbackTransaction();
        throw new InternalServerErrorException(
          'Wallet missing, cannot credit balance.',
        );
      }

      // Update Wallet Balance (Use amount stored in the transaction record)
      wallet.balance = Number(wallet.balance) + Number(transaction.amount);
      await queryRunner.manager.save(wallet);

      // Update Transaction Status
      transaction.status = TransactionStatus.SUCCESS;
      await queryRunner.manager.save(transaction);

      await queryRunner.commitTransaction();
    } catch (err) {
      if (queryRunner.isTransactionActive) {
        await queryRunner.rollbackTransaction();
      }
      console.error('Failed to credit wallet atomically:', err);
      throw new InternalServerErrorException(
        'Atomic update failed during wallet credit.',
      );
    } finally {
      await queryRunner.release();
    }
  }

  async createPendingDepositTransaction(
    userId: string,
    amountInPrimaryUnit: number,
    reference: string,
  ): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    const wallet = await this.walletRepository.findOne({
      where: { user: { id: userId } },
    });

    if (!user || !wallet) {
      throw new NotFoundException(
        'User or Wallet not found for pending transaction.',
      );
    }

    const transaction = this.transactionRepository.create({
      user: user,
      wallet: wallet,
      amount: amountInPrimaryUnit,
      reference: reference,
      type: TransactionType.DEPOSIT,
      status: TransactionStatus.PENDING,
      description: 'Paystack deposit initialization',
    });

    await this.transactionRepository.save(transaction);
  }
}
