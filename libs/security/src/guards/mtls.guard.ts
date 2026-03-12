/**
 * mTLS Guard
 * Validates client certificates for device authentication
 */

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { MtlsService, ICertificateInfo } from '../services/mtls.service';

export const MTLS_REQUIRED_KEY = 'mtls:required';
export const MTLS_OPTIONAL_KEY = 'mtls:optional';

export interface IMtlsRequest {
  mtls?: {
    certificate: ICertificateInfo;
    deviceId: string | null;
    verified: boolean;
  };
}

@Injectable()
export class MtlsGuard implements CanActivate {
  private readonly logger = new Logger(MtlsGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly mtlsService: MtlsService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();

    // Check if mTLS is required for this route
    const mtlsRequired = this.reflector.getAllAndOverride<boolean>(MTLS_REQUIRED_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Extract client certificate from request
    const clientCert = this.extractClientCertificate(request);

    if (!clientCert) {
      if (mtlsRequired) {
        this.logger.warn('mTLS required but no client certificate provided');
        throw new UnauthorizedException('Client certificate required');
      }
      // If mTLS is optional or not configured, allow the request
      return true;
    }

    // Validate the certificate
    const validationResult = this.mtlsService.validateCertificate(clientCert);

    if (!validationResult.isValid) {
      this.logger.warn(`Certificate validation failed: ${validationResult.errors.join(', ')}`);

      if (mtlsRequired) {
        throw new UnauthorizedException(
          `Invalid client certificate: ${validationResult.errors[0]}`,
        );
      }

      // If optional, just don't set the mtls info
      return true;
    }

    // Log warnings if any
    if (validationResult.warnings.length > 0) {
      this.logger.warn(`Certificate warnings: ${validationResult.warnings.join(', ')}`);
    }

    // Extract device ID from certificate
    const deviceId = this.mtlsService.extractDeviceId(clientCert);

    // Attach certificate info to request
    request.mtls = {
      certificate: validationResult.certificate,
      deviceId,
      verified: true,
    };

    this.logger.debug(`mTLS validated for device: ${deviceId || 'unknown'}`);
    return true;
  }

  private extractClientCertificate(request: any): string | null {
    // Method 1: Direct socket access (when running HTTPS server)
    if (request.socket?.getPeerCertificate) {
      const peerCert = request.socket.getPeerCertificate(true);
      if (peerCert && peerCert.raw) {
        return this.convertToPem(peerCert.raw);
      }
    }

    // Method 2: X-Client-Cert header (when behind reverse proxy like nginx)
    const clientCertHeader =
      request.headers['x-client-cert'] ||
      request.headers['x-ssl-client-cert'] ||
      request.headers['ssl-client-cert'];

    if (clientCertHeader) {
      // Decode URL-encoded PEM certificate
      return decodeURIComponent(clientCertHeader);
    }

    // Method 3: X-Client-Cert-Fingerprint (minimal info from proxy)
    // This is less secure but sometimes used
    const fingerprint = request.headers['x-client-cert-fingerprint'];
    if (fingerprint) {
      // Store fingerprint for later validation
      request.clientCertFingerprint = fingerprint;
    }

    return null;
  }

  private convertToPem(raw: Buffer): string {
    const base64 = raw.toString('base64');
    const lines: string[] = [];

    lines.push('-----BEGIN CERTIFICATE-----');
    for (let i = 0; i < base64.length; i += 64) {
      lines.push(base64.slice(i, i + 64));
    }
    lines.push('-----END CERTIFICATE-----');

    return lines.join('\n');
  }
}
