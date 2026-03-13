// Main module
export { AWSModule, AWSModuleConfig, createAWSModule } from './aws.module';

// Services
export { IoTCoreService } from './iot-core';
export { S3Service, FirmwareArtifact } from './s3';
export { TimestreamService, QueryResult } from './timestream';

// Types
export * from './types';
