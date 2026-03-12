# API Architecture

## Overview

The FleetForge API is built with NestJS following clean architecture principles with clear separation between controllers, services, and repositories.

## Design Patterns

### 1. Module Pattern
Each feature is encapsulated in a NestJS module with its own controllers, services, and providers.

```typescript
@Module({
  imports: [DatabaseModule],
  controllers: [DeviceController],
  providers: [DeviceService],
  exports: [DeviceService],
})
export class DeviceModule {}
```

### 2. Repository Pattern
Data access is abstracted through repository interfaces.

```typescript
// libs/database/src/repositories/device.repository.ts
@Injectable()
export class DeviceRepository {
  constructor(@InjectModel(DeviceDoc.name) private model: Model<DeviceDoc>) {}
  
  async findById(id: string): Promise<Device | null> {
    const doc = await this.model.findById(id).exec();
    return doc ? DeviceMapper.toDomain(doc) : null;
  }
}
```

### 3. Interceptor Pattern
Cross-cutting concerns are handled through interceptors.

| Interceptor | Purpose |
|-------------|---------|
| `HttpMetricsInterceptor` | Prometheus metrics |
| `TracingInterceptor` | OpenTelemetry spans |
| `AuditInterceptor` | Audit logging |
| `TransformInterceptor` | Response transformation |

### 4. Guard Pattern
Authentication and authorization use guards.

```typescript
@Controller('devices')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DeviceController {
  @Get()
  @Roles(Role.Admin, Role.Operator)
  findAll() { ... }
}
```

## API Endpoints

### Authentication (`/auth`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/register` | Register new user |
| POST | `/auth/login` | Login, get JWT |
| POST | `/auth/refresh` | Refresh token |
| POST | `/auth/mfa/setup` | Setup MFA |
| POST | `/auth/mfa/verify` | Verify MFA code |

### Devices (`/devices`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/devices` | List all devices |
| POST | `/devices` | Create device |
| GET | `/devices/:id` | Get device by ID |
| PATCH | `/devices/:id` | Update device |
| DELETE | `/devices/:id` | Delete device |
| POST | `/devices/:id/activate` | Activate device |
| POST | `/devices/:id/suspend` | Suspend device |

### Firmware (`/firmware`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/firmware` | List firmware versions |
| POST | `/firmware/upload` | Upload firmware |
| GET | `/firmware/:id` | Get firmware details |
| GET | `/firmware/:id/download` | Download firmware |

### Deployments (`/deployments`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/deployments` | List deployments |
| POST | `/deployments` | Create deployment |
| POST | `/deployments/:id/start` | Start deployment |
| POST | `/deployments/:id/cancel` | Cancel deployment |
| POST | `/deployments/:id/rollback` | Rollback deployment |

## Error Handling

All errors follow a consistent format:

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request",
  "details": [
    { "field": "name", "message": "name must be at least 3 characters" }
  ],
  "timestamp": "2026-03-12T10:00:00.000Z",
  "path": "/api/devices"
}
```

## Validation

DTOs use `class-validator` decorators:

```typescript
export class CreateDeviceDto {
  @IsString()
  @MinLength(3)
  name: string;

  @IsString()
  @IsOptional()
  fleetId?: string;

  @IsObject()
  @ValidateNested()
  @Type(() => DeviceMetadataDto)
  metadata: DeviceMetadataDto;
}
```

## Rate Limiting

| Endpoint Pattern | Limit | Window |
|-----------------|-------|--------|
| `/auth/*` | 10 | 1 min |
| `/devices/*` | 100 | 1 min |
| `/firmware/upload` | 5 | 1 min |
| Default | 200 | 1 min |

