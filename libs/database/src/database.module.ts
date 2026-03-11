/**
 * Database Module
 * Configures MongoDB connection and provides repositories
 */

import { Module, DynamicModule, Global } from '@nestjs/common';
import { MongooseModule, MongooseModuleOptions } from '@nestjs/mongoose';
import {
  DeviceModel,
  DeviceSchema,
  DeviceShadowModel,
  DeviceShadowSchema,
  DeviceDeploymentModel,
  DeviceDeploymentSchema,
  FleetModel,
  FleetSchema,
  FirmwareModel,
  FirmwareSchema,
  DeploymentModel,
  DeploymentSchema,
  TelemetryModel,
  TelemetrySchema,
  UserModel,
  UserSchema,
} from './schemas';
import {
  DeviceRepository,
  DeviceShadowRepository,
  DeviceDeploymentRepository,
  FleetRepository,
  FirmwareRepository,
  DeploymentRepository,
  TelemetryRepository,
  UserRepository,
} from './repositories';

export interface DatabaseModuleOptions {
  uri: string;
  options?: MongooseModuleOptions;
}

const SCHEMAS = [
  { name: DeviceModel.name, schema: DeviceSchema },
  { name: DeviceShadowModel.name, schema: DeviceShadowSchema },
  { name: DeviceDeploymentModel.name, schema: DeviceDeploymentSchema },
  { name: FleetModel.name, schema: FleetSchema },
  { name: FirmwareModel.name, schema: FirmwareSchema },
  { name: DeploymentModel.name, schema: DeploymentSchema },
  { name: TelemetryModel.name, schema: TelemetrySchema },
  { name: UserModel.name, schema: UserSchema },
];

const REPOSITORIES = [
  DeviceRepository,
  DeviceShadowRepository,
  DeviceDeploymentRepository,
  FleetRepository,
  FirmwareRepository,
  DeploymentRepository,
  TelemetryRepository,
  UserRepository,
];

@Global()
@Module({})
export class DatabaseModule {
  /**
   * Configure the database module with connection URI
   */
  static forRoot(options: DatabaseModuleOptions): DynamicModule {
    return {
      module: DatabaseModule,
      imports: [
        MongooseModule.forRoot(options.uri, {
          ...options.options,
        }),
        MongooseModule.forFeature(SCHEMAS),
      ],
      providers: [...REPOSITORIES],
      exports: [...REPOSITORIES],
    };
  }

  /**
   * Configure for async initialization (e.g., with ConfigService)
   */
  static forRootAsync(options: {
    imports?: any[];
    useFactory: (...args: any[]) => Promise<DatabaseModuleOptions> | DatabaseModuleOptions;
    inject?: any[];
  }): DynamicModule {
    return {
      module: DatabaseModule,
      imports: [
        MongooseModule.forRootAsync({
          imports: options.imports,
          useFactory: async (...args: any[]) => {
            const config = await options.useFactory(...args);
            return {
              uri: config.uri,
              ...config.options,
            };
          },
          inject: options.inject,
        }),
        MongooseModule.forFeature(SCHEMAS),
      ],
      providers: [...REPOSITORIES],
      exports: [...REPOSITORIES],
    };
  }

  /**
   * Import only the feature schemas (for testing)
   */
  static forFeature(): DynamicModule {
    return {
      module: DatabaseModule,
      imports: [MongooseModule.forFeature(SCHEMAS)],
      providers: [...REPOSITORIES],
      exports: [...REPOSITORIES],
    };
  }
}
