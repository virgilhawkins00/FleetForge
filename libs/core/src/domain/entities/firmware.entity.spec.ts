import { Firmware } from './firmware.entity';
import { FirmwareStatus, FirmwareType } from '../enums';
import { FirmwareSignature } from '../value-objects';

describe('Firmware Entity', () => {
  let firmware: Firmware;
  let signature: FirmwareSignature;

  beforeEach(() => {
    signature = new FirmwareSignature('RSA-SHA256', 'signature-data', 'public-key');

    firmware = new Firmware(
      'fw-123',
      '1.0.0',
      'Test Firmware',
      FirmwareType.FULL,
      FirmwareStatus.READY,
      {
        url: 'https://cdn.example.com/firmware.bin',
        size: 1024000,
        checksum: 'abc123',
        checksumAlgorithm: 'SHA256',
      },
      signature,
      {
        deviceTypes: ['TRACKER', 'TELEMATICS'],
        minHardwareVersion: '1.0',
        maxHardwareVersion: '3.0',
      },
      'user-123',
    );
  });

  describe('updateStatus', () => {
    it('should update status with valid transition', () => {
      firmware.status = FirmwareStatus.READY;
      firmware.updateStatus(FirmwareStatus.DEPLOYING);
      expect(firmware.status).toBe(FirmwareStatus.DEPLOYING);
    });

    it('should throw error for invalid transition', () => {
      firmware.status = FirmwareStatus.DEPRECATED;
      expect(() => firmware.updateStatus(FirmwareStatus.READY)).toThrow(
        'Invalid status transition',
      );
    });

    it('should set publishedAt when deployed', () => {
      firmware.status = FirmwareStatus.DEPLOYING;
      firmware.updateStatus(FirmwareStatus.DEPLOYED);
      expect(firmware.publishedAt).toBeDefined();
    });
  });

  describe('isCompatibleWith', () => {
    it('should return true for compatible device type', () => {
      expect(firmware.isCompatibleWith('TRACKER')).toBe(true);
    });

    it('should return false for incompatible device type', () => {
      expect(firmware.isCompatibleWith('CAMERA')).toBe(false);
    });

    it('should check hardware version compatibility', () => {
      expect(firmware.isCompatibleWith('TRACKER', '2.0')).toBe(true);
      expect(firmware.isCompatibleWith('TRACKER', '0.5')).toBe(false);
      expect(firmware.isCompatibleWith('TRACKER', '4.0')).toBe(false);
    });
  });

  describe('isReadyForDeployment', () => {
    it('should return true when ready and signature valid', () => {
      firmware.status = FirmwareStatus.READY;
      expect(firmware.isReadyForDeployment()).toBe(true);
    });

    it('should return false when not ready', () => {
      firmware.status = FirmwareStatus.VALIDATING;
      expect(firmware.isReadyForDeployment()).toBe(false);
    });
  });

  describe('validateChecksum', () => {
    it('should return true for matching checksum', () => {
      expect(firmware.validateChecksum('abc123')).toBe(true);
    });

    it('should return false for non-matching checksum', () => {
      expect(firmware.validateChecksum('wrong')).toBe(false);
    });
  });

  describe('getAgeInDays', () => {
    it('should calculate firmware age', () => {
      const age = firmware.getAgeInDays();
      expect(age).toBeGreaterThanOrEqual(0);
    });
  });

  describe('toJSON', () => {
    it('should serialize to JSON', () => {
      const json = firmware.toJSON();
      expect(json['id']).toBe('fw-123');
      expect(json['version']).toBe('1.0.0');
      expect(json['status']).toBe(FirmwareStatus.READY);
    });
  });
});

