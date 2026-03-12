/**
 * Tenant Guard - Enforces multi-tenant data isolation
 * Ensures users can only access data within their organization
 */

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IAuthUser } from '../types';

export const TENANT_REQUIRED_KEY = 'tenant:required';
export const TENANT_PARAM_KEY = 'tenant:param';
export const SKIP_TENANT_CHECK_KEY = 'tenant:skip';

export interface ITenantRequest {
  user?: IAuthUser;
  tenantId?: string;
  params?: Record<string, string>;
  body?: Record<string, unknown>;
  query?: Record<string, string>;
}

@Injectable()
export class TenantGuard implements CanActivate {
  private readonly logger = new Logger(TenantGuard.name);

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Check if tenant check should be skipped (e.g., for super admins)
    const skipTenantCheck = this.reflector.getAllAndOverride<boolean>(SKIP_TENANT_CHECK_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (skipTenantCheck) {
      return true;
    }

    const request = context.switchToHttp().getRequest<ITenantRequest>();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // Super admins can access all tenants
    if (user.role === 'SUPER_ADMIN') {
      return true;
    }

    // User must belong to an organization
    if (!user.organizationId) {
      this.logger.warn(`User ${user.id} has no organizationId`);
      throw new ForbiddenException('User not associated with any organization');
    }

    // Set tenantId on request for downstream use
    request.tenantId = user.organizationId;

    // Check if a specific tenant param needs validation
    const tenantParamKey = this.reflector.getAllAndOverride<string>(TENANT_PARAM_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (tenantParamKey) {
      const resourceTenantId = this.extractTenantId(request, tenantParamKey);

      if (resourceTenantId && resourceTenantId !== user.organizationId) {
        this.logger.warn(
          `Access denied: User ${user.id} (org: ${user.organizationId}) tried to access resource in org: ${resourceTenantId}`,
        );
        throw new ForbiddenException('Access denied to this resource');
      }
    }

    return true;
  }

  private extractTenantId(request: ITenantRequest, paramKey: string): string | undefined {
    // Check route params first
    if (request.params?.[paramKey]) {
      return request.params[paramKey];
    }

    // Check query params
    if (request.query?.[paramKey]) {
      return request.query[paramKey];
    }

    // Check body
    if (request.body?.[paramKey]) {
      return request.body[paramKey] as string;
    }

    return undefined;
  }
}

