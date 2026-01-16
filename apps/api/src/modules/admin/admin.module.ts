import { Module } from '@nestjs/common';
import { AdminJobsController } from './admin-jobs.controller';
import { JobsModule } from '../../jobs/jobs.module';

/**
 * AdminModule - Development-only administrative endpoints
 *
 * This module is only loaded when NODE_ENV=development.
 * Provides endpoints for manual job triggering and debugging.
 *
 * @see docs/specs/engineering.md §7.6 for manual job triggering documentation
 */
@Module({
  imports: [JobsModule],
  controllers: [AdminJobsController],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class AdminModule {}
