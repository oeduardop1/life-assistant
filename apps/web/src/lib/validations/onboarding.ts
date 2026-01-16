/**
 * Zod validation schemas for onboarding forms
 * @see docs/specs/system.md §3.1 for onboarding requirements
 */

import { z } from 'zod';
import { LifeArea } from '@life-assistant/shared';

/**
 * Profile step validation schema
 * - Name: minimum 2 characters
 * - Timezone: valid IANA timezone format
 */
export const profileStepSchema = z.object({
  name: z
    .string()
    .min(2, 'Nome deve ter pelo menos 2 caracteres')
    .max(100, 'Nome deve ter no máximo 100 caracteres'),
  timezone: z
    .string()
    .min(1, 'Selecione um fuso horário')
    .regex(
      /^[A-Za-z_]+\/[A-Za-z_]+$/,
      'Fuso horário inválido. Exemplo: America/Sao_Paulo',
    ),
});

export type ProfileStepData = z.infer<typeof profileStepSchema>;

/**
 * Areas step validation schema
 * - Minimum 3 areas, maximum 8
 * - Must be valid LifeArea enum values
 */
export const areasStepSchema = z.object({
  areas: z
    .array(z.nativeEnum(LifeArea))
    .min(3, 'Selecione pelo menos 3 áreas da vida')
    .max(8, 'Você pode selecionar no máximo 8 áreas'),
});

export type AreasStepData = z.infer<typeof areasStepSchema>;

/**
 * Telegram step validation schema
 * - telegramId: optional, for when user connects
 * - skipped: whether user chose to skip this step
 */
export const telegramStepSchema = z.object({
  telegramId: z.string().optional(),
  skipped: z.boolean(),
});

export type TelegramStepData = z.infer<typeof telegramStepSchema>;

/**
 * Complete onboarding validation schema
 * - tutorialSkipped: whether user chose to skip the tutorial
 */
export const completeOnboardingSchema = z.object({
  tutorialSkipped: z.boolean().optional(),
});

export type CompleteOnboardingData = z.infer<typeof completeOnboardingSchema>;

/**
 * Onboarding step type
 */
export type OnboardingStep = 'profile' | 'areas' | 'telegram' | 'tutorial';

/**
 * Onboarding status response from API
 */
export interface OnboardingStatus {
  currentStep: OnboardingStep;
  completedSteps: OnboardingStep[];
  data: {
    name?: string;
    timezone?: string;
    areas?: LifeArea[];
    telegramId?: string;
    telegramSkipped?: boolean;
    tutorialSkipped?: boolean;
  };
  isComplete: boolean;
}

/**
 * Step save response from API
 */
export interface StepSaveResponse {
  success: boolean;
  nextStep: OnboardingStep | 'complete';
}

/**
 * Complete response from API
 */
export interface OnboardingCompleteResponse {
  success: boolean;
  redirectTo: string;
}
