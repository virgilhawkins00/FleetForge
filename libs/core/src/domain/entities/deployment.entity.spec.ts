import { Deployment } from './deployment.entity';
import { DeploymentStatus, DeploymentStrategy } from '../enums';

describe('Deployment Entity', () => {
  let deployment: Deployment;

  beforeEach(() => {
    deployment = new Deployment(
      'deploy-123',
      'fw-456',
      '2.0.0',
      'Production Rollout',
      DeploymentStatus.PENDING,
      {
        strategy: DeploymentStrategy.CANARY,
        target: {
          fleetIds: ['fleet-1'],
        },
        canaryPercentage: 5,
        autoRollback: true,
        rollbackThreshold: 10,
      },
      {
        total: 100,
        pending: 100,
        inProgress: 0,
        succeeded: 0,
        failed: 0,
        rolledBack: 0,
      },
      'user-123',
    );
  });

  describe('start', () => {
    it('should start pending deployment', () => {
      deployment.start();
      expect(deployment.status).toBe(DeploymentStatus.IN_PROGRESS);
      expect(deployment.startedAt).toBeDefined();
    });

    it('should throw error when not pending', () => {
      deployment.status = DeploymentStatus.COMPLETED;
      expect(() => deployment.start()).toThrow('Cannot start deployment');
    });
  });

  describe('updateProgress', () => {
    it('should update progress', () => {
      deployment.updateProgress({ succeeded: 50, pending: 50 });
      expect(deployment.progress.succeeded).toBe(50);
      expect(deployment.progress.pending).toBe(50);
    });

    it('should auto-complete when all processed', () => {
      deployment.status = DeploymentStatus.IN_PROGRESS;
      deployment.updateProgress({ pending: 0, inProgress: 0, succeeded: 100 });
      expect(deployment.status).toBe(DeploymentStatus.COMPLETED);
    });
  });

  describe('complete', () => {
    it('should complete successful deployment', () => {
      deployment.status = DeploymentStatus.IN_PROGRESS;
      deployment.progress.succeeded = 100;
      deployment.progress.total = 100;
      deployment.complete();
      expect(deployment.status).toBe(DeploymentStatus.COMPLETED);
    });

    it('should mark as partial when has failures', () => {
      deployment.status = DeploymentStatus.IN_PROGRESS;
      deployment.progress.succeeded = 90;
      deployment.progress.failed = 10;
      deployment.complete();
      expect(deployment.status).toBe(DeploymentStatus.PARTIAL);
    });
  });

  describe('cancel', () => {
    it('should cancel pending deployment', () => {
      deployment.cancel();
      expect(deployment.status).toBe(DeploymentStatus.CANCELLED);
    });

    it('should cancel in-progress deployment', () => {
      deployment.status = DeploymentStatus.IN_PROGRESS;
      deployment.cancel();
      expect(deployment.status).toBe(DeploymentStatus.CANCELLED);
    });
  });

  describe('rollback', () => {
    it('should rollback deployment', () => {
      deployment.status = DeploymentStatus.IN_PROGRESS;
      deployment.rollback('Too many failures');
      expect(deployment.status).toBe(DeploymentStatus.ROLLED_BACK);
      expect(deployment.errors).toContain('Rollback: Too many failures');
    });
  });

  describe('shouldAutoRollback', () => {
    it('should return true when failure rate exceeds threshold', () => {
      deployment.config.autoRollback = true;
      deployment.config.rollbackThreshold = 10;
      deployment.progress.total = 100;
      deployment.progress.failed = 15;

      expect(deployment.shouldAutoRollback()).toBe(true);
    });

    it('should return false when below threshold', () => {
      deployment.config.autoRollback = true;
      deployment.config.rollbackThreshold = 10;
      deployment.progress.total = 100;
      deployment.progress.failed = 5;

      expect(deployment.shouldAutoRollback()).toBe(false);
    });

    it('should return false when auto-rollback disabled', () => {
      deployment.config.autoRollback = false;
      deployment.progress.total = 100;
      deployment.progress.failed = 50;

      expect(deployment.shouldAutoRollback()).toBe(false);
    });
  });

  describe('getSuccessRate', () => {
    it('should calculate success rate', () => {
      deployment.progress.total = 100;
      deployment.progress.succeeded = 85;

      expect(deployment.getSuccessRate()).toBe(85);
    });

    it('should return 0 when no devices', () => {
      deployment.progress.total = 0;
      expect(deployment.getSuccessRate()).toBe(0);
    });
  });

  describe('getDurationMinutes', () => {
    it('should return null when not started', () => {
      expect(deployment.getDurationMinutes()).toBeNull();
    });

    it('should calculate duration', () => {
      deployment.startedAt = new Date(Date.now() - 10 * 60 * 1000); // 10 minutes ago
      const duration = deployment.getDurationMinutes();
      expect(duration).toBeGreaterThanOrEqual(9);
      expect(duration).toBeLessThanOrEqual(11);
    });
  });

  describe('isScheduled', () => {
    it('should return true for future scheduled deployment', () => {
      deployment.config.strategy = DeploymentStrategy.SCHEDULED;
      deployment.config.scheduledAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now
      expect(deployment.isScheduled()).toBe(true);
    });

    it('should return false for past scheduled deployment', () => {
      deployment.config.strategy = DeploymentStrategy.SCHEDULED;
      deployment.config.scheduledAt = new Date(Date.now() - 60 * 60 * 1000); // 1 hour ago
      expect(deployment.isScheduled()).toBe(false);
    });
  });
});

