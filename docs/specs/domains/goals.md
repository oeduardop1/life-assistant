# Goals (M2.3)

> Metas com prazo e valor mensurável, com milestones e progresso automático.

---

## 1. Overview

O módulo de metas permite ao usuário definir objetivos com prazo e valor mensurável:
- **Goals** — Metas com valor alvo, progresso e status automático
- **GoalMilestones** — Sub-metas opcionais para acompanhamento intermediário

### Philosophy

> **ADR-015:** Goals são opcionais. O sistema funciona sem metas definidas. Tom de oferta, não de cobrança.

### Architecture

Goals vive como **tab em `/tracking`** (rota: `/tracking/goals`). Backend dentro de `modules/tracking/`, seguindo o mesmo padrão de Habits (entidade com sub-entidade dentro do módulo tracking).

### Registration Modes

1. **Captura conversacional:** IA cria metas via `create_goal` com confirmação
2. **Dashboard manual:** Formulário em `/tracking/goals` para criação/edição

---

## 2. Entities

### 2.1 Goal

| Campo | Obrigatório | Tipo | Descrição |
|-------|-------------|------|-----------|
| id | ✅ | uuid | PK auto-gerado |
| userId | ✅ | uuid | FK para users |
| title | ✅ | varchar(255) | Nome da meta |
| description | ❌ | text | Descrição detalhada |
| area | ✅ | LifeArea enum | Área da vida (health, finance, professional, learning, spiritual, relationships) |
| subArea | ❌ | SubArea enum | Sub-área (physical, mental, budget, etc.) |
| targetValue | ✅ | decimal(10,2) | Valor alvo — NOT NULL |
| currentValue | ✅ | decimal(10,2) | Valor atual — NOT NULL, default 0 |
| unit | ✅ | varchar(50) | Unidade de medida — NOT NULL |
| startDate | ✅ | date | Data de início — NOT NULL |
| endDate | ✅ | date | Data prazo — NOT NULL |
| status | ✅ | GoalStatus enum | Status (default: not_started) |
| deletedAt | ❌ | timestamp | Soft delete |

**GoalStatus enum:** `not_started`, `in_progress`, `completed`, `failed`, `canceled`

**Regras de validação:**
- targetValue > 0
- currentValue >= 0
- startDate < endDate
- unit: não vazio (min 1 char)

### 2.2 GoalMilestone

| Campo | Obrigatório | Tipo | Descrição |
|-------|-------------|------|-----------|
| id | ✅ | uuid | PK auto-gerado |
| goalId | ✅ | uuid | FK para goals |
| title | ✅ | varchar(255) | Título do milestone |
| targetValue | ✅ | decimal(10,2) | Valor alvo — NOT NULL |
| completed | ✅ | boolean | Concluído (default false) |
| completedAt | ❌ | timestamp | Timestamp de conclusão |
| sortOrder | ✅ | integer | Ordem de exibição (default 0) |

Exemplo:
```
Meta: Ler 24 livros em 2026
├── Q1: 6 livros ✓
├── Q2: 6 livros (em progresso — 4/6)
├── Q3: 6 livros
└── Q4: 6 livros
```

---

## 3. Business Rules

### 3.1 Status Transitions

```
not_started ──[currentValue > 0]──→ in_progress        (automático no service)
in_progress ──[currentValue >= targetValue]──→ completed  (automático no service)
in_progress ──[endDate < today]──→ failed               (futuro: daily job em M3.4)
qualquer    ──[ação manual]──→ canceled                  (soft delete via deletedAt)
```

| De | Para | Gatilho | Implementação |
|----|------|---------|---------------|
| not_started | in_progress | currentValue > 0 | Automático no GoalsService (durante update de progresso) |
| in_progress | completed | currentValue >= targetValue | Automático no GoalsService (durante update de progresso) |
| in_progress | failed | endDate < today | Futuro: daily job (escopo M3.4 — Notificações Proativas) |
| qualquer | canceled | Ação manual | Soft delete (deletedAt = now) |

### 3.2 Progress Calculation

```
progress = (currentValue / targetValue) × 100
```

- Cap at 100% (não excede)
- `parseFloat()` obrigatório — Drizzle retorna decimal como string
- Milestone progress: `completedCount / totalCount × 100`

### 3.3 Tracking Integration

- **Manual only** por ora
- Progresso via formulário ou AI tool `update_goal_progress`
- Integração automática (ex: peso registrado atualiza goal de peso) adiada para futuro
- Razão: mapeamento entre tracking types e goals é complexo e requer regras configuráveis pelo usuário

### 3.4 "At Risk" Criteria

```
timeElapsed% = (diasPassados / totalDias) × 100
progress% = (currentValue / targetValue) × 100
isAtRisk = timeElapsed% - progress% > 20
```

- Campo calculado retornado pela API response (`isAtRisk`, `daysRemaining`)
- Notificação proativa: escopo M3.4 (ver §5)

### 3.5 Decimal Precision

- Manter `decimal(10,2)`, consistente com tracking
- Finance usa (12,2) para transações monetárias
- Goals são targets, não transações — max 99.999.999,99 é adequado

---

## 4. UI Structure

### 4.1 Tab Integration

Goals é uma aba dentro de `/tracking`, ao lado de Calendário, Métricas, Streaks, Hábitos e Insights:

```
/tracking
├── 📅 Calendário       (vista principal)
├── 📈 Métricas
├── 🔥 Streaks
├── ☑️ Hábitos
├── 💡 Insights
└── 🎯 Metas            ← NOVA TAB
```

- Rota: `/tracking/goals`
- Ícone: `Target` (lucide-react)
- Label: "Metas"

### 4.2 Lista de Metas

```
┌─────────────────────────────────────────┐
│ 🎯 Metas        [+ Nova Meta]          │
│                                         │
│ Filtros: [Status ▼] [Área ▼]           │
├─────────────────────────────────────────┤
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ 📚 Ler 24 livros em 2026           │ │
│ │ Área: Aprendizado                   │ │
│ │ ████████████░░░░░░░░ 58% (14/24)   │ │
│ │ 🔵 Em progresso · 180 dias restam  │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ ⚖️ Perder 10kg                     │ │
│ │ Área: Saúde                         │ │
│ │ ████░░░░░░░░░░░░░░░░ 30% (3/10)   │ │
│ │ ⚠️ Em risco · 90 dias restam       │ │
│ └─────────────────────────────────────┘ │
│                                         │
│              [Carregar mais...]          │
└─────────────────────────────────────────┘
```

### 4.3 Detalhe da Meta

```
┌─────────────────────────────────────────┐
│ 📚 Ler 24 livros em 2026          [✏️] │
│ Área: Aprendizado · Unidade: livros     │
├─────────────────────────────────────────┤
│                                         │
│ PROGRESSO                               │
│ ████████████░░░░░░░░ 58% (14/24)       │
│ 🔵 Em progresso                         │
│ Início: 01/01/2026 · Prazo: 31/12/2026 │
│ 300 dias restantes                      │
│                                         │
│ [Atualizar Progresso]                   │
│                                         │
│ MILESTONES                              │
│ ┌─────────────────────────────────────┐ │
│ │ ☑ Q1: 6 livros (6/6)              │ │
│ │ ☑ Q2: 6 livros (6/6)              │ │
│ │ ☐ Q3: 6 livros (2/6)              │ │
│ │ ☐ Q4: 6 livros (0/6)              │ │
│ └─────────────────────────────────────┘ │
│ [+ Adicionar Milestone]                 │
│                                         │
└─────────────────────────────────────────┘
```

### 4.4 Formulário de Meta

```
┌─────────────────────────────────────────┐
│ Nova Meta                          ✕    │
├─────────────────────────────────────────┤
│                                         │
│ Título *        [                     ] │
│ Descrição       [                     ] │
│ Área *          [Saúde           ▼]    │
│ Sub-área        [Física          ▼]    │
│ Valor Alvo *    [     ] Unidade [   ]  │
│ Data Início *   [DD/MM/AAAA]           │
│ Data Prazo *    [DD/MM/AAAA]           │
│                                         │
│ MILESTONES (opcional)                   │
│ ┌─────────────────────────────────────┐ │
│ │ Título [          ] Valor [    ]    │ │
│ │ [+ Adicionar]                       │ │
│ └─────────────────────────────────────┘ │
│                                         │
│              [Cancelar] [Salvar]        │
└─────────────────────────────────────────┘

* = campo obrigatório
```

---

## 5. Notifications

Tabela definindo **o que** goals precisa de notificações:

| Tipo | Quando | Template |
|------|--------|----------|
| `goal_at_risk` | gap tempo-progresso > 20% | "Meta '{title}' está em risco: {progress}% com {timeElapsed}% do prazo" |
| `goal_completed` | currentValue >= targetValue | "Parabéns! Meta '{title}' concluída!" |
| `goal_failed` | endDate passou sem completar | "Meta '{title}' expirou com {progress}% de progresso" |

> **Implementação:** M3.4 — Notificações Proativas (`docs/milestones/phase-3-assistant.md`). M2.3 calcula `isAtRisk` como campo da API, mas não envia notificações.

---

## 6. API Endpoints

### 6.1 Goals

| Operação | Endpoint | Método | Descrição |
|----------|----------|--------|-----------|
| Criar | `/goals` | POST | Cria meta com milestones opcionais |
| Listar | `/goals` | GET | Lista metas com filtros e paginação |
| Buscar | `/goals/:id` | GET | Meta por ID com milestones |
| Atualizar | `/goals/:id` | PATCH | Atualiza campos da meta |
| Deletar | `/goals/:id` | DELETE | Soft delete (deletedAt) |
| Progresso | `/goals/:id/progress` | PATCH | Atualiza currentValue (quick update) |

### 6.2 Milestones

| Operação | Endpoint | Método | Descrição |
|----------|----------|--------|-----------|
| Criar | `/goals/:id/milestones` | POST | Cria milestone |
| Listar | `/goals/:id/milestones` | GET | Lista milestones da meta |
| Atualizar | `/goals/:id/milestones/:mid` | PATCH | Atualiza milestone |
| Deletar | `/goals/:id/milestones/:mid` | DELETE | Remove milestone |
| Completar | `/goals/:id/milestones/:mid/complete` | PATCH | Marca como concluído |

### 6.3 Filters & Pagination

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| status | GoalStatus | Filtrar por status |
| area | LifeArea | Filtrar por área |
| limit | number | Itens por página (default 20, max 100) |
| offset | number | Offset para paginação (default 0) |

### 6.4 Response Format

```typescript
// GET /goals response
interface GoalResponse {
  id: string;
  title: string;
  description: string | null;
  area: LifeArea;
  subArea: SubArea | null;
  targetValue: number;     // parseFloat do decimal
  currentValue: number;    // parseFloat do decimal
  unit: string;
  startDate: string;       // ISO date
  endDate: string;         // ISO date
  status: GoalStatus;
  // Campos calculados:
  progressPercent: number;  // (currentValue / targetValue) × 100, cap 100
  isAtRisk: boolean;        // timeElapsed% - progress% > 20
  daysRemaining: number;    // dias até endDate (0 se passou)
  // Sub-entidade:
  milestones: GoalMilestoneResponse[];
  // Timestamps:
  createdAt: string;
  updatedAt: string;
}

interface GoalMilestoneResponse {
  id: string;
  title: string;
  targetValue: number;
  completed: boolean;
  completedAt: string | null;
  sortOrder: number;
}

// GET /goals list response
interface GoalsListResponse {
  data: GoalResponse[];
  meta: {
    total: number;
    limit: number;
    offset: number;
  };
}
```

---

## 7. AI Tools

| Tool | Tipo | Confirmation | Descrição |
|------|------|-------------|-----------|
| `create_goal` | WRITE | ✅ | Cria nova meta |
| `get_goals` | READ | ❌ | Lista metas com filtros |
| `update_goal` | WRITE | ✅ | Edita campos de meta existente |
| `update_goal_progress` | WRITE | ✅ | Atualiza progresso (quick update) |
| `delete_goal` | WRITE | ✅ | Soft delete de meta |

### 7.1 create_goal

```typescript
{
  name: 'create_goal',
  description: 'Cria uma nova meta com prazo e valor alvo. Use quando o usuario mencionar um objetivo, meta ou alvo que deseja alcançar.',
  parameters: z.object({
    title: z.string().min(1).max(255)
      .describe('Titulo da meta'),
    area: z.enum(['health', 'finance', 'professional', 'learning', 'spiritual', 'relationships'])
      .describe('Area da vida'),
    subArea: z.enum(['physical', 'mental', 'leisure', 'budget', 'savings', 'debts', 'investments', 'career', 'business', 'formal', 'informal', 'practice', 'community', 'family', 'romantic', 'social']).optional()
      .describe('Sub-area (opcional)'),
    targetValue: z.number().positive()
      .describe('Valor alvo a atingir'),
    unit: z.string().min(1).max(50)
      .describe('Unidade de medida (kg, livros, km, R$, etc.)'),
    startDate: z.string()
      .describe('Data de inicio (YYYY-MM-DD)'),
    endDate: z.string()
      .describe('Data prazo (YYYY-MM-DD)'),
    description: z.string().optional()
      .describe('Descricao detalhada (opcional)'),
    milestones: z.array(z.object({
      title: z.string(),
      targetValue: z.number().positive(),
    })).optional()
      .describe('Sub-metas opcionais'),
  }),
  requiresConfirmation: true,
  inputExamples: [
    { title: 'Ler 24 livros', area: 'learning', subArea: 'informal', targetValue: 24, unit: 'livros', startDate: '2026-01-01', endDate: '2026-12-31', milestones: [{ title: 'Q1', targetValue: 6 }, { title: 'Q2', targetValue: 6 }] },
    { title: 'Perder 10kg', area: 'health', subArea: 'physical', targetValue: 10, unit: 'kg', startDate: '2026-01-01', endDate: '2026-06-30' },
  ],
  // Retorno esperado:
  // { goal: { id, title, area, targetValue, unit, startDate, endDate, status, milestones? }, message: string }
}
```

### 7.2 get_goals

```typescript
{
  name: 'get_goals',
  description: 'Retorna metas do usuario com progresso e status. Use quando perguntarem sobre metas, objetivos, progresso ou realizacoes.',
  parameters: z.object({
    status: z.enum(['not_started', 'in_progress', 'completed', 'failed', 'canceled']).optional()
      .describe('Filtrar por status'),
    area: z.enum(['health', 'finance', 'professional', 'learning', 'spiritual', 'relationships']).optional()
      .describe('Filtrar por area'),
    limit: z.number().min(1).max(100).optional().default(20)
      .describe('Itens por pagina'),
    offset: z.number().min(0).optional().default(0)
      .describe('Offset para paginacao'),
    includeMilestones: z.boolean().optional().default(false)
      .describe('Incluir milestones de cada meta'),
  }),
  requiresConfirmation: false,
  inputExamples: [
    { status: 'in_progress' },
    { area: 'health', includeMilestones: true },
  ],
  // Retorno esperado:
  // {
  //   goals: Array<{ id, title, area, targetValue, currentValue, unit, startDate, endDate, status, progressPercent, isAtRisk, daysRemaining, milestones? }>,
  //   count: number,
  //   message: string
  // }
}
```

### 7.3 update_goal

```typescript
{
  name: 'update_goal',
  description: 'Atualiza campos de uma meta existente. Use quando o usuario quiser mudar titulo, descricao, prazo ou valor alvo.',
  parameters: z.object({
    goalId: z.string().uuid()
      .describe('ID da meta'),
    title: z.string().min(1).max(255).optional()
      .describe('Novo titulo'),
    description: z.string().optional()
      .describe('Nova descricao'),
    targetValue: z.number().positive().optional()
      .describe('Novo valor alvo'),
    unit: z.string().min(1).max(50).optional()
      .describe('Nova unidade'),
    endDate: z.string().optional()
      .describe('Novo prazo (YYYY-MM-DD)'),
  }),
  requiresConfirmation: true,
  inputExamples: [
    { goalId: '123e4567-e89b-12d3-a456-426614174000', targetValue: 30, endDate: '2026-12-31' },
  ],
  // Retorno esperado:
  // { goal: { id, title, targetValue, unit, endDate, status, progressPercent }, message: string }
}
```

### 7.4 update_goal_progress

```typescript
{
  name: 'update_goal_progress',
  description: 'Atualiza o progresso de uma meta (currentValue). Use quando o usuario informar progresso em uma meta existente.',
  parameters: z.object({
    goalId: z.string().uuid()
      .describe('ID da meta'),
    currentValue: z.number().min(0)
      .describe('Novo valor atual'),
  }),
  requiresConfirmation: true,
  inputExamples: [
    { goalId: '123e4567-e89b-12d3-a456-426614174000', currentValue: 15 },
    { goalId: '123e4567-e89b-12d3-a456-426614174000', currentValue: 7.5 },
  ],
  // Retorno esperado:
  // { goal: { id, title, currentValue, targetValue, unit, status, progressPercent, isAtRisk }, message: string }
  // Nota: status pode mudar automaticamente (not_started → in_progress, in_progress → completed)
}
```

### 7.5 delete_goal

```typescript
{
  name: 'delete_goal',
  description: 'Exclui uma meta (soft delete). Use quando o usuario quiser remover ou cancelar uma meta.',
  parameters: z.object({
    goalId: z.string().uuid()
      .describe('ID da meta'),
  }),
  requiresConfirmation: true,
  inputExamples: [
    { goalId: '123e4567-e89b-12d3-a456-426614174000' },
  ],
  // Retorno esperado:
  // { success: boolean, message: string }
}
```

---

## 8. Backend Module Architecture

Goals fica **dentro de `modules/tracking/`** seguindo o padrão de Habits:

```
modules/tracking/                          # Módulo existente
├── tracking.module.ts                     # Adicionar goals providers
├── presentation/
│   ├── controllers/
│   │   ├── tracking.controller.ts         # Existente
│   │   ├── habits.controller.ts           # Existente
│   │   ├── custom-metric.controller.ts    # Existente
│   │   ├── goals.controller.ts            # NOVO
│   │   └── goal-milestones.controller.ts  # NOVO
│   └── dtos/
│       ├── create-tracking-entry.dto.ts   # Existente
│       ├── habits.dto.ts                  # Existente
│       ├── custom-metric.dto.ts           # Existente
│       ├── goal.dto.ts                    # NOVO
│       └── goal-milestone.dto.ts          # NOVO
├── application/
│   └── services/
│       ├── tracking.service.ts                   # Existente
│       ├── habits.service.ts                     # Existente
│       ├── tracking-tool-executor.service.ts     # Existente (adicionar delegação)
│       ├── goals.service.ts                      # NOVO
│       ├── goal-milestones.service.ts            # NOVO
│       └── goals-tool-executor.service.ts        # NOVO (delegado pelo tracking executor)
├── domain/
│   └── ports/
│       ├── tracking-entry.repository.port.ts     # Existente
│       ├── habits.repository.port.ts             # Existente
│       ├── goals.repository.port.ts              # NOVO + GOALS_REPOSITORY Symbol
│       └── goal-milestones.repository.port.ts    # NOVO + GOAL_MILESTONES_REPOSITORY Symbol
└── infrastructure/
    └── repositories/
        ├── tracking-entry.repository.ts          # Existente
        ├── habits.repository.ts                  # Existente
        ├── goals.repository.ts                   # NOVO
        └── goal-milestones.repository.ts         # NOVO
```

### DI em tracking.module.ts

Adicionar:
- **Providers:** GoalsService, GoalMilestonesService, GoalsToolExecutorService, GoalsRepository, GoalMilestonesRepository
- **DI tokens:** `{ provide: GOALS_REPOSITORY, useExisting: GoalsRepository }`, `{ provide: GOAL_MILESTONES_REPOSITORY, useExisting: GoalMilestonesRepository }`
- **Controllers:** GoalsController, GoalMilestonesController
- **Exports:** GoalsService, GoalMilestonesService

### Chat Integration

Em `chat.service.ts`:
- Goal tools (`create_goal`, `get_goals`, `update_goal`, `update_goal_progress`, `delete_goal`) mapeiam para `'tracking'` no `toolToExecutorMap`
- `tracking-tool-executor.service.ts` delega goals para `GoalsToolExecutorService`
- GoalsToolExecutorService implementa switch/case para as 5 tools

**Por que dentro de tracking (não módulo separado):**
- Habits tem sub-entidade (completions) e está dentro de tracking — mesma situação
- Ambos compartilham o mesmo arquivo de schema (`goals.ts`)
- Frontend agrupa sob /tracking — backend deve seguir
- Evita over-engineering: menos módulos, menos DI wiring

---

## 9. Data Model

### 9.1 Database Tables

| Table | Entity | Description |
|-------|--------|-------------|
| `goals` | Goal | Metas com valor alvo e progresso |
| `goal_milestones` | GoalMilestone | Sub-metas por meta |

### 9.2 Drizzle Schema

```typescript
// packages/database/src/schema/goals.ts (existente)

export const goals = pgTable('goals', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),

  // Basic info (ADR-017)
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  area: lifeAreaEnum('area').notNull(),
  subArea: subAreaEnum('sub_area'),

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
}, (table) => [
  index('goals_user_id_idx').on(table.userId),
  index('goals_status_idx').on(table.status),
]);

export const goalMilestones = pgTable('goal_milestones', {
  id: uuid('id').primaryKey().defaultRandom(),
  goalId: uuid('goal_id').notNull().references(() => goals.id, { onDelete: 'cascade' }),

  title: varchar('title', { length: 255 }).notNull(),
  targetValue: decimal('target_value', { precision: 10, scale: 2 }).notNull(),
  completed: boolean('completed').notNull().default(false),
  completedAt: timestamp('completed_at', { withTimezone: true }),

  sortOrder: integer('sort_order').notNull().default(0),

  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('goal_milestones_goal_id_idx').on(table.goalId),
]);
```

### 9.3 RLS Policies

```sql
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_access" ON goals
  FOR ALL USING (user_id = (SELECT auth.uid()));

ALTER TABLE goal_milestones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_access" ON goal_milestones
  FOR ALL USING (
    goal_id IN (SELECT id FROM goals WHERE user_id = (SELECT auth.uid()))
  );
```

> **Referência:** Ver `docs/specs/core/auth-security.md` §3.2 para detalhes sobre `auth.uid()`.

---

## 10. Definition of Done

### CRUD Goals & Milestones
- [ ] CRUD de metas funciona (API + UI)
- [ ] CRUD de milestones funciona (API + UI)
- [ ] Soft delete com deletedAt
- [ ] Validações Zod/class-validator aplicadas (targetValue > 0, startDate < endDate)

### Progress & Status Transitions
- [ ] Progresso calculado automaticamente `(currentValue / targetValue) × 100`
- [ ] Status transition: not_started → in_progress (quando currentValue > 0)
- [ ] Status transition: in_progress → completed (quando currentValue >= targetValue)
- [ ] `isAtRisk` calculado e exibido na UI
- [ ] `parseFloat()` em todos os campos decimais

### AI Tools
- [ ] `create_goal` (WRITE, com confirmação)
- [ ] `get_goals` (READ, com paginação + milestones opcionais)
- [ ] `update_goal` (WRITE, com confirmação)
- [ ] `update_goal_progress` (WRITE, com confirmação)
- [ ] `delete_goal` (WRITE, com confirmação)
- [ ] Tools registradas em allTools/readTools/writeTools
- [ ] GoalsToolExecutorService integrado no tracking-tool-executor

### Frontend
- [ ] Tab "Metas" visível e funcional em /tracking
- [ ] GoalCard, GoalList, GoalForm, GoalProgressBar, GoalStatusBadge
- [ ] MilestoneList, MilestoneForm
- [ ] Modais: criar, editar, deletar, atualizar progresso
- [ ] React Query hooks com cache invalidation
- [ ] Paginação e filtros funcionando

### Tests
- [ ] Unit: GoalsService, GoalMilestonesService, GoalsToolExecutorService
- [ ] Unit: DTOs validação
- [ ] Integration: CRUD goals/milestones via API, status transitions, paginação
- [ ] Component: GoalCard, GoalForm, MilestoneList
- [ ] Hooks: useGoals, useUpdateGoalProgress
- [ ] E2E: criar meta, atualizar progresso, completar meta, navegar tab

### Out of Scope (M3.4)
- Notificações proativas (goal_at_risk, goal_completed, goal_failed)
- Daily job para marcar metas como failed
- Integração automática com tracking entries

---

## Related Documents

- [tracking.md](tracking.md) — Módulo pai, calendário, hábitos, métricas
- [notifications.md](notifications.md) — Notificações (M3.4)
- [dashboard.md](dashboard.md) — Widgets de metas no dashboard
- [reports.md](reports.md) — Relatórios incluem progresso de metas

---

*Última atualização: 08 Fevereiro 2026*
