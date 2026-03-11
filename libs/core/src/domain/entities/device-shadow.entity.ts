/**
 * Device Shadow Entity - Digital Twin pattern for IoT devices
 * Maintains reported (device) and desired (cloud) state with delta calculation
 */

export interface IShadowMetadata {
  timestamp: Date;
  version: number;
}

export interface IShadowState {
  state: Record<string, unknown>;
  metadata?: IShadowMetadata;
}

export class DeviceShadow {
  constructor(
    public readonly id: string,
    public readonly deviceId: string,
    public reported: IShadowState,
    public desired: IShadowState,
    public delta: Record<string, unknown>,
    public hasDelta: boolean,
    public version: number,
    public readonly createdAt: Date = new Date(),
    public updatedAt: Date = new Date(),
    public lastReportedAt?: Date,
    public lastDesiredAt?: Date,
    public lastSyncedAt?: Date,
  ) {}

  /**
   * Update reported state from device
   * Automatically recalculates delta
   */
  updateReported(newState: Record<string, unknown>): void {
    this.reported = {
      state: { ...this.reported.state, ...newState },
      metadata: { timestamp: new Date(), version: this.version + 1 },
    };
    this.lastReportedAt = new Date();
    this.version++;
    this.updatedAt = new Date();
    this.calculateDelta();
  }

  /**
   * Update desired state from cloud/application
   * Automatically recalculates delta
   */
  updateDesired(newState: Record<string, unknown>): void {
    this.desired = {
      state: { ...this.desired.state, ...newState },
      metadata: { timestamp: new Date(), version: this.version + 1 },
    };
    this.lastDesiredAt = new Date();
    this.version++;
    this.updatedAt = new Date();
    this.calculateDelta();
  }

  /**
   * Calculate delta between desired and reported state
   * Delta contains only properties that differ
   */
  calculateDelta(): void {
    this.delta = {};
    const desiredKeys = Object.keys(this.desired.state);

    for (const key of desiredKeys) {
      const desiredValue = this.desired.state[key];
      const reportedValue = this.reported.state[key];

      if (!this.deepEqual(desiredValue, reportedValue)) {
        this.delta[key] = desiredValue;
      }
    }

    this.hasDelta = Object.keys(this.delta).length > 0;
  }

  /**
   * Mark shadow as synced (device acknowledged desired state)
   */
  markSynced(): void {
    this.lastSyncedAt = new Date();
    this.delta = {};
    this.hasDelta = false;
    this.updatedAt = new Date();
  }

  /**
   * Clear desired state for a specific key
   */
  clearDesired(key: string): void {
    delete this.desired.state[key];
    this.calculateDelta();
    this.updatedAt = new Date();
  }

  /**
   * Get the full shadow document for API response
   */
  toJSON(): Record<string, unknown> {
    return {
      id: this.id,
      deviceId: this.deviceId,
      state: {
        reported: this.reported.state,
        desired: this.desired.state,
        delta: this.delta,
      },
      metadata: {
        reported: this.reported.metadata,
        desired: this.desired.metadata,
      },
      version: this.version,
      hasDelta: this.hasDelta,
      lastReportedAt: this.lastReportedAt,
      lastDesiredAt: this.lastDesiredAt,
      lastSyncedAt: this.lastSyncedAt,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  /**
   * Deep equality check for state comparison
   */
  private deepEqual(a: unknown, b: unknown): boolean {
    if (a === b) return true;
    if (typeof a !== typeof b) return false;
    if (a === null || b === null) return a === b;
    if (typeof a !== 'object') return false;

    const aObj = a as Record<string, unknown>;
    const bObj = b as Record<string, unknown>;
    const aKeys = Object.keys(aObj);
    const bKeys = Object.keys(bObj);

    if (aKeys.length !== bKeys.length) return false;

    return aKeys.every((key) => this.deepEqual(aObj[key], bObj[key]));
  }

  /**
   * Factory method to create a new shadow for a device
   */
  static create(deviceId: string, initialState: Record<string, unknown> = {}): DeviceShadow {
    const now = new Date();
    return new DeviceShadow(
      deviceId, // Use device ID as shadow ID for 1:1 mapping
      deviceId,
      { state: initialState, metadata: { timestamp: now, version: 1 } },
      { state: {}, metadata: { timestamp: now, version: 1 } },
      {},
      false,
      1,
      now,
      now,
      now,
    );
  }
}

