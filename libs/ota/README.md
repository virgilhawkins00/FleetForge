# @fleetforge/ota

Over-The-Air (OTA) update system for FleetForge IoT platform.

## Features

### 🚀 Delta Updates
- **Binary Diff/Patch Algorithm**: Minimize bandwidth usage by sending only the differences between firmware versions
- **Compression Support**: gzip and brotli compression for optimal transfer size
- **Integrity Verification**: SHA-256/SHA-512 checksums for patch validation
- **Bandwidth Savings**: Up to 90% reduction in update size for incremental changes

### 📊 Deployment Strategies

#### Canary Deployment
Deploy to a small percentage of devices first, then gradually roll out to the entire fleet.

```typescript
import { CanaryDeploymentExecutor } from '@fleetforge/ota';

const executor = new CanaryDeploymentExecutor();
const deployment = await executor.execute(devices, updatePackage, {
  strategy: DeploymentStrategy.CANARY,
  canaryPercentage: 10,
  healthCheckInterval: 5000,
  maxFailureRate: 0.1,
  autoRollback: true,
});
```

#### Rolling Deployment
Deploy in batches with configurable size and delay between batches.

```typescript
import { RollingDeploymentExecutor } from '@fleetforge/ota';

const executor = new RollingDeploymentExecutor();
const deployment = await executor.execute(devices, updatePackage, {
  strategy: DeploymentStrategy.ROLLING,
  batchSize: 50,
  batchDelay: 10000,
  maxFailureRate: 0.2,
  autoRollback: true,
});
```

#### Blue-Green Deployment
Download to all devices first, then switch atomically.

```typescript
import { BlueGreenDeploymentExecutor } from '@fleetforge/ota';

const executor = new BlueGreenDeploymentExecutor();
const deployment = await executor.execute(devices, updatePackage, {
  strategy: DeploymentStrategy.BLUE_GREEN,
  healthCheckInterval: 5000,
  maxFailureRate: 0.05,
  autoRollback: true,
});
```

### 🔄 Automatic Rollback
- **Failure Detection**: Monitor deployment health and failure rates
- **Automatic Revert**: Roll back to Last Known Good (LKG) version on failure
- **Retry Logic**: Configurable retry attempts with exponential backoff
- **User Data Preservation**: Option to preserve user data during rollback

```typescript
import { RollbackService } from '@fleetforge/ota';

const rollbackService = new RollbackService();

// Create backup before update
await rollbackService.createBackup(deviceId, currentFirmware);

// Rollback if needed
const success = await rollbackService.rollbackDevice(
  deviceId,
  deviceStatus,
  {
    enabled: true,
    maxRetries: 3,
    retryDelay: 5000,
    preserveUserData: true,
    notifyOnRollback: true,
  },
  RollbackReason.INSTALLATION_FAILED,
);
```

## Installation

```bash
npm install @fleetforge/ota
```

## Usage

### Delta Update Generation

```typescript
import { DeltaUpdateEngine } from '@fleetforge/ota';

const engine = new DeltaUpdateEngine();

// Generate delta patch
const patch = await engine.generateDelta(
  sourceBuffer,
  targetBuffer,
  {
    compressionAlgorithm: 'gzip',
    compressionLevel: 6,
    blockSize: 4096,
    checksumAlgorithm: 'sha256',
  }
);

// Apply delta patch
const result = await engine.applyDelta(sourceBuffer, patch);

if (result.success) {
  console.log(`Update applied successfully: ${result.checksum}`);
} else {
  console.error(`Update failed: ${result.error}`);
}

// Calculate bandwidth savings
const savings = engine.calculateSavings(fullSize, patch.patchSize);
console.log(`Saved ${savings.savedPercentage}% bandwidth`);
```

### Deployment Management

```typescript
import { CanaryDeploymentExecutor } from '@fleetforge/ota';

const executor = new CanaryDeploymentExecutor();

// Start deployment
const deployment = await executor.execute(devices, updatePackage, config);

// Monitor progress
const progress = executor.getProgress(deployment.deploymentId);
console.log(`Progress: ${progress.successCount}/${progress.totalDevices}`);

// Pause deployment
await executor.pause(deployment.deploymentId);

// Resume deployment
await executor.resume(deployment.deploymentId);

// Rollback deployment
await executor.rollback(deployment.deploymentId);
```

## Architecture

### Delta Update Engine
- Binary diff/patch algorithm for efficient updates
- Multiple compression algorithms (gzip, brotli)
- Cryptographic verification (SHA-256, SHA-512)

### Deployment Executors
- **Base Executor**: Abstract class with common functionality
- **Canary Executor**: Gradual rollout with health checks
- **Rolling Executor**: Batch-based deployment
- **Blue-Green Executor**: Atomic switch deployment

### Rollback Service
- Automatic failure detection
- Version backup and restoration
- Rollback history tracking
- Notification system

## Testing

```bash
# Run tests
nx test ota

# Run tests with coverage
nx test ota --coverage
```

## License

MIT

