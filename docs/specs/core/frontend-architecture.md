# Frontend Architecture & Design System

> Arquitetura do frontend (Next.js App Router) e padrões de UI.
> Fontes: `apps/web/src/app/*`, `apps/web/src/lib/*`, `apps/web/src/stores/*`, `apps/web/src/app/globals.css`.
> Referência Next.js (Context7).

---

## 1. Stack & Runtime

- **Next.js App Router** (RSC por padrão)
- **React 19**
- **TanStack Query** para server state
- **Zustand** para UI state persistente
- **Tailwind CSS v4 (CSS‑first)** + **shadcn/ui**
- **React Hook Form + Zod** para formulários
- **Supabase Auth** no client e server (`@supabase/ssr`)

---

## 2. Estrutura de Rotas (App Router)

### 2.1 Route Groups

```
apps/web/src/app/
├── (auth)/          # Rotas públicas
├── (app)/           # Rotas autenticadas
├── layout.tsx       # Root layout + providers
├── error.tsx        # Error boundary
└── not-found.tsx    # 404
```

### 2.2 Rotas Existentes

**Auth**
```
/login
/signup
/forgot-password
/reset-password
/verify-email
/onboarding
/onboarding/profile
/onboarding/telegram
/onboarding/tutorial
/callback
/callback-recovery
```

> **Nota (2026-01-26):** `/onboarding/areas` removido - áreas são fixas (6 para todos).

**App**
```
/dashboard
/chat
/memory
/tracking
/finance
/finance/incomes
/finance/bills
/finance/expenses
/finance/debts
/finance/investments
/settings
```

> **Observação:** não há rotas API (BFF) em `app/api/*` hoje.

### 2.3 Mapa de Telas & IA/UX (atual)

| Tela | IA/UX |
|------|-------|
| `/chat` | Streaming SSE, confirmações de tools, estado `thinking` (ver `core/realtime.md` e `core/ux-states.md`) |
| `/memory` | CRUD manual de knowledge items (modais add/edit) |
| `/tracking` | Registro manual por modal; captura conversacional ocorre via chat |
| `/finance/*` | CRUD financeiro por formulários; sem IA inline no UI atual |
| `/dashboard` | Widgets e visualizações (ver `domains/dashboard.md`) |
| `/onboarding/*` | Wizard com 3 etapas: perfil, telegram, tutorial (ver `lib/validations/onboarding.ts`) |

---

## 3. Server vs Client Components

### 3.1 Regra geral

- **Server Components** por padrão.
- Use **Client Components** apenas quando necessário (state, effects, browser APIs).

### 3.2 Data Fetching

No App Router, o fetch é feito diretamente em Server Components:

```tsx
export default async function Page() {
  const res = await fetch('https://...', { cache: 'no-store' });
  const data = await res.json();
  return <View data={data} />;
}
```

**Cache padrão:** `force-cache` (quando omitido).  
**Dynamic:** `cache: 'no-store'`.  
**Revalidate:** `next: { revalidate: N }`.

---

## 4. Estado e Cache

### 4.1 TanStack Query (server state)

Config atual (`apps/web/src/lib/query-client.ts`):

```ts
{
  staleTime: 60_000,
  gcTime: 300_000,
  retry: 1,
  refetchOnWindowFocus: false
}
```

### 4.2 Zustand (UI state)

Uso restrito a UI state persistente (`apps/web/src/stores/ui-store.ts`):
- `sidebarOpen`
- `modals` (mapa por id)
- Persistência com `zustand/middleware` (storage `life-assistant-ui`)

---

## 5. Auth (Supabase)

### 5.1 Client

`apps/web/src/lib/supabase/client.ts` usa `createBrowserClient`.

### 5.2 Server

`apps/web/src/lib/supabase/server.ts` usa `createServerClient`.

### 5.3 Callbacks

- `/callback` e `/callback-recovery` resolvem PKCE e reset de senha.

---

## 6. Design System (tokens)

### 6.1 Tokens em `globals.css`

Tokens CSS são definidos via Tailwind v4 CSS‑first:

```css
:root {
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
  --primary: oklch(0.205 0 0);
  --radius: 0.625rem;
  /* ... */
}
```

### 6.2 Tipografia

- **Geist Sans** e **Geist Mono** via `next/font/google`
- Vars CSS: `--font-geist-sans`, `--font-geist-mono`

### 6.3 Ícones

- **Lucide React** como padrão.

---

## 7. Formulários e Validação

- **React Hook Form** + **Zod**
- Mensagens e estados de erro seguem `docs/specs/core/ux-states.md`.

### 7.1 Formulários implementados (validação atual)

- **Onboarding / Perfil** — `apps/web/src/components/onboarding/profile-form.tsx`  
  Zod: `profileStepSchema` (`apps/web/src/lib/validations/onboarding.ts`)  
  Regras: `name` min 2/max 100; `timezone` formato IANA.
- **Onboarding / Áreas** — `[REMOVIDO]` Áreas são fixas (6 para todos). Etapa removida do wizard.
- **Memory / Add Item** — `apps/web/src/app/(app)/memory/components/add-item-modal.tsx`  
  Regras inline: `type` obrigatório; `content` obrigatório.
- **Memory / Edit Item** — `apps/web/src/app/(app)/memory/components/edit-item-modal.tsx`  
  Regras inline: `content` obrigatório.
- **Tracking / Manual** — `apps/web/src/app/(app)/tracking/components/manual-track-form.tsx`  
  Regras: `value` obrigatório; validação por `validationRules` (min/max/step) em `apps/web/src/app/(app)/tracking/types.ts`.
- **Finance / Bills** — `apps/web/src/app/(app)/finance/components/bill/bill-form.tsx`  
  Regras: `name` obrigatório; `amount` > 0; `dueDay` 1–31.
- **Finance / Expenses** — `apps/web/src/app/(app)/finance/components/expense/expense-form.tsx`  
  Regras: `name` obrigatório; `expectedAmount` ≥ 0; `actualAmount` ≥ 0.
- **Finance / Incomes** — `apps/web/src/app/(app)/finance/components/income/income-form.tsx`  
  Regras: `name` obrigatório; `expectedAmount` > 0; `actualAmount` ≥ 0.
- **Finance / Debts** — `apps/web/src/app/(app)/finance/components/debt/debt-form.tsx`  
  Regras: `name` obrigatório; `totalAmount` > 0; se negociada, `totalInstallments` ≥ 1, `installmentAmount` > 0, `dueDay` 1–31.
- **Finance / Investments** — `apps/web/src/app/(app)/finance/components/investment/investment-form.tsx`  
  Regras: `name` obrigatório; `currentAmount` ≥ 0; `goalAmount` ≥ 0; `monthlyContribution` ≥ 0.

---

## 8. Observações de UX

- Streaming no chat usa **Streamdown** (markdown incremental).
- `ErrorState` e `ThinkingIndicator` seguem `docs/specs/core/ux-states.md`.

---

*Última atualização: 26 Janeiro 2026*
