import { Module, forwardRef } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';
import { JwtStrategy } from './strategies/jwt.strategy';
import { GoogleStrategy } from './strategies/google.strategy';
import { ApiKeysModule } from '../api-keys/api-keys.module';
import { ApiKeyStrategy } from './strategies/api-key.strategy';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ApiKey } from 'src/users/entities/api-key.entity';
import { WalletModule } from 'src/wallet/wallet.module';
import { ApiKeyGuard } from './guards/api-key.guard';
import { CombinedAuthGuard } from './guards/combined-auth.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, ApiKey]),
    PassportModule,
    forwardRef(() => WalletModule),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService): JwtModuleOptions => {
        const secret = configService.get<string>('JWT_SECRET');
        const expiration = configService.get<string>('JWT_EXPIRATION') || '1h';

        return {
          secret: secret,
          signOptions: {
            expiresIn: expiration as unknown as number,
          },
        };
      },
    }),
    ApiKeysModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    ApiKeyStrategy,
    GoogleStrategy,
    JwtStrategy,
    ApiKeyGuard,
    CombinedAuthGuard,
  ],
  exports: [AuthService, CombinedAuthGuard, ApiKeyGuard],
})
export class AuthModule {}
