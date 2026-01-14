import { Injectable, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../../../../database/database.service';
import { eq } from '@life-assistant/database';
import { AppLoggerService } from '../../../../logger/logger.service';
import { MemoryConsolidationScheduler } from '../../../../jobs/memory-consolidation/memory-consolidation.scheduler';
import {
  ProfileStepDto,
  AreasStepDto,
  TelegramStepDto,
  OnboardingStatusDto,
  StepSaveResponseDto,
  OnboardingCompleteResponseDto,
  type OnboardingStep,
} from '../../presentation/dtos';
import { LifeArea, UserStatus } from '@life-assistant/shared';
import {
  type UserPreferences,
  safeParseUserPreferences,
} from '@life-assistant/database';

/**
 * Define step order for navigation
 */
const STEP_ORDER: OnboardingStep[] = ['profile', 'areas', 'telegram', 'tutorial'];

/**
 * OnboardingService - Application layer for onboarding operations
 *
 * Orchestrates the onboarding flow, validating and persisting user data
 * as they complete each step of the wizard.
 */
@Injectable()
export class OnboardingService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly logger: AppLoggerService,
    private readonly consolidationScheduler: MemoryConsolidationScheduler,
  ) {
    this.logger.setContext(OnboardingService.name);
  }

  /**
   * Get current onboarding status for a user
   */
  async getOnboardingStatus(userId: string): Promise<OnboardingStatusDto> {
    this.logger.debug(`Getting onboarding status for user: ${userId}`);

    const user = await this.getUserById(userId);

    if (!user) {
      throw new BadRequestException('User not found');
    }

    const prefs = safeParseUserPreferences(user.preferences);
    const { onboarding, areaWeights } = prefs;

    // Determine completed steps based on onboarding flags
    const completedSteps: OnboardingStep[] = [];

    if (onboarding.profileComplete) {
      completedSteps.push('profile');
    }
    if (onboarding.areasComplete) {
      completedSteps.push('areas');
    }
    if (onboarding.telegramComplete) {
      completedSteps.push('telegram');
    }
    if (onboarding.tutorialComplete) {
      completedSteps.push('tutorial');
    }

    // Determine current step (first incomplete step)
    const currentStep = STEP_ORDER.find(step => !completedSteps.includes(step)) ?? 'profile';
    const areas = Object.entries(areaWeights)
      .filter(([_, weight]) => weight > 0)
      .map(([area]) => area as LifeArea);

    return {
      currentStep,
      completedSteps,
      data: {
        name: user.name,
        timezone: user.timezone,
        ...(areas.length > 0 ? { areas } : {}),
        telegramSkipped: onboarding.telegramSkipped,
        tutorialSkipped: onboarding.tutorialSkipped,
      },
      isComplete: user.onboardingCompletedAt !== null,
    };
  }

  /**
   * Save profile step data (name, timezone)
   */
  async saveProfileStep(userId: string, dto: ProfileStepDto): Promise<StepSaveResponseDto> {
    this.logger.log(`Saving profile step for user: ${userId}`);

    const user = await this.getUserById(userId);
    if (!user) {
      throw new BadRequestException('User not found');
    }

    const currentPrefs = safeParseUserPreferences(user.preferences);

    const updatedPrefs: UserPreferences = {
      ...currentPrefs,
      onboarding: {
        ...currentPrefs.onboarding,
        profileComplete: true,
      },
    };

    await this.databaseService.withUserTransaction(userId, async (db) => {
      await db
        .update(this.databaseService.schema.users)
        .set({
          name: dto.name,
          timezone: dto.timezone,
          preferences: updatedPrefs,
          updatedAt: new Date(),
        })
        .where(this.whereUserId(userId));
    });

    // Update schedulers to include new timezone (async, doesn't block response)
    this.consolidationScheduler.refreshSchedulers().catch((err: unknown) => {
      this.logger.error('Failed to refresh consolidation schedulers', err instanceof Error ? err.message : String(err));
    });

    this.logger.log(`Profile step saved for user: ${userId}`);

    return {
      success: true,
      nextStep: 'areas',
    };
  }

  /**
   * Save areas step data (selected life areas)
   */
  async saveAreasStep(userId: string, dto: AreasStepDto): Promise<StepSaveResponseDto> {
    this.logger.log(`Saving areas step for user: ${userId}`);

    const user = await this.getUserById(userId);
    if (!user) {
      throw new BadRequestException('User not found');
    }

    // Build area weights object with proper type
    const areaWeights: UserPreferences['areaWeights'] = {
      health: dto.areas.includes(LifeArea.HEALTH) ? 1.0 : 0.0,
      financial: dto.areas.includes(LifeArea.FINANCIAL) ? 1.0 : 0.0,
      relationships: dto.areas.includes(LifeArea.RELATIONSHIPS) ? 1.0 : 0.0,
      career: dto.areas.includes(LifeArea.CAREER) ? 1.0 : 0.0,
      personal_growth: dto.areas.includes(LifeArea.PERSONAL_GROWTH) ? 1.0 : 0.0,
      leisure: dto.areas.includes(LifeArea.LEISURE) ? 1.0 : 0.0,
      spirituality: dto.areas.includes(LifeArea.SPIRITUALITY) ? 1.0 : 0.0,
      mental_health: dto.areas.includes(LifeArea.MENTAL_HEALTH) ? 1.0 : 0.0,
    };

    const currentPrefs = safeParseUserPreferences(user.preferences);

    const updatedPrefs: UserPreferences = {
      ...currentPrefs,
      areaWeights,
      onboarding: {
        ...currentPrefs.onboarding,
        areasComplete: true,
      },
    };

    await this.databaseService.withUserTransaction(userId, async (db) => {
      await db
        .update(this.databaseService.schema.users)
        .set({
          preferences: updatedPrefs,
          updatedAt: new Date(),
        })
        .where(this.whereUserId(userId));
    });

    this.logger.log(`Areas step saved for user: ${userId}`);

    return {
      success: true,
      nextStep: 'telegram',
    };
  }

  /**
   * Save telegram step data (telegram connection or skip)
   */
  async saveTelegramStep(userId: string, dto: TelegramStepDto): Promise<StepSaveResponseDto> {
    this.logger.log(`Saving telegram step for user: ${userId}`);

    const user = await this.getUserById(userId);
    if (!user) {
      throw new BadRequestException('User not found');
    }

    const currentPrefs = safeParseUserPreferences(user.preferences);

    const updatedPrefs: UserPreferences = {
      ...currentPrefs,
      notifications: {
        ...currentPrefs.notifications,
        telegramEnabled: !dto.skipped && !!dto.telegramId,
      },
      onboarding: {
        ...currentPrefs.onboarding,
        telegramComplete: true,
        telegramSkipped: dto.skipped,
      },
    };

    await this.databaseService.withUserTransaction(userId, async (db) => {
      await db
        .update(this.databaseService.schema.users)
        .set({
          preferences: updatedPrefs,
          updatedAt: new Date(),
        })
        .where(this.whereUserId(userId));
    });

    this.logger.log(`Telegram step saved for user: ${userId}`);

    return {
      success: true,
      nextStep: 'tutorial',
    };
  }

  /**
   * Complete the onboarding process
   * Can be called from tutorial step or after tutorial is skipped
   */
  async completeOnboarding(userId: string, tutorialSkipped = false): Promise<OnboardingCompleteResponseDto> {
    this.logger.log(`Completing onboarding for user: ${userId}`);

    // Verify required steps are complete
    const status = await this.getOnboardingStatus(userId);

    if (!status.completedSteps.includes('profile') || !status.completedSteps.includes('areas')) {
      throw new BadRequestException('Required steps (profile, areas) must be completed before finishing onboarding');
    }

    const user = await this.getUserById(userId);
    if (!user) {
      throw new BadRequestException('User not found');
    }

    const currentPrefs = safeParseUserPreferences(user.preferences);

    const updatedPrefs: UserPreferences = {
      ...currentPrefs,
      onboarding: {
        ...currentPrefs.onboarding,
        tutorialComplete: true,
        tutorialSkipped,
      },
    };

    await this.databaseService.withUserTransaction(userId, async (db) => {
      await db
        .update(this.databaseService.schema.users)
        .set({
          status: UserStatus.ACTIVE,
          onboardingCompletedAt: new Date(),
          preferences: updatedPrefs,
          updatedAt: new Date(),
        })
        .where(this.whereUserId(userId));
    });

    this.logger.log(`Onboarding completed for user: ${userId}`);

    return {
      success: true,
      redirectTo: '/dashboard',
    };
  }

  /**
   * Check if user has completed onboarding
   */
  async isOnboardingComplete(userId: string): Promise<boolean> {
    const user = await this.getUserById(userId);
    return user?.onboardingCompletedAt !== null;
  }

  /**
   * Helper to get user by ID with RLS context
   */
  private async getUserById(userId: string) {
    return this.databaseService.withUserId(userId, async (db) => {
      const result = await db
        .select()
        .from(this.databaseService.schema.users)
        .where(this.whereUserId(userId))
        .limit(1);
      return result[0];
    });
  }

  /**
   * Helper to create where clause for user ID
   */
  private whereUserId(userId: string) {
    const { users } = this.databaseService.schema;
    return eq(users.id, userId);
  }
}
