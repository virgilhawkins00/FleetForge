/**
 * DeploymentsController Unit Tests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { DeploymentsController } from './deployments.controller';
import { DeploymentsService } from './deployments.service';
import { DeploymentOrchestratorService } from './deployment-orchestrator.service';
import { DeploymentSchedulerService } from './deployment-scheduler.service';
import { DeploymentStatus, DeploymentStrategy } from '@fleetforge/core';

describe('DeploymentsController', () => {
  let controller: DeploymentsController;
  let deploymentsService: ReturnType<typeof createMockDeploymentsService>;
  let orchestratorService: ReturnType<typeof createMockOrchestratorService>;
  let schedulerService: ReturnType<typeof createMockSchedulerService>;

  const createMockDeploymentsService = () => ({
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    findActive: jest.fn(),
    findByFirmware: jest.fn(),
    start: jest.fn(),
    cancel: jest.fn(),
    rollback: jest.fn(),
    updateProgress: jest.fn(),
    remove: jest.fn(),
    getDeviceDeployments: jest.fn(),
    getDeploymentStats: jest.fn(),
    mapToResponse: jest.fn(),
  });

  const createMockOrchestratorService = () => ({
    createDeploymentPlan: jest.fn(),
    startDeployment: jest.fn(),
    rollbackDeployment: jest.fn(),
    updateDeviceProgress: jest.fn(),
    getDeploymentStatus: jest.fn(),
    checkCanaryHealth: jest.fn(),
    promoteCanary: jest.fn(),
    pauseDeployment: jest.fn(),
    resumeDeployment: jest.fn(),
    advancePhase: jest.fn(),
  });

  const createMockSchedulerService = () => ({
    scheduleDeployment: jest.fn(),
    getSchedulesForDeployment: jest.fn(),
    getAllActiveSchedules: jest.fn(),
    getSchedule: jest.fn(),
    updateSchedule: jest.fn(),
    cancelSchedule: jest.fn(),
  });

  const mockDeployment = {
    id: 'deployment-1',
    name: 'Test Deployment',
    firmwareId: 'firmware-1',
    status: DeploymentStatus.PENDING,
    strategy: DeploymentStrategy.ROLLING,
    progress: { total: 10, completed: 0, failed: 0, pending: 10 },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const mockDeploymentsServiceInstance = createMockDeploymentsService();
    const mockOrchestratorServiceInstance = createMockOrchestratorService();
    const mockSchedulerServiceInstance = createMockSchedulerService();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DeploymentsController],
      providers: [
        { provide: DeploymentsService, useValue: mockDeploymentsServiceInstance },
        { provide: DeploymentOrchestratorService, useValue: mockOrchestratorServiceInstance },
        { provide: DeploymentSchedulerService, useValue: mockSchedulerServiceInstance },
      ],
    }).compile();

    controller = module.get<DeploymentsController>(DeploymentsController);
    deploymentsService = mockDeploymentsServiceInstance;
    orchestratorService = mockOrchestratorServiceInstance;
    schedulerService = mockSchedulerServiceInstance;
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create deployment', async () => {
      deploymentsService.create.mockResolvedValue(mockDeployment as any);

      const result = await controller.create({
        name: 'Test Deployment',
        firmwareId: 'firmware-1',
        firmwareVersion: '1.0.0',
        createdBy: 'user-1',
        config: {
          strategy: DeploymentStrategy.ROLLING,
          target: { fleetIds: ['fleet-1'] },
        },
      });

      expect(result.name).toBe('Test Deployment');
      expect(deploymentsService.create).toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return deployments list', async () => {
      deploymentsService.findAll.mockResolvedValue([mockDeployment as any]);

      const result = await controller.findAll(
        DeploymentStatus.PENDING,
        'firmware-1',
        'user-1',
        10,
        0,
      );

      expect(result).toHaveLength(1);
      expect(deploymentsService.findAll).toHaveBeenCalledWith(
        { status: DeploymentStatus.PENDING, firmwareId: 'firmware-1', createdBy: 'user-1' },
        10,
        0,
      );
    });
  });

  describe('findOne', () => {
    it('should return deployment by id', async () => {
      deploymentsService.findOne.mockResolvedValue(mockDeployment as any);

      const result = await controller.findOne('deployment-1');

      expect(result.id).toBe('deployment-1');
    });
  });

  describe('findActive', () => {
    it('should return active deployments', async () => {
      deploymentsService.findActive.mockResolvedValue([mockDeployment as any]);

      const result = await controller.findActive();

      expect(result).toHaveLength(1);
    });
  });

  describe('start', () => {
    it('should start deployment', async () => {
      const started = { ...mockDeployment, status: DeploymentStatus.IN_PROGRESS };
      deploymentsService.start.mockResolvedValue(started as any);

      const result = await controller.start('deployment-1');

      expect(result.status).toBe(DeploymentStatus.IN_PROGRESS);
    });
  });

  describe('cancel', () => {
    it('should cancel deployment', async () => {
      const cancelled = { ...mockDeployment, status: DeploymentStatus.CANCELLED };
      deploymentsService.cancel.mockResolvedValue(cancelled as any);

      const result = await controller.cancel('deployment-1');

      expect(result.status).toBe(DeploymentStatus.CANCELLED);
    });
  });

  describe('rollback', () => {
    it('should rollback deployment', async () => {
      const rolledBack = { ...mockDeployment, status: DeploymentStatus.ROLLED_BACK };
      deploymentsService.rollback.mockResolvedValue(rolledBack as any);

      const result = await controller.rollback('deployment-1', 'Critical bug found');

      expect(result.status).toBe(DeploymentStatus.ROLLED_BACK);
      expect(deploymentsService.rollback).toHaveBeenCalledWith(
        'deployment-1',
        'Critical bug found',
      );
    });
  });

  describe('remove', () => {
    it('should remove deployment', async () => {
      deploymentsService.remove.mockResolvedValue(undefined);

      await controller.remove('deployment-1');

      expect(deploymentsService.remove).toHaveBeenCalledWith('deployment-1');
    });
  });

  describe('getDeviceDeployments', () => {
    it('should return device deployments', async () => {
      const deviceDeployments = [{ deviceId: 'device-1', status: 'pending' }];
      deploymentsService.getDeviceDeployments.mockResolvedValue(deviceDeployments as any);

      const result = await controller.getDeviceDeployments('deployment-1');

      expect(result).toHaveLength(1);
    });
  });

  describe('getStats', () => {
    it('should return deployment stats', async () => {
      const stats = { total: 10, completed: 5, failed: 1, pending: 4 };
      deploymentsService.getDeploymentStats.mockResolvedValue(stats as any);

      const result = await controller.getStats('deployment-1');

      expect(result.total).toBe(10);
    });
  });

  describe('orchestrator endpoints', () => {
    it('should create deployment plan', async () => {
      orchestratorService.createDeploymentPlan.mockResolvedValue({ devices: 10 } as any);

      const result = await controller.createPlan('deployment-1');

      expect(result).toEqual({ devices: 10 });
    });

    it('should execute deployment', async () => {
      orchestratorService.startDeployment.mockResolvedValue(mockDeployment as any);
      deploymentsService.mapToResponse.mockReturnValue(mockDeployment as any);

      const result = await controller.execute('deployment-1');

      expect(result.id).toBe('deployment-1');
    });

    it('should pause deployment', async () => {
      const paused = { ...mockDeployment, status: DeploymentStatus.PENDING };
      orchestratorService.pauseDeployment.mockResolvedValue(paused as any);
      deploymentsService.mapToResponse.mockReturnValue(paused as any);

      const result = await controller.pauseDeployment('deployment-1');

      expect(result.status).toBe(DeploymentStatus.PENDING);
    });

    it('should resume deployment', async () => {
      orchestratorService.resumeDeployment.mockResolvedValue(mockDeployment as any);
      deploymentsService.mapToResponse.mockReturnValue(mockDeployment as any);

      await controller.resumeDeployment('deployment-1');

      expect(deploymentsService.mapToResponse).toHaveBeenCalled();
    });
  });

  describe('scheduler endpoints', () => {
    it('should schedule deployment', async () => {
      const scheduled = { id: 'schedule-1', deploymentId: 'deployment-1', scheduledAt: new Date() };
      schedulerService.scheduleDeployment.mockResolvedValue(scheduled as any);

      const result = await controller.scheduleDeployment('deployment-1', {
        type: 'ONCE' as any,
        scheduledAt: new Date().toISOString(),
      });

      expect(result.id).toBe('schedule-1');
    });

    it('should get active schedules', async () => {
      const schedules = [{ id: 'schedule-1' }];
      schedulerService.getAllActiveSchedules.mockResolvedValue(schedules as any);

      const result = await controller.getActiveSchedules();

      expect(result).toHaveLength(1);
    });

    it('should cancel schedule', async () => {
      schedulerService.cancelSchedule.mockReturnValue(undefined);

      await controller.cancelSchedule('schedule-1');

      expect(schedulerService.cancelSchedule).toHaveBeenCalledWith('schedule-1');
    });
  });
});
