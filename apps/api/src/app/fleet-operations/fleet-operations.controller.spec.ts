/**
 * FleetOperationsController Unit Tests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { FleetOperationsController } from './fleet-operations.controller';
import { FleetOperationsService } from './fleet-operations.service';
import { DeviceStatus } from '@fleetforge/core';

describe('FleetOperationsController', () => {
  let controller: FleetOperationsController;
  let service: jest.Mocked<FleetOperationsService>;

  const mockFleetSummary = {
    fleetId: 'fleet-1',
    fleetName: 'Test Fleet',
    totalDevices: 10,
    byStatus: {
      [DeviceStatus.ACTIVE]: 8,
      [DeviceStatus.SUSPENDED]: 2,
      [DeviceStatus.PROVISIONING]: 0,
      [DeviceStatus.REGISTERED]: 0,
      [DeviceStatus.OFFLINE]: 0,
      [DeviceStatus.UPDATING]: 0,
      [DeviceStatus.MAINTENANCE]: 0,
      [DeviceStatus.ERROR]: 0,
      [DeviceStatus.DECOMMISSIONED]: 0,
    },
    onlineCount: 7,
    offlineCount: 3,
    healthyCount: 9,
    unhealthyCount: 1,
  };

  const mockBatchUpdateResult = {
    updated: 5,
    created: 0,
    deviceIds: ['device-1', 'device-2'],
  };

  const mockTransitionResult = {
    success: [
      {
        device: { id: 'device-1' } as any,
        event: { id: 'event-1' } as any,
        previousStatus: DeviceStatus.ACTIVE,
        newStatus: DeviceStatus.SUSPENDED,
        timestamp: new Date(),
      },
    ],
    failed: [],
    totalProcessed: 1,
    successCount: 1,
    failedCount: 0,
  };

  const mockCommandResult = {
    deviceIds: ['device-1'],
    commandId: 'cmd-123',
  };

  const mockTagsResult = {
    success: [{ deviceId: 'device-1', tags: ['tag1', 'tag2'] }],
    failed: [],
    totalProcessed: 1,
    successCount: 1,
    failedCount: 0,
  };

  beforeEach(async () => {
    const mockService = {
      getFleetSummary: jest.fn(),
      batchUpdateDesiredState: jest.fn(),
      batchTransition: jest.fn(),
      sendCommand: jest.fn(),
      batchAddTags: jest.fn(),
      batchRemoveTags: jest.fn(),
      getFleetPendingDeltas: jest.fn(),
      bulkMarkSynced: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [FleetOperationsController],
      providers: [{ provide: FleetOperationsService, useValue: mockService }],
    }).compile();

    controller = module.get<FleetOperationsController>(FleetOperationsController);
    service = module.get(FleetOperationsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getFleetSummary', () => {
    it('should return fleet summary', async () => {
      service.getFleetSummary.mockResolvedValue(mockFleetSummary);

      const result = await controller.getFleetSummary('fleet-1');

      expect(result.totalDevices).toBe(10);
      expect(service.getFleetSummary).toHaveBeenCalledWith('fleet-1');
    });
  });

  describe('batchUpdateDesiredState', () => {
    it('should batch update desired state', async () => {
      service.batchUpdateDesiredState.mockResolvedValue(mockBatchUpdateResult);

      const result = await controller.batchUpdateDesiredState('fleet-1', {
        state: { temperature: 25 },
      });

      expect(result.updated).toBe(5);
      expect(service.batchUpdateDesiredState).toHaveBeenCalledWith(
        'fleet-1',
        { temperature: 25 },
        undefined,
      );
    });

    it('should handle filter criteria', async () => {
      service.batchUpdateDesiredState.mockResolvedValue(mockBatchUpdateResult);

      await controller.batchUpdateDesiredState('fleet-1', {
        state: { mode: 'active' },
        filter: { status: DeviceStatus.ACTIVE },
      });

      expect(service.batchUpdateDesiredState).toHaveBeenCalledWith(
        'fleet-1',
        { mode: 'active' },
        { status: DeviceStatus.ACTIVE },
      );
    });
  });

  describe('batchTransition', () => {
    it('should batch transition devices', async () => {
      service.batchTransition.mockResolvedValue(mockTransitionResult);

      const result = await controller.batchTransition(
        'fleet-1',
        { status: DeviceStatus.SUSPENDED, reason: 'Maintenance' },
        { user: { sub: 'user-1' } },
      );

      expect(result.successCount).toBe(1);
      expect(service.batchTransition).toHaveBeenCalledWith(
        'fleet-1',
        DeviceStatus.SUSPENDED,
        'Maintenance',
        'user-1',
        undefined,
      );
    });
  });

  describe('sendCommand', () => {
    it('should send command to fleet devices', async () => {
      service.sendCommand.mockResolvedValue(mockCommandResult);

      const result = await controller.sendCommand('fleet-1', {
        command: 'reboot',
        parameters: { delay: 5 },
        timeout: 30000,
      });

      expect(result.commandId).toBe('cmd-123');
      expect(service.sendCommand).toHaveBeenCalledWith(
        'fleet-1',
        { command: 'reboot', parameters: { delay: 5 }, timeout: 30000 },
        undefined,
      );
    });
  });

  describe('batchAddTags', () => {
    it('should batch add tags', async () => {
      service.batchAddTags.mockResolvedValue(mockTagsResult);

      const result = await controller.batchAddTags('fleet-1', { tags: ['critical', 'priority'] });

      expect(result.successCount).toBe(1);
      expect(service.batchAddTags).toHaveBeenCalledWith(
        'fleet-1',
        ['critical', 'priority'],
        undefined,
      );
    });
  });

  describe('batchRemoveTags', () => {
    it('should batch remove tags', async () => {
      service.batchRemoveTags.mockResolvedValue(mockTagsResult);

      const result = await controller.batchRemoveTags('fleet-1', { tags: ['deprecated'] });

      expect(result.successCount).toBe(1);
      expect(service.batchRemoveTags).toHaveBeenCalledWith('fleet-1', ['deprecated'], undefined);
    });
  });
});
