import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { User } from './users/entities/user.entity';
import { ApiKey } from './users/entities/api-key.entity';
import { ApiKeysModule } from './api-keys/api-keys.module';
import { AppController } from './app.controller';

@Module({
  imports: [
    // 1. Load .env file globally
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    // 2. Database Connection (Async)
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'mysql',
        host: configService.get<string>('DB_HOST'),
        port: configService.get<number>('DB_PORT'),
        username: configService.get<string>('DB_USERNAME'),
        password: configService.get<string>('DB_PASSWORD'),
        database: configService.get<string>('DB_DATABASE'),
        entities: [User, ApiKey],
        synchronize: true,
      }),
    }),

    UsersModule,
    AuthModule,
    ApiKeysModule,
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
