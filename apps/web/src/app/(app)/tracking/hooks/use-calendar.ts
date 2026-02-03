'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthenticatedApi } from '@/hooks/use-authenticated-api';
import type {
  CalendarMonthResponse,
  DayDetailResponse,
  CalendarDaySummary,
} from '../types';

// =============================================================================
// Query Keys
// =============================================================================

export const calendarKeys = {
  all: ['calendar'] as const,
  month: (year: number, month: number) =>
    [...calendarKeys.all, 'month', year, month] as const,
  day: (date: string) => [...calendarKeys.all, 'day', date] as const,
  metricsByDate: (date: string) =>
    [...calendarKeys.all, 'metrics', date] as const,
};

// =============================================================================
// Calendar Month
// =============================================================================

/**
 * Hook to fetch calendar month summary
 *
 * @param year - Year (e.g., 2026)
 * @param month - Month (1-12)
 */
export function useCalendarMonth(year: number, month: number) {
  const api = useAuthenticatedApi();

  return useQuery({
    queryKey: calendarKeys.month(year, month),
    queryFn: async () => {
      const response = await api.get<CalendarMonthResponse>(
        `/tracking/calendar/${year}/${month}`
      );
      return response;
    },
    enabled: api.isAuthenticated && year > 0 && month >= 1 && month <= 12,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Hook to get calendar month data with helper functions
 */
export function useCalendarMonthData(year: number, month: number) {
  const query = useCalendarMonth(year, month);

  // Create a map for quick day lookup
  const dayMap = new Map<string, CalendarDaySummary>();
  if (query.data?.days) {
    for (const day of query.data.days) {
      dayMap.set(day.date, day);
    }
  }

  /**
   * Get day summary for a specific date
   */
  const getDay = (date: string): CalendarDaySummary | undefined => {
    return dayMap.get(date);
  };

  /**
   * Check if a date has data
   */
  const hasDataForDate = (date: string): boolean => {
    return dayMap.get(date)?.hasData ?? false;
  };

  return {
    ...query,
    month: query.data?.month,
    days: query.data?.days ?? [],
    dayMap,
    getDay,
    hasDataForDate,
  };
}

// =============================================================================
// Day Detail
// =============================================================================

/**
 * Hook to fetch detailed data for a specific day
 *
 * @param date - Date in YYYY-MM-DD format
 */
export function useDayDetail(date: string | null) {
  const api = useAuthenticatedApi();

  return useQuery({
    queryKey: calendarKeys.day(date ?? ''),
    queryFn: async () => {
      const response = await api.get<DayDetailResponse>(
        `/tracking/day/${date}`
      );
      return response;
    },
    enabled: api.isAuthenticated && !!date,
    staleTime: 1 * 60 * 1000, // 1 minute
  });
}

/**
 * Hook to get day detail with parsed data
 */
export function useDayDetailData(date: string | null) {
  const query = useDayDetail(date);

  // Calculate completion stats
  const habitsTotal = query.data?.habits.length ?? 0;
  const habitsCompleted =
    query.data?.habits.filter((h) => h.completed).length ?? 0;
  const completionPercent =
    habitsTotal > 0 ? (habitsCompleted / habitsTotal) * 100 : 0;

  // Get mood from metrics
  const moodEntry = query.data?.metrics.find((m) => m.type === 'mood');
  const moodScore = moodEntry ? parseFloat(moodEntry.value) : undefined;

  // Get energy from metrics
  const energyEntry = query.data?.metrics.find((m) => m.type === 'energy');
  const energyScore = energyEntry ? parseFloat(energyEntry.value) : undefined;

  return {
    ...query,
    date: query.data?.date,
    metrics: query.data?.metrics ?? [],
    habits: query.data?.habits ?? [],
    habitsTotal,
    habitsCompleted,
    completionPercent,
    moodScore,
    energyScore,
  };
}

// =============================================================================
// Metrics by Date
// =============================================================================

/**
 * Hook to fetch metrics for a specific date
 *
 * @param date - Date in YYYY-MM-DD format
 */
export function useMetricsByDate(date: string | null) {
  const api = useAuthenticatedApi();

  return useQuery({
    queryKey: calendarKeys.metricsByDate(date ?? ''),
    queryFn: async () => {
      const response = await api.get<{ metrics: DayDetailResponse['metrics'] }>(
        `/tracking/by-date/${date}`
      );
      return response.metrics;
    },
    enabled: api.isAuthenticated && !!date,
    staleTime: 1 * 60 * 1000, // 1 minute
  });
}
