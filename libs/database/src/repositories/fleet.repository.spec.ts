/**
 * Fleet Repository Tests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { FleetRepository } from './fleet.repository';
import { FleetModel, FleetDocument } from '../schemas';

describe('FleetRepository', () => {
  let repository: FleetRepository;
  let mockModel: Partial<Model<FleetDocument>>;

  const mockFleetDoc = {
    _id: 'fleet-123',
    name: 'Test Fleet',
    organizationId: 'org-456',
    metadata: { description: 'Test fleet' },
    deviceIds: ['device-1', 'device-2'],
    tags: ['production'],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    mockModel = {
      findById: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(mockFleetDoc) }),
      find: jest.fn().mockReturnValue({
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([mockFleetDoc]),
      }),
      findByIdAndUpdate: jest
        .fn()
        .mockReturnValue({ exec: jest.fn().mockResolvedValue(mockFleetDoc) }),
      findByIdAndDelete: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(null) }),
      countDocuments: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(1) }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FleetRepository,
        { provide: getModelToken(FleetModel.name), useValue: mockModel },
      ],
    }).compile();

    repository = module.get<FleetRepository>(FleetRepository);
  });

  describe('findById', () => {
    it('should return a fleet by id', async () => {
      const result = await repository.findById('fleet-123');

      expect(mockModel.findById).toHaveBeenCalledWith('fleet-123');
      expect(result).toBeDefined();
      expect(result?.id).toBe('fleet-123');
    });

    it('should return null if fleet not found', async () => {
      (mockModel.findById as jest.Mock).mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      const result = await repository.findById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('findMany', () => {
    it('should return fleets with filter', async () => {
      const result = await repository.findMany({ organizationId: 'org-456' });

      expect(mockModel.find).toHaveBeenCalled();
      expect(result).toHaveLength(1);
    });

    it('should apply tags filter', async () => {
      await repository.findMany({ tags: ['production'] });

      expect(mockModel.find).toHaveBeenCalled();
    });
  });

  describe('findByOrganization', () => {
    it('should return fleets by organization', async () => {
      const result = await repository.findByOrganization('org-456');

      expect(result).toHaveLength(1);
    });
  });

  describe('count', () => {
    it('should return count of fleets', async () => {
      const result = await repository.count({});

      expect(result).toBe(1);
    });
  });

  describe('delete', () => {
    it('should delete fleet by id', async () => {
      await repository.delete('fleet-123');

      expect(mockModel.findByIdAndDelete).toHaveBeenCalledWith('fleet-123');
    });
  });

  describe('update', () => {
    it('should throw error if fleet not found', async () => {
      (mockModel.findByIdAndUpdate as jest.Mock).mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(repository.update('nonexistent', { name: 'New Name' })).rejects.toThrow(
        'Fleet not found',
      );
    });

    it('should update fleet with all fields', async () => {
      const result = await repository.update('fleet-123', {
        name: 'Updated Fleet',
        metadata: { description: 'Updated description' } as any,
        tags: ['updated'],
      });

      expect(result).toBeDefined();
      expect(mockModel.findByIdAndUpdate).toHaveBeenCalled();
    });
  });

  describe('create', () => {
    it('should create a new fleet', async () => {
      const mockSave = jest.fn().mockResolvedValue(mockFleetDoc);
      const MockFleetModel = jest.fn().mockImplementation(() => ({ save: mockSave }));

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          FleetRepository,
          { provide: getModelToken(FleetModel.name), useValue: MockFleetModel },
        ],
      }).compile();

      const repo = module.get<FleetRepository>(FleetRepository);
      const mockFleet = {
        id: 'fleet-123',
        name: 'Test Fleet',
        organizationId: 'org-456',
        metadata: { description: 'Test' },
        deviceIds: [],
        tags: [],
      } as any;

      const result = await repo.create(mockFleet);

      expect(result).toBeDefined();
      expect(mockSave).toHaveBeenCalled();
    });
  });

  describe('findByOrganization', () => {
    it('should return fleets with sorting', async () => {
      const result = await repository.findByOrganization('org-456');

      expect(mockModel.find).toHaveBeenCalledWith({ organizationId: 'org-456' });
      expect(result).toBeDefined();
    });
  });

  describe('update with deviceIds', () => {
    it('should update fleet with deviceIds', async () => {
      const result = await repository.update('fleet-123', {
        deviceIds: ['device-1', 'device-2', 'device-3'],
      });

      expect(result).toBeDefined();
      expect(mockModel.findByIdAndUpdate).toHaveBeenCalled();
    });

    it('should update fleet with statistics', async () => {
      const result = await repository.update('fleet-123', {
        statistics: {
          totalDevices: 5,
          activeDevices: 4,
          offlineDevices: 1,
          errorDevices: 0,
          averageBatteryLevel: 80,
          lastUpdated: new Date(),
        } as any,
      });

      expect(result).toBeDefined();
      expect(mockModel.findByIdAndUpdate).toHaveBeenCalled();
    });
  });
});
