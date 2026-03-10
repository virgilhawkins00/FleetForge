import { ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { RateLimitInterceptor } from './rate-limit.interceptor';
import { of } from 'rxjs';

describe('RateLimitInterceptor', () => {
  let interceptor: RateLimitInterceptor;

  const mockExecutionContext = (user?: any, ip = '127.0.0.1'): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          user,
          ip,
          connection: { remoteAddress: ip },
        }),
      }),
    } as unknown as ExecutionContext;
  };

  const mockCallHandler = (result?: any) => ({
    handle: () => of(result),
  });

  beforeEach(() => {
    interceptor = new RateLimitInterceptor();
  });

  it('should be defined', () => {
    expect(interceptor).toBeDefined();
  });

  it('should allow first request', (done) => {
    const context = mockExecutionContext(undefined, '192.168.1.1');
    const handler = mockCallHandler({ success: true });

    interceptor.intercept(context, handler).subscribe({
      next: (result) => {
        expect(result).toEqual({ success: true });
        done();
      },
    });
  });

  it('should use user ID as key when authenticated', (done) => {
    const context = mockExecutionContext({ sub: 'user-123' }, '192.168.1.2');
    const handler = mockCallHandler({ data: 'test' });

    interceptor.intercept(context, handler).subscribe({
      complete: () => {
        // Should succeed for this user
        done();
      },
    });
  });

  it('should use IP as key when not authenticated', (done) => {
    const context = mockExecutionContext(undefined, '10.0.0.1');
    const handler = mockCallHandler({ data: 'test' });

    interceptor.intercept(context, handler).subscribe({
      complete: () => {
        done();
      },
    });
  });

  it('should throw HttpException when rate limit exceeded', () => {
    const ip = '192.168.1.100';
    const context = mockExecutionContext(undefined, ip);
    const handler = mockCallHandler();

    // Make 100 requests (the limit)
    for (let i = 0; i < 100; i++) {
      interceptor.intercept(context, handler).subscribe();
    }

    // The 101st request should fail
    expect(() => {
      // Force synchronous execution to check the throw
      const result = interceptor.intercept(context, handler);
      result.subscribe();
    }).toThrow(HttpException);
  });

  it('should include retryAfter in error response', () => {
    const ip = '192.168.1.101';
    const context = mockExecutionContext(undefined, ip);
    const handler = mockCallHandler();

    // Exhaust the rate limit
    for (let i = 0; i < 100; i++) {
      interceptor.intercept(context, handler).subscribe();
    }

    try {
      interceptor.intercept(context, handler).subscribe();
      fail('Should have thrown');
    } catch (error: any) {
      expect(error).toBeInstanceOf(HttpException);
      expect(error.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
      const response = error.getResponse();
      expect(response.message).toBe('Too many requests');
      expect(response.retryAfter).toBeDefined();
      expect(typeof response.retryAfter).toBe('number');
    }
  });

  it('should cleanup old entries', () => {
    const ip = '192.168.1.102';
    const context = mockExecutionContext(undefined, ip);
    const handler = mockCallHandler();

    // Make a request to create an entry
    interceptor.intercept(context, handler).subscribe();

    // Cleanup should run without errors
    expect(() => interceptor.cleanup()).not.toThrow();
  });

  it('should allow requests after window reset', (done) => {
    const ip = '192.168.1.103';
    const context = mockExecutionContext(undefined, ip);
    const handler = mockCallHandler({ success: true });

    // Access private limits map to manually set an expired entry
    const limits = (interceptor as any).limits;
    limits.set(ip, { count: 100, resetTime: Date.now() - 1000 }); // Expired entry

    // This should create a new window since the old one expired
    interceptor.intercept(context, handler).subscribe({
      next: (result) => {
        expect(result).toEqual({ success: true });
        done();
      },
    });
  });

  it('should use remoteAddress when ip is not available', (done) => {
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({
          ip: undefined,
          connection: { remoteAddress: '10.0.0.5' },
        }),
      }),
    } as unknown as ExecutionContext;
    const handler = mockCallHandler({ ok: true });

    interceptor.intercept(context, handler).subscribe({
      next: (result) => {
        expect(result).toEqual({ ok: true });
        done();
      },
    });
  });
});

