# Fase 2: Tracker (v2.x)

> **Objetivo:** Implementar sistema de tracking de métricas, módulos de dados (Finance, Hábitos, CRM), Life Balance Score, dashboard e relatórios.
> **Referências:** `docs/specs/product.md` §2.3, §6.7, §6.8, §6.14, §6.15, §6.17, `docs/specs/system.md` §3.3, §3.4, §3.7, §3.9, §3.10

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
  - ~~expense/income~~ → Usar M2.2 Finance
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

## M2.2 — Módulo: Finance 🟡

**Objetivo:** Implementar planejamento financeiro mensal de alto nível (controle pessoal, não micro-tracking de gastos).

**Filosofia:** Baixo atrito. Usuário cadastra orçamento no início do mês e marca contas como pagas ao longo do mês.

**Referências:** `docs/specs/system.md` §3.3 (Tracking), `docs/specs/data-model.md` §4.13 (Budgets)

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
  - [x] `FinanceController` - CRUD de todas as entidades
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

_Jobs e Recorrências:_
- [ ] Implementar job mensal de recorrências (dia 1, 00:05 UTC):
  - [ ] Copiar bills com `isRecurring=true` para novo mês (status='pending')
  - [ ] Copiar variable_expenses com `isRecurring=true` para novo mês (actualAmount=0)
  - [ ] Copiar incomes com `isRecurring=true` para novo mês (actualAmount=null)
- [ ] Implementar job diário de verificação de vencimentos (00:30 UTC):
  - [ ] Atualizar bills para `status='overdue'` se dueDay < hoje e status='pending'

_Cálculos e KPIs:_
- [x] Implementar cálculos de KPIs principais:
  - [x] Renda do mês: `SUM(incomes.actualAmount)`
  - [x] Total orçado: `SUM(bills.amount) + SUM(expenses.expectedAmount) + SUM(debts.installmentAmount WHERE isNegotiated=true AND status='active')`
  - [x] Total gasto: `SUM(bills WHERE paid) + SUM(expenses.actualAmount) + SUM(parcelas pagas no mês)`
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
  - [x] Retorna lista de contas pendentes (próximas 5)
  - [x] Retorna lista de parcelas próximas (próximas 5)
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
- [x] KPI Cards Grid (8 cards):
  - [x] Renda do Mês (TrendingUp, green)
  - [x] Total Orçado (Target, blue)
  - [x] Total Gasto (ShoppingCart, orange)
  - [x] Saldo (Wallet, green/red baseado em positivo/negativo)
  - [x] Total Investido (PiggyBank, purple)
  - [x] Total de Dívidas (CreditCard, red)
  - [x] Parcela Mensal Total (Calendar, yellow)
  - [x] Total Já Pago (CheckCircle, green)
- [x] Gráficos (Recharts):
  - [x] Orçado vs Real (BarChart lado a lado por categoria)
  - [x] Distribuição de Gastos (PieChart por categoria)
  - [x] Evolução Mensal (LineChart últimos 6 meses)
- [x] Listas Resumidas:
  - [x] Contas pendentes (próximas 5)
  - [x] Parcelas próximas (próximas 5)
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

_Testes Unitários Backend - Jobs:_
- [ ] Job de recorrência: copia bills, expenses, incomes corretamente
- [ ] Job de recorrência: não duplica registros se já existem
- [ ] Job de vencimento: atualiza status para overdue corretamente
- [ ] Job de vencimento: não altera bills já pagas

_Testes Unitários Backend - Tools:_
- [x] Tool get_finance_summary: retorna KPIs corretos
- [x] Tool get_pending_bills: retorna apenas pendentes do mês
- [x] Tool mark_bill_paid: marca corretamente com confirmação
- [x] Tool create_expense: cria despesa pontual com confirmação
- [x] Tool get_debt_progress: retorna progresso detalhado

_Testes de Integração - Endpoints:_
- [ ] CRUD de todas as entidades (incomes, bills, expenses, debts, investments)
- [ ] Endpoint mark-paid: atualiza status e paidAt
- [ ] Endpoint pay-installment: incrementa e faz auto-quitação
- [ ] Endpoint negotiate: preenche parcelas e atualiza isNegotiated
- [ ] Endpoint update-value: atualiza currentAmount do investimento
- [ ] Endpoint summary: retorna todos os KPIs

_Testes de Integração - Filtros e Paginação:_
- [x] Filtro por monthYear funciona
- [x] Filtro por status funciona (pending, paid, overdue)
- [x] Filtro por category funciona
- [x] Filtro por isNegotiated funciona
- [x] Paginação com limit e offset funciona
- [x] Retorna metadata correta (total, limit, offset)

_Testes de Integração - Jobs:_
- [ ] Job de recorrência mensal executa corretamente
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
- [ ] Component: FinanceKPICard (valor, label, ícone, cor, trend)
- [ ] Component: MonthSelector (navegação, callbacks)
- [ ] Component: FinanceNavTabs (tabs ativas, navegação)
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
- [ ] Component: BudgetVsRealChart (dados, loading, empty)
- [ ] Component: ExpenseDistributionChart (dados, loading, empty)
- [ ] Component: MonthlyEvolutionChart (dados, loading, empty)

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
- [x] Dashboard Finance exibe KPIs (8 cards) e gráficos (3 tipos)
- [x] CRUD de rendas funciona (criar, editar, excluir)
- [x] CRUD de contas fixas funciona (com checkbox pago)
- [x] CRUD de despesas variáveis funciona (recorrentes + pontuais)
- [x] CRUD de dívidas funciona (com controle de parcelas)
- [x] CRUD de investimentos funciona (com progresso de meta)

_Endpoints de Ação:_
- [x] `mark-paid` / `mark-unpaid` funcionam para bills
- [x] `pay-installment` funciona com auto-quitação
- [x] `negotiate` funciona para converter dívida pendente
- [ ] `update-value` funciona para investimentos

_Jobs e Automações:_
- [ ] Job de recorrência mensal copia bills, expenses, incomes
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

---

## M2.3 — Metas e Hábitos 🔴

**Objetivo:** Implementar sistema de metas e tracking de hábitos.

**Referências:** `docs/specs/system.md` §3.9, `docs/specs/product.md` §6.15

> **Nota:** Este módulo alimenta as áreas "learning" e "spiritual" do Life Balance Score (M2.5).

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

## M2.4 — Pessoas (CRM Pessoal) 🔴

**Objetivo:** Implementar gerenciamento de relacionamentos pessoais.

**Referências:** `docs/specs/system.md` §3.7, `docs/specs/product.md` §6.6

> **Nota:** Este módulo alimenta a área "relationships" do Life Balance Score (M2.5).

**Tasks:**

**Backend:**
- [ ] Criar módulo `people`:
  - [ ] CRUD de pessoas
  - [ ] Registrar interações
  - [ ] Lembretes de aniversário
  - [ ] Lembretes de tempo sem contato
  - [ ] Sugestão de presentes (via IA)
- [ ] Vincular pessoas a notas

**Frontend:**
- [ ] Criar página `/people`:
  - [ ] Lista de pessoas com busca/filtros (por grupo, última interação)
  - [ ] Criar/editar pessoa
  - [ ] Visualizar pessoa com histórico completo
- [ ] Criar página `/people/[id]`:
  - [ ] Informações da pessoa
  - [ ] Timeline de interações
  - [ ] Notas vinculadas
  - [ ] Histórico de presentes
- [ ] Componentes:
  - [ ] PersonCard (avatar, nome, relacionamento, última interação)
  - [ ] PersonForm (criar/editar pessoa)
  - [ ] InteractionTimeline (lista cronológica)
  - [ ] InteractionForm (registrar nova interação)
  - [ ] BirthdayReminder (card de aniversários próximos)
  - [ ] GiftSuggestions (sugestões da IA)
  - [ ] GiftHistory (presentes dados/recebidos)
  - [ ] PersonGroups (tags: família, trabalho, amigos, etc.)
  - [ ] ContactSuggestion (alerta de tempo sem contato)

**Testes:**
- [ ] Testes de integração:
  - [ ] CRUD de pessoas via API
  - [ ] Registro de interações
  - [ ] Lembretes de aniversário (job)
  - [ ] Lembretes de tempo sem contato (job)
  - [ ] Vínculo com notas
- [ ] Testes unitários:
  - [ ] Cálculo de tempo sem contato
  - [ ] Validação de dados da pessoa
- [ ] Teste E2E: criar pessoa → registrar interação → ver na timeline
- [ ] Teste E2E: verificar lembrete de aniversário próximo

**Definition of Done:**
- [ ] CRUD funciona
- [ ] Interações registradas
- [ ] Lembretes de aniversário funcionam
- [ ] Lembretes de contato funcionam
- [ ] Vínculo com notas funciona
- [ ] Testes passam

---

## M2.5 — Life Balance Score + Trends Analysis 🔴

**Objetivo:** Implementar cálculo do Life Balance Score e análise de tendências/correlações entre métricas.

**Referências:** `docs/specs/system.md` §3.4, `docs/specs/ai.md` §6.2

**Pré-requisitos:** M2.1 (Tracking), M2.2 (Finance), M2.3 (Hábitos), M2.4 (CRM)

> **Nota:** Life Balance Score calcula scores para 6 áreas. Fontes de dados:
> - **health** (physical, mental, leisure): M2.1 Tracking
> - **finance** (budget, savings, debts, investments): M2.2 Finance
> - **learning** (formal, informal): M2.3 Hábitos
> - **spiritual** (practice, community): M2.3 Hábitos
> - **relationships** (family, romantic, social): M2.4 CRM Pessoas
> - **professional** (career, business): Retorna 50 (neutro) - ver TBD-207

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

## M2.6 — Dashboard Principal 🔴

**Objetivo:** Implementar dashboard com visão geral da vida do usuário.

**Referências:** `docs/specs/product.md` §6.14

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

## M2.7 — Relatórios 🔴

**Objetivo:** Implementar geração de relatórios periódicos.

**Referências:** `docs/specs/system.md` §3.10, `docs/specs/ai.md` §7.1, §7.2

**Pré-requisitos:** M2.5 (Life Balance Score), M2.6 (Dashboard)

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
