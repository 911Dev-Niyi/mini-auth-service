import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { Wallet } from './entities/wallet.entity';
import { AuthModule } from 'src/auth/auth.module';
import { Transaction } from './entities/transaction.entity';
import { User } from '../users/entities/user.entity';
import { WalletService } from './wallet.service';
import { WalletController } from './wallet.controller';
import { PaystackService } from './paystack.service';
import { PaystackWebhookController } from './paystack.webhook.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Wallet, Transaction, User]),
    HttpModule,
    forwardRef(() => AuthModule),
  ],
  controllers: [WalletController, PaystackWebhookController],
  providers: [WalletService, PaystackService],
  exports: [WalletService, TypeOrmModule],
})
export class WalletModule {}
