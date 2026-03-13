/**
 * AWS IoT Core Service
 * Manages IoT Things, policies, certificates and MQTT publishing
 */

import {
  IoTClient,
  CreateThingCommand,
  DeleteThingCommand,
  DescribeThingCommand,
  ListThingsCommand,
  UpdateThingCommand,
  ListThingTypesCommand,
  AddThingToThingGroupCommand,
  CreateThingGroupCommand,
  ListThingGroupsCommand,
  AttachPolicyCommand,
  AttachThingPrincipalCommand,
  ListThingPrincipalsCommand,
} from '@aws-sdk/client-iot';
import {
  IoTDataPlaneClient,
  PublishCommand,
  GetThingShadowCommand,
  UpdateThingShadowCommand,
  DeleteThingShadowCommand,
} from '@aws-sdk/client-iot-data-plane';
import {
  IoTCoreConfig,
  ThingRegistration,
  ThingInfo,
  DeviceShadow,
  PublishOptions,
  PublishResult,
} from '../types';

export class IoTCoreService {
  private iotClient: IoTClient;
  private dataClient: IoTDataPlaneClient;
  private config: IoTCoreConfig;
  private initialized = false;

  constructor(config: IoTCoreConfig) {
    this.config = config;
    this.iotClient = new IoTClient({
      region: config.region,
      credentials: config.credentials,
      endpoint: config.endpoint,
    });
    this.dataClient = new IoTDataPlaneClient({
      region: config.region,
      credentials: config.credentials,
      endpoint: config.iotEndpoint ? `https://${config.iotEndpoint}` : config.endpoint,
    });
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;
    await this.iotClient.send(new ListThingTypesCommand({ maxResults: 1 }));
    this.initialized = true;
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  async createThing(registration: ThingRegistration): Promise<ThingInfo> {
    const response = await this.iotClient.send(
      new CreateThingCommand({
        thingName: registration.thingName,
        thingTypeName: registration.thingTypeName || this.config.thingTypeName,
        attributePayload: registration.attributes
          ? { attributes: registration.attributes }
          : undefined,
        billingGroupName: registration.billingGroupName,
      }),
    );
    return {
      thingName: response.thingName ?? '',
      thingId: response.thingId ?? '',
      thingArn: response.thingArn ?? '',
      thingTypeName: registration.thingTypeName,
      attributes: registration.attributes || {},
      version: 1,
    };
  }

  async getThing(thingName: string): Promise<ThingInfo | null> {
    try {
      const response = await this.iotClient.send(new DescribeThingCommand({ thingName }));
      return {
        thingName: response.thingName ?? '',
        thingId: response.thingId ?? '',
        thingArn: response.thingArn ?? '',
        thingTypeName: response.thingTypeName,
        attributes: response.attributes || {},
        version: response.version || 1,
      };
    } catch (error: unknown) {
      const err = error as { name?: string };
      if (err.name === 'ResourceNotFoundException') {
        return null;
      }
      throw error;
    }
  }

  async updateThing(thingName: string, attributes: Record<string, string>): Promise<void> {
    await this.iotClient.send(
      new UpdateThingCommand({ thingName, attributePayload: { attributes } }),
    );
  }

  async deleteThing(thingName: string): Promise<void> {
    await this.iotClient.send(new DeleteThingCommand({ thingName }));
  }

  async listThings(
    maxResults = 100,
    nextToken?: string,
  ): Promise<{ things: ThingInfo[]; nextToken?: string }> {
    const response = await this.iotClient.send(new ListThingsCommand({ maxResults, nextToken }));
    return {
      things: (response.things || []).map((t) => ({
        thingName: t.thingName ?? '',
        thingId: '',
        thingArn: t.thingArn ?? '',
        thingTypeName: t.thingTypeName,
        attributes: t.attributes || {},
        version: t.version || 1,
      })),
      nextToken: response.nextToken,
    };
  }

  // Shadow Operations
  async getShadow(thingName: string): Promise<DeviceShadow | null> {
    try {
      const response = await this.dataClient.send(new GetThingShadowCommand({ thingName }));
      const payload = new TextDecoder().decode(response.payload);
      return JSON.parse(payload) as DeviceShadow;
    } catch (error: unknown) {
      const err = error as { name?: string };
      if (err.name === 'ResourceNotFoundException') {
        return null;
      }
      throw error;
    }
  }

  async updateShadow(
    thingName: string,
    state: { desired?: Record<string, unknown>; reported?: Record<string, unknown> },
  ): Promise<DeviceShadow> {
    const payload = JSON.stringify({ state });
    const response = await this.dataClient.send(
      new UpdateThingShadowCommand({
        thingName,
        payload: new TextEncoder().encode(payload),
      }),
    );
    const responsePayload = new TextDecoder().decode(response.payload);
    return JSON.parse(responsePayload) as DeviceShadow;
  }

  async deleteShadow(thingName: string): Promise<void> {
    await this.dataClient.send(new DeleteThingShadowCommand({ thingName }));
  }

  // MQTT Publishing
  async publish(
    topic: string,
    payload: Record<string, unknown>,
    options: PublishOptions = {},
  ): Promise<PublishResult> {
    const payloadString = JSON.stringify(payload);
    await this.dataClient.send(
      new PublishCommand({
        topic,
        payload: new TextEncoder().encode(payloadString),
        qos: options.qos || 1,
        retain: options.retain || false,
      }),
    );
    return {
      topic,
      timestamp: new Date(),
    };
  }

  async publishCommand(
    deviceId: string,
    command: string,
    payload: Record<string, unknown>,
  ): Promise<PublishResult> {
    const topic = `fleetforge/devices/${deviceId}/commands/${command}`;
    return this.publish(topic, payload);
  }

  async publishTelemetry(
    deviceId: string,
    telemetry: Record<string, unknown>,
  ): Promise<PublishResult> {
    const topic = `fleetforge/devices/${deviceId}/telemetry`;
    return this.publish(topic, { ...telemetry, timestamp: new Date().toISOString() });
  }

  // Thing Groups
  async createThingGroup(
    groupName: string,
    parentGroupName?: string,
  ): Promise<{ groupName: string; groupArn: string }> {
    const response = await this.iotClient.send(
      new CreateThingGroupCommand({ thingGroupName: groupName, parentGroupName }),
    );
    return {
      groupName: response.thingGroupName ?? '',
      groupArn: response.thingGroupArn ?? '',
    };
  }

  async addThingToGroup(thingName: string, groupName: string): Promise<void> {
    await this.iotClient.send(
      new AddThingToThingGroupCommand({ thingName, thingGroupName: groupName }),
    );
  }

  async listThingGroups(): Promise<{ groupName: string; groupArn: string }[]> {
    const response = await this.iotClient.send(new ListThingGroupsCommand({}));
    return (response.thingGroups || []).map((g) => ({
      groupName: g.groupName ?? '',
      groupArn: g.groupArn ?? '',
    }));
  }

  // Certificate and Policy Management
  async attachPolicy(policyName: string, principal: string): Promise<void> {
    await this.iotClient.send(new AttachPolicyCommand({ policyName, target: principal }));
  }

  async attachCertificateToThing(thingName: string, certificateArn: string): Promise<void> {
    await this.iotClient.send(
      new AttachThingPrincipalCommand({ thingName, principal: certificateArn }),
    );
  }

  async listThingCertificates(thingName: string): Promise<string[]> {
    const response = await this.iotClient.send(new ListThingPrincipalsCommand({ thingName }));
    return response.principals || [];
  }
}
