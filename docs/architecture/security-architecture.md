# Security Architecture

## Overview

FleetForge implements defense-in-depth security with multiple layers of protection.

## Authentication

### JWT Authentication
- Access tokens: 15-minute expiration
- Refresh tokens: 7-day expiration
- Secure HTTP-only cookies for web clients

```
┌──────────┐      ┌──────────┐      ┌──────────┐
│  Client  │─────▶│   API    │─────▶│  MongoDB │
│          │      │  Guard   │      │  (Users) │
└──────────┘      └──────────┘      └──────────┘
     │                 │
     │   JWT Token     │
     │◀────────────────│
```

### Multi-Factor Authentication (MFA)
- 6-digit TOTP codes
- 5-minute code expiration
- SMS/Email delivery options
- Backup codes for recovery

### mTLS (Mutual TLS)
Device-to-API authentication using X.509 certificates.

```typescript
@Controller('devices')
@UseGuards(MtlsGuard)
export class SecureDeviceController {
  @Get('telemetry')
  @RequireDeviceCert()
  getTelemetry(@DeviceFromCert() deviceId: string) {
    // Device authenticated via certificate
  }
}
```

**Certificate Validation:**
- CN (Common Name) extraction for device ID
- Expiration date checking
- Certificate chain validation
- Revocation checking (CRL/OCSP)

## Authorization

### Role-Based Access Control (RBAC)

| Role | Permissions |
|------|-------------|
| `admin` | Full access |
| `operator` | Manage devices, deployments |
| `viewer` | Read-only access |
| `device` | Telemetry submission only |

```typescript
@Roles(Role.Admin, Role.Operator)
@UseGuards(JwtAuthGuard, RolesGuard)
@Post('deployments')
createDeployment() { ... }
```

## Data Protection

### Encryption at Rest
- MongoDB encryption with AES-256
- Sensitive fields encrypted in documents

### Encryption in Transit
- TLS 1.3 for all API communications
- mTLS for device communications

### Password Security
- bcrypt hashing (12 rounds)
- Password complexity requirements
- Breach detection integration

## Audit Logging

All sensitive operations are logged:

```typescript
@Auditable({
  action: AuditAction.DEVICE_CREATE,
  resourceType: 'device',
  severity: AuditSeverity.MEDIUM,
})
@Post()
createDevice(@Body() dto: CreateDeviceDto) { ... }
```

**Audit Log Entry:**
```json
{
  "action": "DEVICE_CREATE",
  "userId": "user-123",
  "resourceType": "device",
  "resourceId": "device-456",
  "severity": "MEDIUM",
  "ipAddress": "192.168.1.100",
  "userAgent": "Mozilla/5.0...",
  "timestamp": "2026-03-12T10:00:00.000Z",
  "details": { "name": "sensor-01" }
}
```

## Security Headers

```typescript
// Helmet middleware configuration
app.use(helmet({
  contentSecurityPolicy: true,
  crossOriginEmbedderPolicy: true,
  crossOriginOpenerPolicy: true,
  crossOriginResourcePolicy: true,
  hsts: { maxAge: 31536000, includeSubDomains: true },
  noSniff: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
}));
```

## Input Validation

All inputs are validated using `class-validator`:
- Type checking
- Range validation
- Pattern matching
- Sanitization

## Security Checklist

- [x] JWT authentication
- [x] Refresh token rotation
- [x] MFA support
- [x] mTLS for devices
- [x] RBAC authorization
- [x] Audit logging
- [x] Input validation
- [x] Rate limiting
- [x] Security headers
- [x] Password hashing
- [ ] Penetration testing
- [ ] Security scanning (Snyk)

