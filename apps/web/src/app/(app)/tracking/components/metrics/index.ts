/**
 * Metrics Page Components
 *
 * @see docs/milestones/phase-2-tracker.md M2.1 for Tracking implementation
 * @see docs/specs/domains/tracking.md §3.5 for Aba Métricas specification
 */

export {
  MetricsPageFilters,
  type PeriodFilter,
} from './metrics-page-filters';
export {
  MetricsStatsTable,
  MetricsStatsTableSkeleton,
} from './metrics-stats-table';
export {
  MetricsConsistencyBars,
  MetricsConsistencyBarsSkeleton,
} from './metrics-consistency-bars';
export {
  MetricsTimeline,
  MetricsTimelineSkeleton,
} from './metrics-timeline';
export { EditMetricModal } from './edit-metric-modal';
export { DeleteMetricDialog } from './delete-metric-dialog';
