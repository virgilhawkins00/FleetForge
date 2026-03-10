/**
 * Security Decorators
 */

import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import { UserRole, Permission, IJwtPayload } from '../types';
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
 * Get current user/device from request
 * Can optionally extract a specific property from the payload
 *
 * @example
 * // Get full payload
 * @Get('profile')
 * getProfile(@CurrentUser() user: IJwtPayload) { ... }
 *
 * // Get specific property
 * @Get('profile')
 * getProfile(@CurrentUser('sub') userId: string) { ... }
 */
export const CurrentUser = createParamDecorator(
  (data: keyof IJwtPayload | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as IJwtPayload | undefined;

    if (!user) {
      return undefined;
    }

    return data ? user[data] : user;
  },
);

/**
 * Require user to be of type 'user' (not device)
 */
export const RequireUser = () => SetMetadata('requireUser', true);

/**
 * Require user to be of type 'device'
 */
export const RequireDevice = () => SetMetadata('requireDevice', true);

/**
 * Require specific organization access
 * Used for multi-tenant authorization
 */
export const RequireOrganization = (orgIdParam: string = 'organizationId') =>
  SetMetadata('requireOrganization', orgIdParam);
