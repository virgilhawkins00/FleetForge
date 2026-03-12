/**
 * mTLS (Mutual TLS) Service
 * Handles device certificate validation and management
 */

import { Injectable, Logger } from '@nestjs/common';
import { X509Certificate } from 'crypto';

export interface ICertificateInfo {
  subject: string;
  issuer: string;
  serialNumber: string;
  validFrom: Date;
  validTo: Date;
  fingerprint: string;
  publicKeyAlgorithm: string;
  deviceId?: string;
  organizationId?: string;
}

export interface ICertificateValidationResult {
  isValid: boolean;
  certificate?: ICertificateInfo;
  errors: string[];
  warnings: string[];
}

export interface IDeviceCertificateRequest {
  deviceId: string;
  organizationId: string;
  commonName: string;
  validityDays?: number;
}

@Injectable()
export class MtlsService {
  private readonly logger = new Logger(MtlsService.name);
  private readonly trustedCAs: Map<string, X509Certificate> = new Map();
  private readonly revokedCertificates: Set<string> = new Set();

  /**
   * Validate a client certificate
   */
  validateCertificate(certPem: string): ICertificateValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      const cert = new X509Certificate(certPem);
      const certInfo = this.extractCertificateInfo(cert);

      // Check expiration
      const now = new Date();
      if (now < certInfo.validFrom) {
        errors.push('Certificate is not yet valid');
      }
      if (now > certInfo.validTo) {
        errors.push('Certificate has expired');
      }

      // Check if certificate is about to expire (30 days warning)
      const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      if (certInfo.validTo < thirtyDaysFromNow && now < certInfo.validTo) {
        warnings.push('Certificate will expire within 30 days');
      }

      // Check revocation
      if (this.revokedCertificates.has(certInfo.fingerprint)) {
        errors.push('Certificate has been revoked');
      }

      // Validate certificate chain if CAs are configured
      if (this.trustedCAs.size > 0) {
        const chainValid = this.validateCertificateChain(cert);
        if (!chainValid) {
          errors.push('Certificate chain validation failed');
        }
      }

      return {
        isValid: errors.length === 0,
        certificate: certInfo,
        errors,
        warnings,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Certificate validation failed: ${errorMessage}`);
      return {
        isValid: false,
        errors: [`Invalid certificate format: ${errorMessage}`],
        warnings,
      };
    }
  }

  /**
   * Extract device ID from certificate
   */
  extractDeviceId(certPem: string): string | null {
    try {
      const cert = new X509Certificate(certPem);
      const subject = cert.subject;

      // Look for device ID in CN or OU
      // Node.js X509Certificate.subject uses newline as separator
      const cnMatch = subject.match(/CN=([^\n,]+)/);
      if (cnMatch) {
        const cn = cnMatch[1].trim();
        // If CN starts with 'device-', it's the device ID
        if (cn.startsWith('device-')) {
          return cn;
        }
      }

      // Check Subject Alternative Names
      const san = cert.subjectAltName;
      if (san) {
        const uriMatch = san.match(/URI:urn:fleetforge:device:([a-zA-Z0-9-]+)/);
        if (uriMatch) {
          return uriMatch[1];
        }
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * Add a trusted CA certificate
   */
  addTrustedCA(caPem: string, name: string): void {
    try {
      const cert = new X509Certificate(caPem);
      this.trustedCAs.set(name, cert);
      this.logger.log(`Added trusted CA: ${name}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to add CA ${name}: ${errorMessage}`);
      throw new Error(`Invalid CA certificate: ${errorMessage}`);
    }
  }

  /**
   * Revoke a certificate by fingerprint
   */
  revokeCertificate(fingerprint: string): void {
    this.revokedCertificates.add(fingerprint);
    this.logger.warn(`Certificate revoked: ${fingerprint}`);
  }

  /**
   * Check if a certificate is revoked
   */
  isRevoked(fingerprint: string): boolean {
    return this.revokedCertificates.has(fingerprint);
  }

  /**
   * Generate certificate fingerprint
   */
  generateFingerprint(certPem: string): string {
    const cert = new X509Certificate(certPem);
    return cert.fingerprint256.replace(/:/g, '').toLowerCase();
  }

  private extractCertificateInfo(cert: X509Certificate): ICertificateInfo {
    const fingerprint = cert.fingerprint256.replace(/:/g, '').toLowerCase();

    // Extract deviceId and organizationId from subject
    const subject = cert.subject;
    let deviceId: string | undefined;
    let organizationId: string | undefined;

    // Node.js X509Certificate.subject uses newline as separator
    const cnMatch = subject.match(/CN=([^\n,]+)/);
    if (cnMatch) {
      const cn = cnMatch[1].trim();
      if (cn.startsWith('device-')) {
        deviceId = cn;
      }
    }

    const ouMatch = subject.match(/OU=([^\n,]+)/);
    if (ouMatch) {
      organizationId = ouMatch[1].trim();
    }

    return {
      subject: cert.subject,
      issuer: cert.issuer,
      serialNumber: cert.serialNumber,
      validFrom: new Date(cert.validFrom),
      validTo: new Date(cert.validTo),
      fingerprint,
      publicKeyAlgorithm: cert.publicKey.asymmetricKeyType || 'unknown',
      deviceId,
      organizationId,
    };
  }

  private validateCertificateChain(cert: X509Certificate): boolean {
    // Check if any trusted CA can verify this certificate
    for (const [, caCert] of this.trustedCAs) {
      try {
        if (cert.checkIssued(caCert)) {
          return cert.verify(caCert.publicKey);
        }
      } catch {
        continue;
      }
    }
    return false;
  }
}
