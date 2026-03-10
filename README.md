# FleetForge 🚀

**Enterprise-grade IoT Fleet Management Platform with Secure OTA Updates**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)
[![NestJS](https://img.shields.io/badge/NestJS-10.3-red.svg)](https://nestjs.com/)
[![Test Coverage](https://img.shields.io/badge/coverage-80%25+-brightgreen.svg)](https://github.com/yourusername/FleetForge)

> **FleetForge** is an open-source, production-ready backend platform built with NestJS for managing massive IoT device fleets. It goes beyond simple telemetry ingestion to solve the critical pain point of **secure Over-The-Air (OTA) firmware updates**, remote configuration, and fleet health monitoring.

---

## 🎯 Problem Statement

Updating firmware on 10,000+ devices in the field is a **high-risk operation**. A single failure can brick thousands of units. Existing platforms like ThingsBoard are powerful but complex and heavy. Developers using Node.js often build insecure, homegrown solutions for serving firmware binaries.

**FleetForge solves this by providing:**

- ✅ **Secure OTA Updates** with digital signature validation
- ✅ **Delta Updates** to minimize bandwidth costs (4G/5G/NB-IoT)
- ✅ **Canary Deployments** with automatic rollback
- ✅ **Digital Twin** state synchronization
- ✅ **Edge AI Model Registry** for TensorFlow Lite/ONNX models
- ✅ **Predictive Maintenance** using Isolation Forests

---

## 🏗️ Architecture

FleetForge follows **Hexagonal Architecture** (Ports & Adapters) with **Domain-Driven Design** principles:

```
FleetForge/
├── apps/                    # Microservices
│   ├── api/                # Main REST/GraphQL API
│   ├── mqtt-gateway/       # MQTT Telemetry Ingestion
│   ├── ota-service/        # OTA Update Management
│   └── ai-service/         # Predictive Maintenance
├── libs/                    # Publishable NPM Libraries
│   ├── core/               # @fleetforge/core - Domain Models
│   ├── mqtt-client/        # @fleetforge/mqtt-client
│   ├── ota-client/         # @fleetforge/ota-client
│   ├── sdk/                # @fleetforge/sdk
│   ├── security/           # Crypto & Digital Signatures
│   └── telemetry/          # Telemetry Processing
└── tools/                   # Build & Publish Scripts
```

### Technology Stack

- **Framework**: NestJS 10.3 with TypeScript 5.3
- **Microservices**: MQTT, NATS, RabbitMQ support
- **Database**: MongoDB, PostgreSQL, TimescaleDB
- **Message Queue**: NATS for event streaming
- **AI/ML**: TensorFlow.js for anomaly detection
- **Testing**: Jest with 80%+ coverage
- **Monorepo**: NX Workspace

---

## 🚀 Quick Start

### Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- MongoDB or PostgreSQL
- MQTT Broker (Mosquitto, EMQX, etc.)

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/FleetForge.git
cd FleetForge

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Start development servers
npm run dev
```

### Running Individual Services

```bash
# API Server
nx serve api

# MQTT Gateway
nx serve mqtt-gateway

# OTA Service
nx serve ota-service

# AI Service
nx serve ai-service
```

---

## 📦 NPM Libraries

FleetForge provides reusable libraries for device integration:

### @fleetforge/core

Core domain models, entities, and interfaces.

```bash
npm install @fleetforge/core
```

```typescript
import { Device, DeviceStatus, Location } from '@fleetforge/core';

const device = new Device(/* ... */);
device.updateLocation(new Location(-23.5505, -46.6333, new Date()));
```

### @fleetforge/mqtt-client

MQTT client for device telemetry.

```bash
npm install @fleetforge/mqtt-client
```

### @fleetforge/ota-client

OTA update client for devices.

```bash
npm install @fleetforge/ota-client
```

---

## 🔐 Security Features

- **Digital Signature Validation**: RSA-SHA256, ECDSA-SHA256, Ed25519
- **Firmware Checksum Verification**: SHA256, SHA512
- **Device Authentication**: JWT with mutual TLS
- **Role-Based Access Control**: Fine-grained permissions
- **Audit Logging**: Complete audit trail

---

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:cov

# Run specific library tests
nx test core
```

**Coverage Target**: 80%+ across all packages

---

## 📊 Features

### OTA Updates

- **Delta Updates**: Binary diff to reduce bandwidth
- **Canary Deployments**: Roll out to 5% first, monitor, then expand
- **Automatic Rollback**: Revert on failure threshold
- **Scheduled Deployments**: Deploy during maintenance windows

### Digital Twin

- **State Synchronization**: Desired vs. Reported state
- **Remote Configuration**: Update device settings remotely
- **Shadow Documents**: Offline-capable state management

### Predictive Maintenance

- **Anomaly Detection**: Isolation Forests for pattern recognition
- **Battery Drain Prediction**: Forecast device failures
- **Signal Loss Detection**: Identify connectivity issues

---

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

---

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

---

## 🌟 Why FleetForge?

- **Production-Ready**: Battle-tested patterns and best practices
- **Type-Safe**: Full TypeScript with strict mode
- **Scalable**: Microservices architecture
- **Testable**: High test coverage with Jest
- **Documented**: Comprehensive API documentation
- **Open Source**: MIT licensed, community-driven

---

**Built with ❤️ by the FleetForge Team**

