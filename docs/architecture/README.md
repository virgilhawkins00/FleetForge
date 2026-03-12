# FleetForge Architecture Documentation

This directory contains comprehensive architecture documentation for the FleetForge IoT fleet management platform.

## Documentation Index

| Document | Description |
|----------|-------------|
| [System Overview](./system-overview.md) | High-level system architecture |
| [API Architecture](./api-architecture.md) | Backend API design and patterns |
| [Data Flow](./data-flow.md) | Data flow and event processing |
| [Security Architecture](./security-architecture.md) | Security patterns and implementation |
| [Deployment Guide](./deployment-guide.md) | Docker and Kubernetes deployment |

## Quick Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        FleetForge Platform                       │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │   Devices   │  │  Web/Mobile │  │     Admin Dashboard     │  │
│  │   (IoT)     │  │    Apps     │  │       (Grafana)         │  │
│  └──────┬──────┘  └──────┬──────┘  └───────────┬─────────────┘  │
│         │                │                      │                │
│         ▼                ▼                      ▼                │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                    API Gateway (NestJS)                     ││
│  │  ┌─────────┐ ┌──────────┐ ┌──────────┐ ┌────────────────┐  ││
│  │  │  Auth   │ │ Devices  │ │ Firmware │ │  Deployments   │  ││
│  │  │ Module  │ │  Module  │ │  Module  │ │    Module      │  ││
│  │  └─────────┘ └──────────┘ └──────────┘ └────────────────┘  ││
│  └─────────────────────────────────────────────────────────────┘│
│         │                │                      │                │
│         ▼                ▼                      ▼                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │   MongoDB   │  │    Redis    │  │    Prometheus/Jaeger    │  │
│  │  (Primary)  │  │   (Cache)   │  │     (Observability)     │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Technology Stack

### Backend
- **Framework**: NestJS 10.x (Node.js)
- **Language**: TypeScript 5.x
- **Database**: MongoDB 7.x
- **Cache**: Redis 7.x
- **API**: REST + WebSocket

### Libraries (Monorepo)
- `@fleetforge/core` - Domain entities
- `@fleetforge/database` - MongoDB repositories
- `@fleetforge/security` - Auth, JWT, mTLS
- `@fleetforge/ota` - OTA updates, delta patches
- `@fleetforge/ai` - Anomaly detection, predictions
- `@fleetforge/digital-twin` - Device shadow state

### Observability
- **Metrics**: Prometheus
- **Tracing**: OpenTelemetry + Jaeger
- **Logging**: Winston (JSON)
- **Dashboards**: Grafana

## Getting Started

1. Read the [System Overview](./system-overview.md) first
2. Review [API Architecture](./api-architecture.md) for backend details
3. Check [Deployment Guide](./deployment-guide.md) for running locally

