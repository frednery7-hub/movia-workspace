import './instrument';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import helmet from 'helmet';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

async function bootstrap() {
  if (!process.env.JWT_SECRET) {
    console.error('FATAL: JWT_SECRET nao definido. Servidor abortado.');
    process.exit(1);
  }

  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));
  const httpServer = app.getHttpAdapter().getInstance() as {
    set?: (setting: string, value: unknown) => void;
  };
  httpServer.set?.('trust proxy', 1);

  const isProd = process.env.NODE_ENV === 'production';
  const isRestrictedCorsEnv =
    process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'staging';

  app.use(
    helmet({
      contentSecurityPolicy: true,
      crossOriginEmbedderPolicy: true,
      hsts: isProd
        ? { maxAge: 31_536_000, includeSubDomains: true, preload: true }
        : false,
      referrerPolicy: { policy: 'no-referrer' },
      permittedCrossDomainPolicies: { permittedPolicies: 'none' },
    }),
  );

  app.setGlobalPrefix('v1', {
    exclude: ['health', 'health/ready', 'health/live', 'metrics'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const corsOriginConfig =
    process.env.ALLOWED_ORIGINS || process.env.CORS_ORIGIN || '';
  const allowedOrigins = corsOriginConfig
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  if (isRestrictedCorsEnv && allowedOrigins.length === 0) {
    console.error(
      'FATAL: ALLOWED_ORIGINS nao definido em staging/producao. Servidor abortado.',
    );
    process.exit(1);
  }

  if (isRestrictedCorsEnv && allowedOrigins.includes('*')) {
    console.error(
      'FATAL: ALLOWED_ORIGINS nao pode usar wildcard em staging/producao.',
    );
    process.exit(1);
  }

  app.enableCors({
    origin:
      allowedOrigins.length > 0
        ? !isRestrictedCorsEnv && allowedOrigins.includes('*')
          ? true
          : allowedOrigins
        : 'http://localhost:8081',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  await app.listen(process.env.PORT ?? 3000, '0.0.0.0');
  console.log(`Movia backend rodando na porta ${process.env.PORT ?? 3000}`);
}

bootstrap().catch((err) => {
  console.error('Erro fatal na inicializacao:', err);
  process.exit(1);
});
