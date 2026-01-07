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
export * from './decisions';
export * from './people';
export * from './vault';
export * from './goals';
export * from './notifications';
export * from './reminders';
export * from './integrations';
export * from './calendar';
export * from './budgets';
export * from './subscriptions';
export * from './exports';
export * from './habit-freezes';
export * from './embeddings';
export * from './audit';
