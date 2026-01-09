/**
 * Sentry instrumentation for NestJS
 *
 * IMPORTANT: This file MUST be imported before any other imports in main.ts
 * Per ADR-007, NestJS uses CommonJS, so we use require() here as recommended
 * by the Sentry documentation.
 *
 * @see https://docs.sentry.io/platforms/javascript/guides/node/configuration/integrations/nest
 * @see ADR-007 - NestJS CommonJS Module System
 */

import type * as SentryTypes from '@sentry/nestjs';

// eslint-disable-next-line @typescript-eslint/no-require-imports -- Required for CommonJS per Sentry docs
const Sentry = require('@sentry/nestjs') as typeof SentryTypes;

// Only initialize Sentry if DSN is configured
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV ?? 'development',

    // Performance monitoring
    // Sample 10% of requests in production, 100% in development
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

    // NestJS integration for automatic instrumentation
    integrations: [Sentry.nestIntegration()],

    // Don't send PII by default
    sendDefaultPii: false,

    // Disable in test environment to avoid noise
    enabled: process.env.NODE_ENV !== 'test',
  });
}
