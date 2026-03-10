/**
 * Logging Interceptor
 * Logs all requests with user context
 */

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, user } = request;
    const now = Date.now();

    const userId = user?.sub || 'anonymous';
    const userType = user?.type || 'unknown';

    this.logger.log(`[${method}] ${url} - User: ${userId} (${userType})`);

    return next.handle().pipe(
      tap({
        next: () => {
          const responseTime = Date.now() - now;
          this.logger.log(
            `[${method}] ${url} - User: ${userId} - Completed in ${responseTime}ms`,
          );
        },
        error: (error) => {
          const responseTime = Date.now() - now;
          this.logger.error(
            `[${method}] ${url} - User: ${userId} - Failed in ${responseTime}ms - Error: ${error.message}`,
          );
        },
      }),
    );
  }
}

