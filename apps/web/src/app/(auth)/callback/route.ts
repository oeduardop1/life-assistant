import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

/**
 * Standard API response wrapper from TransformInterceptor
 * @see ENGINEERING.md - API Response Format
 */
interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta: {
    timestamp: string;
    requestId: string;
  };
}

interface OnboardingStatus {
  isComplete: boolean;
}

/**
 * Auth Callback Route Handler
 *
 * Handles:
 * - Email confirmation callbacks (redirects to /onboarding if not complete)
 * - Password reset callbacks
 * - OAuth callbacks (future)
 *
 * The code in the URL is exchanged for a session.
 *
 * @see SYSTEM_SPECS.md §3.1 for onboarding flow
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next');

  if (code) {
    const cookieStore = await cookies();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          },
        },
      },
    );

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.session) {
      // If it's a password reset, redirect to reset-password page
      const type = searchParams.get('type');
      if (type === 'recovery') {
        return NextResponse.redirect(`${origin}/reset-password`);
      }

      // If a specific next URL was provided, use it
      if (next) {
        return NextResponse.redirect(`${origin}${next}`);
      }

      // Check onboarding status to determine redirect destination
      try {
        const onboardingResponse = await fetch(`${API_URL}/onboarding/status`, {
          headers: {
            Authorization: `Bearer ${data.session.access_token}`,
          },
        });

        if (onboardingResponse.ok) {
          // Unwrap API response from TransformInterceptor format
          const json = await onboardingResponse.json() as ApiResponse<OnboardingStatus>;
          const status = json.data;
          if (status.isComplete) {
            return NextResponse.redirect(`${origin}/dashboard`);
          }
          // Onboarding not complete, redirect to onboarding
          return NextResponse.redirect(`${origin}/onboarding`);
        }
      } catch {
        // If API call fails, default to onboarding (safer for new users)
        // The onboarding layout will redirect to dashboard if already complete
      }

      // Default: redirect to onboarding for email confirmations
      return NextResponse.redirect(`${origin}/onboarding`);
    }
  }

  // If there's an error or no code, redirect to login with error
  return NextResponse.redirect(`${origin}/login?error=callback_error`);
}
