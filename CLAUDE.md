# CLAUDE.md

This file provides guidance to Claude Code when working with this repository.

## Project Overview

Life Assistant AI is a SaaS platform with integrated AI that serves as a personal assistant, second brain, counselor, and life tracker. See `MILESTONES.md` for current progress.

**Stack:** Next.js + NestJS + PostgreSQL (Supabase) + Drizzle + BullMQ + Redis

**Architecture:** Modular Monolith + Clean Architecture (presentation/application/domain/infrastructure)
```
life-assistant/
├── apps/web/     # Next.js frontend
├── apps/api/     # NestJS backend
├── packages/     # Shared libraries
├── docs/adr/     # Architecture Decision Records
└── infra/        # Docker, deployment
```

## Commands
```bash
pnpm dev              # Start dev servers
pnpm build            # Production build
pnpm typecheck        # TypeScript check
pnpm lint             # ESLint
pnpm test             # Unit tests
pnpm test:e2e         # E2E tests (run if UI changes)
```

## Documentation Precedence

| # | Document | Purpose |
|---|----------|---------|
| 1 | `PRODUCT_SPECS.md` | Features, personas |
| 2 | `SYSTEM_SPECS.md` | Business rules, flows |
| 3 | `ENGINEERING.md` | Tech stack, architecture |
| 4 | `DATA_MODEL.md` | Database schema |
| 5 | `AI_SPECS.md` | LLM behavior, prompts |
| 6 | `INTEGRATIONS_SPECS.md` | External APIs |
| - | `MILESTONES.md` | Tasks, progress |
| - | `TBD_TRACKER.md` | Pending decisions |

**In case of conflict, follow precedence order.**

## ⚠️ IMPLEMENTATION PROTOCOL (MANDATORY)

Follow these steps IN ORDER. Do NOT skip steps. Do NOT start coding before completing steps 1-3.

### Step 1: Validate Milestone Completeness

Before anything else:
1. Read the task in `MILESTONES.md`
2. Check: do the tasks cover 100% of what needs to be implemented?
   - Include all features, edge cases, error handling
   - Include all tests: unit, integration, E2E (if UI)
3. If gaps exist:
```
   🔍 Milestone gaps found:
   - Missing: [what's not covered]
   - Proposed tasks: [list of tasks to add]
   → Awaiting authorization to update MILESTONES.md
```
   **STOP and wait for authorization. Do NOT proceed until approved.**

### Step 2: Validate Documentation

After Step 1 is complete:
1. Read relevant project docs (PRODUCT_SPECS, SYSTEM_SPECS, ENGINEERING, etc.)
2. Query Context7 for ALL libraries/frameworks involved in this task
3. Compare: does project documentation match Context7 best practices?
4. If divergence found:
```
   ⚠️ Documentation drift detected:
   - File: [which project doc]
   - Project says: [current approach]
   - Context7 says: [recommended approach]
   - Recommendation: [what to update]
   → Awaiting authorization to update documentation
```
   **STOP and wait for authorization. Do NOT proceed until approved.**

### Step 3: Plan Implementation

After Steps 1-2 are complete:
1. Create implementation plan
2. For each dependency: run `pnpm info <package> version` to get latest version
3. Use versions from step 2 in your plan

**Only after completing Steps 1-3 can you start writing code.**

### Step 4: Implement

- Follow patterns from `ENGINEERING.md`
- Cite source when stating rules: "Per `SYSTEM_SPECS.md` §3.2..."
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

1. Update `MILESTONES.md` (see "Updating MILESTONES.md" section below)
2. Request confirmation before marking task complete

## Authorization Required

**ALWAYS ask before:**
- Creating new files
- Updating any documentation
- Adding tasks to milestones
- Marking tasks as completed

## Updating MILESTONES.md

After implementation:
1. Mark tasks: `- [ ]` → `- [x]`
2. Update milestone title emoji: 🟡 → 🟢
3. Add "Notas" section with date and key implementation details
4. Add row to "Histórico de Progresso" table (date, milestone, action, notes)
5. Update "Última atualização" at bottom of file

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

Query Context7: before implementation plan, during code generation, when errors occur, when unsure about APIs.
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

## Coding Style

- TypeScript strict mode + Zod validation (no `any` without justification)
- Domain names from `DATA_MODEL.md`
- Business rules in `application/` layer only
- Portuguese in user-facing content, English in code

## Quick References

| Topic | Reference |
|-------|-----------|
| Architecture | `ENGINEERING.md` §4 |
| Testing | `ENGINEERING.md` §11 |
| Security | `SYSTEM_SPECS.md` §6, `ENGINEERING.md` §6 |
| Commits & PRs | `ENGINEERING.md` §15 |
| Business Rules | `SYSTEM_SPECS.md` §3 |
| Multi-tenancy | `ENGINEERING.md` §6, `DATA_MODEL.md` §6 |
| LLM Abstraction | `ENGINEERING.md` §8 |
| Jobs | `ENGINEERING.md` §7 |