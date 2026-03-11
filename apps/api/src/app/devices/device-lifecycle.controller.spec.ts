/**
 * DeviceLifecycleController Unit Tests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { DeviceLifecycleController } from './device-lifecycle.controller';
import { DeviceLifecycleService, TransitionResult } from './device-lifecycle.service';
import { DeviceStatus, Device, DeviceLifecycleEvent, DeviceType } from '@fleetforge/core';

describe('DeviceLifecycleController', () => {
  let controller: DeviceLifecycleController;
  let service: jest.Mocked<DeviceLifecycleService>;

  const mockDevice = new Device(
    'device-1',
    'fleet-1',
    'Test Device',
    DeviceType.TRACKER,
    DeviceStatus.ACTIVE,
    {
      manufacturer: 'TestCorp',
      model: 'T100',
      hardwareVersion: '1.0',
      serialNumber: 'SN001',
    },
    {
      hasGPS: true,
      hasCamera: false,
      hasCellular: true,
      hasWiFi: false,
      hasBluetooth: true,
      sensors: [],
    },
    '1.0.0', // firmwareVersion
    new Date(), // lastSeen
  );

  const mockTransitionResult: TransitionResult = {
    device: mockDevice,
    event: DeviceLifecycleEvent.ACTIVATED,
    previousStatus: DeviceStatus.REGISTERED,
    newStatus: DeviceStatus.ACTIVE,
    timestamp: new Date(),
  };

  const mockRequest = { user: { sub: 'user-1', email: 'test@example.com' } };

  beforeEach(async () => {
    const mockService = {
      transition: jest.fn(),
      activate: jest.fn(),
      suspend: jest.fn(),
      reactivate: jest.fn(),
      startMaintenance: jest.fn(),
      endMaintenance: jest.fn(),
      decommission: jest.fn(),
      getAllowedTransitions: jest.fn(),
      getLifecycleHistory: jest.fn(),
      batchTransition: jest.fn(),
      getFleetLifecycleStats: jest.fn(),
      deviceRepository: { findById: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DeviceLifecycleController],
      providers: [{ provide: DeviceLifecycleService, useValue: mockService }],
    }).compile();

    controller = module.get<DeviceLifecycleController>(DeviceLifecycleController);
    service = module.get(DeviceLifecycleService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('transition', () => {
    it('should transition device status', async () => {
      service.transition.mockResolvedValue(mockTransitionResult);

      const result = await controller.transition(
        'device-1',
        { status: DeviceStatus.ACTIVE, reason: 'Test' },
        mockRequest,
      );

      expect(result.deviceId).toBe('device-1');
      expect(result.newStatus).toBe(DeviceStatus.ACTIVE);
      expect(service.transition).toHaveBeenCalledWith(
        'device-1',
        DeviceStatus.ACTIVE,
        'Test',
        'test@example.com',
      );
    });
  });

  describe('activate', () => {
    it('should activate device', async () => {
      service.activate.mockResolvedValue(mockTransitionResult);

      const result = await controller.activate('device-1', mockRequest);

      expect(result.deviceId).toBe('device-1');
      expect(service.activate).toHaveBeenCalledWith('device-1', 'test@example.com');
    });
  });

  describe('suspend', () => {
    it('should suspend device', async () => {
      service.suspend.mockResolvedValue({
        ...mockTransitionResult,
        newStatus: DeviceStatus.SUSPENDED,
      });

      const result = await controller.suspend('device-1', { reason: 'Maintenance' }, mockRequest);

      expect(result.deviceId).toBe('device-1');
      expect(service.suspend).toHaveBeenCalledWith('device-1', 'Maintenance', 'test@example.com');
    });
  });

  describe('reactivate', () => {
    it('should reactivate suspended device', async () => {
      service.reactivate.mockResolvedValue(mockTransitionResult);

      const result = await controller.reactivate('device-1', mockRequest);

      expect(result.deviceId).toBe('device-1');
      expect(service.reactivate).toHaveBeenCalledWith('device-1', 'test@example.com');
    });
  });

  describe('startMaintenance', () => {
    it('should start maintenance mode', async () => {
      service.startMaintenance.mockResolvedValue({
        ...mockTransitionResult,
        newStatus: DeviceStatus.MAINTENANCE,
      });

      const result = await controller.startMaintenance(
        'device-1',
        { reason: 'Scheduled' },
        mockRequest,
      );

      expect(result.deviceId).toBe('device-1');
      expect(service.startMaintenance).toHaveBeenCalledWith(
        'device-1',
        'Scheduled',
        'test@example.com',
      );
    });
  });

  describe('endMaintenance', () => {
    it('should end maintenance mode', async () => {
      service.endMaintenance.mockResolvedValue(mockTransitionResult);

      const result = await controller.endMaintenance('device-1', mockRequest);

      expect(result.deviceId).toBe('device-1');
      expect(service.endMaintenance).toHaveBeenCalledWith('device-1', 'test@example.com');
    });
  });

  describe('decommission', () => {
    it('should decommission device', async () => {
      service.decommission.mockResolvedValue({
        ...mockTransitionResult,
        newStatus: DeviceStatus.DECOMMISSIONED,
      });

      const result = await controller.decommission('device-1', { reason: 'EOL' }, mockRequest);

      expect(result.deviceId).toBe('device-1');
      expect(service.decommission).toHaveBeenCalledWith('device-1', 'EOL', 'test@example.com');
    });
  });

  describe('getAllowedTransitions', () => {
    it('should return allowed transitions', async () => {
      (service as any).deviceRepository.findById.mockResolvedValue(mockDevice);
      service.getAllowedTransitions.mockResolvedValue([
        DeviceStatus.SUSPENDED,
        DeviceStatus.MAINTENANCE,
      ]);

      const result = await controller.getAllowedTransitions('device-1');

      expect(result.deviceId).toBe('device-1');
      expect(result.currentStatus).toBe(DeviceStatus.ACTIVE);
      expect(result.allowedTransitions).toContain(DeviceStatus.SUSPENDED);
    });
  });

  describe('getHistory', () => {
    it('should return lifecycle history', async () => {
      const mockHistory = [
        {
          event: DeviceLifecycleEvent.ACTIVATED,
          fromStatus: DeviceStatus.REGISTERED,
          toStatus: DeviceStatus.ACTIVE,
          timestamp: new Date(),
          performedBy: 'test@example.com',
        },
      ];
      service.getLifecycleHistory.mockResolvedValue(mockHistory);

      const result = await controller.getHistory('device-1');

      expect(result).toHaveLength(1);
      expect(result[0].toStatus).toBe(DeviceStatus.ACTIVE);
    });
  });

  describe('batchTransition', () => {
    it('should batch transition multiple devices', async () => {
      service.batchTransition.mockResolvedValue({
        success: [mockTransitionResult],
        failed: [],
      });

      const result = await controller.batchTransition(
        {
          deviceIds: ['device-1', 'device-2'],
          status: DeviceStatus.SUSPENDED,
          reason: 'Batch maintenance',
        },
        mockRequest,
      );

      expect(result.success).toHaveLength(1);
      expect(result.failed).toHaveLength(0);
    });

    it('should handle partial failures', async () => {
      service.batchTransition.mockResolvedValue({
        success: [mockTransitionResult],
        failed: [{ deviceId: 'device-2', error: 'Invalid transition' }],
      });

      const result = await controller.batchTransition(
        {
          deviceIds: ['device-1', 'device-2'],
          status: DeviceStatus.SUSPENDED,
          reason: 'Test',
        },
        mockRequest,
      );

      expect(result.success).toHaveLength(1);
      expect(result.failed).toHaveLength(1);
      expect(result.failed[0].deviceId).toBe('device-2');
    });
  });

  describe('getFleetStats', () => {
    it('should return fleet lifecycle stats', async () => {
      const mockStats = {
        totalDevices: 10,
        byStatus: {
          [DeviceStatus.ACTIVE]: 5,
          [DeviceStatus.SUSPENDED]: 2,
          [DeviceStatus.MAINTENANCE]: 3,
        } as Record<DeviceStatus, number>,
        recentTransitions: [
          {
            event: DeviceLifecycleEvent.ACTIVATED,
            fromStatus: DeviceStatus.REGISTERED,
            toStatus: DeviceStatus.ACTIVE,
            timestamp: new Date(),
          },
        ],
      };
      service.getFleetLifecycleStats.mockResolvedValue(mockStats);

      const result = await controller.getFleetStats('fleet-1');

      expect(result.totalDevices).toBe(10);
      expect(result.byStatus[DeviceStatus.ACTIVE]).toBe(5);
    });
  });
});
