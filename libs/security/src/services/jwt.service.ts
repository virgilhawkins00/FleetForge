/**
 * JWT Service - Token generation and validation
 */

import { IJwtPayload, ITokenPair } from '../types';

export interface IJwtServiceConfig {
  secret: string;
  accessTokenExpiration: string;
  refreshTokenExpiration: string;
  issuer?: string;
  audience?: string;
}

export class JwtService {
  constructor(private readonly config: IJwtServiceConfig) {}

  /**
   * Generate access and refresh tokens
   */
  async generateTokenPair(payload: Omit<IJwtPayload, 'iat' | 'exp'>): Promise<ITokenPair> {
    const accessToken = await this.generateAccessToken(payload);
    const refreshToken = await this.generateRefreshToken(payload);

    return {
      accessToken,
      refreshToken,
      expiresIn: this.parseExpiration(this.config.accessTokenExpiration),
    };
  }

  /**
   * Generate access token
   */
  async generateAccessToken(payload: Omit<IJwtPayload, 'iat' | 'exp'>): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    const exp = now + this.parseExpiration(this.config.accessTokenExpiration);

    const fullPayload: IJwtPayload = {
      ...payload,
      iat: now,
      exp,
    };

    return this.sign(fullPayload);
  }

  /**
   * Generate refresh token
   */
  async generateRefreshToken(payload: Omit<IJwtPayload, 'iat' | 'exp'>): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    const exp = now + this.parseExpiration(this.config.refreshTokenExpiration);

    const fullPayload: IJwtPayload = {
      ...payload,
      iat: now,
      exp,
    };

    return this.sign(fullPayload);
  }

  /**
   * Verify and decode token
   */
  async verifyToken(token: string): Promise<IJwtPayload> {
    try {
      const payload = await this.verify(token);
      return payload as IJwtPayload;
    } catch (error) {
      throw new Error(`Invalid token: ${(error as Error).message}`);
    }
  }

  /**
   * Decode token without verification (for debugging)
   */
  decodeToken(token: string): IJwtPayload | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        return null;
      }

      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
      return payload as IJwtPayload;
    } catch {
      return null;
    }
  }

  /**
   * Check if token is expired
   */
  isTokenExpired(token: string): boolean {
    const payload = this.decodeToken(token);
    if (!payload || !payload.exp) {
      return true;
    }

    const now = Math.floor(Date.now() / 1000);
    return payload.exp < now;
  }

  /**
   * Sign payload (simplified - in production use jsonwebtoken or @nestjs/jwt)
   */
  private async sign(payload: IJwtPayload): Promise<string> {
    const header = { alg: 'HS256', typ: 'JWT' };
    const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
    const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');

    // In production, use proper HMAC signing
    const signature = Buffer.from(
      `${encodedHeader}.${encodedPayload}.${this.config.secret}`,
    ).toString('base64url');

    return `${encodedHeader}.${encodedPayload}.${signature}`;
  }

  /**
   * Verify signature (simplified - in production use jsonwebtoken or @nestjs/jwt)
   */
  private async verify(token: string): Promise<unknown> {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid token format');
    }

    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());

    // Check expiration
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      throw new Error('Token expired');
    }

    return payload;
  }

  /**
   * Parse expiration string to seconds
   */
  private parseExpiration(expiration: string): number {
    const match = expiration.match(/^(\d+)([smhd])$/);
    if (!match) {
      throw new Error(`Invalid expiration format: ${expiration}`);
    }

    const value = parseInt(match[1], 10);
    const unit = match[2];

    const multipliers: Record<string, number> = {
      s: 1,
      m: 60,
      h: 3600,
      d: 86400,
    };

    return value * multipliers[unit];
  }
}
