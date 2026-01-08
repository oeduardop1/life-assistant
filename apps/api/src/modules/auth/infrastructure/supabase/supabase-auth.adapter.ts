import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { createClient, SupabaseClient, AuthError } from '@supabase/supabase-js';
import { AppConfigService } from '../../../../config/config.service';

export interface SignupResult {
  userId: string;
  email: string;
  emailConfirmationRequired: boolean;
}

export interface LoginResult {
  userId: string;
  email: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

export interface RefreshResult {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

export interface UserInfo {
  id: string;
  email: string;
  emailConfirmedAt: string | null;
  createdAt: string;
}

/**
 * SupabaseAuthAdapter - Infrastructure layer for Supabase Auth operations
 *
 * Uses Supabase Admin client (service role) for server-side auth operations.
 * This adapter handles all communication with Supabase Auth API.
 */
@Injectable()
export class SupabaseAuthAdapter {
  private readonly supabaseAdmin: SupabaseClient;

  constructor(private readonly config: AppConfigService) {
    // Create Supabase Admin client with service role key
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    this.supabaseAdmin = createClient(
      this.config.supabaseUrl,
      this.config.supabaseServiceKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    );
  }

  /**
   * Sign up a new user with email/password
   */
  async signUp(email: string, password: string, metadata?: { name?: string }): Promise<SignupResult> {
    const { data, error } = await this.supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: false, // Require email confirmation
      ...(metadata && { user_metadata: metadata }),
    });

    if (error) {
      this.handleAuthError(error);
    }

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- Supabase types allow null even on success
    if (!data.user) {
      this.handleAuthError(new Error('Failed to create user') as unknown as AuthError);
    }

    return {
      userId: data.user.id,
      email: data.user.email ?? '',
      emailConfirmationRequired: !data.user.email_confirmed_at,
    };
  }

  /**
   * Sign in with email/password
   */
  async signIn(email: string, password: string): Promise<LoginResult> {
    // Use regular Supabase client for sign in (not admin)
    const supabase = createClient(
      this.config.supabaseUrl,
      this.config.supabaseAnonKey,
    );

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      this.handleAuthError(error);
    }

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- Supabase types allow null even on success
    if (!data.user || !data.session) {
      this.handleAuthError(new Error('Invalid credentials') as unknown as AuthError);
    }

    return {
      userId: data.user.id,
      email: data.user.email ?? '',
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      expiresAt: data.session.expires_at ?? 0,
    };
  }

  /**
   * Sign out user by invalidating their session
   */
  async signOut(userId: string): Promise<void> {
    const { error } = await this.supabaseAdmin.auth.admin.signOut(userId);

    if (error) {
      this.handleAuthError(error);
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(refreshToken: string): Promise<RefreshResult> {
    const supabase = createClient(
      this.config.supabaseUrl,
      this.config.supabaseAnonKey,
    );

    const { data, error } = await supabase.auth.refreshSession({
      refresh_token: refreshToken,
    });

    if (error) {
      this.handleAuthError(error);
    }

    if (!data.session) {
      this.handleAuthError(new Error('Invalid refresh token') as unknown as AuthError);
    }

    return {
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      expiresAt: data.session.expires_at ?? 0,
    };
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(email: string): Promise<void> {
    const supabase = createClient(
      this.config.supabaseUrl,
      this.config.supabaseAnonKey,
    );

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${this.config.frontendUrl}/reset-password`,
    });

    if (error) {
      this.handleAuthError(error);
    }
  }

  /**
   * Update user password (requires valid session)
   */
  async updatePassword(userId: string, newPassword: string): Promise<void> {
    const { error } = await this.supabaseAdmin.auth.admin.updateUserById(userId, {
      password: newPassword,
    });

    if (error) {
      this.handleAuthError(error);
    }
  }

  /**
   * Get user info by ID
   */
  async getUser(userId: string): Promise<UserInfo | null> {
    const { data, error } = await this.supabaseAdmin.auth.admin.getUserById(userId);

    if (error) {
      if (error.message.includes('not found')) {
        return null;
      }
      this.handleAuthError(error);
    }

    const user = data.user;
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- Supabase types allow null even on success
    if (!user) {
      return null;
    }

    return {
      id: user.id,
      email: user.email ?? '',
      emailConfirmedAt: user.email_confirmed_at ?? null,
      createdAt: user.created_at,
    };
  }

  /**
   * Resend confirmation email
   */
  async resendConfirmationEmail(email: string): Promise<void> {
    const supabase = createClient(
      this.config.supabaseUrl,
      this.config.supabaseAnonKey,
    );

    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: {
        emailRedirectTo: `${this.config.frontendUrl}/login`,
      },
    });

    if (error) {
      this.handleAuthError(error);
    }
  }

  /**
   * Handle Supabase auth errors and convert to NestJS exceptions
   */
  private handleAuthError(error: AuthError): never {
    const message = error.message.toLowerCase();

    // Map common Supabase errors to appropriate HTTP exceptions
    if (message.includes('email not confirmed')) {
      throw new UnauthorizedException('Please confirm your email address before signing in');
    }

    if (message.includes('invalid login credentials') || message.includes('invalid credentials')) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (message.includes('user already registered') || message.includes('already exists')) {
      throw new BadRequestException('An account with this email already exists');
    }

    if (message.includes('password') && message.includes('weak')) {
      throw new BadRequestException('Password does not meet security requirements');
    }

    if (message.includes('rate limit')) {
      throw new BadRequestException('Too many requests. Please try again later.');
    }

    if (message.includes('expired') || message.includes('invalid token')) {
      throw new UnauthorizedException('Session expired. Please sign in again.');
    }

    // Default error handling
    throw new BadRequestException(error.message || 'Authentication failed');
  }
}
