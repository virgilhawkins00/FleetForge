/**
 * Security Decorators
 */

import { SetMetadata } from '@nestjs/common';
import { UserRole, Permission } from '../types';
import { IS_PUBLIC_KEY } from '../guards/jwt-auth.guard';
import { ROLES_KEY } from '../guards/roles.guard';
import { PERMISSIONS_KEY } from '../guards/permissions.guard';

/**
 * Mark route as public (no authentication required)
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

/**
 * Require specific roles
 */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);

/**
 * Require specific permissions
 */
export const Permissions = (...permissions: Permission[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);

/**
 * Get current user from request
 */
export const CurrentUser = () => {
  return (target: any, propertyKey: string, parameterIndex: number) => {
    // This is a parameter decorator that will be used with ExecutionContext
    // Implementation will be in a custom decorator factory
  };
};

