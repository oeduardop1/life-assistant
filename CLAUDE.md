# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Life Assistant AI is a SaaS platform with integrated AI that serves as a personal assistant, second brain, counselor, and life tracker. The project is in **active development** - see `MILESTONES.md` for current progress.

## Documentation Reference

| Document | Purpose | Precedence |
|----------|---------|------------|
| `PRODUCT_SPECS.md` | Features, personas | 1st |
| `SYSTEM_SPECS.md` | Business rules, flows | 2nd |
| `ENGINEERING.md` | Tech stack, architecture | 3rd |
| `DATA_MODEL.md` | Database schema | 4th |
| `AI_SPECS.md` | LLM behavior, prompts | 5th |
| `INTEGRATIONS_SPECS.md` | External APIs | 6th |
| `MILESTONES.md` | Tasks, progress | Reference |
| `TBD_TRACKER.md` | Pending decisions | Reference |

**In case of conflict, follow precedence order. Always read relevant specs before implementing.**

## AI Workflow

### Before Implementation

1. **Read MILESTONES.md** - understand task scope
2. **Validate completeness**:
   - Do tasks cover 100% of feature scope? (check future milestones if gaps found)
   - Do test tasks cover unit, integration, E2E (if UI)?
   - If gaps → request authorization to add tasks (explain why)
3. **Read relevant specs** - PRODUCT_SPECS, SYSTEM_SPECS, ENGINEERING, etc.
4. **Query Context7** for all libraries/frameworks involved
5. **Compare best practices** - if project docs diverge from Context7:
   ```
   ⚠️ Documentation drift detected:
   - **File:** [spec file]
   - **Issue:** [what diverges]
   - **Recommendation:** [what to update]
   ```
   → Request authorization before updating

### During Implementation

- Follow patterns from `ENGINEERING.md`
- Check dependency versions: `pnpm info <pkg> version` before installing
- Prefer CLI scaffolding over manual setup
- Cite source when stating rules: "Per `SYSTEM_SPECS.md` §3.2..."

### After Implementation

1. **Run quality checks**:
   - `pnpm typecheck && pnpm lint && pnpm test`
   - `pnpm test:e2e` (if UI changes)
2. **Document decisions** - if any decision not in project docs:
   ```
   📝 Undocumented implementation:
   - **What:** [description]
   - **Suggested doc:** [ADR, ENGINEERING.md, etc.]
   ```
   → Request authorization before updating
3. **Update MILESTONES.md** with progress notes
4. **Request confirmation** before marking task complete (only if all checks pass)

### Authorization Rule

**Always request user authorization before:**
- Creating new files
- Updating any documentation or specs
- Adding tasks to milestones
- Marking tasks as completed

## Quick References

| Topic | Reference |
|-------|-----------|
| Commands | `README.md` |
| Architecture & Patterns | `ENGINEERING.md` §4 |
| Testing | `ENGINEERING.md` §11 |
| Security | `SYSTEM_SPECS.md` §6, `ENGINEERING.md` §6 |
| Commits & PRs | `ENGINEERING.md` §15 |
| Business Rules | `SYSTEM_SPECS.md` §3 |
| Multi-tenancy | `ENGINEERING.md` §6, `DATA_MODEL.md` §6 |
| LLM Abstraction | `ENGINEERING.md` §8 |
| Jobs | `ENGINEERING.md` §7 |

## Coding Style

- TypeScript strict + Zod (no `any` without justification)
- Domain names from `DATA_MODEL.md`
- Business rules in `application/` layer
- Portuguese in user-facing, English in code

## Context7 Usage

Query Context7 in these scenarios:
- Before creating implementation plan
- During code generation
- When a test fails or error occurs
- When unsure about an API

**If Context7 has no coverage:**
> "Context7 does not have documentation for [library]. Should I proceed with general knowledge?"

**Workflow:**
1. `resolve-library-id` → get library ID
2. `query-docs` → fetch documentation
3. Compare with project docs
4. If divergence → notify user before proceeding

## TBD Tracker

When encountering ambiguity, business decisions, or conflicts:
1. Add to `TBD_TRACKER.md` with context, options, recommendation
2. Wait for human decision before implementing

Do NOT add TBDs for technical decisions you can make yourself.

## Project Context

**Structure:**
```
life-assistant/
├── apps/web/     # Next.js frontend
├── apps/api/     # NestJS backend
├── packages/     # Shared libraries
├── docs/adr/     # Architecture Decision Records
└── infra/        # Docker, deployment
```

**Stack:** Next.js + NestJS + PostgreSQL (Supabase) + Drizzle + BullMQ + Redis

**Architecture:** Modular Monolith + Clean Architecture (presentation/application/domain/infrastructure)
