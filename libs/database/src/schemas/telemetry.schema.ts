/**
 * Telemetry MongoDB Schema
 */

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type TelemetryDocument = HydratedDocument<TelemetryModel>;

@Schema({ _id: false })
export class TelemetrySensorModel {
  @Prop({ required: true })
  name!: string;

  @Prop({ required: true })
  value!: number;

  @Prop({ required: true })
  unit!: string;

  @Prop({ required: true })
  timestamp!: Date;
}

@Schema({ _id: false })
export class TelemetryLocationModel {
  @Prop({ required: true })
  latitude!: number;

  @Prop({ required: true })
  longitude!: number;

  @Prop()
  altitude?: number;

  @Prop()
  accuracy?: number;

  @Prop()
  speed?: number;

  @Prop()
  heading?: number;

  @Prop({ required: true })
  timestamp!: Date;
}

@Schema({ collection: 'telemetry', timestamps: false })
export class TelemetryModel {
  @Prop({ required: true, unique: true })
  _id!: string;

  @Prop({ required: true, index: true })
  deviceId!: string;

  @Prop({ required: true })
  timestamp!: Date;

  @Prop({ type: TelemetryLocationModel })
  location?: TelemetryLocationModel;

  @Prop({ type: Object, default: {} })
  data!: Record<string, number | string | boolean | null>;

  @Prop({ type: [TelemetrySensorModel], default: [] })
  sensors!: TelemetrySensorModel[];

  @Prop()
  batteryLevel?: number;

  @Prop()
  signalStrength?: number;

  @Prop({ required: true })
  receivedAt!: Date;
}

export const TelemetrySchema = SchemaFactory.createForClass(TelemetryModel);

// Compound indexes for time-series queries (single-field indexes defined via @Prop)
TelemetrySchema.index({ deviceId: 1, timestamp: -1 });
TelemetrySchema.index({ deviceId: 1, receivedAt: -1 });
// TTL index to auto-delete old telemetry data after 30 days (uses simple timestamp index)
TelemetrySchema.index({ timestamp: 1 }, { expireAfterSeconds: 2592000, background: true });

// Geospatial index for location-based queries (e.g., find telemetry within a region)
TelemetrySchema.index({ 'location.latitude': 1, 'location.longitude': 1 });

// Sensor data queries
TelemetrySchema.index({ deviceId: 1, 'sensors.name': 1, timestamp: -1 });

// Battery/signal monitoring
TelemetrySchema.index({ deviceId: 1, batteryLevel: 1 }, { sparse: true });
TelemetrySchema.index({ deviceId: 1, signalStrength: 1 }, { sparse: true });
