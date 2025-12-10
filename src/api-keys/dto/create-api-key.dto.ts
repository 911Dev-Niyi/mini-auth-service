// src/auth/dto/create-api-key.dto.ts

import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  IsEnum,
} from 'class-validator';

export enum ApiKeyPermission {
  DEPOSIT = 'deposit',
  TRANSFER = 'transfer',
  WITHDRAWAL = 'withdrawal',
  READ_ONLY = 'read_only',
}

export class CreateApiKeyDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsArray()
  @IsOptional()
  @IsEnum(ApiKeyPermission, { each: true })
  permissions?: ApiKeyPermission[];

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  expires_at?: string;
}
