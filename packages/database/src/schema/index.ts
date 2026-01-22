// packages/database/src/schema/index.ts
// Re-export all schema definitions

// Enums
export * from './enums';

// Preferences (Zod schema for JSONB validation)
export * from './preferences';

// Tables
export * from './users';
export * from './conversations';
export * from './tracking';
export * from './scores';
export * from './notes';
export * from './people';
export * from './vault';
export * from './goals';
export * from './notifications';
export * from './reminders';
export * from './integrations';
export * from './calendar';
export * from './budgets';
export * from './subscriptions';

// Finance Module (M2.2)
export * from './incomes';
export * from './bills';
export * from './variable-expenses';
export * from './debts';
export * from './investments';
export * from './exports';
export * from './habit-freezes';
export * from './audit';

// Memory System (ADR-012)
export * from './user-memories';
export * from './knowledge-items';
export * from './memory-consolidations';
