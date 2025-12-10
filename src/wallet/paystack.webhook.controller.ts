import {
  Controller,
  Post,
  Body,
  Get,
  Headers,
  BadRequestException,
  HttpStatus,
  HttpCode,
  Req,
  Param,
} from '@nestjs/common';
import { PaystackService } from './paystack.service';
import { WalletService } from './wallet.service';
import type { Request } from 'express';

// Interfaces for type safety
interface WebhookPayload {
  event: string;
  data: {
    reference: string;
    status: string;
    amount: number; // Amount in kobo/cents
    currency: string;
    customer: { email: string; id: number };
  };
}

// interface VerifyRequestDto {
//   reference: string;
// }

@Controller('wallet/paystack')
export class PaystackWebhookController {
  constructor(
    private readonly paystackService: PaystackService,
    private readonly walletService: WalletService,
  ) {}

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Headers('x-paystack-signature') signature: string,
    @Body() body: WebhookPayload,
    @Req() request: Request,
  ) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const rawBody = (request as any).rawBody as unknown as string;

    const isSignatureValid = this.paystackService.verifyWebhookSignature(
      signature,
      rawBody,
    );

    if (!isSignatureValid) {
      throw new BadRequestException('Invalid webhook signature');
    }

    const { event, data } = body;

    if (event !== 'charge.success' || data.status !== 'success') {
      console.log(
        `Received non-success event: ${event} for reference: ${data.reference}`,
      );
      return {
        success: true,
        message: `Event ${event} received but not processed.`,
      };
    }

    try {
      await this.walletService.creditWalletFromDeposit(data.reference);

      return { success: true, message: 'Wallet successfully credited.' };
    } catch (error: unknown) {
      let errorMessage = 'Wallet update failed, check logs.';
      if (error instanceof Error) {
        errorMessage = error.message;
      }

      console.error(
        `Webhook processing failed for reference ${data.reference}:`,
        errorMessage,
      );
      return {
        success: true,
        message: 'Webhook processed with internal failure.',
      };
    }
  }

  @Get('deposit/:reference/status')
  async getDepositStatus(@Param('reference') reference: string) {
    const verificationData =
      await this.paystackService.verifyTransaction(reference);

    return {
      reference: verificationData.reference,
      status: verificationData.status, // Convert amount from kobo/cents back to primary unit for display
      amount: verificationData.amount / 100,
    };
  }
}
