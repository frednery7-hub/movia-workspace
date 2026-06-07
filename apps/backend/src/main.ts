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

  const isProd = process.env.NODE_ENV === 'production';

  app.use(
    helmet({
      contentSecurityPolicy: true,
      crossOriginEmbedderPolicy: true,
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

  if (isProd && allowedOrigins.length === 0) {
    console.error(
      'FATAL: ALLOWED_ORIGINS nao definido em producao. Servidor abortado.',
    );
    process.exit(1);
  }

  app.enableCors({
    origin: isProd ? allowedOrigins : 'http://localhost:8081',
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
