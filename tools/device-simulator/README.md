# FleetForge Device Simulator

A command-line tool to simulate IoT devices for testing the FleetForge platform without physical hardware.

## Features

- **Multiple Device Types**: Simulate gateways, sensors, edge devices, and actuators
- **Realistic Telemetry**: Generate realistic sensor data with natural variations
- **WebSocket Support**: Connect to real-time updates via WebSocket
- **Anomaly Simulation**: Occasionally generate anomalous readings for testing alerts
- **Scalable**: Simulate hundreds of devices simultaneously

## Installation

```bash
cd tools/device-simulator
npm install
npm run build
```

## Usage

### Start Simulator

```bash
# Basic usage - simulate 5 sensor devices
npm run simulate -- start

# Simulate 20 gateway devices with authentication
npm run simulate -- start -n 20 -T gateway -t <your-jwt-token>

# Custom interval and fleet assignment
npm run simulate -- start -n 10 -i 3000 -f <fleet-id>
```

### Options

| Option | Description | Default |
|--------|-------------|---------|
| `-u, --api-url <url>` | FleetForge API URL | `http://localhost:3100` |
| `-w, --ws-url <url>` | WebSocket URL | `ws://localhost:3100` |
| `-t, --token <token>` | JWT authentication token | - |
| `-n, --count <number>` | Number of devices | `5` |
| `-i, --interval <ms>` | Telemetry interval | `5000` |
| `-T, --type <type>` | Device type | `sensor` |
| `-f, --fleet <id>` | Fleet ID | - |
| `-v, --verbose` | Verbose logging | `false` |

### Device Types

- **gateway**: Full-featured devices with location and all capabilities
- **sensor**: Battery-powered sensors with humidity, pressure, light
- **edge**: Edge computing devices with ML inference capabilities
- **actuator**: Command-controlled devices

### Quick Test

```bash
# Run a 30-second test with 2 devices
npm run simulate -- test
```

## Telemetry Data

Each device generates the following metrics:

```json
{
  "deviceId": "uuid",
  "timestamp": "2024-01-15T10:30:00Z",
  "metrics": {
    "cpu": 45.2,
    "memory": 62.8,
    "temperature": 42.1,
    "battery": 87.5,
    "signalStrength": -58
  },
  "location": {
    "latitude": -23.5505,
    "longitude": -46.6333
  }
}
```

## Development

```bash
# Run in development mode
npm run dev -- start -v

# Build
npm run build

# Run built version
npm start -- start
```

