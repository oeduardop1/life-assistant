import { createBrowserClient } from '@supabase/ssr';

/**
 * Create Supabase client for browser/client components
 *
 * Uses singleton pattern to reuse the same client instance.
 * This client handles cookies automatically in the browser.
 *
 * @see https://supabase.com/docs/guides/auth/server-side/nextjs
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
