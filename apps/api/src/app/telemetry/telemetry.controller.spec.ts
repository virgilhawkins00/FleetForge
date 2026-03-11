/**
 * TelemetryController Unit Tests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { TelemetryController } from './telemetry.controller';
import { TelemetryService } from './telemetry.service';

describe('TelemetryController', () => {
  let controller: TelemetryController;
  let service: jest.Mocked<TelemetryService>;

  const mockTelemetry = {
    id: 'telemetry-1',
    deviceId: 'device-1',
    timestamp: new Date(),
    metrics: { temperature: 25, battery: 80 },
    location: { latitude: 40.7128, longitude: -74.006, accuracy: 10 },
    createdAt: new Date(),
  };

  beforeEach(async () => {
    const mockService = {
      create: jest.fn(),
      bulkCreate: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      findLatestByDevice: jest.fn(),
      count: jest.fn(),
      deleteOlderThan: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TelemetryController],
      providers: [{ provide: TelemetryService, useValue: mockService }],
    }).compile();

    controller = module.get<TelemetryController>(TelemetryController);
    service = module.get(TelemetryService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create telemetry data', async () => {
      service.create.mockResolvedValue(mockTelemetry as any);

      const result = await controller.create({
        deviceId: 'device-1',
        timestamp: new Date().toISOString(),
        data: { temperature: 25 },
      });

      expect(result.deviceId).toBe('device-1');
      expect(service.create).toHaveBeenCalled();
    });
  });

  describe('bulkCreate', () => {
    it('should bulk create telemetry data', async () => {
      service.bulkCreate.mockResolvedValue([mockTelemetry as any]);

      const result = await controller.bulkCreate([
        { deviceId: 'device-1', timestamp: new Date().toISOString(), data: { temperature: 25 } },
      ]);

      expect(result).toHaveLength(1);
      expect(service.bulkCreate).toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return telemetry list', async () => {
      service.findAll.mockResolvedValue([mockTelemetry as any]);

      const result = await controller.findAll('device-1', undefined, undefined, 10, 0);

      expect(result).toHaveLength(1);
      expect(service.findAll).toHaveBeenCalledWith(
        { deviceId: 'device-1', startDate: undefined, endDate: undefined },
        10,
        0,
      );
    });

    it('should handle date filters', async () => {
      service.findAll.mockResolvedValue([mockTelemetry as any]);

      await controller.findAll('device-1', '2024-01-01', '2024-12-31', 100, 0);

      expect(service.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ deviceId: 'device-1' }),
        100,
        0,
      );
    });
  });

  describe('findOne', () => {
    it('should return telemetry by id', async () => {
      service.findOne.mockResolvedValue(mockTelemetry as any);

      const result = await controller.findOne('telemetry-1');

      expect(result.id).toBe('telemetry-1');
    });
  });

  describe('findLatestByDevice', () => {
    it('should return latest telemetry for device', async () => {
      service.findLatestByDevice.mockResolvedValue(mockTelemetry as any);

      const result = await controller.findLatestByDevice('device-1');

      expect(result.deviceId).toBe('device-1');
    });
  });

  describe('count', () => {
    it('should return telemetry count', async () => {
      service.count.mockResolvedValue(100);

      const result = await controller.count('device-1');

      expect(result).toBe(100);
    });
  });

  describe('cleanup', () => {
    it('should delete old telemetry data', async () => {
      service.deleteOlderThan.mockResolvedValue(50);

      const result = await controller.cleanup(30);

      expect(result.deleted).toBe(50);
      expect(service.deleteOlderThan).toHaveBeenCalledWith(30);
    });
  });
});
