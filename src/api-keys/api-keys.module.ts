import { Module } from '@nestjs/common';
import { ApiKeysService } from './api-keys.service';
import { ApiKeysController } from './api-keys.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApiKey } from '../users/entities/api-key.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ApiKey])], // <--- Add this
  controllers: [ApiKeysController],
  providers: [ApiKeysService],
  exports: [ApiKeysService], // Export if we need to check keys later
})
export class ApiKeysModule {}
