# Goals & Habits

> Goal tracking, habit building, streaks, and progress monitoring.

---

## 1. Overview

### Goals

Objetivos com prazo e valor mensurável:
- Meta de peso, economia, leitura, etc.
- Progresso calculado automaticamente
- Milestones opcionais

### Habits

Ações recorrentes que formam rotina:
- Frequência configurável (diária, semanal, custom)
- Streak tracking com grace period
- Lembretes opcionais

---

## 2. Goals

### Structure

```typescript
interface Goal {
  id: string;
  userId: string;
  title: string;
  description?: string;
  area: LifeArea;
  status: GoalStatus;
  targetValue?: number;
  currentValue?: number;
  unit?: string;
  startDate?: Date;
  endDate?: Date;
  deletedAt?: Date;
}

enum GoalStatus {
  NOT_STARTED = 'not_started',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELED = 'canceled',
}
```

### Progress Calculation

```
progress = (currentValue / targetValue) × 100
```

- Atualizado automaticamente por tracking entries
- Ou manualmente pelo usuário

### Sub-Goals (Milestones)

Metas podem ter sub-metas para melhor acompanhamento:

```typescript
interface GoalMilestone {
  id: string;
  goalId: string;
  title: string;
  targetValue?: number;
  isCompleted: boolean;
  completedAt?: Date;
  order: number;
}
```

Exemplo:
```
Meta: Ler 24 livros em 2026
├── Q1: 6 livros ✓
├── Q2: 6 livros (em progresso - 4/6)
├── Q3: 6 livros
└── Q4: 6 livros
```

---

## 3. Habits

### Structure

```typescript
interface Habit {
  id: string;
  userId: string;
  title: string;
  description?: string;
  area: LifeArea;
  frequency: HabitFrequency;
  daysOfWeek?: number[];      // Para weekly/custom
  timesPerPeriod?: number;    // Vezes por período
  currentStreak: number;
  longestStreak: number;
  totalCompletions: number;
  reminderTime?: string;      // HH:mm
  reminderEnabled: boolean;
  isActive: boolean;
  deletedAt?: Date;
}

enum HabitFrequency {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  CUSTOM = 'custom',
}
```

### Streak Rules

| Regra | Descrição |
|-------|-----------|
| **Incremento** | Completar no período incrementa streak |
| **Grace Period** | 1 dia de tolerância antes de quebrar |
| **Reset** | 2 dias sem completar = streak = 0 |
| **Longest** | Atualizado quando current > longest |

### Habit Completions

```typescript
interface HabitCompletion {
  id: string;
  habitId: string;
  completedAt: Date;
  notes?: string;
}
```

### Habit Freezes

```typescript
interface HabitFreeze {
  id: string;
  habitId: string;
  startDate: Date;
  endDate: Date;
  reason?: string;
}
```

Freezes pausam o streak sem quebrá-lo (férias, doença, etc.).

### Habit Chains (Stacking)

Permite agrupar hábitos que são feitos em sequência:

```typescript
interface HabitChain {
  id: string;
  userId: string;
  name: string;
  habitIds: string[];  // Ordem importa
  reminderTime?: string;
}
```

Exemplo: "Rotina matinal"
1. Acordar 6h
2. Devocional 15min
3. Exercício 30min
4. Café da manhã saudável

### Calendar View

Visualização mensal de hábitos em formato calendar:

```
        Jan 2026
  D   S   T   Q   Q   S   S
  1   2   3   4   5   6   7
  ✓   ✓   ✓   ✓   ✓   -   ✓
  8   9  10  11  12  13  14
  ✓   ✓   ✓   -   ✓   ✓   ✓
 15  16  17  18  19  20  21
  ✓   ✓   ·   ·   ·   ·   ·
```

Legenda:
- ✓ = Completado
- - = Não completado (quebrou streak)
- · = Futuro
- ❄ = Freeze ativo

---

## 4. Reminders

- Configuráveis por hábito
- Respeitam quiet hours do usuário
- Enviados via Telegram/Push/Email (conforme preferência)

---

## 5. AI Tools

```typescript
{
  name: 'create_goal',
  description: 'Cria uma nova meta',
  parameters: z.object({
    title: z.string(),
    area: z.enum([...]),
    targetValue: z.number().optional(),
    unit: z.string().optional(),
    endDate: z.string().optional(),
  }),
  requiresConfirmation: true,
}

{
  name: 'complete_habit',
  description: 'Marca hábito como completado hoje',
  parameters: z.object({
    habitId: z.string(),
    notes: z.string().optional(),
  }),
  requiresConfirmation: false,
}

{
  name: 'get_habits_status',
  description: 'Retorna status de hábitos do usuário',
  parameters: z.object({
    date: z.string().optional(),
  }),
  requiresConfirmation: false,
}
```

---

## 6. Database Schema

```typescript
// packages/database/src/schema/goals.ts

import { pgTable, uuid, varchar, text, decimal, date, integer, boolean, time, timestamp, jsonb, index } from 'drizzle-orm/pg-core';
import { goalStatusEnum, habitFrequencyEnum, lifeAreaEnum } from './enums';
import { users } from './users';

// ========== GOALS ==========

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

// ========== HABITS ==========

export const habits = pgTable('habits', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),

  // Basic info
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  area: lifeAreaEnum('area').notNull(),

  // Frequency
  frequency: habitFrequencyEnum('frequency').notNull(), // 'daily', 'weekly', 'custom'
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

// ========== HABIT FREEZES ==========

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
export type Goal = typeof goals.$inferSelect;
export type NewGoal = typeof goals.$inferInsert;
export type GoalMilestone = typeof goalMilestones.$inferSelect;
export type NewGoalMilestone = typeof goalMilestones.$inferInsert;
export type Habit = typeof habits.$inferSelect;
export type NewHabit = typeof habits.$inferInsert;
export type HabitCompletion = typeof habitCompletions.$inferSelect;
export type HabitFreeze = typeof habitFreezes.$inferSelect;
```

---

## 7. Related Documents

- [tracking.md](tracking.md) — Life Balance Score inclui progresso de metas/hábitos
- [notifications.md](notifications.md) — Lembretes de hábitos
- [dashboard.md](dashboard.md) — Widgets de metas e hábitos
- [reports.md](reports.md) — Relatórios incluem progresso

---

## 8. Definition of Done

### Goals
- [ ] CRUD de metas funciona
- [ ] Progresso calculado automaticamente
- [ ] Status transitions funcionando
- [ ] Integração com tracking entries
- [ ] Sub-goals (milestones) funcionando

### Habits
- [ ] CRUD de hábitos funciona
- [ ] Streaks calculados corretamente
- [ ] Grace period implementado
- [ ] Habit freezes funcionando
- [ ] Lembretes configuráveis
- [ ] Habit chains funcionando
- [ ] Calendar view implementado
- [ ] AI Tools implementadas

---

*Última atualização: 26 Janeiro 2026*
