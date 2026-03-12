/**
 * Audit Interceptor
 * Automatically captures audit events for methods marked with @Auditable
 */

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { AuditService } from './audit.service';
import { AUDIT_KEY } from './audit.decorator';
import { AuditableOptions, AuditSeverity } from './audit.types';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly auditService: AuditService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const auditOptions = this.reflector.get<AuditableOptions>(
      AUDIT_KEY,
      context.getHandler(),
    );

    // If no audit options, skip auditing
    if (!auditOptions) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const startTime = Date.now();

    const baseAuditData = this.extractBaseData(request, auditOptions);

    return next.handle().pipe(
      tap((responseBody) => {
        const duration = Date.now() - startTime;
        
        this.auditService.log({
          ...baseAuditData,
          statusCode: response.statusCode,
          duration,
          responseBody: auditOptions.includeResponseBody ? responseBody : undefined,
          success: true,
        }).catch((err) => this.logger.error('Audit log failed', err));
      }),
      catchError((error) => {
        const duration = Date.now() - startTime;
        
        this.auditService.log({
          ...baseAuditData,
          statusCode: error.status || 500,
          duration,
          success: false,
          errorMessage: error.message,
        }).catch((err) => this.logger.error('Audit log failed', err));

        throw error;
      }),
    );
  }

  private extractBaseData(request: any, options: AuditableOptions) {
    const user = request.user || {};
    const resourceId = options.resourceIdParam
      ? request.params[options.resourceIdParam]
      : undefined;

    let requestBody = options.includeRequestBody ? { ...request.body } : undefined;
    
    // Remove sensitive fields
    if (requestBody && options.sensitiveFields) {
      for (const field of options.sensitiveFields) {
        if (requestBody[field]) {
          requestBody[field] = '[REDACTED]';
        }
      }
    }

    return {
      action: options.action,
      severity: options.severity || AuditSeverity.MEDIUM,
      userId: user.sub || 'anonymous',
      userType: (user.type as 'user' | 'device') || 'user',
      userEmail: user.email,
      resourceType: options.resourceType,
      resourceId,
      organizationId: user.organizationId,
      ipAddress: this.getClientIp(request),
      userAgent: request.headers['user-agent'],
      method: request.method,
      path: request.path || request.url,
      requestBody,
    };
  }

  private getClientIp(request: any): string {
    return (
      request.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
      request.headers['x-real-ip'] ||
      request.connection?.remoteAddress ||
      request.ip ||
      'unknown'
    );
  }
}

