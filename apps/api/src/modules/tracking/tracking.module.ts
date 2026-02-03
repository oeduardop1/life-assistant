import { Module } from '@nestjs/common';
import { TrackingController } from './presentation/controllers/tracking.controller';
import { HabitsController } from './presentation/controllers/habits.controller';
import { TrackingService } from './application/services/tracking.service';
import { TrackingToolExecutorService } from './application/services/tracking-tool-executor.service';
import { HabitsService } from './application/services/habits.service';
import { CalendarService } from './application/services/calendar.service';
import { TrackingEntryRepository } from './infrastructure/repositories/tracking-entry.repository';
import { HabitsRepository } from './infrastructure/repositories/habits.repository';
import { TRACKING_ENTRY_REPOSITORY, HABITS_REPOSITORY } from './domain/ports';

/**
 * TrackingModule - Unified tracking for metrics and habits
 *
 * Features:
 * - CRUD for tracking entries (weight, water, sleep, exercise, mood, energy, custom)
 * - CRUD for habits with streak calculation
 * - Aggregations (average, sum, variation)
 * - Dashboard support with optional manual forms
 *
 * @see docs/milestones/phase-2-tracker.md M2.1 for implementation details
 * @see docs/specs/domains/tracking.md for unified tracking spec
 * @see ADR-015 for Low Friction Tracking Philosophy
 */
@Module({
  controllers: [TrackingController, HabitsController],
  providers: [
    // Application Services
    TrackingService,
    TrackingToolExecutorService,
    HabitsService,
    CalendarService,

    // Repository implementations
    TrackingEntryRepository,
    HabitsRepository,

    // Bind interfaces to implementations
    {
      provide: TRACKING_ENTRY_REPOSITORY,
      useExisting: TrackingEntryRepository,
    },
    {
      provide: HABITS_REPOSITORY,
      useExisting: HabitsRepository,
    },
  ],
  exports: [TrackingService, TrackingToolExecutorService, HabitsService, CalendarService],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class TrackingModule {}
