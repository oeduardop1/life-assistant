/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import 'reflect-metadata';
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
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
  NotFoundException,
  SetMetadata,
  createParamDecorator,
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

// Mock data interfaces
interface MockBill {
  id: string;
  userId: string;
  name: string;
  category: string;
  amount: string;
  dueDay: number;
  monthYear: string;
  status: 'pending' | 'paid' | 'overdue' | 'canceled';
  isRecurring: boolean;
  recurringGroupId: string | null;
  currency: string;
  paidAt: string | null;
}

// Mutable mock data (reset in beforeEach)
let mockBills: MockBill[] = [];
let billIdCounter = 0;

// Utility: get previous month
function getPreviousMonth(monthYear: string): string {
  const parts = monthYear.split('-');
  const year = parseInt(parts[0]!, 10);
  const month = parseInt(parts[1]!, 10);
  if (month === 1) {
    return `${year - 1}-12`;
  }
  return `${year}-${String(month - 1).padStart(2, '0')}`;
}

// Utility: generate UUID-like string
function generateId(): string {
  billIdCounter++;
  return `bill-${String(billIdCounter).padStart(3, '0')}`;
}

// Service-layer logic: ensureRecurringForMonth (mirrors bills.service.ts:133-178)
function ensureRecurringForMonth(userId: string, targetMonth: string): void {
  const previousMonth = getPreviousMonth(targetMonth);
  const recurringItems = mockBills.filter(
    (b) =>
      b.userId === userId &&
      b.monthYear === previousMonth &&
      b.isRecurring === true &&
      b.recurringGroupId !== null
  );

  if (recurringItems.length === 0) return;

  for (const item of recurringItems) {
    if (!item.recurringGroupId) continue;

    // Check if entry already exists (UNIQUE constraint simulation)
    const existing = mockBills.find(
      (b) =>
        b.userId === userId &&
        b.recurringGroupId === item.recurringGroupId &&
        b.monthYear === targetMonth
    );

    if (!existing) {
      mockBills.push({
        id: generateId(),
        userId,
        name: item.name,
        category: item.category,
        amount: item.amount,
        dueDay: item.dueDay,
        monthYear: targetMonth,
        status: 'pending',
        isRecurring: true,
        recurringGroupId: item.recurringGroupId,
        currency: item.currency,
        paidAt: null,
      });
    }
  }
}

// Inline test controller (mirrors bills.controller.ts behavior)
@Controller('finance/bills')
class TestRecurringBillsController {
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @CurrentUser('id') userId: string,
    @Body()
    body: {
      name: string;
      category: string;
      amount: number;
      dueDay: number;
      monthYear: string;
      isRecurring?: boolean;
      currency?: string;
    }
  ) {
    const isRecurring = body.isRecurring ?? true;
    const bill: MockBill = {
      id: generateId(),
      userId,
      name: body.name,
      category: body.category,
      amount: body.amount.toString(),
      dueDay: body.dueDay,
      monthYear: body.monthYear,
      status: 'pending',
      isRecurring,
      recurringGroupId: isRecurring ? `group-${Date.now()}-${billIdCounter}` : null,
      currency: body.currency ?? 'BRL',
      paidAt: null,
    };

    mockBills.push(bill);
    return { bill };
  }

  @Get()
  findAll(
    @CurrentUser('id') userId: string,
    @Query('monthYear') monthYear?: string
  ) {
    // Lazy generation trigger (mirrors bills.service.ts findAll)
    if (monthYear) {
      ensureRecurringForMonth(userId, monthYear);
    }

    const bills = mockBills.filter(
      (b) => b.userId === userId && (!monthYear || b.monthYear === monthYear)
    );
    return { bills, total: bills.length };
  }

  @Get(':id')
  findById(@CurrentUser('id') userId: string, @Param('id') id: string) {
    const bill = mockBills.find((b) => b.id === id && b.userId === userId);
    if (!bill) throw new NotFoundException(`Bill ${id} not found`);
    return { bill };
  }

  @Patch(':id')
  update(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() body: Partial<{ name: string; amount: number; category: string }>,
    @Query('scope') scope?: 'this' | 'future' | 'all'
  ) {
    const effectiveScope = scope ?? 'this';
    const bill = mockBills.find((b) => b.id === id && b.userId === userId);
    if (!bill) throw new NotFoundException(`Bill ${id} not found`);

    const updateData: Partial<MockBill> = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.amount !== undefined) updateData.amount = body.amount.toString();
    if (body.category !== undefined) updateData.category = body.category;

    if (effectiveScope === 'this' || !bill.recurringGroupId) {
      Object.assign(bill, updateData);
      return { bill };
    }

    if (effectiveScope === 'future') {
      Object.assign(bill, updateData);
      // Update future entries with same recurringGroupId
      mockBills
        .filter(
          (b) =>
            b.userId === userId &&
            b.recurringGroupId === bill.recurringGroupId &&
            b.monthYear > bill.monthYear
        )
        .forEach((b) => Object.assign(b, updateData));
      return { bill };
    }

    // scope === 'all'
    mockBills
      .filter(
        (b) => b.userId === userId && b.recurringGroupId === bill.recurringGroupId
      )
      .forEach((b) => Object.assign(b, updateData));
    return { bill };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Query('scope') scope?: 'this' | 'future' | 'all'
  ) {
    const effectiveScope = scope ?? 'this';
    const bill = mockBills.find((b) => b.id === id && b.userId === userId);
    if (!bill) throw new NotFoundException(`Bill ${id} not found`);

    if (effectiveScope === 'this' || !bill.recurringGroupId) {
      // Mark as canceled (don't delete — lazy gen would recreate)
      bill.status = 'canceled';
      return;
    }

    if (effectiveScope === 'future') {
      // Stop recurrence from this month forward
      bill.isRecurring = false;
      mockBills = mockBills.filter(
        (b) =>
          !(
            b.userId === userId &&
            b.recurringGroupId === bill.recurringGroupId &&
            b.monthYear > bill.monthYear
          )
      );
      return;
    }

    // scope === 'all' — delete entire group
    mockBills = mockBills.filter(
      (b) =>
        !(b.userId === userId && b.recurringGroupId === bill.recurringGroupId)
    );
  }
}

// Auth guard factory
const createTestAuthGuard = (reflector: Reflector) => {
  const secretKey = new TextEncoder().encode(jwtSecret);

  return {
    canActivate: async (context: ExecutionContext): Promise<boolean> => {
      const isPublic = reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);

      if (isPublic) return true;

      const req = context.switchToHttp().getRequest<Request>();
      const authHeader = req.headers.authorization;

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

        (req as Request & { user: { id: string } }).user = {
          id: payload.sub,
        };

        return true;
      } catch (error) {
        if (error instanceof UnauthorizedException) throw error;
        throw new UnauthorizedException('Invalid or expired token');
      }
    },
  };
};

// Test suite
describe('Finance Recurring (Integration)', () => {
  let app: INestApplication;

  async function createToken(userId: string) {
    const secret = new TextEncoder().encode(jwtSecret);
    return new SignJWT({ sub: userId })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('1h')
      .setIssuedAt()
      .sign(secret);
  }

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [TestRecurringBillsController],
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
    mockBills = [];
    billIdCounter = 0;
  });

  describe('Lazy Generation', () => {
    it('should_generate_recurring_bill_when_accessing_next_month', async () => {
      const token = await createToken('user-123');

      // 1. Create a recurring bill in January
      const createRes = await request(app.getHttpServer())
        .post('/api/finance/bills')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Internet',
          category: 'utilities',
          amount: 120,
          dueDay: 10,
          monthYear: '2026-01',
          isRecurring: true,
        })
        .expect(201);

      expect(createRes.body.bill.recurringGroupId).not.toBeNull();
      expect(createRes.body.bill.isRecurring).toBe(true);

      // 2. Access February — lazy generation should create entry
      const febRes = await request(app.getHttpServer())
        .get('/api/finance/bills?monthYear=2026-02')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(febRes.body.bills).toHaveLength(1);
      expect(febRes.body.bills[0].name).toBe('Internet');
      expect(febRes.body.bills[0].monthYear).toBe('2026-02');
      expect(febRes.body.bills[0].status).toBe('pending');
      expect(febRes.body.bills[0].amount).toBe('120');
      expect(febRes.body.bills[0].recurringGroupId).toBe(
        createRes.body.bill.recurringGroupId
      );
    });

    it('should_not_duplicate_entries_on_multiple_accesses_to_same_month', async () => {
      const token = await createToken('user-123');

      // Create recurring bill in January
      await request(app.getHttpServer())
        .post('/api/finance/bills')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Rent',
          category: 'housing',
          amount: 2000,
          dueDay: 5,
          monthYear: '2026-01',
          isRecurring: true,
        })
        .expect(201);

      // Access February multiple times
      await request(app.getHttpServer())
        .get('/api/finance/bills?monthYear=2026-02')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      await request(app.getHttpServer())
        .get('/api/finance/bills?monthYear=2026-02')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const thirdRes = await request(app.getHttpServer())
        .get('/api/finance/bills?monthYear=2026-02')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Still only 1 entry (idempotent)
      expect(thirdRes.body.bills).toHaveLength(1);
    });

    it('should_not_generate_for_non_recurring_bills', async () => {
      const token = await createToken('user-123');

      // Create a non-recurring bill in January
      await request(app.getHttpServer())
        .post('/api/finance/bills')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'One-time Purchase',
          category: 'other',
          amount: 500,
          dueDay: 15,
          monthYear: '2026-01',
          isRecurring: false,
        })
        .expect(201);

      // Access February — nothing should be generated
      const febRes = await request(app.getHttpServer())
        .get('/api/finance/bills?monthYear=2026-02')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(febRes.body.bills).toHaveLength(0);
    });

    it('should_generate_from_canceled_bill_when_isRecurring_is_true', async () => {
      const token = await createToken('user-123');

      // Create recurring bill in January
      const createRes = await request(app.getHttpServer())
        .post('/api/finance/bills')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Streaming',
          category: 'entertainment',
          amount: 50,
          dueDay: 20,
          monthYear: '2026-01',
          isRecurring: true,
        })
        .expect(201);

      // Cancel it for this month (scope: 'this')
      await request(app.getHttpServer())
        .delete(`/api/finance/bills/${createRes.body.bill.id}?scope=this`)
        .set('Authorization', `Bearer ${token}`)
        .expect(204);

      // Verify it's canceled
      const janRes = await request(app.getHttpServer())
        .get('/api/finance/bills?monthYear=2026-01')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(janRes.body.bills[0].status).toBe('canceled');
      expect(janRes.body.bills[0].isRecurring).toBe(true);

      // Access February — should still generate because isRecurring=true
      const febRes = await request(app.getHttpServer())
        .get('/api/finance/bills?monthYear=2026-02')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(febRes.body.bills).toHaveLength(1);
      expect(febRes.body.bills[0].name).toBe('Streaming');
      expect(febRes.body.bills[0].status).toBe('pending');
    });

    it('should_handle_year_boundary_december_to_january', async () => {
      const token = await createToken('user-123');

      // Create recurring bill in December 2025
      await request(app.getHttpServer())
        .post('/api/finance/bills')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Gym',
          category: 'health',
          amount: 90,
          dueDay: 1,
          monthYear: '2025-12',
          isRecurring: true,
        })
        .expect(201);

      // Access January 2026 — should pick up from Dec 2025
      const janRes = await request(app.getHttpServer())
        .get('/api/finance/bills?monthYear=2026-01')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(janRes.body.bills).toHaveLength(1);
      expect(janRes.body.bills[0].name).toBe('Gym');
      expect(janRes.body.bills[0].monthYear).toBe('2026-01');
    });

    it('should_generate_multiple_recurring_bills_at_once', async () => {
      const token = await createToken('user-123');

      // Create 3 recurring bills in January
      await request(app.getHttpServer())
        .post('/api/finance/bills')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Internet', category: 'utilities', amount: 120, dueDay: 10, monthYear: '2026-01', isRecurring: true })
        .expect(201);

      await request(app.getHttpServer())
        .post('/api/finance/bills')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Rent', category: 'housing', amount: 2000, dueDay: 5, monthYear: '2026-01', isRecurring: true })
        .expect(201);

      await request(app.getHttpServer())
        .post('/api/finance/bills')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Gym', category: 'health', amount: 90, dueDay: 1, monthYear: '2026-01', isRecurring: true })
        .expect(201);

      // Access February — all 3 should appear
      const febRes = await request(app.getHttpServer())
        .get('/api/finance/bills?monthYear=2026-02')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(febRes.body.bills).toHaveLength(3);
      const names = febRes.body.bills.map((b: MockBill) => b.name).sort();
      expect(names).toEqual(['Gym', 'Internet', 'Rent']);
    });

    it('should_isolate_recurring_generation_between_users', async () => {
      const tokenA = await createToken('user-A');
      const tokenB = await createToken('user-B');

      // User A creates recurring bill
      await request(app.getHttpServer())
        .post('/api/finance/bills')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ name: 'A Internet', category: 'utilities', amount: 100, dueDay: 10, monthYear: '2026-01', isRecurring: true })
        .expect(201);

      // User B creates recurring bill
      await request(app.getHttpServer())
        .post('/api/finance/bills')
        .set('Authorization', `Bearer ${tokenB}`)
        .send({ name: 'B Internet', category: 'utilities', amount: 200, dueDay: 15, monthYear: '2026-01', isRecurring: true })
        .expect(201);

      // User A accesses February
      const febA = await request(app.getHttpServer())
        .get('/api/finance/bills?monthYear=2026-02')
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(200);

      expect(febA.body.bills).toHaveLength(1);
      expect(febA.body.bills[0].name).toBe('A Internet');

      // User B accesses February
      const febB = await request(app.getHttpServer())
        .get('/api/finance/bills?monthYear=2026-02')
        .set('Authorization', `Bearer ${tokenB}`)
        .expect(200);

      expect(febB.body.bills).toHaveLength(1);
      expect(febB.body.bills[0].name).toBe('B Internet');
    });
  });

  describe('Scope-based Update', () => {
    it('should_update_only_this_month_with_scope_this', async () => {
      const token = await createToken('user-123');

      // Create recurring bill in Jan
      const createRes = await request(app.getHttpServer())
        .post('/api/finance/bills')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Internet', category: 'utilities', amount: 120, dueDay: 10, monthYear: '2026-01', isRecurring: true })
        .expect(201);

      // Generate Feb entry
      await request(app.getHttpServer())
        .get('/api/finance/bills?monthYear=2026-02')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Update Jan bill with scope=this
      await request(app.getHttpServer())
        .patch(`/api/finance/bills/${createRes.body.bill.id}?scope=this`)
        .set('Authorization', `Bearer ${token}`)
        .send({ amount: 150 })
        .expect(200);

      // Jan should be 150
      const janRes = await request(app.getHttpServer())
        .get('/api/finance/bills?monthYear=2026-01')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(janRes.body.bills[0].amount).toBe('150');

      // Feb should still be 120
      const febRes = await request(app.getHttpServer())
        .get('/api/finance/bills?monthYear=2026-02')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(febRes.body.bills[0].amount).toBe('120');
    });

    it('should_update_this_and_future_months_with_scope_future', async () => {
      const token = await createToken('user-123');

      // Create recurring bill in Jan
      const createRes = await request(app.getHttpServer())
        .post('/api/finance/bills')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Internet', category: 'utilities', amount: 120, dueDay: 10, monthYear: '2026-01', isRecurring: true })
        .expect(201);

      // Generate Feb and Mar entries
      await request(app.getHttpServer())
        .get('/api/finance/bills?monthYear=2026-02')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      await request(app.getHttpServer())
        .get('/api/finance/bills?monthYear=2026-03')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Get Feb bill ID
      const febBills = await request(app.getHttpServer())
        .get('/api/finance/bills?monthYear=2026-02')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      const febBillId = febBills.body.bills[0].id;

      // Update Feb bill with scope=future (affects Feb + Mar, NOT Jan)
      await request(app.getHttpServer())
        .patch(`/api/finance/bills/${febBillId}?scope=future`)
        .set('Authorization', `Bearer ${token}`)
        .send({ amount: 180 })
        .expect(200);

      // Jan should still be 120
      const janRes = await request(app.getHttpServer())
        .get('/api/finance/bills?monthYear=2026-01')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(janRes.body.bills[0].amount).toBe('120');

      // Feb should be 180
      const febRes = await request(app.getHttpServer())
        .get('/api/finance/bills?monthYear=2026-02')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(febRes.body.bills[0].amount).toBe('180');

      // Mar should be 180
      const marRes = await request(app.getHttpServer())
        .get('/api/finance/bills?monthYear=2026-03')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(marRes.body.bills[0].amount).toBe('180');
    });

    it('should_update_all_months_with_scope_all', async () => {
      const token = await createToken('user-123');

      // Create recurring bill in Jan
      await request(app.getHttpServer())
        .post('/api/finance/bills')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Internet', category: 'utilities', amount: 120, dueDay: 10, monthYear: '2026-01', isRecurring: true })
        .expect(201);

      // Generate Feb entry
      await request(app.getHttpServer())
        .get('/api/finance/bills?monthYear=2026-02')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Get Feb bill ID
      const febBills = await request(app.getHttpServer())
        .get('/api/finance/bills?monthYear=2026-02')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      const febBillId = febBills.body.bills[0].id;

      // Update from Feb with scope=all
      await request(app.getHttpServer())
        .patch(`/api/finance/bills/${febBillId}?scope=all`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Fiber Internet' })
        .expect(200);

      // Jan should also be renamed
      const janRes = await request(app.getHttpServer())
        .get('/api/finance/bills?monthYear=2026-01')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(janRes.body.bills[0].name).toBe('Fiber Internet');

      // Feb should be renamed
      const febRes = await request(app.getHttpServer())
        .get('/api/finance/bills?monthYear=2026-02')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(febRes.body.bills[0].name).toBe('Fiber Internet');
    });

    it('should_default_to_scope_this_when_no_scope_provided', async () => {
      const token = await createToken('user-123');

      // Create recurring bill in Jan
      const createRes = await request(app.getHttpServer())
        .post('/api/finance/bills')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Internet', category: 'utilities', amount: 120, dueDay: 10, monthYear: '2026-01', isRecurring: true })
        .expect(201);

      // Generate Feb entry
      await request(app.getHttpServer())
        .get('/api/finance/bills?monthYear=2026-02')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Update Jan bill WITHOUT scope param
      await request(app.getHttpServer())
        .patch(`/api/finance/bills/${createRes.body.bill.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ amount: 200 })
        .expect(200);

      // Jan updated
      const janRes = await request(app.getHttpServer())
        .get('/api/finance/bills?monthYear=2026-01')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(janRes.body.bills[0].amount).toBe('200');

      // Feb unchanged
      const febRes = await request(app.getHttpServer())
        .get('/api/finance/bills?monthYear=2026-02')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(febRes.body.bills[0].amount).toBe('120');
    });
  });

  describe('Scope-based Delete', () => {
    it('should_cancel_bill_with_scope_this_instead_of_deleting', async () => {
      const token = await createToken('user-123');

      // Create recurring bill in Jan
      const createRes = await request(app.getHttpServer())
        .post('/api/finance/bills')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Streaming', category: 'entertainment', amount: 50, dueDay: 20, monthYear: '2026-01', isRecurring: true })
        .expect(201);

      // Delete with scope=this
      await request(app.getHttpServer())
        .delete(`/api/finance/bills/${createRes.body.bill.id}?scope=this`)
        .set('Authorization', `Bearer ${token}`)
        .expect(204);

      // Bill should be canceled, not removed
      const janRes = await request(app.getHttpServer())
        .get('/api/finance/bills?monthYear=2026-01')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(janRes.body.bills).toHaveLength(1);
      expect(janRes.body.bills[0].status).toBe('canceled');
      expect(janRes.body.bills[0].isRecurring).toBe(true);
    });

    it('should_stop_recurrence_and_delete_future_with_scope_future', async () => {
      const token = await createToken('user-123');

      // Create recurring bill in Jan
      await request(app.getHttpServer())
        .post('/api/finance/bills')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Magazine', category: 'entertainment', amount: 30, dueDay: 15, monthYear: '2026-01', isRecurring: true })
        .expect(201);

      // Generate Feb and Mar
      await request(app.getHttpServer())
        .get('/api/finance/bills?monthYear=2026-02')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      await request(app.getHttpServer())
        .get('/api/finance/bills?monthYear=2026-03')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Get Feb bill ID
      const febBills = await request(app.getHttpServer())
        .get('/api/finance/bills?monthYear=2026-02')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      const febBillId = febBills.body.bills[0].id;

      // Delete Feb with scope=future
      await request(app.getHttpServer())
        .delete(`/api/finance/bills/${febBillId}?scope=future`)
        .set('Authorization', `Bearer ${token}`)
        .expect(204);

      // Jan should still exist
      const janRes = await request(app.getHttpServer())
        .get('/api/finance/bills?monthYear=2026-01')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(janRes.body.bills).toHaveLength(1);

      // Feb should exist but with isRecurring=false
      const febRes = await request(app.getHttpServer())
        .get('/api/finance/bills?monthYear=2026-02')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(febRes.body.bills).toHaveLength(1);
      expect(febRes.body.bills[0].isRecurring).toBe(false);

      // Mar should be deleted
      const marRes = await request(app.getHttpServer())
        .get('/api/finance/bills?monthYear=2026-03')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(marRes.body.bills).toHaveLength(0);
    });

    it('should_delete_all_entries_in_group_with_scope_all', async () => {
      const token = await createToken('user-123');

      // Create recurring bill in Jan
      await request(app.getHttpServer())
        .post('/api/finance/bills')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Subscription', category: 'entertainment', amount: 25, dueDay: 1, monthYear: '2026-01', isRecurring: true })
        .expect(201);

      // Generate Feb
      await request(app.getHttpServer())
        .get('/api/finance/bills?monthYear=2026-02')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Get Jan bill ID
      const janBills = await request(app.getHttpServer())
        .get('/api/finance/bills?monthYear=2026-01')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      const janBillId = janBills.body.bills[0].id;

      // Delete with scope=all
      await request(app.getHttpServer())
        .delete(`/api/finance/bills/${janBillId}?scope=all`)
        .set('Authorization', `Bearer ${token}`)
        .expect(204);

      // Jan should be empty
      const janRes = await request(app.getHttpServer())
        .get('/api/finance/bills?monthYear=2026-01')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(janRes.body.bills).toHaveLength(0);

      // Feb should be empty
      const febRes = await request(app.getHttpServer())
        .get('/api/finance/bills?monthYear=2026-02')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(febRes.body.bills).toHaveLength(0);
    });

    it('should_not_regenerate_after_scope_future_stops_recurrence', async () => {
      const token = await createToken('user-123');

      // Create recurring bill in Jan
      await request(app.getHttpServer())
        .post('/api/finance/bills')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Cloud Storage', category: 'utilities', amount: 15, dueDay: 5, monthYear: '2026-01', isRecurring: true })
        .expect(201);

      // Generate Feb
      await request(app.getHttpServer())
        .get('/api/finance/bills?monthYear=2026-02')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Get Feb bill and delete with scope=future (stops recurrence)
      const febBills = await request(app.getHttpServer())
        .get('/api/finance/bills?monthYear=2026-02')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      await request(app.getHttpServer())
        .delete(`/api/finance/bills/${febBills.body.bills[0].id}?scope=future`)
        .set('Authorization', `Bearer ${token}`)
        .expect(204);

      // Access March — should NOT generate because Feb has isRecurring=false
      const marRes = await request(app.getHttpServer())
        .get('/api/finance/bills?monthYear=2026-03')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(marRes.body.bills).toHaveLength(0);
    });
  });
});
