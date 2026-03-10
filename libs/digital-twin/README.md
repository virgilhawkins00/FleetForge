# @fleetforge/digital-twin

Digital Twin engine for FleetForge IoT platform with state synchronization and conflict resolution.

## Features

### 🔄 Shadow State Management
- **Desired State**: Cloud-side desired configuration
- **Reported State**: Device-side actual state
- **Delta Calculation**: Automatic difference detection
- **Version Tracking**: State version management

### 🔀 Bidirectional Synchronization
- **Device-to-Cloud**: Upload device state to cloud
- **Cloud-to-Device**: Push desired state to devices
- **Bidirectional**: Two-way state synchronization
- **Batch Sync**: Efficient multi-device synchronization

### ⚔️ Conflict Resolution
- **Device Wins**: Prioritize device state
- **Cloud Wins**: Prioritize cloud state
- **Last Write Wins**: Use version numbers
- **Merge**: Intelligent state merging
- **Manual**: Require manual intervention

## Installation

```bash
npm install @fleetforge/digital-twin
```

## Usage

### Shadow State Management

```typescript
import { ShadowStateManager } from '@fleetforge/digital-twin';

const shadowManager = new ShadowStateManager();

// Update desired state (cloud-side)
const shadow = await shadowManager.updateDesired('device-1', {
  targetTemperature: 22,
  mode: 'auto',
});

// Update reported state (device-side)
await shadowManager.updateReported('device-1', {
  currentTemperature: 25,
  mode: 'manual',
});

// Get delta (what device needs to apply)
const delta = await shadowManager.getDelta('device-1');
console.log('Device needs to update:', delta);
// Output: { targetTemperature: 22, mode: 'auto' }
```

### State Synchronization

```typescript
import {
  StateSynchronizer,
  ShadowStateManager,
  ConflictResolver,
  SyncDirection,
  ConflictResolutionStrategy,
} from '@fleetforge/digital-twin';

const shadowManager = new ShadowStateManager();
const conflictResolver = new ConflictResolver();

const synchronizer = new StateSynchronizer(
  shadowManager,
  conflictResolver,
  {
    direction: SyncDirection.BIDIRECTIONAL,
    conflictResolution: ConflictResolutionStrategy.LAST_WRITE_WINS,
    batchSize: 50,
    enableDelta: true,
  }
);

// Sync device state
const deviceState = {
  deviceId: 'device-1',
  version: 5,
  timestamp: new Date(),
  reported: {
    temperature: 25,
    humidity: 60,
    battery: 85,
  },
  metadata: {
    connectivity: true,
    lastSeen: new Date(),
  },
};

const result = await synchronizer.sync('device-1', deviceState);

if (result.success) {
  console.log(`Synced ${result.changesApplied} changes`);
} else {
  console.log(`Sync failed: ${result.error}`);
  console.log(`Conflicts: ${result.conflicts.length}`);
}
```

### Conflict Resolution

```typescript
import { ConflictResolver, ConflictResolutionStrategy } from '@fleetforge/digital-twin';

const resolver = new ConflictResolver();

// Detect conflicts
const conflicts = resolver.detectConflicts(deviceState, shadowState);

// Resolve conflicts
for (const conflict of conflicts) {
  const resolved = resolver.applyResolution(
    conflict,
    ConflictResolutionStrategy.MERGE
  );
  
  console.log(`Resolved ${conflict.path}: ${resolved.resolution.resolvedValue}`);
}
```

### Batch Synchronization

```typescript
// Sync multiple devices
const deviceStates = [
  { deviceId: 'device-1', version: 1, reported: { temp: 25 }, ... },
  { deviceId: 'device-2', version: 1, reported: { temp: 22 }, ... },
  { deviceId: 'device-3', version: 1, reported: { temp: 28 }, ... },
];

const results = await synchronizer.syncBatch(deviceStates);

const successful = results.filter(r => r.success).length;
console.log(`Synced ${successful}/${results.length} devices`);
```

### Metrics and Monitoring

```typescript
// Get sync metrics
const metrics = synchronizer.getSyncMetrics('device-1');
console.log(`Total syncs: ${metrics.totalSyncs}`);
console.log(`Success rate: ${metrics.successRate}%`);

// Get shadow statistics
const stats = await shadowManager.getStatistics();
console.log(`Total shadows: ${stats.total}`);
console.log(`Shadows with delta: ${stats.withDelta}`);
```

## Architecture

### Shadow State Structure

```typescript
{
  deviceId: "device-1",
  version: 5,
  timestamp: "2024-01-15T10:30:00Z",
  desired: {
    targetTemperature: 22,
    mode: "auto"
  },
  reported: {
    currentTemperature: 25,
    mode: "manual"
  },
  delta: {
    targetTemperature: 22,
    mode: "auto"
  },
  metadata: {
    desiredVersion: 3,
    reportedVersion: 5,
    lastSync: "2024-01-15T10:30:00Z"
  }
}
```

### Conflict Resolution Strategies

| Strategy | Description | Use Case |
|----------|-------------|----------|
| **DEVICE_WINS** | Device state always wins | Sensor data, real-time measurements |
| **CLOUD_WINS** | Cloud state always wins | Configuration, settings |
| **LAST_WRITE_WINS** | Higher version wins | General purpose |
| **MERGE** | Intelligent merging | Complex objects, arrays |
| **MANUAL** | Requires manual resolution | Critical conflicts |

## Testing

```bash
# Run tests
nx test digital-twin

# Run tests with coverage
nx test digital-twin --coverage
```

## License

MIT

