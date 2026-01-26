# Notifications & Reports

> Alerts, reminders, morning summaries, and weekly reports.

---

## 1. Overview

O sistema de notificações inclui:
- **Alertas proativos** — Contas a vencer, lembretes
- **Morning Summary** — Resumo diário pela manhã
- **Night Summary** — Recap do dia (opcional)
- **Weekly Report** — Análise semanal
- **Check-ins proativos** — IA inicia conversa para verificar status
- **Reminders** — Lembretes configuráveis

---

## 2. Notification Types

```typescript
enum NotificationType {
  REMINDER = 'reminder',
  ALERT = 'alert',
  REPORT = 'report',
  INSIGHT = 'insight',
  MILESTONE = 'milestone',
  SOCIAL = 'social',
}

enum NotificationStatus {
  PENDING = 'pending',
  SENT = 'sent',
  READ = 'read',
  DISMISSED = 'dismissed',
}
```

---

## 3. Channels

| Canal | Uso | Configurável |
|-------|-----|--------------|
| **Telegram** | Principal para interações rápidas | ✅ |
| **Push Web** | Dashboard aberto | ✅ |
| **Email** | Relatórios, alertas importantes | ✅ |

---

## 4. Morning Summary

**Horário:** Configurável (default 07:00 no timezone do usuário)

**Conteúdo:**
- Eventos do dia (Google Calendar)
- Lembretes pendentes
- Contas a vencer
- Destaque do dia anterior (se houver)

**Template:**
```
Bom dia! Hoje você tem:
- 10h: Call com cliente X
- 15h: Dentista

Lembretes:
- Pagar conta de luz (vence amanhã)

[Destaque: Completou 7 dias de streak no devocional!]
```

---

## 5. Weekly Report

**Horário:** Domingo 20:00 (configurável)

**Conteúdo:**
- Life Balance Score da semana
- Score por área
- Destaques (conquistas, registros)
- Insight da semana (se houver dados)
- Sugestão para próxima semana

> **ADR-015:** Relatórios são baseados apenas nas métricas registradas. Áreas sem dados mostram "--" sem penalização.

---

## 6. Night Summary

**Propósito:** Recap do dia com foco em reflexão leve (opcional).

**Conteúdo:**
- Principais eventos do dia
- Registros feitos (se houver)
- Uma pergunta aberta para reflexão

---

## 7. Proactive Check-ins

Mensagens iniciadas pela IA para apoiar o usuário sem cobrança:
- Dias sem tracking
- Queda de humor
- Eventos próximos importantes
- Padrões detectados pela IA

Tom: Amigável, breve e não invasivo.

---

## 8. Quiet Hours

| Configuração | Default | Descrição |
|--------------|---------|-----------|
| Início | 22:00 | Hora que param notificações |
| Fim | 08:00 | Hora que retomam |

- Durante quiet hours: notificações são enfileiradas
- Exceção: alertas de emergência (configurável)

---

## 9. Reminders

```typescript
interface Reminder {
  id: string;
  userId: string;
  title: string;
  description?: string;
  reminderAt: Date;
  isRecurring: boolean;
  recurrence?: {
    frequency: 'daily' | 'weekly' | 'monthly';
    daysOfWeek?: number[];
  };
  status: 'pending' | 'sent' | 'snoozed' | 'completed';
}
```

### AI Tool: create_reminder

```typescript
{
  name: 'create_reminder',
  parameters: {
    title: string,
    datetime: string,  // ISO datetime string
    notes?: string,
  },
  requiresConfirmation: true,
}
```

---

## 10. Channel Priority Matrix

| Tipo | Telegram | Push Web | Email |
|------|----------|----------|-------|
| Morning Summary | ✓ (primary) | ✓ | - |
| Night Summary | ✓ (primary) | ✓ | - |
| Weekly Report | ✓ | ✓ | ✓ (full) |
| Monthly Report | - | - | ✓ (primary) |
| Alert (urgente) | ✓ (primary) | ✓ | ✓ (backup) |
| Reminder | ✓ (primary) | ✓ | - |
| Insight | ✓ | ✓ | - |
| Milestone | ✓ | ✓ | - |
| Proactive Check-in | ✓ (primary) | ✓ | - |

---

## 11. Database Schema

### 11.1 Notifications

```typescript
// packages/database/src/schema/notifications.ts

import { pgTable, uuid, varchar, text, timestamp, jsonb, index } from 'drizzle-orm/pg-core';
import { notificationTypeEnum, notificationStatusEnum } from './enums';
import { users } from './users';

export const notifications = pgTable('notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),

  // Type & Content
  type: notificationTypeEnum('type').notNull(), // 'reminder', 'alert', 'report', 'insight', 'milestone', 'social'
  title: varchar('title', { length: 255 }).notNull(),
  body: text('body'),

  // Status
  status: notificationStatusEnum('status').notNull().default('pending'), // 'pending', 'sent', 'read', 'dismissed'

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

### 11.2 Reminders

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

---

## 12. Related Documents

- [telegram.md](../integrations/telegram.md) — Detalhes do bot e notificações
- [resend.md](../integrations/resend.md) — Email transacional (planejado)
- [web-push.md](../integrations/web-push.md) — Push web (planejado)
- [reports.md](reports.md) — Detalhes de relatórios periódicos
- [goals-habits.md](goals-habits.md) — Lembretes de hábitos
- [people.md](people.md) — Lembretes de contato e aniversários

---

## 13. Definition of Done

### Notifications
- [ ] Push web funciona
- [ ] Telegram funciona
- [ ] Email funciona
- [ ] Quiet hours respeitados
- [ ] Preferências configuráveis
- [ ] Channel priority implementado
- [ ] Check-ins proativos disparados com critérios

### Reports
- [ ] Morning summary enviado
- [ ] Night summary enviado (opcional)
- [ ] Weekly report enviado
- [ ] Monthly report enviado
- [ ] Configuração de horários funciona

### Reminders
- [ ] CRUD de lembretes funciona
- [ ] Lembretes recorrentes funcionam
- [ ] Snooze funciona
- [ ] Tool create_reminder funciona

---

*Última atualização: 26 Janeiro 2026*
