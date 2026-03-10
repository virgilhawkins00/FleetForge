import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard, IS_PUBLIC_KEY } from './jwt-auth.guard';
import { JwtService } from '../services/jwt.service';
import { UserRole } from '../types';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let jwtService: JwtService;
  let reflector: Reflector;

  const mockJwtConfig = {
    secret: 'test-secret',
    accessTokenExpiration: '15m',
    refreshTokenExpiration: '7d',
  };

  const mockPayload = {
    sub: 'user-123',
    email: 'test@example.com',
    role: UserRole.ADMIN,
    permissions: [],
    type: 'user' as const,
  };

  const createMockContext = (headers: Record<string, string> = {}): ExecutionContext => {
    const request = {
      headers,
      user: undefined as any,
    };

    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
      getHandler: () => jest.fn(),
      getClass: () => jest.fn(),
    } as unknown as ExecutionContext;
  };

  beforeEach(() => {
    jwtService = new JwtService(mockJwtConfig);
    reflector = new Reflector();
    guard = new JwtAuthGuard(jwtService, reflector);
  });

  describe('canActivate', () => {
    it('should allow public routes', async () => {
      const context = createMockContext();
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should throw if no token provided', async () => {
      const context = createMockContext({});
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
      await expect(guard.canActivate(context)).rejects.toThrow('No token provided');
    });

    it('should throw if invalid authorization header format', async () => {
      const context = createMockContext({ authorization: 'InvalidFormat' });
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw if not Bearer token', async () => {
      const context = createMockContext({ authorization: 'Basic some-token' });
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    });

    it('should validate and attach user for valid token', async () => {
      const token = await jwtService.generateAccessToken(mockPayload);
      const context = createMockContext({ authorization: `Bearer ${token}` });
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      const request = context.switchToHttp().getRequest();
      expect(request.user).toBeDefined();
      expect(request.user.sub).toBe(mockPayload.sub);
    });

    it('should throw for expired token', async () => {
      // Create an expired token by mocking Date
      const expiredPayload = { ...mockPayload, exp: Math.floor(Date.now() / 1000) - 3600 };
      const expiredToken = await (jwtService as any).sign(expiredPayload);

      const context = createMockContext({ authorization: `Bearer ${expiredToken}` });
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw for invalid token', async () => {
      const context = createMockContext({ authorization: 'Bearer invalid.token.here' });
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw for malformed token', async () => {
      const context = createMockContext({ authorization: 'Bearer not-a-jwt' });
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('IS_PUBLIC_KEY', () => {
    it('should export the correct key', () => {
      expect(IS_PUBLIC_KEY).toBe('isPublic');
    });
  });
});

