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
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiSecurity,
  ApiResponse,
} from '@nestjs/swagger';

@UseGuards(CombinedAuthGuard)
@Controller('wallet')
@ApiTags('Wallet Operations')
@ApiBearerAuth('JWT')
@ApiSecurity('API Key')
export class WalletController {
  constructor(
    private readonly walletService: WalletService,
    private readonly paystackService: PaystackService,
  ) {}

  // GET /wallet/balance
  @Get('balance')
  @(Permissions(AllowedPermission.READ)())
  @ApiOperation({ summary: 'Retrieve the current wallet balance and number' })
  @ApiResponse({
    status: 200,
    description: 'Balance retrieved successfully',
    schema: {
      example: {
        walletNumber: 'WL-123456c99863h8ffh9s-yheh-52',
        balance: '500.00',
      },
    },
  })
  async getBalance(@ReqUser() user: User) {
    // Modify service call or controller logic to get the full wallet object
    const wallet = await this.walletService.findWalletByUserId(user.id);
    return {
      walletNumber: wallet.walletNumber,
      balance: wallet.balance,
    };
  }

  // POST /wallet/transfer
  @Post('transfer')
  @HttpCode(200)
  @(Permissions(AllowedPermission.TRANSFER)())
  @ApiOperation({
    summary: 'Atomically transfer funds between two user wallets',
  })
  @ApiResponse({ status: 200, description: 'Transfer completed successfully.' })
  @ApiResponse({
    status: 400,
    description: 'Insufficient balance or invalid amount.',
  })
  @ApiResponse({ status: 404, description: 'Recipient wallet not found.' })
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
  @ApiOperation({
    summary: 'Initiate a Paystack deposit and return the authorization URL',
  })
  @ApiResponse({
    status: 201,
    description: 'Deposit initiated, returns Paystack URL.',
  })
  async initializeDeposit(@Body() dto: DepositDto, @ReqUser() user: User) {
    // Ensure user has a wallet (good practice)
    await this.walletService.findWalletByUserId(user.id); // Generate a unique reference ID for Paystack and our database

    const reference = `DEP-${user.id}-${Date.now()}`; // Call Paystack API
    const paymentEmail = user.email;
    const paystackData = await this.paystackService.initializeTransaction(
      paymentEmail,
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
  @ApiOperation({
    summary: 'Get transaction history for the authenticated user',
  })
  @ApiResponse({ status: 200, description: 'Transaction history retrieved.' })
  getTransactionHistory(@ReqUser() user: User) {
    return this.walletService.getTransactionHistory(user.id);
  }

  @Get('deposit/callback')
  @Public()
  @ApiOperation({
    summary: 'Paystack browser redirect handler (Public Endpoint)',
    description:
      'This URL is provided to paystack during initialization. After payment, the users browser is redirected here. It verifies the transaction status and displays a message,  but the wallet crediting is handled by the webhook',
  })
  @ApiResponse({
    status: 200,
    description: 'Verifies transaction status and provides user feedback.',
    schema: {
      example: {
        status: 'pending',
        message:
          'Payment status received... Check your wallet balance shortly.',
      },
    },
  })
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
