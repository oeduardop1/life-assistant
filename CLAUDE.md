# CLAUDE.md

This file provides guidance to Claude Code when working with this repository.

## Project Overview

Life Assistant AI is a SaaS platform with integrated AI that serves as a memory, counselor, personal assistant, and life tracker. See `docs/milestones/` for current progress.

**Stack:** Next.js + NestJS + PostgreSQL (Supabase) + Drizzle + BullMQ + Redis

**Architecture:** Modular Monolith + Clean Architecture (presentation/application/domain/infrastructure)
```
life-assistant/
├── apps/web/           # Next.js 16 frontend (React 19, Tailwind v4, shadcn/ui)
├── apps/api/           # NestJS 11 backend (Clean Architecture, BullMQ)
├── packages/ai/        # LLM abstraction layer (Claude + Gemini adapters, tool definitions)
├── packages/config/    # Zod-validated environment config (loadConfig, validateEnv)
├── packages/database/  # Drizzle ORM schemas, migrations, RLS policies
├── packages/shared/    # Shared enums, constants, date/currency utils
├── docs/               # Documentation
│   ├── adr/            # Architecture Decision Records (ADR-006 to ADR-019)
│   ├── specs/          # Domain-driven specs (core/, domains/, integrations/)
│   └── milestones/     # Tasks and progress
└── infra/docker/       # Docker Compose (Redis, MinIO); PostgreSQL runs via Supabase CLI containers (not in this file)
```

## Infrastructure

| Service | Purpose | Environment |
|---------|---------|-------------|
| **Vercel** | Frontend hosting (apps/web) | Production |
| **Railway** | Backend hosting (apps/api) | Production |
| **Supabase** | Database + Auth | Production |
| **Sentry** | Error tracking | All environments |

## Commands
```bash
pnpm dev              # Start all dev servers (web + api)
pnpm build            # Production build
pnpm typecheck        # TypeScript check
pnpm lint             # ESLint
pnpm test             # Unit tests
pnpm test:e2e         # E2E tests (Playwright)
pnpm format           # Prettier format all files
pnpm format:check     # Check formatting without writing
pnpm infra:up         # Start Docker (Redis, MinIO) + Supabase + migrations + seed
pnpm infra:down       # Stop all local infrastructure
pnpm clean            # Remove dist/ and node_modules/
```

Package-specific: `pnpm --filter @life-assistant/<pkg> <script>` (e.g. `pnpm --filter @life-assistant/database db:migrate`)

## Getting Started
```bash
pnpm install                   # Install all dependencies
cp .env.example .env           # Create env file (fill in API keys)
pnpm infra:up                  # Start Redis, MinIO, Supabase, run migrations + seed
pnpm dev                       # Start web (localhost:3000) + api (localhost:4000)
```

First run downloads Docker images (~5 min). Subsequent starts take ~30s.
Useful flags: `--seed` (force re-seed), `--clean` (reset containers). Teardown: `pnpm infra:down` or `pnpm infra:down --reset` (delete all data).

**Requires:** Node >=24, pnpm >=10, Docker, Supabase CLI.

## Environment

Copy `.env.example` to `.env` and fill in required values.

| Category | Variables | Notes |
|----------|-----------|-------|
| App | `PORT`, `FRONTEND_URL` | Default: 4000, http://localhost:3000 |
| Database | `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_KEY`, `SUPABASE_JWT_SECRET` | Auto-filled by `supabase start` |
| Redis | `REDIS_URL` | Default: redis://localhost:6379 |
| AI/LLM | `LLM_PROVIDER`, `GEMINI_API_KEY`, `LLM_MODEL` | Default provider: gemini |
| Storage | `R2_*` or MinIO vars | Local: MinIO on port 9000 |
| Observability | `SENTRY_DSN`, `AXIOM_*` | Optional in dev |

Frontend vars (`NEXT_PUBLIC_*`) go in `apps/web/.env.local` — Next.js does not load the root `.env`.

## Documentation Reference

**Precedence:** Core (1) → Domains (2) → Integrations (3). In case of conflict, higher precedence wins.

| Category | Topic | Document |
|----------|-------|----------|
| **Core** | Architecture, Stack, Testing | `docs/specs/core/architecture.md` |
| | Frontend Architecture, Design System | `docs/specs/core/frontend-architecture.md` |
| | Auth, RLS, LGPD | `docs/specs/core/auth-security.md` |
| | Database, Naming, Migrations | `docs/specs/core/data-conventions.md` |
| | API Contract (REST + SSE) | `docs/specs/core/api-contract.md` |
| | Error Handling, HTTP Codes | `docs/specs/core/errors.md` |
| | UX States (Loading, Empty, Error) | `docs/specs/core/ux-states.md` |
| | Realtime Protocol (SSE + Socket.io) | `docs/specs/core/realtime.md` |
| | Observability (Sentry, Axiom) | `docs/specs/core/observability.md` |
| | Data Import (CSV/JSON) | `docs/specs/core/data-import.md` |
| | AI Persona, Prompts, LLM | `docs/specs/core/ai-personality.md` |
| | User Journeys | `docs/specs/core/user-journeys.md` |
| **Domains** | Dashboard, Life Balance Score | `docs/specs/domains/dashboard.md` |
| | Finance | `docs/specs/domains/finance.md` |
| | Tracking (ADR-015/017) | `docs/specs/domains/tracking.md` |
| | Memory (ADR-012) | `docs/specs/domains/memory.md` |
| | Goals | `docs/specs/domains/goals.md` |
| | Chat | `docs/specs/domains/chat.md` |
| | Notifications | `docs/specs/domains/notifications.md` |
| | Settings | `docs/specs/domains/settings.md` |
| | Vault | `docs/specs/domains/vault.md` |
| | Notes | `docs/specs/domains/notes.md` |
| | Health | `docs/specs/domains/health.md` |
| | Wellbeing | `docs/specs/domains/wellbeing.md` |
| | Professional | `docs/specs/domains/professional.md` |
| | Learning | `docs/specs/domains/learning.md` |
| | Spiritual | `docs/specs/domains/spiritual.md` |
| | Family | `docs/specs/domains/family.md` |
| | Reports | `docs/specs/domains/reports.md` |
| | Assistant & Agenda | `docs/specs/domains/assistant-agenda.md` |
| | SaaS & Multi-tenancy | `docs/specs/domains/saas.md` |
| **Integrations** | Supabase Auth | `docs/specs/integrations/supabase-auth.md` |
| | Gemini LLM | `docs/specs/integrations/gemini.md` |
| | Telegram Bot | `docs/specs/integrations/telegram.md` |
| | Google Calendar | `docs/specs/integrations/google-calendar.md` |
| | Cloudflare R2 | `docs/specs/integrations/cloudflare-r2.md` |
| | Stripe Billing | `docs/specs/integrations/stripe.md` |
| | Resend Email | `docs/specs/integrations/resend.md` |
| | Web Push | `docs/specs/integrations/web-push.md` |
| | WhatsApp | `docs/specs/integrations/whatsapp.md` |
| | Apple Calendar | `docs/specs/integrations/apple-calendar.md` |
| **Other** | Tasks & Progress | `docs/milestones/` |
| | Pending Decisions | `TBD_TRACKER.md` |
| | Navigation & Glossary | `docs/specs/README.md` |
| | Developer Setup & Commands | `DEVELOPMENT.md` |
| | Investor Pitch & Architecture | `README.md` |

> ⚠️ **NEVER update `docs/specs/legacy/`** — read-only historical reference.

## ⚠️ MANDATORY PROTOCOL (PLANNING & IMPLEMENTATION)

**WHEN TO USE:** Only for milestone-related work. Triggers include:
- "implement M0.X..."
- "create a plan for milestone..."
- "work on milestone..."
- Any reference to tasks in docs/milestones/

**SKIP THIS PROTOCOL FOR:** Documentation, questions, refactoring, code review, or any task not tied to a milestone.

**Authorization required** before: creating files, updating docs, adding/completing milestone tasks.

Follow these steps IN ORDER for milestone work — including planning.
Do NOT skip steps. Do NOT start planning or coding before completing steps 1-3.

### Step 1: Validate Milestone Completeness

Before creating a plan or writing any code:
1. Read the task in the appropriate phase file (`docs/milestones/phase-*.md`)
2. Check: do the tasks cover 100% of what needs to be implemented?
   - Include all features, edge cases, error handling
   - Include all tests: unit, integration, E2E (if UI)
3. If gaps exist:
```
   🔍 Milestone gaps found:
   - Missing: [what's not covered]
   - Proposed tasks: [list of tasks to add]
   → Awaiting authorization to update the milestone file
```
   **STOP and wait for authorization. Do NOT proceed until approved.**

### Step 2: Validate Documentation

After Step 1 is complete:
1. Read relevant project docs (`docs/specs/core/`, `docs/specs/domains/[module].md`)
2. Query Context7 for ALL libraries/frameworks involved in this task
3. Compare: does project documentation match Context7 best practices?
4. If divergence found:
```
   ⚠️ Documentation drift detected:
   - File: [which project doc in core/, domains/, or integrations/]
   - Project says: [current approach]
   - Context7 says: [recommended approach]
   - Recommendation: [what to update]
   → Awaiting authorization to update documentation
```
   **STOP and wait for authorization. Do NOT proceed until approved.**

### Step 3: Create/Refine Plan

After Steps 1-2 are complete:
1. Create or refine implementation plan
2. For each dependency: run `pnpm info <package> version` to get latest version
3. Include versions in the plan
4. Present plan for user approval

**Only after user approves the plan can you start writing code.**

### Step 4: Implement

- Follow patterns from `docs/specs/core/architecture.md`
- Cite source when stating rules: "Per `docs/specs/domains/finance.md` §3..."
- Prefer CLI scaffolding over manual file creation

### Step 5: Test & Fix

1. Run `pnpm typecheck && pnpm lint && pnpm test`
2. Run `pnpm test:e2e` if UI changes
3. **If any test fails:**
   - Query Context7 for the failing library/framework
   - Fix based on Context7 documentation
   - Run tests again
   - Repeat until all tests pass

### Step 6: Complete

1. Update milestone files (see "Updating Milestones" section below)
2. Request confirmation before marking task complete

## Updating Milestones

After implementation, update TWO files:

### 1. Phase File (`docs/milestones/phase-*.md`)

Identify the correct phase file based on milestone number:
- M0.x → `phase-0-foundation.md`
- M1.x → `phase-1-counselor.md`
- M2.x → `phase-2-tracker.md`
- M3.x → `phase-3-assistant.md`

Then:
1. Mark tasks: `- [ ]` → `- [x]`
2. Update milestone title emoji: 🟡 → 🟢
3. Add "Notas" section with date and key implementation details

### 2. Changelog (`docs/milestones/changelog.md`)

1. Add row to table (or create new month section):
   ```
   | YYYY-MM-DD | M#.# | Ação | Notas breves |
   ```
2. Update "Última atualização: DD Mês YYYY" at bottom of file

**Task markers:**
- `- [ ]` Pending
- `- [x]` Completed
- `- [~]` In progress
- `- [!]` Blocked

**Milestone emojis:**
- 🔴 Not started
- 🟡 In progress
- 🟢 Completed
- 🔵 Blocked

## TBD Tracker

When encountering ambiguity, business decisions, or conflicts:
1. Add to `TBD_TRACKER.md` with context, options, recommendation
2. Wait for human decision

Do NOT add TBDs for technical decisions you can make yourself.

## Database Development

### Single Source of Truth: Drizzle ORM

**CRITICAL: All schema changes go through Drizzle ORM only.**

- **Schema files**: `packages/database/src/schema/*.ts`
- **Migrations**: `packages/database/src/migrations/*.sql`
- **RLS policies**: `packages/database/scripts/apply-rls.ts`

**NEVER create SQL files in `supabase/migrations/`** - that folder must remain empty.
Supabase CLI is used only for running the local database, not for migrations.

### Schema Changes Workflow

ALWAYS follow these steps for ANY schema change (new table, modify existing, add column, etc.):

1. **Create or modify** schema file in `packages/database/src/schema/`
   - New table? Create `my-table.ts` and export from `index.ts`
   - Existing table? Edit the relevant `.ts` file
2. **Export types** from `packages/database/src/index.ts` (if API needs them)
3. **Generate migration**: `pnpm --filter database db:generate`
4. **Review** the generated SQL in `packages/database/src/migrations/`
5. **Apply**: `pnpm --filter database db:migrate`

### Commands

| Command | Purpose | Safe? |
|---------|---------|-------|
| `db:generate` | Generate migration from schema diff | ✅ Yes |
| `db:migrate` | Apply pending migrations | ✅ Yes |
| `db:studio` | Visual database explorer | ✅ Yes |
| `db:seed` | Run seed scripts | ✅ Yes |
| `db:apply-rls` | Apply RLS policies | ✅ Yes |
| `db:push` | Push schema directly | ⚠️ Interactive only |

### Key Rules

1. **NEVER use `db:push` in scripts or CI** - can TRUNCATE/DROP and cause data loss
2. **Always use `db:migrate`** - only applies pending SQL, never destructive
3. **Migrations are idempotent** - safe to re-run on existing databases
4. If `db:generate` asks about renames vs. creates, answer based on actual intent

### Schema File Organization

```
packages/database/src/schema/
├── index.ts              # Re-exports all schemas
├── enums.ts              # PostgreSQL enums (CREATE TYPE)
├── users.ts              # Core user table
├── [domain].ts           # One file per domain entity
└── [domain]-payments.ts  # Related sub-tables
```

### Decimal/Money Fields

PostgreSQL `DECIMAL` columns are returned as **strings** by Drizzle. Always use `parseFloat()` when doing arithmetic:
```typescript
// WRONG: string concatenation
const total = acc + row.amount; // "0" + "100" = "0100"

// CORRECT: parse first
const total = acc + parseFloat(row.amount); // 0 + 100 = 100
```

## Coding Style

- TypeScript strict mode + Zod validation (no `any` without justification)
- Domain names from `docs/specs/core/data-conventions.md`
- Business rules in `application/` layer only
- Portuguese in user-facing content, English in code

