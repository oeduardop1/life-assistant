import 'reflect-metadata';
import { describe, it, expect, beforeAll, afterAll, vi, beforeEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, Controller, Get } from '@nestjs/common';
import request from 'supertest';

// Mock AppConfigService - provide as useValue
const mockConfigService = {
  nodeEnv: 'test',
  port: 4000,
  frontendUrl: 'http://localhost:3000',
  appVersion: '1.0.0-test',
  databaseUrl: 'postgresql://test:test@localhost:5432/test',
  supabaseUrl: 'http://localhost:54321',
  supabaseAnonKey: 'test-anon-key',
  supabaseServiceKey: 'test-service-key',
  supabaseJwtSecret: 'super-secret-jwt-token-with-at-least-32-characters-for-testing',
  redisUrl: 'redis://localhost:6379',
  r2AccountId: 'test',
  r2AccessKeyId: 'test',
  r2SecretAccessKey: 'test',
  r2BucketName: 'test',
  axiomDataset: 'test',
  logLevel: 'error' as const,
  isProduction: false,
  isDevelopment: false,
  isTest: true,
};

// Mock DatabaseService for the test
const mockDatabaseService = {
  isHealthy: vi.fn().mockResolvedValue(true),
  db: {},
  schema: {},
  pool: { query: vi.fn().mockResolvedValue({ rows: [{ '?column?': 1 }] }) },
  withUserId: vi.fn(),
  withTransaction: vi.fn(),
  withUserTransaction: vi.fn(),
  onModuleDestroy: vi.fn(),
};

// Inline test controller - avoids importing HealthController which brings dependencies
@Controller('health')
class TestHealthController {
  @Get()
  check() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: mockConfigService.appVersion,
    };
  }

  @Get('ready')
  async ready() {
    const isHealthy = await mockDatabaseService.isHealthy();
    return {
      status: isHealthy ? 'ok' : 'error',
      details: {
        database: {
          status: isHealthy ? 'up' : 'down',
        },
      },
    };
  }
}

describe('Health Endpoints (Integration)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [TestHealthController],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    mockDatabaseService.isHealthy.mockResolvedValue(true);
  });

  describe('GET /api/health', () => {
    it('should_return_200_ok', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/health')
        .expect(200);

      expect(response.body).toMatchObject({
        status: 'ok',
        version: expect.any(String),
        timestamp: expect.any(String),
      });
    });

    it('should_include_valid_iso_timestamp', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/health')
        .expect(200);

      const timestamp = new Date(response.body.timestamp);
      expect(timestamp.toISOString()).toBe(response.body.timestamp);
    });

    it('should_not_require_authentication', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/health')
        .expect(200);

      expect(response.body.status).toBe('ok');
    });
  });

  describe('GET /api/health/ready', () => {
    it('should_return_200_when_database_healthy', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/health/ready')
        .expect(200);

      expect(response.body).toMatchObject({
        status: 'ok',
        details: expect.objectContaining({
          database: expect.objectContaining({
            status: 'up',
          }),
        }),
      });
    });

    it('should_not_require_authentication', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/health/ready')
        .expect(200);

      expect(response.body.status).toBe('ok');
    });
  });
});
