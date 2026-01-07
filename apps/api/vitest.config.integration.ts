import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    root: './',
    include: ['test/integration/**/*.spec.ts'],
    environment: 'node',
    testTimeout: 30000,
    hookTimeout: 30000,
    // No setupFiles - mocks must be set in each test file before imports
  },
  resolve: {
    alias: {
      '@': './src',
    },
  },
});
