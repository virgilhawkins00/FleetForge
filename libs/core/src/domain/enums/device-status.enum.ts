/**
 * Device Status Enumeration
 * Represents the lifecycle states of an IoT device
 */

export enum DeviceStatus {
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

  /** Device is permanently decommissioned */
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

