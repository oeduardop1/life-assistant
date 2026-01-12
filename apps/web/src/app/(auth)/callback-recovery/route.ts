import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Password Recovery Callback Route Handler
 *
 * Handles password reset callbacks from Supabase email links.
 * Supports both:
 * - PKCE flow: ?code=xxx (from Supabase auth server redirect)
 * - Token hash flow: ?token_hash=xxx&type=recovery (direct from email)
 *
 * The middleware also redirects /?code=xxx to this route as a fallback
 * when Supabase uses Site URL instead of our redirectTo.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type');

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

  // Try PKCE code exchange first
  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.session) {
      return NextResponse.redirect(`${origin}/reset-password`);
    }

    // If code exchange failed, the code might actually be a token_hash
    // Try verifyOtp as fallback
    const { data: otpData, error: otpError } = await supabase.auth.verifyOtp({
      token_hash: code,
      type: 'recovery',
    });

    if (!otpError && otpData.session) {
      return NextResponse.redirect(`${origin}/reset-password`);
    }
  }

  // Handle direct token_hash (from email templates that use token_hash)
  if (tokenHash && type === 'recovery') {
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: 'recovery',
    });

    if (!error && data.session) {
      return NextResponse.redirect(`${origin}/reset-password`);
    }
  }

  // If all methods fail, redirect to forgot-password with error
  return NextResponse.redirect(`${origin}/forgot-password?error=invalid_link`);
}
