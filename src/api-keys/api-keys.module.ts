import { Module, forwardRef } from '@nestjs/common';
import { ApiKeysService } from './api-keys.service';
import { ApiKeysController } from './api-keys.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from 'src/auth/auth.module';
import { ApiKey } from '../users/entities/api-key.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ApiKey]), forwardRef(() => AuthModule)],
  controllers: [ApiKeysController],
  providers: [ApiKeysService],
  exports: [ApiKeysService],
})
export class ApiKeysModule {}
