/**
 * SSO Service - Unified Single Sign-On Service
 * Orchestrates OAuth2/OIDC and SAML authentication flows
 */

import { Injectable, Logger } from '@nestjs/common';
import { OAuth2Service } from './oauth2.service';
import { SAMLService } from './saml.service';
import { ISSOConfig, ISSOUser, ISSOSession, SSOProvider, SSOProtocol } from './types';
import * as crypto from 'crypto';

export interface SSOLoginResult {
  user: ISSOUser;
  session: ISSOSession;
}

@Injectable()
export class SSOService {
  private readonly logger = new Logger(SSOService.name);
  private readonly sessions = new Map<string, ISSOSession>();

  // Provider-specific default configurations
  private readonly providerDefaults: Record<SSOProvider, Partial<ISSOConfig>> = {
    [SSOProvider.GOOGLE]: {
      protocol: SSOProtocol.OIDC,
      authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenUrl: 'https://oauth2.googleapis.com/token',
      userInfoUrl: 'https://openidconnect.googleapis.com/v1/userinfo',
      scopes: ['openid', 'email', 'profile'],
    },
    [SSOProvider.MICROSOFT]: {
      protocol: SSOProtocol.OIDC,
      authorizationUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
      tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
      userInfoUrl: 'https://graph.microsoft.com/oidc/userinfo',
      scopes: ['openid', 'email', 'profile', 'User.Read'],
    },
    [SSOProvider.OKTA]: {
      protocol: SSOProtocol.OIDC,
      scopes: ['openid', 'email', 'profile', 'groups'],
    },
    [SSOProvider.AUTH0]: {
      protocol: SSOProtocol.OIDC,
      scopes: ['openid', 'email', 'profile'],
    },
    [SSOProvider.SAML]: {
      protocol: SSOProtocol.SAML,
    },
    [SSOProvider.CUSTOM_OIDC]: {
      protocol: SSOProtocol.OIDC,
      scopes: ['openid', 'email', 'profile'],
    },
  };

  constructor(
    private readonly oauth2Service: OAuth2Service,
    private readonly samlService: SAMLService,
  ) {}

  /**
   * Get login URL for SSO provider
   */
  getLoginUrl(config: ISSOConfig, organizationId: string, redirectUrl?: string): string {
    const mergedConfig = this.mergeWithDefaults(config);

    if (mergedConfig.protocol === SSOProtocol.SAML) {
      const { url } = this.samlService.generateAuthnRequest(mergedConfig, organizationId);
      return url;
    }

    return this.oauth2Service.generateAuthorizationUrl(mergedConfig, organizationId, redirectUrl);
  }

  /**
   * Handle OAuth2 callback
   */
  async handleOAuth2Callback(
    config: ISSOConfig,
    code: string,
    state: string,
    organizationId: string,
  ): Promise<SSOLoginResult> {
    const mergedConfig = this.mergeWithDefaults(config);

    const tokens = await this.oauth2Service.exchangeCodeForTokens(mergedConfig, code, state);
    const user = await this.oauth2Service.getUserInfo(mergedConfig, tokens.accessToken);

    const session = this.createSession(
      user,
      organizationId,
      tokens.accessToken,
      tokens.refreshToken,
    );

    this.logger.log(`OAuth2 login successful: ${user.email} (org: ${organizationId})`);
    return { user, session };
  }

  /**
   * Handle SAML callback
   */
  async handleSAMLCallback(
    config: ISSOConfig,
    samlResponse: string,
    organizationId: string,
  ): Promise<SSOLoginResult> {
    const mergedConfig = this.mergeWithDefaults(config);

    const assertion = await this.samlService.parseSAMLResponse(mergedConfig, samlResponse);
    const user = this.samlService.assertionToUser(assertion, mergedConfig);

    const session = this.createSession(user, organizationId);

    this.logger.log(`SAML login successful: ${user.email} (org: ${organizationId})`);
    return { user, session };
  }

  /**
   * Validate and get session
   */
  getSession(sessionId: string): ISSOSession | null {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    if (new Date() > session.expiresAt) {
      this.sessions.delete(sessionId);
      return null;
    }

    return session;
  }

  /**
   * Logout and invalidate session
   */
  logout(sessionId: string): void {
    this.sessions.delete(sessionId);
    this.logger.log(`SSO session invalidated: ${sessionId}`);
  }

  /**
   * Get logout URL for SAML single logout
   */
  getSAMLLogoutUrl(config: ISSOConfig, nameId: string, sessionIndex?: string): string {
    return this.samlService.generateLogoutRequest(config, nameId, sessionIndex);
  }

  private createSession(
    user: ISSOUser,
    organizationId: string,
    accessToken?: string,
    refreshToken?: string,
  ): ISSOSession {
    const session: ISSOSession = {
      id: crypto.randomBytes(32).toString('hex'),
      userId: user.id,
      organizationId,
      provider: user.provider,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      accessToken: accessToken || '',
      refreshToken,
    };

    this.sessions.set(session.id, session);
    return session;
  }

  private mergeWithDefaults(config: ISSOConfig): ISSOConfig {
    const defaults = this.providerDefaults[config.provider] || {};
    return { ...defaults, ...config };
  }
}
