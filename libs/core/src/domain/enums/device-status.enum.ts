/**
 * Device Status Enumeration
 * Represents the lifecycle states of an IoT device
 */

export enum DeviceStatus {
  /** Device is being provisioned (initial setup) */
  PROVISIONING = 'PROVISIONING',

  /** Device is registered but not yet activated */
  REGISTERED = 'REGISTERED',

  /** Device is active and operational */
  ACTIVE = 'ACTIVE',

  /** Device is temporarily offline */
  OFFLINE = 'OFFLINE',

  /** Device is currently receiving a firmware update */
  UPDATING = 'UPDATING',

  /** Device is in maintenance mode */
  MAINTENANCE = 'MAINTENANCE',

  /** Device has encountered an error */
  ERROR = 'ERROR',

  /** Device is temporarily suspended (cannot operate) */
  SUSPENDED = 'SUSPENDED',

  /** Device is permanently decommissioned */
  DECOMMISSIONED = 'DECOMMISSIONED',
}

/**
 * Valid state transitions for device lifecycle
 */
export const DEVICE_LIFECYCLE_TRANSITIONS: Record<DeviceStatus, DeviceStatus[]> = {
  [DeviceStatus.PROVISIONING]: [
    DeviceStatus.REGISTERED,
    DeviceStatus.ERROR,
    DeviceStatus.DECOMMISSIONED,
  ],
  [DeviceStatus.REGISTERED]: [DeviceStatus.ACTIVE, DeviceStatus.ERROR, DeviceStatus.DECOMMISSIONED],
  [DeviceStatus.ACTIVE]: [
    DeviceStatus.OFFLINE,
    DeviceStatus.UPDATING,
    DeviceStatus.MAINTENANCE,
    DeviceStatus.ERROR,
    DeviceStatus.SUSPENDED,
    DeviceStatus.DECOMMISSIONED,
  ],
  [DeviceStatus.OFFLINE]: [
    DeviceStatus.ACTIVE,
    DeviceStatus.ERROR,
    DeviceStatus.SUSPENDED,
    DeviceStatus.DECOMMISSIONED,
  ],
  [DeviceStatus.UPDATING]: [DeviceStatus.ACTIVE, DeviceStatus.ERROR, DeviceStatus.OFFLINE],
  [DeviceStatus.MAINTENANCE]: [
    DeviceStatus.ACTIVE,
    DeviceStatus.ERROR,
    DeviceStatus.SUSPENDED,
    DeviceStatus.DECOMMISSIONED,
  ],
  [DeviceStatus.ERROR]: [
    DeviceStatus.ACTIVE,
    DeviceStatus.MAINTENANCE,
    DeviceStatus.SUSPENDED,
    DeviceStatus.DECOMMISSIONED,
  ],
  [DeviceStatus.SUSPENDED]: [DeviceStatus.ACTIVE, DeviceStatus.DECOMMISSIONED],
  [DeviceStatus.DECOMMISSIONED]: [], // Terminal state - no transitions allowed
};

/**
 * Lifecycle event types for audit logging
 */
export enum DeviceLifecycleEvent {
  PROVISIONED = 'PROVISIONED',
  REGISTERED = 'REGISTERED',
  ACTIVATED = 'ACTIVATED',
  WENT_OFFLINE = 'WENT_OFFLINE',
  CAME_ONLINE = 'CAME_ONLINE',
  UPDATE_STARTED = 'UPDATE_STARTED',
  UPDATE_COMPLETED = 'UPDATE_COMPLETED',
  MAINTENANCE_STARTED = 'MAINTENANCE_STARTED',
  MAINTENANCE_COMPLETED = 'MAINTENANCE_COMPLETED',
  ERROR_OCCURRED = 'ERROR_OCCURRED',
  ERROR_RESOLVED = 'ERROR_RESOLVED',
  SUSPENDED = 'SUSPENDED',
  REACTIVATED = 'REACTIVATED',
  DECOMMISSIONED = 'DECOMMISSIONED',
}

export enum DeviceType {
  /** GPS tracking device */
  TRACKER = 'TRACKER',

  /** Vehicle telematics unit */
  TELEMATICS = 'TELEMATICS',

  /** Environmental sensor */
  SENSOR = 'SENSOR',

  /** Camera device */
  CAMERA = 'CAMERA',

  /** Gateway device */
  GATEWAY = 'GATEWAY',

  /** Custom device type */
  CUSTOM = 'CUSTOM',
}
