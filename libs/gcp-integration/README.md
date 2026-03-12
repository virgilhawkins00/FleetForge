# @fleetforge/gcp-integration

Google Cloud Platform integration for FleetForge IoT platform. This library provides seamless integration with GCP services for telemetry ingestion, firmware management, and analytics.

## Architecture (Post-IoT Core)

Since Google IoT Core was discontinued in August 2023, this library uses a modern architecture:

```
┌─────────────────┐     ┌──────────────┐     ┌─────────────────┐
│   IoT Devices   │────▶│  MQTT Broker │────▶│   Cloud Pub/Sub │
└─────────────────┘     │  (External)  │     └────────┬────────┘
                        └──────────────┘              │
                                                      ▼
                                         ┌────────────────────────┐
                                         │     Cloud Functions    │
                                         │    or Cloud Run        │
                                         └────────────┬───────────┘
                                                      │
                    ┌─────────────────────────────────┼─────────────────────────────────┐
                    │                                 │                                 │
                    ▼                                 ▼                                 ▼
           ┌─────────────────┐             ┌─────────────────┐             ┌─────────────────┐
           │  Cloud Storage  │             │    BigQuery     │             │ Cloud Logging   │
           │   (Firmware)    │             │  (Analytics)    │             │   (Monitoring)  │
           └─────────────────┘             └─────────────────┘             └─────────────────┘
```

## Installation

```bash
npm install @fleetforge/gcp-integration
```

## Services

### PubSubService

Handles telemetry ingestion and device messaging:

```typescript
import { PubSubService } from '@fleetforge/gcp-integration';

const pubsub = new PubSubService({
  projectId: 'my-gcp-project',
  telemetryTopic: 'fleetforge-telemetry',
  commandsTopic: 'fleetforge-commands',
});

await pubsub.initialize();

// Publish telemetry
await pubsub.publishTelemetry({
  deviceId: 'device-123',
  timestamp: new Date(),
  metrics: { temperature: 25.5, humidity: 60 },
});

// Subscribe to telemetry
await pubsub.subscribeTelemetry('my-subscription', async (message, ack) => {
  console.log('Received:', message);
  ack();
});
```

### StorageService

Manages firmware artifacts in Cloud Storage:

```typescript
import { StorageService } from '@fleetforge/gcp-integration';

const storage = new StorageService({
  projectId: 'my-gcp-project',
  firmwareBucket: 'fleetforge-firmware',
});

// Upload firmware
const artifact = await storage.uploadFirmware('esp32', 'v2.5.0', firmwareBuffer);

// Get signed download URL
const url = await storage.getFirmwareUrl('esp32', 'v2.5.0', 60);
```

### BigQueryService

Analytics and long-term telemetry storage:

```typescript
import { BigQueryService } from '@fleetforge/gcp-integration';

const bq = new BigQueryService({
  projectId: 'my-gcp-project',
  dataset: 'fleetforge_iot',
});

// Insert telemetry batch
await bq.insertTelemetry(telemetryMessages);

// Query device history
const history = await bq.queryDeviceTelemetry('device-123', startDate, endDate);
```

## GCP Module (All-in-One)

```typescript
import { createGCPModule } from '@fleetforge/gcp-integration';

const gcp = createGCPModule({
  projectId: 'my-gcp-project',
  region: 'us-central1',
});

await gcp.initialize();

// Use individual services
await gcp.pubsub.publishTelemetry(...);
await gcp.storage.uploadFirmware(...);
await gcp.bigquery.insertTelemetry(...);
```

## Environment Variables

```bash
# GCP Project
GOOGLE_CLOUD_PROJECT=my-gcp-project

# Credentials (or use GOOGLE_APPLICATION_CREDENTIALS)
GCP_CREDENTIALS_PATH=/path/to/service-account.json

# Pub/Sub Topics
GCP_PUBSUB_TELEMETRY_TOPIC=fleetforge-telemetry
GCP_PUBSUB_COMMANDS_TOPIC=fleetforge-commands
GCP_PUBSUB_EVENTS_TOPIC=fleetforge-events

# Storage Buckets
GCP_STORAGE_FIRMWARE_BUCKET=fleetforge-firmware
GCP_STORAGE_LOGS_BUCKET=fleetforge-logs

# BigQuery
GCP_BIGQUERY_DATASET=fleetforge_iot
```

## License

MIT

