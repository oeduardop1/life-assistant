import 'reflect-metadata';
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication,
  Controller,
  Get,
  ExecutionContext,
  UnauthorizedException,
  SetMetadata,
  createParamDecorator,
} from '@nestjs/common';
import { APP_GUARD, Reflector } from '@nestjs/core';
import request from 'supertest';
import { SignJWT, jwtVerify } from 'jose';
import type { Request } from 'express';

const jwtSecret = 'super-secret-jwt-token-with-at-least-32-characters-for-testing';

// Mock config service values
const mockConfigService = {
  supabaseJwtSecret: jwtSecret,
};

// Mock logger service
const mockLoggerService = {
  setContext: vi.fn().mockReturnThis(),
  log: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn(),
};

// Create inline decorators for testing
const IS_PUBLIC_KEY = 'isPublic';
const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<Request>();
    return (request as Request & { user?: { id: string } }).user;
  },
);

// Create inline AuthGuard for testing - using factory pattern for proper Reflector injection
const createTestAuthGuard = (reflector: Reflector) => {
  const secretKey = new TextEncoder().encode(mockConfigService.supabaseJwtSecret);

  return {
    canActivate: async (context: ExecutionContext): Promise<boolean> => {
      // Check if route is marked as public
      const isPublic = reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);

      if (isPublic) {
        return true;
      }

      const request = context.switchToHttp().getRequest<Request>();
      const authHeader = request.headers.authorization;

      if (!authHeader?.startsWith('Bearer ')) {
        throw new UnauthorizedException('Missing authorization token');
      }

      const token = authHeader.slice(7);

      try {
        const { payload } = await jwtVerify(token, secretKey, {
          algorithms: ['HS256'],
        });

        if (!payload.sub) {
          throw new UnauthorizedException('Invalid token: missing subject');
        }

        (request as Request & { user: { id: string } }).user = {
          id: payload.sub,
        };

        return true;
      } catch (error) {
        if (error instanceof UnauthorizedException) {
          throw error;
        }
        throw new UnauthorizedException('Invalid or expired token');
      }
    },
  };
};

// Test controller for auth testing
@Controller('test')
class TestController {
  @Public()
  @Get('public')
  publicRoute() {
    return { message: 'Public endpoint' };
  }

  @Get('protected')
  protectedRoute(@CurrentUser() user: { id: string }) {
    return { message: 'Protected endpoint', userId: user.id };
  }
}

describe('Auth Flow (Integration)', () => {
  let app: INestApplication;

  async function createToken(payload: Record<string, unknown>, expiresIn = '1h') {
    const secret = new TextEncoder().encode(jwtSecret);
    return new SignJWT(payload)
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime(expiresIn)
      .setIssuedAt()
      .sign(secret);
  }

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [TestController],
      providers: [
        {
          provide: APP_GUARD,
          useFactory: (reflector: Reflector) => createTestAuthGuard(reflector),
          inject: [Reflector],
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Public routes', () => {
    it('should_allow_access_without_token', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/test/public')
        .expect(200);

      expect(response.body.message).toBe('Public endpoint');
    });

    it('should_allow_access_with_token', async () => {
      const token = await createToken({ sub: 'user-123' });

      const response = await request(app.getHttpServer())
        .get('/api/test/public')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.message).toBe('Public endpoint');
    });
  });

  describe('Protected routes', () => {
    it('should_reject_without_token', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/test/protected')
        .expect(401);

      expect(response.body).toMatchObject({
        statusCode: 401,
        message: 'Missing authorization token',
      });
    });

    it('should_reject_with_invalid_token', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/test/protected')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body).toMatchObject({
        statusCode: 401,
        message: 'Invalid or expired token',
      });
    });

    it('should_reject_with_expired_token', async () => {
      const token = await createToken({ sub: 'user-123' }, '-1h');

      const response = await request(app.getHttpServer())
        .get('/api/test/protected')
        .set('Authorization', `Bearer ${token}`)
        .expect(401);

      expect(response.body.message).toBe('Invalid or expired token');
    });

    it('should_reject_token_without_subject', async () => {
      const token = await createToken({ email: 'test@example.com' });

      const response = await request(app.getHttpServer())
        .get('/api/test/protected')
        .set('Authorization', `Bearer ${token}`)
        .expect(401);

      expect(response.body.message).toBe('Invalid token: missing subject');
    });

    it('should_allow_with_valid_token', async () => {
      const token = await createToken({
        sub: 'user-123',
        email: 'test@example.com',
        role: 'authenticated',
      });

      const response = await request(app.getHttpServer())
        .get('/api/test/protected')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toMatchObject({
        message: 'Protected endpoint',
        userId: 'user-123',
      });
    });

    it('should_reject_non_bearer_tokens', async () => {
      const token = await createToken({ sub: 'user-123' });

      const response = await request(app.getHttpServer())
        .get('/api/test/protected')
        .set('Authorization', `Basic ${token}`)
        .expect(401);

      expect(response.body.message).toBe('Missing authorization token');
    });
  });
});
