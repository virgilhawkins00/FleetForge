# Data Flow Architecture

## Overview

FleetForge processes data through multiple channels: REST API for CRUD operations, WebSockets for real-time updates, and background jobs for async processing.

## Request Flow

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  Client  │────▶│  Guard   │────▶│  Pipe    │────▶│Controller│
│          │     │(Auth/JWT)│     │(Validate)│     │          │
└──────────┘     └──────────┘     └──────────┘     └──────────┘
                                                         │
                                                         ▼
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│ Response │◀────│Interceptor◀────│ Service  │◀────│Repository│
│          │     │(Transform)│    │          │     │(MongoDB) │
└──────────┘     └──────────┘     └──────────┘     └──────────┘
```

## Telemetry Data Flow

### 1. Device Submission
```
Device ──HTTP POST──▶ /telemetry ──▶ TelemetryService
                                            │
                                            ▼
                                    ┌───────────────┐
                                    │ Validation &  │
                                    │ Normalization │
                                    └───────┬───────┘
                                            │
                      ┌─────────────────────┼─────────────────────┐
                      ▼                     ▼                     ▼
              ┌───────────────┐     ┌───────────────┐     ┌───────────────┐
              │   MongoDB     │     │    Redis      │     │   WebSocket   │
              │  (Persist)    │     │ (Cache/Pub)   │     │  (Broadcast)  │
              └───────────────┘     └───────────────┘     └───────────────┘
```

### 2. Real-time Distribution
```typescript
// EventsGateway broadcasts telemetry
@WebSocketGateway()
export class EventsGateway {
  @SubscribeMessage('subscribe:device')
  handleSubscribe(client: Socket, deviceId: string) {
    client.join(`device:${deviceId}`);
  }
  
  broadcastTelemetry(deviceId: string, data: TelemetryData) {
    this.server.to(`device:${deviceId}`).emit('telemetry', data);
  }
}
```

## OTA Update Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     Deployment Pipeline                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. CREATE           2. VALIDATE          3. PLAN                │
│  ┌─────────┐        ┌─────────┐         ┌─────────┐             │
│  │Deployment│──────▶│Firmware │────────▶│ Target  │             │
│  │  DTO     │       │ Check   │         │ Devices │             │
│  └─────────┘        └─────────┘         └─────────┘             │
│                                               │                  │
│  4. EXECUTE          5. MONITOR           6. COMPLETE           │
│  ┌─────────┐        ┌─────────┐         ┌─────────┐             │
│  │ Batch   │◀───────│ Health  │◀────────│ Rollup  │             │
│  │ Deploy  │        │ Checks  │         │ Status  │             │
│  └─────────┘        └─────────┘         └─────────┘             │
│       │                  │                    │                  │
│       ▼                  ▼                    ▼                  │
│  ┌─────────────────────────────────────────────────┐            │
│  │              WebSocket Notifications             │            │
│  │   (deployment:progress, deployment:complete)     │            │
│  └─────────────────────────────────────────────────┘            │
└─────────────────────────────────────────────────────────────────┘
```

## Digital Twin Sync

```
          Device                    Cloud
            │                         │
            │  1. Report State        │
            │────────────────────────▶│
            │                         │  ┌─────────────────┐
            │                         │──│ ShadowManager   │
            │                         │  │ - Compare State │
            │                         │  │ - Detect Delta  │
            │                         │  └────────┬────────┘
            │                         │           │
            │  2. Desired State       │           │
            │◀────────────────────────│◀──────────┘
            │                         │
            │  3. Acknowledge         │
            │────────────────────────▶│
            │                         │
```

## Caching Strategy

### Cache Layers

| Layer | TTL | Use Case |
|-------|-----|----------|
| L1 (In-Memory) | 1 min | Hot data (device status) |
| L2 (Redis) | 15 min | Shared state |
| L3 (MongoDB) | Permanent | Persistence |

### Cache Keys

```typescript
// Device cache
`device:${deviceId}` // Single device
`devices:fleet:${fleetId}` // Fleet devices
`device:${deviceId}:telemetry:latest` // Latest telemetry

// Firmware cache
`firmware:${firmwareId}` // Firmware metadata
`firmware:${firmwareId}:binary` // Binary (short TTL)
```

## Event Processing

### Audit Events
```
Action ──▶ AuditInterceptor ──▶ AuditService ──▶ MongoDB
                                     │
                                     ▼
                              Winston Logger
```

### Metrics Collection
```
Request ──▶ HttpMetricsInterceptor ──▶ Prometheus Registry
                                              │
                                              ▼
                                       /metrics endpoint
                                              │
                                              ▼
                                        Prometheus ──▶ Grafana
```

## Data Retention

| Data Type | Retention | Storage |
|-----------|-----------|---------|
| Telemetry | 30 days | MongoDB (TTL index) |
| Audit Logs | 1 year | MongoDB |
| Metrics | 15 days | Prometheus |
| Traces | 7 days | Jaeger |

