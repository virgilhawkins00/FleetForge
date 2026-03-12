import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { TracingInterceptor } from './tracing.interceptor';

// Mock OpenTelemetry
jest.mock('@opentelemetry/api', () => ({
  trace: {
    getTracer: jest.fn(() => ({
      startSpan: jest.fn(() => ({
        setAttribute: jest.fn(),
        setStatus: jest.fn(),
        recordException: jest.fn(),
        end: jest.fn(),
        spanContext: jest.fn(() => ({ traceId: 'mock-trace-id' })),
      })),
    })),
    setSpan: jest.fn(),
  },
  context: {
    active: jest.fn(),
    with: jest.fn((_ctx, fn) => fn()),
  },
  SpanKind: { SERVER: 1 },
  SpanStatusCode: { OK: 1, ERROR: 2 },
}));

describe('TracingInterceptor', () => {
  let interceptor: TracingInterceptor;

  const mockRequest = {
    method: 'GET',
    url: '/api/devices',
    headers: {
      'user-agent': 'jest-test',
    },
    params: {},
    route: { path: '/api/devices' },
    user: null,
  };

  const mockResponse = {
    statusCode: 200,
    setHeader: jest.fn(),
  };

  const mockExecutionContext = {
    switchToHttp: jest.fn().mockReturnValue({
      getRequest: jest.fn().mockReturnValue(mockRequest),
      getResponse: jest.fn().mockReturnValue(mockResponse),
    }),
    getClass: jest.fn().mockReturnValue({ name: 'DevicesController' }),
    getHandler: jest.fn().mockReturnValue({ name: 'findAll' }),
  } as unknown as ExecutionContext;

  beforeEach(() => {
    interceptor = new TracingInterceptor();
    jest.clearAllMocks();
  });

  describe('intercept', () => {
    it('should be defined', () => {
      expect(interceptor).toBeDefined();
    });

    it('should add trace ID to response headers', (done) => {
      const mockCallHandler: CallHandler = {
        handle: () => of({ data: [] }),
      };

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        next: () => {
          expect(mockResponse.setHeader).toHaveBeenCalledWith('X-Trace-Id', 'mock-trace-id');
          done();
        },
      });
    });

    it('should handle successful requests', (done) => {
      const mockCallHandler: CallHandler = {
        handle: () => of({ data: 'success' }),
      };

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        next: (result) => {
          expect(result).toEqual({ data: 'success' });
          done();
        },
      });
    });

    it('should handle errors and record exception', (done) => {
      const error = new Error('Test error');
      const mockCallHandler: CallHandler = {
        handle: () => throwError(() => error),
      };

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        error: (err) => {
          expect(err).toBe(error);
          done();
        },
      });
    });

    it('should include user information when available', (done) => {
      const requestWithUser = {
        ...mockRequest,
        user: { sub: 'user-123', role: 'admin' },
      };
      const contextWithUser = {
        ...mockExecutionContext,
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue(requestWithUser),
          getResponse: jest.fn().mockReturnValue(mockResponse),
        }),
      } as unknown as ExecutionContext;

      const mockCallHandler: CallHandler = {
        handle: () => of({ data: [] }),
      };

      interceptor.intercept(contextWithUser, mockCallHandler).subscribe({
        next: () => {
          done();
        },
      });
    });

    it('should include device ID when present in params', (done) => {
      const requestWithDevice = {
        ...mockRequest,
        params: { deviceId: 'device-123' },
      };
      const contextWithDevice = {
        ...mockExecutionContext,
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue(requestWithDevice),
          getResponse: jest.fn().mockReturnValue(mockResponse),
        }),
      } as unknown as ExecutionContext;

      const mockCallHandler: CallHandler = {
        handle: () => of({ data: [] }),
      };

      interceptor.intercept(contextWithDevice, mockCallHandler).subscribe({
        next: () => {
          done();
        },
      });
    });
  });
});
