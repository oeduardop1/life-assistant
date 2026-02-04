/**
 * Tracking Hooks
 *
 * @see docs/milestones/phase-2-tracker.md M2.1 for Tracking implementation
 */

// Tracking entries hooks
export {
  trackingKeys,
  useTrackingEntries,
  useTrackingEntriesFlat,
  useTrackingEntry,
  useCreateTrackingEntry,
  useUpdateTrackingEntry,
  useDeleteTrackingEntry,
  useTrackingAggregation,
  useTrackingStats,
  useHasTrackingData,
} from './use-tracking';

// Habits hooks
export {
  habitsKeys,
  useHabits,
  useHabit,
  useHabitStreaks,
  useCreateHabit,
  useUpdateHabit,
  useDeleteHabit,
  useCompleteHabit,
  useUncompleteHabit,
  useHasHabits,
  useHabitsByStreak,
} from './use-habits';

// Calendar hooks
export {
  calendarKeys,
  useCalendarMonth,
  useCalendarMonthData,
  useDayDetail,
  useDayDetailData,
  useMetricsByDate,
} from './use-calendar';

// Metrics page hooks
export {
  useTrackingConsistency,
  type ConsistencyData,
} from './use-tracking-consistency';

// Navigation hooks
export { useSwipeNavigation } from './use-swipe-navigation';

// Custom Metrics hooks
export {
  customMetricsKeys,
  useCustomMetrics,
  useCustomMetric,
  useCreateCustomMetric,
  useUpdateCustomMetric,
  useDeleteCustomMetric,
  useHasCustomMetrics,
  useCustomMetricOptions,
} from './use-custom-metrics';
