# @fleetforge/security

Security utilities for FleetForge - JWT authentication, authorization guards, digital signatures, and encryption.

## Features

- 🔐 **JWT Authentication** - Token generation, validation, and refresh
- 🛡️ **Authorization Guards** - Role-based and permission-based access control
- ✍️ **Digital Signatures** - Firmware signature validation with RSA/ECDSA/Ed25519
- 🔒 **Encryption** - AES-256-GCM/CBC encryption for sensitive data
- 📝 **Logging Interceptor** - Request/response logging with user context
- ⏱️ **Rate Limiting** - In-memory rate limiting interceptor

## Installation

```bash
npm install @fleetforge/security
```

## Usage

### JWT Authentication

```typescript
import { JwtService } from '@fleetforge/security';

const jwtService = new JwtService({
  secret: 'your-secret-key',
  accessTokenExpiration: '15m',
  refreshTokenExpiration: '7d',
});

// Generate tokens
const tokens = await jwtService.generateTokenPair({
  sub: 'user-123',
  email: 'user@example.com',
  role: UserRole.ADMIN,
  permissions: [Permission.DEVICE_READ, Permission.DEVICE_WRITE],
  type: 'user',
});

// Verify token
const payload = await jwtService.verifyToken(tokens.accessToken);
```

### Guards and Decorators

```typescript
import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  JwtAuthGuard,
  RolesGuard,
  PermissionsGuard,
  Roles,
  Permissions,
  Public,
  UserRole,
  Permission,
} from '@fleetforge/security';

@Controller('devices')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class DevicesController {
  @Get()
  @Permissions(Permission.DEVICE_READ)
  findAll() {
    return 'This route requires DEVICE_READ permission';
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.FLEET_MANAGER)
  create() {
    return 'This route requires ADMIN or FLEET_MANAGER role';
  }

  @Get('public')
  @Public()
  publicRoute() {
    return 'This route is public';
  }
}
```

### Digital Signature Validation

```typescript
import { SignatureValidationService } from '@fleetforge/security';

const service = new SignatureValidationService();

const result = await service.validateFirmwareSignature(
  {
    buffer: firmwareBuffer,
    checksum: 'sha256-checksum',
    checksumAlgorithm: 'sha256',
  },
  {
    algorithm: 'RSA-SHA256',
    signature: 'base64-signature',
    publicKey: 'public-key-pem',
    timestamp: new Date(),
  }
);

if (result.isValid) {
  console.log('Firmware signature is valid');
} else {
  console.error('Validation errors:', result.errors);
}
```

### Encryption

```typescript
import { EncryptionService } from '@fleetforge/security';

const service = new EncryptionService();

// Encrypt data
const encrypted = await service.encrypt('sensitive-data', 'password');

// Decrypt data
const decrypted = await service.decrypt(encrypted, 'password');

// Hash password
const { hash, salt } = await service.hashPassword('user-password');

// Verify password
const isValid = await service.verifyPassword('user-password', hash, salt);
```

### Interceptors

```typescript
import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { LoggingInterceptor, RateLimitInterceptor } from '@fleetforge/security';

@Module({
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: RateLimitInterceptor,
    },
  ],
})
export class AppModule {}
```

## API Reference

### Types

- `UserRole` - User roles (SUPER_ADMIN, ADMIN, FLEET_MANAGER, OPERATOR, VIEWER, DEVICE)
- `Permission` - Granular permissions for resources
- `IJwtPayload` - JWT token payload structure
- `IAuthUser` - Authenticated user interface
- `IAuthDevice` - Authenticated device interface
- `ITokenPair` - Access and refresh token pair

### Services

- `JwtService` - JWT token management
- `SignatureValidationService` - Digital signature validation
- `EncryptionService` - Data encryption/decryption

### Guards

- `JwtAuthGuard` - JWT authentication guard
- `RolesGuard` - Role-based authorization
- `PermissionsGuard` - Permission-based authorization

### Decorators

- `@Public()` - Mark route as public
- `@Roles(...roles)` - Require specific roles
- `@Permissions(...permissions)` - Require specific permissions

### Interceptors

- `LoggingInterceptor` - Request/response logging
- `RateLimitInterceptor` - Rate limiting (100 req/min per user)

## License

MIT

