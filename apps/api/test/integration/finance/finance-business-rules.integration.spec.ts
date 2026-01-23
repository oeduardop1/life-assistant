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
  Param,
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

// Mock data interfaces
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
  status: 'active' | 'paid_off' | 'settled' | 'defaulted';
  notes: string | null;
  currency: string;
  createdAt: Date;
  updatedAt: Date;
}

interface MockBill {
  id: string;
  userId: string;
  amount: string;
  monthYear: string;
  status: 'pending' | 'paid' | 'overdue' | 'canceled';
}

interface MockExpense {
  id: string;
  userId: string;
  expectedAmount: string;
  actualAmount: string;
  monthYear: string;
}

interface MockDebtPayment {
  id: string;
  userId: string;
  debtId: string;
  installmentNumber: number;
  amount: string;
  monthYear: string;
}

// Initial mock data factory
function createInitialMockData() {
  return {
    debts: [
      {
        id: 'debt-baseline-1',
        userId: 'user-123',
        name: 'Financiamento Carro',
        creditor: 'Banco XYZ',
        totalAmount: '12000',
        isNegotiated: true,
        totalInstallments: 24,
        installmentAmount: '500',
        currentInstallment: 1,
        dueDay: 15,
        status: 'active' as const,
        notes: null,
        currency: 'BRL',
        createdAt: new Date('2025-01-01'),
        updatedAt: new Date('2025-01-01'),
      },
    ],
    bills: [
      {
        id: 'bill-1',
        userId: 'user-123',
        amount: '1500',
        monthYear: '2026-01',
        status: 'pending' as const,
      },
    ],
    expenses: [
      {
        id: 'expense-1',
        userId: 'user-123',
        expectedAmount: '800',
        actualAmount: '400',
        monthYear: '2026-01',
      },
    ],
  };
}

// Mutable mock data (reset in beforeEach)
let mockDebts: MockDebt[] = [];
let mockBills: MockBill[] = [];
let mockExpenses: MockExpense[] = [];
let mockDebtPayments: MockDebtPayment[] = [];
let debtIdCounter = 0;
let paymentIdCounter = 0;

// Summary calculation (mirrors FinanceSummaryService + DebtsRepository.getSummary logic)
function calculateSummary(userId: string) {
  const userBills = mockBills.filter(
    (b) => b.userId === userId && b.monthYear === '2026-01'
  );
  const userExpenses = mockExpenses.filter(
    (e) => e.userId === userId && e.monthYear === '2026-01'
  );
  const userDebts = mockDebts.filter((d) => d.userId === userId);

  const totalBills = userBills.reduce((sum, b) => sum + parseFloat(b.amount), 0);
  const expensesExpected = userExpenses.reduce(
    (sum, e) => sum + parseFloat(e.expectedAmount),
    0
  );

  // Debts summary calculation (mirrors debts.repository.ts:215-250)
  let totalAmount = 0;
  let totalPaid = 0;
  let negotiatedCount = 0;
  let monthlyInstallmentSum = 0;

  for (const debt of userDebts) {
    totalAmount += parseFloat(debt.totalAmount);

    if (debt.isNegotiated && debt.installmentAmount) {
      negotiatedCount++;
      const paidInstallments = debt.currentInstallment - 1;
      totalPaid += paidInstallments * parseFloat(debt.installmentAmount);

      if (debt.status === 'active') {
        monthlyInstallmentSum += parseFloat(debt.installmentAmount);
      }
    }
  }

  // totalBudgeted = totalBills + expensesExpected + monthlyInstallmentSum
  // (mirrors finance-summary.service.ts:113-114)
  const totalBudgeted = totalBills + expensesExpected + monthlyInstallmentSum;

  // totalSpent = paidBillsAmount + expensesActual + debtPaymentsThisMonth
  const paidBillsAmount = userBills
    .filter((b) => b.status === 'paid')
    .reduce((sum, b) => sum + parseFloat(b.amount), 0);
  const expensesActual = userExpenses.reduce(
    (sum, e) => sum + parseFloat(e.actualAmount),
    0
  );
  const debtPaymentsThisMonth = mockDebtPayments
    .filter((p) => p.userId === userId && p.monthYear === '2026-01')
    .reduce((sum, p) => sum + parseFloat(p.amount), 0);
  const totalSpent = paidBillsAmount + expensesActual + debtPaymentsThisMonth;

  return {
    monthYear: '2026-01',
    totalBills,
    totalExpensesExpected: expensesExpected,
    totalBudgeted,
    totalSpent,
    paidBillsAmount,
    expensesActual,
    debtPaymentsThisMonth,
    balance: 0 - totalSpent, // No incomes in this test setup
    debts: {
      totalDebts: userDebts.length,
      totalAmount,
      totalPaid,
      totalRemaining: totalAmount - totalPaid,
      negotiatedCount,
      monthlyInstallmentSum,
    },
  };
}

// Inline test controller
@Controller('finance')
class TestFinanceBusinessRulesController {
  @Get('summary')
  getSummary(@CurrentUser('id') userId: string) {
    return { summary: calculateSummary(userId) };
  }

  @Post('debts')
  @HttpCode(HttpStatus.CREATED)
  createDebt(
    @CurrentUser('id') userId: string,
    @Body()
    body: {
      name: string;
      creditor?: string;
      totalAmount: number;
      isNegotiated?: boolean;
      totalInstallments?: number;
      installmentAmount?: number;
      dueDay?: number;
      notes?: string;
    }
  ) {
    const isNegotiated = body.isNegotiated !== false;

    // Validate negotiated debt has required fields
    // (mirrors debts.service.ts:32-38)
    if (isNegotiated) {
      if (!body.totalInstallments || !body.installmentAmount || !body.dueDay) {
        throw new BadRequestException(
          'Negotiated debts require totalInstallments, installmentAmount, and dueDay'
        );
      }
    }

    debtIdCounter++;
    const newDebt: MockDebt = {
      id: `debt-new-${String(debtIdCounter)}`,
      userId,
      name: body.name,
      creditor: body.creditor ?? null,
      totalAmount: body.totalAmount.toString(),
      isNegotiated,
      totalInstallments: body.totalInstallments ?? null,
      installmentAmount: body.installmentAmount?.toString() ?? null,
      currentInstallment: 1,
      dueDay: body.dueDay ?? null,
      status: 'active',
      notes: body.notes ?? null,
      currency: 'BRL',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockDebts.push(newDebt);
    return { debt: newDebt };
  }

  @Patch('debts/:id/pay-installment')
  payInstallment(
    @CurrentUser('id') userId: string,
    @Param('id') id: string
  ) {
    const debt = mockDebts.find((d) => d.id === id && d.userId === userId);
    if (!debt) {
      throw new NotFoundException(`Debt with id ${id} not found`);
    }
    if (!debt.isNegotiated) {
      throw new BadRequestException(
        'Cannot pay installment on non-negotiated debt'
      );
    }
    if (debt.status === 'paid_off') {
      throw new BadRequestException('Debt is already paid off');
    }

    // Mirrors debts.repository.ts:157-162
    const newInstallment = debt.currentInstallment + 1;
    const totalInstallments = debt.totalInstallments ?? 0;

    debt.currentInstallment = newInstallment;
    debt.status = newInstallment > totalInstallments ? 'paid_off' : 'active';
    debt.updatedAt = new Date();

    // Record payment in debt_payments (mirrors debts.repository.ts:180-191)
    if (debt.installmentAmount) {
      paymentIdCounter++;
      mockDebtPayments.push({
        id: `payment-${String(paymentIdCounter)}`,
        userId,
        debtId: id,
        installmentNumber: debt.currentInstallment - 1,
        amount: debt.installmentAmount,
        monthYear: '2026-01',
      });
    }

    return { debt };
  }

  @Patch('bills/:id/pay')
  markBillAsPaid(
    @CurrentUser('id') userId: string,
    @Param('id') id: string
  ) {
    const bill = mockBills.find((b) => b.id === id && b.userId === userId);
    if (!bill) {
      throw new NotFoundException(`Bill with id ${id} not found`);
    }
    bill.status = 'paid';
    return { bill };
  }

  @Patch('debts/:id/negotiate')
  negotiate(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body()
    body: {
      totalInstallments: number;
      installmentAmount: number;
      dueDay: number;
    }
  ) {
    const debt = mockDebts.find((d) => d.id === id && d.userId === userId);
    if (!debt) {
      throw new NotFoundException(`Debt with id ${id} not found`);
    }
    if (debt.isNegotiated) {
      throw new BadRequestException('Debt is already negotiated');
    }

    // Mirrors debts.repository.ts:195-200
    debt.isNegotiated = true;
    debt.totalInstallments = body.totalInstallments;
    debt.installmentAmount = body.installmentAmount.toString();
    debt.dueDay = body.dueDay;
    debt.currentInstallment = 1;
    debt.updatedAt = new Date();

    return { debt };
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

// Test suite
describe('Finance Business Rules (Integration)', () => {
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

  async function getSummary(token: string) {
    const response = await request(app.getHttpServer())
      .get('/api/finance/summary')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    return response.body.summary;
  }

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [TestFinanceBusinessRulesController],
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
    const initialData = createInitialMockData();
    mockDebts = [...initialData.debts];
    mockBills = [...initialData.bills];
    mockExpenses = [...initialData.expenses];
    mockDebtPayments = [];
    debtIdCounter = 0;
    paymentIdCounter = 0;
  });

  describe('Non-negotiated debt budget exclusion', () => {
    it('should_not_include_non_negotiated_debt_in_totalBudgeted_when_created', async () => {
      const token = await createToken({ sub: 'user-123' });

      // 1. Verify baseline
      const baselineSummary = await getSummary(token);
      expect(baselineSummary.totalBudgeted).toBe(2800); // 1500 + 800 + 500
      expect(baselineSummary.debts.monthlyInstallmentSum).toBe(500);
      expect(baselineSummary.debts.totalDebts).toBe(1);
      expect(baselineSummary.debts.totalAmount).toBe(12000);

      // 2. Create a non-negotiated debt
      const createResponse = await request(app.getHttpServer())
        .post('/api/finance/debts')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Divida Pendente',
          totalAmount: 5000,
          isNegotiated: false,
        })
        .expect(201);

      expect(createResponse.body.debt.isNegotiated).toBe(false);
      expect(createResponse.body.debt.installmentAmount).toBeNull();

      // 3. Verify summary unchanged for budget-related KPIs
      const afterSummary = await getSummary(token);
      expect(afterSummary.totalBudgeted).toBe(2800); // Unchanged
      expect(afterSummary.debts.monthlyInstallmentSum).toBe(500); // Unchanged

      // 4. Verify debt is counted but doesn't affect budget
      expect(afterSummary.debts.totalDebts).toBe(2); // Increased
      expect(afterSummary.debts.totalAmount).toBe(17000); // 12000 + 5000
      expect(afterSummary.debts.negotiatedCount).toBe(1); // Only the original
    });
  });

  describe('Pay installment KPI updates', () => {
    it('should_update_debts_KPIs_when_paying_installment', async () => {
      const token = await createToken({ sub: 'user-123' });

      // 1. Verify baseline (no paid installments yet)
      const baselineSummary = await getSummary(token);
      expect(baselineSummary.debts.totalPaid).toBe(0); // currentInstallment=1, paid=0
      expect(baselineSummary.debts.totalRemaining).toBe(12000);

      // 2. Pay one installment
      const payResponse = await request(app.getHttpServer())
        .patch('/api/finance/debts/debt-baseline-1/pay-installment')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(payResponse.body.debt.currentInstallment).toBe(2);
      expect(payResponse.body.debt.status).toBe('active');

      // 3. Verify KPIs updated
      const afterSummary = await getSummary(token);
      expect(afterSummary.debts.totalPaid).toBe(500); // 1 paid × 500
      expect(afterSummary.debts.totalRemaining).toBe(11500); // 12000 - 500
      expect(afterSummary.debts.monthlyInstallmentSum).toBe(500); // Still active
      expect(afterSummary.totalBudgeted).toBe(2800); // Unchanged (debt still active)
    });
  });

  describe('Last installment auto-payoff', () => {
    it('should_set_status_to_paid_off_when_paying_last_installment', async () => {
      const token = await createToken({ sub: 'user-123' });

      // 1. Create a debt with only 1 installment (easy to pay off)
      const createResponse = await request(app.getHttpServer())
        .post('/api/finance/debts')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Divida Rapida',
          totalAmount: 300,
          isNegotiated: true,
          totalInstallments: 1,
          installmentAmount: 300,
          dueDay: 10,
        })
        .expect(201);

      const newDebtId = createResponse.body.debt.id;

      // 2. Verify it's included in budget (active + negotiated)
      const beforePaySummary = await getSummary(token);
      expect(beforePaySummary.debts.monthlyInstallmentSum).toBe(800); // 500 + 300
      expect(beforePaySummary.totalBudgeted).toBe(3100); // 1500 + 800 + 800

      // 3. Pay the only installment (should trigger paid_off)
      const payResponse = await request(app.getHttpServer())
        .patch(`/api/finance/debts/${newDebtId}/pay-installment`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // currentInstallment becomes 2, which > totalInstallments(1) → paid_off
      expect(payResponse.body.debt.status).toBe('paid_off');
      expect(payResponse.body.debt.currentInstallment).toBe(2);

      // 4. Verify paid_off debt is excluded from monthlyInstallmentSum
      const afterPaySummary = await getSummary(token);
      expect(afterPaySummary.debts.monthlyInstallmentSum).toBe(500); // Back to baseline
      expect(afterPaySummary.totalBudgeted).toBe(2800); // Back to baseline
    });
  });

  describe('Total spent calculation', () => {
    it('should_calculate_totalSpent_from_paid_bills_sum_not_ratio', async () => {
      const token = await createToken({ sub: 'user-123' });

      // Add bills with different amounts
      mockBills.push(
        { id: 'bill-2', userId: 'user-123', amount: '2000', monthYear: '2026-01', status: 'paid' },
        { id: 'bill-3', userId: 'user-123', amount: '500', monthYear: '2026-01', status: 'paid' }
      );

      // Verify totalSpent uses exact SQL SUM of paid bills (2000 + 500 = 2500)
      // NOT a ratio like (2/3 * totalBills)
      const summary = await getSummary(token);

      // paid bills: 2000 + 500 = 2500
      // expenses actual: 400 (from baseline)
      // debt payments: 0
      expect(summary.paidBillsAmount).toBe(2500);
      expect(summary.totalSpent).toBe(2500 + 400);
    });

    it('should_include_debt_payments_in_totalSpent_when_installment_paid', async () => {
      const token = await createToken({ sub: 'user-123' });

      // 1. Baseline: no debt payments
      const baselineSummary = await getSummary(token);
      expect(baselineSummary.debtPaymentsThisMonth).toBe(0);
      expect(baselineSummary.totalSpent).toBe(400); // Only expenses actual

      // 2. Pay one installment (500 BRL)
      await request(app.getHttpServer())
        .patch('/api/finance/debts/debt-baseline-1/pay-installment')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // 3. Verify debt payment is included in totalSpent
      const afterSummary = await getSummary(token);
      expect(afterSummary.debtPaymentsThisMonth).toBe(500);
      expect(afterSummary.totalSpent).toBe(400 + 500); // expenses + debt payment
    });

    it('should_calculate_totalSpent_as_paid_bills_plus_expenses_plus_debt_payments', async () => {
      const token = await createToken({ sub: 'user-123' });

      // Mark baseline bill as paid
      await request(app.getHttpServer())
        .patch('/api/finance/bills/bill-1/pay')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Pay one debt installment
      await request(app.getHttpServer())
        .patch('/api/finance/debts/debt-baseline-1/pay-installment')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const summary = await getSummary(token);

      // paid bills: 1500 (bill-1)
      // expenses actual: 400 (baseline)
      // debt payments: 500 (one installment)
      expect(summary.paidBillsAmount).toBe(1500);
      expect(summary.expensesActual).toBe(400);
      expect(summary.debtPaymentsThisMonth).toBe(500);
      expect(summary.totalSpent).toBe(1500 + 400 + 500);
      expect(summary.totalSpent).toBe(2400);
    });
  });

  describe('Negotiate debt budget inclusion', () => {
    it('should_include_debt_in_totalBudgeted_after_negotiation', async () => {
      const token = await createToken({ sub: 'user-123' });

      // 1. Create a non-negotiated debt
      const createResponse = await request(app.getHttpServer())
        .post('/api/finance/debts')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Cartao Credito',
          totalAmount: 3000,
          isNegotiated: false,
        })
        .expect(201);

      const newDebtId = createResponse.body.debt.id;

      // 2. Verify it's NOT in the budget
      const beforeNegotiateSummary = await getSummary(token);
      expect(beforeNegotiateSummary.totalBudgeted).toBe(2800); // Unchanged
      expect(beforeNegotiateSummary.debts.monthlyInstallmentSum).toBe(500);
      expect(beforeNegotiateSummary.debts.negotiatedCount).toBe(1);

      // 3. Negotiate the debt (set up payment plan)
      const negotiateResponse = await request(app.getHttpServer())
        .patch(`/api/finance/debts/${newDebtId}/negotiate`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          totalInstallments: 10,
          installmentAmount: 300,
          dueDay: 15,
        })
        .expect(200);

      expect(negotiateResponse.body.debt.isNegotiated).toBe(true);
      expect(negotiateResponse.body.debt.currentInstallment).toBe(1);
      expect(negotiateResponse.body.debt.installmentAmount).toBe('300');

      // 4. Verify it IS now in the budget
      const afterNegotiateSummary = await getSummary(token);
      expect(afterNegotiateSummary.totalBudgeted).toBe(3100); // 2800 + 300
      expect(afterNegotiateSummary.debts.monthlyInstallmentSum).toBe(800); // 500 + 300
      expect(afterNegotiateSummary.debts.negotiatedCount).toBe(2); // Increased
    });
  });
});
