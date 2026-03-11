/**
 * AuthController Unit Tests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UserRole, JwtService, JwtAuthGuard } from '@fleetforge/security';
import { Reflector } from '@nestjs/core';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: jest.Mocked<AuthService>;

  const mockRegisterResponse = {
    id: 'user-123',
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    role: UserRole.VIEWER,
    createdAt: new Date(),
  };

  const mockLoginResponse = {
    accessToken: 'access-token',
    refreshToken: 'refresh-token',
    expiresIn: 3600,
    user: {
      id: 'user-123',
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe',
      role: UserRole.VIEWER,
    },
  };

  const mockRefreshResponse = {
    accessToken: 'new-access-token',
    refreshToken: 'new-refresh-token',
    expiresIn: 3600,
  };

  const mockProfile = {
    id: 'user-123',
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    role: UserRole.VIEWER,
    permissions: [],
    organizationId: 'org-123',
    isEmailVerified: false,
    createdAt: new Date(),
  };

  beforeEach(async () => {
    const mockAuthService = {
      register: jest.fn(),
      login: jest.fn(),
      refreshToken: jest.fn(),
      logout: jest.fn(),
      getProfile: jest.fn(),
    };

    const mockJwtService = {
      verifyToken: jest.fn(),
      generateTokenPair: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: Reflector, useValue: { get: jest.fn(), getAllAndOverride: jest.fn() } },
        {
          provide: JwtAuthGuard,
          useValue: { canActivate: jest.fn().mockReturnValue(true) },
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get(AuthService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('register', () => {
    it('should register a new user', async () => {
      authService.register.mockResolvedValue(mockRegisterResponse);

      const result = await controller.register({
        email: 'test@example.com',
        password: 'Password123!',
        firstName: 'John',
        lastName: 'Doe',
      });

      expect(result.email).toBe('test@example.com');
      expect(authService.register).toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('should login user', async () => {
      authService.login.mockResolvedValue(mockLoginResponse);

      const result = await controller.login({
        email: 'test@example.com',
        password: 'Password123!',
      });

      expect(result.accessToken).toBe('access-token');
      expect(result.user.email).toBe('test@example.com');
    });
  });

  describe('refreshToken', () => {
    it('should refresh token', async () => {
      authService.refreshToken.mockResolvedValue(mockRefreshResponse);

      const result = await controller.refreshToken({ refreshToken: 'old-token' });

      expect(result.accessToken).toBe('new-access-token');
    });
  });

  describe('logout', () => {
    it('should logout user', async () => {
      authService.logout.mockResolvedValue(undefined);

      await controller.logout('user-123');

      expect(authService.logout).toHaveBeenCalledWith('user-123');
    });
  });

  describe('getProfile', () => {
    it('should return user profile', async () => {
      authService.getProfile.mockResolvedValue(mockProfile);

      const result = await controller.getProfile('user-123');

      expect(result.email).toBe('test@example.com');
    });
  });

  describe('getMe', () => {
    it('should return current user payload', () => {
      const jwtPayload = {
        sub: 'user-123',
        email: 'test@example.com',
        role: UserRole.VIEWER,
        permissions: [],
        type: 'user' as const,
      };

      const result = controller.getMe(jwtPayload);

      expect(result.sub).toBe('user-123');
      expect(result.email).toBe('test@example.com');
    });
  });
});
