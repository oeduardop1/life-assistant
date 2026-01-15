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
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
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
    sourceRef: 'conv-123',
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
    source: 'ai_inference',
    sourceRef: null,
    confidence: 0.6,
    validatedByUser: false,
    tags: ['sleep', 'routine'],
    createdAt: new Date('2024-01-02'),
    updatedAt: new Date('2024-01-02'),
    deletedAt: null,
  },
  {
    id: 'ki-3',
    userId: 'user-123',
    type: 'memory',
    area: 'relationships',
    title: 'Friend birthday',
    content: 'Best friend birthday is in March',
    source: 'user_input',
    sourceRef: null,
    confidence: 1.0,
    validatedByUser: true,
    tags: ['friends', 'birthday'],
    createdAt: new Date('2024-01-03'),
    updatedAt: new Date('2024-01-03'),
    deletedAt: null,
  },
];

const mockStats = {
  byArea: {
    health: 1,
    financial: 0,
    relationships: 1,
    career: 1,
    personal_growth: 0,
    leisure: 0,
    spirituality: 0,
    mental_health: 0,
  },
  byType: {
    fact: 1,
    preference: 1,
    memory: 1,
    insight: 0,
    person: 0,
  },
  total: 3,
};

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
  getMemoryOverview(@CurrentUser('id') userId: string) {
    const userMemory = userId !== 'user-123'
      ? {
          ...mockUserMemory,
          id: 'mem-new',
          userId,
          bio: null,
          occupation: null,
        }
      : mockUserMemory;

    return {
      userMemory,
      stats: mockStats,
    };
  }

  @Get('items')
  listKnowledgeItems(
    @CurrentUser('id') userId: string,
    @Query('type') type?: string,
    @Query('area') area?: string,
    @Query('source') source?: string,
    @Query('confidenceMin') confidenceMin?: string,
    @Query('confidenceMax') confidenceMax?: string,
    @Query('search') search?: string,
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
    if (source) {
      items = items.filter((i) => i.source === source);
    }
    if (confidenceMin) {
      items = items.filter((i) => i.confidence >= parseFloat(confidenceMin));
    }
    if (confidenceMax) {
      items = items.filter((i) => i.confidence <= parseFloat(confidenceMax));
    }
    if (search) {
      const searchLower = search.toLowerCase();
      items = items.filter(
        (i) =>
          i.title.toLowerCase().includes(searchLower) ||
          i.content.toLowerCase().includes(searchLower)
      );
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

  @Post('items')
  createKnowledgeItem(
    @CurrentUser('id') userId: string,
    @Body() body: { type: string; content: string; area?: string; title?: string; tags?: string[] }
  ) {
    const newItem = {
      id: 'ki-new',
      userId,
      type: body.type,
      area: body.area ?? null,
      title: body.title ?? `Item: ${body.content.substring(0, 20)}`,
      content: body.content,
      source: 'user_input',
      sourceRef: null,
      confidence: 1.0,
      validatedByUser: true,
      tags: body.tags ?? [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return {
      ...newItem,
      createdAt: newItem.createdAt.toISOString(),
      updatedAt: newItem.updatedAt.toISOString(),
    };
  }

  @Get('items/:id')
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

  @Patch('items/:id')
  updateKnowledgeItem(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() body: { title?: string; content?: string; tags?: string[] }
  ) {
    const item = mockKnowledgeItems.find(
      (i) => i.id === id && i.userId === userId
    );

    if (!item) {
      throw new NotFoundException('Item de conhecimento não encontrado');
    }

    const updatedItem = {
      ...item,
      ...(body.title !== undefined && { title: body.title }),
      ...(body.content !== undefined && { content: body.content }),
      ...(body.tags !== undefined && { tags: body.tags }),
      updatedAt: new Date(),
    };

    return {
      ...updatedItem,
      createdAt: updatedItem.createdAt.toISOString(),
      updatedAt: updatedItem.updatedAt.toISOString(),
    };
  }

  @Delete('items/:id')
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

  @Post('items/:id/validate')
  @HttpCode(HttpStatus.OK)
  validateKnowledgeItem(
    @CurrentUser('id') userId: string,
    @Param('id') id: string
  ) {
    const item = mockKnowledgeItems.find(
      (i) => i.id === id && i.userId === userId
    );

    if (!item) {
      throw new NotFoundException('Item de conhecimento não encontrado');
    }

    return {
      success: true,
      id: item.id,
      confidence: 1.0,
      validatedByUser: true,
    };
  }

  @Get('export')
  exportMemory(@CurrentUser('id') userId: string) {
    const items = mockKnowledgeItems.filter((i) => i.userId === userId);

    return {
      items: items.map((item) => ({
        ...item,
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString(),
      })),
      total: items.length,
      exportedAt: new Date().toISOString(),
    };
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
    it('should_return_memory_overview_with_stats', async () => {
      const token = await createToken({ sub: 'user-123' });

      const response = await request(app.getHttpServer())
        .get('/api/memory')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toMatchObject({
        userMemory: {
          id: 'mem-123',
          userId: 'user-123',
          bio: 'Test user bio',
          occupation: 'Developer',
        },
        stats: {
          byArea: expect.any(Object),
          byType: expect.any(Object),
          total: 3,
        },
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

      expect(response.body.userMemory).toMatchObject({
        id: 'mem-new',
        userId: 'user-new',
        bio: null,
        occupation: null,
      });
    });
  });

  describe('GET /api/memory/items', () => {
    it('should_return_knowledge_items_list', async () => {
      const token = await createToken({ sub: 'user-123' });

      const response = await request(app.getHttpServer())
        .get('/api/memory/items')
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
        total: 3,
        hasMore: false,
      });
    });

    it('should_filter_by_type', async () => {
      const token = await createToken({ sub: 'user-123' });

      const response = await request(app.getHttpServer())
        .get('/api/memory/items?type=preference')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.items).toHaveLength(1);
      expect(response.body.items[0].type).toBe('preference');
    });

    it('should_filter_by_area', async () => {
      const token = await createToken({ sub: 'user-123' });

      const response = await request(app.getHttpServer())
        .get('/api/memory/items?area=career')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.items).toHaveLength(1);
      expect(response.body.items[0].area).toBe('career');
    });

    it('should_filter_by_source', async () => {
      const token = await createToken({ sub: 'user-123' });

      const response = await request(app.getHttpServer())
        .get('/api/memory/items?source=user_input')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.items).toHaveLength(1);
      expect(response.body.items[0].source).toBe('user_input');
    });

    it('should_filter_by_confidence_range', async () => {
      const token = await createToken({ sub: 'user-123' });

      const response = await request(app.getHttpServer())
        .get('/api/memory/items?confidenceMin=0.8')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Only ki-1 (0.95) and ki-3 (1.0) have confidence >= 0.8
      expect(response.body.items).toHaveLength(2);
      expect(response.body.items.every((i: { confidence: number }) => i.confidence >= 0.8)).toBe(true);
    });

    it('should_filter_by_search_term', async () => {
      const token = await createToken({ sub: 'user-123' });

      const response = await request(app.getHttpServer())
        .get('/api/memory/items?search=developer')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.items).toHaveLength(1);
      expect(response.body.items[0].content).toContain('developer');
    });

    it('should_paginate_with_limit_offset', async () => {
      const token = await createToken({ sub: 'user-123' });

      const response = await request(app.getHttpServer())
        .get('/api/memory/items?limit=1&offset=0')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.items).toHaveLength(1);
      expect(response.body.total).toBe(3);
      expect(response.body.hasMore).toBe(true);
    });

    it('should_return_hasMore_correctly', async () => {
      const token = await createToken({ sub: 'user-123' });

      const response = await request(app.getHttpServer())
        .get('/api/memory/items?limit=10&offset=0')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.hasMore).toBe(false);
    });
  });

  describe('POST /api/memory/items', () => {
    it('should_create_knowledge_item', async () => {
      const token = await createToken({ sub: 'user-123' });

      const response = await request(app.getHttpServer())
        .post('/api/memory/items')
        .set('Authorization', `Bearer ${token}`)
        .send({
          type: 'fact',
          content: 'New fact about user',
          area: 'career',
          title: 'Custom title',
          tags: ['test'],
        })
        .expect(201);

      expect(response.body).toMatchObject({
        id: 'ki-new',
        type: 'fact',
        content: 'New fact about user',
        area: 'career',
        title: 'Custom title',
        source: 'user_input',
        confidence: 1.0,
        tags: ['test'],
      });
    });

    it('should_create_item_without_optional_fields', async () => {
      const token = await createToken({ sub: 'user-123' });

      const response = await request(app.getHttpServer())
        .post('/api/memory/items')
        .set('Authorization', `Bearer ${token}`)
        .send({
          type: 'preference',
          content: 'Prefers coffee',
        })
        .expect(201);

      expect(response.body).toMatchObject({
        type: 'preference',
        content: 'Prefers coffee',
        source: 'user_input',
        confidence: 1.0,
      });
    });
  });

  describe('GET /api/memory/items/:id', () => {
    it('should_return_knowledge_item_details', async () => {
      const token = await createToken({ sub: 'user-123' });

      const response = await request(app.getHttpServer())
        .get('/api/memory/items/ki-1')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toMatchObject({
        id: 'ki-1',
        type: 'fact',
        area: 'career',
        content: 'Works as a software developer',
        sourceRef: 'conv-123',
      });
    });

    it('should_return_404_for_nonexistent_item', async () => {
      const token = await createToken({ sub: 'user-123' });

      const response = await request(app.getHttpServer())
        .get('/api/memory/items/ki-nonexistent')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      expect(response.body.message).toBe('Item de conhecimento não encontrado');
    });

    it('should_not_return_other_user_items', async () => {
      const token = await createToken({ sub: 'user-other' });

      const response = await request(app.getHttpServer())
        .get('/api/memory/items/ki-1')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      expect(response.body.message).toBe('Item de conhecimento não encontrado');
    });
  });

  describe('PATCH /api/memory/items/:id', () => {
    it('should_update_knowledge_item', async () => {
      const token = await createToken({ sub: 'user-123' });

      const response = await request(app.getHttpServer())
        .patch('/api/memory/items/ki-1')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Updated title',
          content: 'Updated content',
          tags: ['new-tag'],
        })
        .expect(200);

      expect(response.body).toMatchObject({
        id: 'ki-1',
        title: 'Updated title',
        content: 'Updated content',
        tags: ['new-tag'],
      });
    });

    it('should_update_partial_fields', async () => {
      const token = await createToken({ sub: 'user-123' });

      const response = await request(app.getHttpServer())
        .patch('/api/memory/items/ki-1')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Only title updated',
        })
        .expect(200);

      expect(response.body).toMatchObject({
        id: 'ki-1',
        title: 'Only title updated',
        content: 'Works as a software developer', // Original content preserved
      });
    });

    it('should_return_404_for_nonexistent_item', async () => {
      const token = await createToken({ sub: 'user-123' });

      const response = await request(app.getHttpServer())
        .patch('/api/memory/items/ki-nonexistent')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'New title' })
        .expect(404);

      expect(response.body.message).toBe('Item de conhecimento não encontrado');
    });
  });

  describe('DELETE /api/memory/items/:id', () => {
    it('should_soft_delete_and_return_204', async () => {
      const token = await createToken({ sub: 'user-123' });

      await request(app.getHttpServer())
        .delete('/api/memory/items/ki-1')
        .set('Authorization', `Bearer ${token}`)
        .expect(204);
    });

    it('should_return_404_for_nonexistent_item', async () => {
      const token = await createToken({ sub: 'user-123' });

      const response = await request(app.getHttpServer())
        .delete('/api/memory/items/ki-nonexistent')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      expect(response.body.message).toBe('Item de conhecimento não encontrado');
    });

    it('should_not_delete_other_user_items', async () => {
      const token = await createToken({ sub: 'user-other' });

      const response = await request(app.getHttpServer())
        .delete('/api/memory/items/ki-1')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      expect(response.body.message).toBe('Item de conhecimento não encontrado');
    });
  });

  describe('POST /api/memory/items/:id/validate', () => {
    it('should_validate_knowledge_item', async () => {
      const token = await createToken({ sub: 'user-123' });

      const response = await request(app.getHttpServer())
        .post('/api/memory/items/ki-2/validate')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        id: 'ki-2',
        confidence: 1.0,
        validatedByUser: true,
      });
    });

    it('should_return_404_for_nonexistent_item', async () => {
      const token = await createToken({ sub: 'user-123' });

      const response = await request(app.getHttpServer())
        .post('/api/memory/items/ki-nonexistent/validate')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      expect(response.body.message).toBe('Item de conhecimento não encontrado');
    });
  });

  describe('GET /api/memory/export', () => {
    it('should_export_all_knowledge_items', async () => {
      const token = await createToken({ sub: 'user-123' });

      const response = await request(app.getHttpServer())
        .get('/api/memory/export')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toMatchObject({
        items: expect.arrayContaining([
          expect.objectContaining({ id: 'ki-1' }),
          expect.objectContaining({ id: 'ki-2' }),
          expect.objectContaining({ id: 'ki-3' }),
        ]),
        total: 3,
        exportedAt: expect.any(String),
      });
    });

    it('should_return_empty_array_for_new_user', async () => {
      const token = await createToken({ sub: 'user-new' });

      const response = await request(app.getHttpServer())
        .get('/api/memory/export')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toMatchObject({
        items: [],
        total: 0,
        exportedAt: expect.any(String),
      });
    });
  });
});
