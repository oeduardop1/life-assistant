# Decision Support (ADR-016)

> Decision tracking, analysis support, and follow-up system.

---

## 1. Overview

O módulo de decisões ajuda o usuário a:
- Estruturar decisões importantes
- Analisar opções com critérios ponderados
- Acompanhar resultados com follow-up automático
- Aprender com decisões passadas

### Value Proposition

- Histórico de decisões importantes não se perde
- Follow-up ajuda a avaliar qualidade das decisões
- IA aprende com outcomes reais para melhorar conselhos futuros
- Reduz ansiedade pós-decisão ("será que fiz certo?")

---

## 2. Lifecycle

```
draft       → Decisão criada, ainda sendo estruturada
analyzing   → IA analisando contexto e padrões
ready       → Opções prontas para escolha
decided     → Usuário escolheu uma opção
postponed   → Decisão adiada
canceled    → Decisão não mais relevante
reviewed    → Follow-up concluído com avaliação
```

---

## 3. Entities

| Tabela | Propósito |
|--------|-----------|
| `decisions` | Registro principal da decisão |
| `decision_options` | Opções consideradas com prós/contras |
| `decision_criteria` | Critérios de avaliação com peso |
| `decision_scores` | Matriz opção × critério |

### Decision Structure

```typescript
interface Decision {
  id: string;
  userId: string;
  title: string;
  description: string;
  area: LifeArea;
  status: DecisionStatus;
  deadline?: Date;
  chosenOptionId?: string;
  decidedAt?: Date;
  reviewDate?: Date;      // Default: decidedAt + 30 days
  reviewScore?: number;   // 1-5 satisfaction
  reviewNotes?: string;
  deletedAt?: Date;
}
```

---

## 4. Business Rules

| Regra | Descrição |
|-------|-----------|
| **Confirmação obrigatória** | `save_decision` sempre pede confirmação |
| **Área obrigatória** | Toda decisão deve ter uma `life_area` |
| **Review opt-out** | Usuário pode desativar follow-up por decisão |
| **Soft delete** | Decisões são soft-deleted (mantidas para learning) |
| **Decisões triviais** | IA não deve oferecer salvar decisões do dia-a-dia |

---

## 5. Flows

### 5.1 Creation (via Chat)

```
1. Usuário discute decisão no Modo Conselheira
2. IA identifica decisão importante
3. IA oferece: "Quer que eu salve essa decisão para acompanhamento?"
4. Se aceitar: tool save_decision com confirmação
5. Decisão criada com status 'decided' (se já escolheu) ou 'draft'
6. review_date definido (default: created_at + 30 dias)
```

### 5.2 Follow-up (Job)

```
1. Job diário (3:30 AM, após Memory Consolidation)
2. Busca decisions com review_date <= hoje e status = 'decided'
3. Para cada decisão:
   a. Adiciona mensagem proativa na próxima conversa
   b. "Há X dias você decidiu: [título]. Como foi?"
4. Usuário responde → IA extrai:
   - review_score (1-5)
   - review_notes
5. Status atualizado para 'reviewed'
6. Memory Consolidation extrai padrões
```

### 5.3 Review Extraction (AI)

Quando o usuario responde ao follow-up, a IA extrai:

```typescript
const reviewExtractionSchema = z.object({
  satisfaction: z.number().min(1).max(5).describe('Satisfacao com a decisao (1-5)'),
  outcome: z.string().describe('Descricao do resultado'),
  wouldDecideDifferently: z.boolean().describe('Se tomaria decisao diferente'),
  lessonsLearned: z.string().optional().describe('Aprendizados'),
});
```

Prompt para extracao:

```markdown
O usuario esta respondendo sobre uma decisao passada.
Extraia as seguintes informacoes da resposta:
- Satisfacao com a decisao (1-5)
- Descricao do resultado
- Se tomaria decisao diferente
- Aprendizados (se mencionados)

Decisao original: {decision.title}
Opcao escolhida: {decision.chosenOption}
Resposta do usuario: {userResponse}
```

---

## 6. Database Schema

```typescript
// packages/database/src/schema/decisions.ts

import { pgTable, uuid, varchar, text, timestamp, jsonb, index, integer, pgEnum, decimal } from 'drizzle-orm/pg-core';
import { users } from './users';
import { lifeArea } from './enums';

// Enum para status do ciclo de vida da decisão
export const decisionStatus = pgEnum('decision_status', [
  'draft',      // Criação inicial
  'analyzing',  // IA analisando
  'ready',      // Opções prontas para decisão
  'decided',    // Decisão tomada
  'postponed',  // Adiada
  'canceled',   // Cancelada
  'reviewed',   // Follow-up concluído
]);

/**
 * decisions
 * Armazena decisões importantes do usuário para follow-up e learning loop.
 */
export const decisions = pgTable('decisions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),

  // Conteúdo
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  area: lifeArea('area').notNull(), // health, finance, professional, learning, spiritual, relationships

  // Timeline
  deadline: timestamp('deadline', { withTimezone: true }),

  // Status
  status: decisionStatus('status').notNull().default('draft'),
  chosenOptionId: uuid('chosen_option_id'), // FK para decision_options
  reasoning: text('reasoning'), // Razão da escolha

  // AI Analysis
  aiAnalysis: jsonb('ai_analysis'), // { summary, recommendations, risks, patterns }

  // Review (follow-up pós-decisão)
  reviewDate: timestamp('review_date', { withTimezone: true }), // Quando fazer follow-up
  reviewScore: integer('review_score'), // 1-5 satisfação com resultado
  reviewNotes: text('review_notes'), // Reflexão sobre a decisão

  // Soft delete & timestamps
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index('decisions_user_id_idx').on(table.userId),
  statusIdx: index('decisions_status_idx').on(table.status),
  areaIdx: index('decisions_area_idx').on(table.area),
  reviewDateIdx: index('decisions_review_date_idx').on(table.reviewDate),
}));

/**
 * decision_options
 * Opções consideradas para uma decisão.
 */
export const decisionOptions = pgTable('decision_options', {
  id: uuid('id').primaryKey().defaultRandom(),
  decisionId: uuid('decision_id').notNull().references(() => decisions.id, { onDelete: 'cascade' }),

  title: varchar('title', { length: 255 }).notNull(),
  pros: jsonb('pros').$type<string[]>().default([]), // Lista de prós
  cons: jsonb('cons').$type<string[]>().default([]), // Lista de contras
  score: decimal('score', { precision: 5, scale: 2 }), // Score calculado (opcional)
  sortOrder: integer('sort_order').notNull().default(0),

  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  decisionIdIdx: index('decision_options_decision_id_idx').on(table.decisionId),
}));

/**
 * decision_criteria
 * Critérios de avaliação com peso para decisões complexas.
 */
export const decisionCriteria = pgTable('decision_criteria', {
  id: uuid('id').primaryKey().defaultRandom(),
  decisionId: uuid('decision_id').notNull().references(() => decisions.id, { onDelete: 'cascade' }),

  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  weight: decimal('weight', { precision: 3, scale: 2 }).notNull().default('1.00'), // 0.00 a 1.00
  sortOrder: integer('sort_order').notNull().default(0),

  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  decisionIdIdx: index('decision_criteria_decision_id_idx').on(table.decisionId),
}));

/**
 * decision_scores
 * Matriz de scores: opção × critério.
 */
export const decisionScores = pgTable('decision_scores', {
  id: uuid('id').primaryKey().defaultRandom(),
  optionId: uuid('option_id').notNull().references(() => decisionOptions.id, { onDelete: 'cascade' }),
  criterionId: uuid('criterion_id').notNull().references(() => decisionCriteria.id, { onDelete: 'cascade' }),

  score: decimal('score', { precision: 3, scale: 1 }).notNull(), // Ex: 1-5 ou 1-10

  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  optionIdIdx: index('decision_scores_option_id_idx').on(table.optionId),
  criterionIdIdx: index('decision_scores_criterion_id_idx').on(table.criterionId),
}));

// Types
export type Decision = typeof decisions.$inferSelect;
export type NewDecision = typeof decisions.$inferInsert;
export type DecisionOption = typeof decisionOptions.$inferSelect;
export type NewDecisionOption = typeof decisionOptions.$inferInsert;
export type DecisionCriterion = typeof decisionCriteria.$inferSelect;
export type NewDecisionCriterion = typeof decisionCriteria.$inferInsert;
export type DecisionScore = typeof decisionScores.$inferSelect;
export type NewDecisionScore = typeof decisionScores.$inferInsert;
```

---

## 7. AI Integration

### 7.1 save_decision Tool

```typescript
{
  name: 'save_decision',
  parameters: {
    title: string,
    description?: string,
    area: LifeArea,
    options?: string[],
    chosenOption?: string,
  },
  requiresConfirmation: true,
}
```

### 7.2 Counselor Mode Integration

Modo Conselheira consulta decisões passadas similares:
- Busca por área da vida
- Busca por keywords
- Traz contexto de outcomes anteriores

---

## 8. Definition of Done

- [ ] Tool `save_decision` implementada com confirmação
- [ ] CRUD de decisões via API e frontend
- [ ] Opções e critérios podem ser adicionados
- [ ] Job de follow-up executa diariamente
- [ ] Notificação proativa na próxima conversa
- [ ] Memory Consolidation extrai `decision_patterns`
- [ ] Modo Conselheira consulta decisões passadas
- [ ] Dashboard /decisions com filtros
- [ ] Avaliação pós-decisão (1-5) registrada

---

*Última atualização: 25 Janeiro 2026*
