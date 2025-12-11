import { IsUUID, IsString, Matches, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RolloverApiKeyDto {
  @ApiProperty({
    description: 'The UUID of the expired API key to rollover',
    example: 'f3a4b5c6-d7e8-f9a0-b1c2-d3e4f5a6b7c8',
  })
  @IsNotEmpty()
  @IsUUID()
  expired_key_id: string;

  @ApiProperty({
    description: 'New expiry duration. Accepts H, D, M, Y.',
    example: '1M',
  })
  @IsNotEmpty()
  @IsString()
  // Matches the required format: number followed by H, D, M, or Y
  @Matches(/^\d+(H|D|M|Y)$/, {
    message: 'Expiry must be in format: 1H, 1D, 1M, or 1Y.',
  })
  expiry: string;
}
