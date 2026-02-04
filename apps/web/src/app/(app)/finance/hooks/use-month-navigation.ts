'use client';

import { useState, useCallback } from 'react';
import {
  getCurrentMonthInTimezone,
  getPreviousMonth,
  getNextMonth,
  formatMonthDisplay,
} from '../types';
import { useUserTimezone } from '@/hooks/use-user-timezone';

/**
 * Hook for month navigation in Finance module
 *
 * Manages current month state and provides navigation functions.
 * @see docs/milestones/phase-2-tracker.md M2.2
 */
export function useMonthNavigation(initialMonth?: string) {
  const timezone = useUserTimezone();
  const [currentMonth, setCurrentMonth] = useState(
    () => initialMonth ?? getCurrentMonthInTimezone(timezone)
  );

  const goToPrevMonth = useCallback(() => {
    setCurrentMonth((prev) => getPreviousMonth(prev));
  }, []);

  const goToNextMonth = useCallback(() => {
    setCurrentMonth((prev) => getNextMonth(prev));
  }, []);

  const goToMonth = useCallback((monthYear: string) => {
    setCurrentMonth(monthYear);
  }, []);

  const goToCurrentMonth = useCallback(() => {
    setCurrentMonth(getCurrentMonthInTimezone(timezone));
  }, [timezone]);

  const formattedMonth = formatMonthDisplay(currentMonth);

  const isCurrentMonth = currentMonth === getCurrentMonthInTimezone(timezone);

  return {
    currentMonth,
    formattedMonth,
    isCurrentMonth,
    goToPrevMonth,
    goToNextMonth,
    goToMonth,
    goToCurrentMonth,
    setCurrentMonth,
  };
}
