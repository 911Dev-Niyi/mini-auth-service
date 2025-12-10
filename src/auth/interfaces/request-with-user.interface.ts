import { Request } from '@nestjs/common';

import { User } from 'src/users/entities/user.entity';

export interface JwtPayload {
  id: string;
  email: string;
}

export interface RequestWithAuthenticatedUser extends Request {
  user: User;
}

export interface RequestWithJwtPayload extends Request {
  user: JwtPayload;
}

export interface RequestWithApiKey extends Request {
  user: User;
  permissions: string[];
}
