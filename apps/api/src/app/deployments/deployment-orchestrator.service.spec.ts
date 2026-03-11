/**
 * Deployment Orchestrator Service Unit Tests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { DeploymentOrchestratorService } from './deployment-orchestrator.service';
import {
  DeploymentRepository,
  DeviceDeploymentRepository,
  DeviceRepository,
  FirmwareRepository,
  FleetRepository,
  DeviceShadowRepository,
} from '@fleetforge/database';
import { EventsGateway } from '../events/events.gateway';
import {
  Deployment,
  DeploymentStatus,
  DeploymentStrategy,
  DeviceDeploymentStatus,
} from '@fleetforge/core';

describe('DeploymentOrchestratorService', () => {
  let service: DeploymentOrchestratorService;
  let deploymentRepo: jest.Mocked<DeploymentRepository>;
  let deviceDeploymentRepo: jest.Mocked<DeviceDeploymentRepository>;
  let deviceRepo: jest.Mocked<DeviceRepository>;
  let firmwareRepo: jest.Mocked<FirmwareRepository>;
  let fleetRepo: jest.Mocked<FleetRepository>;
  let shadowRepo: jest.Mocked<DeviceShadowRepository>;
  let eventsGateway: jest.Mocked<EventsGateway>;

  const mockDeployment = {
    id: 'deploy-123',
    firmwareId: 'fw-123',
    name: 'Test Deployment',
    status: DeploymentStatus.PENDING,
    config: {
      strategy: DeploymentStrategy.IMMEDIATE,
      target: { deviceIds: ['device-1', 'device-2'] },
    },
    progress: { total: 0, pending: 0, inProgress: 0, succeeded: 0, failed: 0, rolledBack: 0 },
    start: jest.fn(),
    complete: jest.fn(),
    rollback: jest.fn(),
    shouldAutoRollback: jest.fn().mockReturnValue(false),
  } as unknown as Deployment;

  const mockFirmware = {
    id: 'fw-123',
    version: '1.0.0',
    name: 'Test Firmware',
  };

  const mockDevice = {
    id: 'device-1',
    firmwareVersion: '0.9.0',
    name: 'Test Device',
  };

  beforeEach(async () => {
    const mockDeploymentRepo = {
      findById: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    };

    const mockDeviceDeploymentRepo = {
      findMany: jest.fn(),
      findByDeploymentAndDevice: jest.fn(),
      createMany: jest.fn(),
      update: jest.fn(),
      getStats: jest.fn(),
    };

    const mockDeviceRepo = {
      findById: jest.fn(),
      findByTags: jest.fn(),
    };

    const mockFirmwareRepo = {
      findById: jest.fn(),
    };

    const mockFleetRepo = {
      findById: jest.fn(),
    };

    const mockShadowRepo = {
      updateDesired: jest.fn(),
    };

    const mockEventsGateway = {
      broadcastDeploymentUpdate: jest.fn(),
      sendToDevice: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeploymentOrchestratorService,
        { provide: DeploymentRepository, useValue: mockDeploymentRepo },
        { provide: DeviceDeploymentRepository, useValue: mockDeviceDeploymentRepo },
        { provide: DeviceRepository, useValue: mockDeviceRepo },
        { provide: FirmwareRepository, useValue: mockFirmwareRepo },
        { provide: FleetRepository, useValue: mockFleetRepo },
        { provide: DeviceShadowRepository, useValue: mockShadowRepo },
        { provide: EventsGateway, useValue: mockEventsGateway },
      ],
    }).compile();

    service = module.get<DeploymentOrchestratorService>(DeploymentOrchestratorService);
    deploymentRepo = module.get(DeploymentRepository);
    deviceDeploymentRepo = module.get(DeviceDeploymentRepository);
    deviceRepo = module.get(DeviceRepository);
    firmwareRepo = module.get(FirmwareRepository);
    fleetRepo = module.get(FleetRepository);
    shadowRepo = module.get(DeviceShadowRepository);
    eventsGateway = module.get(EventsGateway);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createDeploymentPlan', () => {
    it('should throw NotFoundException when deployment not found', async () => {
      deploymentRepo.findById.mockResolvedValue(null);
      await expect(service.createDeploymentPlan('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when firmware not found', async () => {
      deploymentRepo.findById.mockResolvedValue(mockDeployment);
      firmwareRepo.findById.mockResolvedValue(null);
      await expect(service.createDeploymentPlan('deploy-123')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when no devices found', async () => {
      const noDevicesDeployment = {
        ...mockDeployment,
        config: { ...mockDeployment.config, target: { deviceIds: [] } },
        start: jest.fn(),
        complete: jest.fn(),
        rollback: jest.fn(),
        shouldAutoRollback: jest.fn().mockReturnValue(false),
      } as unknown as Deployment;
      deploymentRepo.findById.mockResolvedValue(noDevicesDeployment);
      firmwareRepo.findById.mockResolvedValue(mockFirmware as any);
      await expect(service.createDeploymentPlan('deploy-123')).rejects.toThrow(BadRequestException);
    });

    it('should create deployment plan with IMMEDIATE strategy', async () => {
      deploymentRepo.findById.mockResolvedValue(mockDeployment);
      firmwareRepo.findById.mockResolvedValue(mockFirmware as any);
      deviceRepo.findById.mockResolvedValue(mockDevice as any);
      deviceDeploymentRepo.createMany.mockResolvedValue(2);
      deploymentRepo.update.mockResolvedValue(mockDeployment);

      const plan = await service.createDeploymentPlan('deploy-123');

      expect(plan.deploymentId).toBe('deploy-123');
      expect(plan.totalDevices).toBe(2);
      expect(plan.batches).toHaveLength(1);
      expect(plan.strategy).toBe(DeploymentStrategy.IMMEDIATE);
    });

    it('should create deployment plan with CANARY strategy', async () => {
      const canaryDeployment = {
        ...mockDeployment,
        config: {
          strategy: DeploymentStrategy.CANARY,
          target: { deviceIds: ['d1', 'd2', 'd3', 'd4', 'd5', 'd6', 'd7', 'd8', 'd9', 'd10'] },
          canary: { percentage: 10, observationTimeMinutes: 30 },
        },
      } as unknown as Deployment;

      deploymentRepo.findById.mockResolvedValue(canaryDeployment);
      firmwareRepo.findById.mockResolvedValue(mockFirmware as any);
      deviceRepo.findById.mockResolvedValue(mockDevice as any);
      deviceDeploymentRepo.createMany.mockResolvedValue(10);
      deploymentRepo.update.mockResolvedValue(canaryDeployment);

      const plan = await service.createDeploymentPlan('deploy-123');

      expect(plan.strategy).toBe(DeploymentStrategy.CANARY);
      expect(plan.batches).toHaveLength(2);
      expect(plan.batches[0].isCanary).toBe(true);
    });

    it('should create deployment plan with ROLLING strategy', async () => {
      const rollingDeployment = {
        ...mockDeployment,
        config: {
          strategy: DeploymentStrategy.ROLLING,
          target: { deviceIds: ['d1', 'd2', 'd3', 'd4', 'd5'] },
          rolling: { batchSize: 2 },
        },
      } as unknown as Deployment;

      deploymentRepo.findById.mockResolvedValue(rollingDeployment);
      firmwareRepo.findById.mockResolvedValue(mockFirmware as any);
      deviceRepo.findById.mockResolvedValue(mockDevice as any);
      deviceDeploymentRepo.createMany.mockResolvedValue(5);
      deploymentRepo.update.mockResolvedValue(rollingDeployment);

      const plan = await service.createDeploymentPlan('deploy-123');

      expect(plan.strategy).toBe(DeploymentStrategy.ROLLING);
      expect(plan.batches.length).toBeGreaterThanOrEqual(2);
    });

    it('should create deployment plan with PHASED strategy', async () => {
      const phasedDeployment = {
        ...mockDeployment,
        config: {
          strategy: DeploymentStrategy.PHASED,
          target: { deviceIds: ['d1', 'd2', 'd3', 'd4', 'd5'] },
          phased: { phaseCount: 2 },
        },
      } as unknown as Deployment;

      deploymentRepo.findById.mockResolvedValue(phasedDeployment);
      firmwareRepo.findById.mockResolvedValue(mockFirmware as any);
      deviceRepo.findById.mockResolvedValue(mockDevice as any);
      deviceDeploymentRepo.createMany.mockResolvedValue(5);
      deploymentRepo.update.mockResolvedValue(phasedDeployment);

      const plan = await service.createDeploymentPlan('deploy-123');

      expect(plan.strategy).toBe(DeploymentStrategy.PHASED);
      expect(plan.batches).toHaveLength(2);
    });

    it('should resolve devices from fleet IDs', async () => {
      const fleetDeployment = {
        ...mockDeployment,
        config: {
          strategy: DeploymentStrategy.IMMEDIATE,
          target: { fleetIds: ['fleet-1'] },
        },
      } as unknown as Deployment;

      deploymentRepo.findById.mockResolvedValue(fleetDeployment);
      firmwareRepo.findById.mockResolvedValue(mockFirmware as any);
      fleetRepo.findById.mockResolvedValue({ id: 'fleet-1', deviceIds: ['d1', 'd2'] } as any);
      deviceRepo.findById.mockResolvedValue(mockDevice as any);
      deviceDeploymentRepo.createMany.mockResolvedValue(2);
      deploymentRepo.update.mockResolvedValue(fleetDeployment);

      const plan = await service.createDeploymentPlan('deploy-123');

      expect(plan.totalDevices).toBe(2);
    });

    it('should resolve devices from tags', async () => {
      const tagDeployment = {
        ...mockDeployment,
        config: {
          strategy: DeploymentStrategy.IMMEDIATE,
          target: { tags: ['production'] },
        },
      } as unknown as Deployment;

      deploymentRepo.findById.mockResolvedValue(tagDeployment);
      firmwareRepo.findById.mockResolvedValue(mockFirmware as any);
      deviceRepo.findByTags.mockResolvedValue([{ id: 'd1' }, { id: 'd2' }] as any);
      deviceRepo.findById.mockResolvedValue(mockDevice as any);
      deviceDeploymentRepo.createMany.mockResolvedValue(2);
      deploymentRepo.update.mockResolvedValue(tagDeployment);

      const plan = await service.createDeploymentPlan('deploy-123');

      expect(plan.totalDevices).toBe(2);
    });
  });

  describe('startDeployment', () => {
    it('should throw NotFoundException when deployment not found', async () => {
      deploymentRepo.findById.mockResolvedValue(null);
      await expect(service.startDeployment('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when status is not PENDING', async () => {
      const inProgressDeployment = { ...mockDeployment, status: DeploymentStatus.IN_PROGRESS };
      deploymentRepo.findById.mockResolvedValue(inProgressDeployment as Deployment);
      await expect(service.startDeployment('deploy-123')).rejects.toThrow(BadRequestException);
    });

    it('should start deployment and process first batch', async () => {
      const pendingDeployment = {
        ...mockDeployment,
        status: DeploymentStatus.PENDING,
        start: jest.fn(),
        complete: jest.fn(),
        rollback: jest.fn(),
        shouldAutoRollback: jest.fn().mockReturnValue(false),
      };
      deploymentRepo.findById.mockResolvedValue(pendingDeployment as unknown as Deployment);
      deploymentRepo.update.mockResolvedValue(pendingDeployment as unknown as Deployment);
      deviceDeploymentRepo.findMany.mockResolvedValue([]);

      await service.startDeployment('deploy-123');

      expect(pendingDeployment.start).toHaveBeenCalled();
      expect(eventsGateway.broadcastDeploymentUpdate).toHaveBeenCalled();
    });
  });

  describe('rollbackDeployment', () => {
    it('should throw NotFoundException when deployment not found', async () => {
      deploymentRepo.findById.mockResolvedValue(null);
      await expect(service.rollbackDeployment('nonexistent', 'reason')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should rollback deployment and active devices', async () => {
      const activeDeployment = { ...mockDeployment, status: DeploymentStatus.IN_PROGRESS };
      const mockDeviceDeployment = {
        id: 'dd-1',
        deviceId: 'device-1',
        deploymentId: 'deploy-123',
        status: DeviceDeploymentStatus.DOWNLOADING,
        previousFirmwareVersion: '0.9.0',
        rollback: jest.fn(),
      };

      deploymentRepo.findById.mockResolvedValue(activeDeployment as Deployment);
      deploymentRepo.update.mockResolvedValue(activeDeployment as Deployment);
      deviceDeploymentRepo.findMany.mockResolvedValue([mockDeviceDeployment as any]);
      deviceDeploymentRepo.update.mockResolvedValue(mockDeviceDeployment as any);
      shadowRepo.updateDesired.mockResolvedValue({} as any);

      await service.rollbackDeployment('deploy-123', 'Test rollback');

      expect(mockDeployment.rollback).toHaveBeenCalledWith('Test rollback');
      expect(eventsGateway.broadcastDeploymentUpdate).toHaveBeenCalled();
    });
  });

  describe('checkCanaryHealth', () => {
    it('should throw NotFoundException when deployment not found', async () => {
      deploymentRepo.findById.mockResolvedValue(null);
      await expect(service.checkCanaryHealth('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should return healthy status when success rate meets threshold', async () => {
      const canaryDeployment = {
        ...mockDeployment,
        config: { ...mockDeployment.config, canary: { successThreshold: 90 } },
      };
      deploymentRepo.findById.mockResolvedValue(canaryDeployment as Deployment);
      deviceDeploymentRepo.getStats.mockResolvedValue({
        total: 10,
        pending: 0,
        downloading: 0,
        downloaded: 0,
        installing: 0,
        rebooting: 0,
        succeeded: 9,
        failed: 1,
        rolledBack: 0,
        skipped: 0,
      });

      const result = await service.checkCanaryHealth('deploy-123');

      expect(result.healthy).toBe(true); // 90% threshold, 90% success = healthy
      expect(result.successRate).toBe(90);
    });

    it('should return unhealthy when success rate below threshold', async () => {
      const canaryDeployment = {
        ...mockDeployment,
        config: { ...mockDeployment.config, canary: { successThreshold: 95 } },
      };
      deploymentRepo.findById.mockResolvedValue(canaryDeployment as Deployment);
      deviceDeploymentRepo.getStats.mockResolvedValue({
        total: 10,
        pending: 0,
        downloading: 0,
        downloaded: 0,
        installing: 0,
        rebooting: 0,
        succeeded: 8,
        failed: 2,
        rolledBack: 0,
        skipped: 0,
      });

      const result = await service.checkCanaryHealth('deploy-123');

      expect(result.healthy).toBe(false);
      expect(result.successRate).toBe(80);
    });
  });

  describe('promoteCanary', () => {
    it('should throw NotFoundException when deployment not found', async () => {
      deploymentRepo.findById.mockResolvedValue(null);
      await expect(service.promoteCanary('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for non-canary deployment', async () => {
      const immediateDeployment = {
        ...mockDeployment,
        config: { strategy: DeploymentStrategy.IMMEDIATE, target: {} },
      };
      deploymentRepo.findById.mockResolvedValue(immediateDeployment as Deployment);
      await expect(service.promoteCanary('deploy-123')).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when canary is unhealthy', async () => {
      const canaryDeployment = {
        ...mockDeployment,
        config: {
          strategy: DeploymentStrategy.CANARY,
          target: {},
          canary: { successThreshold: 95 },
        },
      };
      deploymentRepo.findById.mockResolvedValue(canaryDeployment as Deployment);
      deviceDeploymentRepo.getStats.mockResolvedValue({
        total: 10,
        pending: 5,
        downloading: 0,
        downloaded: 0,
        installing: 0,
        rebooting: 0,
        succeeded: 3,
        failed: 2,
        rolledBack: 0,
        skipped: 0,
      });

      await expect(service.promoteCanary('deploy-123')).rejects.toThrow(BadRequestException);
    });
  });

  describe('pauseDeployment', () => {
    it('should throw NotFoundException when deployment not found', async () => {
      deploymentRepo.findById.mockResolvedValue(null);
      await expect(service.pauseDeployment('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when not in progress', async () => {
      const pendingDeployment = { ...mockDeployment, status: DeploymentStatus.PENDING };
      deploymentRepo.findById.mockResolvedValue(pendingDeployment as Deployment);
      await expect(service.pauseDeployment('deploy-123')).rejects.toThrow(BadRequestException);
    });

    it('should pause in-progress deployment', async () => {
      const inProgressDeployment = { ...mockDeployment, status: DeploymentStatus.IN_PROGRESS };
      deploymentRepo.findById.mockResolvedValue(inProgressDeployment as Deployment);
      deploymentRepo.update.mockResolvedValue(inProgressDeployment as Deployment);

      await service.pauseDeployment('deploy-123');

      expect(deploymentRepo.update).toHaveBeenCalledWith('deploy-123', expect.any(Object));
      expect(eventsGateway.broadcastDeploymentUpdate).toHaveBeenCalled();
    });
  });

  describe('resumeDeployment', () => {
    it('should throw NotFoundException when deployment not found', async () => {
      deploymentRepo.findById.mockResolvedValue(null);
      await expect(service.resumeDeployment('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should resume paused deployment', async () => {
      const pausedDeployment = { ...mockDeployment, status: DeploymentStatus.PENDING };
      deploymentRepo.findById.mockResolvedValue(pausedDeployment as Deployment);
      deploymentRepo.update.mockResolvedValue(pausedDeployment as Deployment);
      deviceDeploymentRepo.findMany.mockResolvedValue([]);

      await service.resumeDeployment('deploy-123');

      expect(deploymentRepo.update).toHaveBeenCalled();
      expect(eventsGateway.broadcastDeploymentUpdate).toHaveBeenCalled();
    });
  });

  describe('advancePhase', () => {
    it('should throw NotFoundException when deployment not found', async () => {
      deploymentRepo.findById.mockResolvedValue(null);
      await expect(service.advancePhase('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for non-phased deployment', async () => {
      const immediateDeployment = {
        ...mockDeployment,
        config: { strategy: DeploymentStrategy.IMMEDIATE, target: {} },
      };
      deploymentRepo.findById.mockResolvedValue(immediateDeployment as Deployment);
      await expect(service.advancePhase('deploy-123')).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when threshold not met', async () => {
      const phasedDeployment = {
        ...mockDeployment,
        config: {
          strategy: DeploymentStrategy.PHASED,
          target: {},
          phased: { advanceThreshold: 90 },
        },
      };
      deploymentRepo.findById.mockResolvedValue(phasedDeployment as Deployment);
      deviceDeploymentRepo.getStats.mockResolvedValue({
        total: 10,
        pending: 5,
        downloading: 0,
        downloaded: 0,
        installing: 0,
        rebooting: 0,
        succeeded: 3,
        failed: 2,
        rolledBack: 0,
        skipped: 0,
      });

      await expect(service.advancePhase('deploy-123')).rejects.toThrow(BadRequestException);
    });
  });

  describe('getDeploymentStatus', () => {
    it('should throw NotFoundException when deployment not found', async () => {
      deploymentRepo.findById.mockResolvedValue(null);
      await expect(service.getDeploymentStatus('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should return status for canary deployment', async () => {
      const canaryDeployment = {
        ...mockDeployment,
        config: {
          strategy: DeploymentStrategy.CANARY,
          target: {},
          canary: { autoPromote: false },
        },
      };
      deploymentRepo.findById.mockResolvedValue(canaryDeployment as Deployment);
      deviceDeploymentRepo.getStats.mockResolvedValue({
        total: 10,
        pending: 5,
        downloading: 0,
        downloaded: 0,
        installing: 0,
        rebooting: 0,
        succeeded: 5,
        failed: 0,
        rolledBack: 0,
        skipped: 0,
      });

      const result = await service.getDeploymentStatus('deploy-123');

      expect(result.strategy).toBe(DeploymentStrategy.CANARY);
      expect(result.canaryHealth).toBeDefined();
    });

    it('should return status for phased deployment', async () => {
      const phasedDeployment = {
        ...mockDeployment,
        config: {
          strategy: DeploymentStrategy.PHASED,
          target: {},
          phased: { phaseCount: 5 },
        },
      };
      deploymentRepo.findById.mockResolvedValue(phasedDeployment as Deployment);
      deviceDeploymentRepo.getStats.mockResolvedValue({
        total: 10,
        pending: 5,
        downloading: 0,
        downloaded: 0,
        installing: 0,
        rebooting: 0,
        succeeded: 5,
        failed: 0,
        rolledBack: 0,
        skipped: 0,
      });

      const result = await service.getDeploymentStatus('deploy-123');

      expect(result.strategy).toBe(DeploymentStrategy.PHASED);
      expect(result.totalPhases).toBe(5);
    });
  });

  describe('updateDeviceProgress', () => {
    it('should return early if device deployment not found', async () => {
      deviceDeploymentRepo.findByDeploymentAndDevice.mockResolvedValue(null);

      await service.updateDeviceProgress('deploy-123', 'device-1', { progress: 50 });

      expect(deviceDeploymentRepo.update).not.toHaveBeenCalled();
    });

    it('should update device deployment progress', async () => {
      const mockDeviceDeployment = {
        id: 'dd-1',
        deviceId: 'device-1',
        deploymentId: 'deploy-123',
        status: DeviceDeploymentStatus.DOWNLOADING,
        progress: 0,
        errors: [],
        succeed: jest.fn(),
        fail: jest.fn(),
      };

      deviceDeploymentRepo.findByDeploymentAndDevice.mockResolvedValue(mockDeviceDeployment as any);
      deviceDeploymentRepo.update.mockResolvedValue(mockDeviceDeployment as any);
      deviceDeploymentRepo.getStats.mockResolvedValue({
        total: 10,
        pending: 5,
        downloading: 1,
        downloaded: 0,
        installing: 0,
        rebooting: 0,
        succeeded: 4,
        failed: 0,
        rolledBack: 0,
        skipped: 0,
      });
      deploymentRepo.findById.mockResolvedValue(mockDeployment);
      deploymentRepo.update.mockResolvedValue(mockDeployment);

      await service.updateDeviceProgress('deploy-123', 'device-1', { progress: 50 });

      expect(deviceDeploymentRepo.update).toHaveBeenCalled();
    });

    it('should handle device deployment success', async () => {
      const mockDeviceDeployment = {
        id: 'dd-1',
        deviceId: 'device-1',
        deploymentId: 'deploy-123',
        status: DeviceDeploymentStatus.DOWNLOADING,
        progress: 100,
        errors: [],
        completedAt: null,
        succeed: jest.fn(),
        fail: jest.fn(),
      };

      deviceDeploymentRepo.findByDeploymentAndDevice.mockResolvedValue(mockDeviceDeployment as any);
      deviceDeploymentRepo.update.mockResolvedValue(mockDeviceDeployment as any);
      deviceDeploymentRepo.getStats.mockResolvedValue({
        total: 10,
        pending: 0,
        downloading: 0,
        downloaded: 0,
        installing: 0,
        rebooting: 0,
        succeeded: 10,
        failed: 0,
        rolledBack: 0,
        skipped: 0,
      });
      deploymentRepo.findById.mockResolvedValue({
        ...mockDeployment,
        status: DeploymentStatus.IN_PROGRESS,
      } as Deployment);
      deploymentRepo.update.mockResolvedValue(mockDeployment);

      await service.updateDeviceProgress('deploy-123', 'device-1', {
        status: DeviceDeploymentStatus.SUCCEEDED,
      });

      expect(mockDeviceDeployment.succeed).toHaveBeenCalled();
    });

    it('should return early when device deployment not found', async () => {
      deviceDeploymentRepo.findByDeploymentAndDevice.mockResolvedValue(null);

      await service.updateDeviceProgress('deploy-123', 'unknown-device', {
        status: DeviceDeploymentStatus.SUCCEEDED,
      });

      expect(deviceDeploymentRepo.update).not.toHaveBeenCalled();
    });

    it('should handle FAILED status with error', async () => {
      const mockDeviceDeployment = {
        id: 'dd-1',
        deviceId: 'device-1',
        deploymentId: 'deploy-123',
        status: DeviceDeploymentStatus.DOWNLOADING,
        progress: 50,
        errors: [],
        completedAt: null,
        succeed: jest.fn(),
        fail: jest.fn(),
      };

      deviceDeploymentRepo.findByDeploymentAndDevice.mockResolvedValue(mockDeviceDeployment as any);
      deviceDeploymentRepo.update.mockResolvedValue(mockDeviceDeployment as any);
      deviceDeploymentRepo.getStats.mockResolvedValue({
        total: 10,
        pending: 5,
        downloading: 0,
        downloaded: 0,
        installing: 0,
        rebooting: 0,
        succeeded: 4,
        failed: 1,
        rolledBack: 0,
        skipped: 0,
      });
      deploymentRepo.findById.mockResolvedValue(mockDeployment);
      deploymentRepo.update.mockResolvedValue(mockDeployment);

      await service.updateDeviceProgress('deploy-123', 'device-1', {
        status: DeviceDeploymentStatus.FAILED,
        error: { code: 'ERR001', message: 'Download failed', retryable: true },
      });

      expect(mockDeviceDeployment.fail).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'ERR001',
          message: 'Download failed',
          retryable: true,
        }),
      );
    });

    it('should handle FAILED status without error object', async () => {
      const mockDeviceDeployment = {
        id: 'dd-1',
        deviceId: 'device-1',
        deploymentId: 'deploy-123',
        status: DeviceDeploymentStatus.DOWNLOADING,
        progress: 50,
        errors: [],
        completedAt: null,
        succeed: jest.fn(),
        fail: jest.fn(),
      };

      deviceDeploymentRepo.findByDeploymentAndDevice.mockResolvedValue(mockDeviceDeployment as any);
      deviceDeploymentRepo.update.mockResolvedValue(mockDeviceDeployment as any);
      deviceDeploymentRepo.getStats.mockResolvedValue({
        total: 10,
        pending: 5,
        downloading: 0,
        downloaded: 0,
        installing: 0,
        rebooting: 0,
        succeeded: 4,
        failed: 1,
        rolledBack: 0,
        skipped: 0,
      });
      deploymentRepo.findById.mockResolvedValue(mockDeployment);
      deploymentRepo.update.mockResolvedValue(mockDeployment);

      // FAILED without error - should not call fail()
      await service.updateDeviceProgress('deploy-123', 'device-1', {
        status: DeviceDeploymentStatus.FAILED,
      });

      expect(mockDeviceDeployment.fail).not.toHaveBeenCalled();
    });
  });
});
