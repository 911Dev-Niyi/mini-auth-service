/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { HttpService } from '@nestjs/axios';
import { BadRequestException, Injectable } from '@nestjs/common';
import { AxiosResponse } from 'axios';
import * as crypto from 'crypto';

// Define core Paystack API response structures
interface PaystackBaseResponse<T> {
  status: boolean;
  message: string;
  data: T;
}

interface PaystackInitializationData {
  authorization_url: string;
  reference: string;
}
interface PaystackVerificationData {
  reference: string;
  status: string; // 'success', 'failed', etc.
  amount: number; // In kobo/cents
}

type InitResponse = PaystackBaseResponse<PaystackInitializationData>;
type VerifyResponse = PaystackBaseResponse<PaystackVerificationData>;

@Injectable()
export class PaystackService {
  constructor(private readonly httpService: HttpService) {}

  /**
   * Initialize Transaction
   */
  async initializeTransaction(
    email: string,
    amount: number,
    reference: string,
  ): Promise<PaystackInitializationData> {
    const url = 'https://api.paystack.co/transaction/initialize';

    const payload = {
      email,
      amount: amount * 100, // kobo/cents
      reference,
      callback_url: `${process.env.APP_URL}/wallet/deposit/callback`,
    };

    try {
      const response: AxiosResponse<InitResponse> =
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        await this.httpService.axiosRef.post<InitResponse>(url, payload, {
          headers: {
            Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          },
        });

      return response.data.data;
    } catch (error: unknown) {
      let errorData: any = {};
      if (error && typeof error === 'object' && 'response' in error) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        errorData = (error as any).response?.data || {};
      }
      console.error('Paystack Initialization Error:', errorData);
      throw new BadRequestException(
        'Could not initialize transaction with Paystack.',
      );
    }
  }

  /**
   * Verify Transaction
   */
  async verifyTransaction(
    reference: string,
  ): Promise<PaystackVerificationData> {
    const url = `https://api.paystack.co/transaction/verify/${reference}`;

    try {
      const response: AxiosResponse<VerifyResponse> =
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        await this.httpService.axiosRef.get<VerifyResponse>(url, {
          headers: {
            Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          },
        });

      return response.data.data;
    } catch (error: unknown) {
      let errorMessage = 'Paystack verification failed for this reference.';
      if (error && typeof error === 'object' && 'message' in error) {
        errorMessage = (error as Error).message;
      }
      console.error('Paystack Verification Error:', errorMessage);
      throw new BadRequestException(errorMessage);
    }
  }

  /**
   * Webhook Signature Verification
   */
  verifyWebhookSignature(signature: string, rawBody: string): boolean {
    // Use the proper library to compute the hash (e.g., crypto/hmac-sha512)
    const hash = crypto
      .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY as string)
      .update(rawBody)
      .digest('hex');

    // Compare the computed hash with the header signature
    return hash === signature;
  }
}
