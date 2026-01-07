# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Life Assistant AI is a SaaS platform with integrated AI that serves as a personal assistant, second brain, counselor, and life tracker. The project is currently in **specification phase** - no code has been implemented yet.

## Documentation Structure

| Document | Purpose | Precedence |
|----------|---------|------------|
| `PRODUCT_SPECS.md` | What the app does, features, personas | 1st (scope/features) |
| `SYSTEM_SPECS.md` | Business rules, flows, Definition of Done | 2nd (rules/flows) |
| `ENGINEERING.md` | Tech stack, architecture, patterns | 3rd (tech/infra) |
| `DATA_MODEL.md` | Database schema, tables, relationships | 4th (data) |
| `AI_SPECS.md` | LLM behavior, prompts, RAG configuration | 5th (AI) |
| `INTEGRATIONS_SPECS.md` | External APIs (Telegram, Stripe, Calendar) | 6th (integrations) |
| `MILESTONES.md` | Development roadmap, tasks, progress tracking | Reference |
| `TBD_TRACKER.md` | Pending decisions requiring human input | Reference |

**In case of conflict between documents, follow the precedence order above.**

## AI Usage Requirements

- Always open `PRODUCT_SPECS.md`, `SYSTEM_SPECS.md`, and the most relevant spec for the task before working
- Always use Context7 when code generation, setup/configuration steps, or library/API documentation are needed; if coverage is missing, say so and ask the user
- When unsure or missing information, ask the user before proceeding
- Cite the source doc when stating rules or constraints (e.g., "Per `SYSTEM_SPECS.md` §3.2...")
- Request user authorization before updating documentation, specifications, or creating new files
- Do not assume tools, paths, or stacks beyond what is defined in `ENGINEERING.md`
- Do not introduce new dependencies or major tech without an ADR in `docs/adr/` (per `ENGINEERING.md` §14)
- Always update `TBD_TRACKER.md` and the owning spec when a TBD is resolved (after user authorization)
- Always update `MILESTONES.md` after finishing a task; add progress notes even for partial work
- Only mark milestones as completed when all tests pass; ask user for confirmation before marking done

### Dependency & Setup Management

**Always use the latest package versions:**
- Before adding any dependency, check the current version with `pnpm info <package> version`
- Use the exact current version in installation commands
- Never assume or hardcode outdated versions

```bash
# ✅ Correct: check version first
pnpm info drizzle-orm version  # returns "0.35.3"
pnpm add drizzle-orm@0.35.3

# ❌ Wrong: assume version
pnpm add drizzle-orm@0.29.0  # outdated version
```

**Always use latest LTS versions for infrastructure:**
- **Node.js**: Use latest LTS version (check https://nodejs.org)
- **pnpm**: Use latest stable version (check https://pnpm.io)
- **Docker Compose**: Use v5+ (no longer requires `version` field in yaml)

When setting up CI pipelines, Dockerfiles, or local development:
```yaml
# ✅ Correct: use latest LTS
node-version: 24  # Check nodejs.org for current LTS
version: 10       # Check pnpm.io for current version

# ❌ Wrong: use outdated versions
node-version: 18  # Old LTS, no longer maintained
version: 8        # Outdated pnpm
```

**Always prefer CLI scaffolding commands over manual setup:**
When an official CLI command exists to generate initial setup/configuration, use it instead of writing files manually.

| Situation | ❌ Don't do | ✅ Do |
|-----------|------------|-------|
| Create Next.js project | Write `next.config.js` manually | `pnpm create next-app@latest` |
| Create NestJS project | Write structure manually | `npx @nestjs/cli new api` |
| Setup shadcn/ui | Write `components.json` manually | `pnpm dlx shadcn-ui@latest init` |
| Setup Playwright | Write `playwright.config.ts` manually | `pnpm create playwright` |
| Setup ESLint | Write `.eslintrc.js` manually | `pnpm eslint --init` |
| Setup Tailwind | Write `tailwind.config.js` manually | `pnpm dlx tailwindcss init` |

**Why:** Scaffolding commands generate configurations with current best practices and compatibility with the installed version.

### Milestone Management

When working on milestones:

1. **Before starting**: Read the milestone tasks and understand the scope
2. **During development**: Add notes to the milestone tracking progress, blockers, or discoveries (even if not a specific task)
3. **After completing a task**:
   - Run all relevant tests (`pnpm test`, `pnpm typecheck`, `pnpm lint`)
   - Only consider marking complete if all tests pass
   - Ask user: "All tests passed. Can I mark milestone X task Y as completed?"
   - Wait for user confirmation before updating `MILESTONES.md`
4. **If tests fail**: Do not mark as complete; fix issues first or document blockers in milestone notes

### Handling New Implementation Decisions

When analyzing a feature or task, new decisions may be needed that are not already tracked as TBDs. Follow this process:

1. **Identify gaps**: During analysis, identify decisions needed for implementation (e.g., which provider to use, API design choices, UI behavior details)
2. **Discuss with user**: Present options with recommendations and trade-offs; ask for user approval
3. **Document decisions** (after user approval):
   - Create ADR in `docs/adr/` if decision is significant (per `ENGINEERING.md` §14)
   - Update relevant specs (`DATA_MODEL.md`, `SYSTEM_SPECS.md`, etc.) with implementation details
   - Add to `TBD_TRACKER.md` history of resolutions (even if not previously tracked as TBD)
4. **Reference the ADR**: In specs, reference the ADR (e.g., "ver ADR-005")

## Commands

No code has been implemented yet. When implementation begins, expect these commands (per `ENGINEERING.md`):

```bash
# Install dependencies
pnpm install

# Development (run from repo root, not apps/*)
pnpm dev                     # Run all apps concurrently
pnpm --filter web dev        # Run only frontend
pnpm --filter api dev        # Run only backend

# Quality checks
pnpm lint                    # ESLint across all packages
pnpm typecheck               # TypeScript strict mode
pnpm test                    # Vitest unit/integration tests
pnpm test:e2e                # Playwright E2E tests

# Database operations
pnpm --filter database db:generate   # Generate Drizzle client
pnpm --filter database db:migrate    # Run migrations
pnpm --filter database db:push       # Push schema changes
pnpm --filter database db:studio     # Open Drizzle Studio

# Build
pnpm build                   # Build all packages

# Single test file
pnpm --filter api test src/modules/tracking/__tests__/record-weight.test.ts
```

## Project Structure

```
life-assistant/
├── apps/
│   ├── web/                 # Next.js frontend
│   │   ├── src/
│   │   │   ├── app/         # App Router pages
│   │   │   ├── components/  # React components
│   │   │   └── hooks/       # Custom hooks
│   │   └── e2e/             # Playwright E2E tests
│   └── api/                 # NestJS backend
│       ├── src/
│       │   └── modules/     # Feature modules (Clean Architecture)
│       │       └── {module}/
│       │           ├── presentation/    # Controllers, DTOs
│       │           ├── application/     # Use cases
│       │           ├── domain/          # Entities, interfaces
│       │           └── infrastructure/  # Repositories, adapters
│       └── test/
│           ├── unit/        # Unit tests
│           ├── integration/ # Integration tests
│           └── e2e/         # API E2E tests
├── packages/
│   ├── database/            # Drizzle ORM + schemas
│   ├── ai/                  # LLM abstraction layer
│   ├── shared/              # Shared utilities, types
│   └── config/              # Environment config with Zod
├── docs/
│   └── adr/                 # Architecture Decision Records
├── infra/                   # Docker, scripts
└── [spec files]             # PRODUCT_SPECS.md, etc.
```

## Architecture Summary

- **Pattern**: Modular Monolith + Clean Architecture
- **Monorepo**: Turborepo with `apps/` (web, api) and `packages/` (shared, database, ai, config)
- **Frontend**: Next.js + React Query + Tailwind + shadcn/ui
- **Backend**: NestJS with modules following presentation/application/domain/infrastructure layers
- **Database**: PostgreSQL (Supabase) + Drizzle ORM + pgvector
- **Jobs**: BullMQ with Redis (Upstash)
- **LLM**: Abstracted via `LLMPort` interface - Gemini initial, Claude migration planned

## Key Patterns

### Multi-tenancy
- Every sensitive table has `user_id` column
- RLS (Row Level Security) enabled on all tables
- All queries must use `SET LOCAL app.user_id`

### LLM Abstraction
Switching LLM providers requires only ENV changes:
```bash
LLM_PROVIDER=gemini  # or 'claude'
```

### Jobs
- Must be idempotent (deterministic `jobId`)
- Errors categorized as retryable (rate limit, 5xx) or non-retryable (validation)

### Life Areas
The system tracks 8 life areas: `health`, `financial`, `career`, `relationships`, `spirituality`, `personal_growth`, `mental_health`, `leisure`

## TBD Tracker Usage

When encountering ambiguity, business decisions, or conflicts between specs:
1. Add item to `TBD_TRACKER.md` using the template
2. Include context, options, and AI recommendation
3. Wait for human decision before implementing

Do NOT add TBDs for technical decisions you can make yourself.

## Important Business Rules

- **Tracking via chat**: AI must always confirm before recording metrics
- **Christian perspective**: Opt-in feature, never impose
- **Wikilinks**: Case and accent insensitive search
- **Decisions**: Minimum 2 options required
- **Morning summary**: 20-minute window around configured time
- **LGPD**: Soft delete → hard delete after 30 days

## Coding Style & Naming Conventions

- **TypeScript strict mode** with Zod validation; avoid `any` without justification
- **Domain naming from specs**: Use canonical names from `DATA_MODEL.md` (e.g., `user_id`, `tracking_type`, `life_area`)
- **Enums**: Use TypeScript enums matching spec definitions (e.g., `TrackingType`, `LifeArea`, `DecisionStatus`)
- **Business rules in domain layer**: Keep validation and rules in `application/use-cases`, never in controllers or UI
- **Portuguese in user-facing**: UI text, error messages, and AI responses in Portuguese (pt-BR)
- **English in code**: Variable names, comments, and documentation in English

```typescript
// ✅ Good
const trackingEntry = await recordWeightUseCase.execute(userId, { value: 82.5 });

// ❌ Bad
const te = await rw(uid, { v: 82.5 });
```

## Testing Guidelines

- **Frameworks**: Vitest (unit/integration), Supertest (API), Playwright (E2E)
- **Test location**: Module-local in `__tests__/` directories or `*.test.ts` files
- **Naming convention**: `should_[expected]_when_[condition]`
- **Coverage**: Minimum 80% on use cases (per `ENGINEERING.md` §11.2)

### E2E Requirement

Every new UI feature (page, flow, form) **must** include a Playwright E2E test:
- Cover happy path and main error cases
- Use Page Object Model for pages with multiple tests
- Use `data-testid` attributes for selectors, never CSS classes
- Place tests in `apps/web/e2e/specs/`

See `ENGINEERING.md` §11.4 for full Playwright configuration and examples.

## Commit & Pull Request Guidelines

### Commit Messages

Use concise, descriptive messages with type prefix:

```
feat: add weight tracking via chat
fix: correct IMC calculation for edge cases
docs: update SYSTEM_SPECS with decision review rules
refactor: extract embedding service to shared package
test: add E2E tests for login flow
chore: update dependencies
```

### Pull Request Requirements

- Describe the change and its purpose
- Cite updated spec files (e.g., "Updates `SYSTEM_SPECS.md` §3.4")
- Note any resolved TBD items
- Include screenshots for UI changes
- Ensure all checks pass (`pnpm lint`, `pnpm typecheck`, `pnpm test`)
- Follow DoD checklist in `ENGINEERING.md` §15.1

## Security

Follow `SYSTEM_SPECS.md` §6 and `ENGINEERING.md` security guidelines:

### Inviolable Rules

- ❌ Never log secrets (API keys, tokens, passwords)
- ❌ Never expose stack traces to users
- ❌ Never allow queries without `user_id` filter on sensitive tables
- ❌ Never store Vault contents in embeddings/RAG
- ✅ Always validate input on backend (Zod schemas)
- ✅ Always use prepared statements (Drizzle handles this)
- ✅ Always sanitize output

### Multi-tenant Isolation

- Every sensitive table has `user_id` column with RLS
- Use `SET LOCAL app.user_id` before queries
- Vault requires re-authentication with 5-minute timeout

### Encryption

| Data | Method |
|------|--------|
| Passwords | bcrypt |
| Vault items | AES-256-GCM + Argon2id KDF |
| Traffic | TLS 1.3 |
| Backups | Encrypted at rest |

### Audit Logging

Log these actions: login, logout, password change, vault access, data export, deletions, config changes.
