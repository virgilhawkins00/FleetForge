/**
 * Firmware Mapper Tests
 */

import { Firmware, FirmwareStatus, FirmwareType } from '@fleetforge/core';
import { FirmwareMapper } from './firmware.mapper';

describe('FirmwareMapper', () => {
  const mockFirmwareDoc = {
    _id: 'firmware-123',
    version: '2.5.0',
    name: 'Fleet Tracker Firmware',
    type: FirmwareType.FULL,
    status: FirmwareStatus.DEPLOYED,
    file: {
      url: 'https://storage.example.com/firmware/2.5.0.bin',
      size: 1048576,
      checksum: 'abc123def456',
      checksumAlgorithm: 'SHA-256',
    },
    signature: {
      algorithm: 'RSA-SHA256',
      signature: 'base64-encoded-signature',
      publicKey: 'base64-encoded-public-key',
      timestamp: new Date('2024-06-01T10:00:00Z'),
    },
    metadata: {
      deviceTypes: ['TRACKER', 'TELEMATICS'],
      minHardwareVersion: '1.0.0',
      maxHardwareVersion: '2.0.0',
      requiredCapabilities: ['hasGPS'],
      releaseNotes: 'Bug fixes and improvements',
      changelog: '- Fixed GPS drift\n- Improved battery life',
    },
    createdBy: 'user-456',
    publishedAt: new Date('2024-06-01T12:00:00Z'),
    createdAt: new Date('2024-06-01T10:00:00Z'),
    updatedAt: new Date('2024-06-01T12:00:00Z'),
  } as any;

  describe('toDomain', () => {
    it('should convert document to domain entity', () => {
      const firmware = FirmwareMapper.toDomain(mockFirmwareDoc);

      expect(firmware).toBeInstanceOf(Firmware);
      expect(firmware.id).toBe('firmware-123');
      expect(firmware.version).toBe('2.5.0');
      expect(firmware.name).toBe('Fleet Tracker Firmware');
    });

    it('should map file correctly', () => {
      const firmware = FirmwareMapper.toDomain(mockFirmwareDoc);

      expect(firmware.file.url).toBe('https://storage.example.com/firmware/2.5.0.bin');
      expect(firmware.file.size).toBe(1048576);
      expect(firmware.file.checksum).toBe('abc123def456');
    });

    it('should map signature correctly', () => {
      const firmware = FirmwareMapper.toDomain(mockFirmwareDoc);

      expect(firmware.signature.algorithm).toBe('RSA-SHA256');
      expect(firmware.signature.signature).toBe('base64-encoded-signature');
      expect(firmware.signature.publicKey).toBe('base64-encoded-public-key');
    });

    it('should map metadata correctly', () => {
      const firmware = FirmwareMapper.toDomain(mockFirmwareDoc);

      expect(firmware.metadata.deviceTypes).toEqual(['TRACKER', 'TELEMATICS']);
      expect(firmware.metadata.minHardwareVersion).toBe('1.0.0');
      expect(firmware.metadata.releaseNotes).toBe('Bug fixes and improvements');
    });
  });

  describe('toPersistence', () => {
    it('should convert domain entity to persistence format', () => {
      const firmware = FirmwareMapper.toDomain(mockFirmwareDoc);
      const persistence = FirmwareMapper.toPersistence(firmware);

      expect(persistence._id).toBe('firmware-123');
      expect(persistence.version).toBe('2.5.0');
      expect(persistence.type).toBe(FirmwareType.FULL);
    });

    it('should map file to persistence', () => {
      const firmware = FirmwareMapper.toDomain(mockFirmwareDoc);
      const persistence = FirmwareMapper.toPersistence(firmware);

      expect(persistence.file?.url).toBe('https://storage.example.com/firmware/2.5.0.bin');
      expect(persistence.file?.size).toBe(1048576);
    });

    it('should map signature to persistence', () => {
      const firmware = FirmwareMapper.toDomain(mockFirmwareDoc);
      const persistence = FirmwareMapper.toPersistence(firmware);

      expect(persistence.signature?.algorithm).toBe('RSA-SHA256');
      expect(persistence.signature?.publicKey).toBe('base64-encoded-public-key');
    });

    it('should map metadata to persistence', () => {
      const firmware = FirmwareMapper.toDomain(mockFirmwareDoc);
      const persistence = FirmwareMapper.toPersistence(firmware);

      expect(persistence.metadata?.deviceTypes).toEqual(['TRACKER', 'TELEMATICS']);
    });
  });
});

