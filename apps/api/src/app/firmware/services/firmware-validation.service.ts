/**
 * Firmware Validation Service
 * Handles checksum verification and digital signature validation
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

export interface IValidationResult {
  isValid: boolean;
  checksumValid: boolean;
  signatureValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface IFirmwareValidationOptions {
  expectedChecksum?: string;
  checksumAlgorithm?: string;
  signature?: string;
  publicKey?: string;
  signatureAlgorithm?: string;
  maxFileSize?: number;
  allowedExtensions?: string[];
}

@Injectable()
export class FirmwareValidationService {
  private readonly logger = new Logger(FirmwareValidationService.name);
  private readonly maxFileSize: number;
  private readonly allowedExtensions: string[];

  constructor(private readonly configService: ConfigService) {
    this.maxFileSize = this.configService.get<number>(
      'FIRMWARE_MAX_SIZE_BYTES',
      100 * 1024 * 1024, // 100MB default
    );
    this.allowedExtensions = ['.bin', '.hex', '.elf', '.img', '.fw'];
  }

  /**
   * Validate firmware file completely
   */
  async validateFirmware(
    buffer: Buffer,
    filename: string,
    options: IFirmwareValidationOptions = {},
  ): Promise<IValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    let checksumValid = true;
    let signatureValid = true;

    // 1. Validate file size
    const maxSize = options.maxFileSize || this.maxFileSize;
    if (buffer.length > maxSize) {
      errors.push(`File size ${buffer.length} exceeds maximum allowed size ${maxSize}`);
    }

    // 2. Validate file extension
    const ext = this.getExtension(filename).toLowerCase();
    const allowed = options.allowedExtensions || this.allowedExtensions;
    if (!allowed.includes(ext)) {
      errors.push(`File extension ${ext} not allowed. Allowed: ${allowed.join(', ')}`);
    }

    // 3. Validate checksum if provided
    if (options.expectedChecksum) {
      const algorithm = options.checksumAlgorithm || 'sha256';
      const actualChecksum = this.calculateChecksum(buffer, algorithm);

      if (actualChecksum !== options.expectedChecksum.toLowerCase()) {
        checksumValid = false;
        errors.push(
          `Checksum mismatch. Expected: ${options.expectedChecksum}, Got: ${actualChecksum}`,
        );
      }
      this.logger.debug(`Checksum validation: ${checksumValid ? 'PASSED' : 'FAILED'}`);
    } else {
      warnings.push('No checksum provided for validation');
    }

    // 4. Validate digital signature if provided
    if (options.signature && options.publicKey) {
      signatureValid = await this.verifySignature(
        buffer,
        options.signature,
        options.publicKey,
        options.signatureAlgorithm || 'RSA-SHA256',
      );
      if (!signatureValid) {
        errors.push('Digital signature verification failed');
      }
      this.logger.debug(`Signature validation: ${signatureValid ? 'PASSED' : 'FAILED'}`);
    } else {
      warnings.push('No digital signature provided for validation');
    }

    // 5. Basic binary validation
    if (buffer.length < 100) {
      errors.push('Firmware file appears to be too small to be valid');
    }

    const isValid = errors.length === 0;

    return {
      isValid,
      checksumValid,
      signatureValid,
      errors,
      warnings,
    };
  }

  /**
   * Calculate checksum of a buffer
   */
  calculateChecksum(buffer: Buffer, algorithm = 'sha256'): string {
    return crypto.createHash(algorithm).update(buffer).digest('hex');
  }

  /**
   * Verify digital signature
   */
  async verifySignature(
    data: Buffer,
    signature: string,
    publicKey: string,
    algorithm: string,
  ): Promise<boolean> {
    try {
      const signatureBuffer = Buffer.from(signature, 'base64');

      // Map algorithm names to Node.js crypto format
      const cryptoAlgorithm = this.mapAlgorithm(algorithm);

      const verify = crypto.createVerify(cryptoAlgorithm);
      verify.update(data);

      return verify.verify(publicKey, signatureBuffer);
    } catch (error) {
      this.logger.error(`Signature verification error: ${(error as Error).message}`);
      return false;
    }
  }

  /**
   * Generate signature for firmware (for testing/dev)
   */
  async signFirmware(data: Buffer, privateKey: string, algorithm = 'RSA-SHA256'): Promise<string> {
    const cryptoAlgorithm = this.mapAlgorithm(algorithm);
    const sign = crypto.createSign(cryptoAlgorithm);
    sign.update(data);
    return sign.sign(privateKey, 'base64');
  }

  private mapAlgorithm(algorithm: string): string {
    const mapping: Record<string, string> = {
      'RSA-SHA256': 'RSA-SHA256',
      'ECDSA-SHA256': 'SHA256',
      Ed25519: 'ed25519',
    };
    return mapping[algorithm] || algorithm;
  }

  private getExtension(filename: string): string {
    const lastDot = filename.lastIndexOf('.');
    return lastDot !== -1 ? filename.slice(lastDot) : '';
  }
}
