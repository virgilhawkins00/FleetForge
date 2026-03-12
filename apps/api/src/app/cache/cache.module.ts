/**
 * Cache Module
 * Redis-based caching for performance optimization
 */

import { Module, Global } from '@nestjs/common';
import { CacheModule as NestCacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { redisStore } from 'cache-manager-ioredis-yet';
import { CacheService } from './cache.service';

@Global()
@Module({
  imports: [
    NestCacheModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const redisUrl = configService.get<string>('REDIS_URL');
        const isProduction = configService.get('NODE_ENV') === 'production';

        // In development without Redis, use in-memory cache
        if (!redisUrl && !isProduction) {
          return {
            ttl: 60 * 1000, // 60 seconds default TTL
            max: 100, // Maximum number of items in cache
          };
        }

        // Production or when Redis is available
        return {
          store: redisStore,
          host: configService.get<string>('REDIS_HOST', 'localhost'),
          port: configService.get<number>('REDIS_PORT', 6379),
          password: configService.get<string>('REDIS_PASSWORD'),
          ttl: configService.get<number>('CACHE_TTL', 60) * 1000,
          max: configService.get<number>('CACHE_MAX_ITEMS', 1000),
          // Redis-specific options
          db: configService.get<number>('REDIS_DB', 0),
          keyPrefix: 'fleetforge:',
        };
      },
    }),
  ],
  providers: [CacheService],
  exports: [NestCacheModule, CacheService],
})
export class CacheConfigModule {}
