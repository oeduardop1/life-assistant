'use client';

import { useMemo } from 'react';
import { useTrackingAggregation } from './use-tracking';
import type { TrackingType } from '../types';

export interface ConsistencyData {
  type: TrackingType;
  percentage: number;
  daysWithData: number;
  totalDays: number;
}

interface UseTrackingConsistencyParams {
  startDate: string;
  endDate: string;
}

interface UseTrackingConsistencyResult {
  data: ConsistencyData[];
  isLoading: boolean;
}

/**
 * Hook to calculate tracking consistency (% of days with data) for each metric type
 *
 * @see docs/specs/domains/tracking.md §3.5 for consistency visualization
 */
export function useTrackingConsistency({
  startDate,
  endDate,
}: UseTrackingConsistencyParams): UseTrackingConsistencyResult {
  // Calculate total days in the period
  const totalDays = useMemo(() => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    return (
      Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
    );
  }, [startDate, endDate]);

  // Fetch aggregations for each type
  // Note: count in aggregation represents number of entries, not unique days
  // For a more accurate count, we would need a dedicated API endpoint
  // For now, we use count as an approximation (assuming 1 entry per day)
  const weightQuery = useTrackingAggregation({ type: 'weight', startDate, endDate });
  const waterQuery = useTrackingAggregation({ type: 'water', startDate, endDate });
  const sleepQuery = useTrackingAggregation({ type: 'sleep', startDate, endDate });
  const exerciseQuery = useTrackingAggregation({ type: 'exercise', startDate, endDate });
  const moodQuery = useTrackingAggregation({ type: 'mood', startDate, endDate });
  const energyQuery = useTrackingAggregation({ type: 'energy', startDate, endDate });

  const isLoading =
    weightQuery.isLoading ||
    waterQuery.isLoading ||
    sleepQuery.isLoading ||
    exerciseQuery.isLoading ||
    moodQuery.isLoading ||
    energyQuery.isLoading;

  const data: ConsistencyData[] = useMemo(() => {
    const queriesData = [
      { type: 'weight' as TrackingType, count: weightQuery.data?.count ?? 0 },
      { type: 'water' as TrackingType, count: waterQuery.data?.count ?? 0 },
      { type: 'sleep' as TrackingType, count: sleepQuery.data?.count ?? 0 },
      { type: 'exercise' as TrackingType, count: exerciseQuery.data?.count ?? 0 },
      { type: 'mood' as TrackingType, count: moodQuery.data?.count ?? 0 },
      { type: 'energy' as TrackingType, count: energyQuery.data?.count ?? 0 },
    ];

    return queriesData.map(({ type, count }) => {
      // Cap at totalDays to handle multiple entries per day
      const daysWithData = Math.min(count, totalDays);
      return {
        type,
        daysWithData,
        totalDays,
        percentage: Math.round((daysWithData / totalDays) * 100),
      };
    });
  }, [
    totalDays,
    weightQuery.data?.count,
    waterQuery.data?.count,
    sleepQuery.data?.count,
    exerciseQuery.data?.count,
    moodQuery.data?.count,
    energyQuery.data?.count,
  ]);

  return { data, isLoading };
}
