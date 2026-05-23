import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import helmet from 'helmet';

async function bootstrap() {
  // ── Trava de inicializacao segura ────────────────────────────
  if (!process.env.JWT_SECRET) {
    console.error('FATAL: JWT_SECRET nao definido. Servidor abortado.');
    process.exit(1);
  }

  const app = await NestFactory.create(AppModule);

  // ── Helmet — blindagem de headers HTTP ───────────────────────
  app.use(helmet());

  // ── ValidationPipe global — whitelist estrito ────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // remove campos nao declarados no DTO
      forbidNonWhitelisted: true, // rejeita requests com campos extras
      transform: true, // converte tipos automaticamente
    }),
  );

  // ── CORS dinamico ────────────────────────────────────────────
  const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  app.enableCors({
    origin: process.env.NODE_ENV === 'production' ? allowedOrigins : '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  await app.listen(process.env.PORT ?? 3000);
  console.log(`Movia backend rodando na porta ${process.env.PORT ?? 3000}`);
}

bootstrap().catch((err) => {
  console.error('Erro fatal na inicializacao:', err);
  process.exit(1);
});
