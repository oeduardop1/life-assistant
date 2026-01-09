/**
 * Sentry edge runtime configuration for Next.js
 *
 * This file configures the initialization of Sentry for Edge runtimes.
 * The config you add here will be used whenever the edge runtime handles a request.
 *
 * @see https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup
 */

import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Performance monitoring
  // Sample 10% of requests in production, 100% in development
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Environment
  environment: process.env.NODE_ENV || 'development',

  // Only enable in production
  enabled: process.env.NODE_ENV === 'production',
});
