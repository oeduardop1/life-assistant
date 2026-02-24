import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { eq } from '@life-assistant/database';
import { getTodayInTimezone } from '@life-assistant/shared';
import { AppConfigService } from '../../config/config.service';
import { DatabaseService } from '../../database/database.service';
import { AppLoggerService } from '../../logger/logger.service';
import { QUEUES } from '../queues';

/**
 * Cron expression for 3:00 AM (local time per timezone)
 */
const CONSOLIDATION_CRON = '0 3 * * *';

/**
 * MemoryConsolidationScheduler - Schedules daily consolidation at 3:00 AM per timezone
 *
 * Per docs/specs/ai.md §6.5:
 * - Runs at 3:00 AM user's local time
 * - Uses BullMQ timezone support for scheduling
 * - Creates one scheduler per unique timezone in the system
 *
 * @see docs/specs/engineering.md §7 for job patterns
 */
@Injectable()
export class MemoryConsolidationScheduler implements OnModuleInit {
  constructor(
    @InjectQueue(QUEUES.MEMORY_CONSOLIDATION)
    private readonly consolidationQueue: Queue,
    private readonly databaseService: DatabaseService,
    private readonly logger: AppLoggerService,
    private readonly appConfig: AppConfigService
  ) {
    this.logger.setContext(MemoryConsolidationScheduler.name);
  }

  async onModuleInit() {
    if (this.appConfig.usePythonAi) {
      this.logger.log('Memory consolidation: Python APScheduler (NestJS BullMQ skipped)');
      return;
    }
    this.logger.log('Memory consolidation: NestJS BullMQ');
    await this.setupScheduledJobs();
  }

  /**
   * Setup scheduled jobs for each unique timezone
   * Uses BullMQ's upsertJobScheduler with tz option for timezone-aware scheduling
   */
  private async setupScheduledJobs() {
    // Get unique timezones from active users
    const timezones = await this.getUniqueTimezones();

    if (timezones.length === 0) {
      this.logger.log('No active users found, skipping scheduler setup');
      return;
    }

    this.logger.log(`Setting up consolidation schedulers for ${String(timezones.length)} timezones`);

    // Create a scheduler for each timezone
    for (const timezone of timezones) {
      const schedulerName = `consolidation:${timezone}`;

      await this.consolidationQueue.upsertJobScheduler(
        schedulerName,
        {
          pattern: CONSOLIDATION_CRON,
          tz: timezone,
        },
        {
          name: 'consolidate-timezone',
          data: {
            timezone,
            date: getTodayInTimezone(timezone), // YYYY-MM-DD for deduplication
          },
        }
      );

      this.logger.debug(`Scheduled consolidation for timezone ${timezone} at ${CONSOLIDATION_CRON}`);
    }

    this.logger.log(
      `Memory consolidation scheduled for ${String(timezones.length)} timezones at ${CONSOLIDATION_CRON} local time`
    );
  }

  /**
   * Get unique timezones from active users
   */
  private async getUniqueTimezones(): Promise<string[]> {
    const { users } = this.databaseService.schema;

    const result = await this.databaseService.db
      .selectDistinct({ timezone: users.timezone })
      .from(users)
      .where(
        eq(users.status, 'active'),
      );

    // Return unique timezones (timezone is NOT NULL in schema)
    return result.map((r) => r.timezone);
  }

  /**
   * Manually trigger consolidation for a specific user
   * Useful for testing or on-demand consolidation
   */
  async triggerForUser(userId: string): Promise<string> {
    const timestamp = Date.now();

    const job = await this.consolidationQueue.add(
      'consolidate-user-manual',
      {
        userId,
        timezone: 'manual',
        date: getTodayInTimezone('America/Sao_Paulo'), // Default timezone for manual trigger
      },
      {
        jobId: `consolidation_${userId}_manual_${String(timestamp)}`,
      }
    );

    this.logger.log(`Manual consolidation triggered for user ${userId}`, { jobId: job.id });
    return job.id ?? 'unknown';
  }

  /**
   * Manually trigger consolidation for a timezone
   * Useful for testing or re-running failed jobs
   */
  async triggerForTimezone(timezone: string): Promise<string> {
    const timestamp = Date.now();

    const job = await this.consolidationQueue.add(
      'consolidate-timezone-manual',
      {
        timezone,
        date: getTodayInTimezone(timezone),
      },
      {
        jobId: `consolidation_${timezone.replace(/\//g, '-')}_manual_${String(timestamp)}`,
      }
    );

    this.logger.log(`Manual consolidation triggered for timezone ${timezone}`, { jobId: job.id });
    return job.id ?? 'unknown';
  }

  /**
   * Refresh schedulers when new timezones are added
   * Should be called when a new user registers with a previously unseen timezone
   */
  async refreshSchedulers(): Promise<void> {
    await this.setupScheduledJobs();
  }
}
