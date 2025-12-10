import { IsNumber, IsPositive, IsString, IsNotEmpty } from 'class-validator';

export class TransferDto {
  @IsString()
  @IsNotEmpty()
  recipientWalletNumber: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  amount: number;
}
