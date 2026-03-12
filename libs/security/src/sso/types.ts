/**
 * SSO Types - Enterprise Single Sign-On
 * Supports SAML 2.0, OAuth2, and OIDC protocols
 */

export enum SSOProvider {
  GOOGLE = 'google',
  MICROSOFT = 'microsoft',
  OKTA = 'okta',
  AUTH0 = 'auth0',
  SAML = 'saml',
  CUSTOM_OIDC = 'custom_oidc',
}

export enum SSOProtocol {
  SAML = 'saml',
  OAUTH2 = 'oauth2',
  OIDC = 'oidc',
}

export interface ISSOConfig {
  provider: SSOProvider;
  protocol: SSOProtocol;
  enabled: boolean;
  clientId?: string;
  clientSecret?: string;
  issuer?: string;
  authorizationUrl?: string;
  tokenUrl?: string;
  userInfoUrl?: string;
  callbackUrl?: string;
  scopes?: string[];
  // SAML specific
  samlEntryPoint?: string;
  samlIssuer?: string;
  samlCert?: string;
  samlPrivateKey?: string;
  // Attribute mapping
  attributeMapping?: ISSOAttributeMapping;
}

export interface ISSOAttributeMapping {
  email: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  groups?: string;
  roles?: string;
}

export interface ISSOUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  groups?: string[];
  roles?: string[];
  provider: SSOProvider;
  providerUserId: string;
  rawAttributes?: Record<string, unknown>;
}

export interface ISSOAuthResponse {
  accessToken: string;
  refreshToken?: string;
  idToken?: string;
  expiresIn?: number;
  tokenType?: string;
  scope?: string;
}

export interface ISSOSession {
  id: string;
  userId: string;
  organizationId: string;
  provider: SSOProvider;
  createdAt: Date;
  expiresAt: Date;
  accessToken: string;
  refreshToken?: string;
}

export interface IOAuthState {
  organizationId: string;
  redirectUrl?: string;
  nonce: string;
  createdAt: Date;
}

export interface ISAMLAssertion {
  issuer: string;
  nameId: string;
  nameIdFormat?: string;
  sessionIndex?: string;
  attributes: Record<string, string | string[]>;
  conditions?: {
    notBefore?: Date;
    notOnOrAfter?: Date;
    audience?: string;
  };
}
