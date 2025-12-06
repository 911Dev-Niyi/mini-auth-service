import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApiKey } from '../users/entities/api-key.entity';
import { User } from '../users/entities/user.entity';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class ApiKeysService {
  constructor(
    @InjectRepository(ApiKey)
    private apiKeyRepository: Repository<ApiKey>,
  ) {}

  /**
   * Generate a new API Key for a specific User
   */
  async create(user: User) {
    // 1. Generate a random 32-byte hex string (The "Raw Key")
    // Format: sk_live_<random_string>
    const rawKey = 'sk_live_' + crypto.randomBytes(24).toString('hex');

    // 2. Hash the key for security (like a password)
    const salt = await bcrypt.genSalt();
    const keyHash = await bcrypt.hash(rawKey, salt);

    // 3. Create the Prefix (first 7 chars) so users can identify keys
    const prefix = rawKey.substring(0, 15) + '...';

    // 4. Save to DB
    const apiKey = this.apiKeyRepository.create({
      key_hash: keyHash,
      prefix: prefix,
      user: user, // Link to the user
    });

    await this.apiKeyRepository.save(apiKey);

    // 5. RETURN THE RAW KEY ONLY ONCE
    return {
      message: 'API Key generated. Copy it now, you wont see it again.',
      apiKey: rawKey, // <--- This is the only time it is sent
      id: apiKey.id,
    };
  }

  /**
   * List all keys for a user
   */
  async findAll(user: User) {
    return this.apiKeyRepository.find({
      where: { user: { id: user.id } },
      select: ['id', 'prefix', 'created_at', 'is_active'], // Don't return the hash
    });
  }

  /**
   * Revoke (Delete) a key
   */
  async remove(id: string, user: User) {
    const key = await this.apiKeyRepository.findOne({
      where: { id, user: { id: user.id } }, // Ensure user owns the key
    });

    if (!key) throw new NotFoundException('API Key not found');

    await this.apiKeyRepository.remove(key);
    return { message: 'API Key revoked' };
  }

  /**
   * Validate an incoming raw API Key
   */
  async validateKey(rawKey: string) {
    // 1. Extract the prefix
    const prefix = rawKey.substring(0, 15) + '...';

    // 2. Find the key record by prefix
    const apiKeyRecord = await this.apiKeyRepository.findOne({
      where: { prefix },
      relations: ['user'], // To identify which user calls it
    });

    if (!apiKeyRecord || !apiKeyRecord.is_active) {
      return null; // Key not found or disabled
    }

    // 3. Verify hash
    const isMatch = await bcrypt.compare(rawKey, apiKeyRecord.key_hash);

    if (isMatch) {
      // Update last_used
      // Return the owner so we know who is calling
      return apiKeyRecord.user;
    }

    return null;
  }
}
