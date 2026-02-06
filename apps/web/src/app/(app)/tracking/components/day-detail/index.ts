/**
 * Day Detail Components
 *
 * Journal-style components for the day detail modal.
 * @see docs/specs/domains/tracking.md §3.3 for day detail view
 */

// Main modal
export { DayDetailModal } from './day-detail-modal';

// Section components
export { HabitsSection } from './habits-section';
export { MetricsSection } from './metrics-section';

// New journal-style components
export { DateHeader } from './date-header';
export { HabitProgressDots } from './habit-progress-dots';
export { JournalCheckbox } from './journal-checkbox';
export { MetricBar, WaterBar, SleepBar } from './metric-bar';

// Individual components
export { HabitCheckbox } from './habit-checkbox';
export { StreakBadge } from './streak-badge';

// Animation utilities
export * from './animations';
