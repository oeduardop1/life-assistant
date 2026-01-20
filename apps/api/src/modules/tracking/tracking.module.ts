import { Module } from '@nestjs/common';
import { TrackingController } from './presentation/controllers/tracking.controller';
import { TrackingService } from './application/services/tracking.service';
import { TrackingToolExecutorService } from './application/services/tracking-tool-executor.service';
import { TrackingEntryRepository } from './infrastructure/repositories/tracking-entry.repository';
import { TRACKING_ENTRY_REPOSITORY } from './domain/ports';

/**
 * TrackingModule - Metric tracking with low friction philosophy
 *
 * Features:
 * - CRUD for tracking entries (weight, water, sleep, exercise, mood, energy, custom)
 * - Aggregations (average, sum, variation)
 * - Dashboard support with optional manual forms
 *
 * @see docs/milestones/phase-2-tracker.md M2.1 for implementation details
 * @see docs/specs/data-model.md §4.3 for tracking_entries entity
 * @see ADR-015 for Low Friction Tracking Philosophy
 */
@Module({
  controllers: [TrackingController],
  providers: [
    // Application Services
    TrackingService,
    TrackingToolExecutorService,

    // Repository implementations
    TrackingEntryRepository,

    // Bind interfaces to implementations
    {
      provide: TRACKING_ENTRY_REPOSITORY,
      useExisting: TrackingEntryRepository,
    },
  ],
  exports: [TrackingService, TrackingToolExecutorService],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class TrackingModule {}
