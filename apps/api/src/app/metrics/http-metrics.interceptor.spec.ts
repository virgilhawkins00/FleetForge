/**
 * HttpMetricsInterceptor Unit Tests
 */

import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { HttpMetricsInterceptor } from './http-metrics.interceptor';

describe('HttpMetricsInterceptor', () => {
  let interceptor: HttpMetricsInterceptor;
  let mockCounter: any;
  let mockHistogram: any;

  beforeEach(() => {
    mockCounter = {
      inc: jest.fn(),
    };

    mockHistogram = {
      observe: jest.fn(),
    };

    interceptor = new HttpMetricsInterceptor(mockCounter, mockHistogram);
  });

  const createMockExecutionContext = (
    method: string,
    url: string,
    routePath?: string,
  ): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          method,
          url,
          route: routePath ? { path: routePath } : undefined,
        }),
        getResponse: () => ({
          statusCode: 200,
        }),
      }),
    } as ExecutionContext;
  };

  const createMockCallHandler = (data: any = {}): CallHandler => {
    return {
      handle: () => of(data),
    };
  };

  it('should be defined', () => {
    expect(interceptor).toBeDefined();
  });

  describe('intercept', () => {
    it('should increment counter and observe histogram on successful request', (done) => {
      const context = createMockExecutionContext('GET', '/api/devices', '/api/devices');
      const handler = createMockCallHandler({ success: true });

      interceptor.intercept(context, handler).subscribe({
        next: () => {
          expect(mockCounter.inc).toHaveBeenCalledWith({
            method: 'GET',
            path: '/api/devices',
            status: '200',
          });
          expect(mockHistogram.observe).toHaveBeenCalled();
          done();
        },
      });
    });

    it('should normalize paths with UUIDs', (done) => {
      const context = createMockExecutionContext(
        'GET',
        '/api/devices/550e8400-e29b-41d4-a716-446655440000',
        '/api/devices/:id',
      );
      const handler = createMockCallHandler();

      interceptor.intercept(context, handler).subscribe({
        next: () => {
          expect(mockCounter.inc).toHaveBeenCalledWith(
            expect.objectContaining({
              path: '/api/devices/:id',
            }),
          );
          done();
        },
      });
    });

    it('should normalize paths with ObjectIds', (done) => {
      const context = createMockExecutionContext(
        'GET',
        '/api/devices/507f1f77bcf86cd799439011',
      );
      const handler = createMockCallHandler();

      interceptor.intercept(context, handler).subscribe({
        next: () => {
          expect(mockCounter.inc).toHaveBeenCalledWith(
            expect.objectContaining({
              path: '/api/devices/:id',
            }),
          );
          done();
        },
      });
    });

    it('should record metrics on error', (done) => {
      const context = createMockExecutionContext('POST', '/api/devices');
      const handler = {
        handle: () => throwError(() => ({ status: 400, message: 'Bad Request' })),
      };

      interceptor.intercept(context, handler).subscribe({
        error: () => {
          expect(mockCounter.inc).toHaveBeenCalledWith(
            expect.objectContaining({
              status: '400',
            }),
          );
          done();
        },
      });
    });

    it('should default to 500 status for errors without status', (done) => {
      const context = createMockExecutionContext('DELETE', '/api/devices');
      const handler = {
        handle: () => throwError(() => new Error('Unknown error')),
      };

      interceptor.intercept(context, handler).subscribe({
        error: () => {
          expect(mockCounter.inc).toHaveBeenCalledWith(
            expect.objectContaining({
              status: '500',
            }),
          );
          done();
        },
      });
    });
  });
});

