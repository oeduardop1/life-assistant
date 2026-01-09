/**
 * Next.js Instrumentation file for Sentry
 *
 * This file is used by Next.js 15+ to initialize Sentry based on the runtime.
 * The register function is called when the instrumentation is loaded.
 *
 * @see https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup
 */

import * as Sentry from '@sentry/nextjs';

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config');
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config');
  }
}

/**
 * Capture errors from Server Components, middleware, and proxies
 */
export const onRequestError = Sentry.captureRequestError;
