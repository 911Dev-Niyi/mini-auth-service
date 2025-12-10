import { IsUUID, IsString, Matches, IsNotEmpty } from 'class-validator';

export class RolloverApiKeyDto {
  @IsNotEmpty()
  @IsUUID()
  expired_key_id: string;

  @IsNotEmpty()
  @IsString()
  // Matches the required format: number followed by H, D, M, or Y
  @Matches(/^\d+(H|D|M|Y)$/, {
    message: 'Expiry must be in format: 1H, 1D, 1M, or 1Y.',
  })
  expiry: string;
}
