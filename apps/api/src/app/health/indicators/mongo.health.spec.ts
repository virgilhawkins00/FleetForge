/**
 * MongoHealthIndicator Unit Tests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { getConnectionToken } from '@nestjs/mongoose';
import { HealthCheckError } from '@nestjs/terminus';
import { MongoHealthIndicator } from './mongo.health';

describe('MongoHealthIndicator', () => {
  let indicator: MongoHealthIndicator;
  let mockConnection: any;

  beforeEach(async () => {
    mockConnection = {
      readyState: 1, // Connected
      host: 'localhost',
      port: 27017,
      name: 'fleetforge',
      db: {
        admin: jest.fn().mockReturnValue({
          ping: jest.fn().mockResolvedValue({ ok: 1 }),
        }),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MongoHealthIndicator,
        {
          provide: getConnectionToken(),
          useValue: mockConnection,
        },
      ],
    }).compile();

    indicator = module.get<MongoHealthIndicator>(MongoHealthIndicator);
  });

  it('should be defined', () => {
    expect(indicator).toBeDefined();
  });

  describe('isHealthy', () => {
    it('should return healthy status when MongoDB is connected', async () => {
      const result = await indicator.isHealthy('mongodb');

      expect(result).toEqual({
        mongodb: {
          status: 'up',
          message: 'MongoDB is connected and responsive',
          readyState: 'connected',
          host: 'localhost',
          port: 27017,
          name: 'fleetforge',
        },
      });
    });

    it('should throw HealthCheckError when MongoDB is disconnected', async () => {
      mockConnection.readyState = 0; // Disconnected

      await expect(indicator.isHealthy('mongodb')).rejects.toThrow(HealthCheckError);
    });

    it('should throw HealthCheckError when MongoDB is connecting', async () => {
      mockConnection.readyState = 2; // Connecting

      await expect(indicator.isHealthy('mongodb')).rejects.toThrow(HealthCheckError);
    });

    it('should throw HealthCheckError when ping fails', async () => {
      mockConnection.db.admin = jest.fn().mockReturnValue({
        ping: jest.fn().mockRejectedValue(new Error('Ping failed')),
      });

      await expect(indicator.isHealthy('mongodb')).rejects.toThrow(HealthCheckError);
    });

    it('should handle null db gracefully', async () => {
      mockConnection.db = null;

      // Should not throw, just skip ping
      const result = await indicator.isHealthy('mongodb');
      const mongoResult = result['mongodb'] as { status: string };

      expect(mongoResult.status).toBe('up');
    });
  });
});
