/**
 * Digital Signature Validation Service
 * Validates firmware signatures using cryptographic algorithms
 */

import { createVerify, createHash } from 'crypto';
import { ISignatureValidationResult } from '../types';

export interface ISignatureData {
  algorithm: string;
  signature: string;
  publicKey: string;
  timestamp: Date;
}

export interface IFirmwareData {
  buffer: Buffer;
  checksum: string;
  checksumAlgorithm: string;
}

export class SignatureValidationService {
  private readonly supportedAlgorithms = ['RSA-SHA256', 'ECDSA-SHA256', 'Ed25519'];

  /**
   * Validate firmware signature
   */
  async validateFirmwareSignature(
    firmwareData: IFirmwareData,
    signatureData: ISignatureData,
  ): Promise<ISignatureValidationResult> {
    const errors: string[] = [];

    // 1. Validate algorithm
    if (!this.supportedAlgorithms.includes(signatureData.algorithm)) {
      errors.push(
        `Unsupported algorithm: ${signatureData.algorithm}. Supported: ${this.supportedAlgorithms.join(', ')}`,
      );
      return {
        isValid: false,
        algorithm: signatureData.algorithm,
        timestamp: signatureData.timestamp,
        errors,
      };
    }

    // 2. Validate checksum
    const checksumValid = await this.validateChecksum(firmwareData);
    if (!checksumValid) {
      errors.push('Firmware checksum validation failed');
    }

    // 3. Validate signature expiration (30 days)
    const signatureExpired = this.isSignatureExpired(signatureData.timestamp);
    if (signatureExpired) {
      errors.push('Signature has expired (older than 30 days)');
    }

    // 4. Verify cryptographic signature
    const signatureValid = await this.verifyCryptographicSignature(
      firmwareData.buffer,
      signatureData,
    );
    if (!signatureValid) {
      errors.push('Cryptographic signature verification failed');
    }

    return {
      isValid: errors.length === 0,
      algorithm: signatureData.algorithm,
      timestamp: signatureData.timestamp,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * Validate firmware checksum
   */
  private async validateChecksum(firmwareData: IFirmwareData): Promise<boolean> {
    try {
      const hash = createHash(firmwareData.checksumAlgorithm.toLowerCase());
      hash.update(firmwareData.buffer);
      const calculatedChecksum = hash.digest('hex');

      return calculatedChecksum === firmwareData.checksum.toLowerCase();
    } catch (error) {
      console.error('Checksum validation error:', error);
      return false;
    }
  }

  /**
   * Check if signature is expired (older than 30 days)
   */
  private isSignatureExpired(timestamp: Date): boolean {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    return timestamp < thirtyDaysAgo;
  }

  /**
   * Verify cryptographic signature
   */
  private async verifyCryptographicSignature(
    data: Buffer,
    signatureData: ISignatureData,
  ): Promise<boolean> {
    try {
      const algorithmMap: Record<string, string> = {
        'RSA-SHA256': 'RSA-SHA256',
        'ECDSA-SHA256': 'sha256',
        Ed25519: 'sha256',
      };

      const algorithm = algorithmMap[signatureData.algorithm];
      if (!algorithm) {
        return false;
      }

      const verify = createVerify(algorithm);
      verify.update(data);
      verify.end();

      const signatureBuffer = Buffer.from(signatureData.signature, 'base64');
      const publicKey = this.formatPublicKey(signatureData.publicKey);

      return verify.verify(publicKey, signatureBuffer);
    } catch (error) {
      console.error('Signature verification error:', error);
      return false;
    }
  }

  /**
   * Format public key for verification
   */
  private formatPublicKey(publicKey: string): string {
    // If already formatted, return as is
    if (publicKey.includes('BEGIN PUBLIC KEY')) {
      return publicKey;
    }

    // Format as PEM
    return `-----BEGIN PUBLIC KEY-----\n${publicKey}\n-----END PUBLIC KEY-----`;
  }

  /**
   * Generate checksum for firmware
   */
  async generateChecksum(
    buffer: Buffer,
    algorithm: string = 'sha256',
  ): Promise<string> {
    const hash = createHash(algorithm);
    hash.update(buffer);
    return hash.digest('hex');
  }

  /**
   * Validate signature data structure
   */
  validateSignatureData(signatureData: ISignatureData): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!signatureData.algorithm) {
      errors.push('Algorithm is required');
    }

    if (!signatureData.signature) {
      errors.push('Signature is required');
    }

    if (!signatureData.publicKey) {
      errors.push('Public key is required');
    }

    if (!signatureData.timestamp) {
      errors.push('Timestamp is required');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

