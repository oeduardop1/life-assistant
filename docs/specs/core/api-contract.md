# API Contract (REST + SSE)

> Inventário de endpoints, autenticação, paginação e envelopes padrão.
> Fonte: controllers em `apps/api/src/**` e `apps/api/src/main.ts`.

---

## 1. Base URL, Prefixo e Docs

- **Prefixo global:** `/api` (definido em `apps/api/src/main.ts`)
- **Swagger (dev):** `/api/docs`
- **Versionamento:** **não há** versão ativa hoje.  
  **Plano:** adotar versionamento por URI (`/api/v1/...`) usando NestJS versioning quando necessário.

---

## 2. Autenticação

### 2.1 REST

- **Bearer JWT** do Supabase (`Authorization: Bearer <token>`)
- Endpoints marcados com `@Public()` não exigem token.

### 2.2 SSE (Chat)

EventSource não suporta headers. Autenticação é feita via **query param**:

```
GET /api/chat/conversations/:id/stream?token=<jwt>
GET /api/chat/conversations/:id/confirm/:confirmationId?token=<jwt>
```

Guard responsável: `SseAuthGuard`.

---

## 3. Envelope Padrão de Resposta

Todas as respostas REST são embrulhadas por `TransformInterceptor`:

```ts
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string; details?: unknown };
  meta: { timestamp: string; requestId: string };
}
```

Erros seguem o padrão definido em `docs/specs/core/errors.md`.

---

## 4. Paginação (padrão atual)

O padrão atual é **offset/limit**:

| Campo | Tipo | Default | Max |
|-------|------|---------|-----|
| `limit` | number | 50 | 100 |
| `offset` | number | 0 | - |

Exemplo:
```
GET /api/tracking?limit=50&offset=0
```

---

## 5. Endpoints (API)

> Os schemas de request/response abaixo refletem os DTOs atuais do código.
> Para detalhes completos, ver Swagger (dev).

### 5.1 Health

| Método | Path | Auth | Response |
|--------|------|------|----------|
| GET | `/api/health` | Public | `{ status, timestamp, version }` |
| GET | `/api/health/ready` | Public | `{ status: "ready" }` |

### 5.2 Auth

| Método | Path | Auth | Request | Response |
|--------|------|------|---------|----------|
| POST | `/api/auth/signup` | Public | `SignupDto` (email, password, name) | AuthResponse |
| POST | `/api/auth/login` | Public | `LoginDto` (email, password) | AuthResponse |
| POST | `/api/auth/logout` | Bearer | — | `{ success: true }` |
| POST | `/api/auth/refresh` | Public | `{ refreshToken }` | AuthResponse |
| POST | `/api/auth/forgot-password` | Public | `ForgotPasswordDto` (email) | `{ success: true }` |
| POST | `/api/auth/reset-password` | Bearer | `ResetPasswordDto` (newPassword) | `{ success: true }` |
| GET | `/api/auth/me` | Bearer | — | `User` |
| POST | `/api/auth/resend-confirmation` | Public | `{ email }` | `{ success: true }` |

### 5.3 Onboarding

| Método | Path | Auth | Request | Response |
|--------|------|------|---------|----------|
| GET | `/api/onboarding/status` | Bearer | — | `OnboardingStatus` |
| PATCH | `/api/onboarding/step/:step` | Bearer | `UpdateOnboardingStepDto` | `OnboardingStatus` |
| POST | `/api/onboarding/complete` | Bearer | — | `OnboardingStatus` |
| GET | `/api/onboarding/check` | Bearer | — | `OnboardingStatus` |

### 5.4 Chat (REST + SSE)

| Método | Path | Auth | Request | Response |
|--------|------|------|---------|----------|
| GET | `/api/chat/conversations` | Bearer | `ListConversationsQuery` (limit, offset) | `{ conversations, total }` |
| POST | `/api/chat/conversations` | Bearer | `CreateConversationDto` (type, title?) | `ConversationResponseDto` |
| GET | `/api/chat/conversations/:id` | Bearer | — | `ConversationResponseDto` |
| DELETE | `/api/chat/conversations/:id` | Bearer | — | `{ success: true }` |
| GET | `/api/chat/conversations/:id/messages` | Bearer | `ListMessagesQuery` (limit, offset) | `{ messages, total }` |
| POST | `/api/chat/conversations/:id/messages` | Bearer | `SendMessageDto` (content) | `SendMessageResponseDto` (inclui `streamUrl`) |
| GET | `/api/chat/conversations/:id/pending-confirmation` | Bearer | — | `PendingConfirmationResponseDto` |
| POST | `/api/chat/conversations/:id/reject/:confirmationId` | Bearer | — | `{ success: true }` |

**SSE:**
| Método | Path | Auth | Response |
|--------|------|------|----------|
| GET (SSE) | `/api/chat/conversations/:id/stream?token=...` | Query token | Stream de eventos (ver `docs/specs/core/realtime.md`) |
| GET (SSE) | `/api/chat/conversations/:id/confirm/:confirmationId?token=...` | Query token | Stream de eventos |

### 5.5 Tracking

| Método | Path | Auth | Request | Response |
|--------|------|------|---------|----------|
| POST | `/api/tracking` | Bearer | `CreateTrackingEntryDto` | `TrackingEntryResponseDto` |
| GET | `/api/tracking` | Bearer | `GetTrackingEntriesQueryDto` | `{ entries, total }` |
| GET | `/api/tracking/aggregations` | Bearer | `GetAggregationsQueryDto` | `{ data }` |
| GET | `/api/tracking/stats` | Bearer | `GetTrackingEntriesQueryDto` | `{ data }` |
| GET | `/api/tracking/:id` | Bearer | — | `TrackingEntryResponseDto` |
| PATCH | `/api/tracking/:id` | Bearer | `UpdateTrackingEntryDto` | `TrackingEntryResponseDto` |
| DELETE | `/api/tracking/:id` | Bearer | — | `{ success: true }` |

### 5.6 Memory

| Método | Path | Auth | Request | Response |
|--------|------|------|---------|----------|
| GET | `/api/memory` | Bearer | — | `MemoryOverviewResponseDto` |
| GET | `/api/memory/items` | Bearer | `ListKnowledgeItemsQueryDto` | `KnowledgeItemListResponseDto` |
| POST | `/api/memory/items` | Bearer | `CreateKnowledgeItemDto` | `KnowledgeItemResponseDto` |
| GET | `/api/memory/items/:id` | Bearer | — | `KnowledgeItemResponseDto` |
| PATCH | `/api/memory/items/:id` | Bearer | `UpdateKnowledgeItemDto` | `KnowledgeItemResponseDto` |
| DELETE | `/api/memory/items/:id` | Bearer | — | `{ success: true }` |
| POST | `/api/memory/items/:id/validate` | Bearer | — | `ValidateKnowledgeItemResponseDto` |
| GET | `/api/memory/export` | Bearer | `ListKnowledgeItemsQueryDto` | `ExportMemoryResponseDto` |

### 5.7 Finance

**Summary**
| Método | Path | Auth | Request | Response |
|--------|------|------|---------|----------|
| GET | `/api/finance/summary` | Bearer | `FinanceSummaryQueryDto` | `FinanceSummaryResponseDto` |

**Bills**
| Método | Path | Auth | Request | Response |
|--------|------|------|---------|----------|
| POST | `/api/finance/bills` | Bearer | `CreateBillDto` | `BillResponseDto` |
| GET | `/api/finance/bills` | Bearer | `BillQueryDto` | `{ items, total }` |
| GET | `/api/finance/bills/:id` | Bearer | — | `BillResponseDto` |
| PATCH | `/api/finance/bills/:id` | Bearer | `UpdateBillDto` | `BillResponseDto` |
| DELETE | `/api/finance/bills/:id` | Bearer | — | `{ success: true }` |
| PATCH | `/api/finance/bills/:id/mark-paid` | Bearer | — | `BillResponseDto` |
| PATCH | `/api/finance/bills/:id/mark-unpaid` | Bearer | — | `BillResponseDto` |

**Expenses**
| Método | Path | Auth | Request | Response |
|--------|------|------|---------|----------|
| POST | `/api/finance/expenses` | Bearer | `CreateVariableExpenseDto` | `VariableExpenseResponseDto` |
| GET | `/api/finance/expenses` | Bearer | `VariableExpenseQueryDto` | `{ items, total }` |
| GET | `/api/finance/expenses/:id` | Bearer | — | `VariableExpenseResponseDto` |
| PATCH | `/api/finance/expenses/:id` | Bearer | `UpdateVariableExpenseDto` | `VariableExpenseResponseDto` |
| DELETE | `/api/finance/expenses/:id` | Bearer | — | `{ success: true }` |

**Incomes**
| Método | Path | Auth | Request | Response |
|--------|------|------|---------|----------|
| POST | `/api/finance/incomes` | Bearer | `CreateIncomeDto` | `IncomeResponseDto` |
| GET | `/api/finance/incomes` | Bearer | `IncomeQueryDto` | `{ items, total }` |
| GET | `/api/finance/incomes/:id` | Bearer | — | `IncomeResponseDto` |
| PATCH | `/api/finance/incomes/:id` | Bearer | `UpdateIncomeDto` | `IncomeResponseDto` |
| DELETE | `/api/finance/incomes/:id` | Bearer | — | `{ success: true }` |

**Debts**
| Método | Path | Auth | Request | Response |
|--------|------|------|---------|----------|
| POST | `/api/finance/debts` | Bearer | `CreateDebtDto` | `DebtResponseDto` |
| GET | `/api/finance/debts` | Bearer | `DebtQueryDto` | `{ items, total }` |
| GET | `/api/finance/debts/:id` | Bearer | — | `DebtResponseDto` |
| PATCH | `/api/finance/debts/:id` | Bearer | `UpdateDebtDto` | `DebtResponseDto` |
| DELETE | `/api/finance/debts/:id` | Bearer | — | `{ success: true }` |
| PATCH | `/api/finance/debts/:id/pay-installment` | Bearer | `PayInstallmentDto` | `DebtResponseDto` |
| PATCH | `/api/finance/debts/:id/negotiate` | Bearer | `NegotiateDebtDto` | `DebtResponseDto` |

**Investments**
| Método | Path | Auth | Request | Response |
|--------|------|------|---------|----------|
| POST | `/api/finance/investments` | Bearer | `CreateInvestmentDto` | `InvestmentResponseDto` |
| GET | `/api/finance/investments` | Bearer | `InvestmentQueryDto` | `{ items, total }` |
| GET | `/api/finance/investments/:id` | Bearer | — | `InvestmentResponseDto` |
| PATCH | `/api/finance/investments/:id` | Bearer | `UpdateInvestmentDto` | `InvestmentResponseDto` |
| DELETE | `/api/finance/investments/:id` | Bearer | — | `{ success: true }` |
| PATCH | `/api/finance/investments/:id/update-value` | Bearer | `UpdateInvestmentValueDto` | `InvestmentResponseDto` |

### 5.8 Admin Jobs (Interno)

| Método | Path | Auth | Request | Response |
|--------|------|------|---------|----------|
| POST | `/api/admin/jobs/memory-consolidation/trigger` | Bearer | `{ userId?, wait? }` | `{ success: true }` |

---

## 6. BFF (Next.js App Router)

> **Estado atual:** não há rotas em `apps/web/src/app/api/*`.  
> As rotas `/callback` e `/callback-recovery` são **páginas** de auth (não BFF).

---

## 7. Schemas (DTOs)

> As definições completas estão nos DTOs do backend e no Swagger (dev).

- **Auth:** `apps/api/src/modules/auth/presentation/dtos/*.ts`
- **Onboarding:** `apps/api/src/modules/onboarding/presentation/dtos/*.ts`
- **Chat:** `apps/api/src/modules/chat/presentation/dtos/*.ts`
- **Tracking:** `apps/api/src/modules/tracking/presentation/dtos/*.ts`
- **Memory:** `apps/api/src/modules/memory/presentation/dtos/*.ts`
- **Finance:** `apps/api/src/modules/finance/presentation/dtos/*.ts`

---

*Última atualização: 26 Janeiro 2026*
