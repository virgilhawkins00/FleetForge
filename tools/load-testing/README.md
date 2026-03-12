# FleetForge Load Testing Suite

Performance and load testing scripts using [k6](https://k6.io/).

## Prerequisites

Install k6:

```bash
# macOS
brew install k6

# Linux
sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6

# Windows
choco install k6
```

## Available Tests

| Script | Description |
|--------|-------------|
| `auth-load-test.js` | Authentication endpoints (login, token validation) |
| `devices-load-test.js` | Device CRUD and telemetry operations |
| `deployments-load-test.js` | Deployment workflow and status checks |
| `full-load-test.js` | Combined test simulating real traffic patterns |

## Usage

### Quick Smoke Test

```bash
k6 run tools/load-testing/auth-load-test.js --env BASE_URL=http://localhost:3000 --env STAGE=smoke
```

### Load Test (Standard)

```bash
k6 run tools/load-testing/full-load-test.js \
  --env BASE_URL=http://localhost:3000 \
  --env AUTH_TOKEN=your-jwt-token \
  --env STAGE=load
```

### Stress Test

```bash
k6 run tools/load-testing/full-load-test.js \
  --env BASE_URL=http://localhost:3000 \
  --env AUTH_TOKEN=your-jwt-token \
  --env STAGE=stress
```

### Soak Test (Long Duration)

```bash
k6 run tools/load-testing/full-load-test.js \
  --env BASE_URL=http://localhost:3000 \
  --env STAGE=soak
```

## Test Stages

| Stage | Description | Duration | Max VUs |
|-------|-------------|----------|---------|
| smoke | Quick sanity check | ~1 min | 10 |
| load | Normal load simulation | ~20 min | 50 |
| stress | Find breaking points | ~50 min | 300 |
| soak | Extended duration test | ~4 hours | 100 |

## Metrics & Thresholds

### Default Thresholds

- HTTP request duration: p(95) < 500ms, p(99) < 1000ms
- HTTP request failures: < 1%
- Success rate: > 95%

### Custom Metrics

- `auth_success_rate` - Authentication success rate
- `device_ops_success` - Device operations success rate
- `deployment_ops_success` - Deployment operations success rate
- `response_times` - Response time trend

## Output Options

### Console Summary
```bash
k6 run script.js
```

### JSON Output
```bash
k6 run script.js --out json=results.json
```

### InfluxDB + Grafana
```bash
k6 run script.js --out influxdb=http://localhost:8086/k6
```

### Cloud (k6 Cloud)
```bash
k6 cloud script.js
```

## CI/CD Integration

```yaml
# GitHub Actions example
load-test:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v3
    - uses: grafana/k6-action@v0.3.1
      with:
        filename: tools/load-testing/full-load-test.js
        flags: --env BASE_URL=${{ secrets.API_URL }} --env STAGE=smoke
```

## Best Practices

1. **Start with smoke tests** before running full load tests
2. **Use staging environment** - never run against production
3. **Monitor backend resources** during tests (CPU, memory, DB connections)
4. **Run from multiple locations** for realistic latency simulation
5. **Establish baselines** before making changes

