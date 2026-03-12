/**
 * HTTP Metrics Interceptor
 * Collects Prometheus metrics for all HTTP requests
 */

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { Counter, Histogram } from 'prom-client';

@Injectable()
export class HttpMetricsInterceptor implements NestInterceptor {
  constructor(
    @InjectMetric('http_requests_total')
    private readonly httpRequestsTotal: Counter<string>,
    @InjectMetric('http_request_duration_seconds')
    private readonly httpRequestDuration: Histogram<string>,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, route } = request;
    const path = route?.path || request.url;
    const startTime = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const response = context.switchToHttp().getResponse();
          const status = response.statusCode;
          const duration = (Date.now() - startTime) / 1000;

          this.httpRequestsTotal.inc({
            method,
            path: this.normalizePath(path),
            status: status.toString(),
          });

          this.httpRequestDuration.observe(
            {
              method,
              path: this.normalizePath(path),
              status: status.toString(),
            },
            duration,
          );
        },
        error: (error) => {
          const status = error.status || 500;
          const duration = (Date.now() - startTime) / 1000;

          this.httpRequestsTotal.inc({
            method,
            path: this.normalizePath(path),
            status: status.toString(),
          });

          this.httpRequestDuration.observe(
            {
              method,
              path: this.normalizePath(path),
              status: status.toString(),
            },
            duration,
          );
        },
      }),
    );
  }

  /**
   * Normalize path to reduce cardinality
   * Replaces dynamic segments like UUIDs with placeholders
   */
  private normalizePath(path: string): string {
    return path
      // Replace UUIDs
      .replace(
        /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
        ':id',
      )
      // Replace MongoDB ObjectIds
      .replace(/[0-9a-f]{24}/gi, ':id')
      // Replace numeric IDs
      .replace(/\/\d+/g, '/:id');
  }
}

