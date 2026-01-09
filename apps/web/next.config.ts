import type { NextConfig } from 'next';
import { withSentryConfig } from '@sentry/nextjs';

const nextConfig: NextConfig = {
  // Standalone output for Docker
  output: 'standalone',

  // Transpile workspace packages
  transpilePackages: [
    '@life-assistant/shared',
    '@life-assistant/config',
  ],

  // Environment variables
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api',
  },

  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  // Sentry organization and project slugs
  org: process.env.SENTRY_ORG || 'life-assistant',
  project: process.env.SENTRY_PROJECT || 'web',

  // Auth token for source map uploads (set in CI environment)
  authToken: process.env.SENTRY_AUTH_TOKEN,

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,
});
