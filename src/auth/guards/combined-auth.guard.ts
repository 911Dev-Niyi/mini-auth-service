import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiKeyGuard } from './api-key.guard';
import { Request } from 'express';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

interface CombinedAuthRequest extends Request {
  headers: Request['headers'] & {
    'x-api-key'?: string;
  };
}

@Injectable()
export class CombinedAuthGuard extends AuthGuard('jwt') {
  constructor(
    private reflector: Reflector,
    private apiKeyGuard: ApiKeyGuard,
  ) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true; // Skip all authentication checks
    }

    const request = context.switchToHttp().getRequest<CombinedAuthRequest>();
    const apiKeyExists = request.headers['x-api-key'];

    if (!this.apiKeyGuard) {
      console.error(
        'ApiKeyGuard failed to inject via constructor. Check module providers.',
      );
      return false;
    } // If API Key header exists, prioritize the API Key Guard.

    if (apiKeyExists) {
      return this.apiKeyGuard.canActivate(context);
    } // If no API Key header, fall back to standard JWT authentication.

    return super.canActivate(context) as Promise<boolean>;
  }
}
