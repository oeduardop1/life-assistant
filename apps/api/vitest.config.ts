import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    root: './',
    include: ['test/**/*.spec.ts', 'src/**/*.spec.ts'],
    exclude: ['test/integration/**/*.spec.ts'],
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: [
        'src/main.ts',
        'src/**/*.module.ts',
        'src/**/index.ts',
        'src/**/*.spec.ts',
        'src/**/*.types.ts',
      ],
      thresholds: {
        statements: 100,
        branches: 100,
        functions: 100,
        lines: 100,
      },
    },
    setupFiles: ['./test/setup.ts'],
  },
  resolve: {
    alias: {
      '@': './src',
    },
  },
});
