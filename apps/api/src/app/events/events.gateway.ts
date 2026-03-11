/**
 * Events Gateway - WebSocket Gateway for real-time device communication
 */

import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  MessageBody,
  ConnectedSocket,
  WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UsePipes, ValidationPipe } from '@nestjs/common';
import { JwtService, IJwtPayload, Permission } from '@fleetforge/security';
import { DevicesService } from '../devices/devices.service';
import { TelemetryService } from '../telemetry/telemetry.service';
import {
  TelemetryEventDto,
  DeviceStatusEventDto,
  SubscribeDeviceDto,
  SubscribeFleetDto,
  ShadowUpdateReportedDto,
  ShadowUpdateDesiredDto,
  ShadowGetDeltaDto,
  ShadowAckDto,
  ShadowDeltaEvent,
  ShadowUpdateEvent,
} from './dto';
import { ShadowsService } from '../shadows/shadows.service';

interface AuthenticatedSocket extends Socket {
  user?: IJwtPayload;
}

@WebSocketGateway({
  cors: {
    origin: process.env['CORS_ORIGIN'] || '*',
    credentials: true,
  },
  namespace: '/events',
})
@UsePipes(new ValidationPipe({ transform: true }))
export class EventsGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(EventsGateway.name);
  private connectedClients = new Map<string, AuthenticatedSocket>();
  private deviceSubscriptions = new Map<string, Set<string>>(); // deviceId -> socketIds
  private fleetSubscriptions = new Map<string, Set<string>>(); // fleetId -> socketIds

  constructor(
    private readonly jwtService: JwtService,
    private readonly devicesService: DevicesService,
    private readonly telemetryService: TelemetryService,
    private readonly shadowsService: ShadowsService,
  ) {}

  afterInit(): void {
    this.logger.log('WebSocket Gateway initialized');
  }

  async handleConnection(client: AuthenticatedSocket): Promise<void> {
    try {
      const token = this.extractToken(client);
      if (!token) {
        this.logger.warn(`Client ${client.id} connection rejected: No token`);
        client.disconnect();
        return;
      }

      const payload = await this.jwtService.verifyToken(token);
      client.user = payload;
      this.connectedClients.set(client.id, client);

      this.logger.log(`Client connected: ${client.id} (${payload.type}: ${payload.sub})`);

      client.emit('connected', {
        message: 'Connected to FleetForge WebSocket',
        clientId: client.id,
        timestamp: new Date(),
      });
    } catch (error) {
      this.logger.warn(`Client ${client.id} auth failed: ${(error as Error).message}`);
      client.emit('error', { code: 'AUTH_FAILED', message: 'Authentication failed' });
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket): void {
    this.connectedClients.delete(client.id);
    this.removeFromAllSubscriptions(client.id);
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('subscribe:device')
  async handleSubscribeDevice(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: SubscribeDeviceDto,
  ): Promise<{ success: boolean }> {
    this.validatePermission(client, Permission.DEVICE_READ);

    if (!this.deviceSubscriptions.has(data.deviceId)) {
      this.deviceSubscriptions.set(data.deviceId, new Set());
    }
    this.deviceSubscriptions.get(data.deviceId)!.add(client.id);

    client.join(`device:${data.deviceId}`);
    this.logger.debug(`Client ${client.id} subscribed to device ${data.deviceId}`);

    return { success: true };
  }

  @SubscribeMessage('subscribe:fleet')
  async handleSubscribeFleet(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: SubscribeFleetDto,
  ): Promise<{ success: boolean }> {
    this.validatePermission(client, Permission.FLEET_READ);

    if (!this.fleetSubscriptions.has(data.fleetId)) {
      this.fleetSubscriptions.set(data.fleetId, new Set());
    }
    this.fleetSubscriptions.get(data.fleetId)!.add(client.id);

    client.join(`fleet:${data.fleetId}`);
    this.logger.debug(`Client ${client.id} subscribed to fleet ${data.fleetId}`);

    return { success: true };
  }

  @SubscribeMessage('telemetry')
  async handleTelemetry(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: TelemetryEventDto,
  ): Promise<{ success: boolean; id: string }> {
    this.validatePermission(client, Permission.TELEMETRY_WRITE);

    const now = new Date();
    const telemetry = await this.telemetryService.create({
      deviceId: data.deviceId,
      timestamp: now.toISOString(),
      location: data.location
        ? {
            latitude: data.location.latitude,
            longitude: data.location.longitude,
            altitude: data.location.altitude,
            accuracy: data.location.accuracy,
            timestamp: now.toISOString(),
          }
        : undefined,
      data: data.data,
      batteryLevel: data.batteryLevel,
      signalStrength: data.signalStrength,
    });

    // Broadcast to device subscribers
    this.server.to(`device:${data.deviceId}`).emit('telemetry:update', telemetry);

    return { success: true, id: telemetry.id };
  }

  @SubscribeMessage('device:status')
  async handleDeviceStatus(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: DeviceStatusEventDto,
  ): Promise<{ success: boolean }> {
    this.validatePermission(client, Permission.DEVICE_WRITE);

    await this.devicesService.update(data.deviceId, { status: data.status });

    // Broadcast status change
    this.server.to(`device:${data.deviceId}`).emit('device:status:update', {
      deviceId: data.deviceId,
      status: data.status,
      reason: data.reason,
      timestamp: new Date(),
    });

    return { success: true };
  }

  @SubscribeMessage('unsubscribe:device')
  handleUnsubscribeDevice(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: SubscribeDeviceDto,
  ): { success: boolean } {
    this.deviceSubscriptions.get(data.deviceId)?.delete(client.id);
    client.leave(`device:${data.deviceId}`);
    return { success: true };
  }

  @SubscribeMessage('unsubscribe:fleet')
  handleUnsubscribeFleet(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: SubscribeFleetDto,
  ): { success: boolean } {
    this.fleetSubscriptions.get(data.fleetId)?.delete(client.id);
    client.leave(`fleet:${data.fleetId}`);
    return { success: true };
  }

  // Shadow (Digital Twin) WebSocket handlers
  @SubscribeMessage('shadow:update:reported')
  async handleShadowUpdateReported(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: ShadowUpdateReportedDto,
  ): Promise<{ success: boolean; version: number }> {
    this.validatePermission(client, Permission.TELEMETRY_WRITE);

    const shadow = await this.shadowsService.updateReported(data.deviceId, { state: data.state });

    // Broadcast shadow update to device subscribers
    const event: ShadowUpdateEvent = {
      deviceId: data.deviceId,
      reported: shadow.state.reported,
      delta: shadow.state.delta,
      hasDelta: shadow.hasDelta,
      version: shadow.version,
      timestamp: new Date(),
    };
    this.server.to(`device:${data.deviceId}`).emit('shadow:update', event);

    // If there's a delta, push it to the device
    if (shadow.hasDelta) {
      const deltaEvent: ShadowDeltaEvent = {
        deviceId: data.deviceId,
        delta: shadow.state.delta,
        version: shadow.version,
        timestamp: new Date(),
      };
      this.server.to(`device:${data.deviceId}`).emit('shadow:delta', deltaEvent);
    }

    return { success: true, version: shadow.version };
  }

  @SubscribeMessage('shadow:update:desired')
  async handleShadowUpdateDesired(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: ShadowUpdateDesiredDto,
  ): Promise<{ success: boolean; version: number }> {
    this.validatePermission(client, Permission.DEVICE_WRITE);

    const shadow = await this.shadowsService.updateDesired(data.deviceId, { state: data.state });

    // Broadcast shadow update
    const event: ShadowUpdateEvent = {
      deviceId: data.deviceId,
      desired: shadow.state.desired,
      delta: shadow.state.delta,
      hasDelta: shadow.hasDelta,
      version: shadow.version,
      timestamp: new Date(),
    };
    this.server.to(`device:${data.deviceId}`).emit('shadow:update', event);

    // Push delta to device (device needs to apply changes)
    if (shadow.hasDelta) {
      const deltaEvent: ShadowDeltaEvent = {
        deviceId: data.deviceId,
        delta: shadow.state.delta,
        version: shadow.version,
        timestamp: new Date(),
      };
      this.server.to(`device:${data.deviceId}`).emit('shadow:delta', deltaEvent);
    }

    return { success: true, version: shadow.version };
  }

  @SubscribeMessage('shadow:get:delta')
  async handleShadowGetDelta(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: ShadowGetDeltaDto,
  ): Promise<{ delta: Record<string, unknown>; hasDelta: boolean }> {
    this.validatePermission(client, Permission.DEVICE_READ);

    const delta = await this.shadowsService.getDelta(data.deviceId);
    const hasDelta = Object.keys(delta).length > 0;

    return { delta, hasDelta };
  }

  @SubscribeMessage('shadow:ack')
  async handleShadowAck(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: ShadowAckDto,
  ): Promise<{ success: boolean; version: number }> {
    this.validatePermission(client, Permission.TELEMETRY_WRITE);

    const shadow = await this.shadowsService.markSynced(data.deviceId);

    // Broadcast sync confirmation
    this.server.to(`device:${data.deviceId}`).emit('shadow:synced', {
      deviceId: data.deviceId,
      version: shadow.version,
      timestamp: new Date(),
    });

    return { success: true, version: shadow.version };
  }

  // Public methods for broadcasting from other services
  broadcastToDevice(deviceId: string, event: string, data: unknown): void {
    this.server.to(`device:${deviceId}`).emit(event, data);
  }

  broadcastToFleet(fleetId: string, event: string, data: unknown): void {
    this.server.to(`fleet:${fleetId}`).emit(event, data);
  }

  broadcastToAll(event: string, data: unknown): void {
    this.server.emit(event, data);
  }

  /**
   * Send event directly to a specific device
   */
  sendToDevice(deviceId: string, event: string, data: unknown): void {
    this.server.to(`device:${deviceId}`).emit(event, data);
  }

  /**
   * Broadcast deployment update to all subscribed clients
   */
  broadcastDeploymentUpdate(deploymentId: string, data: unknown): void {
    this.server.to(`deployment:${deploymentId}`).emit('deployment:update', {
      deploymentId,
      ...(data as object),
      timestamp: new Date(),
    });
    // Also broadcast to all clients for dashboard updates
    this.server.emit('deployment:progress', {
      deploymentId,
      ...(data as object),
      timestamp: new Date(),
    });
  }

  getConnectedClientsCount(): number {
    return this.connectedClients.size;
  }

  private extractToken(client: Socket): string | null {
    const authHeader = client.handshake.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.slice(7);
    }
    return client.handshake.auth?.['token'] || null;
  }

  private validatePermission(client: AuthenticatedSocket, permission: Permission): void {
    if (!client.user?.permissions.includes(permission)) {
      throw new WsException({ code: 'FORBIDDEN', message: 'Insufficient permissions' });
    }
  }

  private removeFromAllSubscriptions(clientId: string): void {
    this.deviceSubscriptions.forEach((sockets) => sockets.delete(clientId));
    this.fleetSubscriptions.forEach((sockets) => sockets.delete(clientId));
  }
}
