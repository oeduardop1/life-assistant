import { Injectable } from '@nestjs/common';
import { SupabaseAuthAdapter } from '../../infrastructure/supabase/supabase-auth.adapter';
import { SignupDto, LoginDto, ForgotPasswordDto, ResetPasswordDto } from '../../presentation/dtos';
import { AppLoggerService } from '../../../../logger/logger.service';

export interface AuthResponse {
  success: boolean;
  message: string;
  data?: unknown;
}

export interface LoginResponse {
  user: {
    id: string;
    email: string;
  };
  session: {
    accessToken: string;
    refreshToken: string;
    expiresAt: number;
  };
}

export interface SignupResponse {
  user: {
    id: string;
    email: string;
  };
  emailConfirmationRequired: boolean;
}

export interface MeResponse {
  id: string;
  email: string;
  emailConfirmedAt: string | null;
}

/**
 * AuthService - Application layer for authentication operations
 *
 * Orchestrates authentication flows using SupabaseAuthAdapter.
 * Handles business logic and logging.
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly supabaseAuth: SupabaseAuthAdapter,
    private readonly logger: AppLoggerService,
  ) {
    this.logger.setContext(AuthService.name);
  }

  /**
   * Register a new user with email/password
   */
  async signup(dto: SignupDto): Promise<SignupResponse> {
    this.logger.log(`Signup attempt for email: ${dto.email}`);

    const result = await this.supabaseAuth.signUp(dto.email, dto.password, {
      name: dto.name,
    });

    this.logger.log(`User created successfully: ${result.userId}`);

    return {
      user: {
        id: result.userId,
        email: result.email,
      },
      emailConfirmationRequired: result.emailConfirmationRequired,
    };
  }

  /**
   * Authenticate user with email/password
   */
  async login(dto: LoginDto): Promise<LoginResponse> {
    this.logger.log(`Login attempt for email: ${dto.email}`);

    const result = await this.supabaseAuth.signIn(dto.email, dto.password);

    this.logger.log(`User logged in successfully: ${result.userId}`);

    return {
      user: {
        id: result.userId,
        email: result.email,
      },
      session: {
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        expiresAt: result.expiresAt,
      },
    };
  }

  /**
   * Sign out user
   */
  async logout(userId: string): Promise<AuthResponse> {
    this.logger.log(`Logout attempt for user: ${userId}`);

    await this.supabaseAuth.signOut(userId);

    this.logger.log(`User logged out successfully: ${userId}`);

    return {
      success: true,
      message: 'Successfully logged out',
    };
  }

  /**
   * Refresh access token
   */
  async refresh(refreshToken: string): Promise<LoginResponse['session']> {
    this.logger.log('Token refresh attempt');

    const result = await this.supabaseAuth.refreshToken(refreshToken);

    this.logger.log('Token refreshed successfully');

    return {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      expiresAt: result.expiresAt,
    };
  }

  /**
   * Send password reset email
   */
  async forgotPassword(dto: ForgotPasswordDto): Promise<AuthResponse> {
    this.logger.log(`Password reset requested for: ${dto.email}`);

    await this.supabaseAuth.sendPasswordResetEmail(dto.email);

    // Always return success to prevent email enumeration
    return {
      success: true,
      message: 'If an account exists with this email, a password reset link has been sent',
    };
  }

  /**
   * Reset password with new value
   */
  async resetPassword(userId: string, dto: ResetPasswordDto): Promise<AuthResponse> {
    this.logger.log(`Password reset for user: ${userId}`);

    await this.supabaseAuth.updatePassword(userId, dto.password);

    this.logger.log(`Password updated successfully for user: ${userId}`);

    return {
      success: true,
      message: 'Password has been reset successfully',
    };
  }

  /**
   * Get current user info
   */
  async me(userId: string): Promise<MeResponse | null> {
    this.logger.debug(`Getting user info for: ${userId}`);

    const user = await this.supabaseAuth.getUser(userId);

    if (!user) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      emailConfirmedAt: user.emailConfirmedAt,
    };
  }

  /**
   * Resend email confirmation
   */
  async resendConfirmation(email: string): Promise<AuthResponse> {
    this.logger.log(`Resending confirmation email to: ${email}`);

    await this.supabaseAuth.resendConfirmationEmail(email);

    return {
      success: true,
      message: 'Confirmation email has been sent',
    };
  }
}
