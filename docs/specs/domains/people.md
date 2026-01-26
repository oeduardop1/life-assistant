# People (CRM Pessoal)

> Personal CRM: contacts, relationships, interactions, and reminders.

---

## 1. Overview

O módulo de Pessoas funciona como um CRM pessoal:
- Armazena informações sobre pessoas importantes
- Rastreia interações e datas importantes
- Gera lembretes de contato
- Integra com o contexto de conversas da IA

---

## 2. Entity Structure

### Person

```typescript
interface Person {
  id: string;
  userId: string;
  name: string;
  nickname?: string;
  relationship: RelationshipType;
  email?: string;
  phone?: string;
  birthday?: Date;
  anniversary?: Date;
  preferences?: Record<string, unknown>;
  contactFrequencyDays?: number;  // Lembrete de contato
  lastContact?: Date;
  tags?: string[];
  notes?: string;
  isArchived: boolean;
  deletedAt?: Date;
}
```

### Relationship Types

```typescript
enum RelationshipType {
  FAMILY = 'family',
  FRIEND = 'friend',
  WORK = 'work',
  ACQUAINTANCE = 'acquaintance',
  ROMANTIC = 'romantic',
  MENTOR = 'mentor',
  OTHER = 'other',
}
```

### Person Interactions

```typescript
interface PersonInteraction {
  id: string;
  personId: string;
  type: InteractionType;  // 'call', 'message', 'meeting', 'email', 'gift', 'other'
  notes?: string;
  interactionDate: Date;
}
```

### Person Notes

Notas vinculadas a pessoas (resumos, histórico, preferências):

```typescript
interface PersonNote {
  id: string;
  personId: string;
  noteId: string;   // referência a notes
  createdAt: Date;
}
```

### Family Subtypes

Para pessoas do tipo `FAMILY`, há subtipos adicionais:

```typescript
enum FamilySubtype {
  PARENT = 'parent',
  SIBLING = 'sibling',
  CHILD = 'child',
  SPOUSE = 'spouse',
  GRANDPARENT = 'grandparent',
  GRANDCHILD = 'grandchild',
  UNCLE_AUNT = 'uncle_aunt',
  COUSIN = 'cousin',
  IN_LAW = 'in_law',
  OTHER = 'other',
}
```

### Gifts Tracking

```typescript
interface Gift {
  id: string;
  personId: string;
  userId: string;
  direction: 'given' | 'received';
  description: string;
  occasion?: string;  // 'birthday', 'christmas', 'spontaneous', etc.
  date: Date;
  value?: number;
  notes?: string;
}
```

Uso:
- "O que já dei de presente para [pessoa]?"
- "Ideias de presente baseadas em preferências"
- Alertas antes de aniversários incluem histórico de presentes

### Tags e Grupos

```typescript
interface PersonGroup {
  id: string;
  userId: string;
  name: string;
  color?: string;
  personIds: string[];
}
```

Exemplos de grupos:
- "Equipe de trabalho"
- "Amigos da faculdade"
- "Família materna"
- "Networking"

---

## 3. Features

### 3.1 Contact Reminders

- `contactFrequencyDays`: define intervalo de lembrete
- Se `lastContact + contactFrequencyDays < today`: gera lembrete
- Lembretes aparecem no Morning Summary

### 3.2 Birthday/Anniversary Alerts

- 7 dias antes: "O aniversário de [Nome] está chegando!"
- No dia: "Hoje é aniversário de [Nome]!"

### 3.3 AI Integration

- IA pode criar/atualizar pessoas via conversa
- Tool `update_person`: atualiza informações
- Tool `get_person`: busca pessoa por nome
- Knowledge items do tipo `person` linkam a pessoas

---

## 4. AI Tools

```typescript
{
  name: 'get_person',
  description: 'Obtém informações sobre uma pessoa do CRM do usuário',
  parameters: z.object({
    name: z.string().describe('Nome da pessoa'),
  }),
  requiresConfirmation: false,
  inputExamples: [
    { name: "Maria" },
    { name: "João da Silva" },
  ],
}

{
  name: 'update_person',
  description: 'Atualiza informações de uma pessoa',
  parameters: z.object({
    name: z.string(),
    updates: z.object({
      relationship: z.string().optional(),
      notes: z.string().optional(),
      birthday: z.string().optional(),
      preferences: z.record(z.string()).optional(),
    }),
  }),
  requiresConfirmation: true,
  inputExamples: [
    { name: "Maria", updates: { relationship: "esposa", birthday: "1990-05-15" } },
    { name: "João", updates: { notes: "Prefere reuniões pela manhã" } },
    { name: "Ana", updates: { preferences: { "presente_ideal": "livros" } } },
  ],
}
```

---

## 5. Database Schema

```typescript
// packages/database/src/schema/people.ts

import { pgTable, uuid, varchar, text, date, integer, boolean, timestamp, jsonb, index } from 'drizzle-orm/pg-core';
import { relationshipTypeEnum, interactionTypeEnum } from './enums';
import { users } from './users';
import { notes } from './notes';

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

  // Preferences (structured JSON)
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

  type: interactionTypeEnum('type').notNull(), // 'call', 'message', 'meeting', 'email', 'gift', 'other'
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

### Gifts & Groups (planned)

> **Status:** planejado (tabelas ainda não existem em `packages/database/src/schema/*`).

```typescript
export const gifts = pgTable('gifts', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id),
  personId: uuid('person_id').notNull().references(() => people.id),

  direction: varchar('direction', { length: 10 }).notNull(), // given | received
  description: text('description').notNull(),
  occasion: varchar('occasion', { length: 100 }),
  date: date('date').notNull(),
  value: decimal('value', { precision: 12, scale: 2 }),
  notes: text('notes'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const personGroups = pgTable('person_groups', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id),

  name: varchar('name', { length: 255 }).notNull(),
  color: varchar('color', { length: 20 }),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const personGroupMembers = pgTable('person_group_members', {
  id: uuid('id').primaryKey().defaultRandom(),
  groupId: uuid('group_id').notNull().references(() => personGroups.id),
  personId: uuid('person_id').notNull().references(() => people.id),

  createdAt: timestamp('created_at').defaultNow().notNull(),
});
```

---

## 6. Related Documents

- [family.md](family.md) — Detalhes específicos de família (membros, árvore, tempo de qualidade)
- [notifications.md](notifications.md) — Alertas de aniversário e lembretes de contato
- [memory.md](memory.md) — Knowledge Items do tipo `person`

---

## 7. Definition of Done

- [ ] CRUD completo de pessoas
- [ ] Lembretes automáticos de contato
- [ ] Registro de interações
- [ ] Vínculo com notas e conversas
- [ ] Alertas de aniversário
- [ ] Busca por nome/relacionamento
- [ ] Family subtypes implementados
- [ ] Gift tracking funcionando
- [ ] Tags e grupos funcionando
- [ ] AI Tools implementadas

---

*Última atualização: 26 Janeiro 2026*
