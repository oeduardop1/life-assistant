import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getTodayInTimezone,
  getCurrentMonthInTimezone,
  isTodayInTimezone,
  isCurrentMonthInTimezone,
  formatDateISO,
  getDayOfWeekInTimezone,
  getDaysUntilDue,
  getDaysUntilDueDay,
  isOverdueInTimezone,
  getDateDaysAgo,
  getPreviousMonth,
  getNextMonth,
  getDaysInMonth,
  getFirstDayOfMonth,
  formatMonthDisplay,
  formatDateDisplay,
  formatDateShort,
  formatDateMonthDay,
  getDateRange,
  getDatesInMonth,
  isValidTimezone,
} from './timezone';

describe('timezone utilities', () => {
  describe('getTodayInTimezone', () => {
    it('returns date in YYYY-MM-DD format', () => {
      const result = getTodayInTimezone('America/Sao_Paulo');
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('returns different dates for different timezones at edge times', () => {
      // Mock time to be 01:00 UTC (22:00 previous day in São Paulo)
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-02-04T01:00:00Z'));

      const saoPaulo = getTodayInTimezone('America/Sao_Paulo');
      const utc = getTodayInTimezone('UTC');

      expect(saoPaulo).toBe('2026-02-03'); // Still Feb 3 in SP
      expect(utc).toBe('2026-02-04'); // Already Feb 4 in UTC

      vi.useRealTimers();
    });
  });

  describe('getCurrentMonthInTimezone', () => {
    it('returns month in YYYY-MM format', () => {
      const result = getCurrentMonthInTimezone('America/Sao_Paulo');
      expect(result).toMatch(/^\d{4}-\d{2}$/);
    });

    it('handles month boundary at timezone edge', () => {
      vi.useFakeTimers();
      // 01:00 UTC on Feb 1 = 22:00 Jan 31 in São Paulo
      vi.setSystemTime(new Date('2026-02-01T01:00:00Z'));

      const saoPaulo = getCurrentMonthInTimezone('America/Sao_Paulo');
      const utc = getCurrentMonthInTimezone('UTC');

      expect(saoPaulo).toBe('2026-01'); // Still January in SP
      expect(utc).toBe('2026-02'); // Already February in UTC

      vi.useRealTimers();
    });
  });

  describe('isTodayInTimezone', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-02-03T12:00:00Z'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('returns true for today', () => {
      expect(isTodayInTimezone('2026-02-03', 'UTC')).toBe(true);
    });

    it('returns false for yesterday', () => {
      expect(isTodayInTimezone('2026-02-02', 'UTC')).toBe(false);
    });

    it('returns false for tomorrow', () => {
      expect(isTodayInTimezone('2026-02-04', 'UTC')).toBe(false);
    });
  });

  describe('isCurrentMonthInTimezone', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-02-15T12:00:00Z'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('returns true for date in current month', () => {
      expect(isCurrentMonthInTimezone('2026-02-03', 'UTC')).toBe(true);
      expect(isCurrentMonthInTimezone('2026-02-28', 'UTC')).toBe(true);
    });

    it('returns false for date in different month', () => {
      expect(isCurrentMonthInTimezone('2026-01-15', 'UTC')).toBe(false);
      expect(isCurrentMonthInTimezone('2026-03-01', 'UTC')).toBe(false);
    });
  });

  describe('formatDateISO', () => {
    it('formats date to YYYY-MM-DD in timezone', () => {
      const date = new Date('2026-02-03T01:00:00Z');

      // In UTC, this is Feb 3
      expect(formatDateISO(date, 'UTC')).toBe('2026-02-03');

      // In São Paulo (UTC-3), this is Feb 2 at 22:00
      expect(formatDateISO(date, 'America/Sao_Paulo')).toBe('2026-02-02');
    });
  });

  describe('getDayOfWeekInTimezone', () => {
    it('returns correct day of week accounting for timezone', () => {
      // 01:00 UTC on Tuesday Feb 3 = 22:00 Monday Feb 2 in São Paulo
      const date = new Date('2026-02-03T01:00:00Z');

      expect(getDayOfWeekInTimezone(date, 'UTC')).toBe(2); // Tuesday
      expect(getDayOfWeekInTimezone(date, 'America/Sao_Paulo')).toBe(1); // Monday
    });
  });

  describe('getDaysUntilDue', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-02-03T12:00:00Z'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('returns 0 for today', () => {
      expect(getDaysUntilDue('2026-02-03', 'UTC')).toBe(0);
    });

    it('returns positive for future date', () => {
      expect(getDaysUntilDue('2026-02-05', 'UTC')).toBe(2);
      expect(getDaysUntilDue('2026-02-10', 'UTC')).toBe(7);
    });

    it('returns negative for past date (overdue)', () => {
      expect(getDaysUntilDue('2026-02-01', 'UTC')).toBe(-2);
      expect(getDaysUntilDue('2026-01-31', 'UTC')).toBe(-3);
    });
  });

  describe('getDaysUntilDueDay', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      // Feb 3, 2026 (Tuesday)
      vi.setSystemTime(new Date('2026-02-03T12:00:00Z'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('returns days until due day this month if not passed', () => {
      // Due day 10, today is 3 -> 7 days
      expect(getDaysUntilDueDay(10, 'UTC')).toBe(7);
    });

    it('returns 0 if due day is today', () => {
      expect(getDaysUntilDueDay(3, 'UTC')).toBe(0);
    });

    it('returns days until due day next month if passed', () => {
      // Due day 1, today is 3 -> March 1 = 26 days
      expect(getDaysUntilDueDay(1, 'UTC')).toBe(26);
    });

    it('handles months with fewer days', () => {
      // Due day 31, February only has 28 days -> due on Feb 28
      // Today is Feb 3 -> 25 days until Feb 28
      expect(getDaysUntilDueDay(31, 'UTC')).toBe(25);
    });
  });

  describe('isOverdueInTimezone', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-02-03T12:00:00Z'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('returns false for today', () => {
      expect(isOverdueInTimezone('2026-02-03', 'UTC')).toBe(false);
    });

    it('returns false for future date', () => {
      expect(isOverdueInTimezone('2026-02-04', 'UTC')).toBe(false);
    });

    it('returns true for past date', () => {
      expect(isOverdueInTimezone('2026-02-02', 'UTC')).toBe(true);
      expect(isOverdueInTimezone('2026-01-01', 'UTC')).toBe(true);
    });
  });

  describe('getDateDaysAgo', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-02-10T12:00:00Z'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('returns correct date for days ago', () => {
      expect(getDateDaysAgo(0, 'UTC')).toBe('2026-02-10');
      expect(getDateDaysAgo(7, 'UTC')).toBe('2026-02-03');
      expect(getDateDaysAgo(10, 'UTC')).toBe('2026-01-31');
    });
  });

  describe('getPreviousMonth', () => {
    it('returns previous month', () => {
      expect(getPreviousMonth('2026-02')).toBe('2026-01');
      expect(getPreviousMonth('2026-03')).toBe('2026-02');
    });

    it('handles year boundary', () => {
      expect(getPreviousMonth('2026-01')).toBe('2025-12');
    });
  });

  describe('getNextMonth', () => {
    it('returns next month', () => {
      expect(getNextMonth('2026-01')).toBe('2026-02');
      expect(getNextMonth('2026-02')).toBe('2026-03');
    });

    it('handles year boundary', () => {
      expect(getNextMonth('2025-12')).toBe('2026-01');
    });
  });

  describe('getDaysInMonth', () => {
    it('returns correct days for each month', () => {
      expect(getDaysInMonth(2026, 1)).toBe(31); // January
      expect(getDaysInMonth(2026, 2)).toBe(28); // February (non-leap)
      expect(getDaysInMonth(2024, 2)).toBe(29); // February (leap)
      expect(getDaysInMonth(2026, 4)).toBe(30); // April
    });
  });

  describe('getFirstDayOfMonth', () => {
    it('returns correct day of week', () => {
      // Feb 1, 2026 is a Sunday
      expect(getFirstDayOfMonth(2026, 2)).toBe(0);
      // Jan 1, 2026 is a Thursday
      expect(getFirstDayOfMonth(2026, 1)).toBe(4);
    });
  });

  describe('formatMonthDisplay', () => {
    it('formats month for display in Portuguese', () => {
      expect(formatMonthDisplay('2026-02')).toBe('fevereiro 2026');
      expect(formatMonthDisplay('2026-01')).toBe('janeiro 2026');
      expect(formatMonthDisplay('2026-12')).toBe('dezembro 2026');
    });
  });

  describe('formatDateDisplay', () => {
    it('formats date with day of week in Portuguese', () => {
      // Feb 3, 2026 is a Tuesday
      const result = formatDateDisplay('2026-02-03', 'UTC');
      expect(result).toBe('terça-feira, 3 de fevereiro');
    });
  });

  describe('formatDateShort', () => {
    it('formats date as DD/MM/YYYY', () => {
      expect(formatDateShort('2026-02-03')).toBe('03/02/2026');
      expect(formatDateShort('2026-12-25')).toBe('25/12/2026');
    });
  });

  describe('formatDateMonthDay', () => {
    it('formats date as day of month', () => {
      // Note: month abbreviation may or may not have period depending on locale version
      expect(formatDateMonthDay('2026-02-03')).toMatch(/^3 de fev\.?$/);
      expect(formatDateMonthDay('2026-12-25')).toMatch(/^25 de dez\.?$/);
    });
  });

  describe('getDateRange', () => {
    it('returns array of dates between start and end', () => {
      const range = getDateRange('2026-02-01', '2026-02-05');
      expect(range).toEqual([
        '2026-02-01',
        '2026-02-02',
        '2026-02-03',
        '2026-02-04',
        '2026-02-05',
      ]);
    });

    it('handles single day range', () => {
      const range = getDateRange('2026-02-03', '2026-02-03');
      expect(range).toEqual(['2026-02-03']);
    });

    it('handles month boundary', () => {
      const range = getDateRange('2026-01-30', '2026-02-02');
      expect(range).toEqual([
        '2026-01-30',
        '2026-01-31',
        '2026-02-01',
        '2026-02-02',
      ]);
    });
  });

  describe('getDatesInMonth', () => {
    it('returns all dates in a month', () => {
      const dates = getDatesInMonth('2026-02');
      expect(dates.length).toBe(28);
      expect(dates[0]).toBe('2026-02-01');
      expect(dates[27]).toBe('2026-02-28');
    });

    it('handles months with 31 days', () => {
      const dates = getDatesInMonth('2026-01');
      expect(dates.length).toBe(31);
      expect(dates[30]).toBe('2026-01-31');
    });
  });

  describe('isValidTimezone', () => {
    it('returns true for valid IANA timezones', () => {
      expect(isValidTimezone('America/Sao_Paulo')).toBe(true);
      expect(isValidTimezone('UTC')).toBe(true);
      expect(isValidTimezone('Europe/London')).toBe(true);
      expect(isValidTimezone('Asia/Tokyo')).toBe(true);
    });

    it('returns false for invalid timezones', () => {
      expect(isValidTimezone('Invalid/Timezone')).toBe(false);
      expect(isValidTimezone('GMT-3')).toBe(false);
      expect(isValidTimezone('')).toBe(false);
      expect(isValidTimezone('SP')).toBe(false);
    });
  });
});
