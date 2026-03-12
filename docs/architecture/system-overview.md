# System Overview

FleetForge is a comprehensive IoT fleet management platform designed for managing, monitoring, and updating large-scale device deployments.

## Core Capabilities

### 1. Device Management
- Device registration and provisioning
- Fleet organization and grouping
- Lifecycle management (active, suspended, maintenance, decommissioned)
- Real-time status monitoring

### 2. OTA Updates
- Firmware version management
- Delta updates (up to 90% bandwidth reduction)
- Deployment strategies:
  - **Canary**: Gradual rollout with health checks
  - **Rolling**: Batch-based deployment
  - **Blue-Green**: Atomic switch
  - **Scheduled**: Maintenance window deployments

### 3. Digital Twin
- Shadow state synchronization
- Desired vs Reported state tracking
- Conflict resolution strategies
- Remote configuration management

### 4. AI/ML Features
- Anomaly detection (Isolation Forests)
- Predictive maintenance
- Device health scoring
- Remaining Useful Life (RUL) calculation

## Architecture Layers

```
┌─────────────────────────────────────────────────────────────┐
│                      Presentation Layer                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │  REST API   │  │  WebSocket  │  │    GraphQL (opt)    │  │
│  │  Endpoints  │  │   Gateway   │  │      Endpoint       │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│                      Application Layer                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   Guards    │  │ Interceptors│  │       Pipes         │  │
│  │  (Auth/RBAC)│  │ (Logging)   │  │   (Validation)      │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│                       Domain Layer                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │  Services   │  │  Entities   │  │   Value Objects     │  │
│  │             │  │             │  │                     │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│                    Infrastructure Layer                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ Repositories│  │   Caching   │  │   External APIs     │  │
│  │  (MongoDB)  │  │   (Redis)   │  │                     │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Module Structure

### API Application (`apps/api`)
- `auth/` - Authentication, JWT, MFA
- `device/` - Device CRUD, lifecycle
- `fleet/` - Fleet management
- `firmware/` - Firmware uploads, validation
- `deployment/` - Deployment orchestration
- `telemetry/` - Device telemetry data
- `health/` - Health checks
- `metrics/` - Prometheus metrics
- `tracing/` - OpenTelemetry tracing
- `audit/` - Audit logging
- `cache/` - Redis caching

### Shared Libraries (`libs/`)
| Library | Purpose |
|---------|---------|
| `@fleetforge/core` | Domain entities, types |
| `@fleetforge/database` | MongoDB schemas, repositories |
| `@fleetforge/security` | JWT, mTLS, encryption |
| `@fleetforge/ota` | Delta updates, compression |
| `@fleetforge/ai` | ML models, predictions |
| `@fleetforge/digital-twin` | Shadow state sync |

## Communication Patterns

### Synchronous (REST)
- Device CRUD operations
- User management
- Firmware uploads
- Configuration updates

### Asynchronous (WebSocket)
- Real-time telemetry streaming
- Deployment progress updates
- Device status changes
- Shadow state sync

## Quality Metrics

| Metric | Value |
|--------|-------|
| Test Coverage | 93%+ statements |
| Unit Tests | 509+ passing |
| API Response Time | <100ms (p95) |
| Deployment Success Rate | >99% |

