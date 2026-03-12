# FleetForge Performance Benchmarks

Comprehensive performance benchmarks for the FleetForge API.

## Prerequisites

```bash
# Install autocannon for HTTP benchmarking
npm install -g autocannon

# Install k6 for load testing
brew install k6  # macOS
# or
sudo apt install k6  # Linux
```

## Quick Start

```bash
# Start the API first
npm run start:dev

# Run all benchmarks
./tools/benchmarks/run-all.sh

# Run specific benchmark
node tools/benchmarks/endpoint-benchmark.js
```

## Benchmark Types

### 1. Endpoint Latency (`endpoint-benchmark.js`)
Measures response times for all API endpoints.

### 2. Throughput (`throughput-benchmark.js`)
Measures maximum requests per second.

### 3. Concurrent Users (`concurrent-benchmark.js`)
Tests behavior under concurrent load.

### 4. Database Operations (`db-benchmark.js`)
MongoDB query performance.

## Performance Baselines

### API Response Times (p95)

| Endpoint | Target | Baseline |
|----------|--------|----------|
| `GET /health` | <10ms | 5ms |
| `GET /devices` | <50ms | 35ms |
| `GET /devices/:id` | <30ms | 20ms |
| `POST /devices` | <100ms | 65ms |
| `GET /telemetry` | <100ms | 80ms |
| `POST /auth/login` | <200ms | 150ms |

### Throughput Targets

| Scenario | Target RPS | VUs |
|----------|-----------|-----|
| Health check | 5000 | 100 |
| Device CRUD | 1000 | 50 |
| Telemetry ingestion | 2000 | 100 |
| Auth flow | 500 | 25 |

### Resource Limits

| Resource | Limit |
|----------|-------|
| Memory (RSS) | <512MB |
| CPU | <70% |
| DB Connections | <100 |

## Running Benchmarks

### Quick Benchmark
```bash
# 10 seconds, 10 connections
autocannon -c 10 -d 10 http://localhost:3100/health
```

### Full Benchmark Suite
```bash
cd tools/benchmarks
./run-all.sh --duration 60 --connections 50
```

### CI Integration
```yaml
# .github/workflows/benchmark.yml
- name: Run Benchmarks
  run: |
    npm run start &
    sleep 10
    node tools/benchmarks/ci-benchmark.js
```

## Interpreting Results

### Good Performance
- p99 latency < 2x p50
- Error rate < 0.1%
- Consistent throughput

### Warning Signs
- p99 > 500ms
- Error rate > 1%
- Memory growth over time

## Profiling

### CPU Profile
```bash
node --prof apps/api/dist/main.js
# Generate report
node --prof-process isolate-*.log > profile.txt
```

### Memory Profile
```bash
node --inspect apps/api/dist/main.js
# Open chrome://inspect
```

