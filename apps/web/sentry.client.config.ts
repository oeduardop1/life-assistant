/**
 * Sentry client-side configuration for Next.js
 *
 * This file configures the initialization of Sentry on the client (browser).
 * The config you add here will be used whenever a user loads a page in their browser.
 *
 * @see https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup
 */

import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Performance monitoring
  // Sample 10% of requests in production, 100% in development
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Session replay (disabled for MVP - can be enabled later)
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,

  // Environment
  environment: process.env.NODE_ENV || 'development',

  // Only enable in production to avoid noise during development
  enabled: process.env.NODE_ENV === 'production',

  // Debug mode for development troubleshooting
  debug: process.env.NODE_ENV === 'development',
});
