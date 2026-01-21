import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LifeArea } from '@life-assistant/shared';

/**
 * Onboarding step identifiers
 */
export type OnboardingStep = 'profile' | 'areas' | 'telegram' | 'tutorial';

/**
 * Data collected during onboarding
 */
export class OnboardingDataDto {
  @ApiPropertyOptional({
    description: 'User name from profile step',
    example: 'Maria Silva',
  })
  name?: string;

  @ApiPropertyOptional({
    description: 'User timezone from profile step',
    example: 'America/Sao_Paulo',
  })
  timezone?: string;

  // ADR-017: Updated to 6 main areas
  @ApiPropertyOptional({
    description: 'Selected life areas',
    example: [LifeArea.HEALTH, LifeArea.FINANCE, LifeArea.PROFESSIONAL],
    isArray: true,
    enum: LifeArea,
  })
  areas?: LifeArea[];

  @ApiPropertyOptional({
    description: 'Telegram user ID',
    example: '123456789',
  })
  telegramId?: string;

  @ApiPropertyOptional({
    description: 'Whether Telegram step was skipped',
    example: false,
  })
  telegramSkipped?: boolean;

  @ApiPropertyOptional({
    description: 'Whether tutorial step was skipped',
    example: false,
  })
  tutorialSkipped?: boolean;
}

/**
 * Response DTO for onboarding status
 */
export class OnboardingStatusDto {
  @ApiProperty({
    description: 'Current step of the onboarding process',
    example: 'profile',
    enum: ['profile', 'areas', 'telegram', 'tutorial'],
  })
  currentStep: OnboardingStep;

  @ApiProperty({
    description: 'Steps that have been completed',
    example: ['profile'],
    isArray: true,
    enum: ['profile', 'areas', 'telegram', 'tutorial'],
  })
  completedSteps: OnboardingStep[];

  @ApiProperty({
    description: 'Data collected so far',
    type: OnboardingDataDto,
  })
  data: OnboardingDataDto;

  @ApiProperty({
    description: 'Whether onboarding is complete',
    example: false,
  })
  isComplete: boolean;
}

/**
 * Response for step save operations
 */
export class StepSaveResponseDto {
  @ApiProperty({
    description: 'Whether the step was saved successfully',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Next step to navigate to',
    example: 'areas',
    enum: ['profile', 'areas', 'telegram', 'tutorial', 'complete'],
  })
  nextStep: OnboardingStep | 'complete';
}

/**
 * Response for onboarding completion
 */
export class OnboardingCompleteResponseDto {
  @ApiProperty({
    description: 'Whether onboarding was completed successfully',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Redirect URL after completion',
    example: '/dashboard',
  })
  redirectTo: string;
}
