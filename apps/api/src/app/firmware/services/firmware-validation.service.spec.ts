/**
 * FirmwareValidationService Unit Tests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { FirmwareValidationService } from './firmware-validation.service';

describe('FirmwareValidationService', () => {
  let service: FirmwareValidationService;

  beforeEach(async () => {
    const mockConfigService = {
      get: jest.fn().mockImplementation((_key: string, defaultValue: unknown) => defaultValue),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FirmwareValidationService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<FirmwareValidationService>(FirmwareValidationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('calculateChecksum', () => {
    it('should calculate sha256 checksum', () => {
      const buffer = Buffer.from('test firmware content');
      const checksum = service.calculateChecksum(buffer);

      expect(checksum).toHaveLength(64);
      expect(typeof checksum).toBe('string');
    });

    it('should calculate md5 checksum', () => {
      const buffer = Buffer.from('test firmware content');
      const checksum = service.calculateChecksum(buffer, 'md5');

      expect(checksum).toHaveLength(32);
    });

    it('should return consistent checksum for same content', () => {
      const buffer = Buffer.from('consistent content');
      const checksum1 = service.calculateChecksum(buffer);
      const checksum2 = service.calculateChecksum(buffer);

      expect(checksum1).toBe(checksum2);
    });
  });

  describe('validateFirmware', () => {
    it('should validate valid firmware file', async () => {
      const buffer = Buffer.alloc(1024, 'x');
      const result = await service.validateFirmware(buffer, 'firmware.bin');

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject file with invalid extension', async () => {
      const buffer = Buffer.alloc(1024, 'x');
      const result = await service.validateFirmware(buffer, 'firmware.exe');

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('extension'))).toBe(true);
    });

    it('should reject file exceeding max size', async () => {
      const buffer = Buffer.alloc(1024, 'x');
      const result = await service.validateFirmware(buffer, 'firmware.bin', {
        maxFileSize: 100,
      });

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('size'))).toBe(true);
    });

    it('should reject file that is too small', async () => {
      const buffer = Buffer.alloc(50, 'x');
      const result = await service.validateFirmware(buffer, 'firmware.bin');

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('small'))).toBe(true);
    });

    it('should warn when no checksum provided', async () => {
      const buffer = Buffer.alloc(1024, 'x');
      const result = await service.validateFirmware(buffer, 'firmware.bin');

      expect(result.warnings.some((w) => w.includes('checksum'))).toBe(true);
    });

    it('should validate checksum correctly', async () => {
      const buffer = Buffer.alloc(1024, 'x');
      const checksum = service.calculateChecksum(buffer);
      const result = await service.validateFirmware(buffer, 'firmware.bin', {
        expectedChecksum: checksum,
      });

      expect(result.checksumValid).toBe(true);
    });

    it('should reject invalid checksum', async () => {
      const buffer = Buffer.alloc(1024, 'x');
      const result = await service.validateFirmware(buffer, 'firmware.bin', {
        expectedChecksum: 'invalid-checksum',
      });

      expect(result.checksumValid).toBe(false);
      expect(result.isValid).toBe(false);
    });

    it('should warn when no signature provided', async () => {
      const buffer = Buffer.alloc(1024, 'x');
      const result = await service.validateFirmware(buffer, 'firmware.bin');

      expect(result.warnings.some((w) => w.includes('signature'))).toBe(true);
    });

    it('should accept .hex extension', async () => {
      const buffer = Buffer.alloc(1024, 'x');
      const result = await service.validateFirmware(buffer, 'firmware.hex');

      expect(result.errors.every((e) => !e.includes('extension'))).toBe(true);
    });

    it('should accept .elf extension', async () => {
      const buffer = Buffer.alloc(1024, 'x');
      const result = await service.validateFirmware(buffer, 'firmware.elf');

      expect(result.errors.every((e) => !e.includes('extension'))).toBe(true);
    });
  });

  describe('verifySignature', () => {
    it('should return false for invalid signature', async () => {
      const buffer = Buffer.from('test data');
      const result = await service.verifySignature(buffer, 'invalid', 'invalid-key', 'RSA-SHA256');

      expect(result).toBe(false);
    });
  });

  describe('validateFirmware - signature branch coverage', () => {
    it('should fail validation when signature is provided but invalid', async () => {
      const buffer = Buffer.alloc(1024, 'x');
      const result = await service.validateFirmware(buffer, 'firmware.bin', {
        signature: 'invalid-signature',
        publicKey: 'invalid-public-key',
        signatureAlgorithm: 'RSA-SHA256',
      });

      // The signature validation will fail (catch block in verifySignature)
      expect(result.signatureValid).toBe(false);
      expect(result.errors.some((e) => e.includes('signature'))).toBe(true);
    });

    it('should use default signature algorithm when not provided', async () => {
      const buffer = Buffer.alloc(1024, 'x');
      const result = await service.validateFirmware(buffer, 'firmware.bin', {
        signature: 'test-signature',
        publicKey: 'test-key',
        // No signatureAlgorithm - should default to RSA-SHA256
      });

      // Will fail but covers the default algorithm branch
      expect(result.signatureValid).toBe(false);
    });
  });

  describe('signFirmware - branch coverage', () => {
    it('should handle signing errors gracefully', async () => {
      const buffer = Buffer.from('test data');

      // This will throw because the private key is invalid
      await expect(
        service.signFirmware(buffer, 'invalid-private-key', 'RSA-SHA256'),
      ).rejects.toThrow();
    });
  });
});
