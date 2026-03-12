/**
 * HealthController Unit Tests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import {
  HealthCheckService,
  MemoryHealthIndicator,
  DiskHealthIndicator,
  HealthCheckResult,
} from '@nestjs/terminus';
import { MongoHealthIndicator } from './indicators/mongo.health';

describe('HealthController', () => {
  let controller: HealthController;
  let healthCheckService: jest.Mocked<HealthCheckService>;

  const mockHealthResult: HealthCheckResult = {
    status: 'ok',
    info: {
      mongodb: { status: 'up' },
      memory_heap: { status: 'up' },
    },
    error: {},
    details: {
      mongodb: { status: 'up' },
      memory_heap: { status: 'up' },
    },
  };

  beforeEach(async () => {
    const mockHealthCheckService = {
      check: jest.fn().mockResolvedValue(mockHealthResult),
    };

    const mockMemoryIndicator = {
      checkHeap: jest.fn().mockResolvedValue({ memory_heap: { status: 'up' } }),
      checkRSS: jest.fn().mockResolvedValue({ memory_rss: { status: 'up' } }),
    };

    const mockDiskIndicator = {
      checkStorage: jest.fn().mockResolvedValue({ disk: { status: 'up' } }),
    };

    const mockMongoIndicator = {
      isHealthy: jest.fn().mockResolvedValue({ mongodb: { status: 'up' } }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        { provide: HealthCheckService, useValue: mockHealthCheckService },
        { provide: MemoryHealthIndicator, useValue: mockMemoryIndicator },
        { provide: DiskHealthIndicator, useValue: mockDiskIndicator },
        { provide: MongoHealthIndicator, useValue: mockMongoIndicator },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
    healthCheckService = module.get(HealthCheckService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('check (liveness)', () => {
    it('should return health check result', async () => {
      const result = await controller.check();

      expect(result).toEqual(mockHealthResult);
      expect(healthCheckService.check).toHaveBeenCalled();
    });
  });

  describe('readiness', () => {
    it('should return readiness check result', async () => {
      const result = await controller.readiness();

      expect(result).toEqual(mockHealthResult);
      expect(healthCheckService.check).toHaveBeenCalled();
    });
  });

  describe('startup', () => {
    it('should return startup check result', async () => {
      const result = await controller.startup();

      expect(result).toEqual(mockHealthResult);
      expect(healthCheckService.check).toHaveBeenCalled();
    });
  });

  describe('detailed', () => {
    it('should return detailed health check result', async () => {
      const result = await controller.detailed();

      expect(result).toEqual(mockHealthResult);
      expect(healthCheckService.check).toHaveBeenCalled();
    });
  });
});
