/**
 * Unit tests for Finance tool definitions
 * @see docs/specs/ai.md §6.2 for tool specifications
 * @see docs/milestones/phase-2-tracker.md M2.2
 */

import { describe, it, expect } from 'vitest';
import {
  getFinanceSummaryTool,
  getFinanceSummaryParamsSchema,
  getPendingBillsTool,
  getPendingBillsParamsSchema,
  getBillsTool,
  getBillsParamsSchema,
  getExpensesTool,
  getExpensesParamsSchema,
  getIncomesTool,
  getIncomesParamsSchema,
  getInvestmentsTool,
  getInvestmentsParamsSchema,
  markBillPaidTool,
  markBillPaidParamsSchema,
  createExpenseTool,
  createExpenseParamsSchema,
  getDebtProgressTool,
  getDebtProgressParamsSchema,
  getDebtPaymentHistoryTool,
  getDebtPaymentHistoryParamsSchema,
  getUpcomingInstallmentsTool,
  getUpcomingInstallmentsParamsSchema,
  financeTools,
  financeReadTools,
  financeWriteTools,
} from '../index.js';

describe('Finance Tool Definitions', () => {
  describe('get_finance_summary', () => {
    it('should have correct tool name', () => {
      expect(getFinanceSummaryTool.name).toBe('get_finance_summary');
    });

    it('should have a non-empty description', () => {
      expect(getFinanceSummaryTool.description).toBeTruthy();
      expect(getFinanceSummaryTool.description.length).toBeGreaterThan(10);
    });

    it('should not require confirmation (READ tool)', () => {
      expect(getFinanceSummaryTool.requiresConfirmation).toBe(false);
    });

    it('should have input examples', () => {
      expect(getFinanceSummaryTool.inputExamples).toBeDefined();
      expect(getFinanceSummaryTool.inputExamples?.length).toBeGreaterThan(0);
    });

    describe('parameter validation', () => {
      it('should accept valid period enum values', () => {
        expect(() => getFinanceSummaryParamsSchema.parse({ period: 'current_month' })).not.toThrow();
        expect(() => getFinanceSummaryParamsSchema.parse({ period: 'last_month' })).not.toThrow();
        expect(() => getFinanceSummaryParamsSchema.parse({ period: 'year' })).not.toThrow();
      });

      it('should default to current_month if period not provided', () => {
        const result = getFinanceSummaryParamsSchema.parse({});
        expect(result.period).toBe('current_month');
      });

      it('should reject invalid period values', () => {
        expect(() => getFinanceSummaryParamsSchema.parse({ period: 'invalid' })).toThrow();
      });
    });
  });

  describe('get_pending_bills', () => {
    it('should have correct tool name', () => {
      expect(getPendingBillsTool.name).toBe('get_pending_bills');
    });

    it('should have a non-empty description', () => {
      expect(getPendingBillsTool.description).toBeTruthy();
      expect(getPendingBillsTool.description.length).toBeGreaterThan(10);
    });

    it('should not require confirmation (READ tool)', () => {
      expect(getPendingBillsTool.requiresConfirmation).toBe(false);
    });

    it('should have input examples', () => {
      expect(getPendingBillsTool.inputExamples).toBeDefined();
      expect(getPendingBillsTool.inputExamples?.length).toBeGreaterThan(0);
    });

    describe('parameter validation', () => {
      it('should accept empty object (defaults)', () => {
        expect(() => getPendingBillsParamsSchema.parse({})).not.toThrow();
      });

      it('should accept valid month (1-12)', () => {
        expect(() => getPendingBillsParamsSchema.parse({ month: 1 })).not.toThrow();
        expect(() => getPendingBillsParamsSchema.parse({ month: 12 })).not.toThrow();
      });

      it('should reject invalid month', () => {
        expect(() => getPendingBillsParamsSchema.parse({ month: 0 })).toThrow();
        expect(() => getPendingBillsParamsSchema.parse({ month: 13 })).toThrow();
      });

      it('should accept valid year', () => {
        expect(() => getPendingBillsParamsSchema.parse({ year: 2026 })).not.toThrow();
      });

      it('should reject year out of range', () => {
        expect(() => getPendingBillsParamsSchema.parse({ year: 2019 })).toThrow();
        expect(() => getPendingBillsParamsSchema.parse({ year: 2101 })).toThrow();
      });
    });
  });

  describe('get_bills', () => {
    it('should have correct tool name', () => {
      expect(getBillsTool.name).toBe('get_bills');
    });

    it('should have a non-empty description', () => {
      expect(getBillsTool.description).toBeTruthy();
      expect(getBillsTool.description.length).toBeGreaterThan(10);
    });

    it('should not require confirmation (READ tool)', () => {
      expect(getBillsTool.requiresConfirmation).toBe(false);
    });

    it('should have input examples', () => {
      expect(getBillsTool.inputExamples).toBeDefined();
      expect(getBillsTool.inputExamples?.length).toBeGreaterThan(0);
    });

    describe('parameter validation', () => {
      it('should accept empty object (defaults)', () => {
        expect(() => getBillsParamsSchema.parse({})).not.toThrow();
      });

      it('should default status to all', () => {
        const result = getBillsParamsSchema.parse({});
        expect(result.status).toBe('all');
      });

      it('should accept valid month (1-12)', () => {
        expect(() => getBillsParamsSchema.parse({ month: 1 })).not.toThrow();
        expect(() => getBillsParamsSchema.parse({ month: 12 })).not.toThrow();
      });

      it('should reject invalid month', () => {
        expect(() => getBillsParamsSchema.parse({ month: 0 })).toThrow();
        expect(() => getBillsParamsSchema.parse({ month: 13 })).toThrow();
      });

      it('should accept valid year', () => {
        expect(() => getBillsParamsSchema.parse({ year: 2026 })).not.toThrow();
      });

      it('should reject year out of range', () => {
        expect(() => getBillsParamsSchema.parse({ year: 2019 })).toThrow();
        expect(() => getBillsParamsSchema.parse({ year: 2101 })).toThrow();
      });

      it('should accept valid status values', () => {
        expect(() => getBillsParamsSchema.parse({ status: 'all' })).not.toThrow();
        expect(() => getBillsParamsSchema.parse({ status: 'pending' })).not.toThrow();
        expect(() => getBillsParamsSchema.parse({ status: 'paid' })).not.toThrow();
        expect(() => getBillsParamsSchema.parse({ status: 'overdue' })).not.toThrow();
      });

      it('should reject invalid status', () => {
        expect(() => getBillsParamsSchema.parse({ status: 'invalid' })).toThrow();
      });
    });
  });

  describe('get_expenses', () => {
    it('should have correct tool name', () => {
      expect(getExpensesTool.name).toBe('get_expenses');
    });

    it('should have a non-empty description', () => {
      expect(getExpensesTool.description).toBeTruthy();
      expect(getExpensesTool.description.length).toBeGreaterThan(10);
    });

    it('should not require confirmation (READ tool)', () => {
      expect(getExpensesTool.requiresConfirmation).toBe(false);
    });

    it('should have input examples', () => {
      expect(getExpensesTool.inputExamples).toBeDefined();
      expect(getExpensesTool.inputExamples?.length).toBeGreaterThan(0);
    });

    describe('parameter validation', () => {
      it('should accept empty object (defaults)', () => {
        expect(() => getExpensesParamsSchema.parse({})).not.toThrow();
      });

      it('should accept valid month (1-12)', () => {
        expect(() => getExpensesParamsSchema.parse({ month: 1 })).not.toThrow();
        expect(() => getExpensesParamsSchema.parse({ month: 12 })).not.toThrow();
      });

      it('should reject invalid month', () => {
        expect(() => getExpensesParamsSchema.parse({ month: 0 })).toThrow();
        expect(() => getExpensesParamsSchema.parse({ month: 13 })).toThrow();
      });

      it('should accept valid year', () => {
        expect(() => getExpensesParamsSchema.parse({ year: 2026 })).not.toThrow();
      });

      it('should reject year out of range', () => {
        expect(() => getExpensesParamsSchema.parse({ year: 2019 })).toThrow();
        expect(() => getExpensesParamsSchema.parse({ year: 2101 })).toThrow();
      });
    });
  });

  describe('get_incomes', () => {
    it('should have correct tool name', () => {
      expect(getIncomesTool.name).toBe('get_incomes');
    });

    it('should have a non-empty description', () => {
      expect(getIncomesTool.description).toBeTruthy();
      expect(getIncomesTool.description.length).toBeGreaterThan(10);
    });

    it('should not require confirmation (READ tool)', () => {
      expect(getIncomesTool.requiresConfirmation).toBe(false);
    });

    it('should have input examples', () => {
      expect(getIncomesTool.inputExamples).toBeDefined();
      expect(getIncomesTool.inputExamples?.length).toBeGreaterThan(0);
    });

    describe('parameter validation', () => {
      it('should accept empty object (defaults)', () => {
        expect(() => getIncomesParamsSchema.parse({})).not.toThrow();
      });

      it('should accept valid month (1-12)', () => {
        expect(() => getIncomesParamsSchema.parse({ month: 1 })).not.toThrow();
        expect(() => getIncomesParamsSchema.parse({ month: 12 })).not.toThrow();
      });

      it('should reject invalid month', () => {
        expect(() => getIncomesParamsSchema.parse({ month: 0 })).toThrow();
        expect(() => getIncomesParamsSchema.parse({ month: 13 })).toThrow();
      });

      it('should accept valid year', () => {
        expect(() => getIncomesParamsSchema.parse({ year: 2026 })).not.toThrow();
      });

      it('should reject year out of range', () => {
        expect(() => getIncomesParamsSchema.parse({ year: 2019 })).toThrow();
        expect(() => getIncomesParamsSchema.parse({ year: 2101 })).toThrow();
      });
    });
  });

  describe('get_investments', () => {
    it('should have correct tool name', () => {
      expect(getInvestmentsTool.name).toBe('get_investments');
    });

    it('should have a non-empty description', () => {
      expect(getInvestmentsTool.description).toBeTruthy();
      expect(getInvestmentsTool.description.length).toBeGreaterThan(10);
    });

    it('should not require confirmation (READ tool)', () => {
      expect(getInvestmentsTool.requiresConfirmation).toBe(false);
    });

    it('should have input examples', () => {
      expect(getInvestmentsTool.inputExamples).toBeDefined();
      expect(getInvestmentsTool.inputExamples?.length).toBeGreaterThan(0);
    });

    describe('parameter validation', () => {
      it('should accept empty object', () => {
        expect(() => getInvestmentsParamsSchema.parse({})).not.toThrow();
      });
    });
  });

  describe('mark_bill_paid', () => {
    it('should have correct tool name', () => {
      expect(markBillPaidTool.name).toBe('mark_bill_paid');
    });

    it('should have a non-empty description', () => {
      expect(markBillPaidTool.description).toBeTruthy();
      expect(markBillPaidTool.description.length).toBeGreaterThan(10);
    });

    it('should require confirmation (WRITE tool)', () => {
      expect(markBillPaidTool.requiresConfirmation).toBe(true);
    });

    it('should have input examples', () => {
      expect(markBillPaidTool.inputExamples).toBeDefined();
      expect(markBillPaidTool.inputExamples?.length).toBeGreaterThan(0);
    });

    describe('parameter validation', () => {
      const validUuid = '123e4567-e89b-12d3-a456-426614174000';

      it('should require billId as UUID', () => {
        expect(() => markBillPaidParamsSchema.parse({ billId: validUuid })).not.toThrow();
      });

      it('should reject non-UUID billId', () => {
        expect(() => markBillPaidParamsSchema.parse({ billId: 'not-a-uuid' })).toThrow();
      });

      it('should reject missing billId', () => {
        expect(() => markBillPaidParamsSchema.parse({})).toThrow();
      });

      it('should accept optional month and year', () => {
        expect(() =>
          markBillPaidParamsSchema.parse({ billId: validUuid, month: 1, year: 2026 })
        ).not.toThrow();
      });
    });
  });

  describe('create_expense', () => {
    it('should have correct tool name', () => {
      expect(createExpenseTool.name).toBe('create_expense');
    });

    it('should have a non-empty description', () => {
      expect(createExpenseTool.description).toBeTruthy();
      expect(createExpenseTool.description.length).toBeGreaterThan(10);
    });

    it('should require confirmation (WRITE tool)', () => {
      expect(createExpenseTool.requiresConfirmation).toBe(true);
    });

    it('should have input examples', () => {
      expect(createExpenseTool.inputExamples).toBeDefined();
      expect(createExpenseTool.inputExamples?.length).toBeGreaterThan(0);
    });

    describe('parameter validation', () => {
      it('should require name and category', () => {
        expect(() =>
          createExpenseParamsSchema.parse({ name: 'Mercado', category: 'alimentacao' })
        ).not.toThrow();
      });

      it('should reject empty name', () => {
        expect(() =>
          createExpenseParamsSchema.parse({ name: '', category: 'alimentacao' })
        ).toThrow();
      });

      it('should reject name over 100 characters', () => {
        expect(() =>
          createExpenseParamsSchema.parse({ name: 'a'.repeat(101), category: 'alimentacao' })
        ).toThrow();
      });

      it('should accept valid categories', () => {
        const validCategories = [
          'alimentacao',
          'transporte',
          'lazer',
          'saude',
          'educacao',
          'vestuario',
          'outros',
        ];
        validCategories.forEach((category) => {
          expect(() =>
            createExpenseParamsSchema.parse({ name: 'Test', category })
          ).not.toThrow();
        });
      });

      it('should reject invalid category', () => {
        expect(() =>
          createExpenseParamsSchema.parse({ name: 'Test', category: 'invalid' })
        ).toThrow();
      });

      it('should accept optional amounts as positive numbers', () => {
        expect(() =>
          createExpenseParamsSchema.parse({
            name: 'Test',
            category: 'outros',
            budgetedAmount: 100,
            actualAmount: 95.50,
          })
        ).not.toThrow();
      });

      it('should reject non-positive amounts', () => {
        expect(() =>
          createExpenseParamsSchema.parse({
            name: 'Test',
            category: 'outros',
            actualAmount: 0,
          })
        ).toThrow();
        expect(() =>
          createExpenseParamsSchema.parse({
            name: 'Test',
            category: 'outros',
            actualAmount: -10,
          })
        ).toThrow();
      });

      it('should default isRecurring to false', () => {
        const result = createExpenseParamsSchema.parse({ name: 'Test', category: 'outros' });
        expect(result.isRecurring).toBe(false);
      });
    });
  });

  describe('get_debt_progress', () => {
    it('should have correct tool name', () => {
      expect(getDebtProgressTool.name).toBe('get_debt_progress');
    });

    it('should have a non-empty description', () => {
      expect(getDebtProgressTool.description).toBeTruthy();
      expect(getDebtProgressTool.description.length).toBeGreaterThan(10);
    });

    it('should not require confirmation (READ tool)', () => {
      expect(getDebtProgressTool.requiresConfirmation).toBe(false);
    });

    it('should have input examples', () => {
      expect(getDebtProgressTool.inputExamples).toBeDefined();
      expect(getDebtProgressTool.inputExamples?.length).toBeGreaterThan(0);
    });

    describe('parameter validation', () => {
      const validUuid = '123e4567-e89b-12d3-a456-426614174000';

      it('should accept empty object (returns all debts)', () => {
        expect(() => getDebtProgressParamsSchema.parse({})).not.toThrow();
      });

      it('should accept valid UUID for specific debt', () => {
        expect(() => getDebtProgressParamsSchema.parse({ debtId: validUuid })).not.toThrow();
      });

      it('should reject non-UUID debtId', () => {
        expect(() => getDebtProgressParamsSchema.parse({ debtId: 'not-a-uuid' })).toThrow();
      });
    });
  });

  describe('get_debt_payment_history', () => {
    it('should have correct tool name', () => {
      expect(getDebtPaymentHistoryTool.name).toBe('get_debt_payment_history');
    });

    it('should have a non-empty description', () => {
      expect(getDebtPaymentHistoryTool.description).toBeTruthy();
      expect(getDebtPaymentHistoryTool.description.length).toBeGreaterThan(10);
    });

    it('should not require confirmation (READ tool)', () => {
      expect(getDebtPaymentHistoryTool.requiresConfirmation).toBe(false);
    });

    it('should have input examples', () => {
      expect(getDebtPaymentHistoryTool.inputExamples).toBeDefined();
      expect(getDebtPaymentHistoryTool.inputExamples?.length).toBeGreaterThan(0);
    });

    describe('parameter validation', () => {
      const validUuid = '123e4567-e89b-12d3-a456-426614174000';

      it('should require debtId as UUID', () => {
        expect(() => getDebtPaymentHistoryParamsSchema.parse({ debtId: validUuid })).not.toThrow();
      });

      it('should reject non-UUID debtId', () => {
        expect(() => getDebtPaymentHistoryParamsSchema.parse({ debtId: 'not-a-uuid' })).toThrow();
      });

      it('should reject missing debtId', () => {
        expect(() => getDebtPaymentHistoryParamsSchema.parse({})).toThrow();
      });

      it('should accept optional limit', () => {
        expect(() =>
          getDebtPaymentHistoryParamsSchema.parse({ debtId: validUuid, limit: 10 })
        ).not.toThrow();
      });

      it('should reject limit over 100', () => {
        expect(() =>
          getDebtPaymentHistoryParamsSchema.parse({ debtId: validUuid, limit: 101 })
        ).toThrow();
      });

      it('should reject limit under 1', () => {
        expect(() =>
          getDebtPaymentHistoryParamsSchema.parse({ debtId: validUuid, limit: 0 })
        ).toThrow();
      });
    });
  });

  describe('get_upcoming_installments', () => {
    it('should have correct tool name', () => {
      expect(getUpcomingInstallmentsTool.name).toBe('get_upcoming_installments');
    });

    it('should have a non-empty description', () => {
      expect(getUpcomingInstallmentsTool.description).toBeTruthy();
      expect(getUpcomingInstallmentsTool.description.length).toBeGreaterThan(10);
    });

    it('should not require confirmation (READ tool)', () => {
      expect(getUpcomingInstallmentsTool.requiresConfirmation).toBe(false);
    });

    it('should have input examples', () => {
      expect(getUpcomingInstallmentsTool.inputExamples).toBeDefined();
      expect(getUpcomingInstallmentsTool.inputExamples?.length).toBeGreaterThan(0);
    });

    describe('parameter validation', () => {
      it('should accept empty object (defaults to current month)', () => {
        expect(() => getUpcomingInstallmentsParamsSchema.parse({})).not.toThrow();
      });

      it('should accept valid monthYear format', () => {
        expect(() =>
          getUpcomingInstallmentsParamsSchema.parse({ monthYear: '2026-03' })
        ).not.toThrow();
        expect(() =>
          getUpcomingInstallmentsParamsSchema.parse({ monthYear: '2026-12' })
        ).not.toThrow();
      });

      it('should reject invalid monthYear format', () => {
        expect(() =>
          getUpcomingInstallmentsParamsSchema.parse({ monthYear: '2026-1' })
        ).toThrow();
        expect(() =>
          getUpcomingInstallmentsParamsSchema.parse({ monthYear: '2026-13' })
        ).toThrow();
        expect(() =>
          getUpcomingInstallmentsParamsSchema.parse({ monthYear: 'invalid' })
        ).toThrow();
      });
    });
  });

  describe('Tool arrays', () => {
    it('should have 11 total finance tools', () => {
      expect(financeTools.length).toBe(11);
    });

    it('should have 9 READ tools', () => {
      expect(financeReadTools.length).toBe(9);
      financeReadTools.forEach((tool) => {
        expect(tool.requiresConfirmation).toBe(false);
      });
    });

    it('should have 2 WRITE tools', () => {
      expect(financeWriteTools.length).toBe(2);
      financeWriteTools.forEach((tool) => {
        expect(tool.requiresConfirmation).toBe(true);
      });
    });

    it('should have correct tools in READ array', () => {
      const readToolNames = financeReadTools.map((t) => t.name);
      expect(readToolNames).toContain('get_finance_summary');
      expect(readToolNames).toContain('get_pending_bills');
      expect(readToolNames).toContain('get_bills');
      expect(readToolNames).toContain('get_expenses');
      expect(readToolNames).toContain('get_incomes');
      expect(readToolNames).toContain('get_investments');
      expect(readToolNames).toContain('get_debt_progress');
      expect(readToolNames).toContain('get_debt_payment_history');
      expect(readToolNames).toContain('get_upcoming_installments');
    });

    it('should have correct tools in WRITE array', () => {
      const writeToolNames = financeWriteTools.map((t) => t.name);
      expect(writeToolNames).toContain('mark_bill_paid');
      expect(writeToolNames).toContain('create_expense');
    });
  });
});
