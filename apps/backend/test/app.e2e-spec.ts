import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';

describe('Security Smoke Tests (e2e)', () => {
  let app: INestApplication<App>;
  let token: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    // Obtém token para testes autenticados
    const res = await request(app.getHttpServer())
      .post('/auth/session')
      .send({ deviceId: 'smoke-test-device' });
    token = res.body.access_token;
  });

  afterAll(async () => {
    await app.close();
  });

  // ── Rotas públicas ────────────────────────────────────────────
  it('GET /health — 200 sem token', () => {
    return request(app.getHttpServer()).get('/health').expect(200);
  });

  it('GET /lines — 200 sem token', () => {
    return request(app.getHttpServer()).get('/lines').expect(200);
  });

  it('POST /auth/session — 200 + token', () => {
    return request(app.getHttpServer())
      .post('/auth/session')
      .send({ deviceId: 'smoke-test-device' })
      .expect(201)
      .expect((res) => {
        if (!res.body.access_token) throw new Error('Token ausente');
      });
  });

  // ── Rotas protegidas — sem token ──────────────────────────────
  it('GET /auth/me — 401 sem token', () => {
    return request(app.getHttpServer()).get('/auth/me').expect(401);
  });

  it('GET /eta/:id — 401 sem token', () => {
    return request(app.getHttpServer()).get('/eta/st_baquedano').expect(401);
  });

  it('POST /geo/location — 401 sem token', () => {
    return request(app.getHttpServer())
      .post('/geo/location')
      .send({
        lat: -33.4385,
        lng: -70.6374,
        confidence: 0.9,
        isStationary: false,
        isDegraded: false,
      })
      .expect(401);
  });

  // ── Rotas protegidas — com token ──────────────────────────────
  it('GET /auth/me — 200 com token', () => {
    return request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
  });

  it('GET /eta/:id — 200 com token', () => {
    return request(app.getHttpServer())
      .get('/eta/st_baquedano')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
  });
});
