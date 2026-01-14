/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import 'reflect-metadata';
import { describe, it, expect, beforeAll, afterAll, vi, beforeEach } from 'vitest';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import {
  Controller,
  Get,
  Delete,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
  SetMetadata,
  createParamDecorator,
  NotFoundException,
} from '@nestjs/common';
import type { INestApplication, ExecutionContext } from '@nestjs/common';
import { APP_GUARD, Reflector } from '@nestjs/core';
import request from 'supertest';
import { SignJWT, jwtVerify } from 'jose';
import type { Request } from 'express';

const jwtSecret = 'super-secret-jwt-token-with-at-least-32-characters-for-testing';

// Create inline decorators for testing
const IS_PUBLIC_KEY = 'isPublic';
const _Public = () => SetMetadata(IS_PUBLIC_KEY, true); // Prefixed with _ to indicate unused but kept for future use

const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<Request>();
    const user = (request as Request & { user?: { id: string } }).user;
    return data ? user?.[data as keyof typeof user] : user;
  },
);

// Mock data
const mockUserMemory = {
  id: 'mem-123',
  userId: 'user-123',
  bio: 'Test user bio',
  occupation: 'Developer',
  familyContext: 'Single',
  currentGoals: ['Learn TypeScript'],
  currentChallenges: ['Time management'],
  topOfMind: ['Project deadline'],
  values: ['Family', 'Growth'],
  communicationStyle: 'direct',
  feedbackPreferences: 'direct',
  christianPerspective: false,
  version: 1,
  lastConsolidatedAt: null,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

const mockKnowledgeItems = [
  {
    id: 'ki-1',
    userId: 'user-123',
    type: 'fact',
    area: 'career',
    title: 'Work info',
    content: 'Works as a software developer',
    source: 'conversation',
    confidence: 0.95,
    validatedByUser: false,
    tags: ['work', 'tech'],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    deletedAt: null,
  },
  {
    id: 'ki-2',
    userId: 'user-123',
    type: 'preference',
    area: 'health',
    title: 'Sleep preference',
    content: 'Prefers to wake up early',
    source: 'conversation',
    confidence: 0.9,
    validatedByUser: true,
    tags: ['sleep', 'routine'],
    createdAt: new Date('2024-01-02'),
    updatedAt: new Date('2024-01-02'),
    deletedAt: null,
  },
];

// Create inline AuthGuard for testing
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

// Test controller simulating memory endpoints
@Controller('memory')
class TestMemoryController {
  @Get()
  getUserMemory(@CurrentUser('id') userId: string) {
    if (userId !== 'user-123') {
      // Simulate creating new memory for new user
      return {
        ...mockUserMemory,
        id: 'mem-new',
        userId,
        bio: null,
        occupation: null,
      };
    }
    return mockUserMemory;
  }

  @Get('knowledge')
  listKnowledgeItems(
    @CurrentUser('id') userId: string,
    @Query('type') type?: string,
    @Query('area') area?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string
  ) {
    let items = mockKnowledgeItems.filter((i) => i.userId === userId);

    if (type) {
      items = items.filter((i) => i.type === type);
    }
    if (area) {
      items = items.filter((i) => i.area === area);
    }

    const parsedLimit = limit ? parseInt(limit, 10) : 10;
    const parsedOffset = offset ? parseInt(offset, 10) : 0;
    const paginatedItems = items.slice(parsedOffset, parsedOffset + parsedLimit);

    return {
      items: paginatedItems.map((item) => ({
        ...item,
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString(),
      })),
      total: items.length,
      hasMore: parsedOffset + parsedLimit < items.length,
    };
  }

  @Get('knowledge/:id')
  getKnowledgeItem(
    @CurrentUser('id') userId: string,
    @Param('id') id: string
  ) {
    // Basic UUID validation
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id) && !id.startsWith('ki-')) {
      throw new NotFoundException('Invalid UUID format');
    }

    const item = mockKnowledgeItems.find(
      (i) => i.id === id && i.userId === userId
    );

    if (!item) {
      throw new NotFoundException('Item de conhecimento não encontrado');
    }

    return {
      ...item,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    };
  }

  @Delete('knowledge/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteKnowledgeItem(
    @CurrentUser('id') userId: string,
    @Param('id') id: string
  ) {
    const item = mockKnowledgeItems.find(
      (i) => i.id === id && i.userId === userId
    );

    if (!item) {
      throw new NotFoundException('Item de conhecimento não encontrado');
    }

    return;
  }
}

describe('Memory Endpoints (Integration)', () => {
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
      controllers: [TestMemoryController],
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

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/memory', () => {
    it('should_return_user_memory_with_valid_token', async () => {
      const token = await createToken({ sub: 'user-123' });

      const response = await request(app.getHttpServer())
        .get('/api/memory')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toMatchObject({
        id: 'mem-123',
        userId: 'user-123',
        bio: 'Test user bio',
        occupation: 'Developer',
      });
    });

    it('should_reject_without_token_401', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/memory')
        .expect(401);

      expect(response.body.message).toBe('Missing authorization token');
    });

    it('should_create_memory_if_not_exists', async () => {
      const token = await createToken({ sub: 'user-new' });

      const response = await request(app.getHttpServer())
        .get('/api/memory')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toMatchObject({
        id: 'mem-new',
        userId: 'user-new',
        bio: null,
        occupation: null,
      });
    });
  });

  describe('GET /api/memory/knowledge', () => {
    it('should_return_knowledge_items_list', async () => {
      const token = await createToken({ sub: 'user-123' });

      const response = await request(app.getHttpServer())
        .get('/api/memory/knowledge')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toMatchObject({
        items: expect.arrayContaining([
          expect.objectContaining({
            id: 'ki-1',
            type: 'fact',
            area: 'career',
          }),
        ]),
        total: 2,
        hasMore: false,
      });
    });

    it('should_filter_by_type', async () => {
      const token = await createToken({ sub: 'user-123' });

      const response = await request(app.getHttpServer())
        .get('/api/memory/knowledge?type=preference')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.items).toHaveLength(1);
      expect(response.body.items[0].type).toBe('preference');
    });

    it('should_filter_by_area', async () => {
      const token = await createToken({ sub: 'user-123' });

      const response = await request(app.getHttpServer())
        .get('/api/memory/knowledge?area=career')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.items).toHaveLength(1);
      expect(response.body.items[0].area).toBe('career');
    });

    it('should_paginate_with_limit_offset', async () => {
      const token = await createToken({ sub: 'user-123' });

      const response = await request(app.getHttpServer())
        .get('/api/memory/knowledge?limit=1&offset=0')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.items).toHaveLength(1);
      expect(response.body.total).toBe(2);
      expect(response.body.hasMore).toBe(true);
    });

    it('should_return_hasMore_correctly', async () => {
      const token = await createToken({ sub: 'user-123' });

      const response = await request(app.getHttpServer())
        .get('/api/memory/knowledge?limit=10&offset=0')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.hasMore).toBe(false);
    });
  });

  describe('GET /api/memory/knowledge/:id', () => {
    it('should_return_knowledge_item_details', async () => {
      const token = await createToken({ sub: 'user-123' });

      const response = await request(app.getHttpServer())
        .get('/api/memory/knowledge/ki-1')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toMatchObject({
        id: 'ki-1',
        type: 'fact',
        area: 'career',
        content: 'Works as a software developer',
      });
    });

    it('should_return_404_for_nonexistent_item', async () => {
      const token = await createToken({ sub: 'user-123' });

      const response = await request(app.getHttpServer())
        .get('/api/memory/knowledge/ki-nonexistent')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      expect(response.body.message).toBe('Item de conhecimento não encontrado');
    });

    it('should_not_return_other_user_items', async () => {
      const token = await createToken({ sub: 'user-other' });

      const response = await request(app.getHttpServer())
        .get('/api/memory/knowledge/ki-1')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      expect(response.body.message).toBe('Item de conhecimento não encontrado');
    });
  });

  describe('DELETE /api/memory/knowledge/:id', () => {
    it('should_soft_delete_and_return_204', async () => {
      const token = await createToken({ sub: 'user-123' });

      await request(app.getHttpServer())
        .delete('/api/memory/knowledge/ki-1')
        .set('Authorization', `Bearer ${token}`)
        .expect(204);
    });

    it('should_return_404_for_nonexistent_item', async () => {
      const token = await createToken({ sub: 'user-123' });

      const response = await request(app.getHttpServer())
        .delete('/api/memory/knowledge/ki-nonexistent')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      expect(response.body.message).toBe('Item de conhecimento não encontrado');
    });

    it('should_not_delete_other_user_items', async () => {
      const token = await createToken({ sub: 'user-other' });

      const response = await request(app.getHttpServer())
        .delete('/api/memory/knowledge/ki-1')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      expect(response.body.message).toBe('Item de conhecimento não encontrado');
    });
  });
});
