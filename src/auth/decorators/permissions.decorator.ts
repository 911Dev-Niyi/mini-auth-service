import { Reflector } from '@nestjs/core';

export enum AllowedPermission {
  READ = 'read',
  DEPOSIT = 'deposit',
  TRANSFER = 'transfer',
}

// Key used to store and retrieve permissions metadata
export const PERMISSIONS_KEY = 'permissions';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const Permissions = (...permissions: AllowedPermission[]) =>
  Reflector.createDecorator<AllowedPermission[]>();
