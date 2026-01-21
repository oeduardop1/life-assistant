# Fase 2: Tracker (v2.x)

> **Objetivo:** Implementar sistema de tracking de métricas, Life Balance Score, dashboard, relatórios e planejamento financeiro.
> **Referências:** `docs/specs/product.md` §2.3, §6.7, §6.8, §6.14, §6.15, §6.17, `docs/specs/system.md` §3.3, §3.4, §3.9, §3.10

---

## M2.1 — Módulo: Tracking de Métricas (Baixo Atrito) 🟢

**Objetivo:** Implementar captura conversacional de métricas com confirmação obrigatória e dashboard opcional.

**Filosofia:** Baixo atrito (ADR-015). IA detecta métricas na conversa e oferece registrar. Dashboard é secundário, para quem prefere controle direto. Sistema funciona normalmente sem nenhum tracking.

**Referências:** `docs/specs/system.md` §3.3, `docs/adr/ADR-015-tracking-low-friction-philosophy.md`

**Tasks:**

**Backend:**
- [x] Criar módulo `tracking`:
  - [x] `TrackingController` - CRUD de entries
  - [x] `RecordMetricUseCase` - validar e salvar (requer confirmação)
  - [x] `GetHistoryUseCase` - buscar histórico com filtros
  - [x] `GetAggregationsUseCase` - cálculos (média, soma, etc)
  - [x] `TrackingRepository`
- [x] Implementar tipos de tracking (conforme `docs/specs/system.md` §3.3):
  - [x] weight (0-500kg)
  - [x] water (0-10000ml)
  - [x] sleep (0-24h, com qualidade 1-10)
  - [x] exercise (tipo, duração, intensidade)
  - [x] mood (1-10)
  - [x] energy (1-10)
  - [x] custom
  - ~~expense/income~~ → Usar M2.6 Finance
- [x] Implementar validações conforme `docs/specs/system.md` §3.3
- [x] Implementar agregações (média, soma, variação)
- [x] Integrar com Tool Use (captura conversacional):
  - [x] Implementar executor da tool `record_metric` no ToolExecutorService
  - [x] Fluxo de captura conversacional (ADR-015, ai.md §9.3):
    1. Usuário menciona métrica naturalmente ("voltei do médico, estou com 82kg")
    2. IA chama `record_metric` → Sistema intercepta (`requiresConfirmation: true`)
    3. Sistema salva `pendingConfirmation` no Redis (TTL 5min)
    4. IA pergunta: "Quer que eu registre seu peso de 82kg?"
    5. Usuário responde: "Sim" / "Na verdade foi 82.5" / "Não"
    6. Sistema detecta intent ANTES de novo tool loop (`ChatService.detectUserIntent()`)
    7. Se "confirm" → Executa tool diretamente (sem novo loop)
    8. Se "reject" → Cancela
    9. Se "correction"/"unrelated" → Limpa pendente, inicia novo loop
  - [x] Implementar lógica de `pendingConfirmation` no Tool Loop (infraestrutura genérica)
    - Nota: Esta lógica é usada por `record_metric`, `create_reminder`, `update_person`
    - Sistema controla confirmação via intent detection (não depende do prompt da IA)
  - [x] Armazenar estado de confirmação pendente (expira em 5 min)

**Frontend:**
- [x] Criar página `/tracking` (dashboard opcional):
  - [x] Empty state amigável quando não há dados:
    - "Você ainda não registrou nenhuma métrica. Converse comigo sobre seu dia e eu posso registrar para você, ou use os formulários abaixo."
  - [x] Formulários para registro manual (secundário)
  - [x] Histórico com filtros (quando há dados)
  - [x] Gráficos de evolução (quando há dados)
  - [x] Sem widgets de "meta diária" ou "streak" impostos
- [x] Componentes:
  - [x] TrackingEmptyState (mensagem amigável)
  - [x] ManualTrackForm (formulários por tipo)
  - [x] MetricChart (gráfico de linha/barra)
  - [x] TrackingHistory (lista com filtros)
  - Nota: Confirmação de métricas é 100% conversacional (JARVIS-first)
    - Não há cards ou botões de confirmação
    - IA pergunta via texto, usuário responde via texto
    - Ver ai.md §9.3 para fluxo completo

**Testes:**

_Testes Unitários Backend (7 tasks):_
- [x] Unit: TrackingService validações por tipo (weight/water/sleep/exercise/mood/energy)
- [x] Unit: TrackingService limites min/max e unidades padrão
- [x] Unit: TrackingController endpoints REST (POST, GET, DELETE)
- [x] Unit: TrackingRepository operações CRUD com Drizzle
- [x] Unit: TrackingToolExecutorService (record_metric, get_tracking_history)
- [x] Unit: ConfirmationStateService (store, get, confirm, reject, clearAll, TTL)
- [x] Unit: ToolLoopService pendingConfirmation (pausa, retoma, rejeita)

_Testes de Integração (5 tasks):_
- [x] Integration: API REST tracking (POST, GET, DELETE com banco real)
- [x] Integration: Multi-tenant isolation (user A não vê dados de B)
- [x] Integration: Chat → IA pergunta → "Sim" → registra métrica
- [x] Integration: Chat → IA pergunta → "Não" → NÃO registra
- [x] Integration: Chat → correção → re-pergunta → confirma

_Testes de Componente Frontend (5 tasks):_
- [x] Component: MetricCard (valor, unidade, trend, cor por tipo)
- [x] Component: MetricChart (line/bar, loading, empty, average)
- [x] Component: ManualTrackForm (validação, submit, reset, erro)
- [x] Component: TrackingHistory (listagem, paginação, delete)
- [x] Component: TrackingEmptyState

_Testes de Hooks Frontend (2 tasks):_
- [x] Hooks: useTrackingEntries, useCreateTrackingEntry, useTrackingStats
- [x] Hooks: useDeleteTrackingEntry, useTrackingAggregations

_Testes E2E (6 tasks):_
- [x] E2E: registrar peso via formulário → ver no histórico
- [x] E2E: registrar água múltiplas vezes → ver soma diária
- [x] E2E: visualizar histórico com dados reais
- [x] E2E: dashboard exibe empty state
- [x] E2E: fluxo conversacional completo via chat
- [x] E2E: navegação entre tipos de métricas via filtro

**Definition of Done:**
- [x] Sistema funciona normalmente sem nenhum tracking (não penaliza)
- [x] Todos os tipos de tracking funcionam (7 tipos, sem expense/income)
- [x] Validações aplicadas
- [x] Agregações calculadas corretamente
- [x] Dashboard é opcional com empty state amigável
- [x] Gráficos funcionam quando há dados
- [x] Captura conversacional funciona (JARVIS-first):
  - [x] IA pergunta via texto ("Quer que eu registre...? 👍")
  - [x] Usuário confirma/corrige/recusa via texto
  - [x] Sem botões ou cards de confirmação
- [x] `pendingConfirmation` pausa tool loop até resposta do usuário
- [x] IA nunca registra sem confirmação textual explícita
- [x] IA nunca cobra tracking não realizado (regra 11 no system prompt)
- [x] Correções via conversa funcionam (IA ajusta e re-pergunta, suportado pela infraestrutura pendingConfirmation)
- [x] Testes passam (243 testes: 42 unit backend, 9 integration, 22 component, 8 hooks, 162 E2E)

**Notas (2026-01-20):**
- Cobertura de testes expandida de 10 tasks genéricas para 25 tasks específicas
- Backend: TrackingService, TrackingController, TrackingRepository, TrackingToolExecutor, ConfirmationStateService, ToolLoopService
- Frontend: 5 componentes testados (MetricCard, MetricChart, ManualTrackForm, TrackingHistory, TrackingEmptyState)
- Hooks: 11 hooks do useTracking testados
- E2E: 6 fluxos completos (formulário manual, água, histórico, empty state, chat conversacional, filtros)
- Fixes E2E: sidebar toggle CSS classes, mobile-chrome skips, memory search debounce
- **Enhancement: Tools `update_metric` e `delete_metric`** (Gap 2)
  - Novas tools para correção/deleção de métricas já registradas
  - Fix `get_tracking_history` para retornar `id` de cada entry
  - Instruções no system prompt sobre datas relativas (ontem, dia X)
  - 12 novos testes unitários no tracking-tool-executor.spec.ts
  - Docs atualizados: ai.md §6.2, §9.1, §9.2, §9.7; system.md §3.3
- **Enhancement: Detecção de Intent via LLM** (Gap 7 - 2026-01-21)
  - Nova tool `respond_to_confirmation` para detecção de intent
  - `ToolChoice` estendido para suportar `{ type: 'tool', toolName: string }`
  - Adapters Gemini e Claude atualizados para forçar tool específica
  - Detecção via LLM substitui regex patterns limitados
  - Reconhece variações naturais: "beleza", "manda ver", "tá certo", "bora"
  - SEM fallback para regex - erro explícito se LLM falhar
  - Docs atualizados: ai.md §2.3, §6.2, §9.3, §9.6; system.md §3.3

---

## M2.2 — Life Balance Score + Trends Analysis 🔴

**Objetivo:** Implementar cálculo do Life Balance Score e análise de tendências/correlações entre métricas.

**Referências:** `docs/specs/system.md` §3.4, `docs/specs/ai.md` §6.2

**Tasks:**

**Backend — Life Balance Score:**
- [ ] Criar serviço `ScoreCalculator`:
  - [ ] Calcular score de cada área (0-100)
  - [ ] Aplicar pesos configuráveis
  - [ ] Calcular Life Balance Score geral
- [ ] Implementar fórmulas por área (conforme `docs/specs/system.md` §3.4):
  - [ ] Saúde: peso (IMC), exercício, sono, água, alimentação
  - [ ] Financeiro: budget, savings, debt, investments
  - [ ] Relacionamentos: interações, qualidade
  - [ ] Carreira: satisfação, progresso, work-life
  - [ ] Saúde Mental: humor, energia, stress
  - [ ] (outros conforme spec)
- [ ] Implementar comportamento com dados insuficientes (retorna 50 + aviso)
- [ ] Criar job para cálculo diário (00:00 UTC)
- [ ] Armazenar histórico de scores

**Backend — Trends Analysis (Tool `get_trends`):**

> **Nota:** Usa agregações de M2.1 (`GetAggregationsUseCase`) como base. NÃO duplicar cálculos de média/soma/variação.

- [ ] Criar tool schema `get_trends` em `packages/ai/src/schemas/tools/`:
  ```typescript
  {
    name: 'get_trends',
    description: 'Analisa tendências e correlações entre métricas do usuário. Use quando perguntarem sobre evolução, padrões ou relações entre métricas.',
    parameters: {
      types: z.array(TrackingType).min(1).max(5),  // Métricas para analisar
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
  - [ ] `generateInsights(metrics: MetricTrend[], correlations: Correlation[])`: Gera lista de insights acionáveis
  - [ ] `calculateDataDensity(dataPoints: number, days: number)`: Calcula densidade de registros
    - Retorna: 'high' (>=70%), 'medium' (30-70%), 'low' (<30%)
  - [ ] `generateSparseDataSuggestion(density: DataDensity, days: number, type: TrackingType)`: Gera sugestão para dados esparsos
- [ ] Criar `GetTrendsUseCase`:
  - [ ] Resolver período predefinido para dias (week=7, month=30, quarter=90, semester=180, year=365)
  - [ ] Para 'all': buscar data do primeiro registro do usuário
  - [ ] Buscar dados via `GetHistoryUseCase` (M2.1)
  - [ ] Buscar agregações via `GetAggregationsUseCase` (M2.1)
  - [ ] Calcular densidade de dados por métrica
  - [ ] Aplicar análise de tendência por métrica
  - [ ] Calcular correlações entre pares de métricas (se `includeCorrelations=true`)
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
    correlations: [
      {
        pair: [TrackingType, TrackingType],
        coefficient: number,   // -1 a 1 (Pearson)
        strength: 'strong' | 'moderate' | 'weak' | 'none',
        direction: 'positive' | 'negative',
        interpretation: string, // Texto explicativo
      }
    ],
    insights: string[],        // Lista de insights acionáveis
    warnings: [
      {
        metric: TrackingType,
        message: string,
        type: 'sparse_data' | 'insufficient_data'  // Tipo do aviso
      }
    ],
    period: { start: Date, end: Date, days: number, preset?: string },
  }
  ```

**Frontend:**
- [ ] Componentes de Score:
  - [ ] LifeBalanceGauge (velocímetro 0-100 com cores)
  - [ ] AreaScoreCard (score + ícone + tendência por área)
  - [ ] ScoreTrend (seta up/down com percentual de mudança)
  - [ ] ScoreHistoryChart (gráfico de linha da evolução)
  - [ ] WeightConfigModal (ajustar pesos das áreas)
- [ ] Exibir Life Balance Score no dashboard
- [ ] Exibir scores por área
- [ ] Exibir tendências (setas up/down)
- [ ] Gráfico de evolução dos scores
- [ ] Página `/settings/weights` para configurar pesos

**Testes — Life Balance Score:**
- [ ] Testes unitários para ScoreCalculator:
  - [ ] Cálculo correto de cada área
  - [ ] Aplicação correta dos pesos
  - [ ] Cálculo do Life Balance Score geral
  - [ ] Comportamento com dados insuficientes (retorna 50)
- [ ] Testes de integração:
  - [ ] Job de cálculo diário executa corretamente
  - [ ] Histórico é armazenado corretamente
- [ ] Teste E2E: verificar scores no dashboard após tracking

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
  - [ ] `generateInsights`: gera insights relevantes
  - [ ] `calculateDataDensity`: 10 dias, 7 registros → 'high' (70%)
  - [ ] `calculateDataDensity`: 30 dias, 9 registros → 'low' (30%)
  - [ ] `calculateDataDensity`: 90 dias, 45 registros → 'medium' (50%)
  - [ ] `calculateDataDensity`: 365 dias, 50 registros → 'low' (~14%)
  - [ ] `generateSparseDataSuggestion`: density='low' → retorna sugestão
- [ ] Testes unitários para GetTrendsUseCase:
  - [ ] Retorna estrutura correta com métricas válidas
  - [ ] Retorna warnings para métricas sem dados (type='insufficient_data')
  - [ ] Retorna warnings para dados esparsos (type='sparse_data')
  - [ ] Calcula correlações apenas se `includeCorrelations=true`
  - [ ] Limita correlações a pares relevantes (não calcula sleep×sleep)
  - [ ] Resolve período predefinido corretamente (week→7, month→30, etc.)
  - [ ] Período 'all' busca todos os dados disponíveis
- [ ] Testes de integração:
  - [ ] Tool `get_trends` executa via ToolExecutorService
  - [ ] Usa dados reais de tracking_entries
  - [ ] Correlação sleep×mood retorna resultado coerente
  - [ ] Período 'year' funciona com dados de 365 dias

**Definition of Done:**
- [ ] Scores calculados corretamente
- [ ] Pesos configuráveis pelo usuário
- [ ] Histórico de scores armazenado
- [ ] Job diário de score funcionando
- [ ] UI exibe scores com tendências
- [ ] Tool `get_trends` funciona:
  - [ ] Retorna tendências por métrica (direção, variação, confiança)
  - [ ] Calcula correlações entre métricas (Pearson)
  - [ ] Gera insights acionáveis em português
  - [ ] Retorna warnings para dados insuficientes
  - [ ] Suporta períodos de 7 a 365 dias
  - [ ] Suporta períodos predefinidos (week/month/quarter/semester/year/all)
  - [ ] Calcula densidade de dados por métrica (high/medium/low)
  - [ ] Gera warnings tipados (sparse_data/insufficient_data)
  - [ ] Gera sugestões quando dados são insuficientes para análise confiável
- [ ] IA consegue responder "como está minha saúde?" com análise de tendências
- [ ] IA consegue responder "sono afeta meu humor?" com correlação
- [ ] IA consegue responder "como está meu peso no último ano?" com análise de longo prazo
- [ ] Testes passam

---

## M2.3 — Dashboard Principal 🔴

**Objetivo:** Implementar dashboard com visão geral da vida do usuário.

**Referências:** `docs/specs/product.md` §6.14

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
- [ ] Implementar widgets:
  - [ ] ScoreGauge (velocímetro do score)
  - [ ] AreaCard (score + tendência por área)
  - [ ] HighlightsCard
  - [ ] AlertsCard
  - [ ] UpcomingEvents
  - [ ] RecentTracking
  - [ ] HabitsStreak
- [ ] Implementar período selecionável (hoje, semana, mês)
- [ ] Implementar comparativo com período anterior

**Testes:**
- [ ] Testes de componentes para cada widget:
  - [ ] ScoreGauge renderiza corretamente
  - [ ] AreaCard exibe dados e tendência
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

## M2.4 — Metas e Hábitos 🔴

**Objetivo:** Implementar sistema de metas e tracking de hábitos.

**Referências:** `docs/specs/system.md` §3.9, `docs/specs/product.md` §6.15

**Tasks:**

**Backend:**
- [ ] Criar módulo `goals`:
  - [ ] CRUD de metas (título, área, valor alvo, prazo, milestones)
  - [ ] Calcular progresso
  - [ ] Notificar em risco/concluída
- [ ] Criar módulo `habits`:
  - [ ] CRUD de hábitos (título, frequência, reminder)
  - [ ] Registrar completion
  - [ ] Calcular streak
  - [ ] Implementar grace period (1 dia não quebra streak)
  - [ ] Implementar freeze (max 3/mês)
  - [ ] Lembretes em horário configurado

**Frontend:**
- [ ] Criar página `/goals`:
  - [ ] Lista de metas com progresso
  - [ ] Criar/editar meta
  - [ ] Visualizar milestones
- [ ] Criar página `/habits`:
  - [ ] Lista de hábitos com streaks
  - [ ] Check-in diário
  - [ ] Calendário de completions
  - [ ] Freeze button
- [ ] Componentes:
  - [ ] GoalProgress (barra de progresso com percentual)
  - [ ] GoalCard (resumo da meta)
  - [ ] GoalForm (criar/editar meta)
  - [ ] MilestoneList (sub-metas)
  - [ ] HabitCard (com streak e botão de check-in)
  - [ ] HabitCalendar (visualização mensal de completions)
  - [ ] StreakBadge (número + fogo emoji)
  - [ ] FreezeButton (com contador de freezes restantes)
  - [ ] HabitForm (criar/editar hábito)

**Testes:**
- [ ] Testes unitários:
  - [ ] Cálculo de progresso de meta
  - [ ] Cálculo de streak (considerando grace period)
  - [ ] Lógica de freeze (max 3/mês)
  - [ ] Validação de frequência de hábito
- [ ] Testes de integração:
  - [ ] CRUD de metas via API
  - [ ] CRUD de hábitos via API
  - [ ] Check-in de hábito
  - [ ] Notificação de meta em risco
- [ ] Teste E2E: criar meta → atualizar progresso → completar
- [ ] Teste E2E: criar hábito → check-in diário → verificar streak
- [ ] Teste E2E: usar freeze e verificar contador

**Definition of Done:**
- [ ] CRUD de metas funciona
- [ ] Progresso calculado automaticamente
- [ ] Hábitos com streak funcionam
- [ ] Grace period funciona
- [ ] Freeze funciona (max 3/mês)
- [ ] Lembretes enviados
- [ ] Testes passam

---

## M2.5 — Relatórios 🔴

**Objetivo:** Implementar geração de relatórios periódicos.

**Referências:** `docs/specs/system.md` §3.10, `docs/specs/ai.md` §7.1, §7.2

**Tasks:**

**Backend:**
- [ ] Criar módulo `reports`:
  - [ ] `GenerateMorningSummaryUseCase`
  - [ ] `GenerateWeeklyReportUseCase`
  - [ ] `GenerateMonthlyReportUseCase`
- [ ] Implementar prompts de relatório (conforme `docs/specs/ai.md` §7.1, §7.2)
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

---

## M2.6 — Módulo: Finance 🔴

**Objetivo:** Implementar planejamento financeiro mensal de alto nível (controle pessoal, não micro-tracking de gastos).

**Filosofia:** Baixo atrito. Usuário cadastra orçamento no início do mês e marca contas como pagas ao longo do mês.

**Referências:** `docs/specs/system.md` §3.3 (Tracking), `docs/specs/data-model.md` §4.13 (Budgets)

**Tasks:**

**Backend:**
- [ ] Criar módulo `finance`:
  - [ ] `FinanceController` - CRUD de todas as entidades
  - [ ] `IncomeService` - gerenciar rendas
  - [ ] `BillService` - gerenciar contas fixas
  - [ ] `ExpenseService` - gerenciar despesas variáveis
  - [ ] `DebtService` - gerenciar dívidas com parcelas
  - [ ] `InvestmentService` - gerenciar investimentos
  - [ ] `FinanceSummaryUseCase` - calcular KPIs do dashboard
- [ ] Criar tabelas (migrations):
  - [ ] `incomes` - fontes de renda (nome, previsto, real, recorrente)
  - [ ] `bills` - contas fixas (nome, valor, vencimento, status, categoria, recorrente)
  - [ ] `variable_expenses` - despesas variáveis (nome, previsto, real, recorrente, mês/ano)
  - [ ] `debts` - dívidas (nome, total, parcelas, valor_parcela, parcela_atual, vencimento)
  - [ ] `investments` - investimentos (nome, meta, atual, aporte_mensal, prazo)
- [ ] Implementar recorrências automáticas:
  - [ ] Job mensal para gerar registros de contas fixas recorrentes
  - [ ] Job mensal para gerar registros de despesas variáveis recorrentes
  - [ ] Status inicial: `pending` (a ser marcado como `paid`)
- [ ] Implementar cálculos de KPIs:
  - [ ] Renda do mês (soma das rendas reais)
  - [ ] Total orçado (soma de todos os blocos)
  - [ ] Total gasto (fixas pagas + variáveis reais + parcelas)
  - [ ] Saldo (renda - gasto)
  - [ ] Total investido (soma dos investimentos atuais)
- [ ] Implementar tool `get_finance_summary` para IA:
  - [ ] Retorna KPIs, contas pendentes, parcelas próximas
  - [ ] Permite IA responder "como estão minhas finanças?"
- [ ] Implementar notificações:
  - [ ] Início do mês: "Configure seu orçamento de [mês]"
  - [ ] Conta próxima do vencimento (3 dias antes)
  - [ ] Assinatura renovando (3 dias antes)
  - [ ] Parcela de dívida vencendo (3 dias antes)
  - [ ] Fim do mês: Resumo financeiro

**Frontend:**
- [ ] Criar página `/finance` (dashboard):
  - [ ] KPIs em cards (Renda, Orçado, Gasto, Saldo, Investido)
  - [ ] Gráfico: Orçamento x Real (barras por categoria)
  - [ ] Gráfico: Distribuição de gastos (pizza)
  - [ ] Gráfico: Evolução mensal (últimos 6-12 meses)
  - [ ] Lista de contas pendentes
  - [ ] Lista de parcelas próximas
- [ ] Criar página `/finance/income`:
  - [ ] Lista de fontes de renda
  - [ ] Criar/editar renda
  - [ ] Marcar como recorrente
  - [ ] Previsto vs Real
- [ ] Criar página `/finance/bills`:
  - [ ] Lista de contas fixas do mês
  - [ ] Checkbox para marcar como pago
  - [ ] Filtros: pendentes, pagas, todas
  - [ ] Criar/editar conta fixa
  - [ ] Categorias: moradia, serviços, assinatura, outros
- [ ] Criar página `/finance/expenses`:
  - [ ] Seção: Variáveis Recorrentes (aparecem todo mês)
    - [ ] Defaults: Alimentação/Mercado, Transporte/Gasolina, Lazer/Entretenimento
    - [ ] Previsto vs Real
  - [ ] Seção: Variáveis Pontuais (só este mês)
    - [ ] Criar despesa pontual
  - [ ] Total de variáveis do mês
- [ ] Criar página `/finance/debts`:
  - [ ] Lista de dívidas ativas
  - [ ] Criar/editar dívida
  - [ ] Visualizar parcelas (X/Y)
  - [ ] Marcar parcela como paga
  - [ ] Progresso da dívida (%)
- [ ] Criar página `/finance/investments`:
  - [ ] Lista de investimentos
  - [ ] Criar/editar investimento (nome livre)
  - [ ] Campos: nome, meta (opcional), valor atual, aporte mensal, prazo (opcional)
  - [ ] Progresso da meta (%)
  - [ ] Total investido
- [ ] Componentes:
  - [ ] FinanceKPICard (valor + label + ícone)
  - [ ] BudgetVsRealChart (barras comparativas)
  - [ ] ExpenseDistributionChart (pizza)
  - [ ] MonthlyEvolutionChart (linha)
  - [ ] BillRow (com checkbox de pago)
  - [ ] DebtCard (com progresso de parcelas)
  - [ ] InvestmentCard (com progresso de meta)
  - [ ] MonthSelector (navegação entre meses)
  - [ ] RecurrenceToggle (marcar como recorrente)

**Testes:**
- [ ] Testes unitários:
  - [ ] Cálculo de KPIs
  - [ ] Geração de recorrências
  - [ ] Validações de dívida (parcelas)
  - [ ] Cálculo de progresso de investimento
- [ ] Testes de integração:
  - [ ] CRUD de todas as entidades
  - [ ] Job de recorrência mensal
  - [ ] Notificações de vencimento
  - [ ] Tool `get_finance_summary`
- [ ] Teste E2E: criar conta fixa → marcar como paga → verificar no dashboard
- [ ] Teste E2E: criar dívida com parcelas → pagar parcela → verificar progresso
- [ ] Teste E2E: navegar entre meses

**Definition of Done:**
- [ ] Dashboard Finance exibe KPIs e gráficos
- [ ] CRUD de rendas funciona
- [ ] CRUD de contas fixas funciona (com checkbox pago)
- [ ] CRUD de despesas variáveis funciona (recorrentes + pontuais)
- [ ] CRUD de dívidas funciona (com controle de parcelas)
- [ ] CRUD de investimentos funciona (com progresso de meta)
- [ ] Recorrências automáticas funcionam (job mensal)
- [ ] Notificações de vencimento enviadas
- [ ] IA responde sobre finanças via tool
- [ ] Navegação entre meses funciona
- [ ] Testes passam
