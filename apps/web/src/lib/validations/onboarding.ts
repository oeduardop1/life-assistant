/**
 * Zod validation schemas for onboarding forms (3 steps: profile → telegram → tutorial)
 * @see docs/specs/system.md §3.1 for onboarding requirements
 */

import { z } from 'zod';

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
 * Onboarding step type (3 steps: profile → telegram → tutorial)
 */
export type OnboardingStep = 'profile' | 'telegram' | 'tutorial';

/**
 * Onboarding status response from API
 */
export interface OnboardingStatus {
  currentStep: OnboardingStep;
  completedSteps: OnboardingStep[];
  data: {
    name?: string;
    timezone?: string;
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
