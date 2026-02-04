# Fase 2: Tracker (v2.x)

> **Objetivo:** Implementar sistema de tracking de métricas, módulos de dados (Finance, Hábitos, CRM), Life Balance Score, dashboard e relatórios.
> **Referências:** `docs/specs/domains/tracking.md`, `docs/specs/domains/finance.md`, `docs/specs/domains/people.md`, `docs/specs/domains/goals.md`, `docs/specs/domains/reports.md`

---

## M2.1 — Módulo: Tracking & Habits 🟢

**Objetivo:** Implementar sistema unificado de tracking de métricas e hábitos com calendário visual (Year in Pixels), streaks e insights.

**Filosofia:** Baixo atrito (ADR-015). Calendário mensal como vista principal. Sistema funciona sem dados.

**Referências:** `docs/specs/domains/tracking.md`

> **Reformulação (2026-02-02):** M2.1 foi reformulado para alinhar com a nova spec `tracking.md`. A UI principal agora é o calendário mensal (não mais dashboard de cards). Componentes de dashboard antigos foram removidos. Backend de métricas permanece inalterado.

---

### Backend — Métricas ✅ (Implementado)

- [x] Módulo `tracking` com CRUD completo:
  - [x] `TrackingController` - 7 endpoints REST
  - [x] `TrackingService` - validações, agregações
  - [x] `TrackingRepository` - Drizzle ORM com RLS
- [x] 7 tipos de tracking: weight, water, sleep, exercise, mood, energy, custom
- [x] Validações por tipo (limites, unidades padrão)
- [x] Agregações (média, soma, min, max, variação)
- [x] AI Tools:
  - [x] `record_metric` (requiresConfirmation: true)
  - [x] `get_tracking_history` (retorna IDs para update/delete)
  - [x] `update_metric` (requiresConfirmation: true)
  - [x] `delete_metric` (requiresConfirmation: true)
- [x] Captura conversacional com confirmação obrigatória
- [x] Testes unitários e integração passando

### Backend — Habits ✅ (Implementado)

- [x] Criar tabelas `habits` + `habit_completions` (§8.2-8.3)
- [x] Criar/usar enums `habit_frequency`, `period_of_day`
- [x] Implementar `HabitsController` com endpoints (§6.2):
  - [x] POST /habits - criar hábito
  - [x] GET /habits - listar hábitos do usuário
  - [x] GET /habits/:id - buscar por ID
  - [x] PATCH /habits/:id - atualizar
  - [x] DELETE /habits/:id - remover
  - [x] POST /habits/:id/complete - marcar como feito
  - [x] DELETE /habits/:id/uncomplete - desmarcar
  - [x] GET /habits/streaks - streaks de todos
- [x] Implementar `HabitsService`:
  - [x] CRUD de hábitos
  - [x] Cálculo de streaks (§5.3) - daily/weekdays/weekends/custom
  - [x] Validação de frequência
- [x] Implementar `HabitsRepository` com Drizzle
- [x] Aplicar RLS em habits e habit_completions (§8.5)
- [x] AI Tools:
  - [x] `record_habit` (§7.2) - fuzzy match por nome
  - [x] `get_habits` (§7.5) - includeStreaks, includeCompletionsToday
- [x] Atualizar `GET /habits/streaks` para incluir campo `color` na resposta

### Backend — Custom Metrics (Métricas Personalizadas) ✅ (Implementado)

- [x] Criar tabela `custom_metric_definitions` (§4.2)
- [x] Aplicar RLS em custom_metric_definitions
- [x] Implementar `CustomMetricController` com endpoints:
  - [x] POST /tracking/custom-metrics - criar definição
  - [x] GET /tracking/custom-metrics - listar definições
  - [x] GET /tracking/custom-metrics/:id - buscar por ID
  - [x] PATCH /tracking/custom-metrics/:id - atualizar
  - [x] DELETE /tracking/custom-metrics/:id - soft delete
- [x] Implementar `CustomMetricService`:
  - [x] CRUD de definições
  - [x] Validação de nome único (case-insensitive)
  - [x] Soft delete para preservar histórico
- [x] Implementar `CustomMetricRepository` com Drizzle
- [x] Validar `customMetricId` no `TrackingService` ao criar entrada custom

### Backend — Calendar API ✅ (Implementado)

- [x] `GET /tracking/calendar/:year/:month` (§6.3):
  - Retorna: days[] com date, moodScore, moodColor, habitsCompleted/Total, hasData
- [x] `GET /tracking/day/:date` (§6.3):
  - Retorna: metrics[] + habits[] com status de conclusão
- [x] `GET /tracking/by-date/:date` (§6.1):
  - Retorna: métricas de um dia específico
- [x] Implementar `CalendarService` com lógica de resumo mensal e diário

---

### Frontend — Limpeza (Remover Dashboard Antigo) ✅ (Concluído)

- [x] Página principal agora usa calendário (Year in Pixels)
- [x] Componentes reusáveis mantidos:
  - [x] `types.ts` - types, helpers, constantes (100% reusável)
  - [x] `hooks/use-tracking.ts` - React Query hooks (100% reusável)
  - [x] `ManualTrackForm` - usado na Vista do Dia e página de métricas
  - [x] `MetricCard` - usado em página de métricas
  - [x] `MetricChart` - usado em página de métricas

### Frontend — Estrutura e Navegação ✅ (Implementado)

- [x] Criar `TrackingContext` com estado do mês selecionado
- [x] `MonthSelector` componente de navegação de mês
- [x] `SwipeableCalendar` com navegação por swipe (mobile)
- [x] Criar página `/tracking` com layout de abas:
  - [x] Tab Calendário (default) - `/tracking`
  - [x] Tab Métricas - `/tracking/metrics`
  - [x] Tab Streaks - `/tracking/streaks`
  - [x] Tab Hábitos - `/tracking/habits`
  - [x] Tab Insights (placeholder para M2.5) - `/tracking/insights`

### Frontend — Calendário (Vista Principal) ✅ (Implementado)

- [x] `CalendarMonth`: Grade 7 colunas x 6 linhas
  - [x] Dias do mês atual
  - [x] Dias do mês anterior/próximo (esmaecidos)
- [x] `DayCell`: Célula clicável com:
  - [x] Número do dia
  - [x] Cor do humor (🟢 ≥7 / 🟡 4-6 / 🔴 ≤3 / cinza sem dados)
  - [x] Indicadores de hábitos (dots)
- [x] Navegação ◄ Mês ► funcional via `MonthSelector`
- [x] Indicador visual "Hoje" no dia atual
- [x] `SwipeableCalendar` com animações e swipe para mobile

### Frontend — Vista do Dia ✅ (Implementado)

- [x] `DayDetailModal`: Modal ao clicar em um dia
- [x] `DateHeader` com data formatada (ex: "Terça, 7 de Janeiro") + badge "Hoje"
- [x] Seção HÁBITOS:
  - [x] `HabitCheckbox`: Checkbox + nome + período + streak + cor
  - [x] `StreakBadge`: 🔥 + número de dias
  - [x] Toggle de conclusão com feedback otimista
  - [x] `HabitsSection` agrupamento por período do dia (manhã/tarde/noite)
  - [x] `HabitProgressDots`: indicadores visuais de conclusão
- [x] Seção MÉTRICAS:
  - [x] `MetricsSection` exibe métricas registradas no dia
  - [x] `MetricBar` barras visuais para valores
  - [x] `ProgressRing` indicador circular de progresso
  - [x] Integração com `ManualTrackForm` para adicionar métricas
- [x] Animações com framer-motion e suporte a reduced-motion
- [x] Tema "soft journaling" com cores baseadas no humor

### Frontend — Aba Streaks ✅ (Implementado)

- [x] `StreaksPage` (`/tracking/streaks`): Lista de todos os hábitos com streaks
- [x] Cards de streak com:
  - [x] Nome do hábito + ícone + cor personalizada
  - [x] Streak atual (🔥 X dias)
  - [x] Recorde pessoal (🏆) com destaque se atual = recorde
  - [x] Frequência do hábito
- [x] Ordenação por streak atual (maior primeiro)
- [x] Estados de loading, erro e empty

### Frontend — Aba Insights ✅ (Placeholder Implementado)

- [x] `InsightsPlaceholder` em `/tracking/insights`
- [x] Mensagem sobre funcionalidade futura (M2.5)
- [x] Design consistente com tema do módulo

### Frontend — Página Métricas `/tracking/metrics` ✅ (Implementado)

- [x] Página `/tracking/metrics/page.tsx` criada
- [x] Header com `MetricsPageFilters` (período 7d/30d/90d) + botão "Registrar"
- [x] `MetricSelector`: Seletor horizontal de tipo de métrica (pills)
- [x] `MetricDetailPanel`: Painel unificado com:
  - [x] Gráfico de evolução (MetricChart)
  - [x] Estatísticas (min/max/média/variação)
  - [x] Barras de consistência (% dias com registro)
- [x] `GroupedTimeline`: Timeline agrupada por dia com editar/deletar
- [x] `CustomMetricsManager`: Gerenciamento de métricas personalizadas
- [x] `InsightsPlaceholder`: Teaser para funcionalidade M2.5
- [x] Aba "Métricas" no layout de /tracking

### Frontend — Componentes de Métricas ✅ (Implementado)

- [x] `MetricsStatsTable`: Tabela min/max/média/variação/dias por tipo
- [x] `MetricDetailPanel`: Painel com chart + stats + consistência unificados
- [x] `GroupedTimeline`: Lista agrupada por dia com editar/deletar inline
- [x] `MetricsPageFilters`: Filtros de período (7d/30d/90d)
- [x] `MetricSelector`: Seletor horizontal de tipo (pills com cores)
- [x] Funcionalidade de editar/deletar métricas no timeline

### Frontend — Gerenciamento de Hábitos ✅ (Implementado)

- [x] `HabitForm`: Formulário para criar/editar hábito
  - [x] Nome (obrigatório)
  - [x] Ícone (emoji)
  - [x] Cor (color picker)
  - [x] Frequência (daily/weekdays/weekends/custom)
  - [x] Período do dia (manhã/tarde/noite/qualquer)
- [x] `CreateHabitModal`: Modal de criação
- [x] `EditHabitModal`: Modal de edição
- [x] `DeleteHabitDialog`: Dialog de confirmação de exclusão
- [x] `HabitList`: Lista com ações editar/excluir
- [x] Página `/tracking/habits` com gerenciamento completo
- [x] Botão "+ Novo Hábito" no header

### Frontend — Exibição de Ícone/Cor nos Hábitos

- [x] Atualizar tipo `HabitStreakInfo` para incluir `color?: string | null`
- [x] `HabitCheckbox`: Aplicar `habit.color` ao emoji (background com opacidade)
- [x] `HabitList`: Aplicar `habit.color` ao emoji
- [x] `StreaksPage`: Aplicar `habit.color` ao emoji

### Frontend — Hooks de Habits ✅ (Implementado)

- [x] `useHabits()`: Lista hábitos ativos do usuário
- [x] `useHabit(id)`: Busca hábito específico
- [x] `useCreateHabit()`: Mutation criar
- [x] `useUpdateHabit()`: Mutation atualizar
- [x] `useDeleteHabit()`: Mutation deletar
- [x] `useCompleteHabit()`: Mutation completar (optimistic update)
- [x] `useUncompleteHabit()`: Mutation desmarcar
- [x] `useHabitStreaks()`: Busca todos os streaks
- [x] `useHabitsByStreak()`: Streaks ordenados
- [x] `useHasHabits()`: Verifica se usuário tem hábitos

### Frontend — Hooks de Calendar ✅ (Implementado)

- [x] `useCalendarMonth(year, month)`: Busca resumo do mês
- [x] `useCalendarMonthData()`: Resumo com helpers
- [x] `useDayDetail(date)`: Busca métricas + hábitos do dia
- [x] `useDayDetailData()`: Dia com stats parseados
- [x] `useMetricsByDate()`: Métricas de uma data específica

### Frontend — Hooks de Métricas ✅ (Implementado)

- [x] `useTrackingConsistency(days)`: Calcula % de dias com registro por tipo
- [x] `useSwipeNavigation()`: Hook para navegação por swipe no calendário

### Frontend — Custom Metrics (Métricas Personalizadas) ✅ (Implementado)

- [x] Adicionar tipo `CustomMetricDefinition` em `types.ts`
- [x] Hook `useCustomMetrics()`: Lista definições
- [x] Hook `useCreateCustomMetric()`: Mutation criar
- [x] Hook `useUpdateCustomMetric()`: Mutation atualizar
- [x] Hook `useDeleteCustomMetric()`: Mutation deletar
- [x] Componentes em `components/custom-metrics/`:
  - [x] `CustomMetricForm`: Formulário nome/unidade/icon/color/min/max
  - [x] `CreateCustomMetricModal`: Modal criação
  - [x] `EditCustomMetricModal`: Modal edição
  - [x] `DeleteCustomMetricDialog`: Dialog confirmação
  - [x] `CustomMetricsManager`: Lista de gerenciamento
- [x] Integração no `MetricSelector`: Exibir métricas custom
- [x] Integração no `ManualTrackForm`: Permitir registrar custom (chips visuais)
- [x] Botão "Gerenciar Métricas" na página /tracking/metrics

### Frontend — Página de Hábitos (Detalhes e Analytics) ✅ (Implementado)

> **Contexto:** Extensão do gerenciamento de hábitos com vista detalhada por hábito, similar à `MetricDetailPanel` da página de métricas.

_Backend:_
- [x] Adicionar endpoint `GET /habits/:id/completions`:
  - [x] Query params: `startDate`, `endDate` (YYYY-MM-DD, default 84 dias)
  - [x] Response: `completions[]` + `stats` (totalCompletions, completionRate, currentStreak, longestStreak)
  - [x] Reutilizar `findCompletions()` do repository existente
- [x] Adicionar `GetHabitCompletionsQueryDto` em `habits.dto.ts`
- [x] Adicionar `getCompletionsWithStats()` em `habits.service.ts`

_Frontend - Componentes:_
- [x] Criar `habit-selector.tsx` - seletor horizontal de hábitos (copiar pattern de `metric-selector.tsx`)
- [x] Criar `habit-detail-panel.tsx` - painel unificado com chart + stats (copiar layout de `metric-detail-panel.tsx`)
- [x] Criar `completion-heatmap.tsx` - grid de 12 semanas com completions
- [x] Criar `habit-stats-sidebar.tsx` - estatísticas (reutilizar `StreakBadge`)
- [x] Export novos componentes em `components/habits/index.ts`

_Frontend - Hooks e Types:_
- [x] Adicionar `HabitCompletionsWithStats` type em `types.ts`
- [x] Adicionar `useHabitCompletions(habitId, startDate, endDate)` hook em `use-habits.ts`
- [x] Utilizar `habitsKeys.completions(id)` query key

_Frontend - Integração:_
- [x] Atualizar página `/tracking/habits` com layout selector + detail panel
- [x] Adicionar CSS variables para heatmap em `globals.css`

_Frontend - Period of Day Grouping (Vista Alternativa):_
- [x] Criar `habit-period-grouping.tsx` - agrupamento por período do dia (manhã/tarde/noite/qualquer hora)
- [x] Toggle de vista no header da página (Grid ↔ Período)
- [x] Clique em hábito seleciona e mostra HabitDetailPanel

---

### Testes — Backend Métricas ✅ (Implementado)

- [x] Unit: TrackingService validações, limites, unidades
- [x] Unit: TrackingController endpoints REST
- [x] Unit: TrackingRepository operações CRUD
- [x] Unit: TrackingToolExecutorService (4 tools)
- [x] Integration: API REST tracking
- [x] Integration: Multi-tenant isolation

### Testes — Backend Habits

- [ ] Unit: HabitsService CRUD
- [ ] Unit: HabitsService cálculo de streak (daily/weekdays/custom)
- [ ] Unit: HabitsRepository operações
- [ ] Integration: CRUD habits via API
- [ ] Integration: Completar/desmarcar hábito
- [ ] Integration: GET /habits/streaks

### Testes — Backend Calendar API

- [ ] Integration: GET /tracking/calendar/:year/:month retorna resumo correto
- [ ] Integration: GET /tracking/day/:date retorna métricas + hábitos
- [ ] Integration: GET /tracking/by-date/:date retorna métricas do dia

### Testes — Frontend Componentes

- [ ] Component: CalendarMonth renderiza dias corretamente
- [ ] Component: DayCell mostra cor e indicadores
- [ ] Component: DayDetail abre com dados corretos
- [ ] Component: HabitCheckbox toggle funciona
- [ ] Component: StreakBadge exibe número correto
- [ ] Component: HabitForm validação funciona
- [x] Component: HabitCheckbox exibe cor do hábito
- [x] Component: HabitList exibe cor do hábito
- [x] Component: StreaksPage exibe cor do hábito

### Testes — Frontend Componentes Métricas

- [ ] Component: MetricsStatsTable renderiza estatísticas corretamente
- [ ] Component: MetricsConsistencyBars calcula % corretamente
- [ ] Component: MetricsTimeline lista com paginação e ações
- [ ] Component: EditMetricModal edição funciona
- [ ] Component: DeleteMetricDialog confirmação funciona

### Testes — Frontend Hooks

- [ ] Hooks: useHabits, useCreateHabit, useDeleteHabit
- [ ] Hooks: useCompleteHabit, useUncompleteHabit
- [ ] Hooks: useCalendarMonth, useDayDetail
- [ ] Hooks: useHabitStreaks
- [ ] Hooks: useTrackingConsistency

### Testes — E2E

- [ ] E2E: Navegar entre meses no calendário
- [ ] E2E: Clicar no dia → ver detalhes
- [ ] E2E: Completar hábito → streak atualiza
- [ ] E2E: Criar novo hábito
- [ ] E2E: Registrar métricas do dia
- [ ] E2E: Ver aba Streaks com dados
- [ ] E2E: Navegar para /tracking/metrics
- [ ] E2E: Editar métrica via timeline
- [ ] E2E: Excluir métrica via timeline
- [ ] E2E: Filtrar métricas por período e tipo

---

### Definition of Done

**Métricas ✅ (implementado):**
- [x] CRUD funciona
- [x] Validações aplicadas
- [x] Agregações calculadas
- [x] AI tools funcionam (record, get, update, delete)
- [x] Captura conversacional com confirmação
- [x] Testes passam

**Habits ✅ (implementado):**
- [x] CRUD de hábitos funciona via API
- [x] Completar/desmarcar via API
- [x] Completar/desmarcar via chat (AI tools: record_habit, get_habits)
- [x] Streaks calculados corretamente (daily/weekdays/weekends/custom)
- [x] RLS aplicado em habits e habit_completions

**Calendar View ✅ (implementado):**
- [x] Calendário mensal é a vista principal de /tracking
- [x] Navegação entre meses funciona (MonthSelector + swipe)
- [x] Cores dos dias baseadas no humor (🟢🟡🔴 ou cinza)
- [x] Indicadores de hábitos por dia (dots)
- [x] Clicar no dia abre Vista do Dia (DayDetailModal)

**Vista do Dia ✅ (implementado):**
- [x] Modal abre corretamente com animações
- [x] Hábitos com checkboxes funcionam (optimistic updates)
- [x] Métricas exibidas com barras visuais
- [x] Botão para adicionar novas métricas (ManualTrackForm)

**Abas ✅ (implementado):**
- [x] Tab Calendário funcional (default)
- [x] Tab Métricas funcional
- [x] Tab Streaks funcional
- [x] Tab Hábitos funcional
- [x] Tab Insights (placeholder)

**Página Métricas ✅ (implementado):**
- [x] MetricDetailPanel com chart + stats + consistência
- [x] Gráficos de evolução funcionam (MetricChart)
- [x] Estatísticas exibem min/max/média/variação
- [x] Barras de consistência mostram % de dias com registro
- [x] GroupedTimeline lista entradas com editar/deletar
- [x] Filtros de período funcionam

**Custom Metrics ✅ (implementado):**
- [x] CRUD de definições via API
- [x] Registrar valores via ManualTrackForm com chips visuais
- [x] Gerenciamento na página /tracking/metrics

**Testes:**
- [x] Testes unitários backend métricas passam
- [ ] Testes unitários backend habits (não verificados)
- [ ] Testes integração (não verificados)
- [ ] Testes componentes (não verificados)
- [ ] Testes E2E (não verificados)

---

### Notas Históricas

**Notas (2026-01-20):**
- Backend de métricas implementado com 7 tipos
- AI tools record_metric, get_tracking_history, update_metric, delete_metric funcionando
- Captura conversacional com confirmação via LLM (não regex)

**Notas (2026-02-02 - Reformulação):**
- M2.1 reformulado para alinhar com nova spec `docs/specs/domains/tracking.md`
- **REMOVIDO:** Dashboard de cards (MetricCardsGrid, TrackingHistory, TrackingEmptyState)
- **MANTIDO:** Backend de métricas inteiro, types.ts, hooks/use-tracking.ts, ManualTrackForm
- **NOVA UI:** Calendário mensal "Year in Pixels" como vista principal
- **NOVO:** Sistema de hábitos com streaks
- **NOVO:** Abas (Calendário, Insights, Streaks)
- Tasks de frontend/testes antigos removidas pois componentes serão diferentes
- Tasks de backend métricas mantidas como ✅ (implementação válida)

**Notas (2026-02-03 - Auditoria de Código):**
- **AUDITORIA:** Comparação milestone vs código fonte revelou que ~95% já estava implementado
- **BACKEND:** Habits, Calendar API, Custom Metrics - todos 100% implementados
- **FRONTEND:** Calendário, Vista do Dia, Streaks, Métricas, Gerenciamento de Hábitos - todos implementados
- **HOOKS:** Todos os hooks de habits, calendar e métricas existem e funcionam
- **CORRIGIDO:** ManualTrackForm agora suporta custom metrics com chips visuais
- **PENDENTE:** Apenas validação de customMetricId no TrackingService e testes formais
- Milestone atualizado de 🟡 para 🟢 para refletir status real

---

## M2.2 — Módulo: Finance 🟡

**Objetivo:** Implementar planejamento financeiro mensal de alto nível (controle pessoal, não micro-tracking de gastos).

**Filosofia:** Baixo atrito. Usuário cadastra orçamento no início do mês e marca contas como pagas ao longo do mês.

**Referências:** `docs/specs/domains/tracking.md`, `docs/specs/domains/finance.md`

> **Nota:** Este módulo alimenta a área "finance" do Life Balance Score (M2.5).

**Tasks:**

**Backend:**

_Módulo e Estrutura:_
- [x] Criar enums PostgreSQL:
  - [x] `income_type` (salary, freelance, bonus, passive, investment, gift, other)
  - [x] `income_frequency` (monthly, biweekly, weekly, annual, irregular)
  - [x] `bill_category` (housing, utilities, subscription, insurance, other)
  - [x] `bill_status` (pending, paid, overdue, canceled)
  - [x] `debt_status` (active, paid_off, settled, defaulted)
  - [x] `investment_type` (emergency_fund, retirement, short_term, long_term, education, custom)
- [x] Criar módulo `finance`:
  - [x] Controllers por entidade (bills, incomes, expenses, debts, investments, finance-summary)
  - [x] `IncomeService` - gerenciar rendas
  - [x] `BillService` - gerenciar contas fixas
  - [x] `ExpenseService` - gerenciar despesas variáveis
  - [x] `DebtService` - gerenciar dívidas com parcelas
  - [x] `InvestmentService` - gerenciar investimentos
  - [x] `FinanceSummaryUseCase` - calcular KPIs do dashboard
- [x] Criar repositories (Clean Architecture):
  - [x] `IncomesRepository` + port interface
  - [x] `BillsRepository` + port interface
  - [x] `VariableExpensesRepository` + port interface
  - [x] `DebtsRepository` + port interface
  - [x] `InvestmentsRepository` + port interface
- [x] Criar DTOs de query (filtros e paginação)

_Tabelas (Migrations):_
- [x] Criar tabelas:
  - [x] `incomes` - fontes de renda (nome, tipo, frequência, previsto, real, recorrente, monthYear)
  - [x] `bills` - contas fixas (nome, categoria, valor, vencimento, status, paidAt, recorrente, monthYear)
  - [x] `variable_expenses` - despesas variáveis (nome, categoria, previsto, real, recorrente, monthYear)
  - [x] `debts` - dívidas (nome, credor, total, isNegotiated, parcelas, valor_parcela, parcela_atual, vencimento, status, notes)
  - [x] `debt_payments` - histórico de pagamentos de parcelas por mês (userId, debtId, installmentNumber, amount, monthYear, paidAt)
  - [x] `investments` - investimentos (nome, tipo, meta, atual, aporte_mensal, prazo)

_Endpoints REST:_
- [x] Implementar CRUD completo para cada entidade:
  - [x] `POST /finance/incomes` - criar renda
  - [x] `GET /finance/incomes` - listar rendas (com filtros)
  - [x] `GET /finance/incomes/:id` - obter renda
  - [x] `PATCH /finance/incomes/:id` - atualizar renda
  - [x] `DELETE /finance/incomes/:id` - excluir renda
  - [x] (idem para bills, expenses, debts, investments)
- [x] Implementar endpoints de ação específicos:
  - [x] `PATCH /finance/bills/:id/mark-paid` - marcar conta como paga (status='paid', paidAt=now())
  - [x] `PATCH /finance/bills/:id/mark-unpaid` - desmarcar conta (status='pending', paidAt=null)
  - [x] `PATCH /finance/debts/:id/pay-installment` - pagar parcela (currentInstallment++, auto-quitação)
  - [x] `PATCH /finance/debts/:id/negotiate` - negociar dívida (preencher parcelas, isNegotiated=true)
  - [x] `PATCH /finance/investments/:id/update-value` - atualizar valor atual do investimento
- [x] Implementar endpoint de resumo:
  - [x] `GET /finance/summary` - retorna todos os KPIs do mês selecionado

_Recorrências (Lazy Generation):_
- [x] Schema: adicionar `recurringGroupId` (UUID nullable) + UNIQUE constraint `(userId, recurringGroupId, monthYear)` em bills, variable_expenses, incomes
- [x] Repository: métodos `findRecurringByMonth`, `createMany` (ON CONFLICT DO NOTHING), `findByRecurringGroupId`, `updateByRecurringGroupIdAfterMonth`, `deleteByRecurringGroupIdAfterMonth`, `deleteByRecurringGroupId`
- [x] Service: `ensureRecurringForMonth()` — gera entradas sob demanda ao acessar mês futuro
- [x] Service: `updateWithScope(scope: 'this'|'future'|'all')` e `deleteWithScope(scope)`
- [x] Controller: `ScopeQueryDto` como query param em PATCH/DELETE
- [x] Frontend: `RecurringScopeDialog` componente + integração em edit/delete modals
- [x] Frontend: mutations com `?scope=X` query param
- [ ] Implementar job diário de verificação de vencimentos (00:30 UTC):
  - [ ] Atualizar bills para `status='overdue'` se dueDay < hoje e status='pending'

_Cálculos e KPIs:_
- [x] Implementar cálculos de KPIs principais:
  - [x] Renda do mês: `SUM(incomes.actualAmount)`
  - [x] Total orçado: `SUM(bills.amount) + SUM(expenses.expectedAmount) + SUM(debts.installmentAmount WHERE isNegotiated=true AND status='active')`
  - [x] Total gasto: `SUM(bills WHERE paid) + SUM(expenses.actualAmount) + SUM(parcelas pagas no mês)` _(Bugfix 2026-01-23: corrigido de ratio→SQL SUM real + criada tabela `debt_payments` para rastreio mensal)_
  - [x] Saldo: `Renda - Gasto`
  - [x] Total investido: `SUM(investments.currentAmount)`
- [x] Implementar cálculos de KPIs de dívidas:
  - [x] Total de dívidas: `SUM(debts.totalAmount)` (todas)
  - [x] Parcela mensal total: `SUM(debts.installmentAmount WHERE isNegotiated=true AND status='active')`
  - [x] Total já pago: `SUM((currentInstallment - 1) × installmentAmount)` para dívidas negociadas
  - [x] Total restante: `Total de dívidas - Total já pago`
- [x] Implementar cálculos por dívida individual:
  - [x] Parcelas pagas: `currentInstallment - 1`
  - [x] Parcelas restantes: `totalInstallments - (currentInstallment - 1)`
  - [x] Progresso (%): `((currentInstallment - 1) / totalInstallments) × 100`
  - [x] Valor pago: `(currentInstallment - 1) × installmentAmount`
  - [x] Valor restante: `totalAmount - valorPago`
- [x] Implementar cálculo de progresso de investimento:
  - [x] Progresso (%): `(currentAmount / goalAmount) × 100` (se goalAmount definido)

_Validações (class-validator):_
- [x] Implementar schemas de validação para cada entidade:
  - [x] Income: expectedAmount > 0, monthYear formato YYYY-MM
  - [x] Bill: amount > 0, dueDay 1-31, monthYear formato YYYY-MM
  - [x] Expense: expectedAmount > 0, actualAmount >= 0, monthYear formato YYYY-MM
  - [x] Investment: currentAmount >= 0, goalAmount > 0 (se definido), monthlyContribution >= 0
- [x] Implementar validação condicional para dívidas:
  - [x] totalAmount > 0 (sempre)
  - [x] Se `isNegotiated=true`: totalInstallments > 0, installmentAmount > 0, dueDay 1-31, currentInstallment 1-totalInstallments
  - [x] Se `isNegotiated=false`: campos de parcelas ignorados/opcionais

_Filtros e Paginação:_
- [x] Implementar query params para filtros:
  - [x] `monthYear` - filtrar por mês (obrigatório para bills, expenses, incomes)
  - [x] `status` - filtrar por status (pending, paid, overdue para bills; active, paid_off para debts)
  - [x] `category` - filtrar por categoria
  - [x] `isRecurring` - filtrar recorrentes/pontuais
  - [x] `isNegotiated` - filtrar dívidas negociadas/pendentes
- [x] Implementar paginação:
  - [x] `limit` - quantidade de registros (default 50, max 100)
  - [x] `offset` - pular registros
  - [x] Retornar metadata: `{ data: [], total: number, limit: number, offset: number }`

_Tools para IA:_
- [x] Implementar tool `get_finance_summary`:
  - [x] Retorna todos os KPIs do mês atual
  - [x] Retorna KPIs agregados e breakdown por categoria
  - [x] Retorna contagens de bills (pending/paid/overdue)
  - [x] Permite IA responder "como estão minhas finanças?"
- [x] Implementar tool `get_pending_bills`:
  - [x] Retorna contas pendentes do mês com detalhes
  - [x] Permite IA responder "quais contas tenho que pagar?"
- [x] Implementar tool `mark_bill_paid`:
  - [x] Marca conta como paga via conversa
  - [x] `requiresConfirmation: true`
  - [x] Permite IA executar "marque a conta de luz como paga"
- [x] Implementar tool `create_expense`:
  - [x] Cria despesa pontual via conversa
  - [x] `requiresConfirmation: true`
  - [x] Permite IA executar "gastei 50 reais no mercado"
- [x] Implementar tool `get_debt_progress`:
  - [x] Retorna progresso detalhado de uma ou todas as dívidas
  - [x] Permite IA responder "como está minha dívida do carro?"
  - [x] Adicionar parâmetro `monthYear` para filtrar dívidas por mês

_Dívidas - Filtro por Mês e Status Overdue:_
- [x] Adicionar campo `startMonthYear` na tabela `debts`
- [x] Adicionar status `overdue` ao enum `debt_status`
- [x] Implementar filtro de dívidas por mês no repository
- [x] Dívida só aparece de startMonthYear até endMonth (sem grace period - padrão da indústria)
- [ ] Implementar detecção de status overdue via job agendado (não sob demanda)
- [x] Permitir pagamento de múltiplas parcelas
- [x] Atualizar tool `get_debt_progress` com parâmetro `monthYear`
- [x] Atualizar tool executor para filtrar dívidas por mês

_Dívidas - Pagamento Antecipado e Visualizações (2026-01-27):_
- [x] Fix semântica de `debt_payments.monthYear`: agora representa "para qual mês é a parcela" (não "quando foi pago")
- [x] Implementar `calculateInstallmentMonth()` helper no repository
- [x] Migration para recalcular monthYear de pagamentos existentes (0004_fix_debt_payments_month_year.sql)
- [x] Histórico de pagamentos: `GET /finance/debts/:id/payments` com paidEarly indicator
- [x] AI tool `get_debt_payment_history` para consultar histórico
- [x] Calendário de vencimentos: `GET /finance/debts/upcoming-installments?monthYear=YYYY-MM`
- [x] AI tool `get_upcoming_installments` para parcelas do mês com status (pending/paid/paid_early/overdue)
- [x] Projeção de quitação: `calculateProjection()` no service com velocidade de pagamento
- [x] Endpoint `GET /finance/debts/:id/projection` para projeção individual
- [x] Enriquecer `get_debt_progress` com dados de projeção
- [x] Frontend: hooks `useDebtPaymentHistory`, `useUpcomingInstallments`, `useDebtProjection`
- [x] Frontend: types `DebtProjection`, `DebtPaymentHistoryResponse`, `UpcomingInstallmentsResponse`

_Frontend - Dívidas (Filtro por Mês):_
- [x] Integrar página `/finance/debts` com `useFinanceContext` para usar `currentMonth`
- [x] Criar componente `MonthPicker` para formulário de dívidas
- [x] Adicionar badge overdue no DebtCard (removido badge "carência" - não é padrão da indústria)
- [x] Atualizar hook `useDebts` para aceitar parâmetro `monthYear`
- [x] Atualizar `PayInstallmentDialog` para aceitar quantidade

_Testes - Dívidas (Filtro por Mês):_
- [ ] Unit: filtro por mês calcula período corretamente
- [ ] Unit: detecção de overdue funciona
- [ ] Unit: pagamento de múltiplas parcelas
- [ ] Unit: validação de startMonthYear
- [ ] Integration: dívida de 10 parcelas aparece apenas em 10 meses
- [ ] E2E: navegar entre meses e verificar visibilidade de dívidas

_Notificações:_
- [ ] Implementar notificações financeiras:
  - [ ] `month_start` - Dia 1: "📊 Novo mês! Configure seu orçamento de {month}"
  - [ ] `bill_due` - 3 dias antes: "💰 {bill_name} vence em 3 dias (R$ {amount})"
  - [ ] `bill_overdue` - No dia: "⚠️ {bill_name} venceu hoje!"
  - [ ] `subscription_renewal` - 3 dias antes: "🔄 {subscription} renova em 3 dias"
  - [ ] `debt_installment` - 3 dias antes: "💳 Parcela {x}/{y} de {debt_name} vence em 3 dias"
  - [ ] `month_end` - Último dia: "📈 Resumo de {month}: Gastou R$ {spent} de R$ {budget}"

**Frontend:**

_Navegação e Layout:_
- [x] Adicionar item "Finanças" no sidebar principal (`components/layouts/sidebar.tsx`):
  - [x] href: `/finance`, icon: `Wallet` (Lucide)
- [x] Criar layout compartilhado `/finance/layout.tsx`:
  - [x] Header com título "Finanças" + MonthSelector (à direita)
  - [x] Tabs horizontais abaixo do header (Visão Geral, Rendas, Contas, Despesas, Dívidas, Investimentos)
  - [x] Tab ativa destacada (baseado em pathname)

_Página Dashboard `/finance` (Visão Geral):_
- [x] Criar página `/finance/page.tsx`
- [x] KPI Cards Grid (6 cards):
  - [x] Renda do Mês (TrendingUp, green)
  - [x] Total Orçado (Target, blue)
  - [x] Total Gasto (ShoppingCart, orange)
  - [x] Saldo (Wallet, green/red baseado em positivo/negativo)
  - [x] Total Investido (PiggyBank, purple)
  - [x] Total de Dívidas (CreditCard, red)
- [x] Gráficos (Recharts):
  - [x] Orçado vs Real (BarChart lado a lado por categoria)
  - [x] Distribuição de Gastos (PieChart por categoria)
  - [x] Evolução Mensal (LineChart últimos 6 meses)
- [x] Listas Resumidas:
  - [x] Resumo de contas pendentes (contagem + total)
  - [x] Resumo de parcelas (contagem de dívidas ativas + total mensal)
- [x] Estados: Loading (Skeleton), Empty (EmptyState), Error (AlertCircle + retry)

_Página Rendas `/finance/incomes`:_
- [x] Criar página `/finance/incomes/page.tsx`
- [x] Header: Título + Botão "Nova Renda"
- [x] Lista de Rendas (IncomeCard ou Table):
  - [x] Nome + categoria + badge recorrente
  - [x] Previsto vs Real (com indicador de variação)
  - [x] Ações: Editar, Excluir
- [x] Totais: Soma previsto, soma real, variação
- [x] Modal CreateIncomeModal:
  - [x] Nome (text), Categoria (select), Valor previsto (number), Valor real (number, opcional), Recorrente (switch)
- [x] Modal EditIncomeModal (preenchido com dados existentes)
- [x] Dialog ConfirmDelete
- [x] Estados: Loading, Empty, Error

_Página Contas Fixas `/finance/bills`:_
- [x] Criar página `/finance/bills/page.tsx`
- [x] Header: Título + Filtros (Todas, Pendentes, Pagas) + Botão "Nova Conta"
- [x] Lista de Contas (BillCard):
  - [x] Checkbox de pago (com toast de confirmação)
  - [x] Nome + categoria + valor + vencimento
  - [x] Badge de status (pendente/pago/vencido)
  - [x] Badge recorrente
  - [x] Ações: Editar, Excluir
- [x] Totais: Soma total, soma pagas, soma pendentes (BillSummary)
- [x] Modal CreateBillModal:
  - [x] Nome (text), Categoria (select), Valor (number), Dia de vencimento (1-31), Recorrente (switch)
- [x] Modal EditBillModal (preenchido com dados existentes)
- [x] Dialog DeleteBillDialog (confirmação de exclusão)
- [x] Estados: Loading, Empty, Error

_Componentes Bills (`components/bill/`):_
- [x] `bill-form.tsx` - Formulário reutilizado (Create/Edit)
- [x] `bill-card.tsx` - Card individual com checkbox, badges e ações
- [x] `bill-list.tsx` - Lista com skeleton loading
- [x] `bill-summary.tsx` - Grid de totais (3 colunas: total, pagas, pendentes)
- [x] `create-bill-modal.tsx` - Modal de criação
- [x] `edit-bill-modal.tsx` - Modal de edição
- [x] `delete-bill-dialog.tsx` - Dialog de confirmação de exclusão
- [x] `index.ts` - Barrel export

_Types Bills (`types.ts`):_
- [x] Adicionar `BillCategory` type (housing, utilities, subscription, insurance, other)
- [x] Adicionar `BillStatus` type (pending, paid, overdue, canceled)
- [x] Adicionar `Bill` interface
- [x] Adicionar `CreateBillInput`, `UpdateBillInput` interfaces
- [x] Adicionar `BillQueryParams`, `BillResponse`, `BillsListResponse` interfaces
- [x] Adicionar constants: `billCategoryLabels`, `billStatusLabels`, `billCategoryColors`, `billStatusColors`, `billCategoryOptions`

_Hook useBills (`hooks/use-bills.ts`):_
- [x] `useBills()` - listar contas com filtros
- [x] `useBill()` - buscar conta individual
- [x] `useCreateBill()` - mutation criar
- [x] `useUpdateBill()` - mutation atualizar
- [x] `useDeleteBill()` - mutation excluir
- [x] `useMarkBillPaid()` - mutation marcar como paga
- [x] `useMarkBillUnpaid()` - mutation desmarcar pagamento
- [x] `calculateBillTotals()` - helper function

_Página Despesas Variáveis `/finance/expenses`:_
- [x] Criar página `/finance/expenses/page.tsx`
- [x] Seção: Variáveis Recorrentes:
  - [x] Cards para cada categoria (Alimentação, Transporte, Lazer, etc.)
  - [x] Previsto vs Real com barra de progresso
  - [x] Botão editar (atualizar valor real)
- [x] Seção: Variáveis Pontuais:
  - [x] Lista de despesas pontuais do mês
  - [x] Botão "Nova Despesa Pontual"
- [x] Totais: Soma previsto, soma real, variação
- [x] Modal CreateExpenseModal:
  - [x] Nome (text), Categoria (select), Valor previsto (number), Valor real (number), Recorrente (switch)
- [x] Estados: Loading, Empty, Error
- [x] Modal EditExpenseModal:
  - [x] Preenche form com dados existentes
  - [x] Campos editáveis (mesmo do create)
- [x] Dialog DeleteExpenseDialog:
  - [x] Confirmação antes de excluir
  - [x] Mostra nome da despesa
- [x] Hook `useExpenses.ts`:
  - [x] `useExpenses()` - query listar com filtros
  - [x] `useExpense(id)` - query individual
  - [x] `useCreateExpense()` - mutation criar
  - [x] `useUpdateExpense()` - mutation atualizar
  - [x] `useDeleteExpense()` - mutation excluir
  - [x] `calculateExpenseTotals()` - helper function
- [x] Types em `types.ts`:
  - [x] ExpenseCategory type
  - [x] Expense interface
  - [x] CreateExpenseInput, UpdateExpenseInput
  - [x] ExpenseQueryParams, ExpenseResponse, ExpensesListResponse
  - [x] expenseCategoryLabels, expenseCategoryColors, expenseCategoryOptions
- [x] Barrel export `components/expense/index.ts`

_Página Dívidas `/finance/debts`:_
- [x] Criar página `/finance/debts/page.tsx`
- [x] KPI Cards de Dívidas (no topo):
  - [x] Total de Dívidas (todas)
  - [x] Parcela Mensal Total
  - [x] Total Já Pago
  - [x] Total Restante
- [x] Seção: Dívidas Negociadas (com parcelas):
  - [x] DebtCard para cada dívida:
    - [x] Nome + credor
    - [x] Valor total + parcela X de Y
    - [x] DebtProgressBar (visual)
    - [x] DebtStats (valor pago, restante, %)
    - [x] PayInstallmentButton (botão pagar parcela)
    - [x] Ações: Editar, Excluir
- [x] Seção: Dívidas Pendentes de Negociação:
  - [x] DebtCard simplificado (nome, valor total, notas)
  - [x] Botão "Negociar" (abre modal para preencher parcelas)
- [x] Modal CreateDebtModal:
  - [x] Nome (text), Credor (text, opcional), Valor total (number)
  - [x] Toggle "Já negociada?" (switch)
  - [x] Se negociada: Número de parcelas, Valor da parcela, Dia de vencimento
  - [x] Notas (textarea, opcional)
- [x] Modal NegotiateDebtModal (preencher parcelas de dívida pendente)
- [x] Dialog PayInstallmentConfirm (confirmação de pagamento)
- [x] Estados: Loading, Empty, Error

_Página Investimentos `/finance/investments`:_
- [x] Criar página `/finance/investments/page.tsx`
- [x] Header: Título + Total Investido + Botão "Novo Investimento"
- [x] KPI Cards de Investimentos (InvestmentSummary):
  - [x] Total Investido
  - [x] Total das Metas
  - [x] Aporte Mensal Total
  - [x] Progresso Médio
- [x] Lista de Investimentos (InvestmentList + InvestmentCard):
  - [x] Nome + tipo (badge)
  - [x] Valor atual
  - [x] Meta + prazo (se definidos)
  - [x] Barra de progresso (atual/meta %) - InvestmentProgressBar
  - [x] Aporte mensal planejado
  - [x] Ações: Editar, Atualizar valor, Excluir
- [x] InvestmentForm (formulário reutilizável create/edit):
  - [x] Nome (text), Tipo (select), Valor atual (number), Meta (number, opcional), Prazo (date, opcional), Aporte mensal (number, opcional)
- [x] Modal CreateInvestmentModal
- [x] Modal EditInvestmentModal
- [x] Modal UpdateValueModal (atualizar valor atual)
- [x] Dialog DeleteInvestmentDialog (confirmação de exclusão)
- [x] Estados: Loading, Empty, Error
- [x] Hook `useInvestments.ts`:
  - [x] `useInvestments()` - query listar com filtros
  - [x] `useInvestment(id)` - query individual
  - [x] `useCreateInvestment()` - mutation criar
  - [x] `useUpdateInvestment()` - mutation atualizar
  - [x] `useDeleteInvestment()` - mutation excluir
  - [x] `useUpdateInvestmentValue()` - mutation atualizar valor
  - [x] `calculateInvestmentTotals()` - helper function
- [x] Types em `types.ts`:
  - [x] InvestmentType type
  - [x] Investment interface
  - [x] CreateInvestmentInput, UpdateInvestmentInput, UpdateInvestmentValueInput
  - [x] InvestmentQueryParams, InvestmentResponse, InvestmentsListResponse
  - [x] InvestmentProgress, InvestmentTotals interfaces
  - [x] investmentTypeLabels, investmentTypeColors, investmentTypeOptions
  - [x] calculateInvestmentProgress, calculateInvestmentTotals, formatInvestmentDeadline helpers
- [x] Barrel export `components/investment/index.ts`

_Componentes Reutilizáveis (`components/finance/`):_
- [x] `FinanceKPICard.tsx` - Props: title, value, icon, color, trend?, variation?
- [x] `MonthSelector.tsx` - Setas ← → para navegar entre meses, callbacks onPrevMonth/onNextMonth
- [x] `FinanceNavTabs.tsx` - Tabs horizontais com ícones + labels, baseado em links (Next.js Link)
- [x] `BillRow.tsx` - Checkbox + nome + valor + vencimento + status + ações (implementado como bill-card.tsx)
- [x] `DebtCard.tsx` - Diferencia negociada vs pendente, progresso visual para negociadas
- [x] `DebtProgressBar.tsx` - Barra visual de progresso
- [x] `DebtStats.tsx` - Grid: parcelas pagas, restantes, %, valor pago, valor restante
- [x] `InvestmentCard.tsx` - Nome, tipo, valor, progresso de meta
- [x] `ProgressBar.tsx` - Componente genérico de barra de progresso (progress.tsx)
- [x] `BudgetVsRealChart.tsx` - BarChart comparativo (Recharts)
- [x] `ExpenseDistributionChart.tsx` - PieChart por categoria (Recharts)
- [x] `MonthlyEvolutionChart.tsx` - LineChart de evolução (Recharts)

_Hooks de Dados (`hooks/finance/`):_
- [x] `useIncomes.ts` - CRUD de rendas
- [x] `useBills.ts` - CRUD de contas fixas
- [x] `useExpenses.ts` - CRUD de despesas variáveis
- [x] `useDebts.ts` - CRUD de dívidas + payInstallment
- [x] `useInvestments.ts` - CRUD de investimentos
- [x] `useFinanceSummary.ts` - KPIs do dashboard (use-finance.ts)
- [x] `useMonthNavigation.ts` - Estado do mês selecionado

**Testes:**

_Testes Unitários Backend - Cálculos:_
- [x] Cálculo de KPIs principais (renda, orçado, gasto, saldo, investido)
- [x] Cálculo de KPIs de dívidas (total, parcela mensal, pago, restante)
- [x] Cálculo de progresso por dívida (parcelas pagas, restantes, %, valores)
- [x] Cálculo de progresso de investimento (currentAmount / goalAmount)
- [x] Exclusão de dívidas não negociadas do Total Orçado

_Testes Unitários Backend - Validações:_
- [x] Validação Income: expectedAmount > 0, monthYear formato YYYY-MM
- [x] Validação Bill: amount > 0, dueDay 1-31
- [x] Validação Expense: expectedAmount > 0, actualAmount >= 0
- [x] Validação Investment: currentAmount >= 0, goalAmount > 0 (se definido)
- [x] Validação Debt condicional: isNegotiated=true requer parcelas, isNegotiated=false ignora
- [x] Validação Debt: totalAmount > 0, currentInstallment dentro do range

_Testes Unitários Backend - Services:_
- [x] IncomeService: CRUD operations
- [x] BillService: CRUD + markPaid/markUnpaid
- [x] ExpenseService: CRUD operations
- [x] DebtService: CRUD + payInstallment + negotiate
- [x] InvestmentService: CRUD + updateValue
- [x] FinanceSummaryUseCase: cálculo de todos os KPIs

_Testes Unitários Backend - Lazy Generation:_
- [x] create() com isRecurring=true atribui recurringGroupId
- [x] ensureRecurringForMonth() cria entradas a partir do mês anterior
- [x] ensureRecurringForMonth() não duplica se entry já existe (idempotente)
- [x] ensureRecurringForMonth() gera mesmo se anterior está cancelada (isRecurring=true prevalece)
- [x] updateWithScope('this'|'future'|'all') atualiza corretamente
- [x] deleteWithScope('this') cancela bill / deleta expense+income
- [x] deleteWithScope('future') para recorrência + deleta futuros
- [x] deleteWithScope('all') deleta todos do grupo
- [ ] Job de vencimento: atualiza status para overdue corretamente
- [ ] Job de vencimento: não altera bills já pagas

_Testes Unitários Backend - Tools:_
- [x] Tool get_finance_summary: retorna KPIs corretos
- [x] Tool get_pending_bills: retorna apenas pendentes do mês
- [x] Tool mark_bill_paid: marca corretamente com confirmação
- [x] Tool create_expense: cria despesa pontual com confirmação
- [x] Tool get_debt_progress: retorna progresso detalhado

_Testes de Integração - Endpoints:_
- [x] CRUD de todas as entidades (incomes, bills, expenses, debts, investments) — via mocks inline
- [x] Endpoint mark-paid: atualiza status e paidAt — testado em finance-business-rules.integration.spec.ts
- [x] Endpoint pay-installment: incrementa e faz auto-quitação — testado em finance-business-rules.integration.spec.ts
- [x] Endpoint negotiate: preenche parcelas e atualiza isNegotiated — testado em finance-business-rules.integration.spec.ts
- [x] Endpoint update-value: atualiza currentAmount do investimento
- [x] Endpoint summary: retorna todos os KPIs — testado em finance-filters-pagination.integration.spec.ts

_Testes de Integração - Filtros e Paginação:_
- [x] Filtro por monthYear funciona
- [x] Filtro por status funciona (pending, paid, overdue)
- [x] Filtro por category funciona
- [x] Filtro por isNegotiated funciona
- [x] Paginação com limit e offset funciona
- [x] Retorna metadata correta (total, limit, offset)

_Testes de Integração - Lazy Generation:_
- [x] Criar bill recorrente em jan → acessar fev → bill aparece como pending
- [x] Editar com scope 'future' → próximos meses refletem alteração
- [x] Deletar com scope 'all' → todos os meses removidos
- [ ] Job de verificação de vencimentos executa corretamente
- [ ] Notificações de vencimento são criadas

_Testes de Integração - Tools:_
- [x] Tool get_finance_summary via ToolExecutorService
- [x] Tool get_pending_bills via ToolExecutorService
- [x] Tool mark_bill_paid com fluxo de confirmação
- [x] Tool create_expense com fluxo de confirmação
- [x] Tool get_debt_progress via ToolExecutorService

_Testes de Integração - Regras de Negócio:_
- [x] Criar dívida não negociada → verificar que NÃO entra no total orçado
- [x] Pagar parcela → verificar atualização de KPIs
- [x] Pagar última parcela → verificar status = 'paid_off'
- [x] Negociar dívida → verificar que ENTRA no total orçado

_Testes de Componente Frontend:_
- [x] Component: FinanceKPICard (valor, label, ícone, cor, trend)
- [x] Component: MonthSelector (navegação, callbacks)
- [x] Component: FinanceNavTabs (tabs ativas, navegação)
- [x] Component: BillCard (checkbox, status badge, ações)
- [x] Component: BillList (listagem, skeleton)
- [x] Component: BillSummary (grid de totais)
- [x] Component: BillForm (validação, submit)
- [x] Component: CreateBillModal (criação)
- [x] Component: EditBillModal (edição)
- [x] Component: DeleteBillDialog (confirmação)
- [x] Component: DebtCard (negociada vs pendente, progresso)
- [x] Component: DebtProgressBar (renderização, estados)
- [x] Component: DebtStats (grid de estatísticas)
- [x] Component: InvestmentCard (valor, meta, progresso)
- [x] Component: InvestmentList (listagem, skeleton)
- [x] Component: InvestmentSummary (grid de KPIs)
- [x] Component: InvestmentForm (validação, submit)
- [x] Component: InvestmentProgressBar (barra de progresso)
- [x] Component: CreateInvestmentModal (criação)
- [x] Component: EditInvestmentModal (edição)
- [x] Component: UpdateValueModal (atualizar valor)
- [x] Component: DeleteInvestmentDialog (confirmação)
- [ ] Component: ProgressBar (genérico, variações)
- [x] Component: BudgetVsRealChart (dados, loading, empty)
- [x] Component: ExpenseDistributionChart (dados, loading, empty)
- [x] Component: MonthlyEvolutionChart (dados, loading, empty)

_Testes de Hooks Frontend:_
- [x] Hook: useIncomes (fetch, create, update, delete)
- [x] Hook: useBills (fetch, create, update, delete, markPaid)
- [ ] Hook: useExpenses (fetch, create, update, delete)
- [x] Hook: useDebts (fetch, create, update, delete, payInstallment, negotiate)
- [x] Hook: useInvestments (fetch, create, update, delete, updateValue)
- [x] Hook: useFinanceSummary (fetch, cálculos) - use-finance.test.tsx
- [x] Hook: useMonthNavigation (estado, prev, next)

_Testes E2E:_
- [x] E2E: navegar para /finance via sidebar (finance.spec.ts)
- [x] E2E: navegação entre tabs do finance (finance.spec.ts)
- [x] E2E: criar conta fixa → marcar como paga → verificar no dashboard (finance-bills.spec.ts)
- [x] E2E: criar dívida com parcelas → pagar parcela → verificar progresso
- [x] E2E: criar dívida não negociada → negociar → verificar atualização de KPIs
- [x] E2E: criar dívida → pagar parcelas → verificar progresso → quitar (finance-debts.spec.ts full workflow)
- [x] E2E: navegar entre meses com MonthSelector (finance.spec.ts)
- [x] E2E: criar renda → verificar no dashboard (finance-incomes.spec.ts)
- [x] E2E: criar investimento → atualizar valor → verificar progresso
- [x] E2E: estados empty e loading funcionam em todas as páginas (coberto por specs de cada página)

**Definition of Done:**

_Navegação e Layout:_
- [x] Item "Finanças" aparece no sidebar principal (ícone Wallet)
- [x] Tabs horizontais funcionam para navegação entre sub-páginas
- [x] MonthSelector navega entre meses corretamente
- [x] Layout compartilhado renderiza em todas as páginas do finance

_Funcionalidades CRUD:_
- [x] Dashboard Finance exibe KPIs (6 cards) e gráficos (3 tipos)
- [x] CRUD de rendas funciona (criar, editar, excluir)
- [x] CRUD de contas fixas funciona (com checkbox pago)
- [x] CRUD de despesas variáveis funciona (recorrentes + pontuais)
- [x] CRUD de dívidas funciona (com controle de parcelas)
- [x] CRUD de investimentos funciona (com progresso de meta)

_Endpoints de Ação:_
- [x] `mark-paid` / `mark-unpaid` funcionam para bills
- [x] `pay-installment` funciona com auto-quitação
- [x] `negotiate` funciona para converter dívida pendente
- [x] `update-value` funciona para investimentos

_Recorrências e Automações:_
- [x] Lazy generation cria bills, expenses, incomes sob demanda ao navegar meses
- [x] Scope-based edit/delete ('this'|'future'|'all') funciona para as 3 entidades
- [x] RecurringScopeDialog aparece apenas para itens com recurringGroupId
- [ ] Job de verificação de vencimentos atualiza status para overdue
- [ ] Notificações de vencimento enviadas (3 dias antes, no dia)

_Filtros e Paginação:_
- [x] Filtro por monthYear funciona em todas as entidades
- [x] Filtro por status funciona (pending, paid, overdue, active, paid_off)
- [x] Filtro por category funciona
- [x] Paginação com limit/offset funciona

_Tools para IA:_
- [x] `get_finance_summary` retorna KPIs e pendências
- [x] `get_pending_bills` retorna contas a pagar
- [x] `mark_bill_paid` marca conta via conversa (com confirmação)
- [x] `create_expense` cria despesa via conversa (com confirmação)
- [x] `get_debt_progress` retorna progresso das dívidas

_Finance Tools Enhancement (AI Detail Access):_
- [x] Enriquecer `get_finance_summary` com breakdown (bills/expenses/debts)
- [x] Nova tool `get_bills` (listar todas contas com detalhes)
- [x] Nova tool `get_expenses` (listar despesas com previsto/real)
- [x] Nova tool `get_incomes` (listar rendas com detalhes)
- [x] Nova tool `get_investments` (listar investimentos com progresso)
- [x] Melhorar prompt de finanças no context-builder
- [x] Atualizar ai.md, product.md, system.md com novas tools
- [ ] Testes unitários para novas tools (get_bills, get_expenses, get_incomes, get_investments, get_debt_payment_history, get_upcoming_installments) — apenas 5/11 testadas

_Dívidas não negociadas:_
- [x] Podem ser criadas (apenas valor total, sem parcelas)
- [x] NÃO entram no Total Orçado
- [x] Podem ser marcadas como "negociada" (preencher parcelas via modal/endpoint)

_KPIs de dívidas:_
- [x] "Total de Dívidas" soma todas (negociadas + pendentes)
- [x] "Parcela Mensal Total" soma apenas negociadas ativas
- [x] "Total Já Pago" calcula corretamente
- [x] "Total Restante" calcula corretamente

_Pagamento de parcelas:_
- [x] Botão "Pagar Parcela" incrementa currentInstallment
- [x] Dívida é quitada automaticamente ao pagar última parcela
- [x] Progresso visual por dívida (barra, %, valores)

_Validações:_
- [x] Validações Zod aplicadas em todos os endpoints (class-validator no backend)
- [x] Validação condicional de dívidas (isNegotiated) funciona
- [x] Erros de validação retornam mensagens claras

_Estados UI:_
- [x] Loading: Skeleton cards/rows em todas as páginas
- [x] Empty: EmptyState com ícone + título + descrição + CTA
- [x] Error: AlertCircle + mensagem + botão retry
- [x] Success: Toast via Sonner

_Testes:_
- [x] Testes unitários backend passam (cálculos, validações, services, jobs, tools)
- [x] Testes de integração passam (endpoints, filtros, jobs, tools)
- [x] Testes de componentes frontend passam
- [x] Testes de hooks frontend passam
- [x] Testes E2E passam (criados, execução manual)

**Notas (2026-01-21):**
- Backend implementado: módulo, estrutura, tabelas, endpoints REST, cálculos e KPIs, validações, filtros e paginação
- 7 enums PostgreSQL criados (6 planejados + expense_category extra)
- 5 tabelas criadas e aplicadas ao banco de dados
- 29 arquivos de código: 6 controllers, 6 services, 5 repositories, 5 ports, 6 DTOs, 1 module
- 31 endpoints implementados: 25 CRUD + 5 ações especiais + 1 resumo
- Cálculos de KPIs implementados em FinanceSummaryService e repositories
- Validações implementadas com class-validator (padrão aceito pelo projeto conforme engineering.md)
- Tools para IA implementados: 5 tools (get_finance_summary, get_pending_bills, mark_bill_paid, create_expense, get_debt_progress)
- FinanceToolExecutorService integrado ao ChatService com mapeamento de categorias PT→EN
- Testes unitários e de integração para todas as tools (32 arquivos, 504 tests passando)
- Pendente: Jobs, Notificações

**Notas (2026-01-22):**
- Frontend implementado: Navegação, Layout e Dashboard `/finance`
- Sidebar: item "Finanças" com ícone Wallet adicionado
- Layout compartilhado: MonthSelector + FinanceNavTabs (6 tabs)
- Dashboard page.tsx: 8 KPI cards, 3 gráficos Recharts, listas resumidas, estados (loading/empty/error)
- Componentes: 6 criados (MonthSelector, FinanceNavTabs, FinanceKPICard, BudgetVsRealChart, ExpenseDistributionChart, MonthlyEvolutionChart)
- Hooks: useMonthNavigation, useFinanceSummary/useHasFinanceData/extractKPIs (Query Key Factory pattern)
- Context: FinanceContext para gerenciar estado do mês entre componentes
- Types: types.ts com interfaces + helpers (formatCurrency, formatMonthDisplay, isOverdue, etc.)
- Testes: 6 component tests, 2 hook tests, 1 types test, 11 E2E tests (Page Object pattern)
- Pendente: Jobs, Notificações, Sub-páginas (Contas, Despesas, Dívidas, Investimentos)

**Notas (2026-01-22 - Página Rendas):**
- Página `/finance/incomes` implementada: Header, IncomeList, IncomeSummary, CreateIncomeModal, EditIncomeModal, DeleteIncomeDialog
- 7 componentes criados: income-card, income-list, income-summary, income-form, create-income-modal, edit-income-modal, delete-income-dialog
- Hook useIncomes.ts: useIncomes, useIncome, useCreateIncome, useUpdateIncome, useDeleteIncome, calculateIncomeTotals, calculateVariance
- Testes: 8 arquivos de teste (1 hook test + 7 component tests) com 43 tests
- E2E: finance.page.ts Page Object atualizado + finance-incomes.spec.ts com 8 specs
- ResizeObserver mock adicionado ao test/setup.tsx para suporte a Radix UI
- Fix: react-hook-form usa validação nativa (não zodResolver) devido a incompatibilidade com Zod v4

**Notas (2026-01-22 - Página Contas Fixas):**
- Página `/finance/bills` implementada: Header com filtros (Todas/Pendentes/Pagas), BillList, BillSummary, CreateBillModal, EditBillModal, DeleteBillDialog
- 8 componentes criados: bill-card, bill-list, bill-summary, bill-form, create-bill-modal, edit-bill-modal, delete-bill-dialog, index.ts
- Hook use-bills.ts: useBills, useBill, useCreateBill, useUpdateBill, useDeleteBill, useMarkBillPaid, useMarkBillUnpaid, calculateBillTotals
- Types adicionados: BillCategory, BillStatus, Bill, CreateBillInput, UpdateBillInput, BillQueryParams, constants (labels, colors, options)
- UI Components: checkbox.tsx e tabs.tsx criados (@radix-ui/react-checkbox, @radix-ui/react-tabs)
- Testes: 8 arquivos de teste (1 hook test + 7 component tests), 256 testes totais passando
- E2E: finance-bills.spec.ts criado (infraestrutura E2E pendente de fix - RLS permissions no global setup)
- Testado manualmente: CRUD completo, checkbox pago/não pago, filtros, estados (loading/empty/error)

**Notas (2026-01-22 - Página Dívidas):**
- Página `/finance/debts` implementada: Header com filtros (Todas/Ativas/Quitadas), 2 seções (Negociadas e Pendentes), DebtSummary com 4 KPIs
- 14 componentes criados: debt-card, debt-list, debt-summary, debt-form, debt-progress-bar, debt-stats, create-debt-modal, edit-debt-modal, delete-debt-dialog, negotiate-debt-modal, pay-installment-dialog, index.ts
- Hook use-debts.ts: useDebts, useDebt, useCreateDebt, useUpdateDebt, useDeleteDebt, usePayInstallment, useNegotiateDebt
- Types adicionados: DebtStatus, Debt, CreateDebtInput, UpdateDebtInput, NegotiateDebtInput, DebtQueryParams, DebtProgress, DebtTotals, constants (labels, colors), helpers (calculateDebtProgress, calculateDebtTotals)
- UI Components: progress.tsx criado (@radix-ui/react-progress)
- Testes: 6 arquivos de teste (1 hook + 5 component tests): use-debts.test.tsx (14), debt-card.test.tsx (17), debt-progress-bar.test.tsx (8), debt-stats.test.tsx (10), negotiate-debt-modal.test.tsx (7), pay-installment-dialog.test.tsx (13) - Total 69 testes de debt
- E2E: finance-debts.spec.ts criado (9 grupos de testes: CRUD, negotiate, pay-installment, filters, summary, full workflow)
- Fluxo de dívida: pendente → negociar (preencher parcelas) → pagar parcelas → auto-quitação ao pagar última

**Notas (2026-01-28 - Auditoria de Tasks):**
- Auditoria completa comparando código implementado vs marcações no tracker
- Pagamento de múltiplas parcelas: já estava implementado (backend + frontend + testes)
- Testes de componentes: FinanceKPICard, MonthSelector, FinanceNavTabs, charts já existiam
- Testes de integração: usam mocks inline (controllers mockados no próprio teste)
- Dashboard: corrigido de 8 para 6 KPI cards (reflete implementação atual)
- Listas resumidas: corrigido para "contagens" (não lista de itens individuais)
- get_finance_summary: corrigido para refletir retorno atual (KPIs/breakdown)
- Tools: 6 das 11 tools ainda sem testes unitários (get_bills, get_expenses, get_incomes, get_investments, get_debt_payment_history, get_upcoming_installments)

---

## M2.3 — Metas (Goals) 🔴

**Objetivo:** Implementar sistema de metas com progresso e milestones.

**Referências:** `docs/specs/domains/goals.md`

> **Nota:** Hábitos foram movidos para M2.1 (Tracking & Habits). Este módulo foca apenas em Goals.

**Tasks:**

**Backend:**
- [ ] Criar módulo `goals`:
  - [ ] CRUD de metas (título, área, valor alvo, prazo, milestones)
  - [ ] Calcular progresso automaticamente
  - [ ] Notificar meta em risco/concluída
- [ ] Implementar sub-metas (milestones)
- [ ] Integrar com tracking entries (progresso automático)

**Frontend:**
- [ ] Criar página `/goals`:
  - [ ] Lista de metas com progresso
  - [ ] Criar/editar meta
  - [ ] Visualizar milestones
- [ ] Componentes:
  - [ ] GoalProgress (barra de progresso com percentual)
  - [ ] GoalCard (resumo da meta)
  - [ ] GoalForm (criar/editar meta)
  - [ ] MilestoneList (sub-metas)

**Testes:**
- [ ] Unit: Cálculo de progresso de meta
- [ ] Integration: CRUD de metas via API
- [ ] E2E: criar meta → atualizar progresso → completar

**Definition of Done:**
- [ ] CRUD de metas funciona
- [ ] Progresso calculado automaticamente
- [ ] Milestones funcionam
- [ ] Notificações de risco/conclusão
- [ ] Testes passam

---

## M2.4 — Pessoas (via Memory) 🟢

**Objetivo:** Armazenar informações sobre pessoas via Knowledge Items.

**Status:** JÁ IMPLEMENTADO via Memory (M1.6).

**Funcionalidades:**
- [x] Knowledge Items com type='person' (implementado em M1.6)
- [x] Campo personMetadata para dados estruturados
- [x] Extração automática via Memory Consolidation
- [x] Visualização em /memory com filtro type='person'

**Decisão:** CRM manual removido. Informações sobre pessoas são
capturadas organicamente via conversas e journals.

**Notas:**
- Data: 01 Fevereiro 2026
- Tabelas people/person_notes/person_interactions removidas
- AI Tools get_person/update_person removidas

---

## M2.5 — Life Balance Score + Trends Analysis 🔴

**Objetivo:** Implementar cálculo do Life Balance Score e análise de tendências/correlações entre métricas.

**Referências:** `docs/specs/domains/tracking.md`, `docs/specs/core/ai-personality.md`

**Pré-requisitos:** M2.1 (Tracking & Habits), M2.2 (Finance), M2.3 (Goals)

> **Nota:** Life Balance Score calcula scores para 6 áreas. Fontes de dados:
> - **health** (physical, mental, leisure): M2.1 Tracking & Habits
> - **finance** (budget, savings, debts, investments): M2.2 Finance
> - **learning** (formal, informal): M2.1 Tracking & Habits
> - **spiritual** (practice, community): M2.1 Tracking & Habits
> - **relationships** (family, romantic, social): Retorna 50 (neutro)
> - **professional** (career, business): Retorna 50 (neutro) - ver TBD-207

**Tasks:**

**Backend — Life Balance Score:**
- [ ] Criar serviço `ScoreCalculator`:
  - [ ] Calcular score de cada área (0-100)
  - [ ] Aplicar pesos iguais (1.0) para todas as áreas E sub-áreas
  - [ ] Score de área = média das sub-áreas com dados
  - [ ] Sub-áreas sem dados são ignoradas (não penaliza)
  - [ ] Áreas sem dados retornam 50 (neutro)
  - [ ] Calcular Life Balance Score geral (média das 6 áreas)
- [ ] Implementar cálculo por sub-área (conforme `docs/specs/domains/tracking.md §9.3-9.4`):
  - [ ] health.physical: IMC, exercício, sono, água
  - [ ] health.mental: humor (média 7d), energia (média 7d), práticas (hábitos)
  - [ ] health.leisure: hábitos de lazer/hobbies
  - [ ] finance: budget, savings, debts, investments (via M2.2)
  - [ ] learning: formal (estudo, cursos), informal (leitura, podcasts)
  - [ ] spiritual: practice, community (via hábitos)
  - [ ] relationships: family, romantic, social (Retorna 50 neutro)
  - [ ] professional: career, business (retorna 50 até TBD-207)
- [ ] Implementar comportamento com dados insuficientes (retorna 50 + aviso)
- [ ] Criar job para cálculo diário (00:00 UTC)
- [ ] Armazenar histórico de scores

**Backend — AI Tool para Life Balance Score:**
- [ ] Criar tool schema `get_life_balance_score` em `packages/ai/src/schemas/tools/`:
  ```typescript
  {
    name: 'get_life_balance_score',
    description: 'Retorna o Life Balance Score atual e por área. Use quando perguntarem sobre equilíbrio de vida, saúde geral, ou áreas específicas (saúde, finanças, relacionamentos, etc.).',
    parameters: {
      includeHistory: z.boolean().default(false),    // Últimos 7/30 dias
      includeTrend: z.boolean().default(true),       // Tendência up/down/stable
      areas: z.array(LifeArea).optional(),           // Filtrar por áreas específicas
    },
    requiresConfirmation: false,  // READ tool
  }
  ```
- [ ] Criar `GetLifeBalanceScoreUseCase`:
  - [ ] Buscar score atual (ou calcular on-demand se não houver cache)
  - [ ] Buscar histórico dos últimos 7/30 dias se `includeHistory=true`
  - [ ] Calcular tendência (up/down/stable) por área se `includeTrend=true`
  - [ ] Gerar highlights e concerns automaticamente
- [ ] Implementar executor da tool no `ToolExecutorService`
- [ ] Formato de retorno:
  ```typescript
  {
    overallScore: number,        // 0-100 (interno)
    overallDisplay: number,      // 0-10 (para UI/usuário)
    overallTrend: 'up' | 'down' | 'stable',
    areas: {
      [area: LifeArea]: {
        score: number,           // 0-100
        display: number,         // 0-10
        trend: 'up' | 'down' | 'stable',
        changePercent: number,   // Variação % últimos 7 dias
      }
    },
    highlights: string[],        // Ex: "Sua saúde mental melhorou 15%"
    concerns: string[],          // Ex: "Área financeira precisa de atenção"
    lastUpdated: Date,
    history?: {                  // Se includeHistory=true
      dates: Date[],
      scores: number[],
    }
  }
  ```

**Backend — Trends Analysis (Tool `get_trends`):**

> **Nota:** Usa agregações de M2.1 (`GetAggregationsUseCase`) como base. NÃO duplicar cálculos de média/soma/variação.

- [ ] Criar tool schema `get_trends` em `packages/ai/src/schemas/tools/`:
  ```typescript
  {
    name: 'get_trends',
    description: 'Analisa tendências e correlações entre métricas e hábitos do usuário. Use quando perguntarem sobre evolução, padrões ou relações entre métricas/hábitos.',
    parameters: {
      metrics: z.array(TrackingType).optional(),     // Métricas para analisar
      habits: z.array(z.string()).optional(),        // Hábitos para analisar (slugs)
      // Validação: pelo menos um de metrics ou habits deve ser informado
      days: z.number().min(7).max(365).default(30), // Período em dias (7-365)
      period: z.enum(['week', 'month', 'quarter', 'semester', 'year', 'all']).optional(), // Período predefinido (sobrescreve days)
      // Mapeamento: week=7, month=30, quarter=90, semester=180, year=365, all=todos os dados
      includeCorrelations: z.boolean().default(true), // Calcular correlações
    },
    requiresConfirmation: false,  // READ tool
  }
  ```
- [ ] Criar serviço `TrendsAnalyzer`:
  - [ ] `analyzeTrend(data: number[], days: number)`: Retorna direção (up/down/stable), variação %, força
  - [ ] `calculateCorrelation(dataA: number[], dataB: number[])`: Retorna coeficiente de Pearson (-1 a 1)
  - [ ] `interpretCorrelation(coefficient: number, typeA: TrackingType, typeB: TrackingType)`: Gera texto interpretativo
  - [ ] `generateInsights(metrics: MetricTrend[], correlations: Correlation[])`: Gera lista de insights estruturados (`Insight[]`)
  - [ ] `calculateDataDensity(dataPoints: number, days: number)`: Calcula densidade de registros
    - Retorna: 'high' (>=70%), 'medium' (30-70%), 'low' (<30%)
  - [ ] `generateSparseDataSuggestion(density: DataDensity, days: number, type: TrackingType)`: Gera sugestão para dados esparsos
  - [ ] Suportar dados de `habit_completions` (série de 0/1 por dia)
  - [ ] Calcular correlação hábito↔métrica (ex: treino → energia)
  - [ ] Calcular correlação hábito↔hábito (ex: leitura matinal → journaling)
- [ ] Criar `GetTrendsUseCase`:
  - [ ] Resolver período predefinido para dias (week=7, month=30, quarter=90, semester=180, year=365)
  - [ ] Para 'all': buscar data do primeiro registro do usuário
  - [ ] Buscar dados via `GetHistoryUseCase` (M2.1)
  - [ ] Buscar agregações via `GetAggregationsUseCase` (M2.1)
  - [ ] Buscar `habit_completions` para hábitos informados
  - [ ] Converter completions em série temporal (1 = completado, 0 = não)
  - [ ] Calcular densidade de dados por métrica
  - [ ] Aplicar análise de tendência por métrica
  - [ ] Calcular correlações entre pares de métricas (se `includeCorrelations=true`)
  - [ ] Incluir correlações mistas (metrics↔habits e habits↔habits)
  - [ ] Gerar insights baseados em padrões detectados
  - [ ] Gerar sugestões para métricas com densidade='low'
  - [ ] Retornar estrutura completa para LLM interpretar
- [ ] Implementar executor da tool `get_trends` no `ToolExecutorService`
- [ ] Formato de retorno:
  ```typescript
  {
    metrics: {
      [type: TrackingType]: {
        trend: 'up' | 'down' | 'stable',
        change: number,        // Variação % no período
        avg: number,           // Média (via M2.1)
        min: number,
        max: number,
        dataPoints: number,    // Quantidade de registros
        confidence: 'high' | 'medium' | 'low', // Baseado em dataPoints E density
        density: 'high' | 'medium' | 'low',    // Densidade de dados (registros/dias)
        suggestion?: string,   // Sugestão se dados esparsos
      }
    },
    habits: {
      [slug: string]: {
        name: string,
        completionRate: number,  // % de dias completados
        trend: 'up' | 'down' | 'stable',
        currentStreak: number,
        longestStreak: number,
      }
    },
    correlations: [
      {
        pair: [TrackingType | string, TrackingType | string],  // Suporta métricas e hábitos
        coefficient: number,   // -1 a 1 (Pearson)
        strength: 'strong' | 'moderate' | 'weak' | 'none',
        direction: 'positive' | 'negative',
        interpretation: string, // Texto explicativo
      }
    ],
    insights: Insight[],       // Lista de insights estruturados (conforme tracking.md §10.3)
    warnings: [
      {
        metric: TrackingType,
        message: string,
        type: 'sparse_data' | 'insufficient_data'  // Tipo do aviso
      }
    ],
    period: { start: Date, end: Date, days: number, preset?: string },
  }

  // Interface Insight (conforme tracking.md §10.3)
  interface Insight {
    type: 'correlation' | 'pattern' | 'streak' | 'trend';
    confidence: 'high' | 'medium' | 'low';
    message: string;
    data: {
      metric1?: TrackingType;
      metric2?: TrackingType;
      habit1?: string;
      habit2?: string;
      correlation?: number;
      impact?: 'positive' | 'negative';
      value?: number;
    };
  }
  ```

**Frontend — Componentes de Score:**
> **Nota:** M2.5 cria os componentes base. M2.6 (Dashboard) os reutiliza.

- [ ] LifeBalanceGauge:
  - [ ] Exibe score de 0 a 10 (não 0-100)
  - [ ] Cores por faixa (conforme tracking.md §9.5):
    - 0.0-3.9: vermelho (crítico)
    - 4.0-5.9: laranja (atenção)
    - 6.0-7.4: amarelo (adequado)
    - 7.5-8.9: verde claro (bom)
    - 9.0-10.0: verde (excelente)
  - [ ] Animação suave ao carregar
- [ ] AreaScoreCard:
  - [ ] Score de 0-10 por área
  - [ ] Ícone da área
  - [ ] Tendência (seta + %)
  - [ ] Cor baseada na faixa
- [ ] ScoreTrend (seta up/down com percentual)
- [ ] ScoreHistoryChart (gráfico de linha da evolução)
- [ ] Barrel export em `components/tracking/score/index.ts`

**Frontend — Aba Insights em /tracking:**
> **Nota:** M2.1 criou placeholder. M2.5 implementa a versão real.

- [ ] Implementar aba "Insights" em `/tracking`:
  - [ ] Lista de insights com badges (type, confidence)
  - [ ] InsightCard:
    - [ ] Ícone por tipo (correlation, pattern, streak, trend)
    - [ ] Cor por confiança (high=verde, medium=amarelo, low=cinza)
    - [ ] Mensagem formatada
    - [ ] Dados relacionados (métricas/hábitos envolvidos)
  - [ ] Filtro por tipo de insight
  - [ ] Período selecionável (7d, 30d, 90d)
- [ ] Componentes:
  - [ ] InsightCard
  - [ ] InsightList
  - [ ] InsightTypeBadge
  - [ ] InsightConfidenceBadge
  - [ ] CorrelationDetail (expande detalhes da correlação)

**Frontend — Exibição no Dashboard (para M2.6):**
- [ ] Criar componentes exportáveis:
  - [ ] DashboardScoreWidget (usa LifeBalanceGauge + AreaScoreCards)
  - [ ] DashboardInsightsWidget (top 3 insights do período)

**Testes — Life Balance Score:**
- [ ] Testes unitários para ScoreCalculator:
  - [ ] Cálculo correto de cada área
  - [ ] Aplicação correta dos pesos fixos (1.0)
  - [ ] Cálculo do Life Balance Score geral
  - [ ] Comportamento com dados insuficientes (retorna 50)
- [ ] Testes de integração:
  - [ ] Job de cálculo diário executa corretamente
  - [ ] Histórico é armazenado corretamente
- [ ] Teste E2E: verificar scores no dashboard após tracking

**Testes — AI Tool Life Balance Score:**
- [ ] Unit: GetLifeBalanceScoreUseCase:
  - [ ] Retorna estrutura correta com todas as áreas
  - [ ] Calcula tendência corretamente (up quando score aumentou)
  - [ ] Gera highlights para áreas que melhoraram >10%
  - [ ] Gera concerns para áreas com score <40
  - [ ] Filtra por áreas quando `areas` é especificado
  - [ ] Inclui histórico quando `includeHistory=true`
- [ ] Integration: Tool executa via ToolExecutorService
- [ ] Integration: IA responde "como está meu equilíbrio de vida?" corretamente

**Testes — Trends Analysis:**
- [ ] Testes unitários para TrendsAnalyzer:
  - [ ] `analyzeTrend`: dados crescentes → trend='up', change > 0
  - [ ] `analyzeTrend`: dados decrescentes → trend='down', change < 0
  - [ ] `analyzeTrend`: dados estáveis (variação < 5%) → trend='stable'
  - [ ] `analyzeTrend`: poucos dados (< 3) → confidence='low'
  - [ ] `analyzeTrend`: período 180 dias funciona corretamente
  - [ ] `analyzeTrend`: período 365 dias funciona corretamente
  - [ ] `calculateCorrelation`: correlação perfeita positiva → 1.0
  - [ ] `calculateCorrelation`: correlação perfeita negativa → -1.0
  - [ ] `calculateCorrelation`: sem correlação → próximo de 0
  - [ ] `interpretCorrelation`: gera texto correto por força/direção
  - [ ] `generateInsights`: gera `Insight[]` com estrutura correta
  - [ ] `generateInsights`: cada insight tem type, confidence, message e data
  - [ ] `calculateDataDensity`: 10 dias, 7 registros → 'high' (70%)
  - [ ] `calculateDataDensity`: 30 dias, 9 registros → 'low' (30%)
  - [ ] `calculateDataDensity`: 90 dias, 45 registros → 'medium' (50%)
  - [ ] `calculateDataDensity`: 365 dias, 50 registros → 'low' (~14%)
  - [ ] `generateSparseDataSuggestion`: density='low' → retorna sugestão
  - [ ] Converte habit_completions em série temporal corretamente
  - [ ] Calcula correlação treino↔energia (hábito↔métrica)
  - [ ] Calcula correlação leitura↔journaling (hábito↔hábito)
- [ ] Testes unitários para GetTrendsUseCase:
  - [ ] Retorna estrutura correta com métricas válidas
  - [ ] Retorna warnings para métricas sem dados (type='insufficient_data')
  - [ ] Retorna warnings para dados esparsos (type='sparse_data')
  - [ ] Calcula correlações apenas se `includeCorrelations=true`
  - [ ] Limita correlações a pares relevantes (não calcula sleep×sleep)
  - [ ] Resolve período predefinido corretamente (week→7, month→30, etc.)
  - [ ] Período 'all' busca todos os dados disponíveis
  - [ ] Aceita `habits` sem `metrics`
  - [ ] Aceita `metrics` + `habits` juntos
  - [ ] Retorna erro se nenhum dos dois informado
- [ ] Testes de integração:
  - [ ] Tool `get_trends` executa via ToolExecutorService
  - [ ] Usa dados reais de tracking_entries
  - [ ] Correlação sleep×mood retorna resultado coerente
  - [ ] Período 'year' funciona com dados de 365 dias
  - [ ] IA responde "treinar afeta minha energia?" com correlação

**Testes — Componentes de Score:**
- [ ] Component: LifeBalanceGauge renderiza 0-10 corretamente
- [ ] Component: LifeBalanceGauge aplica cores por faixa
- [ ] Component: AreaScoreCard exibe score + tendência
- [ ] Component: ScoreHistoryChart renderiza gráfico

**Testes — Aba Insights:**
- [ ] Component: InsightCard renderiza todos os campos
- [ ] Component: InsightList ordena por confiança
- [ ] Component: Filtro por tipo funciona
- [ ] E2E: Aba Insights carrega e exibe dados

**Definition of Done:**

_Life Balance Score:_
- [ ] Scores calculados corretamente
- [ ] Pesos iguais (1.0) aplicados para áreas E sub-áreas
- [ ] Sub-áreas sem dados ignoradas no cálculo
- [ ] Áreas sem dados retornam 50 (neutro)
- [ ] Histórico de scores armazenado
- [ ] Job diário de score funcionando

_AI Tool get_life_balance_score:_
- [ ] Tool `get_life_balance_score` funciona:
  - [ ] Retorna score geral e por área (0-100 interno, 0-10 display)
  - [ ] Calcula tendências por área
  - [ ] Gera highlights e concerns automaticamente
  - [ ] Suporta filtro por áreas específicas
  - [ ] Suporta histórico opcional

_AI Tool get_trends:_
- [ ] Tool `get_trends` funciona:
  - [ ] Retorna tendências por métrica (direção, variação, confiança)
  - [ ] Calcula correlações entre métricas (Pearson)
  - [ ] Gera insights estruturados (`Insight[]`, não `string[]`)
  - [ ] Retorna warnings para dados insuficientes
  - [ ] Suporta períodos de 7 a 365 dias
  - [ ] Suporta períodos predefinidos (week/month/quarter/semester/year/all)
  - [ ] Calcula densidade de dados por métrica (high/medium/low)
  - [ ] Gera warnings tipados (sparse_data/insufficient_data)
  - [ ] Gera sugestões quando dados são insuficientes para análise confiável
  - [ ] Aceita parâmetro `habits` (além de `metrics`)
  - [ ] Calcula correlações hábito↔métrica
  - [ ] Calcula correlações hábito↔hábito

_Frontend:_
- [ ] LifeBalanceGauge exibe 0-10 (não 0-100)
- [ ] Cores por faixa implementadas (§9.5)
- [ ] UI exibe scores com tendências
- [ ] Aba Insights funciona em `/tracking`
- [ ] Insights exibem badges de tipo e confiança
- [ ] Componentes exportados para M2.6 reutilizar (DashboardScoreWidget, DashboardInsightsWidget)

_IA Queries:_
- [ ] IA responde "como está meu equilíbrio de vida?" → usa `get_life_balance_score`
- [ ] IA responde "qual área preciso melhorar?" → usa `get_life_balance_score`
- [ ] IA responde "minha saúde melhorou esse mês?" → usa `get_life_balance_score`
- [ ] IA responde "como está minha saúde?" → usa `get_trends`
- [ ] IA responde "sono afeta meu humor?" → usa `get_trends` com correlação
- [ ] IA responde "como está meu peso no último ano?" → usa `get_trends` com análise de longo prazo
- [ ] IA responde "treinar afeta minha energia?" → usa `get_trends` com habits (hábito↔métrica)
- [ ] IA responde "leitura matinal ajuda no journaling?" → usa `get_trends` com habits (hábito↔hábito)

_Testes:_
- [ ] Testes passam

---

## M2.6 — Dashboard Principal 🔴

**Objetivo:** Implementar dashboard com visão geral da vida do usuário.

**Referências:** `docs/specs/domains/tracking.md`

**Pré-requisitos:** M2.5 (Life Balance Score)

**Tasks:**

- [ ] Criar página `/dashboard`:
  - [ ] Life Balance Score (destaque)
  - [ ] Scores por área (cards)
  - [ ] Destaques positivos
  - [ ] Pontos de atenção
  - [ ] Tarefas pendentes
  - [ ] Hábitos (streaks)
  - [ ] Eventos do dia
  - [ ] Métricas recentes
- [ ] Usar componentes de M2.5:
  - [ ] Importar `LifeBalanceGauge` de `components/tracking/score/`
  - [ ] Importar `AreaScoreCard` de `components/tracking/score/`
  - [ ] Importar `DashboardScoreWidget` (composição)
  - [ ] Importar `DashboardInsightsWidget` (top 3 insights)
- [ ] Implementar widgets específicos do dashboard:
  - [ ] HighlightsCard
  - [ ] AlertsCard
  - [ ] UpcomingEvents
  - [ ] RecentTracking
  - [ ] HabitsStreak
- [ ] Implementar período selecionável (hoje, semana, mês)
- [ ] Implementar comparativo com período anterior

**Testes:**
- [ ] Testes de componentes para cada widget:
  - [ ] DashboardScoreWidget integra componentes de M2.5
  - [ ] DashboardInsightsWidget exibe top 3 insights
  - [ ] HighlightsCard lista itens positivos
  - [ ] AlertsCard lista pontos de atenção
- [ ] Testes de integração:
  - [ ] API retorna dados corretos para dashboard
  - [ ] Filtro de período funciona
  - [ ] Comparativo calcula corretamente
- [ ] Teste E2E: dashboard carrega e exibe dados do usuário
- [ ] Teste E2E: mudar período atualiza dados

**Definition of Done:**
- [ ] Dashboard exibe todas as informações relevantes
- [ ] Widgets são interativos
- [ ] Dados atualizados em tempo real
- [ ] Comparativos funcionam
- [ ] Testes passam

---

## M2.7 — Relatórios 🔴

**Objetivo:** Implementar geração de relatórios periódicos.

**Referências:** `docs/specs/domains/reports.md`, `docs/specs/core/ai-personality.md`

**Pré-requisitos:** M2.5 (Life Balance Score), M2.6 (Dashboard)

**Tasks:**

**Backend:**
- [ ] Criar módulo `reports`:
  - [ ] `GenerateMorningSummaryUseCase`
  - [ ] `GenerateWeeklyReportUseCase`
  - [ ] `GenerateMonthlyReportUseCase`
- [ ] Implementar prompts de relatório (conforme `docs/specs/core/ai-personality.md`)
- [ ] Criar jobs para geração:
  - [ ] Morning summary: configurável (default 07:00), janela de 20 min
  - [ ] Weekly report: domingo 20:00
  - [ ] Monthly report: dia 1, 10:00
- [ ] Salvar relatórios na Memória (opcional)

**Frontend:**
- [ ] Criar página `/reports`:
  - [ ] Lista de relatórios gerados (com filtros por tipo e período)
  - [ ] Visualizar relatório
  - [ ] Configurar horários de envio
  - [ ] Exportar PDF
- [ ] Componentes:
  - [ ] ReportCard (resumo na lista)
  - [ ] ReportViewer (renderização do relatório)
  - [ ] ReportConfigForm (horários e preferências)
  - [ ] ExportButton (PDF, Markdown)
  - [ ] ReportSection (seção reutilizável do relatório)
  - [ ] MetricHighlight (destaque de métrica)
  - [ ] ComparisonBadge (comparativo com período anterior)

**Testes:**
- [ ] Testes unitários:
  - [ ] Geração de conteúdo do morning summary
  - [ ] Geração de conteúdo do weekly report
  - [ ] Geração de conteúdo do monthly report
  - [ ] Cálculo de comparativos
- [ ] Testes de integração:
  - [ ] Job de morning summary executa no horário
  - [ ] Job de weekly report executa domingo
  - [ ] Job de monthly report executa dia 1
  - [ ] Relatório é salvo como nota (quando configurado)
- [ ] Teste E2E: visualizar relatório e exportar PDF
- [ ] Teste E2E: alterar configuração de horário

**Definition of Done:**
- [ ] Morning summary gerado e enviado no horário
- [ ] Weekly report gerado domingo à noite
- [ ] Monthly report gerado no primeiro dia do mês
- [ ] Relatórios podem ser visualizados e exportados
- [ ] Horários configuráveis
- [ ] Testes passam
