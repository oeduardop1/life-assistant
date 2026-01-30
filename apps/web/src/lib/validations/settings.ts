/**
 * Zod validation schemas for settings forms
 * @see docs/specs/domains/settings.md for requirements
 */

import { z } from 'zod';

/**
 * Update profile validation schema
 * - Name: 2-100 characters, trimmed
 */
export const updateProfileSchema = z.object({
  name: z
    .string()
    .transform((val) => val.trim())
    .pipe(
      z
        .string()
        .min(2, 'Nome deve ter pelo menos 2 caracteres')
        .max(100, 'Nome deve ter no máximo 100 caracteres'),
    ),
});

export type UpdateProfileData = z.infer<typeof updateProfileSchema>;

/**
 * Update email validation schema
 * - New email: valid email format
 * - Current password: required
 */
export const updateEmailSchema = z.object({
  newEmail: z.string().email('Email deve ser um endereço válido'),
  currentPassword: z.string().min(1, 'Senha atual é obrigatória'),
});

export type UpdateEmailData = z.infer<typeof updateEmailSchema>;

/**
 * Update password validation schema
 * - Current password: required
 * - New password: 8-72 characters (strength validated separately via zxcvbn)
 */
export const updatePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Senha atual é obrigatória'),
  newPassword: z
    .string()
    .min(8, 'Nova senha deve ter pelo menos 8 caracteres')
    .max(72, 'Nova senha deve ter no máximo 72 caracteres'),
});

export type UpdatePasswordData = z.infer<typeof updatePasswordSchema>;

/**
 * User settings response from API
 */
export interface UserSettings {
  name: string;
  email: string;
}

/**
 * Settings update response from API
 */
export interface SettingsResponse {
  success: boolean;
  message?: string;
}

/**
 * Password strength levels based on zxcvbn score
 */
export const passwordStrengthLevels = [
  { score: 0, label: 'Muito fraca', color: 'bg-red-500', allowed: false },
  { score: 1, label: 'Fraca', color: 'bg-orange-500', allowed: false },
  { score: 2, label: 'Razoável', color: 'bg-yellow-500', allowed: true },
  { score: 3, label: 'Boa', color: 'bg-lime-500', allowed: true },
  { score: 4, label: 'Forte', color: 'bg-green-500', allowed: true },
] as const;

export const MIN_PASSWORD_SCORE = 2;
