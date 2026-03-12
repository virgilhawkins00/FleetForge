/**
 * MongoDB Health Indicator
 * Custom health indicator for MongoDB connection status
 */

import { Injectable } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult, HealthCheckError } from '@nestjs/terminus';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

@Injectable()
export class MongoHealthIndicator extends HealthIndicator {
  constructor(@InjectConnection() private readonly connection: Connection) {
    super();
  }

  /**
   * Check if MongoDB is connected and responsive
   */
  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      // Check connection state
      const isConnected = this.connection.readyState === 1;

      if (!isConnected) {
        throw new HealthCheckError(
          'MongoDB is not connected',
          this.getStatus(key, false, {
            message: 'MongoDB connection is not established',
            readyState: this.getReadyStateString(this.connection.readyState),
          }),
        );
      }

      // Ping the database to ensure it's responsive
      const adminDb = this.connection.db;
      if (adminDb) {
        await adminDb.admin().ping();
      }

      return this.getStatus(key, true, {
        message: 'MongoDB is connected and responsive',
        readyState: 'connected',
        host: this.connection.host,
        port: this.connection.port,
        name: this.connection.name,
      });
    } catch (error) {
      if (error instanceof HealthCheckError) {
        throw error;
      }

      throw new HealthCheckError(
        'MongoDB health check failed',
        this.getStatus(key, false, {
          message: error instanceof Error ? error.message : 'Unknown error',
          readyState: this.getReadyStateString(this.connection.readyState),
        }),
      );
    }
  }

  /**
   * Convert MongoDB ready state number to string
   */
  private getReadyStateString(state: number): string {
    switch (state) {
      case 0:
        return 'disconnected';
      case 1:
        return 'connected';
      case 2:
        return 'connecting';
      case 3:
        return 'disconnecting';
      default:
        return 'unknown';
    }
  }
}

