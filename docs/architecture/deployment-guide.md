# Deployment Guide

## Prerequisites

- Node.js 20.x or later
- Docker & Docker Compose
- MongoDB 7.x (or Docker)
- Redis 7.x (or Docker)

## Local Development

### 1. Clone and Install

```bash
git clone https://github.com/your-org/fleetforge.git
cd fleetforge
npm install
```

### 2. Environment Configuration

```bash
cp .env.example .env
```

Edit `.env`:
```env
# Database
MONGODB_URI=mongodb://localhost:27017/fleetforge

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT
JWT_SECRET=your-super-secret-key
JWT_EXPIRATION=15m
REFRESH_TOKEN_EXPIRATION=7d

# Tracing
TRACING_ENABLED=true
TRACING_EXPORTER=jaeger
JAEGER_ENDPOINT=http://localhost:14268/api/traces
```

### 3. Start Dependencies

```bash
# Start MongoDB and Redis
docker-compose -f docker-compose.dev.yml up -d
```

### 4. Run API

```bash
# Development mode with hot reload
npm run start:dev

# Or using NX
npx nx serve api
```

API available at: `http://localhost:3100`

## Docker Deployment

### Build Image

```bash
docker build -t fleetforge-api:latest -f apps/api/Dockerfile .
```

### Run Container

```bash
docker run -d \
  --name fleetforge-api \
  -p 3100:3100 \
  -e MONGODB_URI=mongodb://mongo:27017/fleetforge \
  -e REDIS_HOST=redis \
  fleetforge-api:latest
```

### Docker Compose (Full Stack)

```yaml
# docker-compose.yml
version: '3.8'
services:
  api:
    build: .
    ports:
      - "3100:3100"
    environment:
      - MONGODB_URI=mongodb://mongo:27017/fleetforge
      - REDIS_HOST=redis
    depends_on:
      - mongo
      - redis

  mongo:
    image: mongo:7
    volumes:
      - mongo-data:/data/db

  redis:
    image: redis:7-alpine
    volumes:
      - redis-data:/data

volumes:
  mongo-data:
  redis-data:
```

## Kubernetes Deployment

### Namespace

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: fleetforge
```

### Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: fleetforge-api
  namespace: fleetforge
spec:
  replicas: 3
  selector:
    matchLabels:
      app: fleetforge-api
  template:
    metadata:
      labels:
        app: fleetforge-api
    spec:
      containers:
        - name: api
          image: fleetforge-api:latest
          ports:
            - containerPort: 3100
          env:
            - name: MONGODB_URI
              valueFrom:
                secretKeyRef:
                  name: fleetforge-secrets
                  key: mongodb-uri
          livenessProbe:
            httpGet:
              path: /health
              port: 3100
          readinessProbe:
            httpGet:
              path: /health/ready
              port: 3100
```

### Service

```yaml
apiVersion: v1
kind: Service
metadata:
  name: fleetforge-api
  namespace: fleetforge
spec:
  selector:
    app: fleetforge-api
  ports:
    - port: 80
      targetPort: 3100
  type: ClusterIP
```

## Health Checks

| Endpoint | Purpose |
|----------|---------|
| `GET /health` | Liveness probe |
| `GET /health/ready` | Readiness probe |
| `GET /health/startup` | Startup probe |
| `GET /health/detailed` | Full health status |

## Observability Stack

```bash
cd tools/observability
docker-compose up -d
```

- Grafana: http://localhost:3001 (admin/fleetforge)
- Prometheus: http://localhost:9090
- Jaeger: http://localhost:16686

