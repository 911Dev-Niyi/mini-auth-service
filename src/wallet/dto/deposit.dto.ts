import { IsNumber, IsPositive, IsEmail, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class DepositDto {
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @ApiProperty({ description: 'Amount to deposit', example: 100.0 })
  amount: number;

  @IsOptional()
  @IsEmail()
  @ApiProperty({
    description:
      'Email address of the user for Paystack checkout (Optional, defaults to authenticated user email).',
    example: 'testuser@wallet.com',
  })
  email: string;
}
