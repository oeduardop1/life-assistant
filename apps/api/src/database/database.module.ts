import { Global, Module } from '@nestjs/common';
import { DatabaseService } from './database.service';

/**
 * DatabaseModule - Global module providing database access
 *
 * Exports DatabaseService which wraps @life-assistant/database.
 * Provides:
 * - Drizzle ORM instance
 * - RLS-aware query helpers
 * - Automatic cleanup on shutdown
 */
@Global()
@Module({
  providers: [DatabaseService],
  exports: [DatabaseService],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class DatabaseModule {}
