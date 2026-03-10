import { ExecutionContext, Logger } from '@nestjs/common';
import { LoggingInterceptor } from './logging.interceptor';
import { of, throwError } from 'rxjs';

describe('LoggingInterceptor', () => {
  let interceptor: LoggingInterceptor;
  let logSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;

  const mockExecutionContext = (user?: any, method = 'GET', url = '/test'): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ method, url, user }),
      }),
    } as unknown as ExecutionContext;
  };

  const mockCallHandler = (result?: any, shouldError = false) => ({
    handle: () => (shouldError ? throwError(() => new Error(result)) : of(result)),
  });

  beforeEach(() => {
    interceptor = new LoggingInterceptor();
    logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    logSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it('should be defined', () => {
    expect(interceptor).toBeDefined();
  });

  it('should log request with authenticated user', (done) => {
    const context = mockExecutionContext({ sub: 'user-123', type: 'admin' }, 'POST', '/api/devices');
    const handler = mockCallHandler({ success: true });

    interceptor.intercept(context, handler).subscribe({
      complete: () => {
        expect(logSpy).toHaveBeenCalledWith(
          expect.stringContaining('[POST] /api/devices - User: user-123 (admin)'),
        );
        expect(logSpy).toHaveBeenCalledWith(
          expect.stringContaining('[POST] /api/devices - User: user-123 - Completed'),
        );
        done();
      },
    });
  });

  it('should log request with anonymous user', (done) => {
    const context = mockExecutionContext(undefined, 'GET', '/api/status');
    const handler = mockCallHandler({ status: 'ok' });

    interceptor.intercept(context, handler).subscribe({
      complete: () => {
        expect(logSpy).toHaveBeenCalledWith(
          expect.stringContaining('[GET] /api/status - User: anonymous (unknown)'),
        );
        done();
      },
    });
  });

  it('should log error on request failure', (done) => {
    const context = mockExecutionContext({ sub: 'user-456' }, 'DELETE', '/api/devices/1');
    const handler = mockCallHandler('Something went wrong', true);

    interceptor.intercept(context, handler).subscribe({
      error: () => {
        expect(errorSpy).toHaveBeenCalledWith(
          expect.stringContaining('[DELETE] /api/devices/1 - User: user-456 - Failed'),
        );
        expect(errorSpy).toHaveBeenCalledWith(
          expect.stringContaining('Error: Something went wrong'),
        );
        done();
      },
    });
  });

  it('should handle user with sub but no type', (done) => {
    const context = mockExecutionContext({ sub: 'device-789' }, 'PUT', '/api/firmware');
    const handler = mockCallHandler({ updated: true });

    interceptor.intercept(context, handler).subscribe({
      complete: () => {
        expect(logSpy).toHaveBeenCalledWith(
          expect.stringContaining('[PUT] /api/firmware - User: device-789 (unknown)'),
        );
        done();
      },
    });
  });

  it('should include response time in completion log', (done) => {
    const context = mockExecutionContext({ sub: 'test-user' }, 'GET', '/api/slow');
    const handler = mockCallHandler({ data: 'test' });

    interceptor.intercept(context, handler).subscribe({
      complete: () => {
        expect(logSpy).toHaveBeenCalledWith(expect.stringMatching(/Completed in \d+ms/));
        done();
      },
    });
  });
});

