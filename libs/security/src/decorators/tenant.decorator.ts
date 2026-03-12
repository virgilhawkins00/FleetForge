/**
 * Tenant Decorators - Multi-tenant authorization decorators
 */

import { SetMetadata, createParamDecorator, ExecutionContext } from '@nestjs/common';
import { TENANT_REQUIRED_KEY, TENANT_PARAM_KEY, SKIP_TENANT_CHECK_KEY } from '../guards/tenant.guard';

/**
 * Mark route as requiring tenant validation
 */
export const RequireTenant = () => SetMetadata(TENANT_REQUIRED_KEY, true);

/**
 * Specify which param contains the tenant/organization ID to validate
 * @param paramKey - The key in params/body/query containing the organizationId
 */
export const TenantParam = (paramKey: string = 'organizationId') =>
  SetMetadata(TENANT_PARAM_KEY, paramKey);

/**
 * Skip tenant check for this route (e.g., cross-tenant admin operations)
 * Should only be used for super admin routes
 */
export const SkipTenantCheck = () => SetMetadata(SKIP_TENANT_CHECK_KEY, true);

/**
 * Extract the current tenant ID from the request
 * Returns the authenticated user's organizationId
 */
export const CurrentTenant = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string | undefined => {
    const request = ctx.switchToHttp().getRequest();
    return request.tenantId || request.user?.organizationId;
  },
);

/**
 * Extract tenant ID with type safety for use in services
 */
export const TenantId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    const tenantId = request.tenantId || request.user?.organizationId;

    if (!tenantId) {
      throw new Error('Tenant ID not found in request');
    }

    return tenantId;
  },
);

