# FleetForge 🚀

**Enterprise-grade IoT Fleet Management Platform with Multi-Cloud Support**

[![CI](https://github.com/virgilhawkins00/FleetForge/actions/workflows/ci.yml/badge.svg)](https://github.com/virgilhawkins00/FleetForge/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)
[![NestJS](https://img.shields.io/badge/NestJS-10.3-red.svg)](https://nestjs.com/)
[![Test Coverage](https://img.shields.io/badge/coverage-93%25+-brightgreen.svg)](https://github.com/virgilhawkins00/FleetForge)
[![npm](https://img.shields.io/npm/v/@fleetforgeio/core.svg)](https://www.npmjs.com/package/@fleetforgeio/core)

> **FleetForge** is an open-source, production-ready backend platform built with NestJS for managing massive IoT device fleets. It provides **multi-cloud support** (AWS IoT Core, Azure IoT Hub, GCP Pub/Sub), **secure OTA firmware updates**, **digital twin** state synchronization, and **predictive maintenance** using Edge AI.

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
├── apps/                        # Applications
│   ├── api/                    # Main REST API (NestJS)
│   ├── dashboard/              # Web Dashboard (Next.js 14)
│   ├── mqtt-gateway/           # MQTT-to-Cloud Bridge
│   └── cli/                    # Command Line Interface
├── libs/                        # Publishable NPM Libraries
│   ├── core/                   # @fleetforgeio/core
│   ├── database/               # @fleetforgeio/database
│   ├── security/               # @fleetforgeio/security
│   ├── ai/                     # @fleetforgeio/ai
│   ├── ota/                    # @fleetforgeio/ota
│   ├── digital-twin/           # @fleetforgeio/digital-twin
│   ├── aws-integration/        # @fleetforgeio/aws-integration
│   ├── azure-integration/      # @fleetforgeio/azure-integration
│   └── gcp-integration/        # @fleetforgeio/gcp-integration
└── tools/                       # Scripts & Device Simulator
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
git clone https://github.com/virgilhawkins00/FleetForge.git
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

## 📦 NPM Packages

FleetForge provides modular, publishable NPM packages under the `@fleetforgeio` organization:

| Package                                                                                    | Description                                 | Install                            |
| ------------------------------------------------------------------------------------------ | ------------------------------------------- | ---------------------------------- |
| **[@fleetforgeio/core](https://www.npmjs.com/package/@fleetforgeio/core)**                 | Domain entities, interfaces, shared types   | `npm i @fleetforgeio/core`         |
| **[@fleetforgeio/database](https://www.npmjs.com/package/@fleetforgeio/database)**         | MongoDB repositories, schemas, mappers      | `npm i @fleetforgeio/database`     |
| **[@fleetforgeio/security](https://www.npmjs.com/package/@fleetforgeio/security)**         | JWT, Guards, Digital Signatures, Encryption | `npm i @fleetforgeio/security`     |
| **[@fleetforgeio/ai](https://www.npmjs.com/package/@fleetforgeio/ai)**                     | Anomaly detection, Predictive maintenance   | `npm i @fleetforgeio/ai`           |
| **[@fleetforgeio/ota](https://www.npmjs.com/package/@fleetforgeio/ota)**                   | OTA updates, Delta updates, Rollback        | `npm i @fleetforgeio/ota`          |
| **[@fleetforgeio/digital-twin](https://www.npmjs.com/package/@fleetforgeio/digital-twin)** | Shadow state management, Sync engine        | `npm i @fleetforgeio/digital-twin` |

### ☁️ Cloud Integration Packages

| Package                                                                                              | Cloud Provider | Services                                    |
| ---------------------------------------------------------------------------------------------------- | -------------- | ------------------------------------------- |
| **[@fleetforgeio/aws-integration](https://www.npmjs.com/package/@fleetforgeio/aws-integration)**     | AWS            | IoT Core, S3, Timestream                    |
| **[@fleetforgeio/azure-integration](https://www.npmjs.com/package/@fleetforgeio/azure-integration)** | Azure          | IoT Hub, Blob Storage, Data Explorer        |
| **[@fleetforgeio/gcp-integration](https://www.npmjs.com/package/@fleetforgeio/gcp-integration)**     | GCP            | Pub/Sub, Cloud Storage, BigQuery, Vertex AI |

### Quick Example

```typescript
import { createAWSModule } from '@fleetforgeio/aws-integration';
import { createAzureModule } from '@fleetforgeio/azure-integration';
import { createGCPModule } from '@fleetforgeio/gcp-integration';

// AWS IoT Core
const aws = createAWSModule({ iotCore: { region: 'us-east-1' } });
await aws.iotCore?.createThing('device-001');

// Azure IoT Hub
const azure = createAzureModule({ iotHub: { connectionString: '...' } });
await azure.iotHub?.createDevice('device-001');

// GCP Pub/Sub
const gcp = createGCPModule({ pubsub: { projectId: 'my-project' } });
await gcp.pubsub?.publishTelemetry('topic', { temp: 25.5 });
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
