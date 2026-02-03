'use client';

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';
import {
  getCurrentMonth,
  getPreviousMonth,
  getNextMonth,
  parseMonthYear,
} from '../types';

/**
 * Tracking context value
 */
interface TrackingContextValue {
  /** Current month in YYYY-MM format */
  currentMonth: string;
  /** Parsed year from current month */
  year: number;
  /** Parsed month from current month (1-12) */
  month: number;
  /** Set the current month */
  setMonth: (monthYear: string) => void;
  /** Go to previous month */
  goToPreviousMonth: () => void;
  /** Go to next month */
  goToNextMonth: () => void;
  /** Go to today's month */
  goToToday: () => void;
  /** Selected date for day detail (YYYY-MM-DD or null) */
  selectedDate: string | null;
  /** Set selected date */
  setSelectedDate: (date: string | null) => void;
  /** Clear selected date */
  clearSelectedDate: () => void;
}

const TrackingContext = createContext<TrackingContextValue | null>(null);

/**
 * TrackingProvider - Provides month navigation and selected date state
 *
 * @see docs/specs/domains/tracking.md §3 for UI structure
 */
export function TrackingProvider({ children }: { children: ReactNode }) {
  const [currentMonth, setCurrentMonth] = useState(getCurrentMonth);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const { year, month } = useMemo(() => parseMonthYear(currentMonth), [currentMonth]);

  const setMonth = useCallback((monthYear: string) => {
    setCurrentMonth(monthYear);
  }, []);

  const goToPreviousMonth = useCallback(() => {
    setCurrentMonth((prev) => getPreviousMonth(prev));
  }, []);

  const goToNextMonth = useCallback(() => {
    setCurrentMonth((prev) => getNextMonth(prev));
  }, []);

  const goToToday = useCallback(() => {
    setCurrentMonth(getCurrentMonth());
  }, []);

  const clearSelectedDate = useCallback(() => {
    setSelectedDate(null);
  }, []);

  const value = useMemo<TrackingContextValue>(
    () => ({
      currentMonth,
      year,
      month,
      setMonth,
      goToPreviousMonth,
      goToNextMonth,
      goToToday,
      selectedDate,
      setSelectedDate,
      clearSelectedDate,
    }),
    [
      currentMonth,
      year,
      month,
      setMonth,
      goToPreviousMonth,
      goToNextMonth,
      goToToday,
      selectedDate,
      clearSelectedDate,
    ]
  );

  return (
    <TrackingContext.Provider value={value}>{children}</TrackingContext.Provider>
  );
}

/**
 * useTracking - Hook to access tracking context
 */
export function useTracking(): TrackingContextValue {
  const context = useContext(TrackingContext);
  if (!context) {
    throw new Error('useTracking must be used within a TrackingProvider');
  }
  return context;
}
