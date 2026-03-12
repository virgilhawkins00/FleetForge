import { PubSub, Topic, Subscription, Message } from '@google-cloud/pubsub';
import {
  PubSubConfig,
  TelemetryMessage,
  DeviceCommand,
  DeviceEvent,
  PublishResult,
  SubscriptionOptions,
  MessageHandler,
} from '../types';

/**
 * Google Cloud Pub/Sub Service for IoT telemetry and messaging
 * Post-IoT Core architecture using direct Pub/Sub integration
 */
export class PubSubService {
  private client: PubSub;
  private config: PubSubConfig;
  private topics: Map<string, Topic> = new Map();
  private subscriptions: Map<string, Subscription> = new Map();

  constructor(config: PubSubConfig) {
    this.config = {
      telemetryTopic: 'fleetforge-telemetry',
      commandsTopic: 'fleetforge-commands',
      eventsTopic: 'fleetforge-events',
      deadLetterTopic: 'fleetforge-dead-letter',
      ...config,
    };

    this.client = new PubSub({
      projectId: config.projectId,
      keyFilename: config.credentials,
    });
  }

  /**
   * Initialize topics and subscriptions
   */
  async initialize(): Promise<void> {
    const topicNames = [
      this.config.telemetryTopic!,
      this.config.commandsTopic!,
      this.config.eventsTopic!,
      this.config.deadLetterTopic!,
    ];

    for (const topicName of topicNames) {
      await this.ensureTopic(topicName);
    }
  }

  /**
   * Ensure a topic exists, create if not
   */
  private async ensureTopic(topicName: string): Promise<Topic> {
    if (this.topics.has(topicName)) {
      return this.topics.get(topicName)!;
    }

    const topic = this.client.topic(topicName);
    const [exists] = await topic.exists();

    if (!exists) {
      await topic.create();
    }

    this.topics.set(topicName, topic);
    return topic;
  }

  /**
   * Publish telemetry data from IoT devices
   */
  async publishTelemetry(message: TelemetryMessage): Promise<PublishResult> {
    const topic = await this.ensureTopic(this.config.telemetryTopic!);
    const data = Buffer.from(JSON.stringify(message));

    const messageId = await topic.publishMessage({
      data,
      attributes: {
        deviceId: message.deviceId,
        fleetId: message.fleetId || '',
        messageType: 'telemetry',
      },
    });

    return {
      messageId,
      topic: this.config.telemetryTopic!,
      timestamp: new Date(),
    };
  }

  /**
   * Publish command to a specific device
   */
  async publishCommand(command: DeviceCommand): Promise<PublishResult> {
    const topic = await this.ensureTopic(this.config.commandsTopic!);
    const data = Buffer.from(JSON.stringify(command));

    const messageId = await topic.publishMessage({
      data,
      attributes: {
        deviceId: command.deviceId,
        commandType: command.commandType,
        correlationId: command.correlationId || '',
      },
    });

    return {
      messageId,
      topic: this.config.commandsTopic!,
      timestamp: new Date(),
    };
  }

  /**
   * Publish device event (connect, disconnect, errors)
   */
  async publishEvent(event: DeviceEvent): Promise<PublishResult> {
    const topic = await this.ensureTopic(this.config.eventsTopic!);
    const data = Buffer.from(JSON.stringify(event));

    const messageId = await topic.publishMessage({
      data,
      attributes: {
        deviceId: event.deviceId,
        eventType: event.eventType,
      },
    });

    return {
      messageId,
      topic: this.config.eventsTopic!,
      timestamp: new Date(),
    };
  }

  /**
   * Subscribe to telemetry messages
   */
  async subscribeTelemetry(
    subscriptionName: string,
    handler: MessageHandler<TelemetryMessage>,
    options?: SubscriptionOptions,
  ): Promise<void> {
    await this.subscribe(this.config.telemetryTopic!, subscriptionName, handler, options);
  }

  /**
   * Subscribe to command messages (for device gateway)
   */
  async subscribeCommands(
    subscriptionName: string,
    handler: MessageHandler<DeviceCommand>,
    options?: SubscriptionOptions,
  ): Promise<void> {
    await this.subscribe(this.config.commandsTopic!, subscriptionName, handler, options);
  }

  /**
   * Generic subscribe method
   */
  private async subscribe<T>(
    topicName: string,
    subscriptionName: string,
    handler: MessageHandler<T>,
    options?: SubscriptionOptions,
  ): Promise<void> {
    const topic = await this.ensureTopic(topicName);
    let subscription = this.subscriptions.get(subscriptionName);

    if (!subscription) {
      const [exists] = await this.client.subscription(subscriptionName).exists();
      if (!exists) {
        [subscription] = await topic.createSubscription(subscriptionName, {
          ackDeadlineSeconds: options?.ackDeadlineSeconds || 60,
          deadLetterPolicy: {
            deadLetterTopic: `projects/${this.config.projectId}/topics/${this.config.deadLetterTopic}`,
            maxDeliveryAttempts: 5,
          },
        });
      } else {
        subscription = this.client.subscription(subscriptionName);
      }
      this.subscriptions.set(subscriptionName, subscription);
    }

    subscription.on('message', async (message: Message) => {
      try {
        const data = JSON.parse(message.data.toString()) as T;
        await handler(
          data,
          () => message.ack(),
          () => message.nack(),
        );
      } catch (error) {
        console.error('Error processing message:', error);
        message.nack();
      }
    });

    if (options?.flowControl) {
      subscription.setOptions({
        flowControl: options.flowControl,
      });
    }
  }

  /**
   * Close all subscriptions
   */
  async close(): Promise<void> {
    for (const subscription of this.subscriptions.values()) {
      subscription.removeAllListeners();
      await subscription.close();
    }
    this.subscriptions.clear();
    await this.client.close();
  }
}
