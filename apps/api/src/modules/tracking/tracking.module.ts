import { Module } from '@nestjs/common';
import { TrackingController } from './presentation/controllers/tracking.controller';
import { HabitsController } from './presentation/controllers/habits.controller';
import { CustomMetricController } from './presentation/controllers/custom-metric.controller';
import { TrackingService } from './application/services/tracking.service';
import { TrackingToolExecutorService } from './application/services/tracking-tool-executor.service';
import { HabitsService } from './application/services/habits.service';
import { CalendarService } from './application/services/calendar.service';
import { CustomMetricService } from './application/services/custom-metric.service';
import { TrackingEntryRepository } from './infrastructure/repositories/tracking-entry.repository';
import { HabitsRepository } from './infrastructure/repositories/habits.repository';
import { CustomMetricRepository } from './infrastructure/repositories/custom-metric.repository';
import { TRACKING_ENTRY_REPOSITORY, HABITS_REPOSITORY, CUSTOM_METRIC_REPOSITORY } from './domain/ports';

/**
 * TrackingModule - Unified tracking for metrics, habits, and custom metrics
 *
 * Features:
 * - CRUD for tracking entries (weight, water, sleep, exercise, mood, energy, custom)
 * - CRUD for habits with streak calculation
 * - CRUD for custom metric definitions
 * - Aggregations (average, sum, variation)
 * - Dashboard support with optional manual forms
 *
 * @see docs/milestones/phase-2-tracker.md M2.1 for implementation details
 * @see docs/specs/domains/tracking.md for unified tracking spec
 * @see ADR-015 for Low Friction Tracking Philosophy
 */
@Module({
  // Note: CustomMetricController must come before TrackingController
  // because TrackingController has a GET :id route that would capture "custom-metrics"
  controllers: [CustomMetricController, HabitsController, TrackingController],
  providers: [
    // Application Services
    TrackingService,
    TrackingToolExecutorService,
    HabitsService,
    CalendarService,
    CustomMetricService,

    // Repository implementations
    TrackingEntryRepository,
    HabitsRepository,
    CustomMetricRepository,

    // Bind interfaces to implementations
    {
      provide: TRACKING_ENTRY_REPOSITORY,
      useExisting: TrackingEntryRepository,
    },
    {
      provide: HABITS_REPOSITORY,
      useExisting: HabitsRepository,
    },
    {
      provide: CUSTOM_METRIC_REPOSITORY,
      useExisting: CustomMetricRepository,
    },
  ],
  exports: [TrackingService, TrackingToolExecutorService, HabitsService, CalendarService, CustomMetricService],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class TrackingModule {}
