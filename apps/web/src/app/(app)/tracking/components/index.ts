/**
 * Tracking Components
 *
 * @see docs/milestones/phase-2-tracker.md M2.1 for Tracking implementation
 */

export { ManualTrackForm } from './manual-track-form';
export { MetricCard, MetricCardsGrid } from './metric-card';
export { MetricChart, MetricChartsGrid } from './metric-chart';
export { MonthSelector } from './month-selector';

// Calendar components
export { CalendarMonth, CalendarHeader, DayCell } from './calendar';

// Day detail components
export {
  DayDetailModal,
  HabitsSection,
  MetricsSection,
  HabitCheckbox,
  StreakBadge,
} from './day-detail';

// Habit management components
export {
  HabitForm,
  HabitList,
  CreateHabitModal,
  EditHabitModal,
  DeleteHabitDialog,
} from './habits';

// Metrics page components
export {
  MetricsPageFilters,
  MetricsStatsTable,
  MetricsStatsTableSkeleton,
  MetricsConsistencyBars,
  MetricsConsistencyBarsSkeleton,
  MetricsTimeline,
  MetricsTimelineSkeleton,
  EditMetricModal,
  DeleteMetricDialog,
  type PeriodFilter,
  // Redesigned metrics components
  MetricSelector,
  MetricDetailPanel,
  InsightsPlaceholder,
  GroupedTimeline,
  metricColors,
  TRACKING_TYPES,
  // Custom metrics helpers
  type MetricSelection,
  parseMetricSelection,
} from './metrics';

// Custom metrics components
export {
  CustomMetricForm,
  CreateCustomMetricModal,
  EditCustomMetricModal,
  DeleteCustomMetricDialog,
  CustomMetricsManager,
} from './custom-metrics';
