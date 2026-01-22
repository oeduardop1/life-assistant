import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  formatCurrency,
  formatPercentage,
  getCurrentMonth,
  formatMonthDisplay,
  getPreviousMonth,
  getNextMonth,
  isOverdue,
  getBalanceColor,
} from '../types';

describe('Finance Type Helpers', () => {
  describe('formatCurrency', () => {
    // Note: Intl.NumberFormat uses non-breaking space (\u00A0) between symbol and number
    it('should_format_positive_value_as_BRL', () => {
      expect(formatCurrency(1000)).toBe('R$\u00A01.000,00');
    });

    it('should_format_negative_value_as_BRL', () => {
      expect(formatCurrency(-500)).toBe('-R$\u00A0500,00');
    });

    it('should_format_decimal_value', () => {
      expect(formatCurrency(1234.56)).toBe('R$\u00A01.234,56');
    });

    it('should_format_zero', () => {
      expect(formatCurrency(0)).toBe('R$\u00A00,00');
    });
  });

  describe('formatPercentage', () => {
    it('should_format_percentage_with_one_decimal', () => {
      expect(formatPercentage(75.5)).toBe('75.5%');
    });

    it('should_round_percentage', () => {
      expect(formatPercentage(33.333)).toBe('33.3%');
    });
  });

  describe('getCurrentMonth', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-01-15T12:00:00Z'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should_return_current_month_in_YYYY-MM_format', () => {
      expect(getCurrentMonth()).toBe('2026-01');
    });
  });

  describe('formatMonthDisplay', () => {
    it('should_format_january', () => {
      expect(formatMonthDisplay('2026-01')).toBe('Janeiro 2026');
    });

    it('should_format_december', () => {
      expect(formatMonthDisplay('2025-12')).toBe('Dezembro 2025');
    });

    it('should_format_june', () => {
      expect(formatMonthDisplay('2025-06')).toBe('Junho 2025');
    });
  });

  describe('getPreviousMonth', () => {
    it('should_return_previous_month', () => {
      expect(getPreviousMonth('2026-01')).toBe('2025-12');
    });

    it('should_handle_mid_year', () => {
      expect(getPreviousMonth('2026-06')).toBe('2026-05');
    });
  });

  describe('getNextMonth', () => {
    it('should_return_next_month', () => {
      expect(getNextMonth('2025-12')).toBe('2026-01');
    });

    it('should_handle_mid_year', () => {
      expect(getNextMonth('2026-05')).toBe('2026-06');
    });
  });

  describe('isOverdue', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-01-15T12:00:00Z'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should_return_true_for_past_date', () => {
      expect(isOverdue('2026-01-10')).toBe(true);
    });

    it('should_return_false_for_future_date', () => {
      expect(isOverdue('2026-01-20')).toBe(false);
    });

    it('should_return_false_for_today', () => {
      expect(isOverdue('2026-01-15')).toBe(false);
    });
  });

  describe('getBalanceColor', () => {
    it('should_return_green_for_positive_balance', () => {
      expect(getBalanceColor(100)).toBe('green');
    });

    it('should_return_green_for_zero_balance', () => {
      expect(getBalanceColor(0)).toBe('green');
    });

    it('should_return_red_for_negative_balance', () => {
      expect(getBalanceColor(-100)).toBe('red');
    });
  });
});
