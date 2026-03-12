/**
 * Cache Service
 * Provides convenient caching utilities for the application
 */

import { Injectable, Inject, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  prefix?: string;
}

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);
  private readonly defaultTTL = 60; // 60 seconds

  constructor(
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
  ) {}

  /**
   * Get a value from cache
   */
  async get<T>(key: string): Promise<T | undefined> {
    try {
      const value = await this.cacheManager.get<T>(key);
      if (value) {
        this.logger.debug(`Cache HIT: ${key}`);
      } else {
        this.logger.debug(`Cache MISS: ${key}`);
      }
      return value;
    } catch (error) {
      this.logger.error(`Cache GET error for key ${key}:`, error);
      return undefined;
    }
  }

  /**
   * Set a value in cache
   */
  async set<T>(key: string, value: T, options?: CacheOptions): Promise<void> {
    try {
      const ttl = (options?.ttl ?? this.defaultTTL) * 1000; // Convert to milliseconds
      await this.cacheManager.set(key, value, ttl);
      this.logger.debug(`Cache SET: ${key} (TTL: ${ttl}ms)`);
    } catch (error) {
      this.logger.error(`Cache SET error for key ${key}:`, error);
    }
  }

  /**
   * Delete a value from cache
   */
  async del(key: string): Promise<void> {
    try {
      await this.cacheManager.del(key);
      this.logger.debug(`Cache DEL: ${key}`);
    } catch (error) {
      this.logger.error(`Cache DEL error for key ${key}:`, error);
    }
  }

  /**
   * Get or set pattern - fetch from cache or execute callback and cache result
   */
  async getOrSet<T>(key: string, callback: () => Promise<T>, options?: CacheOptions): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== undefined && cached !== null) {
      return cached;
    }

    const value = await callback();
    await this.set(key, value, options);
    return value;
  }

  /**
   * Invalidate cache by pattern (prefix)
   * Note: This requires Redis SCAN command, falls back to single key deletion
   */
  async invalidateByPattern(pattern: string): Promise<void> {
    try {
      // For simple in-memory cache, we can only delete exact keys
      // For Redis, you would use SCAN with pattern matching
      await this.cacheManager.del(pattern);
      this.logger.debug(`Cache INVALIDATE pattern: ${pattern}`);
    } catch (error) {
      this.logger.error(`Cache INVALIDATE error for pattern ${pattern}:`, error);
    }
  }

  /**
   * Generate a cache key from entity type and ID
   */
  buildKey(entity: string, id: string, ...parts: string[]): string {
    const key = [entity, id, ...parts].filter(Boolean).join(':');
    return key;
  }

  /**
   * Clear all cache (use with caution)
   * Note: This method may not be available in all cache store implementations
   */
  async reset(): Promise<void> {
    try {
      // cache-manager v5 uses 'stores' array, try to call clear/reset on each
      const stores = (this.cacheManager as any).stores;
      if (stores && Array.isArray(stores)) {
        for (const store of stores) {
          if (typeof store.clear === 'function') {
            await store.clear();
          }
        }
        this.logger.warn('Cache RESET: All cache cleared');
      } else {
        this.logger.warn('Cache RESET: Not supported by this cache store');
      }
    } catch (error) {
      this.logger.error('Cache RESET error:', error);
    }
  }
}
