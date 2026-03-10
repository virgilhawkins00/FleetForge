/**
 * Digital Twin Types and Interfaces
 */

export enum SyncDirection {
  DEVICE_TO_CLOUD = 'DEVICE_TO_CLOUD',
  CLOUD_TO_DEVICE = 'CLOUD_TO_DEVICE',
  BIDIRECTIONAL = 'BIDIRECTIONAL',
}

export enum ConflictResolutionStrategy {
  DEVICE_WINS = 'DEVICE_WINS',
  CLOUD_WINS = 'CLOUD_WINS',
  LAST_WRITE_WINS = 'LAST_WRITE_WINS',
  MERGE = 'MERGE',
  MANUAL = 'MANUAL',
}

export enum SyncStatus {
  IN_SYNC = 'IN_SYNC',
  OUT_OF_SYNC = 'OUT_OF_SYNC',
  SYNCING = 'SYNCING',
  CONFLICT = 'CONFLICT',
  ERROR = 'ERROR',
}

export interface IDeviceState {
  deviceId: string;
  version: number;
  timestamp: Date;
  reported: Record<string, any>;
  metadata: {
    connectivity: boolean;
    lastSeen: Date;
    batteryLevel?: number;
    signalStrength?: number;
  };
}

export interface IShadowState {
  deviceId: string;
  version: number;
  timestamp: Date;
  desired: Record<string, any>;
  reported: Record<string, any>;
  delta: Record<string, any>;
  metadata: {
    desiredVersion: number;
    reportedVersion: number;
    lastSync: Date;
  };
}

export interface IStateChange {
  deviceId: string;
  path: string;
  oldValue: any;
  newValue: any;
  timestamp: Date;
  source: 'DEVICE' | 'CLOUD';
  version: number;
}

export interface IConflict {
  id: string;
  deviceId: string;
  path: string;
  deviceValue: any;
  cloudValue: any;
  deviceVersion: number;
  cloudVersion: number;
  timestamp: Date;
  resolved: boolean;
  resolution?: {
    strategy: ConflictResolutionStrategy;
    resolvedValue: any;
    resolvedAt: Date;
    resolvedBy?: string;
  };
}

export interface ISyncResult {
  deviceId: string;
  success: boolean;
  status: SyncStatus;
  changesApplied: number;
  conflicts: IConflict[];
  error?: string;
  syncedAt: Date;
}

export interface ISyncConfig {
  direction: SyncDirection;
  conflictResolution: ConflictResolutionStrategy;
  syncInterval?: number; // milliseconds
  batchSize?: number;
  retryAttempts?: number;
  retryDelay?: number; // milliseconds
  enableDelta?: boolean;
}

export interface IStateDelta {
  deviceId: string;
  changes: Array<{
    path: string;
    operation: 'ADD' | 'UPDATE' | 'DELETE';
    value?: any;
    oldValue?: any;
  }>;
  version: number;
  timestamp: Date;
}

export interface ISyncEvent {
  type: 'SYNC_STARTED' | 'SYNC_COMPLETED' | 'SYNC_FAILED' | 'CONFLICT_DETECTED' | 'STATE_CHANGED';
  deviceId: string;
  timestamp: Date;
  data?: any;
}

export interface IDigitalTwinMetrics {
  deviceId: string;
  totalSyncs: number;
  successfulSyncs: number;
  failedSyncs: number;
  conflictsDetected: number;
  conflictsResolved: number;
  averageSyncTime: number;
  lastSyncTime: Date;
  syncStatus: SyncStatus;
}

// Shadow State Manager Interface
export interface IShadowStateManager {
  getShadow(deviceId: string): Promise<IShadowState | null>;
  updateDesired(deviceId: string, desired: Record<string, any>): Promise<IShadowState>;
  updateReported(deviceId: string, reported: Record<string, any>): Promise<IShadowState>;
  getDelta(deviceId: string): Promise<Record<string, any>>;
  deleteShadow(deviceId: string): Promise<void>;
}

// State Synchronization Interface
export interface IStateSynchronizer {
  sync(deviceId: string, deviceState: IDeviceState): Promise<ISyncResult>;
  syncBatch(states: IDeviceState[]): Promise<ISyncResult[]>;
  getConflicts(deviceId: string): Promise<IConflict[]>;
  resolveConflict(conflictId: string, resolution: ConflictResolutionStrategy, value?: any): Promise<void>;
}

// Conflict Resolver Interface
export interface IConflictResolver {
  resolve(conflict: IConflict, strategy: ConflictResolutionStrategy): any;
  detectConflicts(deviceState: IDeviceState, shadowState: IShadowState): IConflict[];
}

// State History Interface
export interface IStateHistory {
  deviceId: string;
  changes: IStateChange[];
  startDate: Date;
  endDate: Date;
}

export interface IStateHistoryQuery {
  deviceId: string;
  startDate?: Date;
  endDate?: Date;
  path?: string;
  limit?: number;
}

