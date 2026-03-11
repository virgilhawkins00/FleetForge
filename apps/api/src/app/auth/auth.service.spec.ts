/**
 * AuthService Unit Tests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UserRepository } from '@fleetforge/database';
import { JwtService, PasswordService, UserRole, Permission } from '@fleetforge/security';

describe('AuthService', () => {
  let service: AuthService;
  let userRepo: jest.Mocked<UserRepository>;
  let jwtService: jest.Mocked<JwtService>;
  let passwordService: jest.Mocked<PasswordService>;

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    passwordHash: 'hashed-password',
    firstName: 'John',
    lastName: 'Doe',
    role: UserRole.VIEWER,
    permissions: [Permission.DEVICE_READ],
    organizationId: 'org-123',
    isActive: true,
    isEmailVerified: false,
    failedLoginAttempts: 0,
    lockoutUntil: null as Date | null,
    refreshToken: 'old-refresh-token',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const mockUserRepo = {
      create: jest.fn(),
      findById: jest.fn(),
      findByEmail: jest.fn(),
      findByRefreshToken: jest.fn(),
      update: jest.fn(),
      emailExists: jest.fn(),
      incrementFailedAttempts: jest.fn(),
      resetFailedAttempts: jest.fn(),
    };

    const mockJwtService = {
      generateTokenPair: jest.fn(),
      verifyToken: jest.fn(),
    };

    const mockPasswordService = {
      hash: jest.fn(),
      verify: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UserRepository, useValue: mockUserRepo },
        { provide: JwtService, useValue: mockJwtService },
        { provide: PasswordService, useValue: mockPasswordService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userRepo = module.get(UserRepository);
    jwtService = module.get(JwtService);
    passwordService = module.get(PasswordService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    it('should register a new user', async () => {
      userRepo.emailExists.mockResolvedValue(false);
      passwordService.hash.mockResolvedValue('hashed-password');
      userRepo.create.mockResolvedValue(mockUser as any);

      const result = await service.register({
        email: 'test@example.com',
        password: 'Password123!',
        firstName: 'John',
        lastName: 'Doe',
      });

      expect(result.email).toBe('test@example.com');
      expect(userRepo.create).toHaveBeenCalled();
    });

    it('should throw ConflictException if email exists', async () => {
      userRepo.emailExists.mockResolvedValue(true);

      await expect(
        service.register({
          email: 'test@example.com',
          password: 'Password123!',
          firstName: 'John',
          lastName: 'Doe',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('login', () => {
    it('should login successfully', async () => {
      userRepo.findByEmail.mockResolvedValue(mockUser as any);
      passwordService.verify.mockResolvedValue(true);
      userRepo.resetFailedAttempts.mockResolvedValue(mockUser as any);
      jwtService.generateTokenPair.mockResolvedValue({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        expiresIn: 3600,
      });
      userRepo.update.mockResolvedValue(mockUser as any);

      const result = await service.login({
        email: 'test@example.com',
        password: 'Password123!',
      });

      expect(result.accessToken).toBe('access-token');
      expect(result.user.email).toBe('test@example.com');
    });

    it('should throw UnauthorizedException if user not found', async () => {
      userRepo.findByEmail.mockResolvedValue(null);

      await expect(
        service.login({ email: 'test@example.com', password: 'Password123!' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if account is locked', async () => {
      const lockedUser = {
        ...mockUser,
        lockoutUntil: new Date(Date.now() + 600000), // 10 minutes from now
      };
      userRepo.findByEmail.mockResolvedValue(lockedUser as any);

      await expect(
        service.login({ email: 'test@example.com', password: 'Password123!' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if account is deactivated', async () => {
      const inactiveUser = { ...mockUser, isActive: false };
      userRepo.findByEmail.mockResolvedValue(inactiveUser as any);

      await expect(
        service.login({ email: 'test@example.com', password: 'Password123!' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException on invalid password', async () => {
      userRepo.findByEmail.mockResolvedValue(mockUser as any);
      passwordService.verify.mockResolvedValue(false);
      userRepo.incrementFailedAttempts.mockResolvedValue({
        ...mockUser,
        failedLoginAttempts: 1,
      } as any);

      await expect(
        service.login({ email: 'test@example.com', password: 'WrongPassword!' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should lock account after max failed attempts', async () => {
      userRepo.findByEmail.mockResolvedValue(mockUser as any);
      passwordService.verify.mockResolvedValue(false);
      userRepo.incrementFailedAttempts.mockResolvedValue({
        ...mockUser,
        failedLoginAttempts: 5,
      } as any);
      userRepo.update.mockResolvedValue(mockUser as any);

      await expect(
        service.login({ email: 'test@example.com', password: 'WrongPassword!' }),
      ).rejects.toThrow(UnauthorizedException);

      expect(userRepo.update).toHaveBeenCalledWith(
        mockUser.id,
        expect.objectContaining({ lockoutUntil: expect.any(Date) }),
      );
    });
  });

  describe('refreshToken', () => {
    it('should refresh token successfully', async () => {
      jwtService.verifyToken.mockResolvedValue({
        sub: 'user-123',
        email: 'test@example.com',
        role: UserRole.VIEWER,
        permissions: [],
        type: 'user',
      });
      userRepo.findByRefreshToken.mockResolvedValue(mockUser as any);
      jwtService.generateTokenPair.mockResolvedValue({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        expiresIn: 3600,
      });
      userRepo.update.mockResolvedValue(mockUser as any);

      const result = await service.refreshToken('old-refresh-token');

      expect(result.accessToken).toBe('new-access-token');
    });

    it('should throw UnauthorizedException on invalid refresh token', async () => {
      jwtService.verifyToken.mockRejectedValue(new Error('Invalid token'));

      await expect(service.refreshToken('invalid-token')).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if user not found', async () => {
      jwtService.verifyToken.mockResolvedValue({
        sub: 'user-123',
        email: 'test@example.com',
        role: UserRole.VIEWER,
        permissions: [],
        type: 'user',
      });
      userRepo.findByRefreshToken.mockResolvedValue(null);

      await expect(service.refreshToken('some-token')).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if user id does not match', async () => {
      jwtService.verifyToken.mockResolvedValue({
        sub: 'different-user',
        email: 'test@example.com',
        role: UserRole.VIEWER,
        permissions: [],
        type: 'user',
      });
      userRepo.findByRefreshToken.mockResolvedValue(mockUser as any);

      await expect(service.refreshToken('some-token')).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('logout', () => {
    it('should logout successfully', async () => {
      userRepo.update.mockResolvedValue(mockUser as any);

      await service.logout('user-123');

      expect(userRepo.update).toHaveBeenCalledWith('user-123', { refreshToken: undefined });
    });
  });

  describe('getProfile', () => {
    it('should return user profile', async () => {
      userRepo.findById.mockResolvedValue(mockUser as any);

      const result = await service.getProfile('user-123');

      expect(result.email).toBe('test@example.com');
      expect(result.firstName).toBe('John');
    });

    it('should throw BadRequestException if user not found', async () => {
      userRepo.findById.mockResolvedValue(null);

      await expect(service.getProfile('nonexistent')).rejects.toThrow(BadRequestException);
    });
  });
});
