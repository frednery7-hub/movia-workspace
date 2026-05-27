import { Test, TestingModule }              from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request                              from 'supertest';
import { App }                              from 'supertest/types';
import { AppModule }                        from '../src/app.module';

const SMOKE_DEVICE_ID = '550e8400-e29b-41d4-a716-446655440000';

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
        whitelist:            true,
        forbidNonWhitelisted: true,
        transform:            true,
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
        lat:          -33.4385,
        lng:          -70.6374,
        confidence:   0.9,
        isStationary: false,
        isDegraded:   false,
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
});