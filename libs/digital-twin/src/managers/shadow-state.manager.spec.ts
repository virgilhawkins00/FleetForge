/**
 * Shadow State Manager Tests
 */

import { ShadowStateManager } from './shadow-state.manager';

describe('ShadowStateManager', () => {
  let manager: ShadowStateManager;

  beforeEach(() => {
    manager = new ShadowStateManager();
  });

  describe('getShadow', () => {
    it('should return null for non-existent shadow', async () => {
      const shadow = await manager.getShadow('device-1');
      expect(shadow).toBeNull();
    });

    it('should return shadow after creation', async () => {
      await manager.updateReported('device-1', { temperature: 25 });
      const shadow = await manager.getShadow('device-1');

      expect(shadow).toBeDefined();
      expect(shadow?.deviceId).toBe('device-1');
    });
  });

  describe('updateDesired', () => {
    it('should create shadow if not exists', async () => {
      const shadow = await manager.updateDesired('device-1', {
        targetTemperature: 22,
      });

      expect(shadow).toBeDefined();
      expect(shadow.desired.targetTemperature).toBe(22);
      expect(shadow.metadata.desiredVersion).toBe(1);
    });

    it('should merge desired state', async () => {
      await manager.updateDesired('device-1', { temp: 20 });
      const shadow = await manager.updateDesired('device-1', { humidity: 60 });

      expect(shadow.desired.temp).toBe(20);
      expect(shadow.desired.humidity).toBe(60);
    });

    it('should increment version', async () => {
      await manager.updateDesired('device-1', { temp: 20 });
      const shadow = await manager.updateDesired('device-1', { temp: 22 });

      expect(shadow.metadata.desiredVersion).toBe(2);
      expect(shadow.version).toBe(2);
    });

    it('should calculate delta', async () => {
      await manager.updateReported('device-1', { temp: 20 });
      const shadow = await manager.updateDesired('device-1', { temp: 25 });

      expect(shadow.delta.temp).toBe(25);
    });
  });

  describe('updateReported', () => {
    it('should create shadow if not exists', async () => {
      const shadow = await manager.updateReported('device-1', {
        temperature: 25,
      });

      expect(shadow).toBeDefined();
      expect(shadow.reported.temperature).toBe(25);
      expect(shadow.metadata.reportedVersion).toBe(1);
    });

    it('should merge reported state', async () => {
      await manager.updateReported('device-1', { temp: 20 });
      const shadow = await manager.updateReported('device-1', { humidity: 60 });

      expect(shadow.reported.temp).toBe(20);
      expect(shadow.reported.humidity).toBe(60);
    });

    it('should update lastSync timestamp', async () => {
      const before = new Date();
      await manager.updateReported('device-1', { temp: 20 });
      const shadow = await manager.getShadow('device-1');
      const after = new Date();

      expect(shadow?.metadata.lastSync.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(shadow?.metadata.lastSync.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  describe('getDelta', () => {
    it('should return empty object for no delta', async () => {
      await manager.updateReported('device-1', { temp: 20 });
      await manager.updateDesired('device-1', { temp: 20 });

      const delta = await manager.getDelta('device-1');
      expect(delta).toEqual({});
    });

    it('should return delta for differences', async () => {
      await manager.updateReported('device-1', { temp: 20, humidity: 50 });
      await manager.updateDesired('device-1', { temp: 25, humidity: 50 });

      const delta = await manager.getDelta('device-1');
      expect(delta.temp).toBe(25);
      expect(delta.humidity).toBeUndefined();
    });

    it('should return empty for non-existent device', async () => {
      const delta = await manager.getDelta('non-existent');
      expect(delta).toEqual({});
    });
  });

  describe('deleteShadow', () => {
    it('should delete shadow', async () => {
      await manager.updateReported('device-1', { temp: 20 });
      await manager.deleteShadow('device-1');

      const shadow = await manager.getShadow('device-1');
      expect(shadow).toBeNull();
    });
  });

  describe('getAllShadows', () => {
    it('should return all shadows', async () => {
      await manager.updateReported('device-1', { temp: 20 });
      await manager.updateReported('device-2', { temp: 22 });

      const shadows = await manager.getAllShadows();
      expect(shadows.length).toBe(2);
    });

    it('should return empty array when no shadows', async () => {
      const shadows = await manager.getAllShadows();
      expect(shadows).toEqual([]);
    });
  });

  describe('getShadowsByFilter', () => {
    it('should filter shadows', async () => {
      await manager.updateReported('device-1', { temp: 20 });
      await manager.updateReported('device-2', { temp: 30 });
      await manager.updateDesired('device-1', { temp: 25 });

      const filtered = await manager.getShadowsByFilter(
        (s) => Object.keys(s.delta).length > 0,
      );

      expect(filtered.length).toBe(1);
      expect(filtered[0].deviceId).toBe('device-1');
    });
  });

  describe('getStatistics', () => {
    it('should return statistics', async () => {
      await manager.updateReported('device-1', { temp: 20 });
      await manager.updateReported('device-2', { temp: 22 });
      await manager.updateDesired('device-1', { temp: 25 });

      const stats = await manager.getStatistics();

      expect(stats.total).toBe(2);
      expect(stats.withDelta).toBe(1);
      expect(stats.averageVersion).toBeGreaterThan(0);
    });
  });
});

