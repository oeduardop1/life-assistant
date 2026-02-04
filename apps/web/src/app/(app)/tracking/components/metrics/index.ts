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

// New unified metrics page components (redesign)
export {
  MetricSelector,
  metricColors,
  TRACKING_TYPES,
  type MetricSelection,
  parseMetricSelection,
} from './metric-selector';
export { MetricDetailPanel } from './metric-detail-panel';
export { InsightsPlaceholder } from './insights-placeholder';
export { GroupedTimeline } from './grouped-timeline';
