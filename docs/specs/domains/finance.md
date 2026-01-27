# Finance Module (M2.2)

> Financial management: incomes, bills, variable expenses, debts, and investments.

---

## 1. Overview

O módulo financeiro permite ao usuário gerenciar suas finanças pessoais através de:
- **Rendas (Incomes)** — Fontes de receita mensais
- **Contas Fixas (Bills)** — Compromissos recorrentes com vencimento
- **Despesas Variáveis (Variable Expenses)** — Gastos planejados e realizados
- **Dívidas (Debts)** — Parcelamentos e dívidas em andamento
- **Investimentos (Investments)** — Metas de poupança e aplicações

### Philosophy

> **Nota (ADR-015):** O módulo financeiro foca em planejamento mensal, não micro-tracking de gastos diários. Despesas são gerenciadas por categoria, não por transação individual.

---

## 2. Entities

### 2.1 Incomes (Rendas)

| Campo | Obrigatório | Descrição |
|-------|-------------|-----------|
| name | ✅ | Nome da fonte (ex: "Salário", "Freelance X") |
| type | ✅ | `salary`, `freelance`, `bonus`, `passive`, `investment`, `gift`, `other` |
| frequency | ✅ | `monthly`, `biweekly`, `weekly`, `annual`, `irregular` |
| expectedAmount | ✅ | Valor esperado/planejado |
| actualAmount | ❌ | Valor efetivamente recebido (null = não recebido) |
| isRecurring | ❌ | Se repete automaticamente |
| recurringGroupId | ❌ | UUID que agrupa registros recorrentes |

**Regras:**
- expectedAmount > 0
- actualAmount >= 0 (se definido)
- Renda não recebida: actualAmount = null

### 2.2 Bills (Contas Fixas)

| Campo | Obrigatório | Descrição |
|-------|-------------|-----------|
| name | ✅ | Nome da conta (ex: "Aluguel", "Internet") |
| category | ✅ | `housing`, `utilities`, `subscription`, `insurance`, `other` |
| amount | ✅ | Valor fixo mensal |
| dueDay | ✅ | Dia de vencimento (1-31) |
| status | ✅ | `pending`, `paid`, `overdue`, `canceled` |
| paidAt | ❌ | Data/hora do pagamento |
| isRecurring | ❌ | Se repete automaticamente |
| recurringGroupId | ❌ | UUID que agrupa registros recorrentes |

**Regras:**
- amount > 0
- dueDay: 1 ≤ dueDay ≤ 31
- Status inicial: `pending`

### 2.3 Variable Expenses (Despesas Variáveis)

| Campo | Obrigatório | Descrição |
|-------|-------------|-----------|
| name | ✅ | Nome da categoria (ex: "Alimentação", "Transporte") |
| category | ✅ | `food`, `transport`, `health`, `entertainment`, `shopping`, `other` |
| expectedAmount | ✅ | Valor planejado/orçado |
| actualAmount | ✅ | Valor efetivamente gasto (default: 0) |
| isRecurring | ❌ | Se repete automaticamente |
| recurringGroupId | ❌ | UUID que agrupa registros recorrentes |

**Regras:**
- expectedAmount > 0
- actualAmount >= 0
- Novo mês: actualAmount resetado para 0

### 2.4 Debts (Dívidas)

| Campo | Obrigatório | Descrição |
|-------|-------------|-----------|
| name | ✅ | Nome livre (ex: "Empréstimo Banco X") |
| creditor | ❌ | Nome do credor |
| totalAmount | ✅ | Valor total da dívida |
| isNegotiated | ✅ | `true` = parcelas definidas, `false` = aguardando negociação |
| totalInstallments | Condicional | Número total de parcelas (obrigatório se negotiated) |
| installmentAmount | Condicional | Valor da parcela mensal (obrigatório se negotiated) |
| currentInstallment | Condicional | Parcela atual (1 = primeira a pagar) |
| dueDay | Condicional | Dia de vencimento da parcela |
| startMonthYear | Condicional | Mês de início das parcelas (YYYY-MM, obrigatório se negotiated) |
| status | ✅ | `active`, `overdue`, `paid_off`, `settled`, `defaulted` |
| notes | ❌ | Contexto sobre a dívida/negociação |

**Regras:**
- totalAmount > 0
- Se `isNegotiated = true`:
  - totalInstallments > 0
  - installmentAmount > 0
  - currentInstallment: 1 ≤ currentInstallment ≤ totalInstallments
  - dueDay: 1 ≤ dueDay ≤ 31

**Dívidas Não Negociadas (`isNegotiated = false`):**
- Campos de parcelas são opcionais/ignorados
- NÃO entram no cálculo de "Total Orçado"
- ENTRAM no cálculo de "Total de Dívidas"
- Não geram notificações de vencimento

### 2.5 Investments (Investimentos)

| Campo | Obrigatório | Descrição |
|-------|-------------|-----------|
| name | ✅ | Nome livre (ex: "Reserva de Emergência") |
| type | ✅ | `emergency_fund`, `retirement`, `short_term`, `long_term`, `education`, `custom` |
| goalAmount | ❌ | Meta (valor alvo) |
| currentAmount | ✅ | Valor atual investido |
| monthlyContribution | ❌ | Aporte mensal planejado |
| deadline | ❌ | Data alvo para atingir meta |

**Regras:**
- currentAmount >= 0
- goalAmount > 0 (se definido)
- monthlyContribution >= 0 (se definido)
- Progresso: `(currentAmount / goalAmount) × 100`

---

## 3. Business Rules

### 3.1 Recurrence (Lazy Generation)

**Mecanismo:** Geração sob demanda ao buscar dados de um mês.

**Algoritmo (`ensureRecurringForMonth`):**
1. Calcular mês anterior ao mês solicitado
2. Buscar registros com `isRecurring = true` do mês anterior
3. Para cada item: verificar se já existe entrada no mês alvo
4. Se não existe: criar cópia com campos resetados

**Campos copiados por entidade:**

| Entidade | Campos copiados | Campos resetados |
|----------|----------------|-----------------|
| Bills | name, category, amount, dueDay, recurringGroupId, isRecurring | status='pending', paidAt=null |
| Expenses | name, category, expectedAmount, recurringGroupId, isRecurring | actualAmount='0' |
| Incomes | name, type, frequency, expectedAmount, recurringGroupId, isRecurring | actualAmount=null |

**Idempotência:** UNIQUE constraint em `(user_id, recurring_group_id, month_year)` + `ON CONFLICT DO NOTHING`.

### 3.2 Recurring Group Pattern

Itens recorrentes (rendas, contas, despesas) usam `recurringGroupId` para:
1. Agrupar instâncias mensais do mesmo item
2. Prevenir duplicação via unique constraint
3. Permitir edição/exclusão em lote (escopo `all` ou `future`)

**Schema:**
```typescript
recurringGroupId: uuid('recurring_group_id'), // UUID compartilhado entre meses
monthYear: varchar('month_year', { length: 7 }), // 'YYYY-MM' format
isRecurring: boolean('is_recurring').notNull().default(true),
```

**Unique Constraint:**
```sql
-- Previne duplicação de itens recorrentes no mesmo mês
CREATE UNIQUE INDEX idx_bills_recurring_unique
  ON bills(user_id, recurring_group_id, month_year)
  WHERE recurring_group_id IS NOT NULL;

CREATE UNIQUE INDEX idx_incomes_recurring_unique
  ON incomes(user_id, recurring_group_id, month_year)
  WHERE recurring_group_id IS NOT NULL;

CREATE UNIQUE INDEX idx_expenses_recurring_unique
  ON variable_expenses(user_id, recurring_group_id, month_year)
  WHERE recurring_group_id IS NOT NULL;
```

**Exemplo de uso:**
```
Salário janeiro:   { id: 'x', recurringGroupId: 'abc', monthYear: '2025-01' }
Salário fevereiro: { id: 'y', recurringGroupId: 'abc', monthYear: '2025-02' }
Salário março:     { id: 'z', recurringGroupId: 'abc', monthYear: '2025-03' }
```
→ Mesmo `recurringGroupId` vincula os registros
→ Constraint previne dois salários com mesmo `recurringGroupId` no mesmo mês

### 3.3 Edit/Delete Scope

| Scope | Edit Behavior | Delete Bills | Delete Expenses/Incomes |
|-------|--------------|--------------|-------------------------|
| `this` | Atualiza só este registro | status='canceled' | Deleta o registro |
| `future` | Atualiza este + futuros | Para recorrência + deleta futuros | Para recorrência + deleta futuros |
| `all` | Atualiza todos do grupo | Deleta todos do grupo | Deleta todos do grupo |

### 3.4 Status Transitions

#### Bills
```
pending ─── mark_bill_paid() ───→ paid
    │
    └── job diário (se venceu) ─→ overdue ─── mark_bill_paid() ───→ paid
```

#### Debts
```
Criação com isNegotiated=false:
  not_negotiated ─── negociar() ───→ negotiated (active)

Criação com isNegotiated=true:
  negotiated (active) ─── pagar_parcela() ───→ partially_paid
                │                                   │
                │                   partially_paid ─── pagar_parcela() (última) ─────→ paid_off
                │
                └── parcelas atrasadas ───→ overdue ─── pagar_parcelas_atrasadas() ───→ active
                                               │
                                               └── pagar_parcela() (última) ───→ paid_off
```

**Status `overdue`:**
- Detectado quando `currentInstallment < parcelas esperadas pelo tempo decorrido`
- Cálculo: `expectedPaidInstallments = min(meses desde startMonthYear, totalInstallments)`
- Se `actualPaidInstallments < expectedPaidInstallments` → status = `overdue`
- Ao pagar parcelas atrasadas, volta para `active` (ou `paid_off` se última)

### 3.5 Debt Payment Flow

- Ao pagar parcela(s): `currentInstallment += quantity` (default: 1)
- Se `currentInstallment > totalInstallments`: `status = 'paid_off'`
- Se `status = 'overdue'` e parcelas atrasadas são pagas: `status = 'active'`
- Permite pagar múltiplas parcelas de uma vez (ex: pagar 3 parcelas atrasadas)

**Cálculos de Progresso (por dívida):**
- Parcelas pagas: `currentInstallment - 1`
- Parcelas restantes: `totalInstallments - (currentInstallment - 1)`
- Progresso (%): `((currentInstallment - 1) / totalInstallments) × 100`
- Valor pago: `(currentInstallment - 1) × installmentAmount`
- Valor restante: `totalAmount - valorPago`

### 3.6 Visibilidade de Dívidas por Mês

Dívidas são filtradas por mês baseado em seu tipo e período de vigência.

> **Nota (2026-01-27):** Seguindo padrão da indústria (Mobills, YNAB, Organizze), dívidas só aparecem nos meses onde há parcela a vencer. Não existe conceito de "carência" visível - a dívida simplesmente não aparece antes do mês de início.

| Tipo | Condição | Visibilidade no Calendário |
|------|----------|---------------------------|
| **Não Negociada** | `isNegotiated=false` | TODOS os meses (até resolver) |
| **Antes do Início** | `isNegotiated=true` E `currentMonth < startMonthYear` | **Não aparece** (padrão da indústria) |
| **Negociada Ativa** | `isNegotiated=true` E `status=active` | De `startMonthYear` até `endMonth` |
| **Com Atraso** | `status=overdue` | No período + alerta vermelho |
| **Em Default** | `status=defaulted` | TODOS os meses (alerta perpétuo) |
| **Quitada** | `status=paid_off/settled` | Apenas histórico (meses passados) |

**Cálculo do período:**
- `endMonth = startMonthYear + (totalInstallments - 1) meses`
- Dívida visível APENAS de `startMonthYear` até `endMonth`

**Exemplos:**
- Dívida de 10 parcelas com `startMonthYear='2026-02'`:
  - `endMonth = 2026-11` (fevereiro a novembro)
  - Janeiro/2026: **não aparece**
  - Fevereiro a Novembro/2026: visível
  - Dezembro/2026+: não aparece

---

## 4. Dashboard KPIs

### 4.1 Main KPIs

| KPI | Fórmula | Descrição |
|-----|---------|-----------|
| **Renda do Mês** | `SUM(incomes.actualAmount)` | Total recebido no mês |
| **Total Orçado** | `SUM(bills.amount) + SUM(expenses.expectedAmount) + SUM(debts.installmentAmount WHERE negotiated)` | Compromissos previstos |
| **Total Gasto** | `SUM(bills WHERE paid) + SUM(expenses.actualAmount) + SUM(paid installments)` | Dinheiro que saiu |
| **Saldo** | `Renda - Gasto` | Quanto sobrou/faltou |
| **Total Investido** | `SUM(investments.currentAmount)` | Patrimônio em investimentos |

### 4.2 Debt KPIs

| KPI | Fórmula | Descrição |
|-----|---------|-----------|
| **Total de Dívidas** | `SUM(debts.totalAmount)` | Todas as dívidas (negociadas + não negociadas) |
| **Parcela Mensal Total** | `SUM(debts.installmentAmount WHERE negotiated AND active)` | Soma das parcelas mensais ativas |
| **Total Já Pago** | `SUM((currentInstallment - 1) × installmentAmount)` | Valor já quitado |
| **Total Restante** | `Total de Dívidas - Total Já Pago` | Quanto ainda falta pagar |

---

## 5. Charts

| Gráfico | Tipo | Dados |
|---------|------|-------|
| Orçado vs Real | Barras lado a lado | Por categoria |
| Distribuição de Gastos | Pizza | Por categoria |
| Evolução Mensal | Linha | Saldo dos últimos 6 meses |

---

## 6. Notifications

| Tipo | Quando | Template | Prioridade |
|------|--------|----------|------------|
| `bill_due` | 3 dias antes do vencimento | "Conta {name} vence em 3 dias (R$ {amount})" | Alta |
| `bill_overdue` | No dia do vencimento | "Conta {name} venceu hoje!" | Alta |
| `debt_installment` | 3 dias antes | "Parcela {x}/{y} de {debt_name} vence em 3 dias" | Alta |
| `month_start` | Dia 1 do mês | "Novo mês! Configure seu orçamento de {month}" | Média |
| `month_end` | Último dia do mês | "Resumo de {month}: Gastou R$ {spent} de R$ {budget}" | Média |

---

## 7. Daily Job (Overdue Check)

**Horário:** Diário às 00:30 UTC

**Processo para Bills:**
1. Buscar bills com `status = pending` e `dueDay < dia_atual`
2. Atualizar status para `overdue`
3. Criar alerta de contas vencidas para próxima conversa

**Processo para Debts:**
1. Buscar dívidas com `isNegotiated=true` e `status=active`
2. Para cada dívida com `startMonthYear` definido:
   - Calcular `monthsDiff = meses entre startMonthYear e mês atual`
   - Calcular `expectedPaidInstallments = min(monthsDiff + 1, totalInstallments)`
   - Calcular `actualPaidInstallments = currentInstallment - 1`
   - Se `actualPaidInstallments < expectedPaidInstallments`:
     - Atualizar `status = 'overdue'`
3. Criar alerta de parcelas vencidas para próxima conversa

**Detecção sob demanda:**
- O status `overdue` também é verificado ao listar dívidas por mês
- Endpoint `GET /finance/debts?monthYear=YYYY-MM` executa verificação

---

## 8. AI Tools

| Tool | Descrição | Confirmation |
|------|-----------|--------------|
| `get_finance_summary` | Resumo com KPIs, contas pendentes, parcelas | ❌ |
| `get_pending_bills` | Lista contas pendentes/vencidas | ❌ |
| `get_bills` | Lista todas as contas fixas do periodo | ❌ |
| `mark_bill_paid` | Marca conta como paga | ✅ |
| `get_expenses` | Lista despesas variaveis do periodo | ❌ |
| `create_expense` | Registra despesa variável | ✅ |
| `get_debt_progress` | Progresso de pagamento das dívidas | ❌ |
| `get_incomes` | Lista rendas do mês | ❌ |
| `get_investments` | Lista investimentos | ❌ |

### Tool Definitions

```typescript
{
  name: 'get_finance_summary',
  description: 'Obtém resumo financeiro com KPIs, contas pendentes e parcelas próximas. Use quando o usuário perguntar sobre finanças, orçamento, contas ou situação financeira.',
  parameters: {
    period: 'current_month' | 'last_month' | 'year',
  },
  requiresConfirmation: false,
  inputExamples: [
    { period: "current_month" },
    { period: "last_month" },
    { period: "year" },
  ],
  // Retorno esperado:
  // interface FinanceSummary {
  //   kpis: {
  //     income: number;        // Renda do mês (actualAmount)
  //     budgeted: number;      // Total orçado (excluindo dívidas não negociadas)
  //     spent: number;         // Total gasto
  //     balance: number;       // Saldo (income - spent)
  //     invested: number;      // Total investido
  //   };
  //   debts: {
  //     totalDebts: number;           // Soma de todas as dívidas (negociadas + não negociadas)
  //     monthlyInstallment: number;   // Soma das parcelas mensais (só negociadas)
  //     totalPaid: number;            // Total já pago em dívidas
  //     totalRemaining: number;       // Total restante a pagar
  //     negotiatedCount: number;      // Quantidade de dívidas negociadas
  //     pendingNegotiationCount: number; // Quantidade de dívidas não negociadas
  //   };
  //   pendingBills: Array<{ name: string; amount: number; dueDate: string; daysUntilDue: number; status: 'pending'|'overdue' }>;
  //   upcomingInstallments: Array<{ debtName: string; installment: string; amount: number; dueDate: string; daysUntilDue: number }>;
  //   alerts: string[];        // Alertas (contas vencidas, orçamento estourado, etc.)
  //   monthYear: string;       // Período no formato YYYY-MM
  // }
}

{
  name: 'get_pending_bills',
  description: 'Retorna contas fixas pendentes de pagamento no mês. Use para lembrar o usuário de contas a pagar ou verificar status de pagamentos.',
  parameters: {
    month?: number,
    year?: number,
  },
  requiresConfirmation: false,
  inputExamples: [
    {},
    { month: 1, year: 2026 },
  ],
  // Retorno esperado:
  // interface PendingBillsResponse {
  //   bills: Array<{
  //     id: string;
  //     name: string;
  //     category: string;
  //     amount: number;
  //     dueDay: number;
  //     status: 'pending' | 'overdue';
  //     daysUntilDue: number;
  //   }>;
  //   summary: {
  //     totalPending: number;
  //     totalOverdue: number;
  //     countPending: number;
  //     countOverdue: number;
  //   };
  //   monthYear: string;
  // }
}

{
  name: 'get_bills',
  description: 'Retorna TODAS as contas fixas com detalhes completos (nome, categoria, valor, vencimento, status, data pagamento). Use para ver contas individuais, verificar quais foram pagas, ou analisar gastos fixos.',
  parameters: {
    month?: number,
    year?: number,
    status?: 'all' | 'pending' | 'paid' | 'overdue',
  },
  requiresConfirmation: false,
  inputExamples: [
    { status: 'all' },
    { month: 1, year: 2026, status: 'pending' },
  ],
  // Retorna:
  // {
  //   bills: Array<{ id, name, category, amount, dueDay, status, paidAt, isRecurring, monthYear, currency, daysUntilDue }>;
  //   summary: { totalAmount, paidAmount, pendingAmount, overdueAmount, count, paidCount, pendingCount, overdueCount };
  //   monthYear: string;
  // }
}

{
  name: 'get_expenses',
  description: 'Retorna TODAS as despesas variaveis com detalhes completos (nome, categoria, previsto, real, recorrente/pontual). Use para ver gastos individuais, comparar orcado vs real, ou analisar despesas por categoria.',
  parameters: {
    month?: number,
    year?: number,
  },
  requiresConfirmation: false,
  inputExamples: [
    {},
    { month: 1, year: 2026 },
  ],
  // Retorna:
  // {
  //   expenses: Array<{ id, name, category, expectedAmount, actualAmount, isRecurring, monthYear, currency, variance, percentUsed }>;
  //   summary: { totalExpected, totalActual, variance, recurringCount, oneTimeCount, overBudgetCount };
  //   monthYear: string;
  // }
}

{
  name: 'get_incomes',
  description: 'Retorna TODAS as rendas com detalhes completos (nome, tipo, frequencia, previsto, real). Use para ver fontes de renda individuais, verificar recebimentos, ou analisar previsto vs real.',
  parameters: {
    month?: number,
    year?: number,
  },
  requiresConfirmation: false,
  inputExamples: [
    {},
    { month: 1, year: 2026 },
  ],
  // Retorna:
  // {
  //   incomes: Array<{ id, name, type, frequency, expectedAmount, actualAmount, isRecurring, monthYear, currency, variance }>;
  //   summary: { totalExpected, totalActual, variance, count, receivedCount, pendingCount };
  //   monthYear: string;
  // }
}

{
  name: 'get_investments',
  description: 'Retorna TODOS os investimentos com detalhes completos (nome, tipo, valor atual, meta, aporte mensal, prazo, progresso). Use para ver progresso de investimentos, calcular metas, ou analisar portfolio.',
  parameters: {},
  requiresConfirmation: false,
  inputExamples: [{}],
  // Retorna:
  // {
  //   investments: Array<{ id, name, type, currentAmount, goalAmount, monthlyContribution, deadline, currency, progress, remainingToGoal, monthsToGoal }>;
  //   summary: { totalCurrentAmount, totalGoalAmount, totalMonthlyContribution, averageProgress, count };
  // }
}

{
  name: 'get_debt_progress',
  description: 'Retorna progresso de pagamento das dívidas. Filtra por mês se monthYear fornecido. Inclui parcelas pagas, restantes e percentual de conclusão.',
  parameters: {
    debtId?: string,     // UUID específico ou todas
    monthYear?: string,  // Filtrar dívidas visíveis neste mês (YYYY-MM)
  },
  requiresConfirmation: false,
  inputExamples: [
    {},
    { debtId: '123e4567-e89b-12d3-a456-426614174000' },
    { monthYear: '2026-01' },
  ],
  // Comportamento com monthYear:
  // - Se fornecido, aplica regras de visibilidade (seção 3.6)
  // - Dívidas não negociadas: sempre retornadas
  // - Dívidas quitadas: apenas se mês <= mês de quitação
  // - Dívidas negociadas: apenas se mês está no período (startMonthYear a endMonth)
  //
  // Retorno esperado:
  // interface DebtProgressResponse {
  //   debts: Array<{
  //     id: string;
  //     name: string;
  //     creditor?: string;
  //     totalAmount: number;
  //     installmentAmount: number;
  //     totalInstallments: number;
  //     paidInstallments: number;
  //     remainingInstallments: number;
  //     totalPaid: number;
  //     totalRemaining: number;
  //     percentComplete: number;
  //     nextDueDate?: string;
  //     startMonthYear?: string;  // Mês de início das parcelas
  //     isNegotiated: boolean;
  //     status: 'active' | 'overdue' | 'paid_off' | 'settled' | 'defaulted';
  //   }>;
  //   summary: {
  //     totalDebts: number;
  //     totalPaid: number;
  //     totalRemaining: number;
  //     averageProgress: number;
  //     overdueCount: number;  // Quantidade de dívidas em atraso
  //   };
  // }
}

{
  name: 'mark_bill_paid',
  description: 'Marca uma conta fixa como paga no mês. Use quando o usuário informar que pagou uma conta específica.',
  parameters: {
    billId: string,
    month?: number,
    year?: number,
  },
  requiresConfirmation: true,
  inputExamples: [
    { billId: '123e4567-e89b-12d3-a456-426614174000' },
    { billId: '123e4567-e89b-12d3-a456-426614174000', month: 1, year: 2026 },
  ],
  // Retorno esperado:
  // interface MarkBillPaidResponse {
  //   success: boolean;
  //   bill: { id: string; name: string; amount: number; };
  //   paidAt: string; // ISO date
  // }
}

{
  name: 'create_expense',
  description: 'Cria uma nova despesa variável. Use quando o usuário mencionar um gasto ou quiser registrar uma despesa.',
  parameters: {
    name: string,
    category: 'alimentacao' | 'transporte' | 'lazer' | 'saude' | 'educacao' | 'vestuario' | 'outros',
    budgetedAmount?: number,
    actualAmount?: number,
    isRecurring?: boolean,
  },
  requiresConfirmation: true,
  inputExamples: [
    { name: 'Mercado', category: 'alimentacao', actualAmount: 450.00 },
    { name: 'Uber', category: 'transporte', budgetedAmount: 200, actualAmount: 180, isRecurring: true },
  ],
  // Retorno esperado:
  // interface CreateExpenseResponse {
  //   success: boolean;
  //   expense: { id: string; name: string; category: string; actualAmount: number; };
  // }
}
```

---

## 9. Data Model

### 9.1 Database Tables

| Table | Entity | Description |
|-------|--------|-------------|
| `incomes` | Income | Fontes de renda |
| `bills` | Bill | Contas fixas com vencimento |
| `variable_expenses` | VariableExpense | Despesas por categoria |
| `debts` | Debt | Dívidas e parcelamentos |
| `debt_payments` | DebtPayment | Histórico de pagamentos |
| `investments` | Investment | Investimentos e metas |

### 9.2 Drizzle Schemas

#### Incomes

```typescript
// packages/database/src/schema/incomes.ts

import { pgTable, uuid, varchar, decimal, boolean, timestamp, index } from 'drizzle-orm/pg-core';
import { incomeTypeEnum, incomeFrequencyEnum } from '../enums';
import { users } from '../users';

export const incomes = pgTable('incomes', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),

  // Basic info
  name: varchar('name', { length: 255 }).notNull(),
  type: incomeTypeEnum('type').notNull(), // 'salary', 'freelance', 'bonus', 'passive', 'investment', 'gift', 'other'
  frequency: incomeFrequencyEnum('frequency').notNull().default('monthly'), // 'monthly', 'biweekly', 'weekly', 'annual', 'irregular'

  // Values
  expectedAmount: decimal('expected_amount', { precision: 12, scale: 2 }).notNull(),
  actualAmount: decimal('actual_amount', { precision: 12, scale: 2 }), // null = not received

  // Recurrence
  isRecurring: boolean('is_recurring').notNull().default(true),
  recurringGroupId: uuid('recurring_group_id'),

  // Period
  monthYear: varchar('month_year', { length: 7 }).notNull(), // "YYYY-MM"
  currency: varchar('currency', { length: 3 }).notNull().default('BRL'),

  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index('incomes_user_id_idx').on(table.userId),
  monthYearIdx: index('incomes_month_year_idx').on(table.monthYear),
  userMonthYearIdx: index('incomes_user_month_year_idx').on(table.userId, table.monthYear),
}));

export type Income = typeof incomes.$inferSelect;
export type NewIncome = typeof incomes.$inferInsert;
```

#### Bills

```typescript
// packages/database/src/schema/bills.ts

import { pgTable, uuid, varchar, decimal, integer, boolean, timestamp, index } from 'drizzle-orm/pg-core';
import { billStatusEnum, billCategoryEnum } from '../enums';
import { users } from '../users';

export const bills = pgTable('bills', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),

  // Basic info
  name: varchar('name', { length: 255 }).notNull(),
  category: billCategoryEnum('category').notNull(), // 'housing', 'utilities', 'subscription', 'insurance', 'other'

  // Value
  amount: decimal('amount', { precision: 12, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 3 }).notNull().default('BRL'),

  // Due date
  dueDay: integer('due_day').notNull(), // 1-31

  // Status
  status: billStatusEnum('status').notNull().default('pending'), // 'pending', 'paid', 'overdue', 'canceled'
  paidAt: timestamp('paid_at', { withTimezone: true }),

  // Recurrence
  isRecurring: boolean('is_recurring').notNull().default(true),
  recurringGroupId: uuid('recurring_group_id'),

  // Period
  monthYear: varchar('month_year', { length: 7 }).notNull(),

  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index('bills_user_id_idx').on(table.userId),
  monthYearIdx: index('bills_month_year_idx').on(table.monthYear),
  userMonthYearIdx: index('bills_user_month_year_idx').on(table.userId, table.monthYear),
  statusIdx: index('bills_status_idx').on(table.status),
}));

export type Bill = typeof bills.$inferSelect;
export type NewBill = typeof bills.$inferInsert;
```

#### Variable Expenses

```typescript
// packages/database/src/schema/variable-expenses.ts

import { pgTable, uuid, varchar, decimal, boolean, timestamp, index } from 'drizzle-orm/pg-core';
import { expenseCategoryEnum } from '../enums';
import { users } from '../users';

export const variableExpenses = pgTable('variable_expenses', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),

  // Basic info
  name: varchar('name', { length: 255 }).notNull(),
  category: expenseCategoryEnum('category').notNull(),

  // Values
  expectedAmount: decimal('expected_amount', { precision: 12, scale: 2 }).notNull(),
  actualAmount: decimal('actual_amount', { precision: 12, scale: 2 }).notNull().default('0'),

  // Recurrence
  isRecurring: boolean('is_recurring').notNull().default(false),
  recurringGroupId: uuid('recurring_group_id'),

  // Period
  monthYear: varchar('month_year', { length: 7 }).notNull(),
  currency: varchar('currency', { length: 3 }).notNull().default('BRL'),

  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index('variable_expenses_user_id_idx').on(table.userId),
  monthYearIdx: index('variable_expenses_month_year_idx').on(table.monthYear),
  userMonthYearIdx: index('variable_expenses_user_month_year_idx').on(table.userId, table.monthYear),
  categoryIdx: index('variable_expenses_category_idx').on(table.category),
}));

export type VariableExpense = typeof variableExpenses.$inferSelect;
export type NewVariableExpense = typeof variableExpenses.$inferInsert;
```

#### Debts

```typescript
// packages/database/src/schema/debts.ts

import { pgTable, uuid, varchar, decimal, integer, timestamp, boolean, text, index } from 'drizzle-orm/pg-core';
import { debtStatusEnum } from '../enums';
import { users } from '../users';

export const debts = pgTable('debts', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),

  // Basic info
  name: varchar('name', { length: 255 }).notNull(),
  creditor: varchar('creditor', { length: 255 }),

  // Total debt
  totalAmount: decimal('total_amount', { precision: 12, scale: 2 }).notNull(),

  // Negotiation status
  isNegotiated: boolean('is_negotiated').notNull().default(true),

  // Installments (nullable quando isNegotiated = false)
  totalInstallments: integer('total_installments'),
  installmentAmount: decimal('installment_amount', { precision: 12, scale: 2 }),
  currentInstallment: integer('current_installment').default(1),
  dueDay: integer('due_day'),

  // Status
  status: debtStatusEnum('status').notNull().default('active'), // 'active', 'paid_off', 'settled', 'defaulted'
  currency: varchar('currency', { length: 3 }).notNull().default('BRL'),
  notes: text('notes'),

  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index('debts_user_id_idx').on(table.userId),
  statusIdx: index('debts_status_idx').on(table.status),
  isNegotiatedIdx: index('debts_is_negotiated_idx').on(table.isNegotiated),
}));

export type Debt = typeof debts.$inferSelect;
export type NewDebt = typeof debts.$inferInsert;
```

#### Debt Payments

```typescript
// packages/database/src/schema/debt-payments.ts

import { pgTable, uuid, integer, decimal, varchar, timestamp, index } from 'drizzle-orm/pg-core';
import { users } from './users';
import { debts } from './debts';

export const debtPayments = pgTable('debt_payments', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  debtId: uuid('debt_id').notNull().references(() => debts.id, { onDelete: 'cascade' }),

  // Payment details
  installmentNumber: integer('installment_number').notNull(),
  amount: decimal('amount', { precision: 12, scale: 2 }).notNull(),
  monthYear: varchar('month_year', { length: 7 }).notNull(),

  // Timestamps
  paidAt: timestamp('paid_at', { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('debt_payments_user_id_idx').on(table.userId),
  index('debt_payments_debt_id_idx').on(table.debtId),
  index('debt_payments_user_month_year_idx').on(table.userId, table.monthYear),
]);

export type DebtPayment = typeof debtPayments.$inferSelect;
export type NewDebtPayment = typeof debtPayments.$inferInsert;
```

#### Investments

```typescript
// packages/database/src/schema/investments.ts

import { pgTable, uuid, varchar, decimal, date, timestamp, index } from 'drizzle-orm/pg-core';
import { investmentTypeEnum } from '../enums';
import { users } from '../users';

export const investments = pgTable('investments', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),

  // Basic info
  name: varchar('name', { length: 255 }).notNull(),
  type: investmentTypeEnum('type').notNull().default('custom'), // 'emergency_fund', 'retirement', 'short_term', 'long_term', 'education', 'custom'

  // Goal (optional)
  goalAmount: decimal('goal_amount', { precision: 12, scale: 2 }),

  // Current state
  currentAmount: decimal('current_amount', { precision: 12, scale: 2 }).notNull().default('0'),
  monthlyContribution: decimal('monthly_contribution', { precision: 12, scale: 2 }),

  // Timeline (optional)
  deadline: date('deadline'),
  currency: varchar('currency', { length: 3 }).notNull().default('BRL'),

  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index('investments_user_id_idx').on(table.userId),
  typeIdx: index('investments_type_idx').on(table.type),
}));

export type Investment = typeof investments.$inferSelect;
export type NewInvestment = typeof investments.$inferInsert;
```

### 9.3 RLS Policies

Todas as tabelas do módulo finance têm RLS habilitado:

```sql
ALTER TABLE incomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE variable_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE debts ENABLE ROW LEVEL SECURITY;
ALTER TABLE debt_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE investments ENABLE ROW LEVEL SECURITY;

-- Uses Supabase built-in auth.uid() function
CREATE POLICY "user_access" ON incomes
  FOR ALL USING (user_id = (SELECT auth.uid()));
-- (mesma policy para todas as tabelas do módulo)
```

> **Referência:** Ver `docs/specs/core/auth-security.md` §3.2 para detalhes sobre `auth.uid()`.

---

## 10. API Endpoints

### Filters & Pagination

| Parâmetro | Tipo | Descrição | Aplicável a |
|-----------|------|-----------|-------------|
| `month` | number (1-12) | Filtrar por mês | Todos |
| `year` | number (2020-2100) | Filtrar por ano | Todos |
| `category` | string | Filtrar por categoria | Bills, Expenses |
| `status` | enum | Filtrar por status | Bills |
| `isRecurring` | boolean | Filtrar por recorrência | Bills, Expenses, Incomes |
| `scope` | enum | Escopo para PATCH/DELETE: `this`, `future`, `all` | Bills, Expenses, Incomes |
| `isNegotiated` | boolean | Filtrar por negociação | Debts |
| `page` | number | Página atual (default: 1) | Todos |
| `limit` | number | Itens por página (default: 20, max: 100) | Todos |

### Response Format

```json
{
  "data": [...],
  "meta": {
    "total": 100,
    "page": 1,
    "limit": 20,
    "totalPages": 5
  }
}
```

---

## 11. Definition of Done

### CRUD & UI
- [ ] CRUD de Rendas funciona
- [ ] CRUD de Contas Fixas funciona
- [ ] Checkbox "Pago" altera status e paidAt
- [ ] CRUD de Despesas Variáveis funciona
- [ ] CRUD de Dívidas funciona (com parcelas)
- [ ] CRUD de Investimentos funciona
- [ ] Dashboard exibe todos os KPIs
- [ ] Gráficos renderizam corretamente
- [ ] Navegação entre meses funciona
- [ ] Validações Zod aplicadas

### Recurrence & Automation
- [x] Lazy generation cria registros recorrentes
- [x] Edição/exclusão por escopo funciona
- [x] UNIQUE constraint previne duplicatas
- [ ] Job diário atualiza status para overdue
- [ ] Notificações de vencimento enviadas

### AI Tools
- [ ] get_finance_summary retorna KPIs completos
- [ ] get_pending_bills lista contas pendentes/vencidas
- [ ] mark_bill_paid marca conta como paga
- [ ] create_expense cria despesa variável
- [ ] get_debt_progress retorna progresso de dívidas

### Business Rules
- [ ] Dívidas não negociadas excluídas de Total Orçado
- [ ] Dívidas não negociadas incluídas em Total de Dívidas
- [ ] Pagamento de parcela incrementa currentInstallment
- [ ] Última parcela altera status para paid_off

---

*Última atualização: 27 Janeiro 2026*
