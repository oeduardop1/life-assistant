/**
 * Supabase client exports
 *
 * For client components (use client): import { createBrowserClient } from '@/lib/supabase'
 * For server components: import { createClient } from '@/lib/supabase/server'
 *
 * Note: Server client is NOT exported from this barrel to prevent
 * accidental imports in client components (next/headers only works server-side)
 */
export { createClient as createBrowserClient } from './client';
