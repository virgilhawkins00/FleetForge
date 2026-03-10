# FleetForge Quick Start Guide

This guide will help you get FleetForge up and running in under 5 minutes.

## Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- Git

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/FleetForge.git
cd FleetForge
```

### 2. Install Dependencies

```bash
npm install
```

This will install all dependencies for the monorepo, including NestJS, NX, and all libraries.

### 3. Set Up Environment Variables

```bash
cp .env.example .env
```

Edit `.env` and configure your environment variables. For local development, the defaults should work fine.

### 4. Run Tests

```bash
npm test
```

This will run all tests across the monorepo. You should see output showing test results for the `@fleetforge/core` library.

### 5. Build the Project

```bash
npm run build
```

This builds all applications and libraries.

### 6. Start the API Server

```bash
nx serve api
```

The API server will start on `http://localhost:3000`.

## Verify Installation

### Check API Health

```bash
curl http://localhost:3000/api/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "version": "1.0.0"
}
```

### Access API Documentation

Open your browser and navigate to:
```
http://localhost:3000/api/docs
```

You'll see the Swagger UI with all available endpoints.

## Create Your First Device

### Using cURL

```bash
curl -X POST http://localhost:3000/api/v1/devices \
  -H "Content-Type: application/json" \
  -d '{
    "fleetId": "fleet-001",
    "name": "My First Tracker",
    "type": "TRACKER",
    "metadata": {
      "manufacturer": "Acme Corp",
      "model": "T-1000",
      "hardwareVersion": "2.0",
      "serialNumber": "SN123456"
    },
    "capabilities": {
      "hasGPS": true,
      "hasCamera": false,
      "hasCellular": true,
      "hasWiFi": false,
      "hasBluetooth": true,
      "sensors": ["accelerometer", "gyroscope"]
    },
    "firmwareVersion": "1.0.0"
  }'
```

### Using the Swagger UI

1. Go to `http://localhost:3000/api/docs`
2. Find the `POST /api/v1/devices` endpoint
3. Click "Try it out"
4. Fill in the request body
5. Click "Execute"

## Next Steps

### Explore the Core Library

```typescript
import { Device, DeviceStatus, DeviceType, Location } from '@fleetforge/core';

// Create a device
const device = new Device(
  'device-123',
  'fleet-456',
  'Tracker Unit 001',
  DeviceType.TRACKER,
  DeviceStatus.ACTIVE,
  // ... metadata and capabilities
);

// Update location
const location = new Location(-23.5505, -46.6333, new Date());
device.updateLocation(location);

// Check if device is online
console.log(device.isOnline()); // true/false
```

### Run Individual Tests

```bash
# Test core library
nx test core

# Test API
nx test api

# Test with coverage
nx test core --coverage
```

### Development Workflow

```bash
# Run all tests in watch mode
nx test core --watch

# Lint code
npm run lint

# Format code
npm run format

# Build specific library
nx build core
```

## Project Structure

```
FleetForge/
├── apps/
│   └── api/              # Main API application
├── libs/
│   └── core/             # @fleetforge/core library
├── tools/
│   └── scripts/          # Build and publish scripts
├── .github/
│   └── workflows/        # CI/CD pipelines
└── README.md
```

## Common Issues

### Port Already in Use

If port 3000 is already in use, you can change it in `.env`:

```env
PORT=3001
```

### Dependencies Not Installing

Try clearing the cache:

```bash
rm -rf node_modules package-lock.json
npm install
```

### Tests Failing

Make sure you're using the correct Node.js version:

```bash
node --version  # Should be >= 18.0.0
```

## Getting Help

- 📖 [Full Documentation](README.md)
- 🐛 [Report Issues](https://github.com/yourusername/FleetForge/issues)
- 💬 [Discussions](https://github.com/yourusername/FleetForge/discussions)
- 🤝 [Contributing Guide](CONTRIBUTING.md)

## What's Next?

- Read the [Architecture Documentation](docs/architecture.md)
- Explore the [API Reference](http://localhost:3000/api/docs)
- Check out the [Roadmap](ROADMAP.md)
- Join our [Discord Community](https://discord.gg/fleetforge)

---

**Happy Building! 🚀**

