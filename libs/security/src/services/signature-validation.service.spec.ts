/**
 * Signature Validation Service Tests
 */

import { SignatureValidationService } from './signature-validation.service';
import { createSign, generateKeyPairSync } from 'crypto';

describe('SignatureValidationService', () => {
  let service: SignatureValidationService;
  let keyPair: { publicKey: string; privateKey: string };

  beforeEach(() => {
    service = new SignatureValidationService();

    // Generate RSA key pair for testing
    const { publicKey, privateKey } = generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });

    keyPair = { publicKey, privateKey };
  });

  describe('generateChecksum', () => {
    it('should generate SHA256 checksum', async () => {
      const buffer = Buffer.from('test data');
      const checksum = await service.generateChecksum(buffer, 'sha256');

      expect(typeof checksum).toBe('string');
      expect(checksum).toHaveLength(64); // SHA256 = 64 hex chars
    });

    it('should generate consistent checksums', async () => {
      const buffer = Buffer.from('test data');
      const checksum1 = await service.generateChecksum(buffer);
      const checksum2 = await service.generateChecksum(buffer);

      expect(checksum1).toBe(checksum2);
    });

    it('should generate different checksums for different data', async () => {
      const buffer1 = Buffer.from('data 1');
      const buffer2 = Buffer.from('data 2');

      const checksum1 = await service.generateChecksum(buffer1);
      const checksum2 = await service.generateChecksum(buffer2);

      expect(checksum1).not.toBe(checksum2);
    });
  });

  describe('validateSignatureData', () => {
    it('should validate complete signature data', () => {
      const signatureData = {
        algorithm: 'RSA-SHA256',
        signature: 'base64-signature',
        publicKey: keyPair.publicKey,
        timestamp: new Date(),
      };

      const result = service.validateSignatureData(signatureData);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject missing algorithm', () => {
      const signatureData = {
        algorithm: '',
        signature: 'base64-signature',
        publicKey: keyPair.publicKey,
        timestamp: new Date(),
      };

      const result = service.validateSignatureData(signatureData);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Algorithm is required');
    });

    it('should reject missing signature', () => {
      const signatureData = {
        algorithm: 'RSA-SHA256',
        signature: '',
        publicKey: keyPair.publicKey,
        timestamp: new Date(),
      };

      const result = service.validateSignatureData(signatureData);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Signature is required');
    });

    it('should reject missing public key', () => {
      const signatureData = {
        algorithm: 'RSA-SHA256',
        signature: 'base64-signature',
        publicKey: '',
        timestamp: new Date(),
      };

      const result = service.validateSignatureData(signatureData);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Public key is required');
    });
  });

  describe('validateFirmwareSignature', () => {
    it('should validate correct signature', async () => {
      const firmwareBuffer = Buffer.from('firmware binary data');
      const checksum = await service.generateChecksum(firmwareBuffer);

      // Create signature
      const sign = createSign('RSA-SHA256');
      sign.update(firmwareBuffer);
      sign.end();
      const signature = sign.sign(keyPair.privateKey, 'base64');

      const firmwareData = {
        buffer: firmwareBuffer,
        checksum,
        checksumAlgorithm: 'sha256',
      };

      const signatureData = {
        algorithm: 'RSA-SHA256',
        signature,
        publicKey: keyPair.publicKey,
        timestamp: new Date(),
      };

      const result = await service.validateFirmwareSignature(firmwareData, signatureData);

      expect(result.isValid).toBe(true);
      expect(result.errors).toBeUndefined();
    });

    it('should reject unsupported algorithm', async () => {
      const firmwareBuffer = Buffer.from('firmware data');
      const checksum = await service.generateChecksum(firmwareBuffer);

      const firmwareData = {
        buffer: firmwareBuffer,
        checksum,
        checksumAlgorithm: 'sha256',
      };

      const signatureData = {
        algorithm: 'UNSUPPORTED-ALGO',
        signature: 'signature',
        publicKey: keyPair.publicKey,
        timestamp: new Date(),
      };

      const result = await service.validateFirmwareSignature(firmwareData, signatureData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors?.[0]).toContain('Unsupported algorithm');
    });

    it('should reject expired signature', async () => {
      const firmwareBuffer = Buffer.from('firmware data');
      const checksum = await service.generateChecksum(firmwareBuffer);

      // Create signature
      const sign = createSign('RSA-SHA256');
      sign.update(firmwareBuffer);
      sign.end();
      const signature = sign.sign(keyPair.privateKey, 'base64');

      const firmwareData = {
        buffer: firmwareBuffer,
        checksum,
        checksumAlgorithm: 'sha256',
      };

      // Signature from 31 days ago
      const oldTimestamp = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000);

      const signatureData = {
        algorithm: 'RSA-SHA256',
        signature,
        publicKey: keyPair.publicKey,
        timestamp: oldTimestamp,
      };

      const result = await service.validateFirmwareSignature(firmwareData, signatureData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors).toContain('Signature has expired (older than 30 days)');
    });

    it('should reject invalid checksum', async () => {
      const firmwareBuffer = Buffer.from('firmware data');
      const wrongChecksum = 'wrong-checksum';

      const firmwareData = {
        buffer: firmwareBuffer,
        checksum: wrongChecksum,
        checksumAlgorithm: 'sha256',
      };

      const signatureData = {
        algorithm: 'RSA-SHA256',
        signature: 'signature',
        publicKey: keyPair.publicKey,
        timestamp: new Date(),
      };

      const result = await service.validateFirmwareSignature(firmwareData, signatureData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Firmware checksum validation failed');
    });
  });
});

