import { describe, it, expect, vi, beforeEach } from 'vitest';

import { FinanceSummaryService } from '../../../../src/modules/finance/application/services/finance-summary.service.js';

/**
 * Create a mock DebtSummary for testing
 */
function createMockDebtSummary(
  overrides: Partial<{
    totalDebts: number;
    totalAmount: number;
    totalPaid: number;
    totalRemaining: number;
    negotiatedCount: number;
    monthlyInstallmentSum: number;
  }> = {}
) {
  return {
    totalDebts: 3,
    totalAmount: 30000,
    totalPaid: 5000,
    totalRemaining: 25000,
    negotiatedCount: 2,
    monthlyInstallmentSum: 1500,
    ...overrides,
  };
}

/**
 * Create a mock InvestmentSummary for testing
 */
function createMockInvestmentSummary(
  overrides: Partial<{
    totalInvestments: number;
    totalCurrentAmount: number;
    totalGoalAmount: number;
    totalMonthlyContribution: number;
    averageProgress: number;
  }> = {}
) {
  return {
    totalInvestments: 2,
    totalCurrentAmount: 15000,
    totalGoalAmount: 50000,
    totalMonthlyContribution: 1000,
    averageProgress: 30,
    ...overrides,
  };
}

describe('FinanceSummaryService', () => {
  let service: FinanceSummaryService;
  let mockIncomesService: {
    sumByMonthYear: ReturnType<typeof vi.fn>;
  };
  let mockBillsService: {
    sumByMonthYear: ReturnType<typeof vi.fn>;
    sumByMonthYearAndStatus: ReturnType<typeof vi.fn>;
    countByStatus: ReturnType<typeof vi.fn>;
  };
  let mockVariableExpensesService: {
    sumByMonthYear: ReturnType<typeof vi.fn>;
  };
  let mockDebtsService: {
    getSummary: ReturnType<typeof vi.fn>;
    sumPaymentsByMonthYear: ReturnType<typeof vi.fn>;
  };
  let mockInvestmentsService: {
    getSummary: ReturnType<typeof vi.fn>;
  };
  let mockLogger: {
    setContext: ReturnType<typeof vi.fn>;
    log: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockIncomesService = {
      sumByMonthYear: vi.fn(),
    };

    mockBillsService = {
      sumByMonthYear: vi.fn(),
      sumByMonthYearAndStatus: vi.fn(),
      countByStatus: vi.fn(),
    };

    mockVariableExpensesService = {
      sumByMonthYear: vi.fn(),
    };

    mockDebtsService = {
      getSummary: vi.fn(),
      sumPaymentsByMonthYear: vi.fn(),
    };

    mockInvestmentsService = {
      getSummary: vi.fn(),
    };

    mockLogger = {
      setContext: vi.fn(),
      log: vi.fn(),
    };

    service = new FinanceSummaryService(
      mockIncomesService as unknown as ConstructorParameters<
        typeof FinanceSummaryService
      >[0],
      mockBillsService as unknown as ConstructorParameters<
        typeof FinanceSummaryService
      >[1],
      mockVariableExpensesService as unknown as ConstructorParameters<
        typeof FinanceSummaryService
      >[2],
      mockDebtsService as unknown as ConstructorParameters<
        typeof FinanceSummaryService
      >[3],
      mockInvestmentsService as unknown as ConstructorParameters<
        typeof FinanceSummaryService
      >[4],
      mockLogger as unknown as ConstructorParameters<
        typeof FinanceSummaryService
      >[5]
    );
  });

  /**
   * Helper to set up default mocks for all services
   */
  function setupDefaultMocks(overrides: {
    incomeExpected?: number;
    incomeActual?: number;
    totalBills?: number;
    paidBillsAmount?: number;
    billStatusCounts?: { pending: number; paid: number; overdue: number; canceled: number };
    expensesExpected?: number;
    expensesActual?: number;
    debtPaymentsThisMonth?: number;
    debtsSummary?: ReturnType<typeof createMockDebtSummary>;
    investmentsSummary?: ReturnType<typeof createMockInvestmentSummary>;
  } = {}) {
    const {
      incomeExpected = 0,
      incomeActual = 0,
      totalBills = 0,
      paidBillsAmount = 0,
      billStatusCounts = { pending: 0, paid: 0, overdue: 0, canceled: 0 },
      expensesExpected = 0,
      expensesActual = 0,
      debtPaymentsThisMonth = 0,
      debtsSummary = createMockDebtSummary({ monthlyInstallmentSum: 0 }),
      investmentsSummary = createMockInvestmentSummary(),
    } = overrides;

    mockIncomesService.sumByMonthYear
      .mockResolvedValueOnce(incomeExpected)
      .mockResolvedValueOnce(incomeActual);
    mockBillsService.sumByMonthYear.mockResolvedValue(totalBills);
    mockBillsService.sumByMonthYearAndStatus.mockResolvedValue(paidBillsAmount);
    mockBillsService.countByStatus.mockResolvedValue(billStatusCounts);
    mockVariableExpensesService.sumByMonthYear
      .mockResolvedValueOnce(expensesExpected)
      .mockResolvedValueOnce(expensesActual);
    mockDebtsService.getSummary.mockResolvedValue(debtsSummary);
    mockDebtsService.sumPaymentsByMonthYear.mockResolvedValue(debtPaymentsThisMonth);
    mockInvestmentsService.getSummary.mockResolvedValue(investmentsSummary);
  }

  describe('getSummary', () => {
    describe('KPIs principais', () => {
      it('should_calculate_income_from_actual_amounts', async () => {
        setupDefaultMocks({
          incomeExpected: 8000,
          incomeActual: 7500,
        });

        const result = await service.getSummary('user-123', '2024-01');

        expect(result.totalIncomeExpected).toBe(8000);
        expect(result.totalIncomeActual).toBe(7500);
      });

      it('should_calculate_total_budgeted_as_bills_plus_expenses_plus_debt_installments', async () => {
        const totalBills = 3000;
        const expensesExpected = 2000;
        const monthlyInstallmentSum = 1500;

        setupDefaultMocks({
          incomeExpected: 5000,
          incomeActual: 5000,
          totalBills,
          expensesExpected,
          debtsSummary: createMockDebtSummary({ monthlyInstallmentSum }),
        });

        const result = await service.getSummary('user-123', '2024-01');

        expect(result.totalBudgeted).toBe(
          totalBills + expensesExpected + monthlyInstallmentSum
        );
        expect(result.totalBudgeted).toBe(6500);
      });

      it('should_calculate_paid_bills_from_actual_sql_sum', async () => {
        // paidBillsAmount comes from sumByMonthYearAndStatus('paid')
        // NOT from ratio calculation
        const paidBillsAmount = 2500;

        setupDefaultMocks({
          incomeActual: 10000,
          totalBills: 4000, // Total bills amount (irrelevant for totalSpent)
          paidBillsAmount, // Only paid bills sum matters
          billStatusCounts: { pending: 1, paid: 2, overdue: 1, canceled: 0 },
        });

        const result = await service.getSummary('user-123', '2024-01');

        // totalSpent uses the actual SQL SUM of paid bills, not ratio
        expect(result.totalSpent).toBe(paidBillsAmount);
        expect(mockBillsService.sumByMonthYearAndStatus).toHaveBeenCalledWith(
          'user-123',
          '2024-01',
          'paid'
        );
      });

      it('should_calculate_total_spent_as_paid_bills_plus_expenses_plus_debt_payments', async () => {
        const paidBillsAmount = 3000;
        const expensesActual = 1200;
        const debtPaymentsThisMonth = 750;

        setupDefaultMocks({
          incomeActual: 10000,
          totalBills: 5000,
          paidBillsAmount,
          expensesExpected: 2000,
          expensesActual,
          debtPaymentsThisMonth,
        });

        const result = await service.getSummary('user-123', '2024-01');

        expect(result.totalSpent).toBe(
          paidBillsAmount + expensesActual + debtPaymentsThisMonth
        );
        expect(result.totalSpent).toBe(4950);
      });

      it('should_calculate_balance_as_income_minus_total_spent', async () => {
        const incomeActual = 10000;
        const paidBillsAmount = 3000;
        const expensesActual = 2000;
        const debtPaymentsThisMonth = 500;

        setupDefaultMocks({
          incomeExpected: 10000,
          incomeActual,
          totalBills: 3000,
          paidBillsAmount,
          expensesExpected: 2500,
          expensesActual,
          debtPaymentsThisMonth,
        });

        const result = await service.getSummary('user-123', '2024-01');

        const expectedTotalSpent = paidBillsAmount + expensesActual + debtPaymentsThisMonth;
        expect(result.balance).toBe(incomeActual - expectedTotalSpent);
        expect(result.balance).toBe(4500);
      });

      it('should_include_investment_summary_from_investments_service', async () => {
        const investmentSummary = createMockInvestmentSummary({
          totalCurrentAmount: 25000,
          totalGoalAmount: 100000,
          averageProgress: 25,
        });

        setupDefaultMocks({
          investmentsSummary: investmentSummary,
        });

        const result = await service.getSummary('user-123', '2024-01');

        expect(result.investments).toEqual(investmentSummary);
        expect(result.investments.totalCurrentAmount).toBe(25000);
        expect(result.investments.averageProgress).toBe(25);
      });

      it('should_return_zero_values_when_all_services_return_zero', async () => {
        setupDefaultMocks({
          debtsSummary: createMockDebtSummary({
            totalDebts: 0,
            totalAmount: 0,
            totalPaid: 0,
            totalRemaining: 0,
            negotiatedCount: 0,
            monthlyInstallmentSum: 0,
          }),
          investmentsSummary: createMockInvestmentSummary({
            totalInvestments: 0,
            totalCurrentAmount: 0,
            totalGoalAmount: 0,
            totalMonthlyContribution: 0,
            averageProgress: 0,
          }),
        });

        const result = await service.getSummary('user-123', '2024-01');

        expect(result.totalIncomeExpected).toBe(0);
        expect(result.totalIncomeActual).toBe(0);
        expect(result.totalBills).toBe(0);
        expect(result.totalExpensesExpected).toBe(0);
        expect(result.totalExpensesActual).toBe(0);
        expect(result.totalBudgeted).toBe(0);
        expect(result.totalSpent).toBe(0);
        expect(result.balance).toBe(0);
      });

      it('should_handle_no_bills_without_division_by_zero', async () => {
        setupDefaultMocks({
          incomeActual: 5000,
        });

        const result = await service.getSummary('user-123', '2024-01');

        expect(result.totalSpent).toBe(0);
        expect(result.billsCount.total).toBe(0);
        expect(Number.isFinite(result.totalSpent)).toBe(true);
        expect(Number.isFinite(result.balance)).toBe(true);
      });

      it('should_calculate_negative_balance_when_spent_exceeds_income', async () => {
        const incomeActual = 3000;
        const paidBillsAmount = 4000;
        const expensesActual = 1000;
        const debtPaymentsThisMonth = 500;

        setupDefaultMocks({
          incomeExpected: 3000,
          incomeActual,
          totalBills: 4000,
          paidBillsAmount,
          expensesExpected: 1500,
          expensesActual,
          debtPaymentsThisMonth,
        });

        const result = await service.getSummary('user-123', '2024-01');

        // totalSpent = 4000 + 1000 + 500 = 5500
        // balance = 3000 - 5500 = -2500
        expect(result.balance).toBe(-2500);
        expect(result.balance).toBeLessThan(0);
      });

      it('should_include_only_debt_payments_from_target_month', async () => {
        setupDefaultMocks({
          incomeActual: 10000,
          paidBillsAmount: 2000,
          expensesActual: 1000,
          debtPaymentsThisMonth: 1500,
        });

        const result = await service.getSummary('user-123', '2024-03');

        expect(mockDebtsService.sumPaymentsByMonthYear).toHaveBeenCalledWith(
          'user-123',
          '2024-03'
        );
        expect(result.totalSpent).toBe(2000 + 1000 + 1500);
      });
    });

    describe('exclusion of non-negotiated debts from totalBudgeted', () => {
      it('should_only_use_monthly_installment_sum_from_debts_summary', async () => {
        const monthlyInstallmentSum = 800;

        setupDefaultMocks({
          totalBills: 2000,
          billStatusCounts: { pending: 2, paid: 0, overdue: 0, canceled: 0 },
          expensesExpected: 1000,
          debtsSummary: createMockDebtSummary({
            totalAmount: 50000,
            monthlyInstallmentSum,
          }),
        });

        const result = await service.getSummary('user-123', '2024-01');

        expect(result.totalBudgeted).toBe(2000 + 1000 + monthlyInstallmentSum);
        expect(result.totalBudgeted).toBe(3800);
      });

      it('should_not_include_non_negotiated_debt_amounts_in_total_budgeted', async () => {
        setupDefaultMocks({
          totalBills: 1000,
          billStatusCounts: { pending: 1, paid: 0, overdue: 0, canceled: 0 },
          expensesExpected: 500,
          debtsSummary: createMockDebtSummary({
            totalDebts: 5,
            totalAmount: 100000,
            negotiatedCount: 0,
            monthlyInstallmentSum: 0,
          }),
        });

        const result = await service.getSummary('user-123', '2024-01');

        expect(result.totalBudgeted).toBe(1000 + 500 + 0);
        expect(result.totalBudgeted).toBe(1500);
        expect(result.debts.totalAmount).toBe(100000);
      });
    });

    describe('month handling', () => {
      it('should_use_provided_month_year', async () => {
        setupDefaultMocks();

        const result = await service.getSummary('user-123', '2024-06');

        expect(result.monthYear).toBe('2024-06');
        expect(mockIncomesService.sumByMonthYear).toHaveBeenCalledWith(
          'user-123',
          '2024-06',
          'expectedAmount'
        );
        expect(mockIncomesService.sumByMonthYear).toHaveBeenCalledWith(
          'user-123',
          '2024-06',
          'actualAmount'
        );
        expect(mockBillsService.sumByMonthYearAndStatus).toHaveBeenCalledWith(
          'user-123',
          '2024-06',
          'paid'
        );
        expect(mockDebtsService.sumPaymentsByMonthYear).toHaveBeenCalledWith(
          'user-123',
          '2024-06'
        );
      });

      it('should_default_to_current_month_when_not_provided', async () => {
        setupDefaultMocks();

        const currentMonth = new Date().toISOString().slice(0, 7);

        const result = await service.getSummary('user-123');

        expect(result.monthYear).toBe(currentMonth);
        expect(mockIncomesService.sumByMonthYear).toHaveBeenCalledWith(
          'user-123',
          currentMonth,
          expect.any(String)
        );
      });
    });
  });
});
