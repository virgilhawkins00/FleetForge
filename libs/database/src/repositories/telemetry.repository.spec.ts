/**
 * Telemetry Repository Tests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { TelemetryRepository } from './telemetry.repository';
import { TelemetryModel, TelemetryDocument } from '../schemas';

describe('TelemetryRepository', () => {
  let repository: TelemetryRepository;
  let mockModel: Partial<Model<TelemetryDocument>>;

  const mockTelemetryDoc = {
    _id: 'telemetry-123',
    deviceId: 'device-456',
    timestamp: new Date(),
    location: { latitude: -23.55, longitude: -46.63, timestamp: new Date() },
    data: { temperature: 25 },
    sensors: [{ name: 'temp', value: 25, unit: 'C', timestamp: new Date() }],
    batteryLevel: 85,
    signalStrength: -65,
    receivedAt: new Date(),
  };

  beforeEach(async () => {
    mockModel = {
      findById: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(mockTelemetryDoc) }),
      findOne: jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockTelemetryDoc),
      }),
      find: jest.fn().mockReturnValue({
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([mockTelemetryDoc]),
      }),
      insertMany: jest.fn().mockResolvedValue([mockTelemetryDoc]),
      deleteMany: jest
        .fn()
        .mockReturnValue({ exec: jest.fn().mockResolvedValue({ deletedCount: 10 }) }),
      countDocuments: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(1) }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TelemetryRepository,
        { provide: getModelToken(TelemetryModel.name), useValue: mockModel },
      ],
    }).compile();

    repository = module.get<TelemetryRepository>(TelemetryRepository);
  });

  describe('findById', () => {
    it('should return telemetry by id', async () => {
      const result = await repository.findById('telemetry-123');

      expect(result?.id).toBe('telemetry-123');
    });

    it('should return null if not found', async () => {
      (mockModel.findById as jest.Mock).mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      const result = await repository.findById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('findMany', () => {
    it('should return telemetry with filter', async () => {
      const result = await repository.findMany({ deviceId: 'device-456' });

      expect(result).toHaveLength(1);
    });

    it('should apply date range filter', async () => {
      await repository.findMany({
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
      });

      expect(mockModel.find).toHaveBeenCalled();
    });

    it('should apply startDate only filter', async () => {
      await repository.findMany({ startDate: new Date('2024-01-01') });

      expect(mockModel.find).toHaveBeenCalled();
    });

    it('should apply endDate only filter', async () => {
      await repository.findMany({ endDate: new Date('2024-12-31') });

      expect(mockModel.find).toHaveBeenCalled();
    });
  });

  describe('findLatestByDevice', () => {
    it('should return latest telemetry for device', async () => {
      const result = await repository.findLatestByDevice('device-456');

      expect(result?.deviceId).toBe('device-456');
    });

    it('should return null if no telemetry found', async () => {
      (mockModel.findOne as jest.Mock).mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(null),
      });

      const result = await repository.findLatestByDevice('unknown');

      expect(result).toBeNull();
    });
  });

  describe('deleteOlderThan', () => {
    it('should delete old telemetry', async () => {
      const result = await repository.deleteOlderThan(new Date('2024-01-01'));

      expect(result).toBe(10);
    });
  });

  describe('count', () => {
    it('should return count', async () => {
      const result = await repository.count({});

      expect(result).toBe(1);
    });
  });

  describe('create', () => {
    it('should create a new telemetry', async () => {
      const mockSave = jest.fn().mockResolvedValue(mockTelemetryDoc);
      const MockTelemetryModel = jest.fn().mockImplementation(() => ({ save: mockSave }));

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          TelemetryRepository,
          { provide: getModelToken(TelemetryModel.name), useValue: MockTelemetryModel },
        ],
      }).compile();

      const repo = module.get<TelemetryRepository>(TelemetryRepository);
      const mockTelemetry = {
        id: 'telemetry-123',
        deviceId: 'device-456',
        timestamp: new Date(),
        data: { temperature: 25 },
        sensors: [{ name: 'temp', value: 25, unit: 'C', timestamp: new Date() }],
      } as any;

      const result = await repo.create(mockTelemetry);

      expect(result).toBeDefined();
      expect(mockSave).toHaveBeenCalled();
    });
  });

  describe('bulkCreate', () => {
    it('should create multiple telemetry entries', async () => {
      const telemetryList = [
        { id: 'tel-1', deviceId: 'device-1', timestamp: new Date(), data: {}, sensors: [] },
        { id: 'tel-2', deviceId: 'device-2', timestamp: new Date(), data: {}, sensors: [] },
      ] as any[];

      const result = await repository.bulkCreate(telemetryList);

      expect(mockModel.insertMany).toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });
});
