import 'reflect-metadata';
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication,
  ValidationPipe,
  UnauthorizedException,
  BadRequestException,
  ExecutionContext,
  Controller,
  Get,
  Patch,
  Body,
  HttpCode,
  HttpStatus,
  SetMetadata,
  createParamDecorator,
} from '@nestjs/common';
import { APP_GUARD, Reflector } from '@nestjs/core';
import request from 'supertest';
import { SignJWT, jwtVerify } from 'jose';
import type { Request } from 'express';
import { IsString, IsEmail, MinLength, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';

const jwtSecret = 'super-secret-jwt-token-with-at-least-32-characters-for-testing';

// Helper to create valid JWT tokens for testing
async function createToken(payload: Record<string, unknown>, expiresIn = '1h') {
  const secret = new TextEncoder().encode(jwtSecret);
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime(expiresIn)
    .setIssuedAt()
    .sign(secret);
}

// ========================================================================
// DTOs - Mirror the actual DTOs for validation testing
// ========================================================================
class UpdateProfileDto {
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @MinLength(2, { message: 'Nome deve ter pelo menos 2 caracteres' })
  @MaxLength(100, { message: 'Nome deve ter no máximo 100 caracteres' })
  name!: string;
}

class UpdateEmailDto {
  @IsEmail({}, { message: 'Email deve ser um endereço válido' })
  newEmail!: string;

  @IsString()
  @MinLength(1, { message: 'Senha atual é obrigatória' })
  currentPassword!: string;
}

class UpdatePasswordDto {
  @IsString()
  @MinLength(1, { message: 'Senha atual é obrigatória' })
  currentPassword!: string;

  @IsString()
  @MinLength(8, { message: 'Nova senha deve ter pelo menos 8 caracteres' })
  @MaxLength(72, { message: 'Nova senha deve ter no máximo 72 caracteres' })
  newPassword!: string;
}

// ========================================================================
// Mock SettingsService
// ========================================================================
const mockSettingsService = {
  getUserSettings: vi.fn(),
  updateProfile: vi.fn(),
  updateEmail: vi.fn(),
  updatePassword: vi.fn(),
};

// ========================================================================
// Inline decorators for testing
// ========================================================================
const IS_PUBLIC_KEY = 'isPublic';
const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<Request>();
    return (request as Request & { user?: { id: string } }).user;
  },
);

// ========================================================================
// Test Auth Guard
// ========================================================================
const createTestAuthGuard = (reflector: Reflector) => {
  const secretKey = new TextEncoder().encode(jwtSecret);

  return {
    canActivate: async (context: ExecutionContext): Promise<boolean> => {
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

// ========================================================================
// Test Controller - Mirrors SettingsController
// ========================================================================
@Controller('settings')
class TestSettingsController {
  @Get()
  async getSettings(@CurrentUser() user: { id: string }) {
    return mockSettingsService.getUserSettings(user.id);
  }

  @Patch('profile')
  @HttpCode(HttpStatus.OK)
  async updateProfile(
    @CurrentUser() user: { id: string },
    @Body() dto: UpdateProfileDto,
  ) {
    return mockSettingsService.updateProfile(user.id, dto);
  }

  @Patch('email')
  @HttpCode(HttpStatus.OK)
  async updateEmail(
    @CurrentUser() user: { id: string },
    @Body() dto: UpdateEmailDto,
  ) {
    return mockSettingsService.updateEmail(user.id, dto);
  }

  @Patch('password')
  @HttpCode(HttpStatus.OK)
  async updatePassword(
    @CurrentUser() user: { id: string },
    @Body() dto: UpdatePasswordDto,
  ) {
    return mockSettingsService.updatePassword(user.id, dto);
  }
}

// ========================================================================
// Integration Tests
// ========================================================================
describe('Settings Endpoints (Integration)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [TestSettingsController],
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
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        exceptionFactory: (errors) => {
          const messages = errors.map(error =>
            Object.values(error.constraints || {}).join(', ')
          );
          return new BadRequestException(messages);
        },
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =========================================================================
  // GET /api/settings
  // =========================================================================
  describe('GET /api/settings', () => {
    it('should_return_settings_for_authenticated_user', async () => {
      const token = await createToken({ sub: 'user-123' });
      mockSettingsService.getUserSettings.mockResolvedValue({
        name: 'Test User',
        email: 'test@example.com',
      });

      const response = await request(app.getHttpServer())
        .get('/api/settings')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toMatchObject({
        name: 'Test User',
        email: 'test@example.com',
      });
      expect(mockSettingsService.getUserSettings).toHaveBeenCalledWith('user-123');
    });

    it('should_return_401_without_token', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/settings')
        .expect(401);

      expect(response.body.statusCode).toBe(401);
    });

    it('should_return_401_with_invalid_token', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/settings')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.statusCode).toBe(401);
    });
  });

  // =========================================================================
  // PATCH /api/settings/profile
  // =========================================================================
  describe('PATCH /api/settings/profile', () => {
    it('should_update_profile', async () => {
      const token = await createToken({ sub: 'user-123' });
      mockSettingsService.updateProfile.mockResolvedValue({
        success: true,
        message: 'Perfil atualizado com sucesso',
      });

      const response = await request(app.getHttpServer())
        .patch('/api/settings/profile')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'New Name' })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
      });
      expect(mockSettingsService.updateProfile).toHaveBeenCalledWith('user-123', {
        name: 'New Name',
      });
    });

    it('should_reject_short_name', async () => {
      const token = await createToken({ sub: 'user-123' });

      const response = await request(app.getHttpServer())
        .patch('/api/settings/profile')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'A' })
        .expect(400);

      expect(response.body.statusCode).toBe(400);
    });

    it('should_reject_long_name', async () => {
      const token = await createToken({ sub: 'user-123' });

      const response = await request(app.getHttpServer())
        .patch('/api/settings/profile')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'A'.repeat(101) })
        .expect(400);

      expect(response.body.statusCode).toBe(400);
    });

    it('should_return_401_without_token', async () => {
      const response = await request(app.getHttpServer())
        .patch('/api/settings/profile')
        .send({ name: 'Test' })
        .expect(401);

      expect(response.body.statusCode).toBe(401);
    });
  });

  // =========================================================================
  // PATCH /api/settings/email
  // =========================================================================
  describe('PATCH /api/settings/email', () => {
    const validEmailData = {
      newEmail: 'newemail@example.com',
      currentPassword: 'password123',
    };

    it('should_update_email', async () => {
      const token = await createToken({ sub: 'user-123' });
      mockSettingsService.updateEmail.mockResolvedValue({
        success: true,
        message: 'Email de verificação enviado',
      });

      const response = await request(app.getHttpServer())
        .patch('/api/settings/email')
        .set('Authorization', `Bearer ${token}`)
        .send(validEmailData)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
      });
      expect(mockSettingsService.updateEmail).toHaveBeenCalledWith('user-123', validEmailData);
    });

    it('should_reject_invalid_email', async () => {
      const token = await createToken({ sub: 'user-123' });

      const response = await request(app.getHttpServer())
        .patch('/api/settings/email')
        .set('Authorization', `Bearer ${token}`)
        .send({ newEmail: 'invalid-email', currentPassword: 'password123' })
        .expect(400);

      expect(response.body.statusCode).toBe(400);
    });

    it('should_reject_missing_password', async () => {
      const token = await createToken({ sub: 'user-123' });

      const response = await request(app.getHttpServer())
        .patch('/api/settings/email')
        .set('Authorization', `Bearer ${token}`)
        .send({ newEmail: 'valid@example.com' })
        .expect(400);

      expect(response.body.statusCode).toBe(400);
    });

    it('should_handle_wrong_password', async () => {
      const token = await createToken({ sub: 'user-123' });
      mockSettingsService.updateEmail.mockRejectedValue(
        new UnauthorizedException('Senha atual incorreta'),
      );

      const response = await request(app.getHttpServer())
        .patch('/api/settings/email')
        .set('Authorization', `Bearer ${token}`)
        .send(validEmailData)
        .expect(401);

      expect(response.body.statusCode).toBe(401);
    });

    it('should_return_401_without_token', async () => {
      const response = await request(app.getHttpServer())
        .patch('/api/settings/email')
        .send(validEmailData)
        .expect(401);

      expect(response.body.statusCode).toBe(401);
    });
  });

  // =========================================================================
  // PATCH /api/settings/password
  // =========================================================================
  describe('PATCH /api/settings/password', () => {
    const validPasswordData = {
      currentPassword: 'oldPassword123',
      newPassword: 'newSecurePassword123!',
    };

    it('should_update_password', async () => {
      const token = await createToken({ sub: 'user-123' });
      mockSettingsService.updatePassword.mockResolvedValue({
        success: true,
        message: 'Senha alterada com sucesso',
      });

      const response = await request(app.getHttpServer())
        .patch('/api/settings/password')
        .set('Authorization', `Bearer ${token}`)
        .send(validPasswordData)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
      });
      expect(mockSettingsService.updatePassword).toHaveBeenCalledWith('user-123', validPasswordData);
    });

    it('should_reject_short_password', async () => {
      const token = await createToken({ sub: 'user-123' });

      const response = await request(app.getHttpServer())
        .patch('/api/settings/password')
        .set('Authorization', `Bearer ${token}`)
        .send({ currentPassword: 'password', newPassword: 'short' })
        .expect(400);

      expect(response.body.statusCode).toBe(400);
    });

    it('should_reject_long_password', async () => {
      const token = await createToken({ sub: 'user-123' });

      const response = await request(app.getHttpServer())
        .patch('/api/settings/password')
        .set('Authorization', `Bearer ${token}`)
        .send({ currentPassword: 'password', newPassword: 'A'.repeat(73) })
        .expect(400);

      expect(response.body.statusCode).toBe(400);
    });

    it('should_handle_wrong_current_password', async () => {
      const token = await createToken({ sub: 'user-123' });
      mockSettingsService.updatePassword.mockRejectedValue(
        new UnauthorizedException('Senha atual incorreta'),
      );

      const response = await request(app.getHttpServer())
        .patch('/api/settings/password')
        .set('Authorization', `Bearer ${token}`)
        .send(validPasswordData)
        .expect(401);

      expect(response.body.statusCode).toBe(401);
    });

    it('should_handle_weak_password', async () => {
      const token = await createToken({ sub: 'user-123' });
      mockSettingsService.updatePassword.mockRejectedValue(
        new BadRequestException('Senha muito fraca'),
      );

      const response = await request(app.getHttpServer())
        .patch('/api/settings/password')
        .set('Authorization', `Bearer ${token}`)
        .send({ currentPassword: 'password', newPassword: '12345678' })
        .expect(400);

      expect(response.body.statusCode).toBe(400);
    });

    it('should_return_401_without_token', async () => {
      const response = await request(app.getHttpServer())
        .patch('/api/settings/password')
        .send(validPasswordData)
        .expect(401);

      expect(response.body.statusCode).toBe(401);
    });
  });
});
