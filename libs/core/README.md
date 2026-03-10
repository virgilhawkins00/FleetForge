# @fleetforge/core

Core domain models, interfaces, and types for the FleetForge IoT Platform.

## Overview

This library provides the foundational domain-driven design (DDD) components for FleetForge, including:

- **Entities**: Rich domain models (Device, Firmware, Deployment, Telemetry, Fleet)
- **Value Objects**: Immutable objects (Location, FirmwareSignature)
- **Enums**: Type-safe enumerations for status and types
- **Interfaces**: Ports for hexagonal architecture (Repositories, Services)

## Installation

```bash
npm install @fleetforge/core
```

## Usage

### Entities

```typescript
import { Device, DeviceStatus, DeviceType } from '@fleetforge/core';

const device = new Device(
  'device-123',
  'fleet-456',
  'Tracker Unit 001',
  DeviceType.TRACKER,
  DeviceStatus.ACTIVE,
  {
    manufacturer: 'Acme Corp',
    model: 'T-1000',
    hardwareVersion: '2.0',
    serialNumber: 'SN123456',
  },
  {
    hasGPS: true,
    hasCamera: false,
    hasCellular: true,
    hasWiFi: false,
    hasBluetooth: true,
    sensors: ['accelerometer', 'gyroscope'],
  },
  '1.0.0',
  new Date(),
);

// Update device status
device.updateStatus(DeviceStatus.UPDATING);

// Check if device is online
if (device.isOnline()) {
  console.log('Device is online');
}
```

### Value Objects

```typescript
import { Location } from '@fleetforge/core';

const location = new Location(
  -23.5505, // latitude
  -46.6333, // longitude
  new Date(),
  10, // altitude
  5, // accuracy
);

// Calculate distance
const distance = location.distanceTo(otherLocation);
console.log(`Distance: ${distance} meters`);
```

### Interfaces (Ports)

```typescript
import { IDeviceRepository, Device } from '@fleetforge/core';

class MongoDeviceRepository implements IDeviceRepository {
  async findById(id: string): Promise<Device | null> {
    // Implementation
  }

  async create(device: Device): Promise<Device> {
    // Implementation
  }

  // ... other methods
}
```

## Architecture

This library follows **Hexagonal Architecture** (Ports and Adapters):

- **Domain Layer**: Pure business logic (entities, value objects)
- **Ports**: Interfaces defining contracts (repositories, services)
- **Adapters**: Implementations in other packages (not in this library)

## Features

- ✅ **Type-Safe**: Full TypeScript support with strict typing
- ✅ **Immutable Value Objects**: Ensures data integrity
- ✅ **Rich Domain Models**: Business logic encapsulated in entities
- ✅ **Validation**: Built-in validation for all domain objects
- ✅ **Testable**: Pure functions and dependency injection
- ✅ **Framework Agnostic**: Can be used with any framework

## License

MIT

