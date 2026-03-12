/**
 * OAuth2 Service - OAuth2/OIDC Authentication
 * Supports Google, Microsoft, Okta, Auth0, and custom OIDC providers
 */

import { Injectable, Logger, UnauthorizedException, BadRequestException } from '@nestjs/common';
import * as crypto from 'crypto';
import { ISSOConfig, ISSOUser, ISSOAuthResponse, IOAuthState } from './types';

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  id_token?: string;
  expires_in?: number;
  token_type?: string;
  scope?: string;
}

interface UserInfoResponse {
  sub?: string;
  id?: string;
  email?: string;
  given_name?: string;
  family_name?: string;
  name?: string;
  groups?: string[];
  roles?: string[];
  [key: string]: unknown;
}

@Injectable()
export class OAuth2Service {
  private readonly logger = new Logger(OAuth2Service.name);
  private readonly stateStore = new Map<string, IOAuthState>();

  /**
   * Generate OAuth2 authorization URL
   */
  generateAuthorizationUrl(
    config: ISSOConfig,
    organizationId: string,
    redirectUrl?: string,
  ): string {
    if (!config.authorizationUrl || !config.clientId) {
      throw new BadRequestException('OAuth2 configuration incomplete');
    }

    const state = this.generateState(organizationId, redirectUrl);
    const nonce = crypto.randomBytes(16).toString('hex');

    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.callbackUrl || '',
      response_type: 'code',
      scope: (config.scopes || ['openid', 'email', 'profile']).join(' '),
      state,
      nonce,
    });

    // Add PKCE for enhanced security
    const codeVerifier = crypto.randomBytes(32).toString('base64url');
    const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');
    params.append('code_challenge', codeChallenge);
    params.append('code_challenge_method', 'S256');

    this.logger.log(`OAuth2 auth URL generated for org: ${organizationId}`);
    return `${config.authorizationUrl}?${params.toString()}`;
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCodeForTokens(
    config: ISSOConfig,
    code: string,
    state: string,
  ): Promise<ISSOAuthResponse> {
    const storedState = this.validateState(state);

    if (!config.tokenUrl || !config.clientId || !config.clientSecret) {
      throw new BadRequestException('OAuth2 token configuration incomplete');
    }

    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code,
      redirect_uri: config.callbackUrl || '',
    });

    try {
      const response = await fetch(config.tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
      });

      if (!response.ok) {
        const error = await response.text();
        this.logger.error(`Token exchange failed: ${error}`);
        throw new UnauthorizedException('Failed to exchange authorization code');
      }

      const data = (await response.json()) as TokenResponse;
      this.logger.log(`Token exchange successful for org: ${storedState.organizationId}`);

      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        idToken: data.id_token,
        expiresIn: data.expires_in,
        tokenType: data.token_type,
        scope: data.scope,
      };
    } catch (error) {
      this.logger.error(`Token exchange error: ${error}`);
      throw new UnauthorizedException('OAuth2 token exchange failed');
    }
  }

  /**
   * Get user info from provider
   */
  async getUserInfo(config: ISSOConfig, accessToken: string): Promise<ISSOUser> {
    if (!config.userInfoUrl) {
      throw new BadRequestException('UserInfo URL not configured');
    }

    try {
      const response = await fetch(config.userInfoUrl, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!response.ok) {
        throw new UnauthorizedException('Failed to fetch user info');
      }

      const data = (await response.json()) as UserInfoResponse;
      const mapping = config.attributeMapping || { email: 'email' };

      const id = data.sub || data.id || '';
      const email = (data[mapping.email] as string) || data.email || '';

      return {
        id,
        email,
        firstName: data[mapping.firstName || 'given_name'] as string | undefined,
        lastName: data[mapping.lastName || 'family_name'] as string | undefined,
        displayName: data[mapping.displayName || 'name'] as string | undefined,
        groups: data[mapping.groups || 'groups'] as string[] | undefined,
        roles: data[mapping.roles || 'roles'] as string[] | undefined,
        provider: config.provider,
        providerUserId: id,
        rawAttributes: data as Record<string, unknown>,
      };
    } catch (error) {
      this.logger.error(`UserInfo fetch error: ${error}`);
      throw new UnauthorizedException('Failed to get user information');
    }
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken(config: ISSOConfig, refreshToken: string): Promise<ISSOAuthResponse> {
    if (!config.tokenUrl || !config.clientId || !config.clientSecret) {
      throw new BadRequestException('OAuth2 refresh configuration incomplete');
    }

    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: refreshToken,
    });

    const response = await fetch(config.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    if (!response.ok) {
      throw new UnauthorizedException('Failed to refresh token');
    }

    const data = (await response.json()) as TokenResponse;
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      idToken: data.id_token,
      expiresIn: data.expires_in,
      tokenType: data.token_type,
    };
  }

  private generateState(organizationId: string, redirectUrl?: string): string {
    const state = crypto.randomBytes(32).toString('hex');
    this.stateStore.set(state, {
      organizationId,
      redirectUrl,
      nonce: crypto.randomBytes(16).toString('hex'),
      createdAt: new Date(),
    });
    // Auto-cleanup after 10 minutes
    setTimeout(() => this.stateStore.delete(state), 10 * 60 * 1000);
    return state;
  }

  private validateState(state: string): IOAuthState {
    const stored = this.stateStore.get(state);
    if (!stored) {
      throw new UnauthorizedException('Invalid or expired state parameter');
    }
    this.stateStore.delete(state);
    return stored;
  }
}
