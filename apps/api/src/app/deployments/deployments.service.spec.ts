/**
 * DeploymentsService Unit Tests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { DeploymentsService } from './deployments.service';
import { DeploymentRepository, DeviceDeploymentRepository } from '@fleetforge/database';
import { DeploymentStatus, DeploymentStrategy } from '@fleetforge/core';

describe('DeploymentsService', () => {
  let service: DeploymentsService;
  let deploymentRepo: jest.Mocked<DeploymentRepository>;

  const mockDeployment = {
    id: 'deploy-123',
    firmwareId: 'fw-1',
    firmwareVersion: '2.0.0',
    name: 'Test Deployment',
    status: DeploymentStatus.PENDING,
    config: {
      strategy: DeploymentStrategy.ROLLING,
      target: { fleetIds: ['fleet-1'] },
    },
    progress: { total: 10, pending: 10, inProgress: 0, succeeded: 0, failed: 0, rolledBack: 0 },
    createdBy: 'user-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    startedAt: null,
    completedAt: null,
    errors: [],
    start: jest.fn(),
    cancel: jest.fn(),
    rollback: jest.fn(),
    getSuccessRate: jest.fn().mockReturnValue(0),
    getDurationMinutes: jest.fn().mockReturnValue(null),
    isScheduled: jest.fn().mockReturnValue(false),
  };

  beforeEach(async () => {
    const mockDeploymentRepo = {
      create: jest.fn(),
      findById: jest.fn(),
      findMany: jest.fn(),
      findActive: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    const mockDeviceDeploymentRepo = {
      findByDeployment: jest.fn(),
      getStats: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeploymentsService,
        { provide: DeploymentRepository, useValue: mockDeploymentRepo },
        { provide: DeviceDeploymentRepository, useValue: mockDeviceDeploymentRepo },
      ],
    }).compile();

    service = module.get<DeploymentsService>(DeploymentsService);
    deploymentRepo = module.get(DeploymentRepository);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a deployment', async () => {
      deploymentRepo.create.mockResolvedValue(mockDeployment as any);

      const result = await service.create({
        firmwareId: 'fw-1',
        firmwareVersion: '2.0.0',
        name: 'Test Deployment',
        createdBy: 'user-1',
        config: {
          strategy: DeploymentStrategy.ROLLING,
          target: { fleetIds: ['fleet-1'] },
        },
      });

      expect(result.name).toBe('Test Deployment');
      expect(deploymentRepo.create).toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return array of deployments', async () => {
      deploymentRepo.findMany.mockResolvedValue([mockDeployment as any]);

      const result = await service.findAll({}, 100, 0);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('deploy-123');
    });
  });

  describe('findOne', () => {
    it('should return a deployment by id', async () => {
      deploymentRepo.findById.mockResolvedValue(mockDeployment as any);

      const result = await service.findOne('deploy-123');

      expect(result.id).toBe('deploy-123');
    });

    it('should throw NotFoundException when deployment not found', async () => {
      deploymentRepo.findById.mockResolvedValue(null);

      await expect(service.findOne('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findActive', () => {
    it('should return active deployments', async () => {
      deploymentRepo.findActive.mockResolvedValue([mockDeployment as any]);

      const result = await service.findActive();

      expect(result).toHaveLength(1);
    });
  });

  describe('start', () => {
    it('should start a deployment', async () => {
      const startedDeployment = { ...mockDeployment, status: DeploymentStatus.IN_PROGRESS };
      deploymentRepo.findById.mockResolvedValue(mockDeployment as any);
      deploymentRepo.update.mockResolvedValue(startedDeployment as any);

      await service.start('deploy-123');

      expect(mockDeployment.start).toHaveBeenCalled();
    });

    it('should throw NotFoundException when deployment not found', async () => {
      deploymentRepo.findById.mockResolvedValue(null);

      await expect(service.start('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when start fails', async () => {
      const failingDeployment = {
        ...mockDeployment,
        start: jest.fn().mockImplementation(() => {
          throw new Error('Cannot start');
        }),
      };
      deploymentRepo.findById.mockResolvedValue(failingDeployment as any);

      await expect(service.start('deploy-123')).rejects.toThrow(BadRequestException);
    });
  });

  describe('cancel', () => {
    it('should cancel a deployment', async () => {
      const cancelledDeployment = { ...mockDeployment, status: DeploymentStatus.CANCELLED };
      deploymentRepo.findById.mockResolvedValue(mockDeployment as any);
      deploymentRepo.update.mockResolvedValue(cancelledDeployment as any);

      await service.cancel('deploy-123');

      expect(mockDeployment.cancel).toHaveBeenCalled();
    });

    it('should throw NotFoundException when deployment not found', async () => {
      deploymentRepo.findById.mockResolvedValue(null);

      await expect(service.cancel('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when cancel fails', async () => {
      const failingDeployment = {
        ...mockDeployment,
        cancel: jest.fn().mockImplementation(() => {
          throw new Error('Cannot cancel');
        }),
      };
      deploymentRepo.findById.mockResolvedValue(failingDeployment as any);

      await expect(service.cancel('deploy-123')).rejects.toThrow(BadRequestException);
    });
  });

  describe('rollback', () => {
    it('should rollback a deployment', async () => {
      const rolledBackDeployment = { ...mockDeployment, status: DeploymentStatus.ROLLED_BACK };
      deploymentRepo.findById.mockResolvedValue(mockDeployment as any);
      deploymentRepo.update.mockResolvedValue(rolledBackDeployment as any);

      await service.rollback('deploy-123', 'Issues found');

      expect(mockDeployment.rollback).toHaveBeenCalledWith('Issues found');
    });

    it('should throw NotFoundException when deployment not found', async () => {
      deploymentRepo.findById.mockResolvedValue(null);

      await expect(service.rollback('nonexistent', 'reason')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when rollback fails', async () => {
      const failingDeployment = {
        ...mockDeployment,
        rollback: jest.fn().mockImplementation(() => {
          throw new Error('Cannot rollback');
        }),
      };
      deploymentRepo.findById.mockResolvedValue(failingDeployment as any);

      await expect(service.rollback('deploy-123', 'reason')).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateProgress', () => {
    it('should update deployment progress', async () => {
      const newProgress = {
        total: 10,
        pending: 5,
        inProgress: 2,
        succeeded: 3,
        failed: 0,
        rolledBack: 0,
      };
      const updatedDeployment = { ...mockDeployment, progress: newProgress };
      deploymentRepo.findById.mockResolvedValue(mockDeployment as any);
      deploymentRepo.update.mockResolvedValue(updatedDeployment as any);

      const result = await service.updateProgress('deploy-123', newProgress);

      expect(result.progress.succeeded).toBe(3);
    });

    it('should throw NotFoundException when deployment not found', async () => {
      deploymentRepo.findById.mockResolvedValue(null);

      await expect(
        service.updateProgress('nonexistent', {
          total: 10,
          pending: 10,
          inProgress: 0,
          succeeded: 0,
          failed: 0,
          rolledBack: 0,
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should remove a deployment', async () => {
      deploymentRepo.findById.mockResolvedValue(mockDeployment as any);
      deploymentRepo.delete.mockResolvedValue(undefined);

      await service.remove('deploy-123');

      expect(deploymentRepo.delete).toHaveBeenCalledWith('deploy-123');
    });

    it('should throw NotFoundException when deployment not found', async () => {
      deploymentRepo.findById.mockResolvedValue(null);

      await expect(service.remove('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByFirmware', () => {
    it('should return deployments for a firmware', async () => {
      deploymentRepo.findMany.mockResolvedValue([mockDeployment as any]);

      const result = await service.findByFirmware('fw-1');

      expect(result).toHaveLength(1);
      expect(deploymentRepo.findMany).toHaveBeenCalledWith({ firmwareId: 'fw-1' });
    });
  });
});
