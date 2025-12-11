import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  IsEnum,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum ApiKeyPermission {
  DEPOSIT = 'deposit',
  TRANSFER = 'transfer',
  WITHDRAWAL = 'withdrawal',
  READ_ONLY = 'read_only',
}

export class CreateApiKeyDto {
  @ApiProperty({
    description: 'A descriptive name for the API key,',
    example: 'Wallet-integration-service',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Permissions assigned to the key',
    example: ['read_only', 'deposit'],
  })
  @IsArray()
  @IsOptional()
  @IsEnum(ApiKeyPermission, { each: true })
  permissions?: ApiKeyPermission[];

  @ApiProperty({
    description:
      'Expirt duration. Aceepts H (Hour), D (Day), M (Month), Y (Year).',
    example: '1D',
  })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  expires_at?: string;
}
