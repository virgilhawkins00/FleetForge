/**
 * mTLS Guard Unit Tests
 */

import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { MtlsGuard, MTLS_REQUIRED_KEY } from './mtls.guard';
import { MtlsService } from '../services/mtls.service';

describe('MtlsGuard', () => {
  let guard: MtlsGuard;
  let mockReflector: jest.Mocked<Reflector>;
  let mockMtlsService: jest.Mocked<MtlsService>;

  const createMockContext = (headers: any = {}, socket: any = {}): ExecutionContext => {
    const request = {
      headers,
      socket,
    };

    return {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as unknown as ExecutionContext;
  };

  beforeEach(() => {
    mockReflector = {
      getAllAndOverride: jest.fn(),
    } as any;

    mockMtlsService = {
      validateCertificate: jest.fn(),
      extractDeviceId: jest.fn(),
    } as any;

    guard = new MtlsGuard(mockReflector, mockMtlsService);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('when mTLS is not required', () => {
    beforeEach(() => {
      mockReflector.getAllAndOverride.mockReturnValue(false);
    });

    it('should allow request without certificate', () => {
      const context = createMockContext();

      expect(guard.canActivate(context)).toBe(true);
    });

    it('should validate certificate if provided', () => {
      const certPem = '-----BEGIN CERTIFICATE-----\ntest\n-----END CERTIFICATE-----';
      mockMtlsService.validateCertificate.mockReturnValue({
        isValid: true,
        certificate: {
          subject: 'CN=test',
          issuer: 'CN=issuer',
          serialNumber: '123',
          validFrom: new Date(),
          validTo: new Date(Date.now() + 86400000),
          fingerprint: 'abc123',
          publicKeyAlgorithm: 'RSA',
        },
        errors: [],
        warnings: [],
      });
      mockMtlsService.extractDeviceId.mockReturnValue('device-123');

      const context = createMockContext({ 'x-client-cert': encodeURIComponent(certPem) });

      expect(guard.canActivate(context)).toBe(true);
      expect(mockMtlsService.validateCertificate).toHaveBeenCalledWith(certPem);
    });
  });

  describe('when mTLS is required', () => {
    beforeEach(() => {
      mockReflector.getAllAndOverride.mockImplementation((key) => {
        return key === MTLS_REQUIRED_KEY;
      });
    });

    it('should throw when no certificate provided', () => {
      const context = createMockContext();

      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
    });

    it('should throw when certificate is invalid', () => {
      const certPem = '-----BEGIN CERTIFICATE-----\ntest\n-----END CERTIFICATE-----';
      mockMtlsService.validateCertificate.mockReturnValue({
        isValid: false,
        errors: ['Certificate has expired'],
        warnings: [],
      });

      const context = createMockContext({ 'x-client-cert': encodeURIComponent(certPem) });

      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
    });

    it('should allow valid certificate', () => {
      const certPem = '-----BEGIN CERTIFICATE-----\ntest\n-----END CERTIFICATE-----';
      mockMtlsService.validateCertificate.mockReturnValue({
        isValid: true,
        certificate: {
          subject: 'CN=device-123',
          issuer: 'CN=FleetForge CA',
          serialNumber: '456',
          validFrom: new Date(),
          validTo: new Date(Date.now() + 86400000),
          fingerprint: 'def456',
          publicKeyAlgorithm: 'RSA',
        },
        errors: [],
        warnings: [],
      });
      mockMtlsService.extractDeviceId.mockReturnValue('device-123');

      const context = createMockContext({ 'x-client-cert': encodeURIComponent(certPem) });

      expect(guard.canActivate(context)).toBe(true);
    });
  });

  describe('certificate extraction', () => {
    it('should extract from x-client-cert header', () => {
      const certPem = '-----BEGIN CERTIFICATE-----\ntest\n-----END CERTIFICATE-----';
      mockReflector.getAllAndOverride.mockReturnValue(false);
      mockMtlsService.validateCertificate.mockReturnValue({
        isValid: true,
        certificate: {} as any,
        errors: [],
        warnings: [],
      });
      mockMtlsService.extractDeviceId.mockReturnValue(null);

      const context = createMockContext({ 'x-client-cert': encodeURIComponent(certPem) });
      guard.canActivate(context);

      expect(mockMtlsService.validateCertificate).toHaveBeenCalledWith(certPem);
    });

    it('should extract from ssl-client-cert header', () => {
      const certPem = '-----BEGIN CERTIFICATE-----\ntest\n-----END CERTIFICATE-----';
      mockReflector.getAllAndOverride.mockReturnValue(false);
      mockMtlsService.validateCertificate.mockReturnValue({
        isValid: true,
        certificate: {} as any,
        errors: [],
        warnings: [],
      });
      mockMtlsService.extractDeviceId.mockReturnValue(null);

      const context = createMockContext({ 'ssl-client-cert': encodeURIComponent(certPem) });
      guard.canActivate(context);

      expect(mockMtlsService.validateCertificate).toHaveBeenCalledWith(certPem);
    });
  });
});
