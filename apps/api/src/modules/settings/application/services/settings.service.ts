import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { zxcvbn, zxcvbnOptions } from '@zxcvbn-ts/core';
import * as zxcvbnCommonPackage from '@zxcvbn-ts/language-common';
import * as zxcvbnEnPackage from '@zxcvbn-ts/language-en';
import { eq } from '@life-assistant/database';
import { SupabaseAuthAdapter } from '../../../auth/infrastructure/supabase/supabase-auth.adapter';
import { SettingsEmailService } from '../../infrastructure/email/settings-email.service';
import { UpdateProfileDto, UpdateEmailDto, UpdatePasswordDto } from '../../presentation/dtos';
import { AppLoggerService } from '../../../../logger/logger.service';
import { DatabaseService } from '../../../../database/database.service';

// Configure zxcvbn with language packages
const options = {
  translations: zxcvbnEnPackage.translations,
  graphs: zxcvbnCommonPackage.adjacencyGraphs,
  dictionary: {
    ...zxcvbnCommonPackage.dictionary,
    ...zxcvbnEnPackage.dictionary,
  },
};
zxcvbnOptions.setOptions(options);

// Minimum password strength score (0-4 scale)
// 0 = Too weak, 1 = Weak, 2 = Fair, 3 = Good, 4 = Strong
const MIN_PASSWORD_SCORE = 2;

export interface SettingsResponse {
  success: boolean;
  message?: string;
}

export interface UserSettingsResponse {
  name: string;
  email: string;
}

/**
 * SettingsService - Application layer for user settings operations
 *
 * Handles profile updates, email changes, and password changes
 * with proper validation and security measures.
 *
 * Data access pattern (per supabase-auth.md):
 * - User data (name, email): Read from public.users via DatabaseService
 * - Auth operations (password, email change): Via SupabaseAuthAdapter
 *
 * @see docs/specs/domains/settings.md for requirements
 */
@Injectable()
export class SettingsService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly supabaseAuth: SupabaseAuthAdapter,
    private readonly emailService: SettingsEmailService,
    private readonly logger: AppLoggerService,
  ) {
    this.logger.setContext(SettingsService.name);
  }

  /**
   * Get current user settings (name and email)
   * Reads from public.users table (not Supabase Admin API)
   */
  async getUserSettings(userId: string): Promise<UserSettingsResponse> {
    const user = await this.getUserById(userId);

    if (!user) {
      throw new BadRequestException('Usuário não encontrado');
    }

    return {
      name: user.name,
      email: user.email,
    };
  }

  /**
   * Update user profile (name)
   * Updates directly in public.users table
   */
  async updateProfile(userId: string, dto: UpdateProfileDto): Promise<SettingsResponse> {
    this.logger.log(`Profile update for user: ${userId}`);

    const user = await this.getUserById(userId);
    if (!user) {
      throw new BadRequestException('Usuário não encontrado');
    }

    // Update name in public.users table
    await this.databaseService.withUserId(userId, async (db) => {
      await db
        .update(this.databaseService.schema.users)
        .set({ name: dto.name, updatedAt: new Date() })
        .where(eq(this.databaseService.schema.users.id, userId));
    });

    this.logger.log(`Profile updated successfully for user: ${userId}`);

    return {
      success: true,
      message: 'Perfil atualizado com sucesso',
    };
  }

  /**
   * Update user email
   * Requires current password verification
   * Sends notification to old email
   */
  async updateEmail(userId: string, dto: UpdateEmailDto): Promise<SettingsResponse> {
    this.logger.log(`Email update requested for user: ${userId}`);

    // Get current user info from database
    const user = await this.getUserById(userId);
    if (!user) {
      throw new BadRequestException('Usuário não encontrado');
    }

    // Check if new email is same as current
    if (user.email.toLowerCase() === dto.newEmail.toLowerCase()) {
      throw new BadRequestException('O novo email deve ser diferente do atual');
    }

    // Verify current password (uses Supabase Auth)
    const isPasswordValid = await this.supabaseAuth.verifyPassword(
      user.email,
      dto.currentPassword,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Senha atual incorreta');
    }

    // Check if email is already in use
    const emailInUse = await this.supabaseAuth.isEmailInUse(dto.newEmail, userId);
    if (emailInUse) {
      throw new BadRequestException('Este email já está em uso');
    }

    // Update email via Supabase Auth (will send verification to new email)
    const { oldEmail } = await this.supabaseAuth.updateEmail(userId, dto.newEmail);

    // Send security notification to old email
    this.emailService.sendEmailChangeNotification(
      oldEmail,
      dto.newEmail,
      user.name,
    );

    this.logger.log(`Email change initiated for user: ${userId}`);

    return {
      success: true,
      message: 'Email de verificação enviado para o novo endereço',
    };
  }

  /**
   * Update user password
   * Requires current password verification
   * Validates password strength with zxcvbn
   */
  async updatePassword(userId: string, dto: UpdatePasswordDto): Promise<SettingsResponse> {
    this.logger.log(`Password update requested for user: ${userId}`);

    // Get current user info from database
    const user = await this.getUserById(userId);
    if (!user) {
      throw new BadRequestException('Usuário não encontrado');
    }

    // Verify current password (uses Supabase Auth)
    const isPasswordValid = await this.supabaseAuth.verifyPassword(
      user.email,
      dto.currentPassword,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Senha atual incorreta');
    }

    // Check if new password is same as current
    const isSamePassword = await this.supabaseAuth.verifyPassword(
      user.email,
      dto.newPassword,
    );

    if (isSamePassword) {
      throw new BadRequestException('A nova senha deve ser diferente da atual');
    }

    // Validate password strength with zxcvbn
    const strengthResult = zxcvbn(dto.newPassword, [
      user.email,
      user.name,
    ]);

    if (strengthResult.score < MIN_PASSWORD_SCORE) {
      throw new BadRequestException(
        `Senha muito fraca. ${strengthResult.feedback.warning ?? 'Use uma senha mais forte.'}`,
      );
    }

    // Update password via Supabase Auth
    await this.supabaseAuth.updatePassword(userId, dto.newPassword);

    // Send security notification
    this.emailService.sendPasswordChangeNotification(
      user.email,
      user.name,
    );

    this.logger.log(`Password updated successfully for user: ${userId}`);

    return {
      success: true,
      message: 'Senha alterada com sucesso',
    };
  }

  /**
   * Validate password strength without updating
   * Returns score and feedback for frontend use
   */
  validatePasswordStrength(
    password: string,
    userInputs: string[] = [],
  ): { score: number; feedback: { warning: string; suggestions: string[] } } {
    const result = zxcvbn(password, userInputs);
    return {
      score: result.score,
      feedback: {
        warning: result.feedback.warning ?? '',
        suggestions: result.feedback.suggestions,
      },
    };
  }

  /**
   * Helper to get user by ID from public.users table
   * Uses RLS context via DatabaseService
   */
  private async getUserById(userId: string): Promise<{ id: string; name: string; email: string } | null> {
    const result = await this.databaseService.withUserId(userId, async (db) => {
      return db
        .select({
          id: this.databaseService.schema.users.id,
          name: this.databaseService.schema.users.name,
          email: this.databaseService.schema.users.email,
        })
        .from(this.databaseService.schema.users)
        .where(eq(this.databaseService.schema.users.id, userId))
        .limit(1);
    });

    return result[0] ?? null;
  }
}
