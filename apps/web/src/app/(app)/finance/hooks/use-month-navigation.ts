'use client';

import { useState, useCallback } from 'react';
import {
  getCurrentMonth,
  getPreviousMonth,
  getNextMonth,
  formatMonthDisplay,
} from '../types';

/**
 * Hook for month navigation in Finance module
 *
 * Manages current month state and provides navigation functions.
 * @see docs/milestones/phase-2-tracker.md M2.2
 */
export function useMonthNavigation(initialMonth?: string) {
  const [currentMonth, setCurrentMonth] = useState(
    initialMonth ?? getCurrentMonth()
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
    setCurrentMonth(getCurrentMonth());
  }, []);

  const formattedMonth = formatMonthDisplay(currentMonth);

  const isCurrentMonth = currentMonth === getCurrentMonth();

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
