/**
 * mTLS Decorators
 * Decorators for mTLS authentication requirements
 */

import { SetMetadata, createParamDecorator, ExecutionContext } from '@nestjs/common';
import { MTLS_REQUIRED_KEY, MTLS_OPTIONAL_KEY, IMtlsRequest } from '../guards/mtls.guard';
import { ICertificateInfo } from '../services/mtls.service';

/**
 * Require mTLS client certificate for this route
 * 
 * @example
 * @RequireMtls()
 * @Post('telemetry')
 * async submitTelemetry() { ... }
 */
export const RequireMtls = () => SetMetadata(MTLS_REQUIRED_KEY, true);

/**
 * mTLS is optional for this route (certificate will be validated if present)
 * 
 * @example
 * @OptionalMtls()
 * @Get('status')
 * async getStatus() { ... }
 */
export const OptionalMtls = () => SetMetadata(MTLS_OPTIONAL_KEY, true);

/**
 * Extract mTLS certificate info from request
 * 
 * @example
 * @Get('device-info')
 * async getDeviceInfo(@MtlsCertificate() cert: ICertificateInfo) { ... }
 */
export const MtlsCertificate = createParamDecorator(
  (data: keyof ICertificateInfo | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest() as IMtlsRequest;
    const cert = request.mtls?.certificate;

    if (!cert) {
      return undefined;
    }

    return data ? cert[data] : cert;
  },
);

/**
 * Extract device ID from mTLS certificate
 * 
 * @example
 * @Post('telemetry')
 * async submitTelemetry(@MtlsDeviceId() deviceId: string) { ... }
 */
export const MtlsDeviceId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest() as IMtlsRequest;
    return request.mtls?.deviceId;
  },
);

/**
 * Check if request was authenticated via mTLS
 * 
 * @example
 * @Get('info')
 * async getInfo(@IsMtlsAuthenticated() isMtls: boolean) { ... }
 */
export const IsMtlsAuthenticated = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest() as IMtlsRequest;
    return request.mtls?.verified ?? false;
  },
);

