import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Wallet } from './wallet.entity';
import { User } from '../../users/entities/user.entity';

// Define the types and statuses as enums/constants for safety

export enum TransactionType {
  DEPOSIT = 'DEPOSIT',
  TRANSFER = 'TRANSFER',
  WITHDRAWAL = 'WITHDRAWAL',
}

export enum TransactionStatus {
  PENDING = 'pending',
  SUCCESS = 'success',
  FAILED = 'failed',
}

@Entity({ name: 'transactions' })
export class Transaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('decimal', { precision: 20, scale: 4 })
  amount: number;

  @Column({
    type: 'enum',
    enum: TransactionType,
  })
  type: TransactionType;

  @Column({
    type: 'enum',
    enum: TransactionStatus,
    default: TransactionStatus.PENDING,
  })
  status: TransactionStatus;

  // Mandatory unique reference for Paystack/Idempotency checks
  @Column({ unique: true, nullable: true })
  reference: string;

  @Column({ nullable: true })
  description: string;

  // The wallet responsible for this record (e.g., if it's a deposit, this is the wallet credited)
  @ManyToOne(() => Wallet, (wallet) => wallet.transactions)
  wallet: Wallet;

  // The user initiating or receiving the transaction (for history queries)
  @ManyToOne(() => User, (user) => user.transactions)
  user: User;

  // For transfers: tracks the counterparty wallet/user (optional advanced field)

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
