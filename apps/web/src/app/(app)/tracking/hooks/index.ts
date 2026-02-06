/**
 * Tracking Hooks
 *
 * @see docs/milestones/phase-2-tracker.md M2.1 for Tracking implementation
 */

// Tracking entries hooks
export {
  useTrackingEntries,
  useTrackingEntriesFlat,
  useCreateTrackingEntry,
  useUpdateTrackingEntry,
  useDeleteTrackingEntry,
  useTrackingAggregation,
} from './use-tracking';

// Habits hooks
export {
  useHabits,
  useCreateHabit,
  useUpdateHabit,
  useDeleteHabit,
  useCompleteHabit,
  useUncompleteHabit,
  useHabitsByStreak,
  useHabitCompletions,
} from './use-habits';

// Calendar hooks
export {
  useCalendarMonth,
  useCalendarMonthData,
  useDayDetail,
  useDayDetailData,
} from './use-calendar';

// Navigation hooks
export { useSwipeNavigation } from './use-swipe-navigation';

// Custom Metrics hooks
export {
  useCustomMetrics,
  useCreateCustomMetric,
  useUpdateCustomMetric,
  useDeleteCustomMetric,
} from './use-custom-metrics';
