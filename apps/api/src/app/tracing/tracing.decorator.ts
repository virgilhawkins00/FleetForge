/**
 * Tracing Decorators
 * Custom decorators for adding OpenTelemetry spans to methods
 */

import { trace, SpanKind, SpanStatusCode } from '@opentelemetry/api';

const tracer = trace.getTracer('fleetforge-api', '1.0.0');

/**
 * Decorator to create a span around a method execution
 * @param spanName - Custom span name (defaults to className.methodName)
 * @param attributes - Additional attributes to add to the span
 */
export function Span(
  spanName?: string,
  attributes?: Record<string, string | number | boolean>,
): MethodDecorator {
  return (target: object, propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
    const originalMethod = descriptor.value;
    const className = target.constructor.name;
    const methodName = String(propertyKey);
    const name = spanName || `${className}.${methodName}`;

    descriptor.value = async function (...args: unknown[]) {
      const span = tracer.startSpan(name, {
        kind: SpanKind.INTERNAL,
        attributes: {
          'code.function': methodName,
          'code.namespace': className,
          ...attributes,
        },
      });

      try {
        const result = await originalMethod.apply(this, args);
        span.setStatus({ code: SpanStatusCode.OK });
        return result;
      } catch (error) {
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: error instanceof Error ? error.message : 'Unknown error',
        });
        if (error instanceof Error) {
          span.recordException(error);
        }
        throw error;
      } finally {
        span.end();
      }
    };

    return descriptor;
  };
}

/**
 * Decorator for database operations
 */
export function SpanDatabase(operation: string, collection?: string): MethodDecorator {
  return Span(`db.${operation}`, {
    'db.system': 'mongodb',
    'db.operation': operation,
    ...(collection && { 'db.mongodb.collection': collection }),
  });
}

/**
 * Decorator for external service calls
 */
export function SpanExternalService(serviceName: string, operation: string): MethodDecorator {
  return (_target: object, _propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: unknown[]) {
      const span = tracer.startSpan(`external.${serviceName}.${operation}`, {
        kind: SpanKind.CLIENT,
        attributes: {
          'peer.service': serviceName,
          'rpc.method': operation,
        },
      });

      try {
        const result = await originalMethod.apply(this, args);
        span.setStatus({ code: SpanStatusCode.OK });
        return result;
      } catch (error) {
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: error instanceof Error ? error.message : 'Unknown error',
        });
        if (error instanceof Error) {
          span.recordException(error);
        }
        throw error;
      } finally {
        span.end();
      }
    };

    return descriptor;
  };
}

/**
 * Decorator for message queue operations
 */
export function SpanMessageQueue(
  queueName: string,
  operation: 'publish' | 'consume',
): MethodDecorator {
  return Span(`mq.${operation}.${queueName}`, {
    'messaging.system': 'nats',
    'messaging.destination': queueName,
    'messaging.operation': operation,
  });
}

/**
 * Decorator for cache operations
 */
export function SpanCache(operation: 'get' | 'set' | 'delete' | 'invalidate'): MethodDecorator {
  return Span(`cache.${operation}`, {
    'db.system': 'redis',
    'db.operation': operation,
  });
}
