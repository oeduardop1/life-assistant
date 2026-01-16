import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule } from '../config/config.module';
import { AppConfigService } from '../config/config.service';
import {
  CleanupOnboardingProcessor,
  CleanupOnboardingScheduler,
} from './cleanup-onboarding';
import {
  MemoryConsolidationProcessor,
  MemoryConsolidationScheduler,
} from './memory-consolidation';
import { DatabaseModule } from '../database/database.module';
import { LoggerModule } from '../logger/logger.module';
import { MemoryModule } from '../modules/memory/memory.module';
import { QUEUES } from './queues';

// Re-export QUEUES for external consumers
export { QUEUES };

/**
 * JobsModule - BullMQ job queue processing
 *
 * Provides:
 * - Connection to Redis for job queues
 * - Job processors for background tasks
 * - Scheduled (cron) jobs
 *
 * @see docs/specs/engineering.md §7 for job architecture
 */
@Module({
  imports: [
    // Configure BullMQ with Redis connection
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [AppConfigService],
      useFactory: (configService: AppConfigService) => ({
        connection: {
          url: configService.redisUrl,
        },
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 1000,
          },
          removeOnComplete: {
            count: 100, // Keep last 100 completed jobs
          },
          removeOnFail: {
            count: 1000, // Keep last 1000 failed jobs for debugging
          },
        },
      }),
    }),

    // Register queues
    BullModule.registerQueue({
      name: QUEUES.CLEANUP_ONBOARDING,
    }),
    BullModule.registerQueue({
      name: QUEUES.MEMORY_CONSOLIDATION,
    }),

    // Dependencies
    DatabaseModule,
    LoggerModule,
    MemoryModule,
  ],
  providers: [
    CleanupOnboardingProcessor,
    CleanupOnboardingScheduler,
    MemoryConsolidationProcessor,
    MemoryConsolidationScheduler,
  ],
  exports: [
    BullModule,
    CleanupOnboardingScheduler,
    MemoryConsolidationScheduler,
  ],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class JobsModule {}
