import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { ApiKeysService } from '../../api-keys/api-keys.service';
import {
  PERMISSIONS_KEY,
  AllowedPermission,
} from '../decorators/permissions.decorator';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private apiKeysService: ApiKeysService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const apiKey = request.headers['x-api-key'] as string;

    // Header Check
    if (!apiKey) {
      return false;
    }

    try {
      // Key Validation
      const validationResult = await this.apiKeysService.validateKey(apiKey);

      if (!validationResult) {
        throw new UnauthorizedException('Invalid or expired API Key.');
      }

      // Destructure validation result
      const { user, permissions: keyPermissions } = validationResult;

      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      (request as any).user = user;

      // Permission Check
      const requiredPermissions = this.reflector.get<AllowedPermission[]>(
        PERMISSIONS_KEY,
        context.getHandler(),
      );

      if (!requiredPermissions || requiredPermissions.length === 0) {
        return true;
      }

      const hasPermission = requiredPermissions.every((p) =>
        keyPermissions.includes(p),
      );

      if (!hasPermission) {
        throw new UnauthorizedException('API Key lacks required permissions.');
      }

      return true;
    } catch (e: unknown) {
      let errorMessage = 'Authentication failed.';
      if (e instanceof UnauthorizedException) {
        throw e;
      } else if (e instanceof Error) {
        errorMessage = e.message;
      }
      throw new UnauthorizedException(errorMessage);
    }
  }
}
