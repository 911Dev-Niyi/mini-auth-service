import {
  Controller,
  Post,
  Body,
  Get,
  Query,
  HttpCode,
  UseGuards,
  InternalServerErrorException,
} from '@nestjs/common';
import { CombinedAuthGuard } from '../auth/guards/combined-auth.guard';
import {
  Permissions,
  AllowedPermission,
} from '../auth/decorators/permissions.decorator';
import { ReqUser } from '../auth/decorators/req-user.decorator';
import { User } from '../users/entities/user.entity';
import { WalletService } from './wallet.service';
import { PaystackService } from './paystack.service';
import { DepositDto } from './dto/deposit.dto';
import { Public } from 'src/auth/decorators/public.decorator';
import { TransferDto } from './dto/transfer.dto';

@UseGuards(CombinedAuthGuard)
@Controller('wallet')
export class WalletController {
  constructor(
    private readonly walletService: WalletService,
    private readonly paystackService: PaystackService,
  ) {}

  // GET /wallet/balance
  @Get('balance')
  @(Permissions(AllowedPermission.READ)())
  async getBalance(@ReqUser() user: User) {
    // Modify service call or controller logic to get the full wallet object
    const wallet = await this.walletService.findWalletByUserId(user.id);
    return {
      walletNumber: wallet.walletNumber, // <--- ADDED THIS FIELD
      balance: wallet.balance,
    };
  }

  // POST /wallet/transfer
  @Post('transfer')
  @HttpCode(200)
  @(Permissions(AllowedPermission.TRANSFER)())
  async transferFunds(@Body() dto: TransferDto, @ReqUser() user: User) {
    await this.walletService.transferFunds(
      user.id,
      dto.recipientWalletNumber,
      dto.amount,
    );

    return {
      status: 'success',
      message: 'Transfer completed successfully',
    };
  }

  // POST /wallet/deposit
  @Post('deposit')
  @(Permissions(AllowedPermission.DEPOSIT)())
  async initializeDeposit(@Body() dto: DepositDto, @ReqUser() user: User) {
    // Ensure user has a wallet (good practice)
    await this.walletService.findWalletByUserId(user.id); // Generate a unique reference ID for Paystack and our database

    const reference = `DEP-${user.id}-${Date.now()}`; // Call Paystack API

    const paystackData = await this.paystackService.initializeTransaction(
      user.email,
      dto.amount,
      reference,
    );

    // Check for Paystack authorization URL
    if (!paystackData.authorization_url) {
      throw new InternalServerErrorException(
        'Payment gateway initialization failed.',
      );
    }

    await this.walletService.createPendingDepositTransaction(
      user.id,
      dto.amount,
      reference,
    );

    return {
      reference: reference,
      authorization_url: paystackData.authorization_url,
    };
  }

  // GET /wallet/transactions
  @Get('transactions')
  @(Permissions(AllowedPermission.READ)())
  getTransactionHistory(@ReqUser() user: User) {
    return this.walletService.getTransactionHistory(user.id);
  }

  @Get('deposit/callback')
  @Public()
  async handlePaystackCallback(@Query('reference') reference: string) {
    if (!reference) {
      return { status: 'failed', message: 'Payment reference missing.' };
    }

    const verificationData =
      await this.paystackService.verifyTransaction(reference);

    return {
      status: verificationData.status === 'success' ? 'success' : 'pending',
      message: `Payment status received for reference ${reference}. Check your wallet balance shortly.`,
    };
  }
}
