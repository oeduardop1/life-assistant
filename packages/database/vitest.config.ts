import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    include: ['src/**/*.test.ts'],
    // Ensure proper module resolution for barrel exports
    server: {
      deps: {
        inline: [/drizzle-orm/],
      },
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.test.ts',
        'src/migrations/**',
        'src/seed/**',
        'src/sql/**',
        // Exclude runtime client functions (need real DB for integration tests)
        'src/client.ts',
        // Exclude barrel exports (re-export files with no logic)
        'src/schema/index.ts',
        // Exclude table schema files (declarative, not executable code)
        'src/schema/audit.ts',
        'src/schema/budgets.ts',
        'src/schema/calendar.ts',
        'src/schema/conversations.ts',
        'src/schema/decisions.ts',
        'src/schema/exports.ts',
        'src/schema/goals.ts',
        'src/schema/habit-freezes.ts',
        'src/schema/integrations.ts',
        'src/schema/notes.ts',
        'src/schema/notifications.ts',
        'src/schema/people.ts',
        'src/schema/reminders.ts',
        'src/schema/scores.ts',
        'src/schema/subscriptions.ts',
        'src/schema/tracking.ts',
        'src/schema/vault.ts',
      ],
      thresholds: {
        statements: 100,
        branches: 100,
        functions: 100,
        lines: 100,
      },
    },
  },
});
