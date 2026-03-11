/**
 * ShadowsController Unit Tests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ShadowsController } from './shadows.controller';
import { ShadowsService } from './shadows.service';

describe('ShadowsController', () => {
  let controller: ShadowsController;
  let service: jest.Mocked<ShadowsService>;

  const mockShadow = {
    deviceId: 'device-1',
    reported: { temperature: 25, firmware: '1.0.0' },
    desired: { temperature: 22, firmware: '2.0.0' },
    metadata: {},
    version: 5,
    lastSyncedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const mockService = {
      getShadow: jest.fn(),
      updateReported: jest.fn(),
      updateDesired: jest.fn(),
      getDelta: jest.fn(),
      markSynced: jest.fn(),
      deleteShadow: jest.fn(),
      getShadowsWithPendingDeltas: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ShadowsController],
      providers: [{ provide: ShadowsService, useValue: mockService }],
    }).compile();

    controller = module.get<ShadowsController>(ShadowsController);
    service = module.get(ShadowsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getShadow', () => {
    it('should return device shadow', async () => {
      service.getShadow.mockResolvedValue(mockShadow as any);

      const result = await controller.getShadow('device-1');

      expect(result.deviceId).toBe('device-1');
      expect(service.getShadow).toHaveBeenCalledWith('device-1');
    });
  });

  describe('updateReported', () => {
    it('should update reported state', async () => {
      const updated = {
        ...mockShadow,
        state: { reported: { temperature: 30 }, desired: {}, delta: {} },
      };
      service.updateReported.mockResolvedValue(updated as any);

      const result = await controller.updateReported('device-1', { state: { temperature: 30 } });

      expect(result.state.reported['temperature']).toBe(30);
      expect(service.updateReported).toHaveBeenCalledWith('device-1', {
        state: { temperature: 30 },
      });
    });
  });

  describe('updateDesired', () => {
    it('should update desired state', async () => {
      const updated = {
        ...mockShadow,
        state: { reported: {}, desired: { temperature: 20 }, delta: {} },
      };
      service.updateDesired.mockResolvedValue(updated as any);

      const result = await controller.updateDesired('device-1', { state: { temperature: 20 } });

      expect(result.state.desired['temperature']).toBe(20);
      expect(service.updateDesired).toHaveBeenCalledWith('device-1', {
        state: { temperature: 20 },
      });
    });
  });

  describe('getDelta', () => {
    it('should return delta between states', async () => {
      service.getDelta.mockResolvedValue({ temperature: 22, firmware: '2.0.0' });

      const result = await controller.getDelta('device-1');

      expect(result).toEqual({ temperature: 22, firmware: '2.0.0' });
    });
  });

  describe('markSynced', () => {
    it('should mark shadow as synced', async () => {
      service.markSynced.mockResolvedValue(mockShadow as any);

      const result = await controller.markSynced('device-1');

      expect(result.deviceId).toBe('device-1');
      expect(service.markSynced).toHaveBeenCalledWith('device-1');
    });
  });

  describe('deleteShadow', () => {
    it('should delete shadow', async () => {
      service.deleteShadow.mockResolvedValue(undefined);

      await controller.deleteShadow('device-1');

      expect(service.deleteShadow).toHaveBeenCalledWith('device-1');
    });
  });

  describe('getShadowsWithPendingDeltas', () => {
    it('should return shadows with pending deltas', async () => {
      service.getShadowsWithPendingDeltas.mockResolvedValue([mockShadow as any]);

      const result = await controller.getShadowsWithPendingDeltas(10);

      expect(result).toHaveLength(1);
      expect(service.getShadowsWithPendingDeltas).toHaveBeenCalledWith(10);
    });
  });
});
