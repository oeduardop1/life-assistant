# Family Module

> Gerenciamento familiar, tempo de qualidade, calendário compartilhado e metas em família.

---

## 1. Overview

O módulo Familiar permite cadastrar membros da família, acompanhar datas importantes, registrar tempo de qualidade e gerenciar tarefas domésticas.

---

## 2. Family Members

### 2.1 Cadastro

| Campo | Descrição |
|-------|-----------|
| Nome | Nome completo |
| Apelido | Como é chamado |
| Relacionamento | Cônjuge, filho, pai, mãe, irmão, etc. |
| Data nascimento | Para aniversários |
| Foto | Opcional |

### 2.2 Relacionamentos

```typescript
export const familyRelationshipEnum = pgEnum('family_relationship', [
  'spouse',      // Cônjuge
  'child',       // Filho(a)
  'parent',      // Pai/Mãe
  'sibling',     // Irmão/Irmã
  'grandparent', // Avô/Avó
  'grandchild',  // Neto(a)
  'in_law',      // Sogro(a), cunhado(a)
  'uncle_aunt',  // Tio/Tia
  'cousin',      // Primo(a)
  'other'
]);
```

---

## 3. Family Tree

Visualização hierárquica de relacionamentos familiares:

```
                    Avós Paternos ─── Avós Maternos
                         │                  │
                    ┌────┴────┐       ┌────┴────┐
                    │         │       │         │
                   Pai     Tios     Mãe      Tios
                    │                 │
                    └────────┬────────┘
                             │
                    ┌────────┼────────┐
                    │        │        │
                   Eu     Irmãos   Cônjuge
                    │
              ┌─────┴─────┐
              │           │
           Filho 1    Filho 2
```

---

## 4. Important Dates

| Tipo | Exemplo |
|------|---------|
| Aniversário | Data de nascimento de cada membro |
| Casamento | Aniversário de casamento |
| Batizado | Data do batizado dos filhos |
| Falecimento | In memoriam |
| Outras | Datas personalizadas |

**Lembretes automáticos:**
- 7 dias antes
- 1 dia antes
- No dia

---

## 5. Quality Time Tracking

### 5.1 Registro de Atividades

Via conversa ou dashboard:
```
"Passei a tarde no parque com as crianças"
"Tivemos jantar em família hoje"
```

### 5.2 Campos

| Campo | Descrição |
|-------|-----------|
| Data | Quando aconteceu |
| Atividade | O que fizeram |
| Participantes | Quem estava presente |
| Duração | Tempo aproximado |
| Notas | Observações |

### 5.3 Insights

- "Vocês não têm atividade em família registrada há 2 semanas"
- "Nos últimos 30 dias, {filho} aparece menos nas atividades"

---

## 6. Children Info

### 6.1 Informações Educacionais

| Campo | Descrição |
|-------|-----------|
| Escola | Nome da escola |
| Série | Ano/série atual |
| Turno | Manhã, tarde, integral |
| Professora | Nome da professora principal |
| Contato escola | Telefone/email |

### 6.2 Marcos de Desenvolvimento

| Campo | Descrição |
|-------|-----------|
| Marco | Ex: "Começou a andar" |
| Data | Quando aconteceu |
| Idade | Idade na época |
| Notas | Detalhes |

### 6.3 Saúde do Filho

Integrado com módulo de Saúde:
- Vacinas
- Consultas pediátricas
- Alergias
- Medicamentos

---

## 7. Household Tasks

### 7.1 Tarefas Recorrentes

| Campo | Descrição |
|-------|-----------|
| Nome | Ex: "Limpar banheiro" |
| Responsável | Quem faz |
| Frequência | Diário, semanal, mensal |
| Último feito | Data |
| Próximo | Data sugerida |

### 7.2 Divisão de Tarefas

Visualização de quem faz o quê:
- Por membro da família
- Por categoria (limpeza, compras, crianças)
- Equilíbrio de responsabilidades

---

## 8. Family Budget

Orçamento familiar separado do pessoal (quando aplicável):
- Meta mensal por categoria
- Planejado vs. realizado
- Resumo por mês
- Integração com módulo Finance (M2.2)

---

## 9. Family Calendar

### 9.1 Eventos

Agregação de eventos de todos os membros:
- Compromissos de cada um
- Eventos em família
- Escola dos filhos
- Trabalho dos pais

> **Nota:** Hoje não há tabela dedicada. O plano é usar `calendar_events` com metadados de participantes.

### 9.2 Conflitos

Alerta quando eventos de membros se sobrepõem:
- "João tem futebol às 15h, mas você tem reunião"

---

## 10. Family Goals

### 10.1 Tipos

| Tipo | Exemplo |
|------|---------|
| Viagem | "Viajar para Disney em 2027" |
| Financeiro | "Economizar R$50k para casa nova" |
| Educação | "Filho entrar em escola X" |
| Tempo junto | "Jantar em família 4x por semana" |

### 10.2 Progresso

- Meta com valor alvo
- Valor atual
- Progresso visual
- Prazo

---

## 11. Data Model

> **Status:** planejado (tabelas ainda não existem em `packages/database/src/schema/*`).

### 11.1 family_members

```typescript
export const familyMembers = pgTable('family_members', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id),

  name: varchar('name', { length: 255 }).notNull(),
  relationship: familyRelationshipEnum('relationship').notNull(),
  birthDate: date('birth_date'),

  // Para filhos
  schoolName: varchar('school_name', { length: 255 }),
  schoolGrade: varchar('school_grade', { length: 50 }),

  metadata: jsonb('metadata'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
```

### 11.2 family_activities

```typescript
export const familyActivities = pgTable('family_activities', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id),

  date: date('date').notNull(),
  activity: varchar('activity', { length: 500 }).notNull(),
  duration: integer('duration'), // minutos
  participants: jsonb('participants').default([]), // IDs dos membros

  notes: text('notes'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
});
```

### 11.3 family_tasks

```typescript
export const familyTasks = pgTable('family_tasks', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id),

  title: varchar('title', { length: 255 }).notNull(),
  assigneeId: uuid('assignee_id'), // family_members.id
  frequency: varchar('frequency', { length: 50 }),
  lastDoneAt: date('last_done_at'),
  nextDueAt: date('next_due_at'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
```

### 11.4 family_budgets

```typescript
export const familyBudgets = pgTable('family_budgets', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id),

  monthYear: varchar('month_year', { length: 7 }).notNull(), // YYYY-MM
  category: varchar('category', { length: 100 }).notNull(),
  plannedAmount: decimal('planned_amount', { precision: 12, scale: 2 }).notNull(),
  actualAmount: decimal('actual_amount', { precision: 12, scale: 2 }),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
```

### 11.5 family_goals

```typescript
export const familyGoals = pgTable('family_goals', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id),

  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  targetValue: decimal('target_value', { precision: 12, scale: 2 }),
  currentValue: decimal('current_value', { precision: 12, scale: 2 }).default('0'),
  deadline: date('deadline'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
```

---

## 12. Definition of Done

- [ ] CRUD de membros da família
- [ ] Visualização de árvore familiar
- [ ] Lembretes de datas importantes
- [ ] Registro de tempo de qualidade
- [ ] Informações dos filhos
- [ ] Tarefas domésticas
- [ ] Calendário familiar agregado
- [ ] Metas familiares
- [ ] Testes unitários
- [ ] Testes E2E

---

*Última atualização: 26 Janeiro 2026*
