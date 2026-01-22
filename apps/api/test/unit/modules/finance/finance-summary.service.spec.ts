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
    countByStatus: ReturnType<typeof vi.fn>;
  };
  let mockVariableExpensesService: {
    sumByMonthYear: ReturnType<typeof vi.fn>;
  };
  let mockDebtsService: {
    getSummary: ReturnType<typeof vi.fn>;
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
      countByStatus: vi.fn(),
    };

    mockVariableExpensesService = {
      sumByMonthYear: vi.fn(),
    };

    mockDebtsService = {
      getSummary: vi.fn(),
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

  describe('getSummary', () => {
    describe('KPIs principais', () => {
      it('should_calculate_income_from_actual_amounts', async () => {
        mockIncomesService.sumByMonthYear
          .mockResolvedValueOnce(8000) // expectedAmount
          .mockResolvedValueOnce(7500); // actualAmount
        mockBillsService.sumByMonthYear.mockResolvedValue(3000);
        mockBillsService.countByStatus.mockResolvedValue({
          pending: 2,
          paid: 3,
          overdue: 0,
          canceled: 0,
        });
        mockVariableExpensesService.sumByMonthYear
          .mockResolvedValueOnce(2000) // expectedAmount
          .mockResolvedValueOnce(1800); // actualAmount
        mockDebtsService.getSummary.mockResolvedValue(createMockDebtSummary());
        mockInvestmentsService.getSummary.mockResolvedValue(
          createMockInvestmentSummary()
        );

        const result = await service.getSummary('user-123', '2024-01');

        expect(result.totalIncomeExpected).toBe(8000);
        expect(result.totalIncomeActual).toBe(7500);
      });

      it('should_calculate_total_budgeted_as_bills_plus_expenses_plus_debt_installments', async () => {
        const totalBills = 3000;
        const expensesExpected = 2000;
        const monthlyInstallmentSum = 1500;

        mockIncomesService.sumByMonthYear.mockResolvedValue(5000);
        mockBillsService.sumByMonthYear.mockResolvedValue(totalBills);
        mockBillsService.countByStatus.mockResolvedValue({
          pending: 5,
          paid: 0,
          overdue: 0,
          canceled: 0,
        });
        mockVariableExpensesService.sumByMonthYear
          .mockResolvedValueOnce(expensesExpected)
          .mockResolvedValueOnce(0);
        mockDebtsService.getSummary.mockResolvedValue(
          createMockDebtSummary({ monthlyInstallmentSum })
        );
        mockInvestmentsService.getSummary.mockResolvedValue(
          createMockInvestmentSummary()
        );

        const result = await service.getSummary('user-123', '2024-01');

        expect(result.totalBudgeted).toBe(
          totalBills + expensesExpected + monthlyInstallmentSum
        );
        expect(result.totalBudgeted).toBe(6500);
      });

      it('should_calculate_paid_bills_proportionally_by_status_count', async () => {
        const totalBills = 4000; // Total sum of all bills
        // 2 out of 4 bills are paid → 50% ratio → paidBillsAmount = 4000 * 0.5 = 2000

        mockIncomesService.sumByMonthYear.mockResolvedValue(10000);
        mockBillsService.sumByMonthYear.mockResolvedValue(totalBills);
        mockBillsService.countByStatus.mockResolvedValue({
          pending: 1,
          paid: 2,
          overdue: 1,
          canceled: 0,
        });
        mockVariableExpensesService.sumByMonthYear.mockResolvedValue(0);
        mockDebtsService.getSummary.mockResolvedValue(
          createMockDebtSummary({ monthlyInstallmentSum: 0 })
        );
        mockInvestmentsService.getSummary.mockResolvedValue(
          createMockInvestmentSummary()
        );

        const result = await service.getSummary('user-123', '2024-01');

        // paidBillsRatio = 2 / (1+2+1+0) = 0.5
        // paidBillsAmount = 4000 * 0.5 = 2000
        expect(result.totalSpent).toBe(2000); // paidBillsAmount + expensesActual(0)
      });

      it('should_calculate_total_spent_as_paid_bills_plus_actual_expenses', async () => {
        const totalBills = 3000;
        const expensesActual = 1200;

        mockIncomesService.sumByMonthYear.mockResolvedValue(10000);
        mockBillsService.sumByMonthYear.mockResolvedValue(totalBills);
        mockBillsService.countByStatus.mockResolvedValue({
          pending: 0,
          paid: 5, // All paid → ratio = 1.0
          overdue: 0,
          canceled: 0,
        });
        mockVariableExpensesService.sumByMonthYear
          .mockResolvedValueOnce(2000) // expectedAmount
          .mockResolvedValueOnce(expensesActual); // actualAmount
        mockDebtsService.getSummary.mockResolvedValue(
          createMockDebtSummary({ monthlyInstallmentSum: 0 })
        );
        mockInvestmentsService.getSummary.mockResolvedValue(
          createMockInvestmentSummary()
        );

        const result = await service.getSummary('user-123', '2024-01');

        // All bills paid → paidBillsAmount = 3000
        // totalSpent = 3000 + 1200 = 4200
        expect(result.totalSpent).toBe(totalBills + expensesActual);
        expect(result.totalSpent).toBe(4200);
      });

      it('should_calculate_balance_as_income_minus_total_spent', async () => {
        const incomeActual = 10000;
        const totalBills = 3000;
        const expensesActual = 2000;

        mockIncomesService.sumByMonthYear
          .mockResolvedValueOnce(10000) // expectedAmount
          .mockResolvedValueOnce(incomeActual); // actualAmount
        mockBillsService.sumByMonthYear.mockResolvedValue(totalBills);
        mockBillsService.countByStatus.mockResolvedValue({
          pending: 0,
          paid: 3, // All paid
          overdue: 0,
          canceled: 0,
        });
        mockVariableExpensesService.sumByMonthYear
          .mockResolvedValueOnce(2500) // expectedAmount
          .mockResolvedValueOnce(expensesActual); // actualAmount
        mockDebtsService.getSummary.mockResolvedValue(
          createMockDebtSummary({ monthlyInstallmentSum: 0 })
        );
        mockInvestmentsService.getSummary.mockResolvedValue(
          createMockInvestmentSummary()
        );

        const result = await service.getSummary('user-123', '2024-01');

        // totalSpent = 3000 + 2000 = 5000
        // balance = 10000 - 5000 = 5000
        expect(result.balance).toBe(incomeActual - (totalBills + expensesActual));
        expect(result.balance).toBe(5000);
      });

      it('should_include_investment_summary_from_investments_service', async () => {
        const investmentSummary = createMockInvestmentSummary({
          totalCurrentAmount: 25000,
          totalGoalAmount: 100000,
          averageProgress: 25,
        });

        mockIncomesService.sumByMonthYear.mockResolvedValue(0);
        mockBillsService.sumByMonthYear.mockResolvedValue(0);
        mockBillsService.countByStatus.mockResolvedValue({
          pending: 0,
          paid: 0,
          overdue: 0,
          canceled: 0,
        });
        mockVariableExpensesService.sumByMonthYear.mockResolvedValue(0);
        mockDebtsService.getSummary.mockResolvedValue(
          createMockDebtSummary({ monthlyInstallmentSum: 0 })
        );
        mockInvestmentsService.getSummary.mockResolvedValue(investmentSummary);

        const result = await service.getSummary('user-123', '2024-01');

        expect(result.investments).toEqual(investmentSummary);
        expect(result.investments.totalCurrentAmount).toBe(25000);
        expect(result.investments.averageProgress).toBe(25);
      });

      it('should_return_zero_values_when_all_services_return_zero', async () => {
        mockIncomesService.sumByMonthYear.mockResolvedValue(0);
        mockBillsService.sumByMonthYear.mockResolvedValue(0);
        mockBillsService.countByStatus.mockResolvedValue({
          pending: 0,
          paid: 0,
          overdue: 0,
          canceled: 0,
        });
        mockVariableExpensesService.sumByMonthYear.mockResolvedValue(0);
        mockDebtsService.getSummary.mockResolvedValue(
          createMockDebtSummary({
            totalDebts: 0,
            totalAmount: 0,
            totalPaid: 0,
            totalRemaining: 0,
            negotiatedCount: 0,
            monthlyInstallmentSum: 0,
          })
        );
        mockInvestmentsService.getSummary.mockResolvedValue(
          createMockInvestmentSummary({
            totalInvestments: 0,
            totalCurrentAmount: 0,
            totalGoalAmount: 0,
            totalMonthlyContribution: 0,
            averageProgress: 0,
          })
        );

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
        // When totalBillsCount = 0, paidBillsRatio should be 0
        mockIncomesService.sumByMonthYear.mockResolvedValue(5000);
        mockBillsService.sumByMonthYear.mockResolvedValue(0);
        mockBillsService.countByStatus.mockResolvedValue({
          pending: 0,
          paid: 0,
          overdue: 0,
          canceled: 0,
        });
        mockVariableExpensesService.sumByMonthYear.mockResolvedValue(0);
        mockDebtsService.getSummary.mockResolvedValue(
          createMockDebtSummary({ monthlyInstallmentSum: 0 })
        );
        mockInvestmentsService.getSummary.mockResolvedValue(
          createMockInvestmentSummary()
        );

        const result = await service.getSummary('user-123', '2024-01');

        expect(result.totalSpent).toBe(0);
        expect(result.billsCount.total).toBe(0);
        // No NaN or Infinity from 0/0
        expect(Number.isFinite(result.totalSpent)).toBe(true);
        expect(Number.isFinite(result.balance)).toBe(true);
      });

      it('should_calculate_negative_balance_when_spent_exceeds_income', async () => {
        const incomeActual = 3000;
        const totalBills = 4000;
        const expensesActual = 1000;

        mockIncomesService.sumByMonthYear
          .mockResolvedValueOnce(3000)
          .mockResolvedValueOnce(incomeActual);
        mockBillsService.sumByMonthYear.mockResolvedValue(totalBills);
        mockBillsService.countByStatus.mockResolvedValue({
          pending: 0,
          paid: 4,
          overdue: 0,
          canceled: 0,
        });
        mockVariableExpensesService.sumByMonthYear
          .mockResolvedValueOnce(1500)
          .mockResolvedValueOnce(expensesActual);
        mockDebtsService.getSummary.mockResolvedValue(
          createMockDebtSummary({ monthlyInstallmentSum: 0 })
        );
        mockInvestmentsService.getSummary.mockResolvedValue(
          createMockInvestmentSummary()
        );

        const result = await service.getSummary('user-123', '2024-01');

        // totalSpent = 4000 + 1000 = 5000
        // balance = 3000 - 5000 = -2000
        expect(result.balance).toBe(-2000);
        expect(result.balance).toBeLessThan(0);
      });
    });

    describe('exclusion of non-negotiated debts from totalBudgeted', () => {
      it('should_only_use_monthly_installment_sum_from_debts_summary', async () => {
        // monthlyInstallmentSum already excludes non-negotiated debts
        // (calculated in repository as only active+negotiated)
        const monthlyInstallmentSum = 800;

        mockIncomesService.sumByMonthYear.mockResolvedValue(0);
        mockBillsService.sumByMonthYear.mockResolvedValue(2000);
        mockBillsService.countByStatus.mockResolvedValue({
          pending: 2,
          paid: 0,
          overdue: 0,
          canceled: 0,
        });
        mockVariableExpensesService.sumByMonthYear
          .mockResolvedValueOnce(1000) // expectedAmount
          .mockResolvedValueOnce(0); // actualAmount
        mockDebtsService.getSummary.mockResolvedValue(
          createMockDebtSummary({
            totalAmount: 50000, // Large total, but only installments matter
            monthlyInstallmentSum,
          })
        );
        mockInvestmentsService.getSummary.mockResolvedValue(
          createMockInvestmentSummary()
        );

        const result = await service.getSummary('user-123', '2024-01');

        // totalBudgeted uses monthlyInstallmentSum, NOT totalAmount
        expect(result.totalBudgeted).toBe(2000 + 1000 + monthlyInstallmentSum);
        expect(result.totalBudgeted).toBe(3800);
      });

      it('should_not_include_non_negotiated_debt_amounts_in_total_budgeted', async () => {
        // Scenario: monthlyInstallmentSum = 0 means no negotiated active debts
        mockIncomesService.sumByMonthYear.mockResolvedValue(0);
        mockBillsService.sumByMonthYear.mockResolvedValue(1000);
        mockBillsService.countByStatus.mockResolvedValue({
          pending: 1,
          paid: 0,
          overdue: 0,
          canceled: 0,
        });
        mockVariableExpensesService.sumByMonthYear
          .mockResolvedValueOnce(500) // expectedAmount
          .mockResolvedValueOnce(0); // actualAmount
        mockDebtsService.getSummary.mockResolvedValue(
          createMockDebtSummary({
            totalDebts: 5,
            totalAmount: 100000, // Large debt total
            negotiatedCount: 0, // None negotiated
            monthlyInstallmentSum: 0, // No installments
          })
        );
        mockInvestmentsService.getSummary.mockResolvedValue(
          createMockInvestmentSummary()
        );

        const result = await service.getSummary('user-123', '2024-01');

        // totalBudgeted should NOT include 100000 from non-negotiated debts
        expect(result.totalBudgeted).toBe(1000 + 500 + 0);
        expect(result.totalBudgeted).toBe(1500);
        // But debts summary should still report the totalAmount
        expect(result.debts.totalAmount).toBe(100000);
      });
    });

    describe('month handling', () => {
      it('should_use_provided_month_year', async () => {
        mockIncomesService.sumByMonthYear.mockResolvedValue(0);
        mockBillsService.sumByMonthYear.mockResolvedValue(0);
        mockBillsService.countByStatus.mockResolvedValue({
          pending: 0,
          paid: 0,
          overdue: 0,
          canceled: 0,
        });
        mockVariableExpensesService.sumByMonthYear.mockResolvedValue(0);
        mockDebtsService.getSummary.mockResolvedValue(
          createMockDebtSummary({ monthlyInstallmentSum: 0 })
        );
        mockInvestmentsService.getSummary.mockResolvedValue(
          createMockInvestmentSummary()
        );

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
      });

      it('should_default_to_current_month_when_not_provided', async () => {
        mockIncomesService.sumByMonthYear.mockResolvedValue(0);
        mockBillsService.sumByMonthYear.mockResolvedValue(0);
        mockBillsService.countByStatus.mockResolvedValue({
          pending: 0,
          paid: 0,
          overdue: 0,
          canceled: 0,
        });
        mockVariableExpensesService.sumByMonthYear.mockResolvedValue(0);
        mockDebtsService.getSummary.mockResolvedValue(
          createMockDebtSummary({ monthlyInstallmentSum: 0 })
        );
        mockInvestmentsService.getSummary.mockResolvedValue(
          createMockInvestmentSummary()
        );

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
