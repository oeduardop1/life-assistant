import { Module } from '@nestjs/common';
import { OnboardingController } from './presentation/controllers/onboarding.controller';
import { OnboardingService } from './application/services/onboarding.service';
import { DatabaseModule } from '../../database/database.module';
import { LoggerModule } from '../../logger/logger.module';

/**
 * OnboardingModule - Handles new user onboarding flow
 *
 * Provides:
 * - Multi-step onboarding wizard support
 * - Progress persistence for each step
 * - Validation of required vs optional steps
 * - Completion of onboarding and user activation
 *
 * Endpoints:
 * - GET /api/onboarding/status - Get current onboarding state
 * - PATCH /api/onboarding/step/:step - Save progress for a step
 * - POST /api/onboarding/complete - Finalize onboarding
 * - GET /api/onboarding/check - Check if onboarding is complete
 *
 * @see docs/specs/system.md §3.1 for onboarding flow requirements
 * @see docs/specs/engineering.md §4 for Clean Architecture patterns
 */
@Module({
  imports: [DatabaseModule, LoggerModule],
  controllers: [OnboardingController],
  providers: [OnboardingService],
  exports: [OnboardingService],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class OnboardingModule {}
