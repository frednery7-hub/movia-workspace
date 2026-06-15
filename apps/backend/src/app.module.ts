import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD, APP_INTERCEPTOR, APP_FILTER } from '@nestjs/core';
import * as Joi from 'joi';
import { LinesModule } from './lines/lines.module';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { GeoModule } from './geo/geo.module';
import { GraphModule } from './graph/graph.module';
import { EtaModule } from './eta/eta.module';
import { RolesGuard } from './common/roles.guard';
import { PrivacyModule } from './privacy/privacy.module';
import { CleanupService } from './common/cleanup.service';
import { NetworkStateModule } from './network-state/network-state.module';
import { IngestionModule } from './ingestion/ingestion.module';
import { AiEngineModule } from './ai-engine/ai-engine.module';
import { StationsModule } from './stations/stations.module';
import { ObservabilityModule } from './observability/observability.module';
import { LoggingInterceptor } from './common/logging.interceptor';
import { GlobalExceptionFilter } from './common/http-exception.filter';
import { MetroIncidentsModule } from './metro-incidents/metro-incidents.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        NODE_ENV: Joi.string()
          .valid('development', 'staging', 'production', 'test')
          .default('development'),
        PORT: Joi.number().default(3000),
        DATABASE_URL: Joi.string().required(),
        REDIS_URL: Joi.string().optional().allow(''),
        JWT_SECRET: Joi.string().min(32).required(),
        ALLOWED_ORIGINS: Joi.string().default(''),
        CORS_ORIGIN: Joi.string().optional().allow(''),
        PRIVACY_REGION: Joi.string().default('CL'),
        PRIVACY_RESPONSE_SLA_DAYS: Joi.number()
          .integer()
          .positive()
          .default(30),
        SENTRY_DSN: Joi.string().optional().allow(''),
        METRICS_TOKEN: Joi.when('NODE_ENV', {
          is: 'production',
          then: Joi.string().min(16).required(),
          otherwise: Joi.string().optional().allow(''),
        }),
      }),
    }),
    ThrottlerModule.forRoot([
      { name: 'default', ttl: 900_000, limit: 100 },
      { name: 'authSession', ttl: 60_000, limit: 5 },
      { name: 'geoLocation', ttl: 60_000, limit: 20 },
      { name: 'eta', ttl: 60_000, limit: 60 },
    ]),
    PrismaModule,
    AuthModule,
    LinesModule,
    HealthModule,
    GeoModule,
    GraphModule,
    EtaModule,
    PrivacyModule,
    NetworkStateModule,
    IngestionModule,
    AiEngineModule,
    StationsModule,
    ObservabilityModule,
    MetroIncidentsModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
    CleanupService,
  ],
})
export class AppModule {}
