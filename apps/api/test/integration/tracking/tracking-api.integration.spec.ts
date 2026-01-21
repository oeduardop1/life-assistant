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
  BadRequestException,
} from '@nestjs/common';
import type { INestApplication, ExecutionContext } from '@nestjs/common';
import { APP_GUARD, Reflector } from '@nestjs/core';
import request from 'supertest';
import { SignJWT, jwtVerify } from 'jose';
import type { Request } from 'express';

const jwtSecret = 'super-secret-jwt-token-with-at-least-32-characters-for-testing';

// Create inline decorators for testing
const IS_PUBLIC_KEY = 'isPublic';
const _Public = () => SetMetadata(IS_PUBLIC_KEY, true);

const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<Request>();
    const user = (request as Request & { user?: { id: string } }).user;
    return data ? user?.[data as keyof typeof user] : user;
  },
);

// Mock tracking entry type
interface MockTrackingEntry {
  id: string;
  userId: string;
  type: string;
  area: string;
  value: string;
  unit: string | null;
  metadata: Record<string, unknown>;
  entryDate: string;
  entryTime: string | null;
  source: string;
  createdAt: Date;
  updatedAt: Date;
}

// Mock data
const mockTrackingEntries: MockTrackingEntry[] = [
  {
    id: 'entry-1',
    userId: 'user-123',
    type: 'weight',
    area: 'health',
    value: '75.5',
    unit: 'kg',
    metadata: {},
    entryDate: '2024-01-15',
    entryTime: '08:00:00',
    source: 'form',
    createdAt: new Date('2024-01-15T08:00:00Z'),
    updatedAt: new Date('2024-01-15T08:00:00Z'),
  },
  {
    id: 'entry-2',
    userId: 'user-123',
    type: 'weight',
    area: 'health',
    value: '75.0',
    unit: 'kg',
    metadata: {},
    entryDate: '2024-01-14',
    entryTime: '08:30:00',
    source: 'chat',
    createdAt: new Date('2024-01-14T08:30:00Z'),
    updatedAt: new Date('2024-01-14T08:30:00Z'),
  },
  {
    id: 'entry-3',
    userId: 'user-123',
    type: 'water',
    area: 'health',
    value: '2000',
    unit: 'ml',
    metadata: {},
    entryDate: '2024-01-15',
    entryTime: null,
    source: 'form',
    createdAt: new Date('2024-01-15T12:00:00Z'),
    updatedAt: new Date('2024-01-15T12:00:00Z'),
  },
  {
    id: 'entry-4',
    userId: 'user-123',
    type: 'sleep',
    area: 'health',
    value: '7.5',
    unit: 'hours',
    metadata: { quality: 'good' },
    entryDate: '2024-01-15',
    entryTime: null,
    source: 'chat',
    createdAt: new Date('2024-01-15T06:00:00Z'),
    updatedAt: new Date('2024-01-15T06:00:00Z'),
  },
  {
    id: 'entry-5',
    userId: 'user-456',
    type: 'weight',
    area: 'health',
    value: '80.0',
    unit: 'kg',
    metadata: {},
    entryDate: '2024-01-15',
    entryTime: '09:00:00',
    source: 'form',
    createdAt: new Date('2024-01-15T09:00:00Z'),
    updatedAt: new Date('2024-01-15T09:00:00Z'),
  },
];

// Validation rules per type
const validationRules: Record<string, { min: number; max: number; defaultUnit: string }> = {
  weight: { min: 0.1, max: 500, defaultUnit: 'kg' },
  water: { min: 1, max: 10000, defaultUnit: 'ml' },
  sleep: { min: 0.1, max: 24, defaultUnit: 'hours' },
  exercise: { min: 1, max: 1440, defaultUnit: 'min' },
  mood: { min: 1, max: 10, defaultUnit: 'score' },
  energy: { min: 1, max: 10, defaultUnit: 'score' },
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

// Test controller simulating tracking endpoints
@Controller('tracking')
class TestTrackingController {
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @CurrentUser('id') userId: string,
    @Body() body: {
      type: string;
      area: string;
      value: number;
      unit?: string;
      entryDate: string;
      entryTime?: string;
      source?: string;
      metadata?: Record<string, unknown>;
    }
  ) {
    // Validate type
    const rules = validationRules[body.type];
    if (!rules && body.type !== 'custom') {
      throw new BadRequestException(`Invalid tracking type: ${body.type}`);
    }

    // Validate value range
    if (rules) {
      if (body.value < rules.min || body.value > rules.max) {
        throw new BadRequestException(
          `Value must be between ${rules.min} and ${rules.max} for ${body.type}`
        );
      }
    }

    const newEntry: MockTrackingEntry = {
      id: `entry-new-${Date.now()}`,
      userId,
      type: body.type,
      area: body.area,
      value: body.value.toString(),
      unit: body.unit ?? (rules?.defaultUnit || null),
      metadata: body.metadata ?? {},
      entryDate: body.entryDate,
      entryTime: body.entryTime ?? null,
      source: body.source ?? 'form',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return {
      entry: {
        ...newEntry,
        createdAt: newEntry.createdAt.toISOString(),
        updatedAt: newEntry.updatedAt.toISOString(),
      },
    };
  }

  @Get()
  list(
    @CurrentUser('id') userId: string,
    @Query('type') type?: string,
    @Query('area') area?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string
  ) {
    let entries = mockTrackingEntries.filter((e) => e.userId === userId);

    if (type) {
      entries = entries.filter((e) => e.type === type);
    }
    if (area) {
      entries = entries.filter((e) => e.area === area);
    }
    if (startDate) {
      entries = entries.filter((e) => e.entryDate >= startDate);
    }
    if (endDate) {
      entries = entries.filter((e) => e.entryDate <= endDate);
    }

    // Sort by entry date descending
    entries = entries.sort((a, b) => b.entryDate.localeCompare(a.entryDate));

    const parsedLimit = limit ? parseInt(limit, 10) : 50;
    const parsedOffset = offset ? parseInt(offset, 10) : 0;
    const paginatedEntries = entries.slice(parsedOffset, parsedOffset + parsedLimit);

    return {
      entries: paginatedEntries.map((entry) => ({
        ...entry,
        createdAt: entry.createdAt.toISOString(),
        updatedAt: entry.updatedAt.toISOString(),
      })),
      total: entries.length,
      hasMore: parsedOffset + parsedLimit < entries.length,
    };
  }

  @Get('aggregations')
  getAggregations(
    @CurrentUser('id') userId: string,
    @Query('type') type: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    let entries = mockTrackingEntries.filter(
      (e) => e.userId === userId && e.type === type
    );

    if (startDate) {
      entries = entries.filter((e) => e.entryDate >= startDate);
    }
    if (endDate) {
      entries = entries.filter((e) => e.entryDate <= endDate);
    }

    if (entries.length === 0) {
      return {
        aggregation: {
          type,
          average: null,
          sum: null,
          min: null,
          max: null,
          count: 0,
          latestValue: null,
          previousValue: null,
          variation: null,
        },
      };
    }

    const values = entries.map((e) => parseFloat(e.value));
    const sum = values.reduce((a, b) => a + b, 0);
    const average = sum / values.length;
    const min = Math.min(...values);
    const max = Math.max(...values);

    // Sort by date to get latest and previous
    const sorted = [...entries].sort((a, b) =>
      b.entryDate.localeCompare(a.entryDate)
    );
    const latestValue = parseFloat(sorted[0].value);
    const previousValue = sorted.length > 1 ? parseFloat(sorted[1].value) : null;
    const variation =
      previousValue !== null
        ? ((latestValue - previousValue) / previousValue) * 100
        : null;

    return {
      aggregation: {
        type,
        average: Math.round(average * 100) / 100,
        sum: Math.round(sum * 100) / 100,
        min,
        max,
        count: entries.length,
        latestValue,
        previousValue,
        variation: variation !== null ? Math.round(variation * 100) / 100 : null,
      },
    };
  }

  @Get('stats')
  getStats(@CurrentUser('id') userId: string) {
    const entries = mockTrackingEntries.filter((e) => e.userId === userId);

    const byType: Record<string, number> = {};
    for (const entry of entries) {
      byType[entry.type] = (byType[entry.type] ?? 0) + 1;
    }

    return {
      stats: {
        byType,
        total: entries.length,
      },
    };
  }

  @Get(':id')
  getById(
    @CurrentUser('id') userId: string,
    @Param('id') id: string
  ) {
    const entry = mockTrackingEntries.find(
      (e) => e.id === id && e.userId === userId
    );

    if (!entry) {
      throw new NotFoundException('Tracking entry not found');
    }

    return {
      entry: {
        ...entry,
        createdAt: entry.createdAt.toISOString(),
        updatedAt: entry.updatedAt.toISOString(),
      },
    };
  }

  @Patch(':id')
  update(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() body: {
      value?: number;
      unit?: string;
      entryDate?: string;
      entryTime?: string;
      metadata?: Record<string, unknown>;
    }
  ) {
    const entry = mockTrackingEntries.find(
      (e) => e.id === id && e.userId === userId
    );

    if (!entry) {
      throw new NotFoundException('Tracking entry not found');
    }

    // Validate value if updating
    if (body.value !== undefined) {
      const rules = validationRules[entry.type];
      if (rules && (body.value < rules.min || body.value > rules.max)) {
        throw new BadRequestException(
          `Value must be between ${rules.min} and ${rules.max} for ${entry.type}`
        );
      }
    }

    const updatedEntry = {
      ...entry,
      ...(body.value !== undefined && { value: body.value.toString() }),
      ...(body.unit !== undefined && { unit: body.unit }),
      ...(body.entryDate !== undefined && { entryDate: body.entryDate }),
      ...(body.entryTime !== undefined && { entryTime: body.entryTime }),
      ...(body.metadata !== undefined && { metadata: body.metadata }),
      updatedAt: new Date(),
    };

    return {
      entry: {
        ...updatedEntry,
        createdAt: updatedEntry.createdAt.toISOString(),
        updatedAt: updatedEntry.updatedAt.toISOString(),
      },
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(
    @CurrentUser('id') userId: string,
    @Param('id') id: string
  ) {
    const entry = mockTrackingEntries.find(
      (e) => e.id === id && e.userId === userId
    );

    if (!entry) {
      throw new NotFoundException('Tracking entry not found');
    }

    return;
  }
}

describe('Tracking API (Integration)', () => {
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
      controllers: [TestTrackingController],
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

  describe('POST /api/tracking', () => {
    it('should_create_entry_when_valid_dto', async () => {
      const token = await createToken({ sub: 'user-123' });

      const response = await request(app.getHttpServer())
        .post('/api/tracking')
        .set('Authorization', `Bearer ${token}`)
        .send({
          type: 'weight',
          area: 'health',
          value: 76.0,
          unit: 'kg',
          entryDate: '2024-01-16',
        })
        .expect(201);

      expect(response.body.entry).toMatchObject({
        type: 'weight',
        area: 'health',
        value: '76',
        unit: 'kg',
        entryDate: '2024-01-16',
        source: 'form',
      });
    });

    it('should_use_default_unit_when_not_provided', async () => {
      const token = await createToken({ sub: 'user-123' });

      const response = await request(app.getHttpServer())
        .post('/api/tracking')
        .set('Authorization', `Bearer ${token}`)
        .send({
          type: 'water',
          area: 'health',
          value: 500,
          entryDate: '2024-01-16',
        })
        .expect(201);

      expect(response.body.entry.unit).toBe('ml');
    });

    it('should_reject_value_below_minimum', async () => {
      const token = await createToken({ sub: 'user-123' });

      const response = await request(app.getHttpServer())
        .post('/api/tracking')
        .set('Authorization', `Bearer ${token}`)
        .send({
          type: 'weight',
          area: 'health',
          value: 0, // Below minimum of 0.1
          entryDate: '2024-01-16',
        })
        .expect(400);

      expect(response.body.message).toContain('Value must be between');
    });

    it('should_reject_value_above_maximum', async () => {
      const token = await createToken({ sub: 'user-123' });

      const response = await request(app.getHttpServer())
        .post('/api/tracking')
        .set('Authorization', `Bearer ${token}`)
        .send({
          type: 'weight',
          area: 'health',
          value: 600, // Above maximum of 500
          entryDate: '2024-01-16',
        })
        .expect(400);

      expect(response.body.message).toContain('Value must be between');
    });

    it('should_reject_without_token_401', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/tracking')
        .send({
          type: 'weight',
          area: 'health',
          value: 75,
          entryDate: '2024-01-16',
        })
        .expect(401);

      expect(response.body.message).toBe('Missing authorization token');
    });

    it('should_accept_metadata', async () => {
      const token = await createToken({ sub: 'user-123' });

      const response = await request(app.getHttpServer())
        .post('/api/tracking')
        .set('Authorization', `Bearer ${token}`)
        .send({
          type: 'sleep',
          area: 'health',
          value: 8,
          entryDate: '2024-01-16',
          metadata: { quality: 'excellent', notes: 'Woke up refreshed' },
        })
        .expect(201);

      expect(response.body.entry.metadata).toEqual({
        quality: 'excellent',
        notes: 'Woke up refreshed',
      });
    });

    it('should_accept_chat_as_source', async () => {
      const token = await createToken({ sub: 'user-123' });

      const response = await request(app.getHttpServer())
        .post('/api/tracking')
        .set('Authorization', `Bearer ${token}`)
        .send({
          type: 'mood',
          area: 'health',
          value: 8,
          entryDate: '2024-01-16',
          source: 'chat',
        })
        .expect(201);

      expect(response.body.entry.source).toBe('chat');
    });
  });

  describe('GET /api/tracking', () => {
    it('should_return_paginated_entries', async () => {
      const token = await createToken({ sub: 'user-123' });

      const response = await request(app.getHttpServer())
        .get('/api/tracking')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toMatchObject({
        entries: expect.any(Array),
        total: expect.any(Number),
        hasMore: expect.any(Boolean),
      });
      // User-123 has 4 entries
      expect(response.body.total).toBe(4);
    });

    it('should_filter_by_type', async () => {
      const token = await createToken({ sub: 'user-123' });

      const response = await request(app.getHttpServer())
        .get('/api/tracking?type=weight')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.entries).toHaveLength(2);
      expect(response.body.entries.every((e: { type: string }) => e.type === 'weight')).toBe(true);
    });

    it('should_filter_by_area', async () => {
      const token = await createToken({ sub: 'user-123' });

      const response = await request(app.getHttpServer())
        .get('/api/tracking?area=health')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.entries.every((e: { area: string }) => e.area === 'health')).toBe(true);
    });

    it('should_filter_by_date_range', async () => {
      const token = await createToken({ sub: 'user-123' });

      const response = await request(app.getHttpServer())
        .get('/api/tracking?startDate=2024-01-15&endDate=2024-01-15')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // User-123 has 3 entries on 2024-01-15
      expect(response.body.entries).toHaveLength(3);
      expect(
        response.body.entries.every((e: { entryDate: string }) => e.entryDate === '2024-01-15')
      ).toBe(true);
    });

    it('should_paginate_with_limit_offset', async () => {
      const token = await createToken({ sub: 'user-123' });

      const response = await request(app.getHttpServer())
        .get('/api/tracking?limit=2&offset=0')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.entries).toHaveLength(2);
      expect(response.body.total).toBe(4);
      expect(response.body.hasMore).toBe(true);
    });

    it('should_return_entries_sorted_by_date_descending', async () => {
      const token = await createToken({ sub: 'user-123' });

      const response = await request(app.getHttpServer())
        .get('/api/tracking')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const dates = response.body.entries.map((e: { entryDate: string }) => e.entryDate);
      const sortedDates = [...dates].sort((a: string, b: string) => b.localeCompare(a));
      expect(dates).toEqual(sortedDates);
    });
  });

  describe('GET /api/tracking/aggregations', () => {
    it('should_return_aggregations_for_type', async () => {
      const token = await createToken({ sub: 'user-123' });

      const response = await request(app.getHttpServer())
        .get('/api/tracking/aggregations?type=weight')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.aggregation).toMatchObject({
        type: 'weight',
        count: 2,
        average: expect.any(Number),
        sum: expect.any(Number),
        min: 75.0,
        max: 75.5,
        latestValue: 75.5,
        previousValue: 75.0,
        variation: expect.any(Number),
      });
    });

    it('should_return_null_values_when_no_entries', async () => {
      const token = await createToken({ sub: 'user-123' });

      const response = await request(app.getHttpServer())
        .get('/api/tracking/aggregations?type=exercise')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.aggregation).toMatchObject({
        type: 'exercise',
        count: 0,
        average: null,
        sum: null,
        min: null,
        max: null,
        latestValue: null,
        previousValue: null,
        variation: null,
      });
    });

    it('should_filter_aggregations_by_date_range', async () => {
      const token = await createToken({ sub: 'user-123' });

      const response = await request(app.getHttpServer())
        .get('/api/tracking/aggregations?type=weight&startDate=2024-01-15&endDate=2024-01-15')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Only one weight entry on 2024-01-15
      expect(response.body.aggregation.count).toBe(1);
      expect(response.body.aggregation.latestValue).toBe(75.5);
    });
  });

  describe('GET /api/tracking/stats', () => {
    it('should_return_tracking_stats', async () => {
      const token = await createToken({ sub: 'user-123' });

      const response = await request(app.getHttpServer())
        .get('/api/tracking/stats')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.stats).toMatchObject({
        byType: {
          weight: 2,
          water: 1,
          sleep: 1,
        },
        total: 4,
      });
    });

    it('should_return_empty_stats_for_new_user', async () => {
      const token = await createToken({ sub: 'user-new' });

      const response = await request(app.getHttpServer())
        .get('/api/tracking/stats')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.stats).toMatchObject({
        byType: {},
        total: 0,
      });
    });
  });

  describe('GET /api/tracking/:id', () => {
    it('should_return_entry_when_exists', async () => {
      const token = await createToken({ sub: 'user-123' });

      const response = await request(app.getHttpServer())
        .get('/api/tracking/entry-1')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.entry).toMatchObject({
        id: 'entry-1',
        type: 'weight',
        value: '75.5',
        unit: 'kg',
      });
    });

    it('should_return_404_when_not_found', async () => {
      const token = await createToken({ sub: 'user-123' });

      const response = await request(app.getHttpServer())
        .get('/api/tracking/nonexistent')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      expect(response.body.message).toBe('Tracking entry not found');
    });

    it('should_not_return_other_user_entries_multitenant', async () => {
      const token = await createToken({ sub: 'user-123' });

      // entry-5 belongs to user-456
      const response = await request(app.getHttpServer())
        .get('/api/tracking/entry-5')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      expect(response.body.message).toBe('Tracking entry not found');
    });
  });

  describe('PATCH /api/tracking/:id', () => {
    it('should_update_entry_value', async () => {
      const token = await createToken({ sub: 'user-123' });

      const response = await request(app.getHttpServer())
        .patch('/api/tracking/entry-1')
        .set('Authorization', `Bearer ${token}`)
        .send({ value: 76.0 })
        .expect(200);

      expect(response.body.entry.value).toBe('76');
    });

    it('should_update_multiple_fields', async () => {
      const token = await createToken({ sub: 'user-123' });

      const response = await request(app.getHttpServer())
        .patch('/api/tracking/entry-1')
        .set('Authorization', `Bearer ${token}`)
        .send({
          value: 77.0,
          entryDate: '2024-01-17',
          metadata: { notes: 'Updated' },
        })
        .expect(200);

      expect(response.body.entry).toMatchObject({
        value: '77',
        entryDate: '2024-01-17',
        metadata: { notes: 'Updated' },
      });
    });

    it('should_return_404_for_nonexistent_entry', async () => {
      const token = await createToken({ sub: 'user-123' });

      const response = await request(app.getHttpServer())
        .patch('/api/tracking/nonexistent')
        .set('Authorization', `Bearer ${token}`)
        .send({ value: 76.0 })
        .expect(404);

      expect(response.body.message).toBe('Tracking entry not found');
    });

    it('should_not_update_other_user_entries_multitenant', async () => {
      const token = await createToken({ sub: 'user-123' });

      // entry-5 belongs to user-456
      const response = await request(app.getHttpServer())
        .patch('/api/tracking/entry-5')
        .set('Authorization', `Bearer ${token}`)
        .send({ value: 85.0 })
        .expect(404);

      expect(response.body.message).toBe('Tracking entry not found');
    });

    it('should_reject_invalid_value_on_update', async () => {
      const token = await createToken({ sub: 'user-123' });

      const response = await request(app.getHttpServer())
        .patch('/api/tracking/entry-1')
        .set('Authorization', `Bearer ${token}`)
        .send({ value: 600 }) // Above max for weight
        .expect(400);

      expect(response.body.message).toContain('Value must be between');
    });
  });

  describe('DELETE /api/tracking/:id', () => {
    it('should_delete_entry_and_return_204', async () => {
      const token = await createToken({ sub: 'user-123' });

      await request(app.getHttpServer())
        .delete('/api/tracking/entry-1')
        .set('Authorization', `Bearer ${token}`)
        .expect(204);
    });

    it('should_return_404_for_nonexistent_entry', async () => {
      const token = await createToken({ sub: 'user-123' });

      const response = await request(app.getHttpServer())
        .delete('/api/tracking/nonexistent')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      expect(response.body.message).toBe('Tracking entry not found');
    });

    it('should_not_delete_other_user_entries_multitenant', async () => {
      const token = await createToken({ sub: 'user-123' });

      // entry-5 belongs to user-456
      const response = await request(app.getHttpServer())
        .delete('/api/tracking/entry-5')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      expect(response.body.message).toBe('Tracking entry not found');
    });
  });

  describe('Multi-tenant Isolation', () => {
    it('should_isolate_entries_between_users', async () => {
      const tokenUser123 = await createToken({ sub: 'user-123' });
      const tokenUser456 = await createToken({ sub: 'user-456' });

      const response123 = await request(app.getHttpServer())
        .get('/api/tracking')
        .set('Authorization', `Bearer ${tokenUser123}`)
        .expect(200);

      const response456 = await request(app.getHttpServer())
        .get('/api/tracking')
        .set('Authorization', `Bearer ${tokenUser456}`)
        .expect(200);

      // User-123 should see 4 entries
      expect(response123.body.total).toBe(4);

      // User-456 should see only 1 entry
      expect(response456.body.total).toBe(1);

      // Entry IDs should not overlap
      const ids123 = response123.body.entries.map((e: { id: string }) => e.id);
      const ids456 = response456.body.entries.map((e: { id: string }) => e.id);
      const overlap = ids123.filter((id: string) => ids456.includes(id));
      expect(overlap).toHaveLength(0);
    });

    it('should_isolate_stats_between_users', async () => {
      const tokenUser123 = await createToken({ sub: 'user-123' });
      const tokenUser456 = await createToken({ sub: 'user-456' });

      const response123 = await request(app.getHttpServer())
        .get('/api/tracking/stats')
        .set('Authorization', `Bearer ${tokenUser123}`)
        .expect(200);

      const response456 = await request(app.getHttpServer())
        .get('/api/tracking/stats')
        .set('Authorization', `Bearer ${tokenUser456}`)
        .expect(200);

      expect(response123.body.stats.total).toBe(4);
      expect(response456.body.stats.total).toBe(1);
    });

    it('should_isolate_aggregations_between_users', async () => {
      const tokenUser123 = await createToken({ sub: 'user-123' });
      const tokenUser456 = await createToken({ sub: 'user-456' });

      const response123 = await request(app.getHttpServer())
        .get('/api/tracking/aggregations?type=weight')
        .set('Authorization', `Bearer ${tokenUser123}`)
        .expect(200);

      const response456 = await request(app.getHttpServer())
        .get('/api/tracking/aggregations?type=weight')
        .set('Authorization', `Bearer ${tokenUser456}`)
        .expect(200);

      // User-123 has 2 weight entries, user-456 has 1
      expect(response123.body.aggregation.count).toBe(2);
      expect(response456.body.aggregation.count).toBe(1);

      // Different values
      expect(response123.body.aggregation.latestValue).toBe(75.5);
      expect(response456.body.aggregation.latestValue).toBe(80.0);
    });
  });

  describe('Date Filtering Edge Cases', () => {
    it('should_include_entries_on_start_boundary', async () => {
      const token = await createToken({ sub: 'user-123' });

      const response = await request(app.getHttpServer())
        .get('/api/tracking?startDate=2024-01-14')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Should include entry from 2024-01-14
      const dates = response.body.entries.map((e: { entryDate: string }) => e.entryDate);
      expect(dates).toContain('2024-01-14');
    });

    it('should_include_entries_on_end_boundary', async () => {
      const token = await createToken({ sub: 'user-123' });

      const response = await request(app.getHttpServer())
        .get('/api/tracking?endDate=2024-01-14')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Should include entry from 2024-01-14, exclude 2024-01-15
      const dates = response.body.entries.map((e: { entryDate: string }) => e.entryDate);
      expect(dates).toContain('2024-01-14');
      expect(dates).not.toContain('2024-01-15');
    });

    it('should_handle_single_day_range', async () => {
      const token = await createToken({ sub: 'user-123' });

      const response = await request(app.getHttpServer())
        .get('/api/tracking?startDate=2024-01-14&endDate=2024-01-14')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Should only include entries from 2024-01-14
      expect(response.body.entries).toHaveLength(1);
      expect(response.body.entries[0].entryDate).toBe('2024-01-14');
    });
  });
});
