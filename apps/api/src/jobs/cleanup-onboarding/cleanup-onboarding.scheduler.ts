import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { AppLoggerService } from '../../logger/logger.service';
import { QUEUES } from '../jobs.module';

/**
 * Days after which abandoned onboarding users are cleaned up
 */
const CLEANUP_THRESHOLD_DAYS = 30;

/**
 * Cron expression for 03:00 UTC daily
 */
const CLEANUP_CRON = '0 3 * * *';

/**
 * Job scheduler name for the cleanup job
 */
const CLEANUP_SCHEDULER_NAME = 'cleanup-onboarding-daily';

/**
 * CleanupOnboardingScheduler - Schedules daily cleanup of abandoned onboardings
 *
 * Per SYSTEM_SPECS.md §3.1:
 * - Users who don't complete onboarding within 30 days are removed
 * - Job runs daily at 03:00 UTC
 */
@Injectable()
export class CleanupOnboardingScheduler implements OnModuleInit {
  constructor(
    @InjectQueue(QUEUES.CLEANUP_ONBOARDING)
    private readonly cleanupQueue: Queue,
    private readonly logger: AppLoggerService,
  ) {
    this.logger.setContext(CleanupOnboardingScheduler.name);
  }

  async onModuleInit() {
    await this.setupScheduledJob();
  }

  /**
   * Setup the repeatable job for daily cleanup using job schedulers (BullMQ v5+)
   */
  private async setupScheduledJob() {
    // Calculate threshold date (30 days ago)
    const getThresholdDate = () => {
      const date = new Date();
      date.setDate(date.getDate() - CLEANUP_THRESHOLD_DAYS);
      return date.toISOString();
    };

    // Use upsertJobScheduler to create or update the scheduled job
    // This is idempotent and won't create duplicates
    await this.cleanupQueue.upsertJobScheduler(
      CLEANUP_SCHEDULER_NAME,
      {
        pattern: CLEANUP_CRON,
        tz: 'UTC',
      },
      {
        name: 'cleanup-abandoned',
        data: {
          threshold: getThresholdDate(),
          dryRun: false,
        },
      },
    );

    this.logger.log(`Scheduled daily cleanup job at ${CLEANUP_CRON} UTC`);
  }

  /**
   * Manually trigger a cleanup job (useful for testing)
   */
  async triggerCleanup(dryRun = false): Promise<string> {
    const threshold = new Date();
    threshold.setDate(threshold.getDate() - CLEANUP_THRESHOLD_DAYS);
    const timestamp = Date.now();

    const job = await this.cleanupQueue.add(
      'cleanup-abandoned-manual',
      {
        threshold: threshold.toISOString(),
        dryRun,
      },
      {
        jobId: `cleanup-onboarding:manual:${String(timestamp)}`,
      },
    );

    this.logger.log(`Manual cleanup job triggered`, { jobId: job.id, dryRun });
    return job.id ?? 'unknown';
  }
}
