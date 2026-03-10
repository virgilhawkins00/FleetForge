/**
 * Auth Service - Handles authentication logic
 */

import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { UserRepository } from '@fleetforge/database';
import {
  JwtService,
  PasswordService,
  UserRole,
  Permission,
  IJwtPayload,
} from '@fleetforge/security';
import {
  RegisterDto,
  RegisterResponseDto,
  LoginDto,
  LoginResponseDto,
  RefreshTokenResponseDto,
} from './dto';

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

@Injectable()
export class AuthService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly jwtService: JwtService,
    private readonly passwordService: PasswordService,
  ) {}

  async register(dto: RegisterDto): Promise<RegisterResponseDto> {
    // Check if email already exists
    const emailExists = await this.userRepository.emailExists(dto.email);
    if (emailExists) {
      throw new ConflictException('Email already registered');
    }

    // Hash password
    const passwordHash = await this.passwordService.hash(dto.password);

    // Create user
    const user = await this.userRepository.create({
      id: uuidv4(),
      email: dto.email,
      passwordHash,
      firstName: dto.firstName,
      lastName: dto.lastName,
      role: UserRole.VIEWER,
      permissions: [Permission.DEVICE_READ, Permission.FLEET_READ],
      organizationId: dto.organizationId,
    });

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      createdAt: user.createdAt,
    };
  }

  async login(dto: LoginDto): Promise<LoginResponseDto> {
    // Find user by email
    const user = await this.userRepository.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if account is locked
    if (user.lockoutUntil && user.lockoutUntil > new Date()) {
      const remainingMs = user.lockoutUntil.getTime() - Date.now();
      const remainingMin = Math.ceil(remainingMs / 60000);
      throw new UnauthorizedException(`Account locked. Try again in ${remainingMin} minutes`);
    }

    // Check if account is active
    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    // Verify password
    const isPasswordValid = await this.passwordService.verify(dto.password, user.passwordHash);

    if (!isPasswordValid) {
      // Increment failed attempts
      const updated = await this.userRepository.incrementFailedAttempts(user.id);

      if (updated && updated.failedLoginAttempts >= MAX_FAILED_ATTEMPTS) {
        // Lock account
        await this.userRepository.update(user.id, {
          lockoutUntil: new Date(Date.now() + LOCKOUT_DURATION_MS),
        });
        throw new UnauthorizedException('Account locked due to too many failed attempts');
      }

      throw new UnauthorizedException('Invalid credentials');
    }

    // Reset failed attempts on successful login
    await this.userRepository.resetFailedAttempts(user.id);

    // Generate tokens
    const payload: IJwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      permissions: user.permissions,
      type: 'user',
    };

    const tokens = await this.jwtService.generateTokenPair(payload);

    // Store refresh token
    await this.userRepository.update(user.id, {
      refreshToken: tokens.refreshToken,
      lastLoginAt: new Date(),
    });

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: tokens.expiresIn,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
    };
  }

  async refreshToken(refreshToken: string): Promise<RefreshTokenResponseDto> {
    // Verify refresh token
    let payload: IJwtPayload;
    try {
      payload = await this.jwtService.verifyToken(refreshToken);
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Find user with this refresh token
    const user = await this.userRepository.findByRefreshToken(refreshToken);
    if (!user || user.id !== payload.sub) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Generate new tokens
    const newPayload: IJwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      permissions: user.permissions,
      type: 'user',
    };

    const tokens = await this.jwtService.generateTokenPair(newPayload);

    // Update refresh token
    await this.userRepository.update(user.id, {
      refreshToken: tokens.refreshToken,
    });

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: tokens.expiresIn,
    };
  }

  async logout(userId: string): Promise<void> {
    await this.userRepository.update(userId, {
      refreshToken: undefined,
    });
  }

  async getProfile(userId: string) {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new BadRequestException('User not found');
    }

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      permissions: user.permissions,
      organizationId: user.organizationId,
      isEmailVerified: user.isEmailVerified,
      createdAt: user.createdAt,
    };
  }
}
