/**
 * Tracing Interceptor
 * Adds custom spans and attributes to HTTP requests
 */

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { trace, SpanKind, SpanStatusCode, context as otelContext } from '@opentelemetry/api';

@Injectable()
export class TracingInterceptor implements NestInterceptor {
  private readonly tracer = trace.getTracer('fleetforge-api', '1.0.0');

  intercept(executionContext: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = executionContext.switchToHttp().getRequest();
    const response = executionContext.switchToHttp().getResponse();
    const { method, url, headers, user } = request;

    // Get controller and handler names for better span naming
    const controller = executionContext.getClass().name;
    const handler = executionContext.getHandler().name;
    const spanName = `${controller}.${handler}`;

    // Start a new span for this request
    const span = this.tracer.startSpan(spanName, {
      kind: SpanKind.SERVER,
      attributes: {
        'http.method': method,
        'http.url': url,
        'http.route': request.route?.path || url,
        'http.user_agent': headers['user-agent'] || 'unknown',
        'fleetforge.controller': controller,
        'fleetforge.handler': handler,
      },
    });

    // Add user information if available
    if (user) {
      span.setAttribute('enduser.id', user.sub || user.id || 'anonymous');
      span.setAttribute('enduser.role', user.role || 'unknown');
    }

    // Add device ID if present in params or headers
    const deviceId = request.params?.deviceId || headers['x-device-id'];
    if (deviceId) {
      span.setAttribute('fleetforge.device_id', deviceId);
    }

    // Add trace ID to response headers for debugging
    const traceId = span.spanContext().traceId;
    response.setHeader('X-Trace-Id', traceId);

    // Execute handler within span context
    return otelContext.with(trace.setSpan(otelContext.active(), span), () => {
      return next.handle().pipe(
        tap({
          next: () => {
            span.setAttribute('http.status_code', response.statusCode);
            span.setStatus({ code: SpanStatusCode.OK });
            span.end();
          },
          error: (error) => {
            span.setAttribute('http.status_code', error.status || 500);
            span.setStatus({
              code: SpanStatusCode.ERROR,
              message: error.message,
            });
            span.recordException(error);
            span.end();
          },
        }),
      );
    });
  }
}

