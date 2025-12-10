import { PassportStrategy } from '@nestjs/passport';
import {
  Strategy,
  VerifyCallback,
  StrategyOptions,
} from 'passport-google-oauth20';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from '../../users/entities/user.entity';
import { WalletService } from '../../wallet/wallet.service';

// Define the expected structure of the Google profile for safety
interface GoogleProfile {
  emails: Array<{ value: string; verified: boolean }>;
  name: { givenName: string; familyName: string };
  id: string;
}

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    private readonly configService: ConfigService,
    private readonly walletService: WalletService,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {
    const clientID = configService.get<string>('GOOGLE_CLIENT_ID');
    const clientSecret = configService.get<string>('GOOGLE_CLIENT_SECRET');
    const FINAL_CALLBACK_URL = configService.get<string>('GOOGLE_CALLBACK_URL');

    if (!clientID || !clientSecret || !FINAL_CALLBACK_URL) {
      throw new Error(
        'Google OAuth configuration is missing required environment variables.',
      );
    }

    const options: StrategyOptions = {
      clientID: clientID,
      clientSecret: clientSecret,
      callbackURL: FINAL_CALLBACK_URL,
      scope: ['email', 'profile'],
    };

    super(options);
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ): Promise<any> {
    const googleProfile = profile as GoogleProfile;

    const { emails } = googleProfile; // Safety check for emails

    if (!emails || emails.length === 0) {
      return done(
        new UnauthorizedException(
          'Google profile is missing an email address.',
        ),
      );
    }

    const email = emails[0].value;

    let user = await this.usersRepository.findOne({ where: { email } });

    if (!user) {
      user = this.usersRepository.create({
        email,
      });
      await this.usersRepository.save(user); // Wallet Hook

      await this.walletService.createWallet(user);
    }

    done(null, user);
  }
}
