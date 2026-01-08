import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Job } from 'bullmq';
import { lt, and, isNull, eq } from '@life-assistant/database';
import { UserStatus } from '@life-assistant/shared';
import { DatabaseService } from '../../database/database.service';
import { AppLoggerService } from '../../logger/logger.service';
import { QUEUES } from '../jobs.module';

/**
 * Job data for cleanup operations
 */
interface CleanupJobData {
  /** Date threshold for cleanup (ISO string) */
  threshold: string;
  /** Whether this is a dry run (no actual deletions) */
  dryRun?: boolean;
}

/**
 * Result of cleanup operation
 */
interface CleanupJobResult {
  /** Number of users processed */
  processedCount: number;
  /** Number of users deleted/marked as expired */
  deletedCount: number;
  /** Whether this was a dry run */
  dryRun: boolean;
  /** Timestamp of completion */
  completedAt: string;
}

/**
 * CleanupOnboardingProcessor - Removes abandoned onboarding users after 30 days
 *
 * Per SYSTEM_SPECS.md §3.1:
 * - Users who don't complete onboarding within 30 days are removed
 * - Job runs daily at 03:00 UTC
 * - Soft deletes users (sets deletedAt) to allow recovery if needed
 *
 * @see ENGINEERING.md §7 for job patterns
 */
@Processor(QUEUES.CLEANUP_ONBOARDING)
@Injectable()
export class CleanupOnboardingProcessor extends WorkerHost {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly logger: AppLoggerService,
  ) {
    super();
    this.logger.setContext(CleanupOnboardingProcessor.name);
  }

  /**
   * Process cleanup job
   * Finds and soft-deletes users who:
   * - Have status 'pending'
   * - Were created more than 30 days ago
   * - Have never completed onboarding (onboardingCompletedAt is null)
   */
  async process(job: Job<CleanupJobData>): Promise<CleanupJobResult> {
    const { threshold, dryRun = false } = job.data;
    const thresholdDate = new Date(threshold);

    this.logger.log(`Starting cleanup of abandoned onboardings before ${threshold}`, {
      jobId: job.id,
      dryRun,
    });

    const { users } = this.databaseService.schema;

    // Find users to clean up
    const abandonedUsers = await this.databaseService.db
      .select({ id: users.id, email: users.email, createdAt: users.createdAt })
      .from(users)
      .where(
        and(
          eq(users.status, UserStatus.PENDING),
          isNull(users.onboardingCompletedAt),
          lt(users.createdAt, thresholdDate),
          isNull(users.deletedAt), // Not already deleted
        ),
      );

    this.logger.log(`Found ${String(abandonedUsers.length)} abandoned onboarding users`);

    if (dryRun) {
      this.logger.log('Dry run mode - no users will be deleted');
      return {
        processedCount: abandonedUsers.length,
        deletedCount: 0,
        dryRun: true,
        completedAt: new Date().toISOString(),
      };
    }

    // Soft delete users
    let deletedCount = 0;
    const now = new Date();

    for (const user of abandonedUsers) {
      try {
        await this.databaseService.db
          .update(users)
          .set({
            status: UserStatus.DELETED,
            deletedAt: now,
            updatedAt: now,
          })
          .where(eq(users.id, user.id));

        deletedCount++;
        this.logger.debug(`Soft deleted user ${user.id} (${user.email})`);
      } catch (error) {
        this.logger.error(
          `Failed to delete user ${user.id}: ${error instanceof Error ? error.message : String(error)}`,
        );
        // Continue processing other users
      }
    }

    this.logger.log(`Cleanup complete: ${String(deletedCount)}/${String(abandonedUsers.length)} users deleted`);

    return {
      processedCount: abandonedUsers.length,
      deletedCount,
      dryRun: false,
      completedAt: new Date().toISOString(),
    };
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job<CleanupJobData>, result: CleanupJobResult) {
    this.logger.log(`Job ${job.id ?? 'unknown'} completed`, { result });
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job<CleanupJobData>, error: Error) {
    this.logger.error(
      `Job ${job.id ?? 'unknown'} failed after ${String(job.attemptsMade)} attempts: ${error.message}`,
    );
  }
}
