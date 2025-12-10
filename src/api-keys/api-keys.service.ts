import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApiKey } from '../users/entities/api-key.entity';
import { User } from '../users/entities/user.entity';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';
import { CreateApiKeyDto } from './dto/create-api-key.dto';
import { RolloverApiKeyDto } from './dto/rollover-api-key.dto';

function calculateExpiryDate(expiry: string): Date {
  const expiryString = String(expiry);
  const now = new Date();
  const unit = expiryString.slice(-1).toUpperCase();
  const value = parseInt(expiryString.slice(0, -1), 10);

  if (isNaN(value) || !['H', 'D', 'M', 'Y'].includes(unit)) {
    throw new BadRequestException(
      'Invalid expiry format. Use 1H, 1D, 1M, or 1Y.',
    );
  }

  switch (unit) {
    case 'H':
      now.setHours(now.getHours() + value);
      break;
    case 'D':
      now.setDate(now.getDate() + value);
      break;
    case 'M':
      now.setMonth(now.getMonth() + value);
      break;
    case 'Y':
      now.setFullYear(now.getFullYear() + value);
      break;
  }
  return now;
}

@Injectable()
export class ApiKeysService {
  constructor(
    @InjectRepository(ApiKey)
    private apiKeyRepository: Repository<ApiKey>,
  ) {}

  /**
   * Generate a new API Key
   */
  async create(dto: CreateApiKeyDto, user: User) {
    const count = await this.apiKeyRepository.count({
      where: { user: { id: user.id }, is_active: true },
    });

    if (count >= 5) {
      throw new ConflictException(
        'You have reached the limit of 5 active API Keys. Please revoke an old one first',
      );
    }

    const expiresAt = calculateExpiryDate(dto.expires_at as string);

    const rawKey = 'sk_live_' + crypto.randomBytes(24).toString('hex');
    const salt = await bcrypt.genSalt(10);
    const keyHash = await bcrypt.hash(rawKey, salt);
    const prefix = rawKey.substring(0, 15) + '...';

    const permissions: string[] = (dto.permissions || []) as string[];

    const apiKey = this.apiKeyRepository.create({
      key_hash: keyHash,
      prefix: prefix,
      name: dto.name,
      permissions: permissions,
      expires_at: expiresAt,
      user: user,
      is_active: true,
    });

    await this.apiKeyRepository.save(apiKey);

    return {
      message: 'API Key generated. Copy it now, you wont see it again.',
      apiKey: rawKey,
      id: apiKey.id,
      name: apiKey.name,
      permissions: permissions,
      expires_at: apiKey.expires_at,
    };
  }

  /**
   * Rollover Expired API Key
   */
  async rollover(dto: RolloverApiKeyDto, user: User) {
    // Find and validate the expired key
    const expiredKey = await this.apiKeyRepository.findOne({
      where: { id: dto.expired_key_id, user: { id: user.id } },
    });

    if (!expiredKey) {
      throw new NotFoundException('API Key not found');
    }

    if (expiredKey.is_active && expiredKey.expires_at > new Date()) {
      throw new BadRequestException(
        'The key is still active and cannot be rolled over.',
      );
    }

    // Revoke old key
    expiredKey.is_active = false;
    await this.apiKeyRepository.save(expiredKey);

    // Prepare DTO for new key, pulling permissions from the found entity
    const newKeyDto: CreateApiKeyDto = {
      name: `${expiredKey.name} (Rolled Over)`,
      permissions:
        expiredKey.permissions as unknown as CreateApiKeyDto['permissions'],
      expires_at: dto.expiry,
    };

    // Create the new key
    return this.create(newKeyDto, user);
  }

  /**
   * List all keys for a user
   */
  async findAll(user: User) {
    return this.apiKeyRepository.find({
      where: { user: { id: user.id } },
      select: [
        'id',
        'name',
        'prefix',
        'permissions',
        'created_at',
        'expires_at',
        'is_active',
      ],
      order: { created_at: 'DESC' },
    });
  }

  /**
   * Revoke (Delete) a key
   */
  async remove(id: string, user: User) {
    const key = await this.apiKeyRepository.findOne({
      where: { id, user: { id: user.id } },
    });

    if (!key) throw new NotFoundException('API Key not found');

    key.is_active = false;

    await this.apiKeyRepository.save(key);

    return { message: 'API Key revoked successfully', id: key.id };
  }

  /**
   * Validate an incoming raw API Key
   */
  async validateKey(rawKey: string) {
    const prefix = rawKey.substring(0, 15) + '...';

    const apiKeyRecord = await this.apiKeyRepository.findOne({
      where: { prefix },
      relations: ['user'],
    });

    if (!apiKeyRecord || !apiKeyRecord.is_active) {
      return null;
    }

    if (apiKeyRecord.expires_at && new Date() > apiKeyRecord.expires_at) {
      apiKeyRecord.is_active = false;
      await this.apiKeyRepository.save(apiKeyRecord);
      return null;
    }

    const isMatch = await bcrypt.compare(rawKey, apiKeyRecord.key_hash);

    if (isMatch) {
      return {
        user: apiKeyRecord.user,
        permissions: apiKeyRecord.permissions,
      };
    }

    return null;
  }
}
