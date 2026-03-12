# FleetForge Observability Stack

Complete observability infrastructure for FleetForge using Prometheus, Grafana, Jaeger, and Alertmanager.

## Quick Start

```bash
# Start all observability services
cd tools/observability
docker-compose up -d

# Check services are running
docker-compose ps
```

## Services

| Service | URL | Credentials |
|---------|-----|-------------|
| **Grafana** | http://localhost:3001 | admin / fleetforge |
| **Prometheus** | http://localhost:9090 | - |
| **Jaeger UI** | http://localhost:16686 | - |
| **Alertmanager** | http://localhost:9093 | - |

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ FleetForge  │────▶│  Prometheus │────▶│   Grafana   │
│    API      │     │   :9090     │     │    :3001    │
│   :3100     │     └─────────────┘     └─────────────┘
│             │            │                   │
│  /metrics   │            ▼                   │
│             │     ┌─────────────┐            │
└─────────────┘     │Alertmanager │            │
       │            │    :9093    │            │
       │            └─────────────┘            │
       │                                       │
       ▼                                       │
┌─────────────┐                                │
│   Jaeger    │◀───────────────────────────────┘
│   :16686    │
│  (Traces)   │
└─────────────┘
```

## Dashboards

### API Overview
- Request rate by method
- Response time percentiles (p95)
- Error rate
- Memory usage
- Requests by status code/endpoint

### Distributed Tracing
- Recent traces browser
- Span creation rate
- Trace duration distribution
- Export errors

## API Configuration

Add these environment variables to enable observability:

```env
# Metrics (Prometheus)
METRICS_ENABLED=true

# Tracing (OpenTelemetry)
TRACING_ENABLED=true
TRACING_EXPORTER=jaeger
JAEGER_ENDPOINT=http://localhost:14268/api/traces

# Service metadata
SERVICE_NAME=fleetforge-api
APP_VERSION=0.1.0
```

## Alert Rules

| Alert | Severity | Condition |
|-------|----------|-----------|
| HighErrorRate | Critical | >5% error rate for 5min |
| HighLatency | Warning | p95 latency >1s for 5min |
| APIDown | Critical | API unreachable for 1min |
| HighMemoryUsage | Warning | >1.5GB memory for 5min |
| DeploymentFailures | Critical | >5 failures in 1h |

## Customization

### Adding Custom Dashboards
1. Create JSON dashboard in `grafana/dashboards/`
2. Restart Grafana: `docker-compose restart grafana`

### Configuring Slack Alerts
1. Edit `alertmanager/alertmanager.yml`
2. Uncomment Slack configuration
3. Add your webhook URL
4. Restart Alertmanager

## Troubleshooting

```bash
# View logs
docker-compose logs -f grafana
docker-compose logs -f prometheus

# Restart services
docker-compose restart

# Reset everything
docker-compose down -v
docker-compose up -d
```

## Stopping

```bash
docker-compose down       # Stop containers
docker-compose down -v    # Stop and remove volumes
```

