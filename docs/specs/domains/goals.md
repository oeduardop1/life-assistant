# Goals

> Goal tracking with progress and milestones.

---

## 1. Overview

Objetivos com prazo e valor mensurável:
- Meta de peso, economia, leitura, etc.
- Progresso calculado automaticamente
- Milestones opcionais

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

## 3. AI Tools

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
  name: 'get_goals',
  description: 'Retorna metas do usuário',
  parameters: z.object({
    status: z.enum(['not_started', 'in_progress', 'completed', 'failed', 'canceled']).optional(),
    area: z.string().optional(),
  }),
  requiresConfirmation: false,
}

{
  name: 'update_goal_progress',
  description: 'Atualiza o progresso de uma meta',
  parameters: z.object({
    goalId: z.string(),
    currentValue: z.number(),
  }),
  requiresConfirmation: true,
}
```

---

## 4. Database Schema

```typescript
// packages/database/src/schema/goals.ts

import { pgTable, uuid, varchar, text, decimal, date, integer, boolean, timestamp, index } from 'drizzle-orm/pg-core';
import { goalStatusEnum, lifeAreaEnum } from './enums';
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

// Types
export type Goal = typeof goals.$inferSelect;
export type NewGoal = typeof goals.$inferInsert;
export type GoalMilestone = typeof goalMilestones.$inferSelect;
export type NewGoalMilestone = typeof goalMilestones.$inferInsert;
```

---

## 5. Related Documents

- [tracking.md](tracking.md) — Life Balance Score inclui progresso de metas, Habits integrados
- [notifications.md](notifications.md) — Notificações de meta em risco/concluída
- [dashboard.md](dashboard.md) — Widgets de metas
- [reports.md](reports.md) — Relatórios incluem progresso

---

## 6. Definition of Done

### Goals
- [ ] CRUD de metas funciona
- [ ] Progresso calculado automaticamente
- [ ] Status transitions funcionando
- [ ] Integração com tracking entries
- [ ] Sub-goals (milestones) funcionando
- [ ] AI Tools implementadas
- [ ] Notificações de meta em risco/concluída

---

*Última atualização: 01 Fevereiro 2026*
