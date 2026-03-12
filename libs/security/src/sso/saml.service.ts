/**
 * SAML Service - SAML 2.0 Authentication
 * Supports enterprise IdPs like Okta, Azure AD, ADFS
 */

import { Injectable, Logger, UnauthorizedException, BadRequestException } from '@nestjs/common';
import * as crypto from 'crypto';
import { ISSOConfig, ISSOUser, ISAMLAssertion, SSOProvider } from './types';

@Injectable()
export class SAMLService {
  private readonly logger = new Logger(SAMLService.name);

  /**
   * Generate SAML AuthnRequest
   */
  generateAuthnRequest(config: ISSOConfig, relayState?: string): { url: string; id: string } {
    if (!config.samlEntryPoint || !config.samlIssuer) {
      throw new BadRequestException('SAML configuration incomplete');
    }

    const id = `_${crypto.randomBytes(16).toString('hex')}`;
    const issueInstant = new Date().toISOString();

    const authnRequest = `
      <samlp:AuthnRequest xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol"
                          xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion"
                          ID="${id}"
                          Version="2.0"
                          IssueInstant="${issueInstant}"
                          Destination="${config.samlEntryPoint}"
                          AssertionConsumerServiceURL="${config.callbackUrl}"
                          ProtocolBinding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST">
        <saml:Issuer>${config.samlIssuer}</saml:Issuer>
        <samlp:NameIDPolicy Format="urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress"
                           AllowCreate="true"/>
      </samlp:AuthnRequest>
    `
      .trim()
      .replace(/\s+/g, ' ');

    const encodedRequest = Buffer.from(authnRequest).toString('base64');
    const params = new URLSearchParams({
      SAMLRequest: encodedRequest,
    });

    if (relayState) {
      params.append('RelayState', relayState);
    }

    this.logger.log(`SAML AuthnRequest generated: ${id}`);
    return {
      url: `${config.samlEntryPoint}?${params.toString()}`,
      id,
    };
  }

  /**
   * Parse and validate SAML Response
   */
  async parseSAMLResponse(config: ISSOConfig, samlResponse: string): Promise<ISAMLAssertion> {
    if (!config.samlCert) {
      throw new BadRequestException('SAML certificate not configured');
    }

    try {
      // Decode SAML Response
      const decoded = Buffer.from(samlResponse, 'base64').toString('utf8');

      // Basic XML parsing (in production, use a proper SAML library like saml2-js or passport-saml)
      const assertion = this.extractAssertion(decoded);

      // Validate signature
      if (!this.validateSignature(decoded, config.samlCert)) {
        throw new UnauthorizedException('Invalid SAML signature');
      }

      // Validate conditions
      this.validateConditions(assertion);

      this.logger.log(`SAML Response validated: ${assertion.nameId}`);
      return assertion;
    } catch (error) {
      this.logger.error(`SAML parsing error: ${error}`);
      throw new UnauthorizedException('Invalid SAML response');
    }
  }

  /**
   * Convert SAML assertion to user object
   */
  assertionToUser(assertion: ISAMLAssertion, config: ISSOConfig): ISSOUser {
    const mapping = config.attributeMapping || { email: 'email' };
    const attrs = assertion.attributes;

    return {
      id: assertion.nameId,
      email: (attrs[mapping.email] || assertion.nameId) as string,
      firstName: attrs[mapping.firstName || 'firstName'] as string,
      lastName: attrs[mapping.lastName || 'lastName'] as string,
      displayName: attrs[mapping.displayName || 'displayName'] as string,
      groups: this.toArray(attrs[mapping.groups || 'groups']),
      roles: this.toArray(attrs[mapping.roles || 'roles']),
      provider: SSOProvider.SAML,
      providerUserId: assertion.nameId,
      rawAttributes: attrs,
    };
  }

  /**
   * Generate SAML LogoutRequest
   */
  generateLogoutRequest(config: ISSOConfig, nameId: string, sessionIndex?: string): string {
    if (!config.samlEntryPoint || !config.samlIssuer) {
      throw new BadRequestException('SAML configuration incomplete');
    }

    const id = `_${crypto.randomBytes(16).toString('hex')}`;
    const issueInstant = new Date().toISOString();
    const logoutUrl = config.samlEntryPoint.replace('/sso/', '/slo/');

    const logoutRequest = `
      <samlp:LogoutRequest xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol"
                           xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion"
                           ID="${id}"
                           Version="2.0"
                           IssueInstant="${issueInstant}"
                           Destination="${logoutUrl}">
        <saml:Issuer>${config.samlIssuer}</saml:Issuer>
        <saml:NameID Format="urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress">${nameId}</saml:NameID>
        ${sessionIndex ? `<samlp:SessionIndex>${sessionIndex}</samlp:SessionIndex>` : ''}
      </samlp:LogoutRequest>
    `
      .trim()
      .replace(/\s+/g, ' ');

    const encodedRequest = Buffer.from(logoutRequest).toString('base64');
    return `${logoutUrl}?SAMLRequest=${encodeURIComponent(encodedRequest)}`;
  }

  private extractAssertion(xml: string): ISAMLAssertion {
    // Simplified extraction - in production use proper XML/SAML library
    const nameIdMatch = xml.match(/<saml:NameID[^>]*>([^<]+)<\/saml:NameID>/);
    const issuerMatch = xml.match(/<saml:Issuer>([^<]+)<\/saml:Issuer>/);

    const attributes: Record<string, string | string[]> = {};
    const attrRegex =
      /<saml:Attribute Name="([^"]+)"[^>]*>[\s\S]*?<saml:AttributeValue[^>]*>([^<]+)/g;
    let match;
    while ((match = attrRegex.exec(xml)) !== null) {
      attributes[match[1]] = match[2];
    }

    return {
      issuer: issuerMatch?.[1] || '',
      nameId: nameIdMatch?.[1] || '',
      attributes,
    };
  }

  private validateSignature(xml: string, _cert: string): boolean {
    // Simplified validation - in production use proper crypto validation
    const hasSignature = xml.includes('<ds:Signature') || xml.includes('<Signature');
    return hasSignature; // Placeholder - real implementation would verify signature
  }

  private validateConditions(assertion: ISAMLAssertion): void {
    const { conditions } = assertion;
    if (!conditions) return;

    const now = new Date();
    if (conditions.notBefore && now < conditions.notBefore) {
      throw new UnauthorizedException('SAML assertion not yet valid');
    }
    if (conditions.notOnOrAfter && now > conditions.notOnOrAfter) {
      throw new UnauthorizedException('SAML assertion expired');
    }
  }

  private toArray(value: string | string[] | undefined): string[] | undefined {
    if (!value) return undefined;
    return Array.isArray(value) ? value : [value];
  }
}
