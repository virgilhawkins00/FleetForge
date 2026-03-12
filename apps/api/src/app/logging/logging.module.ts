/**
 * Logging Module
 * Structured logging with Winston for production environments
 */

import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { WinstonModule, utilities as nestWinstonModuleUtilities } from 'nest-winston';
import * as winston from 'winston';

const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  verbose: 4,
  debug: 5,
  silly: 6,
};

@Global()
@Module({
  imports: [
    WinstonModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const isProduction = configService.get('NODE_ENV') === 'production';
        const logLevel = configService.get('LOG_LEVEL', 'info');

        // Production format: JSON for log aggregation (CloudWatch, Stackdriver, etc.)
        const productionFormat = winston.format.combine(
          winston.format.timestamp({ format: 'YYYY-MM-DDTHH:mm:ss.SSSZ' }),
          winston.format.errors({ stack: true }),
          winston.format.json(),
        );

        // Development format: Human-readable with colors
        const developmentFormat = winston.format.combine(
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
          winston.format.errors({ stack: true }),
          nestWinstonModuleUtilities.format.nestLike('FleetForge', {
            prettyPrint: true,
            colors: true,
          }),
        );

        return {
          levels: LOG_LEVELS,
          level: logLevel,
          format: isProduction ? productionFormat : developmentFormat,
          defaultMeta: {
            service: 'fleetforge-api',
            version: configService.get('APP_VERSION', '0.1.0'),
            environment: configService.get('NODE_ENV', 'development'),
          },
          transports: [
            // Console transport (always enabled)
            new winston.transports.Console({
              handleExceptions: true,
              handleRejections: true,
            }),
            // File transport for errors (production only)
            ...(isProduction
              ? [
                  new winston.transports.File({
                    filename: 'logs/error.log',
                    level: 'error',
                    maxsize: 10 * 1024 * 1024, // 10MB
                    maxFiles: 5,
                    tailable: true,
                  }),
                  new winston.transports.File({
                    filename: 'logs/combined.log',
                    maxsize: 10 * 1024 * 1024, // 10MB
                    maxFiles: 10,
                    tailable: true,
                  }),
                ]
              : []),
          ],
          exitOnError: false,
        };
      },
    }),
  ],
  exports: [WinstonModule],
})
export class LoggingModule {}

