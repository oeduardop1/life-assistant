# CLAUDE.md

This file provides guidance to Claude Code when working with this repository.

## Project Overview

Life Assistant AI is a SaaS platform with integrated AI that serves as a memory, counselor, personal assistant, and life tracker. See `docs/milestones/` for current progress.

**Stack:** Next.js + NestJS + PostgreSQL (Supabase) + Drizzle + BullMQ + Redis

**Architecture:** Modular Monolith + Clean Architecture (presentation/application/domain/infrastructure)
```
life-assistant/
├── apps/web/        # Next.js frontend
├── apps/api/        # NestJS backend
├── packages/        # Shared libraries
├── docs/            # Documentation
│   ├── adr/         # Architecture Decision Records
│   ├── specs/       # Domain-driven specs (core/, domains/, integrations/)
│   └── milestones/  # Tasks and progress
└── infra/           # Docker, deployment
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
pnpm dev              # Start dev servers
pnpm build            # Production build
pnpm typecheck        # TypeScript check
pnpm lint             # ESLint
pnpm test             # Unit tests
pnpm test:e2e         # E2E tests
```

## Documentation Reference

**Precedence:** Core (1) → Domains (2) → Integrations (3). In case of conflict, higher precedence wins.

| Category | Topic | Document |
|----------|-------|----------|
| **Core** | Architecture, Stack, Testing | `docs/specs/core/architecture.md` |
| | Auth, RLS, LGPD | `docs/specs/core/auth-security.md` |
| | Database, Naming, Migrations | `docs/specs/core/data-conventions.md` |
| | AI Persona, Prompts, LLM | `docs/specs/core/ai-personality.md` |
| | User Journeys | `docs/specs/core/user-journeys.md` |
| **Domains** | Finance (M2.2) | `docs/specs/domains/finance.md` |
| | Memory (ADR-012) | `docs/specs/domains/memory.md` |
| | Tracking (ADR-015/017) | `docs/specs/domains/tracking.md` |
| | People, Vault | `docs/specs/domains/*.md` |
| | Goals, Habits, Notifications, Chat | `docs/specs/domains/*.md` |
| **Integrations** | Telegram, Google Calendar, Stripe | `docs/specs/integrations/*.md` |
| | Supabase Auth, Gemini, Cloudflare R2 | `docs/specs/integrations/*.md` |
| **Other** | Tasks & Progress | `docs/milestones/` |
| | Pending Decisions | `TBD_TRACKER.md` |
| | Navigation & Glossary | `docs/specs/README.md` |

> ⚠️ **NEVER update `docs/specs/legacy/`** — read-only historical reference.

## ⚠️ MANDATORY PROTOCOL (PLANNING & IMPLEMENTATION)

**WHEN TO USE:** Only for milestone-related work. Triggers include:
- "implement M0.X..."
- "create a plan for milestone..."
- "work on milestone..."
- Any reference to tasks in docs/milestones/

**SKIP THIS PROTOCOL FOR:** Documentation, questions, refactoring, code review, or any task not tied to a milestone.

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

> **IMPORTANTE:** Atualizações de documentação devem ser feitas APENAS em:
> - `docs/specs/core/` — Para arquitetura, auth, convenções, AI
> - `docs/specs/domains/` — Para regras de negócio por módulo
> - `docs/specs/integrations/` — Para APIs externas
>
> **NUNCA atualize arquivos em `docs/specs/legacy/`** — esses são apenas referência histórica.

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

## Authorization Required

**ALWAYS ask before:**
- Creating new files
- Updating any documentation
- Adding tasks to milestones
- Marking tasks as completed

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

## Context7 Usage

Query Context7: before creating plans, during code generation, when errors occur, when unsure about APIs.
```
1. resolve-library-id → get ID
2. query-docs → fetch documentation
3. Compare with project docs
4. If divergence → STOP and notify
```

If no coverage: ask "Context7 has no docs for [library]. Proceed with general knowledge?"

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

