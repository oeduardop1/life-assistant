# Fase 0: Fundação (v0.x)

> **Objetivo:** Estabelecer toda a infraestrutura técnica necessária antes de qualquer feature de negócio.
> **Referências:** `docs/specs/engineering.md` §1-§10

---

## M0.1 — Setup do Monorepo 🟢

**Objetivo:** Criar estrutura base do monorepo com Turborepo e pnpm workspaces.

**Tasks:**

- [x] Inicializar repositório Git
- [x] Configurar pnpm workspaces (`pnpm-workspace.yaml`)
- [x] Configurar Turborepo (`turbo.json` com tasks: build, dev, lint, typecheck, test, clean)
- [x] Criar estrutura de diretórios conforme `docs/specs/engineering.md` §3.1:
  ```
  apps/web/
  apps/api/
  packages/shared/
  packages/database/
  packages/ai/
  packages/config/
  docs/adr/
  infra/docker/
  ```
- [x] Configurar TypeScript base (`tsconfig.json`) com strict mode
- [x] Configurar ESLint compartilhado (flat config ESLint 9+)
- [x] Configurar Prettier
- [x] Criar `.env.example` com todas as variáveis de `docs/specs/engineering.md` §16
- [x] Criar `docker-compose.yml` para desenvolvimento local (PostgreSQL + Redis + MinIO)
- [x] Documentar comandos no README.md
- [x] Testar que `pnpm install` e `pnpm build` funcionam

**Definition of Done:**
- [x] `pnpm install` executa sem erros
- [x] `pnpm build` compila todos os packages
- [x] `pnpm lint` passa
- [x] `pnpm typecheck` passa
- [x] Docker compose sobe os serviços locais

**Notas:**
- **07 Jan 2026:** Milestone concluído com sucesso
- Turborepo v2+ usa `tasks` em vez de `pipeline` - docs/specs/engineering.md atualizado
- Docker images atualizadas para versões mais recentes:
  - PostgreSQL 17 (pgvector não é mais necessário — ADR-012)
  - Redis 8 Alpine (`redis:8-alpine`)
  - MinIO via Quay.io (`quay.io/minio/minio:latest`) - minio/minio no Docker Hub descontinuado em Out/2025
- ESLint 9+ usa flat config (`eslint.config.js`)
- Packages incluem: shared, database, ai, config (todos com tsup para build)
- Apps são placeholders: web (Next.js M0.6), api (NestJS M0.5)

---

## M0.2 — Package: Shared 🟢

**Objetivo:** Criar package de tipos, constantes e utilitários compartilhados.

**Tasks:**

- [x] Configurar tsup para build do package
- [x] Criar tipos base conforme `docs/specs/data-model.md`:
  - [x] `LifeArea` enum (6 áreas principais + SubArea per ADR-017)
  - [x] `TrackingType` enum
  - [x] `DecisionStatus` enum
  - [x] `UserStatus` enum
  - [x] `ConversationType` enum
  - [x] `VaultItemType` enum
  - [x] `VaultCategory` enum
  - [x] `ExpenseCategory` enum
- [x] Criar constantes:
  - [x] `DEFAULT_WEIGHTS` (pesos das áreas)
  - [x] `TRACKING_VALIDATIONS` (limites de validação)
  - [x] `RATE_LIMITS` (por plano)
  - [x] `STORAGE_LIMITS` (por plano)
- [x] Criar utilitários:
  - [x] `formatCurrency(value, currency)`
  - [x] `formatDate(date, timezone)`
  - [x] `normalizeText(text)` (para wikilinks case/accent insensitive)
  - [x] `sleep(ms)`
  - [x] `retry(fn, options)`
- [x] Exportar tudo via `index.ts`

**Testes:**

- [x] Configurar Vitest com coverage 100%
- [x] Testes de enums (`enums.test.ts`):
  - [x] Verificar valores de UserStatus (5)
  - [x] Verificar valores de LifeArea (6)
  - [x] Verificar valores de TrackingType (11)
  - [x] Verificar valores de ConversationType (4)
  - [x] Verificar valores de DecisionStatus (7)
  - [x] Verificar valores de VaultItemType (5)
  - [x] Verificar valores de VaultCategory (6)
  - [x] Verificar valores de ExpenseCategory (13)
  - [x] Verificar arrays ALL_* para iteração
- [x] Testes de constantes (`constants.test.ts`):
  - [x] Verificar DEFAULT_WEIGHTS (6 áreas principais per ADR-017, valores 0.5-1.0)
  - [x] Verificar TRACKING_VALIDATIONS (weight, water, sleep, mood, energy)
  - [x] Verificar RATE_LIMITS (free, pro, premium)
  - [x] Verificar STORAGE_LIMITS (free, pro, premium)
  - [x] Verificar SYSTEM_DEFAULTS (timezone, locale, currency)
- [x] Testes de formatCurrency (`formatters.test.ts`):
  - [x] Formatar BRL padrão
  - [x] Formatar USD
  - [x] Valores negativos
  - [x] Zero
  - [x] Números grandes
- [x] Testes de formatDate (`formatters.test.ts`):
  - [x] Formato short (dd/MM/yyyy)
  - [x] Formato long (dd de MMMM de yyyy)
  - [x] Formato full (dia da semana completo)
  - [x] Input string ISO
  - [x] Timezone diferente
  - [x] Locale en-US
- [x] Testes de normalizeText (`normalize.test.ts`):
  - [x] Converter para lowercase
  - [x] Remover acentos
  - [x] Trim whitespace
  - [x] Preservar hífens
  - [x] Strings vazias e especiais
- [x] Testes de sleep (`async.test.ts`):
  - [x] Delay correto
  - [x] Delay zero
- [x] Testes de retry (`async.test.ts`):
  - [x] Sucesso na primeira tentativa
  - [x] Sucesso após falhas
  - [x] Throw após maxAttempts
  - [x] Exponential backoff
  - [x] Respeitar maxDelayMs
  - [x] Filtro shouldRetry

**Definition of Done:**
- [x] Package compila: `pnpm --filter shared build`
- [x] Exports funcionam em outros packages
- [x] Testes passam com 100% coverage

**Notas:**
- **06 Jan 2026:** Milestone concluído com sucesso
- 8 enums criados: UserStatus, LifeArea, TrackingType, ConversationType, DecisionStatus, VaultItemType, VaultCategory, ExpenseCategory
- Constantes: DEFAULT_WEIGHTS, TRACKING_VALIDATIONS, RATE_LIMITS, STORAGE_LIMITS, SYSTEM_DEFAULTS, DATA_RETENTION_DAYS
- Utilitários: formatCurrency, formatDate (com date-fns-tz), normalizeText, sleep, retry
- 77 testes com 100% coverage (statements, branches, functions, lines)
- Dependências: date-fns@4.1.0, date-fns-tz@3.2.0, vitest@4.0.16, @vitest/coverage-v8@4.0.16

---

## M0.3 — Package: Config 🟢

**Objetivo:** Criar package de configuração com validação via Zod.

**Tasks:**

- [x] Configurar tsup para build
- [x] Adicionar dependências: zod@4.3.5, vitest@4.0.16, @vitest/coverage-v8@4.0.16
- [x] Criar schema Zod para variáveis de ambiente:
  - [x] App config (NODE_ENV, PORT, FRONTEND_URL, APP_VERSION)
  - [x] Database config (DATABASE_URL, SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_KEY, SUPABASE_JWT_SECRET)
  - [x] Redis config (REDIS_URL)
  - [x] AI config (LLM_PROVIDER, GEMINI_API_KEY, GEMINI_MODEL, ANTHROPIC_API_KEY, CLAUDE_MODEL)
  - [x] Storage config (R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_ENDPOINT)
  - [x] Integrations config (TELEGRAM_BOT_TOKEN, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, RESEND_API_KEY)
  - [x] Observability config (SENTRY_DSN, AXIOM_TOKEN, AXIOM_DATASET, LOG_LEVEL)
- [x] Criar função `loadConfig()` que valida e retorna config tipado
- [x] Criar função `getConfig()` com cache
- [x] Criar função `validateEnv()` para CI
- [x] Criar função `isEnvValid()` para validação sem exit
- [x] Exportar tudo via `index.ts`

**Testes:**

- [x] Configurar Vitest com coverage 100%
- [x] Testes de appSchema (`schemas.test.ts`):
  - [x] Validar NODE_ENV aceita development, staging, production, test
  - [x] Rejeitar NODE_ENV inválido
  - [x] Coercer PORT de string para number
  - [x] Rejeitar PORT fora do range (1-65535)
  - [x] Usar defaults quando variáveis não definidas
- [x] Testes de databaseSchema (`schemas.test.ts`):
  - [x] Requerer DATABASE_URL
  - [x] Validar prefixo postgresql://
  - [x] Requerer SUPABASE_JWT_SECRET com min 32 chars
  - [x] Requerer todas as variáveis SUPABASE_*
- [x] Testes de redisSchema (`schemas.test.ts`):
  - [x] Aceitar redis:// e rediss://
  - [x] Rejeitar URLs inválidas
- [x] Testes de aiSchema (`schemas.test.ts`):
  - [x] Requerer GEMINI_API_KEY quando LLM_PROVIDER=gemini
  - [x] Requerer ANTHROPIC_API_KEY quando LLM_PROVIDER=claude
  - [x] Não requerer ANTHROPIC_API_KEY quando LLM_PROVIDER=gemini
  - [x] Não requerer GEMINI_API_KEY quando LLM_PROVIDER=claude
  - [x] Usar modelo default de cada provider
- [x] Testes de storageSchema (`schemas.test.ts`):
  - [x] Requerer R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY
  - [x] R2_ENDPOINT opcional
  - [x] Usar R2_BUCKET_NAME default
- [x] Testes de integrationsSchema (`schemas.test.ts`):
  - [x] Todas as variáveis opcionais
  - [x] Aceitar valores vazios
- [x] Testes de observabilitySchema (`schemas.test.ts`):
  - [x] SENTRY_DSN e AXIOM_TOKEN opcionais
  - [x] Usar LOG_LEVEL default 'info'
  - [x] Validar LOG_LEVEL enum (debug, info, warn, error)
- [x] Testes de loadConfig (`loader.test.ts`):
  - [x] Retornar config válido com env correto
  - [x] Throw com mensagem clara para env inválido
  - [x] Cachear config após primeira chamada
  - [x] Mensagem de erro listar todos os campos inválidos
  - [x] Mensagem de erro NÃO expor valores secretos
- [x] Testes de getConfig (`loader.test.ts`):
  - [x] Retornar config cacheado se existir
  - [x] Carregar config se cache vazio
- [x] Testes de clearConfigCache (`loader.test.ts`):
  - [x] Limpar cache corretamente
  - [x] Próxima chamada recarregar config
- [x] Testes de isEnvValid (`validator.test.ts`):
  - [x] Retornar true para env válido
  - [x] Retornar false para env inválido
- [x] Testes de validateEnv (`validator.test.ts`):
  - [x] Chamar process.exit(1) para env inválido
  - [x] Logar mensagem de sucesso para env válido

**Definition of Done:**
- [x] Validação falha com mensagem clara para variáveis faltantes
- [x] TypeScript infere tipos corretamente do config
- [x] Package compila: `pnpm --filter config build`
- [x] Lint passa: `pnpm --filter config lint`
- [x] Typecheck passa: `pnpm --filter config typecheck`
- [x] Testes passam com 100% coverage (67 testes)

---

## M0.4 — Package: Database 🟢

**Objetivo:** Configurar Drizzle ORM com schema completo e migrations.

**Tasks:**

- [x] Instalar dependências (drizzle-orm, drizzle-kit, pg, dotenv)
- [x] Configurar `drizzle.config.ts`
- [x] Criar schemas conforme `docs/specs/data-model.md`:
  - [x] **Core:** users
  - [x] **Chat:** conversations, messages
  - [x] **Tracking:** tracking_entries, life_balance_history
  - [x] **Decisions:** decisions, decision_options, decision_criteria, decision_scores
  - [x] **Notes:** notes, note_links
  - [x] **People:** people, person_notes, person_interactions
  - [x] **Vault:** vault_items
  - [x] **Goals:** goals, goal_milestones, habits, habit_completions, habit_freezes
  - [x] **Integrations:** user_integrations, calendar_events, budgets, subscriptions
  - [x] **System:** audit_logs, notifications, reminders, export_requests
  - [x] **Embeddings:** embeddings (com pgvector) — **DEPRECADO: ADR-012 remove esta tabela**
- [x] Criar índices conforme `docs/specs/data-model.md` §10
- [x] Configurar RLS policies conforme `docs/specs/engineering.md` §6
- [x] Criar migration inicial
- [x] Criar seed para dados de teste
- [x] Criar scripts npm: db:generate, db:migrate, db:push, db:studio

**Testes:**
- [x] Testes de integração para RLS policies:
  - [x] Verificar que usuário só acessa próprios dados
  - [x] Verificar que query sem `app.user_id` falha
  - [x] Testar isolamento entre usuários diferentes
- [x] Testes para seed data
- [x] Testes para migrations (up/down)

**Definition of Done:**
- [x] `pnpm --filter database db:push` aplica schema sem erros
- [x] `pnpm --filter database db:studio` abre Drizzle Studio (requer DATABASE_URL)
- [x] RLS policies funcionam (testar com SET LOCAL app.user_id)
- [x] Seed popula dados de teste
- [x] Testes de RLS passam

**Notas:**
- **07 Jan 2026:** Milestone concluído com sucesso
- Dependências: drizzle-orm@0.38.4, drizzle-kit@0.30.4, pg@8.16.1, dotenv@17.2.3
- 33 tabelas implementadas (24 do spec original + 9 adicionais de Finance M2.2 e Memory ADR-012)
- 30 enums PostgreSQL definidos (21 originais + 9 de Finance/Memory)
- Tabelas extras: incomes, bills, variable_expenses, debts, debt_payments, investments, user_memories, knowledge_items, memory_consolidations
- RLS policies com otimização de performance: `(SELECT auth.user_id())` em vez de `auth.user_id()` - evita execução por-linha (conforme Supabase docs)
- Pool error handler adicionado conforme node-postgres best practices
- dotenv import adicionado ao drizzle.config.ts para CLI commands
- 199 testes unitários + 31 testes de integração passando
- Lint, typecheck e build passam
- **16 Jan 2026:** Gap identificado: 14 tabelas têm RLS apenas em `rls-policies.sql` (script manual), não nas migrations Supabase. Após M0.7, o padrão foi atualizado para RLS inline nas migrations. Ver **Backlog Técnico > Segurança e RLS** para tasks de correção.

---

## M0.5 — App: API (NestJS Base) 🟢

**Objetivo:** Criar aplicação NestJS com estrutura de módulos e configurações base.

**Tasks:**

- [x] Inicializar NestJS com CLI
- [x] Configurar estrutura de módulos conforme `docs/specs/engineering.md` §4:
  ```
  src/
    modules/
    common/
      guards/
      interceptors/
      filters/
      decorators/
      middleware/
      errors/
      types/
    config/
    database/
    logger/
    health/
    jobs/
  ```
- [x] Criar classes de erro:
  - [x] DomainError (erros de domínio)
  - [x] ApplicationError (erros de aplicação com code e statusCode)
- [x] Configurar módulos core:
  - [x] ConfigModule (usando @life-assistant/config)
  - [x] DatabaseModule (usando @life-assistant/database)
  - [x] LoggerModule (JSON estruturado)
- [x] Criar middleware:
  - [x] RequestIdMiddleware (gerar request_id único via crypto.randomUUID)
- [x] Criar decorators:
  - [x] @CurrentUser() (extrair user do request)
  - [x] @Public() (marcar rota como pública)
- [x] Criar guards:
  - [x] AuthGuard (JWT validation via Supabase usando jose)
  - [x] RateLimitGuard (usando @nestjs/throttler)
- [x] Criar interceptors:
  - [x] LoggingInterceptor (request_id, user_id, timing)
  - [x] TransformInterceptor (response wrapper)
- [x] Criar filters:
  - [x] AllExceptionsFilter (error handling padronizado, sem stack traces em prod)
- [x] Configurar health check endpoints (`/api/health`, `/api/health/ready`)
- [x] Configurar Swagger/OpenAPI em `/api/docs`
- [x] Configurar bootstrap (main.ts):
  - [x] CORS para FRONTEND_URL
  - [x] ValidationPipe global
  - [x] Global prefix `/api`
  - [x] Graceful shutdown (onModuleDestroy)
- [x] Criar Dockerfile conforme `docs/specs/engineering.md` §9.3
- [x] Configurar Vitest + Supertest
- [x] Escrever testes unitários (100% coverage):
  - [x] AuthGuard tests (7 tests)
  - [x] LoggingInterceptor tests (6 tests)
  - [x] TransformInterceptor tests (6 tests)
  - [x] AllExceptionsFilter tests (17 tests)
  - [x] Decorator tests - @CurrentUser (5 tests), @Public (4 tests)
  - [x] RequestIdMiddleware tests (5 tests)
  - [x] ConfigService tests (35 tests)
  - [x] DatabaseService tests (11 tests)
  - [x] LoggerService tests (24 tests)
  - [x] HealthController tests (7 tests)
  - [x] Error classes tests (10 tests)
- [x] Escrever testes de integração:
  - [x] Health endpoints - GET /api/health, /api/health/ready (5 tests)
  - [x] Auth flow - protected vs public routes (8 tests)

**Testes:** 150 testes passando (137 unitários + 13 integração)

**Definition of Done:**
- [x] `pnpm --filter api dev` inicia servidor na porta 4000
- [x] GET /api/health retorna 200
- [x] GET /api/health/ready verifica DB connection
- [x] Swagger disponível em /api/docs
- [x] AuthGuard rejeita requests sem token válido
- [x] Logs em formato JSON estruturado com request_id e user_id
- [x] CORS permite FRONTEND_URL
- [x] ValidationPipe rejeita payloads inválidos
- [x] Docker build funciona
- [x] Testes unitários passam (100% coverage em guards/interceptors/filters)
- [x] Testes de integração passam

**Notas:**
- **07 Jan 2026:** Milestone concluído com sucesso
- Dependências: @nestjs/core@11.1.11, @nestjs/terminus@11.0.0, @nestjs/throttler@6.4.0, @nestjs/swagger@11.2.0, jose@6.0.11
- Usa jose para validação de JWT Supabase (mais leve que jsonwebtoken)
- LoggerService com JSON estruturado (nível configurável via LOG_LEVEL)
- Rate limiting com 3 níveis: short (10/s), medium (100/min), long (1000/h)
- Error handling diferencia DomainError, ApplicationError e erros gerais
- Response wrapper inclui success, data/error, e meta (timestamp, requestId)
- Testes de integração usam inline controllers para evitar problemas de mocking com pnpm workspaces

---

## M0.6 — App: Web (Next.js Base) 🟢

**Status:** CONCLUÍDO em 07 Jan 2026

**Objetivo:** Criar aplicação Next.js com estrutura base e componentes UI.

**Tasks:**

**1. Setup Inicial:**
- [x] Inicializar Next.js com `pnpm create next-app@latest apps/web`
  - TypeScript: ✅ / ESLint: ✅ / Tailwind CSS: ✅ / `src/` directory: ✅ / App Router: ✅ / Turbopack: ✅
- [x] Atualizar package.json com workspace dependencies (@life-assistant/shared, @life-assistant/config)
- [x] Configurar next.config.ts (transpilePackages, standalone output, security headers)
- [x] Criar .env.example com NEXT_PUBLIC_API_URL

**2. Estrutura de Diretórios:**
- [x] Configurar estrutura conforme `docs/specs/engineering.md` §3.1:
  ```
  src/app/(auth)/layout.tsx, (app)/layout.tsx, (app)/dashboard/page.tsx,
  layout.tsx, page.tsx, not-found.tsx, error.tsx
  components/ui/, layouts/, common/, theme/
  hooks/use-auth.ts, use-api.ts
  lib/query-client.ts, utils.ts
  stores/ui-store.ts
  app/globals.css
  e2e/specs/
  ```

**3. Dependências:**
- [x] @tanstack/react-query@5.90.16, @tanstack/react-query-devtools@5.90.16
- [x] zustand@5.0.9
- [x] react-hook-form@7.70.0, @hookform/resolvers@5.2.2
- [x] class-variance-authority, clsx, tailwind-merge
- [x] lucide-react@0.562.0, next-themes@0.4.6
- [x] tw-animate-css

**4. shadcn/ui Setup (Tailwind v4):**
- [x] Componentes criados manualmente (CLI teve problemas com workspace packages)
- [x] Instalados: button, input, card, dialog, sonner, avatar, separator, skeleton, scroll-area

**5. Configuração de Providers:**
- [x] Criar lib/query-client.ts com QueryClient config (staleTime: 60s, SSR pattern)
- [x] Criar components/layouts/root-layout-providers.tsx (QueryClientProvider, ThemeProvider, Toaster, ReactQueryDevtools)
- [x] Configurar RootLayout (app/layout.tsx) com providers

**6. Layouts:**
- [x] Criar AuthLayout em app/(auth)/layout.tsx (centered, sem sidebar, com ThemeToggle)
- [x] Criar AppLayout em app/(app)/layout.tsx (com Sidebar e Header)
- [x] Criar components/layouts/header.tsx (sidebar toggle, theme toggle)
- [x] Criar components/layouts/sidebar.tsx (navigation com useUIStore)

**7. Componentes Base:**
- [x] LoadingSpinner (Loader2 icon), EmptyState (icon, title, action), ErrorBoundary (class component), ThemeToggle (Moon/Sun)

**8. State Management:**
- [x] Criar stores/ui-store.ts (Zustand: sidebarOpen, modals, com persistência)

**9. Hooks & Utilities:**
- [x] hooks/use-auth.ts (placeholder para M0.7), hooks/use-api.ts (fetch wrapper), lib/utils.ts (cn())

**10. Páginas Placeholder:**
- [x] app/page.tsx (landing), app/(app)/dashboard/page.tsx, app/not-found.tsx, app/error.tsx

**11. Tema Light/Dark:**
- [x] Configurar Tailwind v4 com darkMode class, CSS variables em globals.css, ThemeProvider

**12. Docker:**
- [x] Dockerfile (multi-stage: Node 24 LTS Alpine, pnpm workspace, standalone, non-root user nextjs), .dockerignore

**13. Playwright E2E:**
- [x] Instalar: `pnpm create playwright` (TypeScript, e2e/ folder)
- [x] playwright.config.ts (chromium, firefox, webkit, mobile-chrome, webServer)
- [x] Smoke tests: should_load_homepage_successfully, should_toggle_theme_successfully, should_toggle_sidebar_successfully

**14. Documentação:**
- [x] Atualizar docs/specs/engineering.md §2.2 com decisões arquiteturais frontend (Tailwind v4, shadcn/ui, State Management, Route Groups)
- [x] Atualizar docs/specs/engineering.md §17 com Troubleshooting frontend
- [x] Atualizar README.md raiz com seção Web App

**Definition of Done:**
- [x] `pnpm --filter web dev` inicia na porta 3000
- [x] Componentes shadcn renderizam corretamente
- [x] Tema dark/light funciona e persiste
- [x] Sidebar toggle funciona e persiste
- [x] Docker build funciona
- [x] Playwright E2E: 12 testes passando (3 specs × 4 browsers)
- [x] TypeCheck: ✅ / Lint: ✅ / Build: ✅ (4.2s)

**Notas:**
- **07 Jan 2026:** Milestone concluído com sucesso
- Next.js 16.1.1 com Turbopack (5-10x faster dev server)
- Tailwind CSS v4.1.18 com CSS-first configuration (`@import "tailwindcss"`)
- shadcn/ui components configurados manualmente (new-york style) devido a problemas de resolução workspace
- TanStack Query 5.90.16 com padrão SSR (staleTime: 60s)
- Zustand 5.0.9 para UI state com persistência localStorage
- 3 smoke tests E2E via Playwright (homepage, theme toggle, sidebar toggle) - todos passando em 4 browsers
- Docker com Next.js standalone output, non-root user (nextjs), Node 24 LTS Alpine
- **Decisão arquitetural:** Type encapsulation pattern implementado (ver ADR-008)
- **Documentação:** Movida para docs/specs/engineering.md (§2.2, §17) - sem README separado conforme padrão do projeto

---

## M0.7 — Autenticação (Supabase Auth) 🟢

**Objetivo:** Implementar fluxo completo de autenticação.

**Referências:** `docs/specs/system.md` §3.1, `docs/specs/integrations.md` §5

**Tasks:**

**Infraestrutura:**
- [x] Inicializar Supabase CLI (`npx supabase init`)
- [x] Configurar `supabase/config.toml` para auth (email confirmations, password min 8)
- [x] Criar migration de triggers `auth.users → public.users`
- [x] Atualizar docker-compose (remover postgres, usar Supabase CLI)
- [x] Atualizar .env com DATABASE_URL porta 54322 e NEXT_PUBLIC_SUPABASE_*
- [x] Criar ADR-009 (Supabase CLI para desenvolvimento local)

**Backend (API):**
- [x] Criar módulo `auth`:
  - [x] `AuthController` com endpoints: signup, login, logout, refresh, forgot-password, reset-password, me, resend-confirmation
  - [x] `AuthService` orquestrando operações de auth
  - [x] `SupabaseAuthAdapter` (infrastructure layer) para comunicação com Supabase Auth API
  - [x] DTOs com class-validator (SignupDto, LoginDto, ForgotPasswordDto, ResetPasswordDto)
- [x] AuthGuard já existente validando JWT Supabase com jose (ADR-006)

**Frontend (Web):**
- [x] Criar `lib/supabase/` com clients:
  - [x] `client.ts` - createBrowserClient para client components
  - [x] `server.ts` - createServerClient para server components
- [x] Criar `middleware.ts` (CRÍTICO para refresh de sessão)
  - [x] Usa getUser() ao invés de getSession() para validação segura
  - [x] Proteção de rotas e redirecionamentos
- [x] Criar `AuthProvider` em `contexts/auth-context.tsx`
- [x] Atualizar `hooks/use-auth.ts` para usar AuthContext
- [x] Adicionar AuthProvider ao root-layout-providers.tsx
- [x] Criar páginas em `(auth)/`:
  - [x] `/login` - formulário de login (email/senha)
  - [x] `/signup` - formulário de cadastro
  - [x] `/forgot-password` - solicitar reset
  - [x] `/reset-password` - definir nova senha
  - [x] `/verify-email` - confirmação de email
  - [x] `/callback/route.ts` - handler para callbacks

**Testes:**
- [x] Testes de integração para todos os endpoints de auth (31 testes em `auth-endpoints.integration.spec.ts`)
- [x] Teste E2E: fluxo completo de signup → verify → login → logout (16 testes em `auth.spec.ts`)
- [x] Page Objects E2E criados (LoginPage, SignupPage, ForgotPasswordPage, ResetPasswordPage, DashboardPage)
- [x] Fixtures E2E (`auth.fixture.ts` com fixtures customizados)
- [x] Setup E2E (`global-setup.ts` para criação de usuário de teste)

**Infraestrutura adicional:**
- [x] Scripts de infraestrutura (`scripts/dev-start.sh`, `scripts/dev-stop.sh`)
- [x] Scripts npm: `pnpm infra:up`, `pnpm infra:down`

**Definition of Done:**
- [x] Signup com email/senha funciona
- [ ] ~~Signup com Google OAuth funciona~~ → **Movido para milestone futuro (requer configuração Google Cloud Console)**
- [x] Email de verificação é enviado (capturado no Inbucket em dev)
- [x] Login funciona após verificação
- [x] Logout invalida sessão
- [x] Recuperação de senha funciona
- [x] Rotas protegidas redirecionam para login
- [x] Testes passam (524 unit/integration, 36 E2E passam - 36 E2E requerem seed data)

**Notas:**
- **08 Jan 2026:** Milestone concluído com sucesso
- Supabase CLI usado para desenvolvimento local (ADR-009)
- PostgreSQL movido do docker-compose para Supabase CLI (porta 54322)
- @supabase/supabase-js@2.90.0, @supabase/ssr@0.8.0
- Middleware Next.js é OBRIGATÓRIO para refresh de sessão (per Context7)
- Google OAuth movido para milestone futuro para reduzir escopo inicial
- Emails de desenvolvimento capturados no Inbucket (http://localhost:54324)
- Scripts de infraestrutura: `pnpm infra:up` / `pnpm infra:down` (inicia Docker + Supabase CLI)
- 31 testes de integração para 8 endpoints de auth
- 16 testes E2E com Page Object Model (5 page objects)
- E2E parcialmente passa: 36 testes precisam de seed data (usuário de teste no banco)
- ⚠️ Technical debt: Next.js 16 "middleware" → "proxy" convention (adicionado ao M0.8)

---

## M0.8 — Onboarding Wizard 🟢

**Objetivo:** Implementar wizard de configuração inicial após signup.

**Referências:** `docs/specs/system.md` §3.1

**Tasks:**

**Backend:**
- [x] Criar endpoint `POST /api/onboarding/complete`
- [x] Criar endpoint `GET /api/onboarding/status`
- [x] Criar endpoint `PATCH /api/onboarding/step/:step` para salvar progresso por etapa
- [x] Salvar progresso parcial do onboarding
- [x] Atualizar `user.status` para 'active' ao completar
- [x] Criar DTOs de validação com class-validator:
  - [x] `ProfileStepDto` (name: min 2 chars, timezone: valid IANA timezone)
  - [x] `AreasStepDto` (areas: LifeArea[], min 3, max 8)
  - [x] `TelegramStepDto` (telegramId?: string, skipped: boolean)
- [x] Criar `OnboardingModule` com Clean Architecture (conforme `docs/specs/engineering.md` §4):
  - [x] `OnboardingController` em `presentation/controllers/`
  - [x] `OnboardingService` em `application/services/`
  - [x] DTOs em `presentation/dtos/` com barrel export
- [x] Registrar `OnboardingModule` no `AppModule`
- [x] Atualizar `preferences.areaWeights` ao salvar etapa de áreas (áreas não selecionadas = peso 0)
- [x] Criar job diário para limpar onboardings abandonados após 30 dias (cron via BullMQ)

**Technical Debt (do M0.7):**
- [x] Migrar `middleware.ts` para convenção `proxy.ts` do Next.js 16+ (renomear arquivo e função)
- [x] Criar seed data para testes E2E (usuário `test@example.com` para que 36 E2E tests passem)

**Frontend:**
- [x] Instalar componente Form do shadcn: `npx shadcn@latest add form`
- [x] Instalar timezone picker: `pnpm add react-timezone-select`
- [x] Criar páginas de onboarding em `(auth)/onboarding/`:
  - [x] `/onboarding` - layout com stepper de progresso
  - [x] `/onboarding/profile` - Etapa 1: Perfil (nome, timezone) - **obrigatório**
  - [x] `/onboarding/areas` - Etapa 2: Áreas de foco (selecionar min 3) - **obrigatório**
  - [x] `/onboarding/telegram` - Etapa 3: Conectar Telegram - **opcional, skip permitido**
  - [x] `/onboarding/tutorial` - Etapa 4: Tutorial interativo - **opcional, skip permitido**
- [x] Componentes:
  - [x] OnboardingStepper (indicador de progresso)
  - [x] ProfileForm (nome, timezone picker)
  - [x] AreaSelector (cards das 6 áreas principais per ADR-017, min 3 selecionadas)
  - [x] TelegramConnect (QR code ou link, status de vinculação)
  - [x] TutorialCarousel (slides interativos)
  - [x] SkipButton (para etapas opcionais)
- [x] Implementar navegação entre etapas
- [x] Salvar progresso a cada etapa
- [x] Redirect para dashboard ao completar
- [x] Atualizar `middleware.ts`:
  - [x] Adicionar `/onboarding` às rotas públicas
  - [x] Redirecionar para `/onboarding` se `onboardingCompletedAt` é null
- [x] Atualizar `callback/route.ts`:
  - [x] Verificar status do onboarding após `exchangeCodeForSession`
  - [x] Redirecionar para `/onboarding` se não completou
- [x] Criar hook `useOnboarding` em `hooks/use-onboarding.ts`:
  - [x] Estado: currentStep, completedSteps, data, isLoading
  - [x] Métodos: goToStep(), saveCurrentStep(), skipStep()
  - [x] Sincronização com API (GET status, PATCH step)
- [x] Criar schemas Zod de validação em `lib/validations/onboarding.ts`:
  - [x] `profileStepSchema` (name: min 2, timezone: válido)
  - [x] `areasStepSchema` (areas: min 3 items)

**Testes:**
- [x] Testes unitários para validação de formulários
- [x] Testes unitários para OnboardingService:
  - [x] `getOnboardingStatus` retorna etapa correta
  - [x] `saveStepProgress` valida e salva dados
  - [x] `completeOnboarding` atualiza status e `onboardingCompletedAt`
- [x] Testes de integração para endpoints:
  - [x] `GET /api/onboarding/status` - retorna dados corretos
  - [x] `PATCH /api/onboarding/step/:step` - salva progresso
  - [x] `POST /api/onboarding/complete` - finaliza onboarding
  - [x] Todos retornam 401 sem autenticação
- [x] Teste E2E: fluxo completo de onboarding (todas etapas)
- [x] Teste E2E: fluxo com skip nas etapas opcionais
- [x] Teste E2E: usuário retoma onboarding onde parou (login após abandono)
- [x] Teste E2E: validação impede avançar com < 3 áreas selecionadas
- [x] Teste E2E: após verificar email, redireciona para `/onboarding` (não dashboard)
- [x] Teste de middleware: usuário com `onboardingCompletedAt=null` é redirecionado para `/onboarding`

**Definition of Done:**
- [x] Usuário é redirecionado para onboarding após signup
- [x] Progresso é salvo automaticamente
- [x] Usuário só acessa app após etapas obrigatórias
- [x] Skip funciona nas etapas opcionais
- [x] OnboardingModule segue Clean Architecture (`docs/specs/engineering.md` §4)
- [x] DTOs validados com class-validator
- [x] Middleware redireciona para onboarding quando necessário
- [x] Callback redireciona para onboarding após verificação de email
- [x] Job de limpeza de onboardings abandonados configurado

**Notas:**
- **16 Jan 2026:** Migrado `middleware.ts` → `proxy.ts` (Next.js 16 convention). A marcação anterior "N/A" estava incorreta — Next.js renomeou middleware para proxy independentemente do propósito (auth, routing, etc.). Runtime mudou de Edge para Node.js, sem impacto funcional para Supabase SSR.

---

## M0.9 — CI/CD Pipeline 🟢

**Objetivo:** Configurar pipeline de integração e deploy contínuo.

**Referências:** `docs/specs/engineering.md` §12, §13

**Completed:** 08 Jan 2026

**Tasks:**

**CI Pipeline (ci.yml):**
- [x] Criar `.github/workflows/ci.yml`:
  - [x] Checkout + pnpm setup
  - [x] Install dependencies (`--frozen-lockfile`)
  - [x] Run lint
  - [x] Run typecheck
  - [x] Run tests (unit)
  - [x] Run build
- [x] Adicionar job `e2e` no ci.yml:
  - [x] Depende do job `quality`
  - [x] Instalar Playwright browsers
  - [x] Executar `pnpm --filter web test:e2e`
  - [x] Upload `playwright-report` como artifact em falha (retention: 7 days)

**Deploy Workflows:**
- [x] Criar `.github/workflows/deploy-web.yml`:
  - [x] Trigger on push to main
  - [x] Deploy para Vercel (usar GitHub integration nativa)
- [x] Criar `.github/workflows/deploy-api.yml`:
  - [x] Trigger on push to main
  - [x] Deploy para Railway
  - [x] Validar health check (`/api/health`) após deploy

**Sentry Error Tracking:**
- [x] Instalar `@sentry/nestjs` no apps/api
- [x] Inicializar Sentry no `apps/api/src/main.ts`
- [x] Instalar `@sentry/nextjs` no apps/web
- [x] Configurar Sentry no apps/web (`sentry.client.config.ts`, `sentry.server.config.ts`)

**GitHub Configuration:**
- [ ] Configurar secrets no GitHub:
  - [ ] `VERCEL_TOKEN`
  - [ ] `RAILWAY_TOKEN`
  - [ ] `SENTRY_DSN`
  - [ ] `SENTRY_AUTH_TOKEN` (para source maps)
- [x] Documentar branch protection em `docs/specs/engineering.md` §12.3 (ativar quando tiver time)

**Definition of Done:**
- [x] CI roda em todo push (main, develop, feature/*)
- [x] Job E2E roda após job quality
- [x] Deploy automático para produção em push to main
- [x] Health check validado após deploy
- [ ] Sentry capturando erros em produção (requer secrets configurados)
- [x] Branch protection documentado para ativação futura

**Notas:**
- Branch protection será ativado quando houver time de desenvolvimento (2+ devs)
- Deploy staging pode ser adicionado depois se necessário
- Preview deployments são gerenciados automaticamente pelo Vercel GitHub App
- ADR-011 documenta a estratégia de testes E2E no CI (Supabase no CI)
- GitHub secrets precisam ser configurados manualmente para deploy e Sentry funcionarem

---

## M0.10 — Test Infrastructure 🟢

**Objetivo:** Implementar infraestrutura robusta de testes para desenvolvimento sustentável.

**Referências:** `docs/specs/core/architecture.md` §10, `ADR-011`, `ADR-013`

**Completed:** 13 Jan 2026

**Contexto:**
Durante desenvolvimento, foram identificados problemas de gerenciamento de dados de teste:
1. Seed de tracking entries não é idempotente (cria duplicatas a cada execução)
2. Testes E2E criam usuários `test-{timestamp}@example.com` que acumulam no banco
3. Opção de usar `--reset --force` descarta dados de desenvolvimento válidos

**Tasks:**

**Seed Idempotente:**
- [x] Adicionar IDs determinísticos para tracking entries no seed
- [x] Verificar idempotência executando seed 2x sem duplicatas

**E2E Teardown:**
- [x] Criar `apps/web/e2e/setup/global-teardown.ts`
- [x] Implementar cleanup de usuários dinâmicos (`test-*@example.com`)
- [x] Preservar usuários fixos (`test@example.com`, `onboarding@example.com`)
- [x] Configurar `globalTeardown` no `playwright.config.ts`

**Documentação:**
- [x] Criar ADR-013: Test Data Management
- [x] Documentar padrões de teste em `docs/specs/engineering.md` §11.5

**Definition of Done:**
- [x] Seed pode ser executado múltiplas vezes sem criar duplicatas
- [x] Testes E2E limpam usuários dinâmicos após execução
- [x] `pnpm test` e `pnpm test:e2e` passam
- [x] ADR-013 aprovado e commitado

**Notas:**
- IDs determinísticos seguem padrão `00000000-0000-4000-8000-00000000000X`
- Novos IDs para tracking: 0008 (weight), 0009 (water), 0010 (mood)
- Teardown usa regex `/^test-\d+@example\.com$/` para identificar usuários dinâmicos
- Usuários fixos (`test@example.com`, `onboarding@example.com`) preservados para performance
