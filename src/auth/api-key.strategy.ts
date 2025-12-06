import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { HeaderAPIKeyStrategy } from 'passport-headerapikey';
import { ApiKeysService } from '../api-keys/api-keys.service';
import { User } from '../users/entities/user.entity';

@Injectable()
export class ApiKeyStrategy extends PassportStrategy(
  HeaderAPIKeyStrategy as any,
  'api-key',
) {
  constructor(private apiKeysService: ApiKeysService) {
    super(
      { header: 'X-API-KEY', prefix: '' },
      false, // passReqToCallback: false
      async (
        apiKey: string,
        done: (
          err: Error | null,
          user?: User | boolean,
          info?: unknown,
        ) => void,
      ) => {
        const user = await apiKeysService.validateKey(apiKey);

        if (!user) {
          return done(new UnauthorizedException('Invalid API Key'), false);
        }

        return done(null, user);
      },
    );
  }

  validate() {
    return true;
  }
}
