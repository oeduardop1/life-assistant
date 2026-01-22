/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import 'reflect-metadata';
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import {
  Controller,
  Get,
  Query,
  UnauthorizedException,
  SetMetadata,
  createParamDecorator,
} from '@nestjs/common';
import type { INestApplication, ExecutionContext } from '@nestjs/common';
import { APP_GUARD, Reflector } from '@nestjs/core';
import request from 'supertest';
import { SignJWT, jwtVerify } from 'jose';
import type { Request } from 'express';

const jwtSecret = 'super-secret-jwt-token-with-at-least-32-characters-for-testing';

// Inline decorators
const IS_PUBLIC_KEY = 'isPublic';
const _Public = () => SetMetadata(IS_PUBLIC_KEY, true);

const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<Request>();
    const user = (request as Request & { user?: { id: string } }).user;
    return data ? user?.[data as keyof typeof user] : user;
  },
);

// ===== Mock Data Interfaces =====

interface MockBill {
  id: string;
  userId: string;
  name: string;
  category: string;
  amount: string;
  dueDay: number;
  status: string;
  isRecurring: boolean;
  monthYear: string;
}

interface MockIncome {
  id: string;
  userId: string;
  name: string;
  type: string;
  expectedAmount: string;
  actualAmount: string | null;
  isRecurring: boolean;
  monthYear: string;
}

interface MockExpense {
  id: string;
  userId: string;
  name: string;
  category: string;
  expectedAmount: string;
  actualAmount: string;
  isRecurring: boolean;
  monthYear: string;
}

interface MockDebt {
  id: string;
  userId: string;
  name: string;
  creditor: string | null;
  totalAmount: string;
  isNegotiated: boolean;
  totalInstallments: number | null;
  installmentAmount: string | null;
  currentInstallment: number;
  dueDay: number | null;
  status: string;
}

interface MockInvestment {
  id: string;
  userId: string;
  name: string;
  type: string;
  currentAmount: string;
  goalAmount: string | null;
  monthlyContribution: string | null;
}

// ===== Mock Data Factory =====

function createMockData() {
  const bills: MockBill[] = [
    { id: 'bill-1', userId: 'user-123', name: 'Aluguel', category: 'housing', amount: '2000', dueDay: 5, status: 'pending', isRecurring: true, monthYear: '2026-01' },
    { id: 'bill-2', userId: 'user-123', name: 'Luz', category: 'utilities', amount: '200', dueDay: 10, status: 'paid', isRecurring: true, monthYear: '2026-01' },
    { id: 'bill-3', userId: 'user-123', name: 'Internet', category: 'utilities', amount: '100', dueDay: 15, status: 'pending', isRecurring: true, monthYear: '2026-01' },
    { id: 'bill-4', userId: 'user-123', name: 'Água', category: 'utilities', amount: '80', dueDay: 20, status: 'overdue', isRecurring: true, monthYear: '2026-01' },
    { id: 'bill-5', userId: 'user-123', name: 'Seguro', category: 'insurance', amount: '300', dueDay: 25, status: 'pending', isRecurring: false, monthYear: '2026-02' },
    { id: 'bill-6', userId: 'user-123', name: 'Condomínio', category: 'housing', amount: '500', dueDay: 10, status: 'paid', isRecurring: true, monthYear: '2026-02' },
  ];

  const incomes: MockIncome[] = [
    { id: 'income-1', userId: 'user-123', name: 'Salário', type: 'salary', expectedAmount: '8000', actualAmount: '8000', isRecurring: true, monthYear: '2026-01' },
    { id: 'income-2', userId: 'user-123', name: 'Freelance', type: 'freelance', expectedAmount: '2000', actualAmount: '2500', isRecurring: false, monthYear: '2026-01' },
    { id: 'income-3', userId: 'user-123', name: 'Salário Fev', type: 'salary', expectedAmount: '8000', actualAmount: null, isRecurring: true, monthYear: '2026-02' },
    { id: 'income-4', userId: 'user-123', name: 'Investimento', type: 'investment', expectedAmount: '500', actualAmount: '480', isRecurring: true, monthYear: '2026-02' },
  ];

  const expenses: MockExpense[] = [
    { id: 'expense-1', userId: 'user-123', name: 'Mercado', category: 'food', expectedAmount: '800', actualAmount: '750', isRecurring: true, monthYear: '2026-01' },
    { id: 'expense-2', userId: 'user-123', name: 'Uber', category: 'transport', expectedAmount: '200', actualAmount: '180', isRecurring: true, monthYear: '2026-01' },
    { id: 'expense-3', userId: 'user-123', name: 'Restaurante', category: 'food', expectedAmount: '400', actualAmount: '350', isRecurring: false, monthYear: '2026-02' },
    { id: 'expense-4', userId: 'user-123', name: 'Gasolina', category: 'transport', expectedAmount: '300', actualAmount: '320', isRecurring: true, monthYear: '2026-02' },
  ];

  const debts: MockDebt[] = [
    { id: 'debt-1', userId: 'user-123', name: 'Financiamento Carro', creditor: 'Banco XYZ', totalAmount: '12000', isNegotiated: true, totalInstallments: 24, installmentAmount: '500', currentInstallment: 5, dueDay: 15, status: 'active' },
    { id: 'debt-2', userId: 'user-123', name: 'Cartão Crédito', creditor: 'Nubank', totalAmount: '3000', isNegotiated: true, totalInstallments: 10, installmentAmount: '300', currentInstallment: 10, dueDay: 20, status: 'paid_off' },
    { id: 'debt-3', userId: 'user-123', name: 'Empréstimo Pessoal', creditor: null, totalAmount: '5000', isNegotiated: false, totalInstallments: null, installmentAmount: null, currentInstallment: 1, dueDay: null, status: 'active' },
    { id: 'debt-4', userId: 'user-123', name: 'Dívida Hospital', creditor: 'Hospital ABC', totalAmount: '8000', isNegotiated: false, totalInstallments: null, installmentAmount: null, currentInstallment: 1, dueDay: null, status: 'active' },
  ];

  const investments: MockInvestment[] = [
    { id: 'inv-1', userId: 'user-123', name: 'Reserva de Emergência', type: 'emergency_fund', currentAmount: '15000', goalAmount: '30000', monthlyContribution: '1000' },
    { id: 'inv-2', userId: 'user-123', name: 'Aposentadoria', type: 'retirement', currentAmount: '50000', goalAmount: '500000', monthlyContribution: '2000' },
    { id: 'inv-3', userId: 'user-123', name: 'Viagem Europa', type: 'short_term', currentAmount: '5000', goalAmount: '20000', monthlyContribution: '500' },
  ];

  return { bills, incomes, expenses, debts, investments };
}

// Mutable mock data
let mockBills: MockBill[] = [];
let mockIncomes: MockIncome[] = [];
let mockExpenses: MockExpense[] = [];
let mockDebts: MockDebt[] = [];
let mockInvestments: MockInvestment[] = [];

// ===== Filter & Pagination Logic (mirrors repository pattern) =====

function filterAndPaginate<T>(
  items: T[],
  filters: Record<string, unknown>,
  paginationParams: { limit?: number; offset?: number }
): { data: T[]; total: number } {
  let filtered = [...items];

  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== null && value !== '') {
      filtered = filtered.filter((item) => {
        const itemValue = (item as Record<string, unknown>)[key];
        if (typeof value === 'boolean') {
          return itemValue === value;
        }
        return itemValue === value;
      });
    }
  }

  const total = filtered.length;
  const limit = paginationParams.limit ?? 50;
  const offset = paginationParams.offset ?? 0;

  const paginated = filtered.slice(offset, offset + limit);

  return { data: paginated, total };
}

// ===== Inline Test Controller =====

@Controller('finance')
class TestFiltersController {
  @Get('bills')
  getBills(
    @CurrentUser('id') userId: string,
    @Query('monthYear') monthYear?: string,
    @Query('category') category?: string,
    @Query('status') status?: string,
    @Query('isRecurring') isRecurringStr?: string,
    @Query('limit') limitStr?: string,
    @Query('offset') offsetStr?: string,
  ) {
    const userBills = mockBills.filter((b) => b.userId === userId);
    const isRecurring = isRecurringStr !== undefined ? isRecurringStr === 'true' : undefined;
    const limit = limitStr ? parseInt(limitStr, 10) : undefined;
    const offset = offsetStr ? parseInt(offsetStr, 10) : undefined;

    const { data, total } = filterAndPaginate(
      userBills,
      { monthYear, category, status, isRecurring },
      { limit, offset }
    );

    return { bills: data, total };
  }

  @Get('incomes')
  getIncomes(
    @CurrentUser('id') userId: string,
    @Query('monthYear') monthYear?: string,
    @Query('type') type?: string,
    @Query('isRecurring') isRecurringStr?: string,
    @Query('limit') limitStr?: string,
    @Query('offset') offsetStr?: string,
  ) {
    const userIncomes = mockIncomes.filter((i) => i.userId === userId);
    const isRecurring = isRecurringStr !== undefined ? isRecurringStr === 'true' : undefined;
    const limit = limitStr ? parseInt(limitStr, 10) : undefined;
    const offset = offsetStr ? parseInt(offsetStr, 10) : undefined;

    const { data, total } = filterAndPaginate(
      userIncomes,
      { monthYear, type, isRecurring },
      { limit, offset }
    );

    return { incomes: data, total };
  }

  @Get('expenses')
  getExpenses(
    @CurrentUser('id') userId: string,
    @Query('monthYear') monthYear?: string,
    @Query('category') category?: string,
    @Query('isRecurring') isRecurringStr?: string,
    @Query('limit') limitStr?: string,
    @Query('offset') offsetStr?: string,
  ) {
    const userExpenses = mockExpenses.filter((e) => e.userId === userId);
    const isRecurring = isRecurringStr !== undefined ? isRecurringStr === 'true' : undefined;
    const limit = limitStr ? parseInt(limitStr, 10) : undefined;
    const offset = offsetStr ? parseInt(offsetStr, 10) : undefined;

    const { data, total } = filterAndPaginate(
      userExpenses,
      { monthYear, category, isRecurring },
      { limit, offset }
    );

    return { expenses: data, total };
  }

  @Get('debts')
  getDebts(
    @CurrentUser('id') userId: string,
    @Query('status') status?: string,
    @Query('isNegotiated') isNegotiatedStr?: string,
    @Query('limit') limitStr?: string,
    @Query('offset') offsetStr?: string,
  ) {
    const userDebts = mockDebts.filter((d) => d.userId === userId);
    const isNegotiated = isNegotiatedStr !== undefined ? isNegotiatedStr === 'true' : undefined;
    const limit = limitStr ? parseInt(limitStr, 10) : undefined;
    const offset = offsetStr ? parseInt(offsetStr, 10) : undefined;

    const { data, total } = filterAndPaginate(
      userDebts,
      { status, isNegotiated },
      { limit, offset }
    );

    return { debts: data, total };
  }

  @Get('investments')
  getInvestments(
    @CurrentUser('id') userId: string,
    @Query('type') type?: string,
    @Query('limit') limitStr?: string,
    @Query('offset') offsetStr?: string,
  ) {
    const userInvestments = mockInvestments.filter((i) => i.userId === userId);
    const limit = limitStr ? parseInt(limitStr, 10) : undefined;
    const offset = offsetStr ? parseInt(offsetStr, 10) : undefined;

    const { data, total } = filterAndPaginate(
      userInvestments,
      { type },
      { limit, offset }
    );

    return { investments: data, total };
  }
}

// ===== Auth Guard =====

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
        if (error instanceof UnauthorizedException) {
          throw error;
        }
        throw new UnauthorizedException('Invalid or expired token');
      }
    },
  };
};

// ===== Test Suite =====

describe('Finance Filters & Pagination (Integration)', () => {
  let app: INestApplication;

  async function createToken(
    payload: Record<string, unknown>,
    expiresIn = '1h'
  ) {
    const secret = new TextEncoder().encode(jwtSecret);
    return new SignJWT(payload)
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime(expiresIn)
      .setIssuedAt()
      .sign(secret);
  }

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [TestFiltersController],
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
    const data = createMockData();
    mockBills = [...data.bills];
    mockIncomes = [...data.incomes];
    mockExpenses = [...data.expenses];
    mockDebts = [...data.debts];
    mockInvestments = [...data.investments];
  });

  // ===== Suite 1: Filtro por monthYear =====

  describe('Filter by monthYear', () => {
    it('should filter bills by monthYear=2026-01', async () => {
      const token = await createToken({ sub: 'user-123' });

      const response = await request(app.getHttpServer())
        .get('/api/finance/bills')
        .query({ monthYear: '2026-01' })
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.bills).toHaveLength(4);
      expect(response.body.bills.every((b: MockBill) => b.monthYear === '2026-01')).toBe(true);
    });

    it('should filter bills by monthYear=2026-02', async () => {
      const token = await createToken({ sub: 'user-123' });

      const response = await request(app.getHttpServer())
        .get('/api/finance/bills')
        .query({ monthYear: '2026-02' })
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.bills).toHaveLength(2);
      expect(response.body.bills.every((b: MockBill) => b.monthYear === '2026-02')).toBe(true);
    });

    it('should filter incomes by monthYear=2026-01', async () => {
      const token = await createToken({ sub: 'user-123' });

      const response = await request(app.getHttpServer())
        .get('/api/finance/incomes')
        .query({ monthYear: '2026-01' })
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.incomes).toHaveLength(2);
      expect(response.body.incomes.every((i: MockIncome) => i.monthYear === '2026-01')).toBe(true);
    });

    it('should filter expenses by monthYear=2026-02', async () => {
      const token = await createToken({ sub: 'user-123' });

      const response = await request(app.getHttpServer())
        .get('/api/finance/expenses')
        .query({ monthYear: '2026-02' })
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.expenses).toHaveLength(2);
      expect(response.body.expenses.every((e: MockExpense) => e.monthYear === '2026-02')).toBe(true);
    });

    it('should return all records when no monthYear filter is provided', async () => {
      const token = await createToken({ sub: 'user-123' });

      const response = await request(app.getHttpServer())
        .get('/api/finance/bills')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.bills).toHaveLength(6);
    });
  });

  // ===== Suite 2: Filtro por status =====

  describe('Filter by status', () => {
    it('should filter bills by status=pending', async () => {
      const token = await createToken({ sub: 'user-123' });

      const response = await request(app.getHttpServer())
        .get('/api/finance/bills')
        .query({ status: 'pending' })
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.bills).toHaveLength(3);
      expect(response.body.bills.every((b: MockBill) => b.status === 'pending')).toBe(true);
    });

    it('should filter bills by status=paid', async () => {
      const token = await createToken({ sub: 'user-123' });

      const response = await request(app.getHttpServer())
        .get('/api/finance/bills')
        .query({ status: 'paid' })
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.bills).toHaveLength(2);
      expect(response.body.bills.every((b: MockBill) => b.status === 'paid')).toBe(true);
    });

    it('should filter bills by status=overdue', async () => {
      const token = await createToken({ sub: 'user-123' });

      const response = await request(app.getHttpServer())
        .get('/api/finance/bills')
        .query({ status: 'overdue' })
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.bills).toHaveLength(1);
      expect(response.body.bills[0].status).toBe('overdue');
      expect(response.body.bills[0].name).toBe('Água');
    });

    it('should filter debts by status=active', async () => {
      const token = await createToken({ sub: 'user-123' });

      const response = await request(app.getHttpServer())
        .get('/api/finance/debts')
        .query({ status: 'active' })
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.debts).toHaveLength(3);
      expect(response.body.debts.every((d: MockDebt) => d.status === 'active')).toBe(true);
    });

    it('should filter debts by status=paid_off', async () => {
      const token = await createToken({ sub: 'user-123' });

      const response = await request(app.getHttpServer())
        .get('/api/finance/debts')
        .query({ status: 'paid_off' })
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.debts).toHaveLength(1);
      expect(response.body.debts[0].status).toBe('paid_off');
      expect(response.body.debts[0].name).toBe('Cartão Crédito');
    });

    it('should return all records when no status filter is provided', async () => {
      const token = await createToken({ sub: 'user-123' });

      const response = await request(app.getHttpServer())
        .get('/api/finance/debts')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.debts).toHaveLength(4);
    });
  });

  // ===== Suite 3: Filtro por category =====

  describe('Filter by category', () => {
    it('should filter bills by category=housing', async () => {
      const token = await createToken({ sub: 'user-123' });

      const response = await request(app.getHttpServer())
        .get('/api/finance/bills')
        .query({ category: 'housing' })
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.bills).toHaveLength(2);
      expect(response.body.bills.every((b: MockBill) => b.category === 'housing')).toBe(true);
    });

    it('should filter bills by category=utilities', async () => {
      const token = await createToken({ sub: 'user-123' });

      const response = await request(app.getHttpServer())
        .get('/api/finance/bills')
        .query({ category: 'utilities' })
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.bills).toHaveLength(3);
      expect(response.body.bills.every((b: MockBill) => b.category === 'utilities')).toBe(true);
    });

    it('should filter expenses by category=food', async () => {
      const token = await createToken({ sub: 'user-123' });

      const response = await request(app.getHttpServer())
        .get('/api/finance/expenses')
        .query({ category: 'food' })
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.expenses).toHaveLength(2);
      expect(response.body.expenses.every((e: MockExpense) => e.category === 'food')).toBe(true);
    });

    it('should filter expenses by category=transport', async () => {
      const token = await createToken({ sub: 'user-123' });

      const response = await request(app.getHttpServer())
        .get('/api/finance/expenses')
        .query({ category: 'transport' })
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.expenses).toHaveLength(2);
      expect(response.body.expenses.every((e: MockExpense) => e.category === 'transport')).toBe(true);
    });

    it('should return all records when no category filter is provided', async () => {
      const token = await createToken({ sub: 'user-123' });

      const response = await request(app.getHttpServer())
        .get('/api/finance/bills')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.bills).toHaveLength(6);
    });
  });

  // ===== Suite 4: Filtro por isNegotiated =====

  describe('Filter by isNegotiated', () => {
    it('should filter debts by isNegotiated=true', async () => {
      const token = await createToken({ sub: 'user-123' });

      const response = await request(app.getHttpServer())
        .get('/api/finance/debts')
        .query({ isNegotiated: 'true' })
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.debts).toHaveLength(2);
      expect(response.body.debts.every((d: MockDebt) => d.isNegotiated === true)).toBe(true);
    });

    it('should filter debts by isNegotiated=false', async () => {
      const token = await createToken({ sub: 'user-123' });

      const response = await request(app.getHttpServer())
        .get('/api/finance/debts')
        .query({ isNegotiated: 'false' })
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.debts).toHaveLength(2);
      expect(response.body.debts.every((d: MockDebt) => d.isNegotiated === false)).toBe(true);
    });

    it('should return all debts when no isNegotiated filter is provided', async () => {
      const token = await createToken({ sub: 'user-123' });

      const response = await request(app.getHttpServer())
        .get('/api/finance/debts')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.debts).toHaveLength(4);
    });

    it('should combine isNegotiated with status filter', async () => {
      const token = await createToken({ sub: 'user-123' });

      const response = await request(app.getHttpServer())
        .get('/api/finance/debts')
        .query({ isNegotiated: 'true', status: 'active' })
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.debts).toHaveLength(1);
      expect(response.body.debts[0].name).toBe('Financiamento Carro');
      expect(response.body.debts[0].isNegotiated).toBe(true);
      expect(response.body.debts[0].status).toBe('active');
    });
  });

  // ===== Suite 5: Paginação com limit e offset =====

  describe('Pagination with limit and offset', () => {
    it('should limit results with limit=2', async () => {
      const token = await createToken({ sub: 'user-123' });

      const response = await request(app.getHttpServer())
        .get('/api/finance/bills')
        .query({ limit: '2' })
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.bills).toHaveLength(2);
    });

    it('should skip results with offset=2', async () => {
      const token = await createToken({ sub: 'user-123' });

      const response = await request(app.getHttpServer())
        .get('/api/finance/bills')
        .query({ offset: '2' })
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.bills).toHaveLength(4);
      expect(response.body.bills[0].id).toBe('bill-3');
    });

    it('should combine limit and offset correctly (limit=2, offset=2)', async () => {
      const token = await createToken({ sub: 'user-123' });

      const response = await request(app.getHttpServer())
        .get('/api/finance/bills')
        .query({ limit: '2', offset: '2' })
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.bills).toHaveLength(2);
      expect(response.body.bills[0].id).toBe('bill-3');
      expect(response.body.bills[1].id).toBe('bill-4');
    });

    it('should return only 1 result with limit=1, offset=0', async () => {
      const token = await createToken({ sub: 'user-123' });

      const response = await request(app.getHttpServer())
        .get('/api/finance/bills')
        .query({ limit: '1', offset: '0' })
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.bills).toHaveLength(1);
      expect(response.body.bills[0].id).toBe('bill-1');
    });

    it('should use default pagination when no limit/offset provided', async () => {
      const token = await createToken({ sub: 'user-123' });

      const response = await request(app.getHttpServer())
        .get('/api/finance/bills')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // All 6 bills returned (default limit=50)
      expect(response.body.bills).toHaveLength(6);
    });

    it('should paginate investments correctly', async () => {
      const token = await createToken({ sub: 'user-123' });

      const response = await request(app.getHttpServer())
        .get('/api/finance/investments')
        .query({ limit: '1', offset: '1' })
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.investments).toHaveLength(1);
      expect(response.body.investments[0].id).toBe('inv-2');
    });

    it('should paginate debts correctly', async () => {
      const token = await createToken({ sub: 'user-123' });

      const response = await request(app.getHttpServer())
        .get('/api/finance/debts')
        .query({ limit: '2', offset: '1' })
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.debts).toHaveLength(2);
      expect(response.body.debts[0].id).toBe('debt-2');
      expect(response.body.debts[1].id).toBe('debt-3');
    });

    it('should return empty array when offset exceeds total', async () => {
      const token = await createToken({ sub: 'user-123' });

      const response = await request(app.getHttpServer())
        .get('/api/finance/bills')
        .query({ offset: '100' })
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.bills).toHaveLength(0);
    });
  });

  // ===== Suite 6: Metadata de paginação =====

  describe('Pagination metadata', () => {
    it('should return correct total count without pagination', async () => {
      const token = await createToken({ sub: 'user-123' });

      const response = await request(app.getHttpServer())
        .get('/api/finance/bills')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.total).toBe(6);
      expect(response.body.bills).toHaveLength(6);
    });

    it('should return total reflecting all matching records, not limited results', async () => {
      const token = await createToken({ sub: 'user-123' });

      const response = await request(app.getHttpServer())
        .get('/api/finance/bills')
        .query({ limit: '2' })
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // total should be 6 (all bills), even though only 2 are returned
      expect(response.body.total).toBe(6);
      expect(response.body.bills).toHaveLength(2);
    });

    it('should return total reflecting filter, not just limit', async () => {
      const token = await createToken({ sub: 'user-123' });

      const response = await request(app.getHttpServer())
        .get('/api/finance/bills')
        .query({ monthYear: '2026-01', limit: '2' })
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // total should be 4 (bills in 2026-01), limit returns 2
      expect(response.body.total).toBe(4);
      expect(response.body.bills).toHaveLength(2);
    });

    it('should return correct metadata for debts with filters', async () => {
      const token = await createToken({ sub: 'user-123' });

      const response = await request(app.getHttpServer())
        .get('/api/finance/debts')
        .query({ isNegotiated: 'true', limit: '1' })
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.total).toBe(2); // 2 negotiated debts
      expect(response.body.debts).toHaveLength(1); // but only 1 returned
    });

    it('should return correct metadata for expenses', async () => {
      const token = await createToken({ sub: 'user-123' });

      const response = await request(app.getHttpServer())
        .get('/api/finance/expenses')
        .query({ category: 'food' })
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.total).toBe(2);
      expect(response.body.expenses).toHaveLength(2);
    });

    it('should return correct metadata for incomes', async () => {
      const token = await createToken({ sub: 'user-123' });

      const response = await request(app.getHttpServer())
        .get('/api/finance/incomes')
        .query({ monthYear: '2026-01' })
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.total).toBe(2);
      expect(response.body.incomes).toHaveLength(2);
    });

    it('should return correct metadata for investments', async () => {
      const token = await createToken({ sub: 'user-123' });

      const response = await request(app.getHttpServer())
        .get('/api/finance/investments')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.total).toBe(3);
      expect(response.body.investments).toHaveLength(3);
    });

    it('should return total=0 when no records match filter', async () => {
      const token = await createToken({ sub: 'user-123' });

      const response = await request(app.getHttpServer())
        .get('/api/finance/bills')
        .query({ monthYear: '2030-12' })
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.total).toBe(0);
      expect(response.body.bills).toHaveLength(0);
    });

    it('should return response with both data array and total fields', async () => {
      const token = await createToken({ sub: 'user-123' });

      const billsResponse = await request(app.getHttpServer())
        .get('/api/finance/bills')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(billsResponse.body).toHaveProperty('bills');
      expect(billsResponse.body).toHaveProperty('total');
      expect(Array.isArray(billsResponse.body.bills)).toBe(true);
      expect(typeof billsResponse.body.total).toBe('number');

      const debtsResponse = await request(app.getHttpServer())
        .get('/api/finance/debts')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(debtsResponse.body).toHaveProperty('debts');
      expect(debtsResponse.body).toHaveProperty('total');
      expect(Array.isArray(debtsResponse.body.debts)).toBe(true);
      expect(typeof debtsResponse.body.total).toBe('number');

      const incomesResponse = await request(app.getHttpServer())
        .get('/api/finance/incomes')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(incomesResponse.body).toHaveProperty('incomes');
      expect(incomesResponse.body).toHaveProperty('total');

      const expensesResponse = await request(app.getHttpServer())
        .get('/api/finance/expenses')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(expensesResponse.body).toHaveProperty('expenses');
      expect(expensesResponse.body).toHaveProperty('total');

      const investmentsResponse = await request(app.getHttpServer())
        .get('/api/finance/investments')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(investmentsResponse.body).toHaveProperty('investments');
      expect(investmentsResponse.body).toHaveProperty('total');
    });
  });

  // ===== Bonus: Combined Filters =====

  describe('Combined filters', () => {
    it('should combine monthYear and status filters for bills', async () => {
      const token = await createToken({ sub: 'user-123' });

      const response = await request(app.getHttpServer())
        .get('/api/finance/bills')
        .query({ monthYear: '2026-01', status: 'pending' })
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.bills).toHaveLength(2);
      expect(response.body.bills.every(
        (b: MockBill) => b.monthYear === '2026-01' && b.status === 'pending'
      )).toBe(true);
    });

    it('should combine monthYear and category filters for bills', async () => {
      const token = await createToken({ sub: 'user-123' });

      const response = await request(app.getHttpServer())
        .get('/api/finance/bills')
        .query({ monthYear: '2026-01', category: 'utilities' })
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.bills).toHaveLength(3);
      expect(response.body.bills.every(
        (b: MockBill) => b.monthYear === '2026-01' && b.category === 'utilities'
      )).toBe(true);
    });

    it('should combine monthYear, category, and pagination for expenses', async () => {
      const token = await createToken({ sub: 'user-123' });

      const response = await request(app.getHttpServer())
        .get('/api/finance/expenses')
        .query({ monthYear: '2026-01', limit: '1' })
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.expenses).toHaveLength(1);
      expect(response.body.total).toBe(2); // 2 expenses in 2026-01
    });

    it('should combine isRecurring with monthYear for bills', async () => {
      const token = await createToken({ sub: 'user-123' });

      const response = await request(app.getHttpServer())
        .get('/api/finance/bills')
        .query({ monthYear: '2026-02', isRecurring: 'true' })
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.bills).toHaveLength(1);
      expect(response.body.bills[0].name).toBe('Condomínio');
    });

    it('should combine type filter with pagination for incomes', async () => {
      const token = await createToken({ sub: 'user-123' });

      const response = await request(app.getHttpServer())
        .get('/api/finance/incomes')
        .query({ type: 'salary' })
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.incomes).toHaveLength(2);
      expect(response.body.incomes.every((i: MockIncome) => i.type === 'salary')).toBe(true);
      expect(response.body.total).toBe(2);
    });

    it('should combine type filter for investments', async () => {
      const token = await createToken({ sub: 'user-123' });

      const response = await request(app.getHttpServer())
        .get('/api/finance/investments')
        .query({ type: 'emergency_fund' })
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.investments).toHaveLength(1);
      expect(response.body.investments[0].name).toBe('Reserva de Emergência');
    });
  });

  // ===== Multi-tenant isolation =====

  describe('Multi-tenant isolation', () => {
    it('should not return data from other users', async () => {
      const token = await createToken({ sub: 'user-999' });

      const response = await request(app.getHttpServer())
        .get('/api/finance/bills')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.bills).toHaveLength(0);
      expect(response.body.total).toBe(0);
    });
  });
});
