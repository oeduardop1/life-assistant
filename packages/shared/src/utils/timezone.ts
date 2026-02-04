/**
 * Timezone utilities for consistent date handling across the application.
 *
 * Design principles:
 * - entryDate (DATE) = User's local date at time of entry
 * - createdAt/entryTime (TIMESTAMPTZ) = UTC
 * - "Today" = Current date in user's timezone
 *
 * @see docs/specs/core/data-conventions.md §6.3
 */

import { format, parse, addMonths, subMonths, getDaysInMonth as dateFnsGetDaysInMonth, getDay } from 'date-fns';
import { toZonedTime, formatInTimeZone } from 'date-fns-tz';
import { ptBR } from 'date-fns/locale';

// ============================================================================
// TIMEZONE-AWARE FUNCTIONS (require user's timezone)
// ============================================================================

/**
 * Get current date string (YYYY-MM-DD) in user's timezone.
 * Use this instead of `new Date().toISOString().slice(0, 10)`.
 *
 * @example
 * // At 22:00 in São Paulo (01:00 UTC next day)
 * getTodayInTimezone('America/Sao_Paulo') // Returns '2026-02-03'
 * new Date().toISOString().slice(0, 10)   // Returns '2026-02-04' (WRONG!)
 */
export function getTodayInTimezone(timezone: string): string {
  const now = new Date();
  const zonedDate = toZonedTime(now, timezone);
  return format(zonedDate, 'yyyy-MM-dd');
}

/**
 * Get current month string (YYYY-MM) in user's timezone.
 * Use this instead of `new Date().toISOString().slice(0, 7)`.
 */
export function getCurrentMonthInTimezone(timezone: string): string {
  const now = new Date();
  const zonedDate = toZonedTime(now, timezone);
  return format(zonedDate, 'yyyy-MM');
}

/**
 * Check if a date string is "today" in user's timezone.
 */
export function isTodayInTimezone(dateStr: string, timezone: string): boolean {
  return dateStr === getTodayInTimezone(timezone);
}

/**
 * Check if a date string is in the current month in user's timezone.
 */
export function isCurrentMonthInTimezone(dateStr: string, timezone: string): boolean {
  const currentMonth = getCurrentMonthInTimezone(timezone);
  return dateStr.startsWith(currentMonth);
}

/**
 * Format a Date object to YYYY-MM-DD in user's timezone.
 * Useful when converting timestamps to local dates.
 */
export function formatDateISO(date: Date, timezone: string): string {
  const zonedDate = toZonedTime(date, timezone);
  return format(zonedDate, 'yyyy-MM-dd');
}

/**
 * Get the day of week (0-6, Sunday-Saturday) for a date in user's timezone.
 * Use this instead of `date.getDay()` which returns UTC day.
 */
export function getDayOfWeekInTimezone(date: Date, timezone: string): number {
  const zonedDate = toZonedTime(date, timezone);
  return getDay(zonedDate);
}

/**
 * Get "now" as a Date in user's timezone.
 * Note: Returns a Date object that represents the current moment,
 * but when you extract year/month/day it will be in the user's timezone.
 */
export function getNowInTimezone(timezone: string): Date {
  return toZonedTime(new Date(), timezone);
}

/**
 * Calculate days until a due date from today in user's timezone.
 * Consolidates 6+ duplicate implementations across the codebase.
 *
 * @param dueDate - The due date in YYYY-MM-DD format
 * @param timezone - User's timezone
 * @returns Number of days until due (negative if overdue)
 */
export function getDaysUntilDue(dueDate: string, timezone: string): number {
  const today = getTodayInTimezone(timezone);
  const todayDate = parse(today, 'yyyy-MM-dd', new Date());
  const dueDateParsed = parse(dueDate, 'yyyy-MM-dd', new Date());

  const diffTime = dueDateParsed.getTime() - todayDate.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Calculate days until a bill is due, given due day of month.
 * If dueDay has passed this month, calculates for next month.
 *
 * @param dueDay - Day of month (1-31)
 * @param timezone - User's timezone
 * @returns Number of days until due
 */
export function getDaysUntilDueDay(dueDay: number, timezone: string): number {
  const now = getNowInTimezone(timezone);
  const currentDay = now.getDate();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  let targetDate: Date;

  if (dueDay >= currentDay) {
    // Due date is this month
    const daysInMonth = dateFnsGetDaysInMonth(now);
    const actualDueDay = Math.min(dueDay, daysInMonth);
    targetDate = new Date(currentYear, currentMonth, actualDueDay);
  } else {
    // Due date has passed, use next month
    const nextMonth = new Date(currentYear, currentMonth + 1, 1);
    const daysInNextMonth = dateFnsGetDaysInMonth(nextMonth);
    const actualDueDay = Math.min(dueDay, daysInNextMonth);
    targetDate = new Date(currentYear, currentMonth + 1, actualDueDay);
  }

  const todayStart = new Date(currentYear, currentMonth, currentDay);
  const diffTime = targetDate.getTime() - todayStart.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Check if a date is overdue (past) in user's timezone.
 */
export function isOverdueInTimezone(dueDate: string, timezone: string): boolean {
  return getDaysUntilDue(dueDate, timezone) < 0;
}

/**
 * Get start of a date range N days ago in user's timezone.
 *
 * @param daysAgo - Number of days to go back
 * @param timezone - User's timezone
 * @returns Date string in YYYY-MM-DD format
 */
export function getDateDaysAgo(daysAgo: number, timezone: string): string {
  const now = getNowInTimezone(timezone);
  const past = new Date(now);
  past.setDate(past.getDate() - daysAgo);
  return format(past, 'yyyy-MM-dd');
}

// ============================================================================
// PURE CALCULATION FUNCTIONS (no timezone needed)
// ============================================================================

/**
 * Parse a YYYY-MM string into year and month numbers.
 * Internal helper to handle TypeScript strict mode.
 */
function parseMonthYear(monthYear: string): { year: number; month: number } {
  const parts = monthYear.split('-');
  const year = Number(parts[0]);
  const month = Number(parts[1]);
  return { year, month };
}

/**
 * Get previous month string from a YYYY-MM string.
 * Pure string arithmetic, no timezone needed.
 */
export function getPreviousMonth(monthYear: string): string {
  const { year, month } = parseMonthYear(monthYear);
  const date = new Date(year, month - 1, 1);
  const prevDate = subMonths(date, 1);
  return format(prevDate, 'yyyy-MM');
}

/**
 * Get next month string from a YYYY-MM string.
 * Pure string arithmetic, no timezone needed.
 */
export function getNextMonth(monthYear: string): string {
  const { year, month } = parseMonthYear(monthYear);
  const date = new Date(year, month - 1, 1);
  const nextDate = addMonths(date, 1);
  return format(nextDate, 'yyyy-MM');
}

/**
 * Get number of days in a month.
 * Pure calculation, no timezone needed.
 */
export function getDaysInMonth(year: number, month: number): number {
  return dateFnsGetDaysInMonth(new Date(year, month - 1, 1));
}

/**
 * Get the day of week (0-6, Sunday-Saturday) for the first day of a month.
 * Pure calculation, no timezone needed.
 */
export function getFirstDayOfMonth(year: number, month: number): number {
  return getDay(new Date(year, month - 1, 1));
}

// ============================================================================
// DISPLAY FORMATTING FUNCTIONS
// ============================================================================

/**
 * Format a YYYY-MM string for display.
 * Example: "2026-02" -> "Fevereiro 2026"
 */
export function formatMonthDisplay(monthYear: string): string {
  const { year, month } = parseMonthYear(monthYear);
  const date = new Date(year, month - 1, 1);
  return format(date, 'MMMM yyyy', { locale: ptBR });
}

/**
 * Format a YYYY-MM-DD string for display with day of week.
 * Example: "2026-02-03" -> "Terça, 3 de Fevereiro"
 *
 * @param dateStr - Date in YYYY-MM-DD format
 * @param timezone - User's timezone (for determining day of week name)
 */
export function formatDateDisplay(dateStr: string, timezone: string): string {
  const date = parse(dateStr, 'yyyy-MM-dd', new Date());
  return formatInTimeZone(date, timezone, "EEEE, d 'de' MMMM", { locale: ptBR });
}

/**
 * Format a YYYY-MM-DD string for short display.
 * Example: "2026-02-03" -> "03/02/2026"
 */
export function formatDateShort(dateStr: string): string {
  const date = parse(dateStr, 'yyyy-MM-dd', new Date());
  return format(date, 'dd/MM/yyyy', { locale: ptBR });
}

/**
 * Format a YYYY-MM-DD string to show month and day.
 * Example: "2026-02-03" -> "3 de fev"
 */
export function formatDateMonthDay(dateStr: string): string {
  const date = parse(dateStr, 'yyyy-MM-dd', new Date());
  return format(date, "d 'de' MMM", { locale: ptBR });
}

// ============================================================================
// DATE RANGE UTILITIES
// ============================================================================

/**
 * Generate array of dates between start and end (inclusive).
 *
 * @param startDate - Start date in YYYY-MM-DD format
 * @param endDate - End date in YYYY-MM-DD format
 * @returns Array of date strings in YYYY-MM-DD format
 */
export function getDateRange(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  const start = parse(startDate, 'yyyy-MM-dd', new Date());
  const end = parse(endDate, 'yyyy-MM-dd', new Date());

  const current = new Date(start);
  while (current <= end) {
    dates.push(format(current, 'yyyy-MM-dd'));
    current.setDate(current.getDate() + 1);
  }

  return dates;
}

/**
 * Get all dates in a month.
 *
 * @param monthYear - Month in YYYY-MM format
 * @returns Array of date strings in YYYY-MM-DD format
 */
export function getDatesInMonth(monthYear: string): string[] {
  const { year, month } = parseMonthYear(monthYear);
  const daysInMonth = getDaysInMonth(year, month);

  const dates: string[] = [];
  for (let day = 1; day <= daysInMonth; day++) {
    dates.push(`${monthYear}-${String(day).padStart(2, '0')}`);
  }

  return dates;
}

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Validate an IANA timezone string.
 * Returns true if the timezone is valid, false otherwise.
 */
export function isValidTimezone(timezone: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}

/**
 * Common timezones for Brazil (for UI selection).
 */
export const BRAZIL_TIMEZONES = [
  { value: 'America/Sao_Paulo', label: 'Brasília (UTC-3)' },
  { value: 'America/Manaus', label: 'Manaus (UTC-4)' },
  { value: 'America/Rio_Branco', label: 'Rio Branco (UTC-5)' },
  { value: 'America/Noronha', label: 'Fernando de Noronha (UTC-2)' },
] as const;
