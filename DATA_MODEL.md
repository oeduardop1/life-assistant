# DATA_MODEL.md — Life Assistant AI
> **Documento normativo.** Define o **modelo de dados completo** do sistema.  
> Schema PostgreSQL com Drizzle ORM.
>
> **Precedência (em caso de conflito):**
> 1. Escopo/features: `PRODUCT_SPECS.md`
> 2. Regras/fluxos/DoD: `SYSTEM_SPECS.md`
> 3. Tech/infra: `ENGINEERING.md`
> 4. IA/Prompts: `AI_SPECS.md`
> 5. **Modelo de dados: `DATA_MODEL.md`** ← este documento
>
> Pendências (TBD): `TBD_TRACKER.md`

---

## 1) Visão Geral

### 1.1 Banco de Dados

- **SGBD:** PostgreSQL 16+
- **ORM:** Drizzle ORM
- **Extensões:** `uuid-ossp`, `vector` (pgvector)
- **Hospedagem:** Supabase

### 1.2 Convenções

| Convenção | Padrão | Exemplo |
|-----------|--------|---------|
| Nomes de tabela | snake_case, plural | `tracking_entries` |
| Nomes de coluna | snake_case | `created_at` |
| Primary keys | `id` UUID | `id uuid primary key` |
| Foreign keys | `{tabela}_id` | `user_id` |
| Timestamps | `created_at`, `updated_at` | Sempre presentes |
| Soft delete | `deleted_at` | Nullable timestamp |
| Enums | PascalCase no código | `LifeArea`, `TrackingType` |

### 1.3 Regras Globais

- **Todas as tabelas** têm `id`, `created_at`, `updated_at`
- **Tabelas de usuário** têm `user_id` com RLS
- **Soft delete** usa `deleted_at` (nullable)
- **UUIDs** gerados com `gen_random_uuid()`
- **Timestamps** sempre em UTC

---

## 2) Diagrama ER

```mermaid
erDiagram
    users ||--o{ conversations : has
    users ||--o{ tracking_entries : has
    users ||--o{ notes : has
    users ||--o{ decisions : has
    users ||--o{ people : has
    users ||--o{ vault_items : has
    users ||--o{ goals : has
    users ||--o{ habits : has
    users ||--o{ notifications : has
    users ||--o{ life_balance_history : has
    users ||--o{ user_integrations : has
    users ||--o{ calendar_events : has
    users ||--o{ budgets : has
    users ||--o{ subscriptions : has
    users ||--o{ export_requests : has

    habits ||--o{ habit_freezes : has

    goals ||--o{ tracking_entries : updates

    conversations ||--o{ messages : contains
    
    decisions ||--o{ decision_options : has
    decisions ||--o{ decision_criteria : has
    
    notes ||--o{ note_links : from
    notes ||--o{ note_links : to
    
    people ||--o{ person_interactions : has
    
    habits ||--o{ habit_completions : has
    
    goals ||--o{ goal_milestones : has

    users {
        uuid id PK
        string email UK
        string name
        string avatar_url
        decimal height
        date birth_date
        string timezone
        string locale
        jsonb preferences
        enum status
        timestamp email_verified_at
        timestamp onboarding_completed_at
        timestamp deleted_at
        timestamp created_at
        timestamp updated_at
    }
    
    conversations {
        uuid id PK
        uuid user_id FK
        enum type
        string title
        jsonb metadata
        timestamp deleted_at
        timestamp created_at
        timestamp updated_at
    }
    
    messages {
        uuid id PK
        uuid conversation_id FK
        enum role
        text content
        jsonb metadata
        jsonb actions
        timestamp created_at
    }
    
    tracking_entries {
        uuid id PK
        uuid user_id FK
        enum type
        enum area
        decimal value
        string unit
        jsonb metadata
        date entry_date
        timestamp entry_time
        string source
        timestamp created_at
        timestamp updated_at
    }
    
    notes {
        uuid id PK
        uuid user_id FK
        string title
        text content
        string excerpt
        string folder
        array tags
        boolean is_pinned
        boolean is_archived
        timestamp deleted_at
        timestamp created_at
        timestamp updated_at
    }
    
    decisions {
        uuid id PK
        uuid user_id FK
        string title
        text description
        enum area
        enum status
        date deadline
        uuid chosen_option_id
        text reasoning
        jsonb ai_analysis
        date review_date
        integer review_score
        text review_notes
        timestamp deleted_at
        timestamp created_at
        timestamp updated_at
    }
    
    people {
        uuid id PK
        uuid user_id FK
        string name
        string nickname
        enum relationship
        string email
        string phone
        date birthday
        date anniversary
        jsonb preferences
        integer contact_frequency_days
        date last_contact
        array tags
        text notes
        boolean is_archived
        timestamp deleted_at
        timestamp created_at
        timestamp updated_at
    }
    
    vault_items {
        uuid id PK
        uuid user_id FK
        enum type
        enum category
        string name
        bytea encrypted_data
        jsonb metadata
        timestamp created_at
        timestamp updated_at
    }
    
    goals {
        uuid id PK
        uuid user_id FK
        string title
        text description
        enum area
        enum status
        decimal target_value
        decimal current_value
        string unit
        date start_date
        date end_date
        timestamp deleted_at
        timestamp created_at
        timestamp updated_at
    }
    
    habits {
        uuid id PK
        uuid user_id FK
        string title
        text description
        enum area
        enum frequency
        array days_of_week
        integer times_per_period
        integer current_streak
        integer longest_streak
        integer total_completions
        time reminder_time
        boolean reminder_enabled
        boolean is_active
        timestamp deleted_at
        timestamp created_at
        timestamp updated_at
    }
```

---

## 3) Enums

### 3.1 Definição SQL

```sql
-- Status do usuário
CREATE TYPE user_status AS ENUM (
  'pending',
  'active',
  'suspended',
  'canceled',
  'deleted'
);

-- Áreas da vida
CREATE TYPE life_area AS ENUM (
  'health',
  'financial',
  'relationships',
  'career',
  'personal_growth',
  'leisure',
  'spirituality',
  'mental_health'
);

-- Tipos de tracking
CREATE TYPE tracking_type AS ENUM (
  'weight',
  'water',
  'sleep',
  'exercise',
  'meal',
  'medication',
  'expense',
  'income',
  'investment',
  'habit',
  'mood',
  'energy',
  'custom'
);

-- Tipos de conversa
CREATE TYPE conversation_type AS ENUM (
  'general',
  'counselor',
  'quick_action',
  'decision',
  'report'
);

-- Role de mensagem
CREATE TYPE message_role AS ENUM (
  'user',
  'assistant',
  'system'
);

-- Status de decisão
CREATE TYPE decision_status AS ENUM (
  'draft',
  'analyzing',
  'ready',
  'decided',
  'postponed',
  'canceled',
  'reviewed'
);

-- Tipo de relacionamento (CRM)
CREATE TYPE relationship_type AS ENUM (
  'family',
  'friend',
  'work',
  'acquaintance',
  'romantic',
  'mentor',
  'other'
);

-- Tipo de interação (CRM)
CREATE TYPE interaction_type AS ENUM (
  'call',
  'message',
  'meeting',
  'email',
  'gift',
  'other'
);

-- Tipo de item do vault
CREATE TYPE vault_item_type AS ENUM (
  'credential',
  'document',
  'card',
  'note',
  'file'
);

-- Categoria do vault
CREATE TYPE vault_category AS ENUM (
  'personal',
  'financial',
  'work',
  'health',
  'legal',
  'other'
);

-- Status de meta
CREATE TYPE goal_status AS ENUM (
  'not_started',
  'in_progress',
  'completed',
  'failed',
  'canceled'
);

-- Frequência de hábito
CREATE TYPE habit_frequency AS ENUM (
  'daily',
  'weekly',
  'custom'
);

-- Tipo de notificação
CREATE TYPE notification_type AS ENUM (
  'reminder',
  'alert',
  'report',
  'insight',
  'milestone',
  'social'
);

-- Status de notificação
CREATE TYPE notification_status AS ENUM (
  'pending',
  'sent',
  'read',
  'dismissed'
);

-- Categoria de despesa
CREATE TYPE expense_category AS ENUM (
  'food',
  'transport',
  'housing',
  'health',
  'education',
  'entertainment',
  'shopping',
  'bills',
  'subscriptions',
  'travel',
  'gifts',
  'investments',
  'other'
);

-- Intensidade de exercício
CREATE TYPE exercise_intensity AS ENUM (
  'low',
  'medium',
  'high'
);

-- Tipo de exercício
CREATE TYPE exercise_type AS ENUM (
  'cardio',
  'strength',
  'flexibility',
  'sports',
  'other'
);

-- Plano do usuário
CREATE TYPE user_plan AS ENUM (
  'free',
  'pro',
  'premium'
);
```

### 3.2 Drizzle ORM Enums

```typescript
// packages/database/src/schema/enums.ts

import { pgEnum } from 'drizzle-orm/pg-core';

export const userStatusEnum = pgEnum('user_status', [
  'pending', 'active', 'suspended', 'canceled', 'deleted'
]);

export const lifeAreaEnum = pgEnum('life_area', [
  'health', 'financial', 'relationships', 'career',
  'personal_growth', 'leisure', 'spirituality', 'mental_health'
]);

export const trackingTypeEnum = pgEnum('tracking_type', [
  'weight', 'water', 'sleep', 'exercise', 'meal', 'medication',
  'expense', 'income', 'investment', 'habit', 'mood', 'energy', 'custom'
]);

export const conversationTypeEnum = pgEnum('conversation_type', [
  'general', 'counselor', 'quick_action', 'decision', 'report'
]);

export const messageRoleEnum = pgEnum('message_role', [
  'user', 'assistant', 'system'
]);

export const decisionStatusEnum = pgEnum('decision_status', [
  'draft', 'analyzing', 'ready', 'decided', 'postponed', 'canceled', 'reviewed'
]);

export const relationshipTypeEnum = pgEnum('relationship_type', [
  'family', 'friend', 'work', 'acquaintance', 'romantic', 'mentor', 'other'
]);

export const interactionTypeEnum = pgEnum('interaction_type', [
  'call', 'message', 'meeting', 'email', 'gift', 'other'
]);

export const vaultItemTypeEnum = pgEnum('vault_item_type', [
  'credential', 'document', 'card', 'note', 'file'
]);

export const vaultCategoryEnum = pgEnum('vault_category', [
  'personal', 'financial', 'work', 'health', 'legal', 'other'
]);

export const goalStatusEnum = pgEnum('goal_status', [
  'not_started', 'in_progress', 'completed', 'failed', 'canceled'
]);

export const habitFrequencyEnum = pgEnum('habit_frequency', [
  'daily', 'weekly', 'custom'
]);

export const notificationTypeEnum = pgEnum('notification_type', [
  'reminder', 'alert', 'report', 'insight', 'milestone', 'social'
]);

export const notificationStatusEnum = pgEnum('notification_status', [
  'pending', 'sent', 'read', 'dismissed'
]);

export const expenseCategoryEnum = pgEnum('expense_category', [
  'food', 'transport', 'housing', 'health', 'education',
  'entertainment', 'shopping', 'bills', 'subscriptions',
  'travel', 'gifts', 'investments', 'other'
]);

export const exerciseIntensityEnum = pgEnum('exercise_intensity', [
  'low', 'medium', 'high'
]);

export const exerciseTypeEnum = pgEnum('exercise_type', [
  'cardio', 'strength', 'flexibility', 'sports', 'other'
]);

export const userPlanEnum = pgEnum('user_plan', [
  'free', 'pro', 'premium'
]);
```

### 3.3 Schema TypeScript para JSONB (Preferências)

O campo `preferences` em `users` é do tipo JSONB. Para garantir consistência e validação em runtime, definimos o schema TypeScript e validação Zod:

```typescript
// packages/database/src/schema/preferences.ts

import { z } from 'zod';

// Schema Zod para validação
export const userPreferencesSchema = z.object({
  // Perspectiva cristã habilitada
  christianPerspective: z.boolean().default(false),

  // Pesos das áreas da vida (0.0 a 1.0)
  areaWeights: z.object({
    health: z.number().min(0).max(1).default(1.0),
    financial: z.number().min(0).max(1).default(1.0),
    relationships: z.number().min(0).max(1).default(1.0),
    career: z.number().min(0).max(1).default(1.0),
    personal_growth: z.number().min(0).max(1).default(0.8),
    leisure: z.number().min(0).max(1).default(0.8),
    spirituality: z.number().min(0).max(1).default(0.5),
    mental_health: z.number().min(0).max(1).default(1.0),
  }).default({}),

  // Configurações de notificação
  notifications: z.object({
    pushEnabled: z.boolean().default(true),
    telegramEnabled: z.boolean().default(false),
    emailEnabled: z.boolean().default(true),
    quietHoursEnabled: z.boolean().default(true),
    quietHoursStart: z.string().regex(/^\d{2}:\d{2}$/).default('22:00'),
    quietHoursEnd: z.string().regex(/^\d{2}:\d{2}$/).default('08:00'),
    morningSummary: z.boolean().default(true),
    morningSummaryTime: z.string().regex(/^\d{2}:\d{2}$/).default('07:00'),
    weeklyReport: z.boolean().default(true),
    monthlyReport: z.boolean().default(true),
  }).default({}),

  // Metas de tracking
  tracking: z.object({
    waterGoal: z.number().int().positive().default(2000), // ml
    sleepGoal: z.number().positive().default(8), // horas
    exerciseGoalWeekly: z.number().int().positive().default(150), // minutos
  }).default({}),

  // Progresso do onboarding
  onboarding: z.object({
    profileComplete: z.boolean().default(false),
    areasComplete: z.boolean().default(false),
    telegramComplete: z.boolean().default(false),
    telegramSkipped: z.boolean().default(false),
    tutorialComplete: z.boolean().default(false),
    tutorialSkipped: z.boolean().default(false),
  }).default({}),
});

// Type inferido do schema
export type UserPreferences = z.infer<typeof userPreferencesSchema>;

// Valor default
export const defaultUserPreferences: UserPreferences = userPreferencesSchema.parse({});

// Função para validar e fazer merge com defaults
export function parseUserPreferences(data: unknown): UserPreferences {
  return userPreferencesSchema.parse(data);
}

// Função para validação parcial (update)
export function validatePartialPreferences(data: unknown): Partial<UserPreferences> {
  return userPreferencesSchema.partial().parse(data);
}
```

**Uso na API:**

```typescript
// Ao criar usuário
const preferences = parseUserPreferences(req.body.preferences ?? {});

// Ao atualizar preferências
const updates = validatePartialPreferences(req.body);
const merged = { ...existingPreferences, ...updates };
```

---

## 4) Tabelas

### 4.1 Users

```typescript
// packages/database/src/schema/users.ts

import { pgTable, uuid, varchar, text, timestamp, jsonb } from 'drizzle-orm/pg-core';
import { userStatusEnum, userPlanEnum } from './enums';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  
  // Auth (synced from Supabase Auth)
  email: varchar('email', { length: 255 }).notNull().unique(),
  
  // Profile
  name: varchar('name', { length: 255 }).notNull(),
  avatarUrl: text('avatar_url'),

  // Physical data (for health calculations like BMI)
  height: decimal('height', { precision: 5, scale: 2 }), // altura em cm
  birthDate: date('birth_date'), // data de nascimento

  // Settings
  timezone: varchar('timezone', { length: 50 }).notNull().default('America/Sao_Paulo'),
  locale: varchar('locale', { length: 10 }).notNull().default('pt-BR'),
  currency: varchar('currency', { length: 3 }).notNull().default('BRL'),
  
  // Preferences (JSON)
  preferences: jsonb('preferences').notNull().default({
    christianPerspective: false,
    areaWeights: {
      health: 1.0,
      financial: 1.0,
      relationships: 1.0,
      career: 1.0,
      personal_growth: 0.8,
      leisure: 0.8,
      spirituality: 0.5,
      mental_health: 1.0,
    },
    notifications: {
      pushEnabled: true,
      telegramEnabled: false,
      emailEnabled: true,
      quietHoursEnabled: true,
      quietHoursStart: '22:00',
      quietHoursEnd: '08:00',
      morningSummary: true,
      morningSummaryTime: '07:00',
      weeklyReport: true,
      monthlyReport: true,
    },
    tracking: {
      waterGoal: 2000,
      sleepGoal: 8,
      exerciseGoalWeekly: 150,
    },
  }),
  
  // Plan & Billing
  plan: userPlanEnum('plan').notNull().default('free'),
  planExpiresAt: timestamp('plan_expires_at', { withTimezone: true }),
  stripeCustomerId: varchar('stripe_customer_id', { length: 255 }),
  
  // Status
  status: userStatusEnum('status').notNull().default('pending'),
  emailVerifiedAt: timestamp('email_verified_at', { withTimezone: true }),
  onboardingCompletedAt: timestamp('onboarding_completed_at', { withTimezone: true }),
  
  // Soft delete
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  
  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// Types
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
```

### 4.2 Conversations & Messages

```typescript
// packages/database/src/schema/conversations.ts

import { pgTable, uuid, varchar, text, timestamp, jsonb, index } from 'drizzle-orm/pg-core';
import { conversationTypeEnum, messageRoleEnum } from './enums';
import { users } from './users';

export const conversations = pgTable('conversations', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  
  type: conversationTypeEnum('type').notNull().default('general'),
  title: varchar('title', { length: 255 }),
  
  // Metadata (ex: decision_id se type='decision')
  metadata: jsonb('metadata'),
  
  // Soft delete
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  
  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index('conversations_user_id_idx').on(table.userId),
  createdAtIdx: index('conversations_created_at_idx').on(table.createdAt),
}));

export const messages = pgTable('messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  conversationId: uuid('conversation_id').notNull().references(() => conversations.id, { onDelete: 'cascade' }),
  
  role: messageRoleEnum('role').notNull(),
  content: text('content').notNull(),
  
  // Metadata (tokens, model, etc)
  metadata: jsonb('metadata'),
  
  // Actions extracted from response
  actions: jsonb('actions'),
  
  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  conversationIdIdx: index('messages_conversation_id_idx').on(table.conversationId),
  createdAtIdx: index('messages_created_at_idx').on(table.createdAt),
}));

// Types
export type Conversation = typeof conversations.$inferSelect;
export type NewConversation = typeof conversations.$inferInsert;
export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
```

### 4.3 Tracking Entries

```typescript
// packages/database/src/schema/tracking.ts

import { pgTable, uuid, decimal, varchar, date, timestamp, jsonb, index } from 'drizzle-orm/pg-core';
import { trackingTypeEnum, lifeAreaEnum, expenseCategoryEnum, exerciseTypeEnum, exerciseIntensityEnum } from './enums';
import { users } from './users';

export const trackingEntries = pgTable('tracking_entries', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  
  // Type & Area
  type: trackingTypeEnum('type').notNull(),
  area: lifeAreaEnum('area').notNull(),
  
  // Value
  value: decimal('value', { precision: 10, scale: 2 }).notNull(),
  unit: varchar('unit', { length: 20 }),
  
  // Metadata específico por tipo
  // weight: {}
  // water: {}
  // expense: { category, description, currency }
  // exercise: { exerciseType, intensity, distance, calories }
  // sleep: { quality, bedtime, waketime }
  // mood/energy: { notes }
  metadata: jsonb('metadata').notNull().default({}),
  
  // Date/Time
  entryDate: date('entry_date').notNull(),
  entryTime: timestamp('entry_time', { withTimezone: true }),
  
  // Source (chat, form, api, telegram)
  source: varchar('source', { length: 50 }).notNull().default('form'),
  
  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index('tracking_entries_user_id_idx').on(table.userId),
  userIdTypeIdx: index('tracking_entries_user_id_type_idx').on(table.userId, table.type),
  userIdDateIdx: index('tracking_entries_user_id_date_idx').on(table.userId, table.entryDate),
  entryDateIdx: index('tracking_entries_entry_date_idx').on(table.entryDate),
}));

// Types
export type TrackingEntry = typeof trackingEntries.$inferSelect;
export type NewTrackingEntry = typeof trackingEntries.$inferInsert;
```

### 4.4 Life Balance Scores

```typescript
// packages/database/src/schema/scores.ts

import { pgTable, uuid, integer, decimal, date, jsonb, timestamp, index, unique } from 'drizzle-orm/pg-core';
import { users } from './users';

export const lifeBalanceHistory = pgTable('life_balance_history', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  
  // Date of snapshot
  snapshotDate: date('snapshot_date').notNull(),
  
  // Overall score
  overallScore: integer('overall_score').notNull(), // 0-100
  
  // Area scores
  areaScores: jsonb('area_scores').notNull(),
  // {
  //   health: { score: 75, components: { weight: 80, exercise: 70, ... } },
  //   financial: { score: 60, components: { budget: 50, savings: 70, ... } },
  //   ...
  // }
  
  // Weights used
  weightsUsed: jsonb('weights_used').notNull(),
  
  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index('life_balance_history_user_id_idx').on(table.userId),
  snapshotDateIdx: index('life_balance_history_snapshot_date_idx').on(table.snapshotDate),
  userDateUnique: unique('life_balance_history_user_date_unique').on(table.userId, table.snapshotDate),
}));

// Types
export type LifeBalanceHistory = typeof lifeBalanceHistory.$inferSelect;
export type NewLifeBalanceHistory = typeof lifeBalanceHistory.$inferInsert;
```

### 4.5 Notes (Segundo Cérebro)

```typescript
// packages/database/src/schema/notes.ts

import { pgTable, uuid, varchar, text, boolean, timestamp, jsonb, index } from 'drizzle-orm/pg-core';
import { users } from './users';

export const notes = pgTable('notes', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  
  // Content
  title: varchar('title', { length: 500 }).notNull(),
  content: text('content').notNull().default(''),
  excerpt: varchar('excerpt', { length: 500 }),
  
  // Organization
  folder: varchar('folder', { length: 255 }),
  tags: jsonb('tags').notNull().default([]), // string[]
  
  // Status
  isPinned: boolean('is_pinned').notNull().default(false),
  isArchived: boolean('is_archived').notNull().default(false),
  
  // Soft delete (trash)
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  
  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index('notes_user_id_idx').on(table.userId),
  userIdFolderIdx: index('notes_user_id_folder_idx').on(table.userId, table.folder),
  titleIdx: index('notes_title_idx').on(table.title),
}));

// Links between notes (wikilinks)
export const noteLinks = pgTable('note_links', {
  id: uuid('id').primaryKey().defaultRandom(),
  
  sourceNoteId: uuid('source_note_id').notNull().references(() => notes.id, { onDelete: 'cascade' }),
  targetNoteId: uuid('target_note_id').notNull().references(() => notes.id, { onDelete: 'cascade' }),
  
  // Link text (if different from title)
  linkText: varchar('link_text', { length: 255 }),
  
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  sourceIdx: index('note_links_source_idx').on(table.sourceNoteId),
  targetIdx: index('note_links_target_idx').on(table.targetNoteId),
}));

// Types
export type Note = typeof notes.$inferSelect;
export type NewNote = typeof notes.$inferInsert;
export type NoteLink = typeof noteLinks.$inferSelect;
export type NewNoteLink = typeof noteLinks.$inferInsert;
```

### 4.6 Decisions

```typescript
// packages/database/src/schema/decisions.ts

import { pgTable, uuid, varchar, text, date, integer, timestamp, jsonb, index } from 'drizzle-orm/pg-core';
import { decisionStatusEnum, lifeAreaEnum } from './enums';
import { users } from './users';

export const decisions = pgTable('decisions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  
  // Basic info
  title: varchar('title', { length: 500 }).notNull(),
  description: text('description'),
  area: lifeAreaEnum('area').notNull(),
  deadline: date('deadline'),
  
  // Status
  status: decisionStatusEnum('status').notNull().default('draft'),
  
  // Result
  chosenOptionId: uuid('chosen_option_id'),
  reasoning: text('reasoning'),
  
  // AI Analysis
  aiAnalysis: jsonb('ai_analysis'),
  // {
  //   summary: string,
  //   recommendation?: string,
  //   riskAssessment: string,
  //   questionsToConsider: string[],
  //   generatedAt: Date
  // }
  
  // Review
  reviewDate: date('review_date'),
  reviewScore: integer('review_score'), // 1-10
  reviewNotes: text('review_notes'),
  
  // Soft delete
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  
  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index('decisions_user_id_idx').on(table.userId),
  statusIdx: index('decisions_status_idx').on(table.status),
}));

export const decisionOptions = pgTable('decision_options', {
  id: uuid('id').primaryKey().defaultRandom(),
  decisionId: uuid('decision_id').notNull().references(() => decisions.id, { onDelete: 'cascade' }),
  
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  
  pros: jsonb('pros').notNull().default([]), // string[]
  cons: jsonb('cons').notNull().default([]), // string[]
  
  // Calculated score
  score: integer('score'), // 0-100
  
  // Order
  sortOrder: integer('sort_order').notNull().default(0),
  
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  decisionIdIdx: index('decision_options_decision_id_idx').on(table.decisionId),
}));

export const decisionCriteria = pgTable('decision_criteria', {
  id: uuid('id').primaryKey().defaultRandom(),
  decisionId: uuid('decision_id').notNull().references(() => decisions.id, { onDelete: 'cascade' }),
  
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  weight: integer('weight').notNull().default(5), // 1-10
  
  // Order
  sortOrder: integer('sort_order').notNull().default(0),
  
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  decisionIdIdx: index('decision_criteria_decision_id_idx').on(table.decisionId),
}));

// Scores per option per criterion
export const decisionScores = pgTable('decision_scores', {
  id: uuid('id').primaryKey().defaultRandom(),
  optionId: uuid('option_id').notNull().references(() => decisionOptions.id, { onDelete: 'cascade' }),
  criterionId: uuid('criterion_id').notNull().references(() => decisionCriteria.id, { onDelete: 'cascade' }),
  
  score: integer('score').notNull(), // 1-10
  
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  optionIdIdx: index('decision_scores_option_id_idx').on(table.optionId),
}));

// Types
export type Decision = typeof decisions.$inferSelect;
export type NewDecision = typeof decisions.$inferInsert;
export type DecisionOption = typeof decisionOptions.$inferSelect;
export type DecisionCriterion = typeof decisionCriteria.$inferSelect;
```

### 4.7 People (CRM)

```typescript
// packages/database/src/schema/people.ts

import { pgTable, uuid, varchar, text, date, integer, boolean, timestamp, jsonb, index } from 'drizzle-orm/pg-core';
import { relationshipTypeEnum, interactionTypeEnum } from './enums';
import { users } from './users';

export const people = pgTable('people', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  
  // Basic info
  name: varchar('name', { length: 255 }).notNull(),
  nickname: varchar('nickname', { length: 100 }),
  relationship: relationshipTypeEnum('relationship').notNull(),
  
  // Contact
  email: varchar('email', { length: 255 }),
  phone: varchar('phone', { length: 50 }),
  
  // Important dates
  birthday: date('birthday'),
  anniversary: date('anniversary'),
  
  // Preferences
  preferences: jsonb('preferences').notNull().default({
    interests: [],
    dislikes: [],
    giftIdeas: [],
    dietaryRestrictions: [],
    importantTopics: [],
  }),
  
  // Contact frequency
  contactFrequencyDays: integer('contact_frequency_days'),
  lastContact: date('last_contact'),
  
  // Organization
  tags: jsonb('tags').notNull().default([]), // string[]
  notes: text('notes'),
  
  // Status
  isArchived: boolean('is_archived').notNull().default(false),
  
  // Soft delete
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  
  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index('people_user_id_idx').on(table.userId),
  nameIdx: index('people_name_idx').on(table.name),
}));

// Linked notes
export const personNotes = pgTable('person_notes', {
  id: uuid('id').primaryKey().defaultRandom(),
  personId: uuid('person_id').notNull().references(() => people.id, { onDelete: 'cascade' }),
  noteId: uuid('note_id').notNull().references(() => notes.id, { onDelete: 'cascade' }),

  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  personIdIdx: index('person_notes_person_id_idx').on(table.personId),
  noteIdIdx: index('person_notes_note_id_idx').on(table.noteId),
}));

// Interactions
export const personInteractions = pgTable('person_interactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  personId: uuid('person_id').notNull().references(() => people.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  
  type: interactionTypeEnum('type').notNull(),
  date: date('date').notNull(),
  notes: text('notes'),
  
  // Optional link to conversation
  conversationId: uuid('conversation_id'),
  
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  personIdIdx: index('person_interactions_person_id_idx').on(table.personId),
  dateIdx: index('person_interactions_date_idx').on(table.date),
}));

// Types
export type Person = typeof people.$inferSelect;
export type NewPerson = typeof people.$inferInsert;
export type PersonInteraction = typeof personInteractions.$inferSelect;
```

### 4.8 Vault

```typescript
// packages/database/src/schema/vault.ts

import { pgTable, uuid, varchar, timestamp, jsonb, customType, index } from 'drizzle-orm/pg-core';
import { vaultItemTypeEnum, vaultCategoryEnum } from './enums';
import { users } from './users';

// Custom type for encrypted data (bytea)
const bytea = customType<{ data: Buffer }>({
  dataType() {
    return 'bytea';
  },
});

export const vaultItems = pgTable('vault_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  
  // Type & Category
  type: vaultItemTypeEnum('type').notNull(),
  category: vaultCategoryEnum('category').notNull(),
  
  // Name (not encrypted, for listing)
  name: varchar('name', { length: 255 }).notNull(),
  
  // Encrypted data (AES-256)
  encryptedData: bytea('encrypted_data').notNull(),
  
  // Metadata (not sensitive, for search)
  metadata: jsonb('metadata').notNull().default({}),
  // credential: { url }
  // document: { documentType, expiresAt }
  // card: { cardType, lastFour }
  // file: { mimeType, size }
  
  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index('vault_items_user_id_idx').on(table.userId),
  categoryIdx: index('vault_items_category_idx').on(table.category),
}));

// Types
export type VaultItem = typeof vaultItems.$inferSelect;
export type NewVaultItem = typeof vaultItems.$inferInsert;
```

### 4.9 Goals & Habits

```typescript
// packages/database/src/schema/goals.ts

import { pgTable, uuid, varchar, text, decimal, date, integer, boolean, time, timestamp, jsonb, index } from 'drizzle-orm/pg-core';
import { goalStatusEnum, habitFrequencyEnum, lifeAreaEnum } from './enums';
import { users } from './users';

export const goals = pgTable('goals', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  
  // Basic info
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  area: lifeAreaEnum('area').notNull(),
  
  // Target
  targetValue: decimal('target_value', { precision: 10, scale: 2 }).notNull(),
  currentValue: decimal('current_value', { precision: 10, scale: 2 }).notNull().default('0'),
  unit: varchar('unit', { length: 50 }).notNull(),
  
  // Timeline
  startDate: date('start_date').notNull(),
  endDate: date('end_date').notNull(),
  
  // Status
  status: goalStatusEnum('status').notNull().default('not_started'),
  
  // Soft delete
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  
  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index('goals_user_id_idx').on(table.userId),
  statusIdx: index('goals_status_idx').on(table.status),
}));

export const goalMilestones = pgTable('goal_milestones', {
  id: uuid('id').primaryKey().defaultRandom(),
  goalId: uuid('goal_id').notNull().references(() => goals.id, { onDelete: 'cascade' }),
  
  title: varchar('title', { length: 255 }).notNull(),
  targetValue: decimal('target_value', { precision: 10, scale: 2 }).notNull(),
  completed: boolean('completed').notNull().default(false),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  
  sortOrder: integer('sort_order').notNull().default(0),
  
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  goalIdIdx: index('goal_milestones_goal_id_idx').on(table.goalId),
}));

export const habits = pgTable('habits', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  
  // Basic info
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  area: lifeAreaEnum('area').notNull(),
  
  // Frequency
  frequency: habitFrequencyEnum('frequency').notNull(),
  daysOfWeek: jsonb('days_of_week').default([]), // number[] (0-6)
  timesPerPeriod: integer('times_per_period'),
  
  // Streaks
  currentStreak: integer('current_streak').notNull().default(0),
  longestStreak: integer('longest_streak').notNull().default(0),
  totalCompletions: integer('total_completions').notNull().default(0),
  
  // Reminder
  reminderTime: time('reminder_time'),
  reminderEnabled: boolean('reminder_enabled').notNull().default(false),
  
  // Status
  isActive: boolean('is_active').notNull().default(true),
  
  // Soft delete
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  
  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index('habits_user_id_idx').on(table.userId),
  isActiveIdx: index('habits_is_active_idx').on(table.isActive),
}));

export const habitCompletions = pgTable('habit_completions', {
  id: uuid('id').primaryKey().defaultRandom(),
  habitId: uuid('habit_id').notNull().references(() => habits.id, { onDelete: 'cascade' }),
  
  date: date('date').notNull(),
  completed: boolean('completed').notNull().default(true),
  notes: text('notes'),
  
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  habitIdIdx: index('habit_completions_habit_id_idx').on(table.habitId),
  dateIdx: index('habit_completions_date_idx').on(table.date),
}));

// Types
export type Goal = typeof goals.$inferSelect;
export type NewGoal = typeof goals.$inferInsert;
export type Habit = typeof habits.$inferSelect;
export type NewHabit = typeof habits.$inferInsert;
export type HabitCompletion = typeof habitCompletions.$inferSelect;
```

### 4.10 Notifications

```typescript
// packages/database/src/schema/notifications.ts

import { pgTable, uuid, varchar, text, timestamp, jsonb, index } from 'drizzle-orm/pg-core';
import { notificationTypeEnum, notificationStatusEnum } from './enums';
import { users } from './users';

export const notifications = pgTable('notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  
  // Type & Content
  type: notificationTypeEnum('type').notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  body: text('body'),
  
  // Status
  status: notificationStatusEnum('status').notNull().default('pending'),
  
  // Scheduling
  scheduledFor: timestamp('scheduled_for', { withTimezone: true }),
  sentAt: timestamp('sent_at', { withTimezone: true }),
  readAt: timestamp('read_at', { withTimezone: true }),
  
  // Channels sent
  channels: jsonb('channels').notNull().default([]), // string[] ('push', 'telegram', 'email')
  
  // Link to related entity
  metadata: jsonb('metadata'),
  // { entityType: 'reminder', entityId: '...', url: '/reminders/...' }
  
  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index('notifications_user_id_idx').on(table.userId),
  statusIdx: index('notifications_status_idx').on(table.status),
  scheduledForIdx: index('notifications_scheduled_for_idx').on(table.scheduledFor),
}));

// Types
export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;
```

### 4.11 Reminders

```typescript
// packages/database/src/schema/reminders.ts

import { pgTable, uuid, varchar, text, timestamp, boolean, jsonb, index } from 'drizzle-orm/pg-core';
import { users } from './users';

export const reminders = pgTable('reminders', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  
  // Content
  title: varchar('title', { length: 500 }).notNull(),
  description: text('description'),
  
  // Schedule
  remindAt: timestamp('remind_at', { withTimezone: true }).notNull(),
  
  // Repeat
  repeatPattern: varchar('repeat_pattern', { length: 50 }), // 'daily', 'weekly', 'monthly', null
  repeatUntil: timestamp('repeat_until', { withTimezone: true }),
  
  // Status
  completed: boolean('completed').notNull().default(false),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  
  // Metadata
  metadata: jsonb('metadata'),
  
  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index('reminders_user_id_idx').on(table.userId),
  remindAtIdx: index('reminders_remind_at_idx').on(table.remindAt),
  completedIdx: index('reminders_completed_idx').on(table.completed),
}));

// Types
export type Reminder = typeof reminders.$inferSelect;
export type NewReminder = typeof reminders.$inferInsert;
```

### 4.12 Integrations

```typescript
// packages/database/src/schema/integrations.ts

import { pgTable, uuid, varchar, timestamp, jsonb, boolean, index } from 'drizzle-orm/pg-core';
import { users } from './users';

export const userIntegrations = pgTable('user_integrations', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  
  // Integration type
  provider: varchar('provider', { length: 50 }).notNull(), // 'telegram', 'google_calendar', 'whatsapp'
  
  // Provider-specific ID
  externalId: varchar('external_id', { length: 255 }),
  
  // Credentials (encrypted or tokens)
  credentials: jsonb('credentials'), // { accessToken, refreshToken, expiresAt }
  
  // Status
  isActive: boolean('is_active').notNull().default(true),
  lastSyncAt: timestamp('last_sync_at', { withTimezone: true }),
  lastError: text('last_error'),
  
  // Settings
  settings: jsonb('settings').notNull().default({}),
  
  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index('user_integrations_user_id_idx').on(table.userId),
  providerIdx: index('user_integrations_provider_idx').on(table.provider),
  userProviderUnique: index('user_integrations_user_provider_unique').on(table.userId, table.provider),
}));

// Types
export type UserIntegration = typeof userIntegrations.$inferSelect;
export type NewUserIntegration = typeof userIntegrations.$inferInsert;
```

### 4.13 Calendar Events

```typescript
// packages/database/src/schema/calendar.ts

import { pgTable, uuid, varchar, text, timestamp, boolean, jsonb, index } from 'drizzle-orm/pg-core';
import { users } from './users';

export const calendarEvents = pgTable('calendar_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),

  // External reference (Google Calendar)
  externalId: varchar('external_id', { length: 255 }).notNull(),
  calendarId: varchar('calendar_id', { length: 255 }).notNull(),

  // Event details
  title: varchar('title', { length: 500 }).notNull(),
  description: text('description'),
  location: varchar('location', { length: 500 }),

  // Timing
  startTime: timestamp('start_time', { withTimezone: true }).notNull(),
  endTime: timestamp('end_time', { withTimezone: true }).notNull(),
  isAllDay: boolean('is_all_day').notNull().default(false),
  timezone: varchar('timezone', { length: 50 }),

  // Recurrence
  isRecurring: boolean('is_recurring').notNull().default(false),
  recurrenceRule: varchar('recurrence_rule', { length: 255 }),

  // Status
  status: varchar('status', { length: 20 }).notNull().default('confirmed'), // confirmed, tentative, cancelled

  // Sync metadata
  syncedAt: timestamp('synced_at', { withTimezone: true }).notNull(),
  etag: varchar('etag', { length: 255 }),

  // Additional metadata from provider
  metadata: jsonb('metadata'),

  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index('calendar_events_user_id_idx').on(table.userId),
  externalIdIdx: index('calendar_events_external_id_idx').on(table.externalId),
  startTimeIdx: index('calendar_events_start_time_idx').on(table.startTime),
  userIdStartTimeIdx: index('calendar_events_user_id_start_time_idx').on(table.userId, table.startTime),
}));

// Types
export type CalendarEvent = typeof calendarEvents.$inferSelect;
export type NewCalendarEvent = typeof calendarEvents.$inferInsert;
```

### 4.14 Budgets

```typescript
// packages/database/src/schema/budgets.ts

import { pgTable, uuid, varchar, decimal, integer, date, timestamp, jsonb, index, unique } from 'drizzle-orm/pg-core';
import { expenseCategoryEnum } from './enums';
import { users } from './users';

export const budgets = pgTable('budgets', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),

  // Period
  year: integer('year').notNull(),
  month: integer('month').notNull(), // 1-12

  // Category (optional - null means total budget)
  category: expenseCategoryEnum('category'),

  // Amount
  amount: decimal('amount', { precision: 12, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 3 }).notNull().default('BRL'),

  // Tracking
  spentAmount: decimal('spent_amount', { precision: 12, scale: 2 }).notNull().default('0'),

  // Notes
  notes: text('notes'),

  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index('budgets_user_id_idx').on(table.userId),
  yearMonthIdx: index('budgets_year_month_idx').on(table.year, table.month),
  userYearMonthCategoryUnique: unique('budgets_user_year_month_category_unique').on(
    table.userId, table.year, table.month, table.category
  ),
}));

// Types
export type Budget = typeof budgets.$inferSelect;
export type NewBudget = typeof budgets.$inferInsert;
```

### 4.15 Subscriptions (Stripe local copy)

```typescript
// packages/database/src/schema/subscriptions.ts

import { pgTable, uuid, varchar, timestamp, jsonb, index } from 'drizzle-orm/pg-core';
import { users } from './users';

// Status de assinatura
export const subscriptionStatusEnum = pgEnum('subscription_status', [
  'active', 'past_due', 'canceled', 'incomplete', 'incomplete_expired', 'trialing', 'unpaid', 'paused'
]);

export const subscriptions = pgTable('subscriptions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),

  // Stripe references
  stripeSubscriptionId: varchar('stripe_subscription_id', { length: 255 }).notNull().unique(),
  stripePriceId: varchar('stripe_price_id', { length: 255 }).notNull(),
  stripeCustomerId: varchar('stripe_customer_id', { length: 255 }).notNull(),

  // Status
  status: subscriptionStatusEnum('status').notNull(),

  // Period
  currentPeriodStart: timestamp('current_period_start', { withTimezone: true }).notNull(),
  currentPeriodEnd: timestamp('current_period_end', { withTimezone: true }).notNull(),

  // Cancellation
  cancelAtPeriodEnd: boolean('cancel_at_period_end').notNull().default(false),
  canceledAt: timestamp('canceled_at', { withTimezone: true }),

  // Trial
  trialStart: timestamp('trial_start', { withTimezone: true }),
  trialEnd: timestamp('trial_end', { withTimezone: true }),

  // Metadata from Stripe
  metadata: jsonb('metadata'),

  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index('subscriptions_user_id_idx').on(table.userId),
  stripeSubscriptionIdIdx: index('subscriptions_stripe_subscription_id_idx').on(table.stripeSubscriptionId),
  statusIdx: index('subscriptions_status_idx').on(table.status),
}));

// Types
export type Subscription = typeof subscriptions.$inferSelect;
export type NewSubscription = typeof subscriptions.$inferInsert;
```

### 4.16 Export Requests (LGPD)

```typescript
// packages/database/src/schema/exports.ts

import { pgTable, uuid, varchar, timestamp, jsonb, index } from 'drizzle-orm/pg-core';
import { users } from './users';

// Status do export
export const exportStatusEnum = pgEnum('export_status', [
  'pending', 'processing', 'completed', 'failed', 'expired'
]);

// Tipo de export
export const exportTypeEnum = pgEnum('export_type', [
  'full_data', 'partial_data', 'deletion_request'
]);

export const exportRequests = pgTable('export_requests', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),

  // Type & Status
  type: exportTypeEnum('type').notNull(),
  status: exportStatusEnum('status').notNull().default('pending'),

  // Request details
  requestedAt: timestamp('requested_at', { withTimezone: true }).notNull().defaultNow(),
  processedAt: timestamp('processed_at', { withTimezone: true }),
  completedAt: timestamp('completed_at', { withTimezone: true }),

  // Result
  fileUrl: varchar('file_url', { length: 1000 }), // Signed URL to download
  fileExpiresAt: timestamp('file_expires_at', { withTimezone: true }),
  fileSizeBytes: integer('file_size_bytes'),

  // Error handling
  errorMessage: text('error_message'),
  retryCount: integer('retry_count').notNull().default(0),

  // Metadata (sections included, format, etc)
  metadata: jsonb('metadata'),

  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index('export_requests_user_id_idx').on(table.userId),
  statusIdx: index('export_requests_status_idx').on(table.status),
  requestedAtIdx: index('export_requests_requested_at_idx').on(table.requestedAt),
}));

// Types
export type ExportRequest = typeof exportRequests.$inferSelect;
export type NewExportRequest = typeof exportRequests.$inferInsert;
```

### 4.17 Habit Freezes

```typescript
// packages/database/src/schema/habit-freezes.ts

import { pgTable, uuid, date, text, timestamp, index } from 'drizzle-orm/pg-core';
import { habits } from './goals';
import { users } from './users';

export const habitFreezes = pgTable('habit_freezes', {
  id: uuid('id').primaryKey().defaultRandom(),
  habitId: uuid('habit_id').notNull().references(() => habits.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),

  // Freeze period
  startDate: date('start_date').notNull(),
  endDate: date('end_date').notNull(),

  // Reason (optional)
  reason: text('reason'),

  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  habitIdIdx: index('habit_freezes_habit_id_idx').on(table.habitId),
  userIdIdx: index('habit_freezes_user_id_idx').on(table.userId),
  dateRangeIdx: index('habit_freezes_date_range_idx').on(table.startDate, table.endDate),
}));

// Types
export type HabitFreeze = typeof habitFreezes.$inferSelect;
export type NewHabitFreeze = typeof habitFreezes.$inferInsert;
```

### 4.18 Embeddings (RAG)

> **Nota sobre dimensão:** Usamos `vector(768)` para compatibilidade com o modelo de embeddings do Google (text-embedding-004).
> Se houver migração para outro provider, será necessário re-indexar todos os embeddings.

```typescript
// packages/database/src/schema/embeddings.ts

import { pgTable, uuid, varchar, text, timestamp, index, customType } from 'drizzle-orm/pg-core';
import { users } from './users';

// Custom type for vector (768 dimensões - Google text-embedding-004)
// Se mudar de provider, será necessário migração de todos os vetores
const vector = customType<{ data: number[] }>({
  dataType() {
    return 'vector(768)';
  },
});

export const embeddings = pgTable('embeddings', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  
  // Source
  sourceType: varchar('source_type', { length: 50 }).notNull(), // 'message', 'note', 'decision', 'tracking', 'person'
  sourceId: uuid('source_id').notNull(),
  
  // Content
  content: text('content').notNull(),
  chunkIndex: varchar('chunk_index', { length: 10 }).notNull().default('0'),
  
  // Vector
  embedding: vector('embedding').notNull(),
  
  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index('embeddings_user_id_idx').on(table.userId),
  sourceIdx: index('embeddings_source_idx').on(table.sourceType, table.sourceId),
  // Vector index created separately via SQL
}));

// Types
export type Embedding = typeof embeddings.$inferSelect;
export type NewEmbedding = typeof embeddings.$inferInsert;
```

### 4.19 Audit Log

> **Nota sobre LGPD:** O `user_id` é mantido mesmo após exclusão do usuário (não usa CASCADE nem SET NULL).
> Isso permite rastrear ações para investigações de segurança sem identificar a pessoa (dados pessoais são deletados, mas o ID permanece como referência anônima).

```typescript
// packages/database/src/schema/audit.ts

import { pgTable, uuid, varchar, text, timestamp, jsonb, index } from 'drizzle-orm/pg-core';

export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  // Não usa FK para manter ID mesmo após exclusão do usuário (LGPD compliance)
  // Permite rastrear ações sem identificar pessoa (ID anonimizado)
  userId: uuid('user_id'),
  
  // Action
  action: varchar('action', { length: 100 }).notNull(), // 'vault.access', 'user.login', etc
  resource: varchar('resource', { length: 100 }).notNull(), // 'vault_item', 'user', etc
  resourceId: uuid('resource_id'),
  
  // Details
  metadata: jsonb('metadata'), // { previousValue, newValue, reason }
  
  // Request info
  ip: varchar('ip', { length: 45 }),
  userAgent: text('user_agent'),
  
  // Timestamp
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index('audit_logs_user_id_idx').on(table.userId),
  actionIdx: index('audit_logs_action_idx').on(table.action),
  createdAtIdx: index('audit_logs_created_at_idx').on(table.createdAt),
}));

// Types
export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;
```

---

## 5) Índices Especiais

### 5.1 Full-Text Search (Notes)

```sql
-- Índice para busca full-text em notas
CREATE INDEX notes_content_search_idx ON notes 
USING gin(to_tsvector('portuguese', title || ' ' || content));

-- Função de busca
CREATE OR REPLACE FUNCTION search_notes(
  p_user_id uuid,
  p_query text,
  p_limit int DEFAULT 20
)
RETURNS SETOF notes AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM notes
  WHERE user_id = p_user_id
    AND deleted_at IS NULL
    AND to_tsvector('portuguese', title || ' ' || content) @@ plainto_tsquery('portuguese', p_query)
  ORDER BY ts_rank(to_tsvector('portuguese', title || ' ' || content), plainto_tsquery('portuguese', p_query)) DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;
```

### 5.2 Vector Search (Embeddings)

```sql
-- Índice HNSW para busca de similaridade
CREATE INDEX embeddings_vector_idx ON embeddings 
USING hnsw (embedding vector_cosine_ops);

-- Função de busca semântica
CREATE OR REPLACE FUNCTION search_embeddings(
  p_user_id uuid,
  p_query_embedding vector(768),  -- 768 dimensões (Google text-embedding-004)
  p_limit int DEFAULT 5,
  p_threshold float DEFAULT 0.7
)
RETURNS TABLE (
  id uuid,
  source_type varchar,
  source_id uuid,
  content text,
  similarity float
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.id,
    e.source_type,
    e.source_id,
    e.content,
    1 - (e.embedding <=> p_query_embedding) as similarity
  FROM embeddings e
  WHERE e.user_id = p_user_id
    AND 1 - (e.embedding <=> p_query_embedding) >= p_threshold
  ORDER BY e.embedding <=> p_query_embedding
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;
```

### 5.3 Índices GIN para JSONB e Arrays

```sql
-- Índice GIN para busca em preferências (JSONB)
CREATE INDEX idx_user_preferences_gin ON users USING GIN (preferences);
CREATE INDEX idx_people_preferences_gin ON people USING GIN (preferences);
CREATE INDEX idx_vault_metadata_gin ON vault_items USING GIN (metadata);
CREATE INDEX idx_tracking_metadata_gin ON tracking_entries USING GIN (metadata);

-- Índice GIN para arrays (tags)
CREATE INDEX idx_notes_tags_gin ON notes USING GIN (tags);
CREATE INDEX idx_people_tags_gin ON people USING GIN (tags);

-- Índice para busca por entry_date (já existe mas documentamos aqui para completude)
-- CREATE INDEX idx_tracking_entries_entry_date ON tracking_entries (entry_date);
-- CREATE INDEX idx_tracking_entries_user_date ON tracking_entries (user_id, entry_date);
```

---

## 6) Row Level Security (RLS)

### 6.1 Habilitar RLS

```sql
-- Habilitar RLS em todas as tabelas de usuário
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracking_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE life_balance_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE note_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE decision_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE decision_criteria ENABLE ROW LEVEL SECURITY;
ALTER TABLE decision_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE people ENABLE ROW LEVEL SECURITY;
ALTER TABLE person_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE person_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE vault_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE goal_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE habit_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE export_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE habit_freezes ENABLE ROW LEVEL SECURITY;
```

### 6.2 Policies

> **Nota sobre performance:** Usamos `(SELECT auth.user_id())` em vez de `auth.user_id()` diretamente.
> Isso garante que a função seja executada **uma vez por query** em vez de uma vez por linha.
> Ver: https://supabase.com/docs/guides/database/database-advisors?lint=0003_auth_rls_initplan

```sql
-- Função helper para obter user_id do contexto
-- Usa NULLIF para tratar strings vazias como NULL
CREATE OR REPLACE FUNCTION auth.user_id() RETURNS uuid AS $$
  SELECT COALESCE(
    NULLIF(current_setting('app.user_id', true), '')::uuid,
    NULLIF(current_setting('request.jwt.claims', true)::json->>'sub', '')::uuid
  );
$$ LANGUAGE sql STABLE;

-- Policy genérica para tabelas com user_id
-- IMPORTANTE: Usar (SELECT auth.user_id()) para performance
CREATE POLICY "Users can only access own data" ON users
  FOR ALL USING (id = (SELECT auth.user_id()));

CREATE POLICY "Users can only access own conversations" ON conversations
  FOR ALL USING (user_id = (SELECT auth.user_id()));

CREATE POLICY "Users can only access own messages" ON messages
  FOR ALL USING (
    conversation_id IN (
      SELECT id FROM conversations WHERE user_id = (SELECT auth.user_id())
    )
  );

CREATE POLICY "Users can only access own tracking" ON tracking_entries
  FOR ALL USING (user_id = (SELECT auth.user_id()));

CREATE POLICY "Users can only access own scores" ON life_balance_history
  FOR ALL USING (user_id = (SELECT auth.user_id()));

CREATE POLICY "Users can only access own notes" ON notes
  FOR ALL USING (user_id = (SELECT auth.user_id()));

CREATE POLICY "Users can only access own note_links" ON note_links
  FOR ALL USING (
    source_note_id IN (SELECT id FROM notes WHERE user_id = (SELECT auth.user_id()))
  );

CREATE POLICY "Users can only access own decisions" ON decisions
  FOR ALL USING (user_id = (SELECT auth.user_id()));

CREATE POLICY "Users can only access own decision_options" ON decision_options
  FOR ALL USING (
    decision_id IN (SELECT id FROM decisions WHERE user_id = (SELECT auth.user_id()))
  );

CREATE POLICY "Users can only access own decision_criteria" ON decision_criteria
  FOR ALL USING (
    decision_id IN (SELECT id FROM decisions WHERE user_id = (SELECT auth.user_id()))
  );

CREATE POLICY "Users can only access own people" ON people
  FOR ALL USING (user_id = (SELECT auth.user_id()));

CREATE POLICY "Users can only access own vault" ON vault_items
  FOR ALL USING (user_id = (SELECT auth.user_id()));

CREATE POLICY "Users can only access own goals" ON goals
  FOR ALL USING (user_id = (SELECT auth.user_id()));

CREATE POLICY "Users can only access own habits" ON habits
  FOR ALL USING (user_id = (SELECT auth.user_id()));

CREATE POLICY "Users can only access own notifications" ON notifications
  FOR ALL USING (user_id = (SELECT auth.user_id()));

CREATE POLICY "Users can only access own reminders" ON reminders
  FOR ALL USING (user_id = (SELECT auth.user_id()));

CREATE POLICY "Users can only access own integrations" ON user_integrations
  FOR ALL USING (user_id = (SELECT auth.user_id()));

CREATE POLICY "Users can only access own embeddings" ON embeddings
  FOR ALL USING (user_id = (SELECT auth.user_id()));

CREATE POLICY "Users can only access own audit logs" ON audit_logs
  FOR ALL USING (user_id = (SELECT auth.user_id()));

CREATE POLICY "Users can only access own calendar events" ON calendar_events
  FOR ALL USING (user_id = (SELECT auth.user_id()));

CREATE POLICY "Users can only access own budgets" ON budgets
  FOR ALL USING (user_id = (SELECT auth.user_id()));

CREATE POLICY "Users can only access own subscriptions" ON subscriptions
  FOR ALL USING (user_id = (SELECT auth.user_id()));

CREATE POLICY "Users can only access own export requests" ON export_requests
  FOR ALL USING (user_id = (SELECT auth.user_id()));

CREATE POLICY "Users can only access own habit freezes" ON habit_freezes
  FOR ALL USING (user_id = (SELECT auth.user_id()));
```

---

## 7) Triggers

### 7.1 Updated At

```sql
-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar em todas as tabelas com updated_at
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_conversations_updated_at
  BEFORE UPDATE ON conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_tracking_entries_updated_at
  BEFORE UPDATE ON tracking_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_notes_updated_at
  BEFORE UPDATE ON notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_decisions_updated_at
  BEFORE UPDATE ON decisions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_decision_options_updated_at
  BEFORE UPDATE ON decision_options
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_people_updated_at
  BEFORE UPDATE ON people
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_vault_items_updated_at
  BEFORE UPDATE ON vault_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_goals_updated_at
  BEFORE UPDATE ON goals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_habits_updated_at
  BEFORE UPDATE ON habits
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_reminders_updated_at
  BEFORE UPDATE ON reminders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_integrations_updated_at
  BEFORE UPDATE ON user_integrations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

### 7.2 Note Excerpt

```sql
-- Gerar excerpt automaticamente
CREATE OR REPLACE FUNCTION generate_note_excerpt()
RETURNS TRIGGER AS $$
BEGIN
  NEW.excerpt = LEFT(
    regexp_replace(NEW.content, E'[\\n\\r]+', ' ', 'g'),
    200
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER generate_notes_excerpt
  BEFORE INSERT OR UPDATE OF content ON notes
  FOR EACH ROW EXECUTE FUNCTION generate_note_excerpt();
```

### 7.3 Habit Streak Update

```sql
-- Atualizar streak ao completar hábito
CREATE OR REPLACE FUNCTION update_habit_streak()
RETURNS TRIGGER AS $$
DECLARE
  v_habit habits%ROWTYPE;
  v_last_completion date;
  v_expected_date date;
BEGIN
  SELECT * INTO v_habit FROM habits WHERE id = NEW.habit_id;
  
  -- Buscar última completion antes desta
  SELECT MAX(date) INTO v_last_completion 
  FROM habit_completions 
  WHERE habit_id = NEW.habit_id 
    AND date < NEW.date
    AND completed = true;
  
  -- Calcular data esperada baseado na frequência
  IF v_habit.frequency = 'daily' THEN
    v_expected_date := NEW.date - INTERVAL '1 day';
  ELSIF v_habit.frequency = 'weekly' THEN
    v_expected_date := NEW.date - INTERVAL '7 days';
  ELSE
    v_expected_date := NEW.date - INTERVAL '1 day';
  END IF;
  
  -- Se completou e é sequência
  IF NEW.completed THEN
    IF v_last_completion IS NULL OR v_last_completion >= v_expected_date THEN
      -- Incrementar streak
      UPDATE habits 
      SET 
        current_streak = current_streak + 1,
        longest_streak = GREATEST(longest_streak, current_streak + 1),
        total_completions = total_completions + 1
      WHERE id = NEW.habit_id;
    ELSE
      -- Resetar streak
      UPDATE habits 
      SET 
        current_streak = 1,
        total_completions = total_completions + 1
      WHERE id = NEW.habit_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_habit_streak_trigger
  AFTER INSERT ON habit_completions
  FOR EACH ROW EXECUTE FUNCTION update_habit_streak();
```

---

## 8) Seeds (Desenvolvimento)

```typescript
// packages/database/src/seed/index.ts

import { db } from '../client';
import { users, conversations, messages, trackingEntries, notes } from '../schema';

async function seed() {
  console.log('🌱 Seeding database...');
  
  // Create test user
  const [user] = await db.insert(users).values({
    email: 'test@example.com',
    name: 'Usuário Teste',
    status: 'active',
    emailVerifiedAt: new Date(),
    onboardingCompletedAt: new Date(),
  }).returning();
  
  console.log(`Created user: ${user.id}`);
  
  // Create sample conversation
  const [conversation] = await db.insert(conversations).values({
    userId: user.id,
    type: 'general',
    title: 'Primeira conversa',
  }).returning();
  
  // Create sample messages
  await db.insert(messages).values([
    {
      conversationId: conversation.id,
      role: 'user',
      content: 'Olá! Como funciona o app?',
    },
    {
      conversationId: conversation.id,
      role: 'assistant',
      content: 'Oi! Eu sou sua assistente pessoal de vida. Posso te ajudar a organizar sua rotina, acompanhar métricas de saúde, finanças e muito mais!',
    },
  ]);
  
  // Create sample tracking entries
  const today = new Date();
  await db.insert(trackingEntries).values([
    {
      userId: user.id,
      type: 'weight',
      area: 'health',
      value: '82.5',
      unit: 'kg',
      entryDate: today.toISOString().split('T')[0],
    },
    {
      userId: user.id,
      type: 'water',
      area: 'health',
      value: '2000',
      unit: 'ml',
      entryDate: today.toISOString().split('T')[0],
    },
    {
      userId: user.id,
      type: 'mood',
      area: 'mental_health',
      value: '7',
      entryDate: today.toISOString().split('T')[0],
    },
  ]);
  
  // Create sample notes
  await db.insert(notes).values([
    {
      userId: user.id,
      title: 'Bem-vindo ao Segundo Cérebro',
      content: '# Bem-vindo!\n\nEste é seu espaço para organizar pensamentos, ideias e conhecimento.\n\n## Como usar\n\n- Crie notas livremente\n- Use [[wikilinks]] para conectar ideias\n- Use #tags para categorizar',
      folder: null,
      tags: ['tutorial', 'welcome'],
    },
    {
      userId: user.id,
      title: 'Metas 2026',
      content: '# Metas para 2026\n\n## Saúde\n- Manter peso saudável\n- Exercício 3x/semana\n\n## Financeiro\n- Reserva de emergência\n- Investir 20% da renda',
      folder: 'Planejamento',
      tags: ['metas', 'planejamento'],
    },
  ]);
  
  console.log('✅ Seed completed!');
}

seed().catch(console.error);
```

---

## 9) Resumo das Tabelas

| Tabela | Descrição | RLS |
|--------|-----------|-----|
| `users` | Usuários do sistema | ✅ |
| `conversations` | Conversas com a IA | ✅ |
| `messages` | Mensagens das conversas | ✅ |
| `tracking_entries` | Registros de métricas | ✅ |
| `life_balance_history` | Histórico de scores | ✅ |
| `notes` | Notas do Segundo Cérebro | ✅ |
| `note_links` | Links entre notas | ✅ |
| `decisions` | Decisões estruturadas | ✅ |
| `decision_options` | Opções de decisão | ✅ |
| `decision_criteria` | Critérios de decisão | ✅ |
| `decision_scores` | Scores por critério | ✅ |
| `people` | Contatos (CRM) | ✅ |
| `person_notes` | Notas vinculadas a pessoas | ✅ |
| `person_interactions` | Interações com pessoas | ✅ |
| `vault_items` | Itens sensíveis (criptografados) | ✅ |
| `goals` | Metas | ✅ |
| `goal_milestones` | Milestones de metas | ✅ |
| `habits` | Hábitos | ✅ |
| `habit_completions` | Completions de hábitos | ✅ |
| `notifications` | Notificações | ✅ |
| `reminders` | Lembretes | ✅ |
| `user_integrations` | Integrações externas | ✅ |
| `embeddings` | Embeddings para RAG | ✅ |
| `audit_logs` | Logs de auditoria | ✅ |
| `calendar_events` | Eventos do Google Calendar sincronizados | ✅ |
| `budgets` | Orçamentos mensais por categoria | ✅ |
| `subscriptions` | Cópia local das assinaturas Stripe | ✅ |
| `export_requests` | Solicitações de export LGPD | ✅ |
| `habit_freezes` | Congelamento de streaks de hábitos | ✅ |

**Total: 29 tabelas**

---

## 10) Migrations

### 10.1 Estrutura de Migrations

```
packages/database/
├── drizzle.config.ts
├── src/
│   ├── schema/
│   │   ├── index.ts          # Export all
│   │   ├── enums.ts
│   │   ├── users.ts
│   │   ├── preferences.ts    # Schema Zod para JSONB preferences
│   │   ├── conversations.ts
│   │   ├── tracking.ts
│   │   ├── scores.ts
│   │   ├── notes.ts
│   │   ├── decisions.ts
│   │   ├── people.ts
│   │   ├── vault.ts
│   │   ├── goals.ts
│   │   ├── notifications.ts
│   │   ├── reminders.ts
│   │   ├── integrations.ts
│   │   ├── calendar.ts       # Eventos do Google Calendar
│   │   ├── budgets.ts        # Orçamentos mensais
│   │   ├── subscriptions.ts  # Cópia local Stripe
│   │   ├── exports.ts        # Solicitações LGPD
│   │   ├── habit-freezes.ts  # Congelamento de streaks
│   │   ├── embeddings.ts
│   │   └── audit.ts
│   ├── migrations/
│   │   └── 0001_initial.sql
│   └── seed/
│       └── index.ts
```

### 10.2 Drizzle Config

```typescript
// packages/database/drizzle.config.ts

// IMPORTANTE: dotenv/config necessário para comandos CLI (drizzle-kit)
import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/schema/index.ts',
  out: './src/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  verbose: true,
  strict: true,
});
```

### 10.3 Comandos

```bash
# Gerar migration
pnpm drizzle-kit generate

# Aplicar migrations
pnpm drizzle-kit migrate

# Push direto (dev)
pnpm drizzle-kit push

# Studio (GUI)
pnpm drizzle-kit studio
```

---

*Última atualização: 07 Janeiro 2026*
*Revisão: RLS policies atualizadas com otimização (SELECT auth.user_id()), drizzle.config.ts com dotenv*
