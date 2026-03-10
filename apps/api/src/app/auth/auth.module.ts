/**
 * Auth Module - Authentication and Authorization
 */

import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DatabaseModule } from '@fleetforge/database';
import { SecurityModule } from '@fleetforge/security';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

@Module({
  imports: [
    DatabaseModule,
    SecurityModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        jwt: {
          secret: configService.get<string>('JWT_SECRET', 'fleetforge-dev-secret-key'),
          accessTokenExpiration: configService.get<string>('JWT_ACCESS_EXPIRATION', '15m'),
          refreshTokenExpiration: configService.get<string>('JWT_REFRESH_EXPIRATION', '7d'),
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}

