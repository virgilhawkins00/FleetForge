/**
 * TelemetryService Unit Tests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { TelemetryService } from './telemetry.service';
import { TelemetryRepository } from '@fleetforge/database';

describe('TelemetryService', () => {
  let service: TelemetryService;
  let telemetryRepo: jest.Mocked<TelemetryRepository>;

  const mockTelemetry = {
    id: 'telemetry-123',
    deviceId: 'device-1',
    timestamp: new Date(),
    location: { latitude: 10, longitude: 20, timestamp: new Date() },
    data: { temperature: 25 },
    sensors: [],
    batteryLevel: 80,
    signalStrength: -60,
    receivedAt: new Date(),
    getLatency: jest.fn().mockReturnValue(100),
    isStale: jest.fn().mockReturnValue(false),
    isBatteryLow: jest.fn().mockReturnValue(false),
    isSignalWeak: jest.fn().mockReturnValue(false),
  };

  beforeEach(async () => {
    const mockTelemetryRepo = {
      create: jest.fn(),
      bulkCreate: jest.fn(),
      findById: jest.fn(),
      findMany: jest.fn(),
      findLatestByDevice: jest.fn(),
      count: jest.fn(),
      deleteOlderThan: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [TelemetryService, { provide: TelemetryRepository, useValue: mockTelemetryRepo }],
    }).compile();

    service = module.get<TelemetryService>(TelemetryService);
    telemetryRepo = module.get(TelemetryRepository);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create telemetry', async () => {
      telemetryRepo.create.mockResolvedValue(mockTelemetry as any);

      const result = await service.create({
        deviceId: 'device-1',
        timestamp: new Date().toISOString(),
        batteryLevel: 80,
        signalStrength: -60,
      });

      expect(result.deviceId).toBe('device-1');
      expect(telemetryRepo.create).toHaveBeenCalled();
    });

    it('should create telemetry with location', async () => {
      telemetryRepo.create.mockResolvedValue(mockTelemetry as any);

      await service.create({
        deviceId: 'device-1',
        timestamp: new Date().toISOString(),
        location: {
          latitude: 10,
          longitude: 20,
          timestamp: new Date().toISOString(),
        },
      });

      expect(telemetryRepo.create).toHaveBeenCalled();
    });
  });

  describe('bulkCreate', () => {
    it('should create multiple telemetry records', async () => {
      telemetryRepo.bulkCreate.mockResolvedValue([mockTelemetry as any]);

      const result = await service.bulkCreate([
        { deviceId: 'device-1', timestamp: new Date().toISOString() },
      ]);

      expect(result).toHaveLength(1);
    });
  });

  describe('findAll', () => {
    it('should return array of telemetry', async () => {
      telemetryRepo.findMany.mockResolvedValue([mockTelemetry as any]);

      const result = await service.findAll({}, 100, 0);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('telemetry-123');
    });

    it('should filter by deviceId', async () => {
      telemetryRepo.findMany.mockResolvedValue([mockTelemetry as any]);

      await service.findAll({ deviceId: 'device-1' }, 100, 0);

      expect(telemetryRepo.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ deviceId: 'device-1' }),
        100,
        0,
      );
    });
  });

  describe('findOne', () => {
    it('should return telemetry by id', async () => {
      telemetryRepo.findById.mockResolvedValue(mockTelemetry as any);

      const result = await service.findOne('telemetry-123');

      expect(result.id).toBe('telemetry-123');
    });

    it('should throw NotFoundException when not found', async () => {
      telemetryRepo.findById.mockResolvedValue(null);

      await expect(service.findOne('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findLatestByDevice', () => {
    it('should return latest telemetry for device', async () => {
      telemetryRepo.findLatestByDevice.mockResolvedValue(mockTelemetry as any);

      const result = await service.findLatestByDevice('device-1');

      expect(result.deviceId).toBe('device-1');
    });

    it('should throw NotFoundException when no telemetry found', async () => {
      telemetryRepo.findLatestByDevice.mockResolvedValue(null);

      await expect(service.findLatestByDevice('device-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('count', () => {
    it('should return count', async () => {
      telemetryRepo.count.mockResolvedValue(10);

      const result = await service.count({});

      expect(result).toBe(10);
    });
  });

  describe('deleteOlderThan', () => {
    it('should delete old telemetry', async () => {
      telemetryRepo.deleteOlderThan.mockResolvedValue(5);

      const result = await service.deleteOlderThan(30);

      expect(result).toBe(5);
      expect(telemetryRepo.deleteOlderThan).toHaveBeenCalled();
    });
  });
});
