import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';

const SMOKE_DEVICE_ID = '550e8400-e29b-41d4-a716-446655440000';
const RATE_LIMIT_IP = '203.0.113.42';

describe('Security Smoke Tests (e2e)', () => {
  let app: INestApplication<App>;
  let token: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    (
      app.getHttpAdapter().getInstance() as {
        set?: (setting: string, value: unknown) => void;
      }
    ).set?.('trust proxy', 1);
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.setGlobalPrefix('v1', {
      exclude: ['health', 'health/ready', 'health/live'],
    });
    await app.init();

    const res = await request(app.getHttpServer())
      .post('/v1/auth/session')
      .send({ deviceId: SMOKE_DEVICE_ID });
    token = (res.body as { access_token: string }).access_token;
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /health — 200 sem token', () => {
    return request(app.getHttpServer()).get('/health').expect(200);
  });

  it('GET /v1/lines — 200 sem token', () => {
    return request(app.getHttpServer()).get('/v1/lines').expect(200);
  });

  it('POST /v1/auth/session — 201 + token', () => {
    return request(app.getHttpServer())
      .post('/v1/auth/session')
      .send({ deviceId: SMOKE_DEVICE_ID })
      .expect(201)
      .expect((res) => {
        const body = res.body as { access_token?: string };
        if (!body.access_token) throw new Error('Token ausente');
      });
  });

  it('POST /v1/auth/session — 429 acima do limite rígido', async () => {
    for (let i = 0; i < 5; i += 1) {
      await request(app.getHttpServer())
        .post('/v1/auth/session')
        .set('X-Forwarded-For', RATE_LIMIT_IP)
        .send({ deviceId: rateLimitDeviceId(i) })
        .expect(201);
    }

    await request(app.getHttpServer())
      .post('/v1/auth/session')
      .set('X-Forwarded-For', RATE_LIMIT_IP)
      .send({ deviceId: rateLimitDeviceId(6) })
      .expect(429)
      .expect((res) => {
        const body = res.body as { statusCode?: number; message?: string };
        if (body.statusCode !== 429) {
          throw new Error('Resposta 429 sem statusCode consistente');
        }
        if (!body.message) {
          throw new Error('Resposta 429 sem message');
        }
      });

    await request(app.getHttpServer())
      .get('/health')
      .set('X-Forwarded-For', RATE_LIMIT_IP)
      .expect(200);
  });

  it('GET /v1/auth/me — 401 sem token', () => {
    return request(app.getHttpServer()).get('/v1/auth/me').expect(401);
  });

  it('GET /v1/eta/:id — 401 sem token', () => {
    return request(app.getHttpServer()).get('/v1/eta/st_baquedano').expect(401);
  });

  it('POST /v1/geo/location — 401 sem token', () => {
    return request(app.getHttpServer())
      .post('/v1/geo/location')
      .send({
        lat: -33.4385,
        lng: -70.6374,
        confidence: 0.9,
        isStationary: false,
        isDegraded: false,
      })
      .expect(401);
  });

  it('GET /v1/auth/me — 200 com token', () => {
    return request(app.getHttpServer())
      .get('/v1/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
  });

  it('GET /v1/eta/:id — 200 com token', () => {
    return request(app.getHttpServer())
      .get('/v1/eta/st_baquedano')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
  });
  // ── Validação de payload ──────────────────────────────────────
  it('POST /v1/auth/session — 400 com deviceId invalido', () => {
    return request(app.getHttpServer())
      .post('/v1/auth/session')
      .send({ deviceId: 'nao-e-uuid' })
      .expect(400);
  });

  it('POST /v1/auth/session — 400 sem deviceId', () => {
    return request(app.getHttpServer())
      .post('/v1/auth/session')
      .send({})
      .expect(400);
  });

  it('POST /v1/auth/session — 400 com campo extra', () => {
    return request(app.getHttpServer())
      .post('/v1/auth/session')
      .send({ deviceId: SMOKE_DEVICE_ID, malicious: 'injection' })
      .expect(400);
  });

  it('GET /v1/auth/me — 401 com token invalido', () => {
    return request(app.getHttpServer())
      .get('/v1/auth/me')
      .set('Authorization', 'Bearer token.invalido.aqui')
      .expect(401);
  });

  it('POST /v1/geo/location — 400 com payload malformado', () => {
    return request(app.getHttpServer())
      .post('/v1/geo/location')
      .set('Authorization', `Bearer ${token}`)
      .send({ lat: 'nao-e-numero' })
      .expect(400);
  });

  // ── Privacy endpoints ─────────────────────────────────────────────────────

  it('GET /v1/privacy/export — 401 sem token', () => {
    return request(app.getHttpServer()).get('/v1/privacy/export').expect(401);
  });

  it('GET /v1/privacy/export — 200 com token', () => {
    return request(app.getHttpServer())
      .get('/v1/privacy/export')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
  });

  it('PATCH /v1/privacy/language — 400 com idioma invalido', () => {
    return request(app.getHttpServer())
      .patch('/v1/privacy/language')
      .set('Authorization', `Bearer ${token}`)
      .send({ language: 'invalid-lang' })
      .expect(400);
  });

  it('PATCH /v1/privacy/language — 200 com idioma valido', () => {
    return request(app.getHttpServer())
      .patch('/v1/privacy/language')
      .set('Authorization', `Bearer ${token}`)
      .send({ language: 'pt-BR' })
      .expect(200);
  });

  it('POST /v1/privacy/block — 401 sem token', () => {
    return request(app.getHttpServer()).post('/v1/privacy/block').expect(401);
  });

  it('POST /v1/privacy/block — 201 bloqueia dispositivo', () => {
    return request(app.getHttpServer())
      .post('/v1/privacy/block')
      .set('Authorization', `Bearer ${token}`)
      .expect(201);
  });

  it('DELETE /v1/privacy/block — 200 desbloqueia dispositivo', () => {
    return request(app.getHttpServer())
      .delete('/v1/privacy/block')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
  });

  it('DELETE /v1/privacy/data — 401 sem token', () => {
    return request(app.getHttpServer()).delete('/v1/privacy/data').expect(401);
  });

  it('DELETE /v1/privacy/data — 200 exclui dados', () => {
    return request(app.getHttpServer())
      .delete('/v1/privacy/data')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
  });
});

function rateLimitDeviceId(index: number): string {
  return `550e8400-e29b-41d4-a716-${String(446655440100 + index)}`;
}
