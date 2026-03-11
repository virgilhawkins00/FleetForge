/**
 * EventsGateway Unit Tests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { WsException } from '@nestjs/websockets';
import { EventsGateway } from './events.gateway';
import { JwtService, Permission, UserRole } from '@fleetforge/security';
import { DevicesService } from '../devices/devices.service';
import { TelemetryService } from '../telemetry/telemetry.service';
import { ShadowsService } from '../shadows/shadows.service';
import { Server, Socket } from 'socket.io';

describe('EventsGateway', () => {
  let gateway: EventsGateway;
  let jwtService: jest.Mocked<JwtService>;
  let devicesService: jest.Mocked<DevicesService>;
  let telemetryService: jest.Mocked<TelemetryService>;
  let shadowsService: jest.Mocked<ShadowsService>;

  const mockServer = {
    to: jest.fn().mockReturnThis(),
    emit: jest.fn(),
  } as unknown as Server;

  const createMockClient = (user?: { sub: string; permissions: Permission[] }) =>
    ({
      id: 'client-123',
      user: user ? { ...user, type: 'user' } : undefined,
      handshake: {
        headers: { authorization: 'Bearer test-token' },
        auth: {},
      },
      emit: jest.fn(),
      disconnect: jest.fn(),
      join: jest.fn(),
      leave: jest.fn(),
    }) as unknown as Socket & { user?: { sub: string; permissions: Permission[]; type: string } };

  beforeEach(async () => {
    const mockJwtService = {
      verifyToken: jest.fn(),
    };

    const mockDevicesService = {
      update: jest.fn(),
    };

    const mockTelemetryService = {
      create: jest.fn(),
    };

    const mockShadowsService = {
      updateReported: jest.fn(),
      updateDesired: jest.fn(),
      getDelta: jest.fn(),
      markSynced: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventsGateway,
        { provide: JwtService, useValue: mockJwtService },
        { provide: DevicesService, useValue: mockDevicesService },
        { provide: TelemetryService, useValue: mockTelemetryService },
        { provide: ShadowsService, useValue: mockShadowsService },
      ],
    }).compile();

    gateway = module.get<EventsGateway>(EventsGateway);
    gateway.server = mockServer;
    jwtService = module.get(JwtService);
    devicesService = module.get(DevicesService);
    telemetryService = module.get(TelemetryService);
    shadowsService = module.get(ShadowsService);
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });

  describe('afterInit', () => {
    it('should log initialization', () => {
      expect(() => gateway.afterInit()).not.toThrow();
    });
  });

  describe('handleConnection', () => {
    it('should authenticate and connect client', async () => {
      const client = createMockClient();
      jwtService.verifyToken.mockResolvedValue({
        sub: 'user-1',
        type: 'user',
        role: UserRole.OPERATOR,
        permissions: [Permission.DEVICE_READ],
      });

      await gateway.handleConnection(client as any);

      expect(client.emit).toHaveBeenCalledWith('connected', expect.any(Object));
    });

    it('should disconnect client without token', async () => {
      const client = createMockClient();
      (client.handshake as any).headers = {};

      await gateway.handleConnection(client as any);

      expect(client.disconnect).toHaveBeenCalled();
    });

    it('should disconnect client on auth failure', async () => {
      const client = createMockClient();
      jwtService.verifyToken.mockRejectedValue(new Error('Invalid token'));

      await gateway.handleConnection(client as any);

      expect(client.disconnect).toHaveBeenCalled();
    });
  });

  describe('handleDisconnect', () => {
    it('should handle disconnect', () => {
      const client = createMockClient();

      expect(() => gateway.handleDisconnect(client as any)).not.toThrow();
    });
  });

  describe('handleSubscribeDevice', () => {
    it('should subscribe client to device', async () => {
      const client = createMockClient({ sub: 'user-1', permissions: [Permission.DEVICE_READ] });

      const result = await gateway.handleSubscribeDevice(client as any, { deviceId: 'device-1' });

      expect(result).toEqual({ success: true });
      expect(client.join).toHaveBeenCalledWith('device:device-1');
    });
  });

  describe('handleTelemetry', () => {
    it('should create telemetry and broadcast', async () => {
      const client = createMockClient({ sub: 'user-1', permissions: [Permission.TELEMETRY_WRITE] });
      telemetryService.create.mockResolvedValue({ id: 'tel-1' } as any);

      const result = await gateway.handleTelemetry(client as any, {
        deviceId: 'device-1',
        data: { temp: 25 },
      });

      expect(result.success).toBe(true);
      expect(result.id).toBe('tel-1');
    });
  });

  describe('broadcastToDevice', () => {
    it('should broadcast to device room', () => {
      gateway.broadcastToDevice('device-1', 'test', { data: 'test' });

      expect(mockServer.to).toHaveBeenCalledWith('device:device-1');
    });
  });

  describe('getConnectedClientsCount', () => {
    it('should return client count', () => {
      const count = gateway.getConnectedClientsCount();

      expect(typeof count).toBe('number');
    });
  });

  describe('handleSubscribeFleet', () => {
    it('should subscribe client to fleet', async () => {
      const client = createMockClient({ sub: 'user-1', permissions: [Permission.FLEET_READ] });

      const result = await gateway.handleSubscribeFleet(client as any, { fleetId: 'fleet-1' });

      expect(result).toEqual({ success: true });
      expect(client.join).toHaveBeenCalledWith('fleet:fleet-1');
    });

    it('should throw when no permission', async () => {
      const client = createMockClient({ sub: 'user-1', permissions: [] });

      await expect(
        gateway.handleSubscribeFleet(client as any, { fleetId: 'fleet-1' }),
      ).rejects.toThrow(WsException);
    });
  });

  describe('handleDeviceStatus', () => {
    it('should update device status and broadcast', async () => {
      const client = createMockClient({ sub: 'user-1', permissions: [Permission.DEVICE_WRITE] });
      devicesService.update.mockResolvedValue({} as any);

      const result = await gateway.handleDeviceStatus(client as any, {
        deviceId: 'device-1',
        status: 'ACTIVE',
        reason: 'Test reason',
      });

      expect(result).toEqual({ success: true });
      expect(devicesService.update).toHaveBeenCalledWith('device-1', { status: 'ACTIVE' });
    });
  });

  describe('handleUnsubscribeDevice', () => {
    it('should unsubscribe client from device', () => {
      const client = createMockClient({ sub: 'user-1', permissions: [] });

      const result = gateway.handleUnsubscribeDevice(client as any, { deviceId: 'device-1' });

      expect(result).toEqual({ success: true });
      expect(client.leave).toHaveBeenCalledWith('device:device-1');
    });
  });

  describe('handleUnsubscribeFleet', () => {
    it('should unsubscribe client from fleet', () => {
      const client = createMockClient({ sub: 'user-1', permissions: [] });

      const result = gateway.handleUnsubscribeFleet(client as any, { fleetId: 'fleet-1' });

      expect(result).toEqual({ success: true });
      expect(client.leave).toHaveBeenCalledWith('fleet:fleet-1');
    });
  });

  describe('handleShadowUpdateReported', () => {
    it('should update reported state and broadcast', async () => {
      const client = createMockClient({ sub: 'user-1', permissions: [Permission.TELEMETRY_WRITE] });
      shadowsService.updateReported.mockResolvedValue({
        state: { reported: { temp: 25 }, delta: {} },
        hasDelta: false,
        version: 1,
      } as any);

      const result = await gateway.handleShadowUpdateReported(client as any, {
        deviceId: 'device-1',
        state: { temp: 25 },
      });

      expect(result.success).toBe(true);
      expect(result.version).toBe(1);
    });

    it('should emit delta when hasDelta is true', async () => {
      const client = createMockClient({ sub: 'user-1', permissions: [Permission.TELEMETRY_WRITE] });
      shadowsService.updateReported.mockResolvedValue({
        state: { reported: { temp: 25 }, delta: { mode: 'auto' } },
        hasDelta: true,
        version: 2,
      } as any);

      await gateway.handleShadowUpdateReported(client as any, {
        deviceId: 'device-1',
        state: { temp: 25 },
      });

      expect(mockServer.to).toHaveBeenCalledWith('device:device-1');
    });
  });

  describe('handleShadowUpdateDesired', () => {
    it('should update desired state', async () => {
      const client = createMockClient({ sub: 'user-1', permissions: [Permission.DEVICE_WRITE] });
      shadowsService.updateDesired.mockResolvedValue({
        state: { desired: { mode: 'auto' }, delta: { mode: 'auto' } },
        hasDelta: true,
        version: 3,
      } as any);

      const result = await gateway.handleShadowUpdateDesired(client as any, {
        deviceId: 'device-1',
        state: { mode: 'auto' },
      });

      expect(result.success).toBe(true);
      expect(result.version).toBe(3);
    });
  });

  describe('handleShadowGetDelta', () => {
    it('should return delta state', async () => {
      const client = createMockClient({ sub: 'user-1', permissions: [Permission.DEVICE_READ] });
      shadowsService.getDelta.mockResolvedValue({ mode: 'auto' });

      const result = await gateway.handleShadowGetDelta(client as any, { deviceId: 'device-1' });

      expect(result.delta).toEqual({ mode: 'auto' });
      expect(result.hasDelta).toBe(true);
    });

    it('should return hasDelta false when no delta', async () => {
      const client = createMockClient({ sub: 'user-1', permissions: [Permission.DEVICE_READ] });
      shadowsService.getDelta.mockResolvedValue({});

      const result = await gateway.handleShadowGetDelta(client as any, { deviceId: 'device-1' });

      expect(result.hasDelta).toBe(false);
    });
  });

  describe('handleShadowAck', () => {
    it('should mark shadow as synced', async () => {
      const client = createMockClient({ sub: 'user-1', permissions: [Permission.TELEMETRY_WRITE] });
      shadowsService.markSynced.mockResolvedValue({ version: 4 } as any);

      const result = await gateway.handleShadowAck(client as any, {
        deviceId: 'device-1',
      });

      expect(result.success).toBe(true);
      expect(result.version).toBe(4);
    });
  });

  describe('broadcastToFleet', () => {
    it('should broadcast to fleet room', () => {
      gateway.broadcastToFleet('fleet-1', 'test', { data: 'test' });

      expect(mockServer.to).toHaveBeenCalledWith('fleet:fleet-1');
    });
  });

  describe('broadcastToAll', () => {
    it('should broadcast to all clients', () => {
      gateway.broadcastToAll('test', { data: 'test' });

      expect(mockServer.emit).toHaveBeenCalledWith('test', { data: 'test' });
    });
  });

  describe('sendToDevice', () => {
    it('should send event to specific device', () => {
      gateway.sendToDevice('device-1', 'command', { action: 'restart' });

      expect(mockServer.to).toHaveBeenCalledWith('device:device-1');
    });
  });

  describe('broadcastDeploymentUpdate', () => {
    it('should broadcast deployment updates', () => {
      gateway.broadcastDeploymentUpdate('deploy-1', { status: 'in_progress', progress: 50 });

      expect(mockServer.to).toHaveBeenCalledWith('deployment:deploy-1');
      expect(mockServer.emit).toHaveBeenCalledWith('deployment:progress', expect.any(Object));
    });
  });

  describe('handleTelemetry with location', () => {
    it('should handle telemetry with location data', async () => {
      const client = createMockClient({ sub: 'user-1', permissions: [Permission.TELEMETRY_WRITE] });
      telemetryService.create.mockResolvedValue({ id: 'tel-2' } as any);

      const result = await gateway.handleTelemetry(client as any, {
        deviceId: 'device-1',
        data: { temp: 25 },
        location: { latitude: -23.5, longitude: -46.6, altitude: 800, accuracy: 10 },
        batteryLevel: 85,
        signalStrength: -70,
      });

      expect(result.success).toBe(true);
      expect(telemetryService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          deviceId: 'device-1',
          batteryLevel: 85,
          signalStrength: -70,
        }),
      );
    });
  });
});
