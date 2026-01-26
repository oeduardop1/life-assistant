# Assistant & Agenda Module

> Gerenciamento de agenda, lembretes e tarefas através de comandos naturais.

---

## 1. Overview

O módulo Assistant & Agenda permite ao usuário gerenciar sua agenda, criar lembretes e planejar tarefas através de conversa natural com a IA. Integra-se com Google Calendar para sync bidirecional (futuro).

**Milestone:** M3.1+

### Additional Capabilities

| Feature | Descrição |
|---------|-----------|
| Preparar resumos | Ex: histórico médico para consulta |
| Busca no histórico | Encontrar qualquer informação do passado |

---

## 2. Calendar Integration

### 2.1 Eventos

| Feature | Descrição |
|---------|-----------|
| Criar eventos | Agendar compromissos por comando natural |
| Consultar agenda | Ver compromissos de hoje/amanhã/semana/mês |
| Reagendar | Mover compromissos com comando natural |
| Cancelar eventos | Remover da agenda |
| Verificar conflitos | Alertar sobre sobreposições |
| Eventos recorrentes | Criar eventos que repetem |

### 2.2 Sync Google Calendar

> Ver `integrations/google-calendar.md` para detalhes técnicos.

- **Atual (M2):** Read-only (eventos do Google aparecem no app)
- **Futuro (M3+):** Bidirecional (criar eventos no app reflete no Google)

---

## 3. Natural Language Commands

### 3.1 Criar Eventos

```
"Marca reunião com João amanhã às 15h"
"Agenda dentista para segunda às 10h"
"Cria um evento de 2h para revisão do projeto na quinta"
```

### 3.2 Consultar Agenda

```
"O que tenho hoje?"
"Quais são meus compromissos da semana?"
"Estou livre sexta à tarde?"
```

### 3.3 Modificar Eventos

```
"Move a reunião com João para 16h"
"Cancela o dentista de segunda"
"Adiciona 30 minutos ao evento de revisão"
```

---

## 4. Reminder Types

### 4.1 Lembretes Simples

```
"Me lembra de ligar para o contador amanhã"
"Lembra de comprar leite"
```

### 4.2 Lembretes Recorrentes

```
"Me lembra de tomar remédio todo dia às 8h"
"Lembra de revisar metas toda segunda-feira"
```

### 4.3 Lembretes Contextuais

```
"Me lembra de perguntar sobre o exame na próxima consulta"
"Lembra de falar sobre férias na reunião com chefe"
```

### 4.4 Lembretes por Localização (Futuro)

```
"Me lembra de comprar pão quando eu chegar perto da padaria"
"Lembra de pegar chave quando chegar em casa"
```

---

## 5. Travel Planning

### 5.1 Roteiro Personalizado

```
"Vou viajar para Portugal em março por 10 dias, me ajuda com o roteiro"
```

A IA considera:
- Preferências do usuário (Memória)
- Orçamento (se disponível)
- Interesses (cultura, gastronomia, aventura)
- Restrições (mobilidade, alimentares)

### 5.2 Checklist de Viagem

- Documentos necessários
- Reservas
- Itens para mala
- Alertas de datas

---

## 6. Project Planning

### 6.1 Quebrar Projeto em Tarefas

```
"Preciso organizar a festa de aniversário do meu filho"
```

A IA gera:
- Lista de tarefas com prazos sugeridos
- Dependências entre tarefas
- Checkpoints de progresso

### 6.2 Checklists

| Tipo | Exemplo |
|------|---------|
| Evento | "Checklist para casamento" |
| Projeto | "Checklist para lançar produto" |
| Viagem | "Checklist para viagem internacional" |
| Médico | "Checklist para consulta médica" |

---

## 7. AI Tools

### 7.1 Read Tools

```typescript
{
  name: 'get_agenda',
  description: 'Obtém eventos da agenda do usuário',
  parameters: z.object({
    startDate: z.string().describe('Data início (ISO)'),
    endDate: z.string().describe('Data fim (ISO)'),
    includeRecurring: z.boolean().default(true),
  }),
  requiresConfirmation: false,
}

{
  name: 'get_reminders',
  description: 'Obtém lembretes pendentes',
  parameters: z.object({
    status: z.enum(['pending', 'completed', 'all']).default('pending'),
    limit: z.number().default(10),
  }),
  requiresConfirmation: false,
}
```

### 7.2 Write Tools

```typescript
{
  name: 'create_event',
  description: 'Cria evento na agenda',
  parameters: z.object({
    title: z.string(),
    startTime: z.string().describe('DateTime ISO'),
    endTime: z.string().describe('DateTime ISO'),
    description: z.string().optional(),
    location: z.string().optional(),
    recurrence: z.string().optional().describe('RRULE format'),
  }),
  requiresConfirmation: true,
}

{
  name: 'create_reminder',
  description: 'Cria lembrete',
  parameters: z.object({
    title: z.string(),
    remindAt: z.string().describe('DateTime ISO'),
    repeatPattern: z.string().optional(),
    notes: z.string().optional(),
  }),
  requiresConfirmation: true,
}

{
  name: 'update_event',
  description: 'Atualiza evento existente',
  parameters: z.object({
    eventId: z.string().uuid(),
    title: z.string().optional(),
    startTime: z.string().optional(),
    endTime: z.string().optional(),
  }),
  requiresConfirmation: true,
}

{
  name: 'complete_reminder',
  description: 'Marca lembrete como concluído',
  parameters: z.object({
    reminderId: z.string().uuid(),
  }),
  requiresConfirmation: false,
}
```

---

## 8. Data Model

### 8.1 calendar_events

```typescript
export const calendarEvents = pgTable('calendar_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id),

  externalId: varchar('external_id', { length: 255 }),
  source: varchar('source', { length: 50 }).default('app'),

  title: varchar('title', { length: 500 }).notNull(),
  description: text('description'),
  location: varchar('location', { length: 500 }),

  startTime: timestamp('start_time').notNull(),
  endTime: timestamp('end_time').notNull(),
  isAllDay: boolean('is_all_day').default(false),
  timezone: varchar('timezone', { length: 50 }),

  isRecurring: boolean('is_recurring').default(false),
  recurrenceRule: varchar('recurrence_rule', { length: 255 }),

  status: varchar('status', { length: 20 }).default('confirmed'),

  deletedAt: timestamp('deleted_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
```

### 8.2 reminders

```typescript
export const reminders = pgTable('reminders', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id),

  title: varchar('title', { length: 500 }).notNull(),
  description: text('description'),

  remindAt: timestamp('remind_at').notNull(),
  repeatPattern: varchar('repeat_pattern', { length: 50 }),
  repeatUntil: timestamp('repeat_until'),

  completed: boolean('completed').default(false),
  completedAt: timestamp('completed_at'),

  metadata: jsonb('metadata'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
```

---

## 9. Notifications

| Trigger | Notificação | Canais |
|---------|-------------|--------|
| Evento em 15 min | "Lembrete: {evento} em 15 minutos" | Push, Telegram |
| Evento em 1 hora | "Você tem {evento} às {hora}" | Push |
| Lembrete | "{título do lembrete}" | Push, Telegram |
| Conflito detectado | "Conflito de agenda: {evento1} e {evento2}" | Push |

---

## 10. Definition of Done

- [ ] Criar evento via conversa natural
- [ ] Consultar agenda por data/período
- [ ] Criar lembretes simples
- [ ] Criar lembretes recorrentes
- [ ] Notificação de eventos próximos
- [ ] Sync read-only com Google Calendar
- [ ] UI de agenda no dashboard
- [ ] Testes unitários (use cases)
- [ ] Testes E2E (fluxos principais)

---

*Última atualização: 26 Janeiro 2026*
