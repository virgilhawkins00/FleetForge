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
  OrganizationModel,
  OrganizationSchema,
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
  OrganizationRepository,
} from './repositories';

export interface DatabaseModuleOptions {
  uri: string;
  options?: MongooseModuleOptions;
}

/**
 * Default connection pool and performance options
 */
const DEFAULT_MONGOOSE_OPTIONS: MongooseModuleOptions = {
  // Connection Pool Settings
  maxPoolSize: 100, // Maximum number of connections in pool
  minPoolSize: 10, // Minimum number of connections in pool
  maxIdleTimeMS: 30000, // Close connections idle for 30 seconds

  // Connection Settings
  connectTimeoutMS: 10000, // Timeout for initial connection
  socketTimeoutMS: 45000, // Timeout for socket operations
  serverSelectionTimeoutMS: 5000, // Timeout for server selection

  // Write Concern
  w: 'majority', // Write to majority of replica set
  wtimeoutMS: 10000, // Write concern timeout

  // Read Preference (can be overridden per-query)
  readPreference: 'primaryPreferred',

  // Retry Settings
  retryWrites: true,
  retryReads: true,

  // Compression
  compressors: ['zstd', 'zlib'],
};

const SCHEMAS = [
  { name: DeviceModel.name, schema: DeviceSchema },
  { name: DeviceShadowModel.name, schema: DeviceShadowSchema },
  { name: DeviceDeploymentModel.name, schema: DeviceDeploymentSchema },
  { name: FleetModel.name, schema: FleetSchema },
  { name: FirmwareModel.name, schema: FirmwareSchema },
  { name: DeploymentModel.name, schema: DeploymentSchema },
  { name: TelemetryModel.name, schema: TelemetrySchema },
  { name: UserModel.name, schema: UserSchema },
  { name: OrganizationModel.name, schema: OrganizationSchema },
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
  OrganizationRepository,
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
          ...DEFAULT_MONGOOSE_OPTIONS,
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
              ...DEFAULT_MONGOOSE_OPTIONS,
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
