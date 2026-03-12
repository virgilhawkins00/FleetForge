/**
 * CacheService Unit Tests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { CacheService } from './cache.service';
import { Cache } from 'cache-manager';

describe('CacheService', () => {
  let service: CacheService;
  let mockCacheManager: jest.Mocked<Cache>;

  beforeEach(async () => {
    mockCacheManager = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      stores: [
        {
          clear: jest.fn(),
        },
      ],
    } as unknown as jest.Mocked<Cache>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CacheService,
        {
          provide: CACHE_MANAGER,
          useValue: mockCacheManager,
        },
      ],
    }).compile();

    service = module.get<CacheService>(CacheService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('get', () => {
    it('should return cached value when exists', async () => {
      const testValue = { id: '123', name: 'test' };
      mockCacheManager.get.mockResolvedValue(testValue);

      const result = await service.get<typeof testValue>('test-key');

      expect(result).toEqual(testValue);
      expect(mockCacheManager.get).toHaveBeenCalledWith('test-key');
    });

    it('should return undefined when cache miss', async () => {
      mockCacheManager.get.mockResolvedValue(undefined);

      const result = await service.get('missing-key');

      expect(result).toBeUndefined();
    });

    it('should return undefined on error', async () => {
      mockCacheManager.get.mockRejectedValue(new Error('Cache error'));

      const result = await service.get('error-key');

      expect(result).toBeUndefined();
    });
  });

  describe('set', () => {
    it('should set value with default TTL', async () => {
      await service.set('key', 'value');

      expect(mockCacheManager.set).toHaveBeenCalledWith('key', 'value', 60000);
    });

    it('should set value with custom TTL', async () => {
      await service.set('key', 'value', { ttl: 120 });

      expect(mockCacheManager.set).toHaveBeenCalledWith('key', 'value', 120000);
    });

    it('should handle set errors gracefully', async () => {
      mockCacheManager.set.mockRejectedValue(new Error('Set failed'));

      // Should not throw
      await expect(service.set('key', 'value')).resolves.not.toThrow();
    });
  });

  describe('del', () => {
    it('should delete cached value', async () => {
      await service.del('key-to-delete');

      expect(mockCacheManager.del).toHaveBeenCalledWith('key-to-delete');
    });

    it('should handle delete errors gracefully', async () => {
      mockCacheManager.del.mockRejectedValue(new Error('Delete failed'));

      await expect(service.del('key')).resolves.not.toThrow();
    });
  });

  describe('getOrSet', () => {
    it('should return cached value when exists', async () => {
      const cachedValue = { cached: true };
      mockCacheManager.get.mockResolvedValue(cachedValue);
      const callback = jest.fn().mockResolvedValue({ fresh: true });

      const result = await service.getOrSet('key', callback);

      expect(result).toEqual(cachedValue);
      expect(callback).not.toHaveBeenCalled();
    });

    it('should execute callback and cache result on miss', async () => {
      const freshValue = { fresh: true };
      mockCacheManager.get.mockResolvedValue(undefined);
      const callback = jest.fn().mockResolvedValue(freshValue);

      const result = await service.getOrSet('key', callback, { ttl: 30 });

      expect(result).toEqual(freshValue);
      expect(callback).toHaveBeenCalled();
      expect(mockCacheManager.set).toHaveBeenCalledWith('key', freshValue, 30000);
    });
  });

  describe('buildKey', () => {
    it('should build key from entity and id', () => {
      const key = service.buildKey('device', '123');

      expect(key).toBe('device:123');
    });

    it('should build key with additional parts', () => {
      const key = service.buildKey('device', '123', 'shadow', 'desired');

      expect(key).toBe('device:123:shadow:desired');
    });
  });

  describe('reset', () => {
    it('should reset all cache when stores have clear method', async () => {
      await service.reset();

      expect((mockCacheManager as any).stores[0].clear).toHaveBeenCalled();
    });

    it('should handle stores without clear support', async () => {
      (mockCacheManager as any).stores = undefined;

      // Should not throw
      await expect(service.reset()).resolves.not.toThrow();
    });
  });
});
