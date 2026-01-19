# Fase 2: Tracker (v2.x)

> **Objetivo:** Implementar sistema de tracking de métricas, Life Balance Score, dashboard e relatórios.
> **Referências:** `docs/specs/product.md` §2.3, §6.7, §6.8, §6.14, §6.15, §6.17, `docs/specs/system.md` §3.3, §3.4, §3.9, §3.10

---

## M2.1 — Módulo: Tracking de Métricas 🔴

**Objetivo:** Implementar registro de métricas de vida.

**Referências:** `docs/specs/system.md` §3.3

**Tasks:**

**Backend:**
- [ ] Criar módulo `tracking`:
  - [ ] `TrackingController` - CRUD de entries
  - [ ] `RecordMetricUseCase` - validar e salvar
  - [ ] `GetHistoryUseCase` - buscar histórico com filtros
  - [ ] `GetAggregationsUseCase` - cálculos (média, soma, etc)
  - [ ] `TrackingRepository`
- [ ] Implementar tipos de tracking (conforme `docs/specs/system.md` §3.3):
  - [ ] weight (0-500kg)
  - [ ] water (0-10000ml)
  - [ ] sleep (0-24h, com qualidade 1-10)
  - [ ] exercise (tipo, duração, intensidade)
  - [ ] expense (valor, categoria)
  - [ ] income
  - [ ] mood (1-10)
  - [ ] energy (1-10)
  - [ ] habit
  - [ ] custom
- [ ] Implementar validações conforme `docs/specs/system.md` §3.3
- [ ] Implementar categorias de despesa (conforme `docs/specs/system.md`)
- [ ] Implementar agregações (média, soma, variação)
- [ ] Integrar com Tool Use (tracking via chat):
  - [ ] Implementar executor da tool `record_metric` no ToolExecutorService
  - [ ] Implementar fluxo de confirmação no chat:
    1. Usuário menciona métrica ("pesei 82kg")
    2. IA extrai dados e chama `record_metric` com `requiresConfirmation: true`
    3. Frontend exibe card de confirmação
    4. Usuário confirma → executa tool
  - [ ] Criar `ConfirmationService` para gerenciar estado de confirmação
  - [ ] Permitir correções (valor, data, categoria)
- [ ] Implementar tool `get_trends` para análise de correlação (JARVIS-first):
  - [ ] Input: `{ areas?: LifeArea[], period?: string, metrics?: string[] }`
  - [ ] Output: correlações detectadas, tendências, insights
  - [ ] Exemplos de correlação: stress + gastos impulsivos, sono + energia, exercício + humor
  - [ ] Integrar com Tool Use para resposta contextualizada
  - [ ] Usar agregações do `GetAggregationsUseCase`

**Frontend:**
- [ ] Criar página `/tracking`:
  - [ ] Formulários rápidos por tipo de métrica
  - [ ] Histórico com filtros
  - [ ] Gráficos de evolução
- [ ] Componentes:
  - [ ] QuickTrackForm (botões para registrar comum)
  - [ ] MetricChart (gráfico de linha/barra)
  - [ ] TrackingHistory (lista com filtros)
  - [ ] CategoryPicker (para despesas)
  - [ ] ConfirmationCard (exibe dados extraídos via chat)
  - [ ] Botões de Confirmar/Corrigir/Cancelar no chat
  - [ ] Formulário inline para correções

**Testes:**
- [ ] Testes unitários para validações
- [ ] Teste unitário: extração de dados de mensagens
- [ ] Teste unitário: fluxo de confirmação
- [ ] Teste de integração: mensagem implícita → confirmação → registro
- [ ] Teste E2E: registrar peso → ver no histórico
- [ ] Teste E2E: fluxo completo de tracking via chat com confirmação

**Definition of Done:**
- [ ] Todos os tipos de tracking funcionam
- [ ] Validações aplicadas
- [ ] Agregações calculadas corretamente
- [ ] Gráficos de evolução funcionam
- [ ] Tracking via chat funciona
- [ ] Tracking via conversa sempre pede confirmação
- [ ] Correções de métricas funcionam
- [ ] Testes passam

---

## M2.2 — Life Balance Score 🔴

**Objetivo:** Implementar cálculo do Life Balance Score.

**Referências:** `docs/specs/system.md` §3.4

**Tasks:**

**Backend:**
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

**Testes:**
- [ ] Testes unitários para ScoreCalculator:
  - [ ] Cálculo correto de cada área
  - [ ] Aplicação correta dos pesos
  - [ ] Cálculo do Life Balance Score geral
  - [ ] Comportamento com dados insuficientes (retorna 50)
- [ ] Testes de integração:
  - [ ] Job de cálculo diário executa corretamente
  - [ ] Histórico é armazenado corretamente
- [ ] Teste E2E: verificar scores no dashboard após tracking

**Definition of Done:**
- [ ] Scores calculados corretamente
- [ ] Pesos configuráveis pelo usuário
- [ ] Histórico armazenado
- [ ] Job diário funcionando
- [ ] UI exibe scores com tendências
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
