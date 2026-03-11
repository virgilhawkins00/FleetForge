/**
 * DeviceLifecycleService Unit Tests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { DeviceLifecycleService } from './device-lifecycle.service';
import { DeviceRepository } from '@fleetforge/database';
import { DeviceStatus, DeviceLifecycleEvent, ILifecycleHistoryEntry } from '@fleetforge/core';

describe('DeviceLifecycleService', () => {
  let service: DeviceLifecycleService;
  let deviceRepo: jest.Mocked<DeviceRepository>;

  const createMockDevice = (status: DeviceStatus) => ({
    id: 'device-123',
    status,
    lifecycleHistory: [] as ILifecycleHistoryEntry[],
    lifecycleTimestamps: {},
    updatedAt: new Date(),
    canTransitionTo: jest.fn(),
    getAllowedTransitions: jest.fn().mockReturnValue([DeviceStatus.ACTIVE]),
    updateStatus: jest.fn(),
  });

  beforeEach(async () => {
    const mockDeviceRepo = {
      findById: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [DeviceLifecycleService, { provide: DeviceRepository, useValue: mockDeviceRepo }],
    }).compile();

    service = module.get<DeviceLifecycleService>(DeviceLifecycleService);
    deviceRepo = module.get(DeviceRepository);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('transition', () => {
    it('should transition device to new status', async () => {
      const mockDevice = createMockDevice(DeviceStatus.REGISTERED);
      mockDevice.canTransitionTo.mockReturnValue(true);
      mockDevice.lifecycleHistory = [
        {
          event: DeviceLifecycleEvent.ACTIVATED,
          fromStatus: DeviceStatus.REGISTERED,
          toStatus: DeviceStatus.ACTIVE,
          timestamp: new Date(),
        },
      ];
      deviceRepo.findById.mockResolvedValue(mockDevice as any);
      deviceRepo.update.mockResolvedValue({ ...mockDevice, status: DeviceStatus.ACTIVE } as any);

      const result = await service.transition('device-123', DeviceStatus.ACTIVE, 'Activating');

      expect(result.previousStatus).toBe(DeviceStatus.REGISTERED);
      expect(result.newStatus).toBe(DeviceStatus.ACTIVE);
      expect(mockDevice.updateStatus).toHaveBeenCalled();
    });

    it('should throw NotFoundException when device not found', async () => {
      deviceRepo.findById.mockResolvedValue(null);

      await expect(service.transition('nonexistent', DeviceStatus.ACTIVE)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException for invalid transition', async () => {
      const mockDevice = createMockDevice(DeviceStatus.DECOMMISSIONED);
      mockDevice.canTransitionTo.mockReturnValue(false);
      deviceRepo.findById.mockResolvedValue(mockDevice as any);

      await expect(service.transition('device-123', DeviceStatus.ACTIVE)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('activate', () => {
    it('should activate device', async () => {
      const mockDevice = createMockDevice(DeviceStatus.REGISTERED);
      mockDevice.canTransitionTo.mockReturnValue(true);
      mockDevice.lifecycleHistory = [
        {
          event: DeviceLifecycleEvent.ACTIVATED,
          fromStatus: DeviceStatus.REGISTERED,
          toStatus: DeviceStatus.ACTIVE,
          timestamp: new Date(),
        },
      ];
      deviceRepo.findById.mockResolvedValue(mockDevice as any);
      deviceRepo.update.mockResolvedValue({ ...mockDevice, status: DeviceStatus.ACTIVE } as any);

      const result = await service.activate('device-123', 'admin');

      expect(result.newStatus).toBe(DeviceStatus.ACTIVE);
    });
  });

  describe('suspend', () => {
    it('should suspend device', async () => {
      const mockDevice = createMockDevice(DeviceStatus.ACTIVE);
      mockDevice.canTransitionTo.mockReturnValue(true);
      mockDevice.lifecycleHistory = [
        {
          event: DeviceLifecycleEvent.SUSPENDED,
          fromStatus: DeviceStatus.ACTIVE,
          toStatus: DeviceStatus.SUSPENDED,
          timestamp: new Date(),
        },
      ];
      deviceRepo.findById.mockResolvedValue(mockDevice as any);
      deviceRepo.update.mockResolvedValue({ ...mockDevice, status: DeviceStatus.SUSPENDED } as any);

      const result = await service.suspend('device-123', 'Maintenance', 'admin');

      expect(result.newStatus).toBe(DeviceStatus.SUSPENDED);
    });
  });

  describe('getAllowedTransitions', () => {
    it('should return allowed transitions', async () => {
      const mockDevice = createMockDevice(DeviceStatus.ACTIVE);
      deviceRepo.findById.mockResolvedValue(mockDevice as any);

      const result = await service.getAllowedTransitions('device-123');

      expect(Array.isArray(result)).toBe(true);
    });

    it('should throw NotFoundException when device not found', async () => {
      deviceRepo.findById.mockResolvedValue(null);

      await expect(service.getAllowedTransitions('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getLifecycleHistory', () => {
    it('should return lifecycle history', async () => {
      const mockDevice = createMockDevice(DeviceStatus.ACTIVE);
      mockDevice.lifecycleHistory = [
        {
          event: DeviceLifecycleEvent.REGISTERED,
          fromStatus: DeviceStatus.REGISTERED,
          toStatus: DeviceStatus.REGISTERED,
          timestamp: new Date(),
        },
        {
          event: DeviceLifecycleEvent.ACTIVATED,
          fromStatus: DeviceStatus.REGISTERED,
          toStatus: DeviceStatus.ACTIVE,
          timestamp: new Date(),
        },
      ];
      deviceRepo.findById.mockResolvedValue(mockDevice as any);

      const result = await service.getLifecycleHistory('device-123');

      expect(result).toHaveLength(2);
    });
  });

  describe('batchTransition', () => {
    it('should transition multiple devices', async () => {
      const mockDevice = createMockDevice(DeviceStatus.ACTIVE);
      mockDevice.canTransitionTo.mockReturnValue(true);
      mockDevice.lifecycleHistory = [
        {
          event: DeviceLifecycleEvent.SUSPENDED,
          fromStatus: DeviceStatus.ACTIVE,
          toStatus: DeviceStatus.SUSPENDED,
          timestamp: new Date(),
        },
      ];
      deviceRepo.findById.mockResolvedValue(mockDevice as any);
      deviceRepo.update.mockResolvedValue({ ...mockDevice, status: DeviceStatus.SUSPENDED } as any);

      const result = await service.batchTransition(
        ['device-1', 'device-2'],
        DeviceStatus.SUSPENDED,
        'Maintenance',
      );

      expect(result.success.length).toBe(2);
      expect(result.failed.length).toBe(0);
    });

    it('should handle failed transitions', async () => {
      deviceRepo.findById.mockResolvedValue(null);

      const result = await service.batchTransition(
        ['device-1', 'device-2'],
        DeviceStatus.SUSPENDED,
        'Maintenance',
      );

      expect(result.success.length).toBe(0);
      expect(result.failed.length).toBe(2);
    });
  });

  describe('reactivate', () => {
    it('should reactivate a suspended device', async () => {
      const mockDevice = createMockDevice(DeviceStatus.SUSPENDED);
      mockDevice.canTransitionTo.mockReturnValue(true);
      mockDevice.lifecycleHistory = [
        {
          event: DeviceLifecycleEvent.ACTIVATED,
          fromStatus: DeviceStatus.SUSPENDED,
          toStatus: DeviceStatus.ACTIVE,
          timestamp: new Date(),
        },
      ];
      deviceRepo.findById.mockResolvedValue(mockDevice as any);
      deviceRepo.update.mockResolvedValue({ ...mockDevice, status: DeviceStatus.ACTIVE } as any);

      const result = await service.reactivate('device-123', 'admin');

      expect(result.newStatus).toBe(DeviceStatus.ACTIVE);
    });
  });

  describe('startMaintenance', () => {
    it('should put device in maintenance mode', async () => {
      const mockDevice = createMockDevice(DeviceStatus.ACTIVE);
      mockDevice.canTransitionTo.mockReturnValue(true);
      mockDevice.lifecycleHistory = [
        {
          event: DeviceLifecycleEvent.MAINTENANCE_STARTED,
          fromStatus: DeviceStatus.ACTIVE,
          toStatus: DeviceStatus.MAINTENANCE,
          timestamp: new Date(),
        },
      ];
      deviceRepo.findById.mockResolvedValue(mockDevice as any);
      deviceRepo.update.mockResolvedValue({
        ...mockDevice,
        status: DeviceStatus.MAINTENANCE,
      } as any);

      const result = await service.startMaintenance('device-123', 'Scheduled update', 'admin');

      expect(result.newStatus).toBe(DeviceStatus.MAINTENANCE);
    });

    it('should use default reason when not provided', async () => {
      const mockDevice = createMockDevice(DeviceStatus.ACTIVE);
      mockDevice.canTransitionTo.mockReturnValue(true);
      mockDevice.lifecycleHistory = [
        {
          event: DeviceLifecycleEvent.MAINTENANCE_STARTED,
          fromStatus: DeviceStatus.ACTIVE,
          toStatus: DeviceStatus.MAINTENANCE,
          timestamp: new Date(),
        },
      ];
      deviceRepo.findById.mockResolvedValue(mockDevice as any);
      deviceRepo.update.mockResolvedValue({
        ...mockDevice,
        status: DeviceStatus.MAINTENANCE,
      } as any);

      const result = await service.startMaintenance('device-123');

      expect(result.newStatus).toBe(DeviceStatus.MAINTENANCE);
    });
  });

  describe('endMaintenance', () => {
    it('should end maintenance mode', async () => {
      const mockDevice = createMockDevice(DeviceStatus.MAINTENANCE);
      mockDevice.canTransitionTo.mockReturnValue(true);
      mockDevice.lifecycleHistory = [
        {
          event: DeviceLifecycleEvent.MAINTENANCE_COMPLETED,
          fromStatus: DeviceStatus.MAINTENANCE,
          toStatus: DeviceStatus.ACTIVE,
          timestamp: new Date(),
        },
      ];
      deviceRepo.findById.mockResolvedValue(mockDevice as any);
      deviceRepo.update.mockResolvedValue({ ...mockDevice, status: DeviceStatus.ACTIVE } as any);

      const result = await service.endMaintenance('device-123', 'admin');

      expect(result.newStatus).toBe(DeviceStatus.ACTIVE);
    });
  });

  describe('decommission', () => {
    it('should decommission device', async () => {
      const mockDevice = createMockDevice(DeviceStatus.ACTIVE);
      mockDevice.canTransitionTo.mockReturnValue(true);
      mockDevice.lifecycleHistory = [
        {
          event: DeviceLifecycleEvent.DECOMMISSIONED,
          fromStatus: DeviceStatus.ACTIVE,
          toStatus: DeviceStatus.DECOMMISSIONED,
          timestamp: new Date(),
        },
      ];
      deviceRepo.findById.mockResolvedValue(mockDevice as any);
      deviceRepo.update.mockResolvedValue({
        ...mockDevice,
        status: DeviceStatus.DECOMMISSIONED,
      } as any);

      const result = await service.decommission('device-123', 'End of life', 'admin');

      expect(result.newStatus).toBe(DeviceStatus.DECOMMISSIONED);
    });

    it('should use default reason when not provided', async () => {
      const mockDevice = createMockDevice(DeviceStatus.ACTIVE);
      mockDevice.canTransitionTo.mockReturnValue(true);
      mockDevice.lifecycleHistory = [
        {
          event: DeviceLifecycleEvent.DECOMMISSIONED,
          fromStatus: DeviceStatus.ACTIVE,
          toStatus: DeviceStatus.DECOMMISSIONED,
          timestamp: new Date(),
        },
      ];
      deviceRepo.findById.mockResolvedValue(mockDevice as any);
      deviceRepo.update.mockResolvedValue({
        ...mockDevice,
        status: DeviceStatus.DECOMMISSIONED,
      } as any);

      const result = await service.decommission('device-123');

      expect(result.newStatus).toBe(DeviceStatus.DECOMMISSIONED);
    });
  });

  describe('markError', () => {
    it('should mark device as errored', async () => {
      const mockDevice = createMockDevice(DeviceStatus.ACTIVE);
      mockDevice.canTransitionTo.mockReturnValue(true);
      mockDevice.lifecycleHistory = [
        {
          event: DeviceLifecycleEvent.ERROR_OCCURRED,
          fromStatus: DeviceStatus.ACTIVE,
          toStatus: DeviceStatus.ERROR,
          timestamp: new Date(),
        },
      ];
      deviceRepo.findById.mockResolvedValue(mockDevice as any);
      deviceRepo.update.mockResolvedValue({ ...mockDevice, status: DeviceStatus.ERROR } as any);

      const result = await service.markError('device-123', 'Connection lost', 'system');

      expect(result.newStatus).toBe(DeviceStatus.ERROR);
    });
  });

  describe('resolveError', () => {
    it('should resolve device error', async () => {
      const mockDevice = createMockDevice(DeviceStatus.ERROR);
      mockDevice.canTransitionTo.mockReturnValue(true);
      mockDevice.lifecycleHistory = [
        {
          event: DeviceLifecycleEvent.ERROR_RESOLVED,
          fromStatus: DeviceStatus.ERROR,
          toStatus: DeviceStatus.ACTIVE,
          timestamp: new Date(),
        },
      ];
      deviceRepo.findById.mockResolvedValue(mockDevice as any);
      deviceRepo.update.mockResolvedValue({ ...mockDevice, status: DeviceStatus.ACTIVE } as any);

      const result = await service.resolveError('device-123', 'admin');

      expect(result.newStatus).toBe(DeviceStatus.ACTIVE);
    });
  });

  describe('getFleetLifecycleStats - branch coverage', () => {
    it('should handle devices with empty lifecycle history', async () => {
      const mockDeviceNoHistory = {
        ...createMockDevice(DeviceStatus.ACTIVE),
        lifecycleHistory: [],
      };
      deviceRepo.findMany.mockResolvedValue([mockDeviceNoHistory as any]);

      const result = await service.getFleetLifecycleStats('fleet-123');

      expect(result.totalDevices).toBe(1);
      expect(result.recentTransitions).toHaveLength(0);
    });

    it('should handle devices with lifecycle history entries', async () => {
      const now = new Date();
      const mockDeviceWithHistory = {
        ...createMockDevice(DeviceStatus.ACTIVE),
        lifecycleHistory: [
          {
            event: DeviceLifecycleEvent.REGISTERED,
            fromStatus: DeviceStatus.PROVISIONING,
            toStatus: DeviceStatus.REGISTERED,
            timestamp: new Date(now.getTime() - 3000),
          },
          {
            event: DeviceLifecycleEvent.ACTIVATED,
            fromStatus: DeviceStatus.REGISTERED,
            toStatus: DeviceStatus.ACTIVE,
            timestamp: new Date(now.getTime() - 2000),
          },
          {
            event: DeviceLifecycleEvent.WENT_OFFLINE,
            fromStatus: DeviceStatus.ACTIVE,
            toStatus: DeviceStatus.OFFLINE,
            timestamp: new Date(now.getTime() - 1000),
          },
          {
            event: DeviceLifecycleEvent.CAME_ONLINE,
            fromStatus: DeviceStatus.OFFLINE,
            toStatus: DeviceStatus.ACTIVE,
            timestamp: now,
          },
        ],
      };
      deviceRepo.findMany.mockResolvedValue([mockDeviceWithHistory as any]);

      const result = await service.getFleetLifecycleStats('fleet-123');

      expect(result.totalDevices).toBe(1);
      expect(result.recentTransitions.length).toBeGreaterThan(0);
    });

    it('should aggregate status counts from multiple devices', async () => {
      const mockDevices = [
        { ...createMockDevice(DeviceStatus.ACTIVE), lifecycleHistory: [] },
        { ...createMockDevice(DeviceStatus.ACTIVE), lifecycleHistory: [] },
        { ...createMockDevice(DeviceStatus.OFFLINE), lifecycleHistory: [] },
        { ...createMockDevice(DeviceStatus.ERROR), lifecycleHistory: [] },
      ];
      deviceRepo.findMany.mockResolvedValue(mockDevices as any);

      const result = await service.getFleetLifecycleStats('fleet-123');

      expect(result.totalDevices).toBe(4);
      expect(result.byStatus[DeviceStatus.ACTIVE]).toBe(2);
      expect(result.byStatus[DeviceStatus.OFFLINE]).toBe(1);
      expect(result.byStatus[DeviceStatus.ERROR]).toBe(1);
    });

    it('should sort transitions by timestamp descending and take top 20', async () => {
      const now = new Date();
      const transitions = Array.from({ length: 25 }, (_, i) => ({
        event: DeviceLifecycleEvent.ACTIVATED,
        fromStatus: DeviceStatus.OFFLINE,
        toStatus: DeviceStatus.ACTIVE,
        timestamp: new Date(now.getTime() - i * 1000),
      }));
      const mockDevice = {
        ...createMockDevice(DeviceStatus.ACTIVE),
        lifecycleHistory: transitions,
      };
      deviceRepo.findMany.mockResolvedValue([mockDevice as any]);

      const result = await service.getFleetLifecycleStats('fleet-123');

      expect(result.recentTransitions.length).toBeLessThanOrEqual(20);
    });
  });

  describe('getLifecycleHistory - branch coverage', () => {
    it('should throw NotFoundException when device not found', async () => {
      deviceRepo.findById.mockResolvedValue(null);

      await expect(service.getLifecycleHistory('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should return lifecycle history for existing device', async () => {
      const mockDevice = {
        ...createMockDevice(DeviceStatus.ACTIVE),
        lifecycleHistory: [
          {
            event: DeviceLifecycleEvent.REGISTERED,
            fromStatus: DeviceStatus.PROVISIONING,
            toStatus: DeviceStatus.REGISTERED,
            timestamp: new Date(),
          },
        ],
      };
      deviceRepo.findById.mockResolvedValue(mockDevice as any);

      const result = await service.getLifecycleHistory('device-123');

      expect(result).toHaveLength(1);
      expect(result[0].event).toBe(DeviceLifecycleEvent.REGISTERED);
    });
  });

  describe('transition - additional branch coverage', () => {
    it('should use default event when lifecycleHistory is empty', async () => {
      const mockDevice = createMockDevice(DeviceStatus.REGISTERED);
      mockDevice.canTransitionTo.mockReturnValue(true);
      mockDevice.lifecycleHistory = []; // Empty history
      deviceRepo.findById.mockResolvedValue(mockDevice as any);
      deviceRepo.update.mockResolvedValue({ ...mockDevice, status: DeviceStatus.ACTIVE } as any);

      const result = await service.transition('device-123', DeviceStatus.ACTIVE);

      expect(result.event).toBe(DeviceLifecycleEvent.ACTIVATED);
    });

    it('should log without reason when reason is not provided', async () => {
      const mockDevice = createMockDevice(DeviceStatus.REGISTERED);
      mockDevice.canTransitionTo.mockReturnValue(true);
      mockDevice.lifecycleHistory = [
        {
          event: DeviceLifecycleEvent.ACTIVATED,
          fromStatus: DeviceStatus.REGISTERED,
          toStatus: DeviceStatus.ACTIVE,
          timestamp: new Date(),
        },
      ];
      deviceRepo.findById.mockResolvedValue(mockDevice as any);
      deviceRepo.update.mockResolvedValue({ ...mockDevice, status: DeviceStatus.ACTIVE } as any);

      const result = await service.transition('device-123', DeviceStatus.ACTIVE);

      expect(result).toBeDefined();
    });

    it('should show "none" when no allowed transitions exist', async () => {
      const mockDevice = createMockDevice(DeviceStatus.DECOMMISSIONED);
      mockDevice.canTransitionTo.mockReturnValue(false);
      mockDevice.getAllowedTransitions.mockReturnValue([]);
      deviceRepo.findById.mockResolvedValue(mockDevice as any);

      await expect(service.transition('device-123', DeviceStatus.ACTIVE)).rejects.toThrow(
        /Allowed transitions: none/,
      );
    });

    it('should show allowed transitions in error message', async () => {
      const mockDevice = createMockDevice(DeviceStatus.ACTIVE);
      mockDevice.canTransitionTo.mockReturnValue(false);
      mockDevice.getAllowedTransitions.mockReturnValue([
        DeviceStatus.SUSPENDED,
        DeviceStatus.ERROR,
      ]);
      deviceRepo.findById.mockResolvedValue(mockDevice as any);

      await expect(service.transition('device-123', DeviceStatus.DECOMMISSIONED)).rejects.toThrow(
        /SUSPENDED, ERROR/,
      );
    });
  });

  describe('suspend - branch coverage', () => {
    it('should use default reason when reason is not provided', async () => {
      const mockDevice = createMockDevice(DeviceStatus.ACTIVE);
      mockDevice.canTransitionTo.mockReturnValue(true);
      mockDevice.lifecycleHistory = [
        {
          event: DeviceLifecycleEvent.SUSPENDED,
          fromStatus: DeviceStatus.ACTIVE,
          toStatus: DeviceStatus.SUSPENDED,
          timestamp: new Date(),
        },
      ];
      deviceRepo.findById.mockResolvedValue(mockDevice as any);
      deviceRepo.update.mockResolvedValue({ ...mockDevice, status: DeviceStatus.SUSPENDED } as any);

      const result = await service.suspend('device-123');

      expect(result.newStatus).toBe(DeviceStatus.SUSPENDED);
    });
  });

  describe('batchTransition - branch coverage', () => {
    it('should handle non-Error exceptions', async () => {
      deviceRepo.findById.mockRejectedValue('String error');

      const result = await service.batchTransition(['device-1'], DeviceStatus.SUSPENDED, 'Test');

      expect(result.failed.length).toBe(1);
      expect(result.failed[0].error).toBe('Unknown error');
    });
  });
});
