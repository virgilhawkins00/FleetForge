/**
 * Deployment Mapper Tests
 */

import { Deployment, DeploymentStatus, DeploymentStrategy } from '@fleetforge/core';
import { DeploymentMapper } from './deployment.mapper';

describe('DeploymentMapper', () => {
  const mockDeploymentDoc = {
    _id: 'deployment-123',
    firmwareId: 'firmware-456',
    firmwareVersion: '2.5.0',
    name: 'Production Rollout Q2',
    status: DeploymentStatus.IN_PROGRESS,
    config: {
      strategy: DeploymentStrategy.CANARY,
      target: {
        deviceIds: ['device-1', 'device-2'],
        fleetIds: ['fleet-1'],
        tags: ['production'],
        percentage: 25,
      },
      scheduledAt: new Date('2024-06-01T10:00:00Z'),
      canaryPercentage: 10,
      phaseCount: 4,
      phaseDuration: 3600000,
      autoRollback: true,
      rollbackThreshold: 5,
    },
    progress: {
      total: 100,
      pending: 50,
      inProgress: 25,
      succeeded: 20,
      failed: 3,
      rolledBack: 2,
    },
    createdBy: 'user-789',
    startedAt: new Date('2024-06-01T10:00:00Z'),
    completedAt: undefined,
    errors: ['Device device-3 timeout'],
    createdAt: new Date('2024-06-01T09:00:00Z'),
    updatedAt: new Date('2024-06-01T10:30:00Z'),
  } as any;

  describe('toDomain', () => {
    it('should convert document to domain entity', () => {
      const deployment = DeploymentMapper.toDomain(mockDeploymentDoc);

      expect(deployment).toBeInstanceOf(Deployment);
      expect(deployment.id).toBe('deployment-123');
      expect(deployment.firmwareId).toBe('firmware-456');
      expect(deployment.name).toBe('Production Rollout Q2');
    });

    it('should map config correctly', () => {
      const deployment = DeploymentMapper.toDomain(mockDeploymentDoc);

      expect(deployment.config.strategy).toBe(DeploymentStrategy.CANARY);
      expect(deployment.config.canaryPercentage).toBe(10);
      expect(deployment.config.autoRollback).toBe(true);
    });

    it('should map target correctly', () => {
      const deployment = DeploymentMapper.toDomain(mockDeploymentDoc);

      expect(deployment.config.target.deviceIds).toEqual(['device-1', 'device-2']);
      expect(deployment.config.target.fleetIds).toEqual(['fleet-1']);
      expect(deployment.config.target.percentage).toBe(25);
    });

    it('should map progress correctly', () => {
      const deployment = DeploymentMapper.toDomain(mockDeploymentDoc);

      expect(deployment.progress.total).toBe(100);
      expect(deployment.progress.succeeded).toBe(20);
      expect(deployment.progress.failed).toBe(3);
    });

    it('should map errors correctly', () => {
      const deployment = DeploymentMapper.toDomain(mockDeploymentDoc);

      expect(deployment.errors).toEqual(['Device device-3 timeout']);
    });
  });

  describe('toPersistence', () => {
    it('should convert domain entity to persistence format', () => {
      const deployment = DeploymentMapper.toDomain(mockDeploymentDoc);
      const persistence = DeploymentMapper.toPersistence(deployment);

      expect(persistence._id).toBe('deployment-123');
      expect(persistence.firmwareId).toBe('firmware-456');
      expect(persistence.status).toBe(DeploymentStatus.IN_PROGRESS);
    });

    it('should map config to persistence', () => {
      const deployment = DeploymentMapper.toDomain(mockDeploymentDoc);
      const persistence = DeploymentMapper.toPersistence(deployment);

      expect(persistence.config?.strategy).toBe(DeploymentStrategy.CANARY);
      expect(persistence.config?.target.deviceIds).toEqual(['device-1', 'device-2']);
    });

    it('should map progress to persistence', () => {
      const deployment = DeploymentMapper.toDomain(mockDeploymentDoc);
      const persistence = DeploymentMapper.toPersistence(deployment);

      expect(persistence.progress?.total).toBe(100);
      expect(persistence.progress?.succeeded).toBe(20);
    });

    it('should map errors to persistence', () => {
      const deployment = DeploymentMapper.toDomain(mockDeploymentDoc);
      const persistence = DeploymentMapper.toPersistence(deployment);

      expect(persistence.errors).toEqual(['Device device-3 timeout']);
    });
  });
});

