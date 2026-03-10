/**
 * Deployment Repository Tests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { DeploymentRepository } from './deployment.repository';
import { DeploymentModel, DeploymentDocument } from '../schemas';
import { DeploymentStatus, DeploymentStrategy } from '@fleetforge/core';

describe('DeploymentRepository', () => {
  let repository: DeploymentRepository;
  let mockModel: Partial<Model<DeploymentDocument>>;

  const mockDeploymentDoc = {
    _id: 'deployment-123',
    firmwareId: 'firmware-456',
    firmwareVersion: '2.5.0',
    name: 'Test Deployment',
    status: DeploymentStatus.IN_PROGRESS,
    config: {
      strategy: DeploymentStrategy.CANARY,
      target: { deviceIds: ['device-1'], fleetIds: [], tags: [] },
      autoRollback: true,
      rollbackThreshold: 5,
    },
    progress: { total: 10, pending: 5, inProgress: 3, succeeded: 2, failed: 0, rolledBack: 0 },
    createdBy: 'user-123',
    errors: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    mockModel = {
      findById: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(mockDeploymentDoc) }),
      find: jest.fn().mockReturnValue({
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([mockDeploymentDoc]),
      }),
      findByIdAndUpdate: jest
        .fn()
        .mockReturnValue({ exec: jest.fn().mockResolvedValue(mockDeploymentDoc) }),
      findByIdAndDelete: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(null) }),
      countDocuments: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(1) }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeploymentRepository,
        { provide: getModelToken(DeploymentModel.name), useValue: mockModel },
      ],
    }).compile();

    repository = module.get<DeploymentRepository>(DeploymentRepository);
  });

  describe('findById', () => {
    it('should return deployment by id', async () => {
      const result = await repository.findById('deployment-123');

      expect(result?.id).toBe('deployment-123');
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
    it('should return deployments with filter', async () => {
      const result = await repository.findMany({ firmwareId: 'firmware-456' });

      expect(result).toHaveLength(1);
    });

    it('should apply status filter', async () => {
      await repository.findMany({ status: DeploymentStatus.IN_PROGRESS });

      expect(mockModel.find).toHaveBeenCalled();
    });

    it('should apply createdBy filter', async () => {
      await repository.findMany({ createdBy: 'user-123' });

      expect(mockModel.find).toHaveBeenCalled();
    });
  });

  describe('findActive', () => {
    it('should return active deployments', async () => {
      const result = await repository.findActive();

      expect(result).toBeDefined();
    });
  });

  describe('count', () => {
    it('should return count', async () => {
      const result = await repository.count({});

      expect(result).toBe(1);
    });
  });

  describe('delete', () => {
    it('should delete deployment', async () => {
      await repository.delete('deployment-123');

      expect(mockModel.findByIdAndDelete).toHaveBeenCalledWith('deployment-123');
    });
  });

  describe('update', () => {
    it('should throw error if deployment not found', async () => {
      (mockModel.findByIdAndUpdate as jest.Mock).mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(repository.update('nonexistent', { name: 'New' })).rejects.toThrow(
        'Deployment not found',
      );
    });

    it('should update deployment with all fields', async () => {
      const result = await repository.update('deployment-123', {
        name: 'Updated Deployment',
        status: DeploymentStatus.COMPLETED,
      });

      expect(result).toBeDefined();
      expect(mockModel.findByIdAndUpdate).toHaveBeenCalled();
    });
  });

  describe('create', () => {
    it('should create a new deployment', async () => {
      const mockSave = jest.fn().mockResolvedValue(mockDeploymentDoc);
      const MockDeploymentModel = jest.fn().mockImplementation(() => ({ save: mockSave }));

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          DeploymentRepository,
          { provide: getModelToken(DeploymentModel.name), useValue: MockDeploymentModel },
        ],
      }).compile();

      const repo = module.get<DeploymentRepository>(DeploymentRepository);
      const mockDeployment = {
        id: 'deployment-123',
        firmwareId: 'firmware-456',
        firmwareVersion: '2.5.0',
        name: 'Test Deployment',
        status: DeploymentStatus.PENDING,
        config: {
          strategy: DeploymentStrategy.CANARY,
          target: { deviceIds: ['device-1'], fleetIds: [], tags: [] },
          autoRollback: true,
          rollbackThreshold: 5,
        },
        progress: { total: 10, pending: 10, inProgress: 0, succeeded: 0, failed: 0, rolledBack: 0 },
        createdBy: 'user-123',
        errors: [],
      } as any;

      const result = await repo.create(mockDeployment);

      expect(result).toBeDefined();
      expect(mockSave).toHaveBeenCalled();
    });
  });
});
