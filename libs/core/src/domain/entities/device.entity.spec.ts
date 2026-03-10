import { Device } from './device.entity';
import { DeviceStatus, DeviceType } from '../enums';
import { Location } from '../value-objects';

describe('Device Entity', () => {
  let device: Device;

  beforeEach(() => {
    device = new Device(
      'device-123',
      'fleet-456',
      'Test Device',
      DeviceType.TRACKER,
      DeviceStatus.ACTIVE,
      {
        manufacturer: 'Acme',
        model: 'T-1000',
        hardwareVersion: '2.0',
        serialNumber: 'SN123',
      },
      {
        hasGPS: true,
        hasCamera: false,
        hasCellular: true,
        hasWiFi: false,
        hasBluetooth: true,
        sensors: ['accelerometer'],
      },
      '1.0.0',
      new Date(),
    );
  });

  describe('updateStatus', () => {
    it('should update device status', () => {
      device.updateStatus(DeviceStatus.OFFLINE);
      expect(device.status).toBe(DeviceStatus.OFFLINE);
    });

    it('should throw error when updating decommissioned device', () => {
      device.status = DeviceStatus.DECOMMISSIONED;
      expect(() => device.updateStatus(DeviceStatus.ACTIVE)).toThrow(
        'Cannot update status of decommissioned device',
      );
    });

    it('should update updatedAt timestamp', () => {
      const before = device.updatedAt;
      setTimeout(() => {
        device.updateStatus(DeviceStatus.MAINTENANCE);
        expect(device.updatedAt.getTime()).toBeGreaterThan(before.getTime());
      }, 10);
    });
  });

  describe('updateFirmware', () => {
    it('should update firmware version', () => {
      device.updateFirmware('2.0.0');
      expect(device.firmwareVersion).toBe('2.0.0');
    });

    it('should throw error when device is updating', () => {
      device.status = DeviceStatus.UPDATING;
      expect(() => device.updateFirmware('2.0.0')).toThrow('Device is already updating');
    });
  });

  describe('updateLocation', () => {
    it('should update device location', () => {
      const location = new Location(-23.5505, -46.6333, new Date());
      device.updateLocation(location);
      expect(device.location).toBe(location);
    });

    it('should update lastSeen timestamp', () => {
      const before = device.lastSeen;
      setTimeout(() => {
        const location = new Location(-23.5505, -46.6333, new Date());
        device.updateLocation(location);
        expect(device.lastSeen.getTime()).toBeGreaterThan(before.getTime());
      }, 10);
    });
  });

  describe('updateHealth', () => {
    it('should update device health metrics', () => {
      device.updateHealth({
        batteryLevel: 85,
        signalStrength: -70,
        temperature: 25,
      });

      expect(device.health?.batteryLevel).toBe(85);
      expect(device.health?.signalStrength).toBe(-70);
      expect(device.health?.temperature).toBe(25);
    });

    it('should merge with existing health data', () => {
      device.updateHealth({ batteryLevel: 90 });
      device.updateHealth({ temperature: 30 });

      expect(device.health?.batteryLevel).toBe(90);
      expect(device.health?.temperature).toBe(30);
    });
  });

  describe('isOnline', () => {
    it('should return true for recently seen active device', () => {
      device.lastSeen = new Date();
      device.status = DeviceStatus.ACTIVE;
      expect(device.isOnline()).toBe(true);
    });

    it('should return false for old lastSeen', () => {
      device.lastSeen = new Date(Date.now() - 10 * 60 * 1000); // 10 minutes ago
      expect(device.isOnline()).toBe(false);
    });

    it('should return false for non-active device', () => {
      device.lastSeen = new Date();
      device.status = DeviceStatus.OFFLINE;
      expect(device.isOnline()).toBe(false);
    });
  });

  describe('needsUpdate', () => {
    it('should return true when firmware version differs', () => {
      expect(device.needsUpdate('2.0.0')).toBe(true);
    });

    it('should return false when firmware version matches', () => {
      expect(device.needsUpdate('1.0.0')).toBe(false);
    });

    it('should return false when device is not active', () => {
      device.status = DeviceStatus.OFFLINE;
      expect(device.needsUpdate('2.0.0')).toBe(false);
    });
  });

  describe('isHealthy', () => {
    it('should return true when no health data', () => {
      expect(device.isHealthy()).toBe(true);
    });

    it('should return false when battery is low', () => {
      device.updateHealth({ batteryLevel: 5 });
      expect(device.isHealthy()).toBe(false);
    });

    it('should return false when temperature is too high', () => {
      device.updateHealth({ temperature: 85 });
      expect(device.isHealthy()).toBe(false);
    });

    it('should return false when memory usage is high', () => {
      device.updateHealth({ memoryUsage: 95 });
      expect(device.isHealthy()).toBe(false);
    });

    it('should return true when all metrics are normal', () => {
      device.updateHealth({
        batteryLevel: 80,
        temperature: 25,
        memoryUsage: 50,
        cpuUsage: 30,
      });
      expect(device.isHealthy()).toBe(true);
    });
  });

  describe('tags', () => {
    it('should add tag', () => {
      device.addTag('production');
      expect(device.tags).toContain('production');
    });

    it('should not add duplicate tag', () => {
      device.addTag('production');
      device.addTag('production');
      expect(device.tags.filter((t) => t === 'production')).toHaveLength(1);
    });

    it('should remove tag', () => {
      device.addTag('production');
      device.removeTag('production');
      expect(device.tags).not.toContain('production');
    });
  });

  describe('toJSON', () => {
    it('should serialize to JSON', () => {
      const json = device.toJSON();
      expect(json['id']).toBe('device-123');
      expect(json['name']).toBe('Test Device');
      expect(json['status']).toBe(DeviceStatus.ACTIVE);
    });
  });
});

