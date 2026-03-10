/**
 * Telemetry Repository Interface (Port)
 */

import { Telemetry } from '../../entities';

export interface ITelemetryFilter {
  deviceId?: string;
  startDate?: Date;
  endDate?: Date;
}

export interface ITelemetryRepository {
  findById(id: string): Promise<Telemetry | null>;

  findMany(filter: ITelemetryFilter, limit?: number, offset?: number): Promise<Telemetry[]>;

  findLatestByDevice(deviceId: string): Promise<Telemetry | null>;

  create(telemetry: Telemetry): Promise<Telemetry>;

  bulkCreate(telemetry: Telemetry[]): Promise<Telemetry[]>;

  deleteOlderThan(date: Date): Promise<number>;

  count(filter: ITelemetryFilter): Promise<number>;
}

