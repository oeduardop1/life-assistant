import { Module } from '@nestjs/common';
import { SettingsController } from './presentation/controllers/settings.controller';
import { SettingsService } from './application/services/settings.service';
import { SettingsEmailService } from './infrastructure/email/settings-email.service';
import { SupabaseAuthAdapter } from '../auth/infrastructure/supabase/supabase-auth.adapter';
import { ConfigModule } from '../../config/config.module';
import { LoggerModule } from '../../logger/logger.module';
import { DatabaseModule } from '../../database/database.module';

/**
 * SettingsModule - User settings management
 *
 * Provides:
 * - Profile updates (name)
 * - Email updates (with verification)
 * - Password updates (with strength validation)
 *
 * Endpoints:
 * - GET /api/settings - Get current settings
 * - PATCH /api/settings/profile - Update profile
 * - PATCH /api/settings/email - Update email
 * - PATCH /api/settings/password - Update password
 *
 * @see docs/specs/domains/settings.md for requirements
 */
@Module({
  imports: [ConfigModule, LoggerModule, DatabaseModule],
  controllers: [SettingsController],
  providers: [SettingsService, SettingsEmailService, SupabaseAuthAdapter],
  exports: [SettingsService],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class SettingsModule {}
