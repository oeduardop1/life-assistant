import { Module } from '@nestjs/common';
import { AuthController } from './presentation/controllers/auth.controller';
import { AuthService } from './application/services/auth.service';
import { SupabaseAuthAdapter } from './infrastructure/supabase/supabase-auth.adapter';
import { ConfigModule } from '../../config/config.module';
import { LoggerModule } from '../../logger/logger.module';

/**
 * AuthModule - Authentication module using Supabase Auth
 *
 * Provides:
 * - User registration (signup)
 * - User authentication (login/logout)
 * - Token refresh
 * - Password reset flow
 * - Email confirmation
 *
 * @see docs/specs/engineering.md §4 for Clean Architecture patterns
 * @see ADR-006 for JWT validation with jose
 */
@Module({
  imports: [ConfigModule, LoggerModule],
  controllers: [AuthController],
  providers: [AuthService, SupabaseAuthAdapter],
  exports: [AuthService],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class AuthModule {}
