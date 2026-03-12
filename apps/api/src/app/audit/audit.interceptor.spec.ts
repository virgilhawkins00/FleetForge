/**
 * Audit Interceptor Unit Tests
 */

import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { of, throwError } from 'rxjs';
import { AuditInterceptor } from './audit.interceptor';
import { AuditService } from './audit.service';
import { AuditAction, AuditSeverity } from './audit.types';

describe('AuditInterceptor', () => {
  let interceptor: AuditInterceptor;
  let mockReflector: jest.Mocked<Reflector>;
  let mockAuditService: jest.Mocked<AuditService>;

  const createMockContext = (overrides: any = {}): ExecutionContext => {
    const request = {
      method: 'POST',
      path: '/api/devices',
      body: { name: 'Test Device' },
      params: { id: 'dev-123' },
      headers: { 'user-agent': 'test-agent' },
      user: { sub: 'user-456', type: 'user', email: 'test@test.com' },
      ip: '192.168.1.1',
      ...overrides.request,
    };

    const response = {
      statusCode: 200,
      ...overrides.response,
    };

    return {
      getHandler: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => response,
      }),
    } as unknown as ExecutionContext;
  };

  const mockCallHandler = (result?: any, shouldError = false) => ({
    handle: () => (shouldError ? throwError(() => new Error(result)) : of(result)),
  });

  beforeEach(() => {
    mockReflector = {
      get: jest.fn(),
    } as any;

    mockAuditService = {
      log: jest.fn().mockResolvedValue(undefined),
    } as any;

    interceptor = new AuditInterceptor(mockReflector, mockAuditService);
  });

  it('should be defined', () => {
    expect(interceptor).toBeDefined();
  });

  it('should skip auditing when no audit options', (done) => {
    mockReflector.get.mockReturnValue(undefined);
    const context = createMockContext();
    const handler = mockCallHandler({ success: true });

    interceptor.intercept(context, handler).subscribe({
      complete: () => {
        expect(mockAuditService.log).not.toHaveBeenCalled();
        done();
      },
    });
  });

  it('should log successful requests', (done) => {
    mockReflector.get.mockReturnValue({
      action: AuditAction.DEVICE_CREATE,
      resourceType: 'device',
      severity: AuditSeverity.MEDIUM,
      includeRequestBody: true,
    });

    const context = createMockContext();
    const handler = mockCallHandler({ id: 'new-device' });

    interceptor.intercept(context, handler).subscribe({
      complete: () => {
        expect(mockAuditService.log).toHaveBeenCalledWith(
          expect.objectContaining({
            action: AuditAction.DEVICE_CREATE,
            success: true,
            userId: 'user-456',
            method: 'POST',
            path: '/api/devices',
          }),
        );
        done();
      },
    });
  });

  it('should log failed requests', (done) => {
    mockReflector.get.mockReturnValue({
      action: AuditAction.DEVICE_DELETE,
      resourceType: 'device',
      resourceIdParam: 'id',
      severity: AuditSeverity.HIGH,
    });

    const context = createMockContext();
    const handler = mockCallHandler('Not Found', true);

    interceptor.intercept(context, handler).subscribe({
      error: () => {
        expect(mockAuditService.log).toHaveBeenCalledWith(
          expect.objectContaining({
            action: AuditAction.DEVICE_DELETE,
            success: false,
            errorMessage: 'Not Found',
          }),
        );
        done();
      },
    });
  });

  it('should extract resource ID from params', (done) => {
    mockReflector.get.mockReturnValue({
      action: AuditAction.DEVICE_UPDATE,
      resourceType: 'device',
      resourceIdParam: 'id',
      severity: AuditSeverity.MEDIUM,
    });

    const context = createMockContext();
    const handler = mockCallHandler({ updated: true });

    interceptor.intercept(context, handler).subscribe({
      complete: () => {
        expect(mockAuditService.log).toHaveBeenCalledWith(
          expect.objectContaining({
            resourceId: 'dev-123',
          }),
        );
        done();
      },
    });
  });

  it('should redact sensitive fields', (done) => {
    mockReflector.get.mockReturnValue({
      action: AuditAction.LOGIN,
      resourceType: 'auth',
      severity: AuditSeverity.HIGH,
      includeRequestBody: true,
      sensitiveFields: ['password'],
    });

    const context = createMockContext({
      request: { body: { email: 'test@test.com', password: 'secret123' } },
    });
    const handler = mockCallHandler({ token: 'jwt-token' });

    interceptor.intercept(context, handler).subscribe({
      complete: () => {
        expect(mockAuditService.log).toHaveBeenCalledWith(
          expect.objectContaining({
            requestBody: { email: 'test@test.com', password: '[REDACTED]' },
          }),
        );
        done();
      },
    });
  });

  it('should handle anonymous users', (done) => {
    mockReflector.get.mockReturnValue({
      action: AuditAction.LOGIN,
      resourceType: 'auth',
      severity: AuditSeverity.HIGH,
    });

    const context = createMockContext({ request: { user: undefined } });
    const handler = mockCallHandler({ token: 'jwt' });

    interceptor.intercept(context, handler).subscribe({
      complete: () => {
        expect(mockAuditService.log).toHaveBeenCalledWith(
          expect.objectContaining({
            userId: 'anonymous',
          }),
        );
        done();
      },
    });
  });
});

