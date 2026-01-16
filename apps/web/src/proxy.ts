import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Public routes that don't require authentication
 */
const publicRoutes = [
  '/',
  '/login',
  '/signup',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
  '/callback',
  '/callback-recovery',
];

/**
 * Routes accessible during onboarding (authenticated but pending status)
 * @see docs/specs/system.md §3.1 for onboarding flow
 */
const onboardingRoutes = ['/onboarding'];

/**
 * Auth routes that redirect to dashboard if already authenticated
 */
const authRoutes = ['/login', '/signup'];

/**
 * Next.js Proxy for Supabase Auth
 *
 * CRITICAL: This proxy is MANDATORY for session refresh.
 * Without it, the session will not be refreshed and users will be logged out.
 *
 * Features:
 * - Refreshes the auth session on every request
 * - Protects routes that require authentication
 * - Redirects authenticated users away from auth pages
 *
 * @see https://supabase.com/docs/guides/auth/server-side/nextjs
 */
export async function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  // IMPORTANT: Handle password reset codes that arrive on root URL
  // This happens when Supabase falls back to Site URL instead of our redirectTo
  // (e.g., when redirectTo is not in the allowed Redirect URLs list)
  // URL pattern: /?code=xxx or /?code=xxx&type=recovery
  if (pathname === '/' && searchParams.has('code')) {
    const code = searchParams.get('code');
    const url = request.nextUrl.clone();
    url.pathname = '/callback-recovery';
    url.search = `?code=${code}`;
    return NextResponse.redirect(url);
  }

  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // IMPORTANT: Use getUser() instead of getSession() for secure validation
  // getSession() reads from the JWT payload without validating it
  // getUser() validates the JWT and makes a request to the auth server
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Check if the current route is public
  const isPublicRoute = publicRoutes.some(
    (route) =>
      pathname === route ||
      pathname.startsWith('/callback') ||
      pathname.startsWith('/_next') ||
      pathname.startsWith('/api'),
  );

  // Check if the current route is an auth route
  const isAuthRoute = authRoutes.some((route) => pathname === route);

  // Check if the current route is an onboarding route
  const isOnboardingRoute = onboardingRoutes.some((route) =>
    pathname.startsWith(route),
  );

  // Redirect to login if not authenticated and trying to access protected route
  // Allow onboarding routes only if authenticated
  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirectTo', pathname);
    return NextResponse.redirect(url);
  }

  // Redirect to dashboard if authenticated and trying to access auth pages
  // (login, signup) - but NOT onboarding pages
  if (user && isAuthRoute && !isOnboardingRoute) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
