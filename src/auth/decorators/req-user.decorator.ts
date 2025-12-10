import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { User } from '../../users/entities/user.entity';

// Define a local interface that confirms the 'user' property exists
interface AuthenticatedRequest extends Request {
  user: User;
}

/**
 * Custom decorator to extract the authenticated User entity from the request object.
 * Usage: @ReqUser() user: User
 */
export const ReqUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): User => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();

    return request.user;
  },
);
