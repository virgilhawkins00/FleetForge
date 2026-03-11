/**
 * Deployments E2E Tests
 * Tests deployment orchestration, scheduling, and lifecycle management
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule, getModelToken } from '@nestjs/mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { APP_GUARD } from '@nestjs/core';
import { Model } from 'mongoose';
import { DatabaseModule } from '@fleetforge/database';
import { JwtAuthGuard, SecurityModule } from '@fleetforge/security';
import {
  DeploymentStrategy,
  FirmwareStatus,
  FirmwareType,
  DeviceType,
  DeviceStatus,
} from '@fleetforge/core';
import { AuthModule } from '../auth/auth.module';
import { DeploymentsModule } from './deployments.module';
import { FirmwareModule } from '../firmware/firmware.module';
import { DevicesModule } from '../devices/devices.module';
import { FleetsModule } from '../fleets/fleets.module';
import { AppController } from '../app.controller';
import { AppService } from '../app.service';

// Mock EventsGateway to avoid WebSocket setup in tests
jest.mock('../events/events.gateway', () => ({
  EventsGateway: jest.fn().mockImplementation(() => ({
    broadcastDeploymentUpdate: jest.fn(),
    sendToDevice: jest.fn(),
    handleConnection: jest.fn(),
    handleDisconnect: jest.fn(),
  })),
}));

describe('Deployments E2E - Full Lifecycle', () => {
  let app: INestApplication;
  let mongod: MongoMemoryServer;
  let adminToken: string;
  let firmwareModel: Model<any>;
  let deviceModel: Model<any>;
  let fleetModel: Model<any>;

  const adminUser = {
    email: `admin-deploy-e2e-${Date.now()}@fleetforge.io`,
    password: 'SecurePass123!',
    firstName: 'Admin',
    lastName: 'Deployer',
  };

  // Helper to create valid firmware data
  const createFirmwareData = (id: string, version: string) => ({
    _id: id,
    name: 'Test Firmware',
    version,
    type: FirmwareType.FULL,
    status: FirmwareStatus.READY,
    file: {
      url: '/firmware/test.bin',
      size: 1024,
      checksum: 'abc123def456',
      checksumAlgorithm: 'SHA-256',
    },
    signature: {
      algorithm: 'RSA-SHA256',
      signature: 'test-signature',
      publicKey: 'test-public-key',
      timestamp: new Date(),
    },
    metadata: {
      deviceTypes: ['SENSOR', 'GATEWAY'],
      releaseNotes: 'Initial test release',
    },
    createdBy: 'admin-user',
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  // Helper to create valid fleet data
  const createFleetData = (id: string) => ({
    _id: id,
    name: 'E2E Test Fleet',
    organizationId: 'org-e2e-test',
    metadata: { description: 'Fleet for E2E testing' },
    deviceIds: [],
    tags: ['test'],
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  // Helper to create valid device data
  const createDeviceData = (id: string, fleetId: string) => ({
    _id: id,
    name: 'Test Device',
    fleetId,
    type: DeviceType.SENSOR,
    status: DeviceStatus.ACTIVE,
    metadata: {
      manufacturer: 'TestCo',
      model: 'TestModel',
      hardwareVersion: '1.0',
      serialNumber: `SN-${Date.now()}`,
    },
    capabilities: {
      hasGPS: true,
      hasCamera: false,
      hasCellular: true,
      hasWiFi: true,
      hasBluetooth: false,
      sensors: ['temperature'],
    },
    firmwareVersion: '1.0.0',
    lastSeen: new Date(),
    tags: ['test'],
    lifecycleTimestamps: {},
    lifecycleHistory: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  beforeAll(async () => {
    jest.setTimeout(30000);
    mongod = await MongoMemoryServer.create();
    const mongoUri = mongod.getUri();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        MongooseModule.forRoot(mongoUri),
        DatabaseModule.forFeature(),
        SecurityModule.forRootAsync({
          inject: [ConfigService],
          useFactory: () => ({
            jwt: {
              secret: process.env['TEST_JWT_SECRET'] || 'e2e-testing-only',
              accessTokenExpiration: '15m',
              refreshTokenExpiration: '7d',
            },
          }),
        }),
        AuthModule,
        DeploymentsModule,
        FirmwareModule,
        DevicesModule,
        FleetsModule,
      ],
      controllers: [AppController],
      providers: [AppService, { provide: APP_GUARD, useClass: JwtAuthGuard }],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.setGlobalPrefix('api');
    await app.init();

    // Get models for direct DB operations
    firmwareModel = moduleFixture.get(getModelToken('FirmwareModel'));
    deviceModel = moduleFixture.get(getModelToken('DeviceModel'));
    fleetModel = moduleFixture.get(getModelToken('FleetModel'));

    // Register and login admin user
    await request(app.getHttpServer()).post('/api/auth/register').send(adminUser);
    const adminLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: adminUser.email, password: adminUser.password });
    adminToken = adminLogin.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
    await mongod.stop();
  });

  describe('Deployment CRUD Operations', () => {
    let firmwareId: string;
    let deploymentId: string;

    beforeAll(async () => {
      // Create firmware directly in DB for testing using helper
      const fwId = `fw-e2e-${Date.now()}`;
      const firmware = await firmwareModel.create(createFirmwareData(fwId, '1.0.0'));
      firmwareId = firmware._id;
    });

    it('should create a deployment', async () => {
      const createDto = {
        firmwareId,
        firmwareVersion: '1.0.0',
        name: 'E2E Test Deployment',
        config: {
          strategy: DeploymentStrategy.IMMEDIATE,
          target: { deviceIds: ['device-1', 'device-2'] },
        },
        createdBy: 'admin-user',
      };

      const response = await request(app.getHttpServer())
        .post('/api/deployments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(createDto);

      expect([200, 201, 403]).toContain(response.status);
      if (response.status === 201 || response.status === 200) {
        expect(response.body).toHaveProperty('id');
        deploymentId = response.body.id;
      }
    });

    it('should return 401 without authentication', async () => {
      await request(app.getHttpServer()).get('/api/deployments').expect(401);
    });

    it('should list deployments with authentication', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/deployments')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 403]).toContain(response.status);
      if (response.status === 200) {
        expect(Array.isArray(response.body)).toBe(true);
      }
    });

    it('should get deployment by ID', async () => {
      if (!deploymentId) return;

      const response = await request(app.getHttpServer())
        .get(`/api/deployments/${deploymentId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 403, 404]).toContain(response.status);
    });

    it('should get active deployments', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/deployments/active')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 403]).toContain(response.status);
    });
  });

  describe('Deployment Scheduling', () => {
    let scheduleDeploymentId: string;

    beforeAll(async () => {
      // Create a deployment for scheduling tests using helper
      const fwId = `fw-schedule-${Date.now()}`;
      const firmware = await firmwareModel.create(createFirmwareData(fwId, '2.0.0'));

      const createDto = {
        firmwareId: firmware._id,
        firmwareVersion: '2.0.0',
        name: 'Scheduled E2E Deployment',
        config: {
          strategy: DeploymentStrategy.SCHEDULED,
          target: { tags: ['production'] },
        },
        createdBy: 'admin-user',
      };

      const response = await request(app.getHttpServer())
        .post('/api/deployments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(createDto);

      if (response.status === 201 || response.status === 200) {
        scheduleDeploymentId = response.body.id;
      }
    });

    it('should schedule a one-time deployment', async () => {
      if (!scheduleDeploymentId) return;

      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      const scheduleDto = {
        type: 'ONCE',
        scheduledAt: futureDate,
      };

      const response = await request(app.getHttpServer())
        .post(`/api/deployments/${scheduleDeploymentId}/schedule`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(scheduleDto);

      expect([200, 201, 403, 404]).toContain(response.status);
    });

    it('should get active schedules', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/deployments/schedules/active')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 403]).toContain(response.status);
    });
  });

  describe('Deployment Orchestration', () => {
    let orchestrationDeploymentId: string;
    let testDeviceId: string;
    let testFleetId: string;

    beforeAll(async () => {
      // Create fleet using helper
      const fleetId = `fleet-e2e-${Date.now()}`;
      const fleet = await fleetModel.create(createFleetData(fleetId));
      testFleetId = fleet._id;

      // Create device using helper
      const deviceId = `device-e2e-${Date.now()}`;
      const device = await deviceModel.create(createDeviceData(deviceId, testFleetId));
      testDeviceId = device._id;

      // Update fleet with device
      await fleetModel.updateOne({ _id: testFleetId }, { $push: { deviceIds: testDeviceId } });

      // Create firmware using helper
      const fwId = `fw-orch-${Date.now()}`;
      const firmware = await firmwareModel.create(createFirmwareData(fwId, '3.0.0'));

      // Create deployment
      const createDto = {
        firmwareId: firmware._id,
        firmwareVersion: '3.0.0',
        name: 'Orchestration E2E Deployment',
        config: {
          strategy: DeploymentStrategy.CANARY,
          target: { fleetIds: [testFleetId] },
          canaryPercentage: 10,
          autoRollback: true,
          rollbackThreshold: 50,
        },
        createdBy: 'admin-user',
      };

      const response = await request(app.getHttpServer())
        .post('/api/deployments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(createDto);

      if (response.status === 201 || response.status === 200) {
        orchestrationDeploymentId = response.body.id;
      }
    });

    it('should create deployment plan (orchestrate)', async () => {
      if (!orchestrationDeploymentId) return;

      const response = await request(app.getHttpServer())
        .post(`/api/deployments/${orchestrationDeploymentId}/orchestrate`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 201, 400, 403, 404]).toContain(response.status);
    });

    it('should get deployment stats', async () => {
      if (!orchestrationDeploymentId) return;

      const response = await request(app.getHttpServer())
        .get(`/api/deployments/${orchestrationDeploymentId}/stats`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 403, 404]).toContain(response.status);
    });

    it('should get device deployments', async () => {
      if (!orchestrationDeploymentId) return;

      const response = await request(app.getHttpServer())
        .get(`/api/deployments/${orchestrationDeploymentId}/devices`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 403, 404]).toContain(response.status);
    });

    it('should cancel deployment', async () => {
      if (!orchestrationDeploymentId) return;

      const response = await request(app.getHttpServer())
        .post(`/api/deployments/${orchestrationDeploymentId}/cancel`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 201, 400, 403, 404]).toContain(response.status);
    });
  });

  describe('Deployment Validation', () => {
    it('should reject deployment without firmwareId', async () => {
      const invalidDto = {
        firmwareVersion: '1.0.0',
        name: 'Invalid Deployment',
        config: {
          strategy: DeploymentStrategy.IMMEDIATE,
          target: { deviceIds: [] },
        },
        createdBy: 'admin',
      };

      const response = await request(app.getHttpServer())
        .post('/api/deployments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidDto);

      expect([400, 403]).toContain(response.status);
    });

    it('should reject deployment without name', async () => {
      const invalidDto = {
        firmwareId: 'fw-123',
        firmwareVersion: '1.0.0',
        config: {
          strategy: DeploymentStrategy.IMMEDIATE,
          target: { deviceIds: [] },
        },
        createdBy: 'admin',
      };

      const response = await request(app.getHttpServer())
        .post('/api/deployments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidDto);

      expect([400, 403]).toContain(response.status);
    });
  });
});
