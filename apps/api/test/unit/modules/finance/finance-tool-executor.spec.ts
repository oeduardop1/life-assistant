import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock AI package
vi.mock('@life-assistant/ai', () => ({
  createSuccessResult: vi.fn((toolCall, result) => ({
    status: 'success',
    toolCallId: toolCall.id,
    output: result,
  })),
  createErrorResult: vi.fn((toolCall, error) => ({
    status: 'error',
    toolCallId: toolCall.id,
    error: error instanceof Error ? error.message : String(error),
  })),
  getFinanceSummaryParamsSchema: {
    safeParse: vi.fn((data) => ({ success: true, data: { period: 'current_month', ...data } })),
  },
  getPendingBillsParamsSchema: {
    safeParse: vi.fn((data) => ({ success: true, data })),
  },
  markBillPaidParamsSchema: {
    safeParse: vi.fn((data) => ({ success: true, data })),
  },
  createExpenseParamsSchema: {
    safeParse: vi.fn((data) => ({ success: true, data: { isRecurring: false, ...data } })),
  },
  getDebtProgressParamsSchema: {
    safeParse: vi.fn((data) => ({ success: true, data })),
  },
}));

import { FinanceToolExecutorService } from '../../../../src/modules/finance/application/services/finance-tool-executor.service.js';
import {
  createSuccessResult,
  createErrorResult,
  getFinanceSummaryParamsSchema,
  getPendingBillsParamsSchema,
  markBillPaidParamsSchema,
  createExpenseParamsSchema,
  getDebtProgressParamsSchema,
} from '@life-assistant/ai';
import type { ToolCall } from '@life-assistant/ai';

/**
 * Create a mock tool call
 */
function createMockToolCall(overrides: Partial<ToolCall> = {}): ToolCall {
  return {
    id: 'tool-call-123',
    name: 'get_finance_summary',
    arguments: {},
    ...overrides,
  };
}

describe('FinanceToolExecutorService', () => {
  let financeToolExecutor: FinanceToolExecutorService;
  let mockFinanceSummaryService: {
    getSummary: ReturnType<typeof vi.fn>;
  };
  let mockBillsService: {
    findAll: ReturnType<typeof vi.fn>;
    findById: ReturnType<typeof vi.fn>;
    markAsPaid: ReturnType<typeof vi.fn>;
  };
  let mockVariableExpensesService: {
    create: ReturnType<typeof vi.fn>;
  };
  let mockDebtsService: {
    findAll: ReturnType<typeof vi.fn>;
    findById: ReturnType<typeof vi.fn>;
    calculateProjection: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockFinanceSummaryService = {
      getSummary: vi.fn(),
    };

    mockBillsService = {
      findAll: vi.fn(),
      findById: vi.fn(),
      markAsPaid: vi.fn(),
    };

    mockVariableExpensesService = {
      create: vi.fn(),
    };

    mockDebtsService = {
      findAll: vi.fn(),
      findById: vi.fn(),
      calculateProjection: vi.fn(),
    };

    financeToolExecutor = new FinanceToolExecutorService(
      mockFinanceSummaryService as unknown as ConstructorParameters<
        typeof FinanceToolExecutorService
      >[0],
      mockBillsService as unknown as ConstructorParameters<
        typeof FinanceToolExecutorService
      >[1],
      mockVariableExpensesService as unknown as ConstructorParameters<
        typeof FinanceToolExecutorService
      >[2],
      mockDebtsService as unknown as ConstructorParameters<
        typeof FinanceToolExecutorService
      >[3]
    );
  });

  describe('execute', () => {
    describe('get_finance_summary', () => {
      const mockSummary = {
        monthYear: '2026-01',
        totalIncomeExpected: 10000,
        totalIncomeActual: 9500,
        totalBills: 3000,
        billsCount: { total: 10, pending: 5, paid: 4, overdue: 1, canceled: 0 },
        totalExpensesExpected: 2000,
        totalExpensesActual: 1800,
        totalBudgeted: 5500,
        totalSpent: 4800,
        balance: 4700,
        debts: {
          totalDebts: 3,
          totalAmount: 15000,
          totalPaid: 5000,
          totalRemaining: 10000,
          negotiatedCount: 2,
          monthlyInstallmentSum: 500,
        },
        investments: {
          totalInvestments: 2,
          totalCurrentAmount: 20000,
          totalGoalAmount: 50000,
          totalMonthlyContribution: 1000,
          averageProgress: 40,
        },
      };

      it('should return finance summary for current month', async () => {
        mockFinanceSummaryService.getSummary.mockResolvedValue(mockSummary);

        const toolCall = createMockToolCall({
          name: 'get_finance_summary',
          arguments: { period: 'current_month' },
        });

        await financeToolExecutor.execute(toolCall, { userId: 'user-123' });

        expect(mockFinanceSummaryService.getSummary).toHaveBeenCalledWith(
          'user-123',
          expect.any(String)
        );
        expect(createSuccessResult).toHaveBeenCalledWith(
          toolCall,
          expect.objectContaining({
            kpis: expect.objectContaining({
              income: mockSummary.totalIncomeActual,
              balance: mockSummary.balance,
            }),
            debts: expect.objectContaining({
              totalDebts: mockSummary.debts.totalDebts,
            }),
            monthYear: mockSummary.monthYear,
          })
        );
      });

      it('should return finance summary for last month', async () => {
        mockFinanceSummaryService.getSummary.mockResolvedValue(mockSummary);

        const toolCall = createMockToolCall({
          name: 'get_finance_summary',
          arguments: { period: 'last_month' },
        });

        await financeToolExecutor.execute(toolCall, { userId: 'user-123' });

        expect(mockFinanceSummaryService.getSummary).toHaveBeenCalled();
        expect(createSuccessResult).toHaveBeenCalled();
      });

      it('should return error on invalid params', async () => {
        vi.mocked(getFinanceSummaryParamsSchema.safeParse).mockReturnValueOnce({
          success: false,
          error: { message: 'Invalid period' },
        } as unknown as ReturnType<typeof getFinanceSummaryParamsSchema.safeParse>);

        const toolCall = createMockToolCall({
          name: 'get_finance_summary',
          arguments: { period: 'invalid' },
        });

        await financeToolExecutor.execute(toolCall, { userId: 'user-123' });

        expect(createErrorResult).toHaveBeenCalledWith(toolCall, expect.any(Error));
      });
    });

    describe('get_pending_bills', () => {
      const mockBills = [
        {
          id: 'bill-1',
          name: 'Internet',
          category: 'utilities',
          amount: '150.00',
          dueDay: 10,
          status: 'pending',
        },
        {
          id: 'bill-2',
          name: 'Electricity',
          category: 'utilities',
          amount: '200.00',
          dueDay: 15,
          status: 'pending',
        },
      ];

      it('should return pending bills with summary', async () => {
        mockBillsService.findAll.mockResolvedValue({ bills: mockBills, total: 2 });

        const toolCall = createMockToolCall({
          name: 'get_pending_bills',
          arguments: {},
        });

        await financeToolExecutor.execute(toolCall, { userId: 'user-123' });

        expect(mockBillsService.findAll).toHaveBeenCalledWith(
          'user-123',
          expect.objectContaining({ monthYear: expect.any(String) })
        );
        expect(createSuccessResult).toHaveBeenCalledWith(
          toolCall,
          expect.objectContaining({
            bills: expect.any(Array),
            summary: expect.objectContaining({
              countPending: expect.any(Number),
            }),
            monthYear: expect.any(String),
          })
        );
      });

      it('should accept month and year parameters', async () => {
        mockBillsService.findAll.mockResolvedValue({ bills: [], total: 0 });

        const toolCall = createMockToolCall({
          name: 'get_pending_bills',
          arguments: { month: 3, year: 2026 },
        });

        await financeToolExecutor.execute(toolCall, { userId: 'user-123' });

        expect(mockBillsService.findAll).toHaveBeenCalledWith(
          'user-123',
          expect.objectContaining({ monthYear: '2026-03' })
        );
      });

      it('should return error on invalid params', async () => {
        vi.mocked(getPendingBillsParamsSchema.safeParse).mockReturnValueOnce({
          success: false,
          error: { message: 'Invalid month' },
        } as unknown as ReturnType<typeof getPendingBillsParamsSchema.safeParse>);

        const toolCall = createMockToolCall({
          name: 'get_pending_bills',
          arguments: { month: 13 },
        });

        await financeToolExecutor.execute(toolCall, { userId: 'user-123' });

        expect(createErrorResult).toHaveBeenCalledWith(toolCall, expect.any(Error));
      });
    });

    describe('mark_bill_paid', () => {
      const mockBill = {
        id: 'bill-123',
        name: 'Internet',
        amount: '150.00',
        dueDay: 10,
        status: 'pending',
      };

      it('should mark bill as paid', async () => {
        mockBillsService.findById.mockResolvedValue(mockBill);
        mockBillsService.markAsPaid.mockResolvedValue({ ...mockBill, status: 'paid' });

        const toolCall = createMockToolCall({
          name: 'mark_bill_paid',
          arguments: { billId: 'bill-123' },
        });

        await financeToolExecutor.execute(toolCall, { userId: 'user-123' });

        expect(mockBillsService.findById).toHaveBeenCalledWith('user-123', 'bill-123');
        expect(mockBillsService.markAsPaid).toHaveBeenCalledWith('user-123', 'bill-123');
        expect(createSuccessResult).toHaveBeenCalledWith(
          toolCall,
          expect.objectContaining({
            success: true,
            bill: expect.objectContaining({
              id: 'bill-123',
              name: 'Internet',
            }),
            message: expect.stringContaining('Internet'),
          })
        );
      });

      it('should return error on invalid params', async () => {
        vi.mocked(markBillPaidParamsSchema.safeParse).mockReturnValueOnce({
          success: false,
          error: { message: 'Invalid billId' },
        } as unknown as ReturnType<typeof markBillPaidParamsSchema.safeParse>);

        const toolCall = createMockToolCall({
          name: 'mark_bill_paid',
          arguments: { billId: 'not-a-uuid' },
        });

        await financeToolExecutor.execute(toolCall, { userId: 'user-123' });

        expect(createErrorResult).toHaveBeenCalledWith(toolCall, expect.any(Error));
      });
    });

    describe('create_expense', () => {
      const mockExpense = {
        id: 'expense-123',
        name: 'Mercado',
        category: 'alimentacao',
        expectedAmount: null,
        actualAmount: '450.00',
        isRecurring: false,
        monthYear: '2026-01',
      };

      it('should create expense', async () => {
        mockVariableExpensesService.create.mockResolvedValue(mockExpense);

        const toolCall = createMockToolCall({
          name: 'create_expense',
          arguments: {
            name: 'Mercado',
            category: 'alimentacao',
            actualAmount: 450,
          },
        });

        await financeToolExecutor.execute(toolCall, { userId: 'user-123' });

        expect(mockVariableExpensesService.create).toHaveBeenCalledWith(
          'user-123',
          expect.objectContaining({
            name: 'Mercado',
            category: 'food', // Mapped from 'alimentacao' to 'food'
            actualAmount: '450',
          })
        );
        expect(createSuccessResult).toHaveBeenCalledWith(
          toolCall,
          expect.objectContaining({
            success: true,
            expense: expect.objectContaining({
              id: 'expense-123',
              name: 'Mercado',
            }),
            message: expect.stringContaining('Mercado'),
          })
        );
      });

      it('should create recurring expense', async () => {
        mockVariableExpensesService.create.mockResolvedValue({
          ...mockExpense,
          isRecurring: true,
        });

        const toolCall = createMockToolCall({
          name: 'create_expense',
          arguments: {
            name: 'Uber',
            category: 'transporte',
            budgetedAmount: 200,
            actualAmount: 180,
            isRecurring: true,
          },
        });

        await financeToolExecutor.execute(toolCall, { userId: 'user-123' });

        expect(mockVariableExpensesService.create).toHaveBeenCalledWith(
          'user-123',
          expect.objectContaining({
            isRecurring: true,
          })
        );
      });

      it('should return error on invalid params', async () => {
        vi.mocked(createExpenseParamsSchema.safeParse).mockReturnValueOnce({
          success: false,
          error: { message: 'Invalid category' },
        } as unknown as ReturnType<typeof createExpenseParamsSchema.safeParse>);

        const toolCall = createMockToolCall({
          name: 'create_expense',
          arguments: { name: 'Test', category: 'invalid' },
        });

        await financeToolExecutor.execute(toolCall, { userId: 'user-123' });

        expect(createErrorResult).toHaveBeenCalledWith(toolCall, expect.any(Error));
      });
    });

    describe('get_debt_progress', () => {
      const mockDebt = {
        id: 'debt-123',
        name: 'Credit Card',
        creditor: 'Bank X',
        totalAmount: '10000.00',
        installmentAmount: '500.00',
        totalInstallments: 20,
        currentInstallment: 5,
        dueDay: 15,
        status: 'active',
        isNegotiated: true,
      };

      it('should return progress for all debts', async () => {
        mockDebtsService.findAll.mockResolvedValue({ debts: [mockDebt], total: 1 });
        mockDebtsService.calculateProjection.mockResolvedValue({
          estimatedPayoffMonthYear: '2027-05',
          remainingMonths: 16,
          paymentVelocity: { avgPaymentsPerMonth: 1, isRegular: true },
          message: 'No ritmo atual, você quita em Maio/2027 (16 meses).',
        });

        const toolCall = createMockToolCall({
          name: 'get_debt_progress',
          arguments: {},
        });

        await financeToolExecutor.execute(toolCall, { userId: 'user-123' });

        expect(mockDebtsService.findAll).toHaveBeenCalledWith('user-123', {});
        expect(createSuccessResult).toHaveBeenCalledWith(
          toolCall,
          expect.objectContaining({
            debts: expect.arrayContaining([
              expect.objectContaining({
                id: 'debt-123',
                name: 'Credit Card',
                paidInstallments: 4, // currentInstallment (5) - 1
                remainingInstallments: 16, // totalInstallments (20) - paidInstallments (4)
                percentComplete: 20, // paidInstallments (4) / totalInstallments (20) * 100
                projection: expect.objectContaining({
                  estimatedPayoffMonthYear: '2027-05',
                  remainingMonths: 16,
                }),
              }),
            ]),
            summary: expect.objectContaining({
              totalDebts: 1,
            }),
          })
        );
      });

      it('should return progress for specific debt', async () => {
        mockDebtsService.findById.mockResolvedValue(mockDebt);
        mockDebtsService.calculateProjection.mockResolvedValue({
          estimatedPayoffMonthYear: '2027-05',
          remainingMonths: 16,
          paymentVelocity: { avgPaymentsPerMonth: 1, isRegular: true },
          message: 'No ritmo atual, você quita em Maio/2027 (16 meses).',
        });

        const toolCall = createMockToolCall({
          name: 'get_debt_progress',
          arguments: { debtId: 'debt-123' },
        });

        await financeToolExecutor.execute(toolCall, { userId: 'user-123' });

        expect(mockDebtsService.findById).toHaveBeenCalledWith('user-123', 'debt-123');
        expect(mockDebtsService.calculateProjection).toHaveBeenCalledWith('user-123', 'debt-123');
        expect(createSuccessResult).toHaveBeenCalledWith(
          toolCall,
          expect.objectContaining({
            debts: expect.arrayContaining([
              expect.objectContaining({
                id: 'debt-123',
                projection: expect.objectContaining({
                  estimatedPayoffMonthYear: '2027-05',
                  remainingMonths: 16,
                }),
              }),
            ]),
          })
        );
      });

      it('should return error on invalid params', async () => {
        vi.mocked(getDebtProgressParamsSchema.safeParse).mockReturnValueOnce({
          success: false,
          error: { message: 'Invalid debtId' },
        } as unknown as ReturnType<typeof getDebtProgressParamsSchema.safeParse>);

        const toolCall = createMockToolCall({
          name: 'get_debt_progress',
          arguments: { debtId: 'not-a-uuid' },
        });

        await financeToolExecutor.execute(toolCall, { userId: 'user-123' });

        expect(createErrorResult).toHaveBeenCalledWith(toolCall, expect.any(Error));
      });
    });

    describe('unknown tool', () => {
      it('should return error for unknown tool', async () => {
        const toolCall = createMockToolCall({
          name: 'unknown_tool',
          arguments: {},
        });

        await financeToolExecutor.execute(toolCall, { userId: 'user-123' });

        expect(createErrorResult).toHaveBeenCalledWith(toolCall, expect.any(Error));
      });
    });
  });
});
