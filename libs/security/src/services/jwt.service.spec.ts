/**
 * JWT Service Tests
 */

import { JwtService } from './jwt.service';
import { UserRole, Permission } from '../types';

describe('JwtService', () => {
  let service: JwtService;

  beforeEach(() => {
    service = new JwtService({
      secret: 'test-secret-key',
      accessTokenExpiration: '15m',
      refreshTokenExpiration: '7d',
      issuer: 'fleetforge',
      audience: 'fleetforge-api',
    });
  });

  describe('generateTokenPair', () => {
    it('should generate access and refresh tokens', async () => {
      const payload = {
        sub: 'user-123',
        email: 'test@example.com',
        role: UserRole.ADMIN,
        permissions: [Permission.DEVICE_READ, Permission.DEVICE_WRITE],
        type: 'user' as const,
      };

      const result = await service.generateTokenPair(payload);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('expiresIn');
      expect(typeof result.accessToken).toBe('string');
      expect(typeof result.refreshToken).toBe('string');
      expect(result.expiresIn).toBe(15 * 60); // 15 minutes in seconds
    });
  });

  describe('verifyToken', () => {
    it('should verify valid token', async () => {
      const payload = {
        sub: 'user-123',
        email: 'test@example.com',
        role: UserRole.ADMIN,
        permissions: [Permission.DEVICE_READ],
        type: 'user' as const,
      };

      const token = await service.generateAccessToken(payload);
      const verified = await service.verifyToken(token);

      expect(verified.sub).toBe(payload.sub);
      expect(verified.email).toBe(payload.email);
      expect(verified.role).toBe(payload.role);
    });

    it('should throw error for invalid token', async () => {
      await expect(service.verifyToken('invalid-token')).rejects.toThrow();
    });
  });

  describe('decodeToken', () => {
    it('should decode token without verification', async () => {
      const payload = {
        sub: 'user-123',
        email: 'test@example.com',
        role: UserRole.VIEWER,
        permissions: [Permission.DEVICE_READ],
        type: 'user' as const,
      };

      const token = await service.generateAccessToken(payload);
      const decoded = service.decodeToken(token);

      expect(decoded).not.toBeNull();
      expect(decoded?.sub).toBe(payload.sub);
      expect(decoded?.email).toBe(payload.email);
    });

    it('should return null for invalid token', () => {
      const decoded = service.decodeToken('invalid-token');
      expect(decoded).toBeNull();
    });
  });

  describe('isTokenExpired', () => {
    it('should return false for valid token', async () => {
      const payload = {
        sub: 'user-123',
        role: UserRole.ADMIN,
        permissions: [],
        type: 'user' as const,
      };

      const token = await service.generateAccessToken(payload);
      const isExpired = service.isTokenExpired(token);

      expect(isExpired).toBe(false);
    });

    it('should return true for invalid token', () => {
      const isExpired = service.isTokenExpired('invalid-token');
      expect(isExpired).toBe(true);
    });
  });

  describe('parseExpiration', () => {
    it('should parse seconds', async () => {
      const service2 = new JwtService({
        secret: 'test',
        accessTokenExpiration: '30s',
        refreshTokenExpiration: '1d',
      });

      const payload = {
        sub: 'test',
        role: UserRole.VIEWER,
        permissions: [],
        type: 'user' as const,
      };

      const result = await service2.generateTokenPair(payload);
      expect(result.expiresIn).toBe(30);
    });

    it('should parse minutes', async () => {
      const result = await service.generateTokenPair({
        sub: 'test',
        role: UserRole.VIEWER,
        permissions: [],
        type: 'user' as const,
      });
      expect(result.expiresIn).toBe(15 * 60);
    });

    it('should parse hours', async () => {
      const service2 = new JwtService({
        secret: 'test',
        accessTokenExpiration: '2h',
        refreshTokenExpiration: '1d',
      });

      const result = await service2.generateTokenPair({
        sub: 'test',
        role: UserRole.VIEWER,
        permissions: [],
        type: 'user' as const,
      });
      expect(result.expiresIn).toBe(2 * 3600);
    });

    it('should parse days', async () => {
      const service2 = new JwtService({
        secret: 'test',
        accessTokenExpiration: '1d',
        refreshTokenExpiration: '7d',
      });

      const result = await service2.generateTokenPair({
        sub: 'test',
        role: UserRole.VIEWER,
        permissions: [],
        type: 'user' as const,
      });
      expect(result.expiresIn).toBe(86400);
    });
  });
});

