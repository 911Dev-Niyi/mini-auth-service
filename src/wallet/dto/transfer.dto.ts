import { IsNumber, IsPositive, IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger'; // <-- IMPORT SWAGGER

export class TransferDto {
  @ApiProperty({
    description: 'The unique wallet number of the recipient (e.g., WL-UUID)',
    example: 'WL-c4268e3f-4e00-47b8-80f2-70b1d30f36f9',
  })
  @IsString()
  @IsNotEmpty()
  recipientWalletNumber: string;

  @ApiProperty({
    description: 'Amount to transfer',
    example: 100.0,
    minimum: 1,
    type: Number,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  amount: number;
}
