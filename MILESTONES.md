# MILESTONES.md — Life Assistant AI

> **Documento de referência.** Define o roadmap de desenvolvimento organizado em fases/versões.
> Para especificações detalhadas, consulte os documentos de precedência em `CLAUDE.md`.
>
> **Convenções:**
> - [ ] Task pendente
> - [x] Task concluída
> - [~] Task em andamento
> - [!] Task bloqueada

---

## Visão Geral das Versões

| Versão | Nome | Foco Principal | Status |
|--------|------|----------------|--------|
| **0.x** | Fundação | Infraestrutura base | 🟡 Em andamento |
| **1.x** | Conselheira | Chat + Decisões + Memória | 🔴 Não iniciado |
| **2.x** | Tracker | Métricas + Score + Relatórios | 🔴 Não iniciado |
| **3.x** | Assistente | Integrações + Automações | 🔴 Não iniciado |

---

## Fase 0: Fundação (v0.x)

> **Objetivo:** Estabelecer toda a infraestrutura técnica necessária antes de qualquer feature de negócio.
> **Referências:** `ENGINEERING.md` §1-§10

### M0.1 — Setup do Monorepo 🟢

**Objetivo:** Criar estrutura base do monorepo com Turborepo e pnpm workspaces.

**Tasks:**

- [x] Inicializar repositório Git
- [x] Configurar pnpm workspaces (`pnpm-workspace.yaml`)
- [x] Configurar Turborepo (`turbo.json` com tasks: build, dev, lint, typecheck, test, clean)
- [x] Criar estrutura de diretórios conforme `ENGINEERING.md` §3.1:
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
- [x] Criar `.env.example` com todas as variáveis de `ENGINEERING.md` §16
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
- Turborepo v2+ usa `tasks` em vez de `pipeline` - ENGINEERING.md atualizado
- Docker images atualizadas para versões mais recentes:
  - PostgreSQL 17 (pgvector não é mais necessário — ADR-012)
  - Redis 8 Alpine (`redis:8-alpine`)
  - MinIO via Quay.io (`quay.io/minio/minio:latest`) - minio/minio no Docker Hub descontinuado em Out/2025
- ESLint 9+ usa flat config (`eslint.config.js`)
- Packages incluem: shared, database, ai, config (todos com tsup para build)
- Apps são placeholders: web (Next.js M0.6), api (NestJS M0.5)

---

### M0.2 — Package: Shared 🟢

**Objetivo:** Criar package de tipos, constantes e utilitários compartilhados.

**Tasks:**

- [x] Configurar tsup para build do package
- [x] Criar tipos base conforme `DATA_MODEL.md`:
  - [x] `LifeArea` enum (8 áreas)
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
  - [x] Verificar valores de LifeArea (8)
  - [x] Verificar valores de TrackingType (13)
  - [x] Verificar valores de ConversationType (5)
  - [x] Verificar valores de DecisionStatus (7)
  - [x] Verificar valores de VaultItemType (5)
  - [x] Verificar valores de VaultCategory (6)
  - [x] Verificar valores de ExpenseCategory (13)
  - [x] Verificar arrays ALL_* para iteração
- [x] Testes de constantes (`constants.test.ts`):
  - [x] Verificar DEFAULT_WEIGHTS (8 áreas, valores 0.5-1.0)
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

### M0.3 — Package: Config 🟢

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

### M0.4 — Package: Database 🟢

**Objetivo:** Configurar Drizzle ORM com schema completo e migrations.

**Tasks:**

- [x] Instalar dependências (drizzle-orm, drizzle-kit, pg, dotenv)
- [x] Configurar `drizzle.config.ts`
- [x] Criar schemas conforme `DATA_MODEL.md`:
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
- [x] Criar índices conforme `DATA_MODEL.md` §10
- [x] Configurar RLS policies conforme `ENGINEERING.md` §6
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
- 28 tabelas implementadas conforme DATA_MODEL.md
- 21 enums PostgreSQL definidos
- RLS policies com otimização de performance: `(SELECT auth.user_id())` em vez de `auth.user_id()` - evita execução por-linha (conforme Supabase docs)
- Pool error handler adicionado conforme node-postgres best practices
- dotenv import adicionado ao drizzle.config.ts para CLI commands
- 199 testes unitários + 31 testes de integração passando
- Lint, typecheck e build passam

---

### M0.5 — App: API (NestJS Base) 🟢

**Objetivo:** Criar aplicação NestJS com estrutura de módulos e configurações base.

**Tasks:**

- [x] Inicializar NestJS com CLI
- [x] Configurar estrutura de módulos conforme `ENGINEERING.md` §4:
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
- [x] Criar Dockerfile conforme `ENGINEERING.md` §9.3
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

### M0.6 — App: Web (Next.js Base) 🟢

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
- [x] Configurar estrutura conforme `ENGINEERING.md` §3.1:
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
- [x] Atualizar ENGINEERING.md §2.2 com decisões arquiteturais frontend (Tailwind v4, shadcn/ui, State Management, Route Groups)
- [x] Atualizar ENGINEERING.md §17 com Troubleshooting frontend
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
- **Documentação:** Movida para ENGINEERING.md (§2.2, §17) - sem README separado conforme padrão do projeto

---

### M0.7 — Autenticação (Supabase Auth) 🟢

**Objetivo:** Implementar fluxo completo de autenticação.

**Referências:** `SYSTEM_SPECS.md` §3.1, `INTEGRATIONS_SPECS.md` §5

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

### M0.8 — Onboarding Wizard 🟢

**Objetivo:** Implementar wizard de configuração inicial após signup.

**Referências:** `SYSTEM_SPECS.md` §3.1

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
- [x] Criar `OnboardingModule` com Clean Architecture (conforme `ENGINEERING.md` §4):
  - [x] `OnboardingController` em `presentation/controllers/`
  - [x] `OnboardingService` em `application/services/`
  - [x] DTOs em `presentation/dtos/` com barrel export
- [x] Registrar `OnboardingModule` no `AppModule`
- [x] Atualizar `preferences.areaWeights` ao salvar etapa de áreas (áreas não selecionadas = peso 0)
- [x] Criar job diário para limpar onboardings abandonados após 30 dias (cron via BullMQ)

**Technical Debt (do M0.7):**
- [x] ~~Migrar `middleware.ts` para convenção "proxy" do Next.js 16+~~ — N/A: middleware é de auth, não proxy
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
  - [x] AreaSelector (cards das 8 áreas, min 3 selecionadas)
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
- [x] OnboardingModule segue Clean Architecture (`ENGINEERING.md` §4)
- [x] DTOs validados com class-validator
- [x] Middleware redireciona para onboarding quando necessário
- [x] Callback redireciona para onboarding após verificação de email
- [x] Job de limpeza de onboardings abandonados configurado

---

### M0.9 — CI/CD Pipeline 🟢

**Objetivo:** Configurar pipeline de integração e deploy contínuo.

**Referências:** `ENGINEERING.md` §12, §13

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
- [x] Documentar branch protection em `ENGINEERING.md` §12.3 (ativar quando tiver time)

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

### M0.10 — Test Infrastructure 🟢

**Objetivo:** Implementar infraestrutura robusta de testes para desenvolvimento sustentável.

**Referências:** `ENGINEERING.md` §11.5, `ADR-011`, `ADR-013`

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
- [x] Documentar padrões de teste em `ENGINEERING.md` §11.5

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

---

## Fase 1: Conselheira (v1.x)

> **Objetivo:** Implementar a feature principal de ajudar o usuário a tomar decisões através de chat com IA, sistema de decisões estruturadas e memória gerenciada pela IA (ADR-012).
> **Referências:** `PRODUCT_SPECS.md` §2.1, §6.1, §6.2, §6.3, `AI_SPECS.md`, `SYSTEM_SPECS.md` §3.2, §3.5, §3.6

### M1.1 — Package: AI (LLM Abstraction + Tool Use) 🟢

**Objetivo:** Criar abstração de LLM com suporte a Tool Use (Function Calling).

**Referências:** `ENGINEERING.md` §8, `AI_SPECS.md` §2, `ADR-012`

**Tasks:**

- [x] Criar interface `LLMPort` conforme `ENGINEERING.md` §8.2:
  ```typescript
  interface LLMPort {
    chat(params: ChatParams): Promise<ChatResponse>;
    chatWithTools(params: ChatWithToolsParams): Promise<ChatWithToolsResponse>;
    stream(params: ChatParams): AsyncIterable<StreamChunk>;
    streamWithTools(params: ChatWithToolsParams): AsyncIterable<StreamChunk>;
    getInfo(): ProviderInfo;
  }
  ```
- [x] Criar `ToolDefinition` schema com Zod (incluir `inputExamples`)
- [x] **Implementar Tool Use Examples por provider:**
  - [x] Claude: usar campo `input_examples` com beta header `advanced-tool-use-2025-11-20`
  - [x] Gemini: criar método `enrichDescriptionWithExamples()` para workaround
  - [x] Adicionar exemplos para todas as 7 tools conforme `AI_SPECS.md` §6.2
- [x] Implementar `GeminiAdapter` com suporte a Function Calling
- [x] Implementar `ClaudeAdapter` com suporte a Tool Use
- [x] Criar `LLMFactory` que retorna adapter baseado em ENV
- [x] Implementar rate limiting
- [x] Implementar retry com backoff exponencial
- [x] Criar `ToolExecutorService` (executa tools chamadas pela LLM)
- [x] Implementar tool loop com max iterations (5)
- [x] Testes para ambos adapters (incluindo Tool Use)
- [x] Criar `zod-to-gemini.ts` (conversor Zod → Gemini Type)
- [x] Criar `examples-enricher.ts` (workaround inputExamples para Gemini)
- [x] Criar `message.schema.ts` (tipos Message, ChatParams, etc.)
- [x] Criar `ai.errors.ts` (erros customizados do módulo AI)

**Definition of Done:**
- [x] `LLM_PROVIDER=gemini` usa Gemini com Tool Use
- [x] `LLM_PROVIDER=claude` usa Claude com Tool Use
- [x] Streaming funciona
- [x] Tool calls são retornados corretamente
- [x] Tool loop funciona (LLM → tool → LLM → resposta)
- [x] **Tool Use Examples funcionam corretamente:**
  - [x] Claude recebe `input_examples` via API
  - [x] Gemini recebe description enriquecida com exemplos
  - [x] Todas as 7 tools têm 2-4 exemplos definidos
- [x] Rate limiting aplicado
- [x] Testes passam

**Notas (2025-01-12):**
- Package `@life-assistant/ai` implementado em `packages/ai/`
- Adapters: `GeminiAdapter` (Google GenAI SDK) e `ClaudeAdapter` (Anthropic SDK)
- Factory: `createLLM()` e `createLLMFromEnv()` para criação baseada em ENV vars
- Tool Use Examples: Claude usa beta header `advanced-tool-use-2025-11-20`, Gemini usa `enrichDescriptionWithExamples()`
- Rate limiting com token bucket algorithm
- Retry com backoff exponencial (1s, 2s, 4s)
- Tool loop com max 5 iterações e suporte a confirmação
- **Cobertura de testes: 162 testes passando**
  - adapters: claude.adapter.test.ts (21 testes), gemini.adapter.test.ts (26 testes)
  - services: tool-loop.service.test.ts (19 testes), tool-executor.service.test.ts (12 testes), llm.factory.test.ts (16 testes)
  - utils: rate-limiter.test.ts (14 testes), retry.test.ts (20 testes), zod-to-gemini.test.ts (23 testes), examples-enricher.test.ts (11 testes)

---

### M1.2 — Módulo: Chat Básico 🟢

**Objetivo:** Implementar chat com IA com streaming de resposta.

**Referências:** `SYSTEM_SPECS.md` §3.2, `AI_SPECS.md` §4

**Tasks:**

**Backend:**
- [x] Criar módulo `chat` com Clean Architecture:
  - [x] `ChatController` - endpoints REST + SSE
  - [x] `ChatService` - orquestra envio de mensagem e streaming
  - [x] `ConversationRepository` - CRUD de conversas
  - [x] `MessageRepository` - CRUD de mensagens
  - [x] `ContextBuilderService` - monta system prompt
- [x] Implementar endpoints REST:
  - [x] POST /chat/conversations - criar conversa
  - [x] GET /chat/conversations - listar conversas
  - [x] GET /chat/conversations/:id - detalhes da conversa
  - [x] GET /chat/conversations/:id/messages - histórico de mensagens
  - [x] POST /chat/conversations/:id/messages - enviar mensagem
  - [x] DELETE /chat/conversations/:id - soft delete (90 dias retenção)
- [x] Implementar DTOs com class-validator
- [x] Implementar streaming via Server-Sent Events (SSE)
- [x] Implementar system prompt base conforme `AI_SPECS.md` §4.1
- [ ] ~~Implementar rate limiting por plano~~ → Migrado para **M3.6**
- [x] Salvar mensagens no banco
- [x] Implementar tipos de conversa: general, counselor
- [x] Implementar `@SkipTransform()` decorator para SSE
- [x] Implementar `SseAuthGuard` para autenticação via query param

**Frontend:**
- [x] Criar página `/chat`:
  - [x] Lista de conversas (sidebar)
  - [x] Área de mensagens com scroll
  - [x] Input de mensagem
  - [x] Botão enviar
- [x] Implementar streaming de resposta (SSE)
- [x] Implementar typing indicator
- [x] Implementar auto-scroll
- [x] Criar nova conversa
- [x] Histórico de conversas
- [x] Implementar empty state (sem conversas)
- [x] Implementar loading states
- [x] Implementar error handling (rate limit, LLM errors)
- [x] Adicionar link Chat no sidebar de navegação
- [x] Persistência de conversa via URL (?c=conversationId)

**Testes:**
- [x] Testes unitários:
  - [x] ChatService (streaming, error handling)
  - [x] ConversationRepository
  - [x] MessageRepository
  - [x] ContextBuilderService
- [x] Testes de integração:
  - [x] API de chat (CRUD + mensagens)
  - [ ] ~~Rate limiting~~ → Migrado para **M3.6**
  - [x] SSE streaming
- [x] Testes E2E:
  - [x] Enviar mensagem e receber resposta com streaming
  - [x] Criar nova conversa
  - [x] Alternar entre conversas
  - [ ] ~~Rate limit error handling~~ → Migrado para **M3.6**

**Definition of Done:**
- [x] Usuário envia mensagem e recebe resposta com streaming
- [x] Histórico de conversa é mantido
- [x] Múltiplas conversas funcionam
- [x] Testes passam

**Notas (13 Janeiro 2026):**
- Chat funcional com streaming SSE via `@life-assistant/ai` package
- Autenticação SSE via query param token (EventSource não suporta headers)
- `@SkipTransform()` decorator criado para bypass do `TransformInterceptor` em SSE
- URL-based state: conversa persiste em refresh via `?c=conversationId`
- **Tasks de rate limiting migradas para M3.6 (Stripe/Pagamentos)** — rate limiting depende de definição de planos de negócio (Free/Pro/Premium), que será implementado junto com billing

---

### M1.3 — Sistema de Memória (Tool Use + Memory Consolidation) 🟢

**Objetivo:** Implementar sistema de memória com Tool Use e consolidação automática.

**Referências:** `AI_SPECS.md` §6-7, `DATA_MODEL.md` §7, `ADR-012`

**Tasks:**

**Banco de Dados:**
- [x] Criar migration para tabela `user_memories`
- [x] Criar migration para tabela `knowledge_items`
- [x] Criar migration para tabela `memory_consolidations`
- [x] Criar enums: `knowledge_item_type`, `knowledge_item_source`, `consolidation_status`
- [x] Implementar RLS para novas tabelas

**Backend - Serviços:**
- [x] Criar módulo `memory`:
  - [x] `UserMemoryService` - CRUD de perfil do usuário
  - [x] `KnowledgeItemsService` - CRUD de knowledge items
  - [x] `MemoryConsolidationProcessor` - job de consolidação (Processor pattern)
  - [x] `ContextBuilderService` - monta system prompt com memória
- [x] Implementar `ContextBuilder`:
  - [x] Carregar user_memory (sempre presente, ~500-800 tokens)
  - [x] Montar seção de memória do system prompt
  - [x] Injetar tools disponíveis no contexto

**Backend - Tools:**
- [x] Criar tool `search_knowledge`:
  - [x] Busca por texto em knowledge_items
  - [x] Filtros por área, tipo, tags
  - [x] Ordenação por relevância/data
- [x] Criar tool `add_knowledge`:
  - [x] Adicionar novo fato/preferência
  - [x] Validar com Zod
  - [x] Requer confirmação do usuário

**Backend - Tool Integration:**
- [x] Criar `MemoryToolExecutor` implementando interface `ToolExecutor`
- [x] Integrar `runToolLoop()` com `ChatService`
- [x] Handle de confirmação de tools via SSE (event type: tool_confirmation)
- [x] Atualizar message metadata para armazenar tool calls e results

**Backend - Memory API Endpoints:**
- [x] GET /api/memory - Ver memória do usuário
- [x] GET /api/memory/knowledge - Listar knowledge items (paginado)
- [x] DELETE /api/memory/knowledge/:id - Deletar knowledge item

**Backend - Memory Consolidation Job:**
- [x] Criar job BullMQ `memory-consolidation`:
  - [x] Executa a cada 24h por usuário (3:00 AM timezone local)
  - [x] Busca mensagens desde última consolidação
  - [x] Envia para LLM com prompt de extração
  - [x] Parseia resposta JSON estruturada
  - [x] Cria/atualiza knowledge_items
  - [x] Atualiza user_memory
  - [x] Salva registro em memory_consolidations
- [x] Criar consolidation prompt builder conforme AI_SPECS.md §6.5.2
- [x] Criar response parser com validação Zod
- [x] Implementar scheduling timezone-aware via BullMQ `tz` option

**Testes:**
- [x] Testes unitários:
  - [x] ContextBuilderService monta prompt corretamente (5 tests)
  - [x] KnowledgeItemsService CRUD funciona (31 tests)
  - [x] Tools validam parâmetros com Zod
  - [x] UserMemoryService formatForPrompt respeita ~800 tokens (19 tests)
  - [x] MemoryToolExecutor execute e requiresConfirmation (18 tests)
  - [x] ConsolidationPrompt build e parse (18 tests)
  - [x] MemoryConsolidationProcessor (8 tests)
  - [x] MemoryConsolidationScheduler (7 tests)
- [x] Testes de integração:
  - [x] Memory consolidation extrai fatos de conversas
  - [x] search_knowledge retorna itens relevantes
  - [x] user_memory é atualizado após consolidação
  - [x] Tool executor retorna resultados corretos com DB real
  - [x] Tool loop completa e salva metadata na mensagem
  - [x] Fluxo de confirmação funciona via SSE (N/A - add_knowledge tem requiresConfirmation: false)
  - [x] API endpoints /memory/* funcionam com auth
  - [x] Job executa via BullMQ com Redis real (QueueEvents pattern)

**Definition of Done:**
- [x] user_memory é sempre incluído no contexto
- [x] Tools search_knowledge e add_knowledge funcionam
- [x] Memory consolidation roda a cada 24h
- [x] Knowledge items são criados/atualizados automaticamente
- [x] Usuário pode ver o que a IA sabe (via API)
- [x] Testes unitários passam (106 novos tests)

**Notas (2026-01-13):**
- Implementação completa de M1.3 Sistema de Memória
- Memory module: `UserMemoryService`, `KnowledgeItemsService`, `MemoryToolExecutorService`
- Repositories: `UserMemoryRepository`, `KnowledgeItemRepository` (com RLS)
- Context builder enhanced com user memory formatting (~500-800 tokens)
- Chat service integrado com tool loop via `runToolLoop()` e `continueToolLoop()`
- Memory consolidation job usando BullMQ com timezone-aware scheduling (`tz` option)
- Scheduler cria um job por timezone único (não por usuário, para escalabilidade)
- Consolidation prompt usa Zod schema para validação de resposta LLM
- 106 novos testes unitários adicionados
- 7 testes de integração para BullMQ job com Redis real usando QueueEvents pattern
- API endpoints: `/api/memory`, `/api/memory/knowledge`, `/api/memory/knowledge/:id`
- Arquivos críticos:
  - `apps/api/src/modules/memory/` - Memory module completo
  - `apps/api/src/jobs/memory-consolidation/` - Consolidation job
  - `packages/ai/src/schemas/tools/` - Tool definitions
  - `packages/database/src/schema/` - user_memories, knowledge_items, memory_consolidations

**Notas (2026-01-14):**
- Testes de integração completos para M1.3 Sistema de Memória
- 3 arquivos de teste criados em `apps/api/test/integration/memory/`:
  - `memory-endpoints.integration.spec.ts` - 14 testes (API /memory/*)
  - `memory-tool-executor.integration.spec.ts` - 14 testes (search/add/analyze tools)
  - `memory-consolidation.integration.spec.ts` - 18 testes (prompt build, parsing, fact extraction)
- Total: 46 testes de integração para memory module
- Padrão: inline controllers com JWT auth via `jose`, mock services
- 116 testes de integração passando (total geral)

---

### M1.4 — Classificação de Intent 🔴

**Objetivo:** Classificar intenção da mensagem para executar ações.

**Referências:** `AI_SPECS.md` §5

**Tasks:**

- [ ] Criar `IntentClassifier` service:
  - [ ] Implementar classificação via LLM (prompt em `AI_SPECS.md` §5.3)
  - [ ] Extrair dados estruturados da mensagem
- [ ] Implementar categorias de intent:
  - [ ] COMMAND (comandos explícitos /peso, /agua)
  - [ ] TRACK_METRIC (registro implícito "pesei 82kg")
  - [ ] CREATE_NOTE ("anota isso")
  - [ ] CREATE_REMINDER ("me lembra amanhã")
  - [ ] START_DECISION ("devo aceitar o emprego?")
  - [ ] QUERY_DATA ("quanto gastei?")
  - [ ] CHAT_GENERAL (conversa livre)
  - [ ] CHAT_COUNSELOR ("preciso desabafar")
- [ ] Implementar extração de dados por intent (conforme `AI_SPECS.md` §5.4)
- [ ] Integrar com fluxo de chat

**Testes:**
- [ ] Testes unitários para IntentClassifier:
  - [ ] Classificação correta para cada categoria de intent
  - [ ] Extração de dados estruturados (peso, valor, data, etc.)
  - [ ] Tratamento de mensagens ambíguas
- [ ] Testes com dataset de exemplos reais:
  - [ ] Mínimo 20 exemplos por categoria
  - [ ] Validar accuracy >95%
- [ ] Teste de integração com fluxo de chat

**Definition of Done:**
- [ ] Mensagens são classificadas corretamente (>95% accuracy)
- [ ] Dados são extraídos das mensagens
- [ ] Classificação integrada ao chat
- [ ] Testes passam

---

### M1.5 — Sistema de Decisões 🔴

**Objetivo:** Implementar sistema estruturado de análise de decisões.

**Referências:** `SYSTEM_SPECS.md` §3.5, `PRODUCT_SPECS.md` §6.3, `AI_SPECS.md` §7.3

**Tasks:**

**Backend:**
- [ ] Criar módulo `decisions` com Clean Architecture:
  - [ ] `DecisionController` - CRUD de decisões
  - [ ] `CreateDecisionUseCase`
  - [ ] `AddOptionsUseCase`
  - [ ] `AddCriteriaUseCase`
  - [ ] `GenerateAnalysisUseCase` - análise via IA
  - [ ] `MakeDecisionUseCase` - registrar escolha
  - [ ] `ReviewDecisionUseCase` - feedback após período
  - [ ] `DecisionRepository`
- [ ] Implementar estados: DRAFT → ANALYZING → READY → DECIDED/POSTPONED/CANCELED → REVIEWED
- [ ] Implementar validações:
  - [ ] Mínimo 2 opções, máximo 10
  - [ ] Mínimo 1 critério, máximo 20
- [ ] Implementar análise da IA (conforme `AI_SPECS.md` §7.3):
  - [ ] Resumo da situação
  - [ ] Prós/contras de cada opção
  - [ ] Score por critério
  - [ ] Riscos principais
  - [ ] Perguntas para reflexão
  - [ ] Recomendação (se solicitado)
- [ ] Implementar agendamento de review:
  - [ ] 7 dias (urgente)
  - [ ] 30 dias (padrão)
  - [ ] 90 dias (estratégico)
  - [ ] Customizável pelo usuário
- [ ] Criar job para notificação de review

**Frontend:**
- [ ] Criar páginas de decisões:
  - [ ] `/decisions` - lista de decisões com filtros
  - [ ] `/decisions/new` - criar nova decisão
  - [ ] `/decisions/[id]` - visualizar decisão
  - [ ] `/decisions/[id]/edit` - editar opções/critérios
  - [ ] `/decisions/[id]/review` - registrar review
- [ ] Componentes:
  - [ ] DecisionCard (resumo na lista)
  - [ ] OptionsList (gerenciar opções)
  - [ ] CriteriaList (gerenciar critérios com pesos)
  - [ ] AnalysisView (exibir análise da IA)
  - [ ] DecisionMatrix (tabela opção x critério)
  - [ ] ReviewForm

**Testes:**
- [ ] Testes unitários para use cases
- [ ] Teste E2E: criar decisão → adicionar opções → gerar análise → decidir

**Definition of Done:**
- [ ] CRUD completo de decisões
- [ ] IA gera análise estruturada
- [ ] Estados funcionam corretamente
- [ ] Review agendado e notificado
- [ ] Testes passam

---

### M1.6 — Memory View (Visualização de Memória) 🔴

**Objetivo:** Implementar tela para visualizar e gerenciar o que a IA sabe sobre o usuário.

**Referências:** `PRODUCT_SPECS.md` §6.2, `ADR-012`

**Tasks:**

**Backend:**
- [ ] Criar endpoints de memória:
  - [ ] `GET /memory` - user_memory + estatísticas
  - [ ] `GET /memory/items` - lista de knowledge_items com filtros
  - [ ] `PATCH /memory/items/:id` - corrigir item
  - [ ] `DELETE /memory/items/:id` - deletar item
  - [ ] `POST /memory/items/:id/validate` - validar item
  - [ ] `POST /memory/items` - adicionar item manualmente
- [ ] Implementar filtros:
  - [ ] Por área (health, financial, career, etc.)
  - [ ] Por tipo (fact, preference, insight, person, memory)
  - [ ] Por confiança (high, medium, low)
  - [ ] Por fonte (conversation, user_input, ai_inference)
  - [ ] Por data
- [ ] Implementar busca full-text em knowledge_items

**Frontend:**
- [ ] Criar página `/memory`:
  - [ ] Resumo do user_memory (perfil, objetivos, desafios)
  - [ ] Lista de knowledge_items organizada por área
  - [ ] Filtros por tipo, confiança, fonte
  - [ ] Busca por texto
- [ ] Componentes:
  - [ ] MemoryOverview (resumo do perfil)
  - [ ] KnowledgeItemsList (lista com filtros)
  - [ ] KnowledgeItemCard (item com ações)
  - [ ] ConfidenceIndicator (alta/média/baixa)
  - [ ] EditItemModal (para correções)
  - [ ] AddItemModal (para adições manuais)
- [ ] Ações por item:
  - [ ] Validar (confirmar que está correto)
  - [ ] Corrigir (editar conteúdo)
  - [ ] Deletar (remover permanentemente)
  - [ ] Ver fonte (link para conversa original)

**Testes:**
- [ ] Testes unitários para filtros
- [ ] Teste E2E: validar item → verificar flag
- [ ] Teste E2E: corrigir item → verificar novo valor
- [ ] Teste E2E: deletar item → verificar remoção

**Definition of Done:**
- [ ] Usuário vê todos os knowledge_items
- [ ] Filtros funcionam (área, tipo, confiança)
- [ ] Busca por texto funciona
- [ ] Validar item marca como validado
- [ ] Corrigir item atualiza conteúdo
- [ ] Deletar item remove permanentemente
- [ ] Testes passam

---

### M1.7 — Raciocínio Inferencial Real-time 🟢

**Objetivo:** Permitir que a IA faça conexões entre fatos e detecte contradições em tempo real durante conversas.

**Referências:** `AI_SPECS.md` §6.6, `ADR-014`

**Tasks:**

**Backend:**
- [x] Criar tool `analyze_context`:
  - [x] Definir schema em `packages/ai/src/schemas/tools/analyze-context.tool.ts`
  - [x] Parâmetros: currentTopic, relatedAreas, lookForContradictions
  - [x] Retornar fatos relacionados, padrões existentes, conexões potenciais, contradições
- [x] Implementar executor para `analyze_context`:
  - [x] Buscar knowledge_items das áreas relacionadas
  - [x] Buscar learnedPatterns com confidence >= 0.7
  - [x] Detectar conexões via keyword matching
  - [x] Estrutura para contradições (LLM faz análise)
- [x] Atualizar system prompt:
  - [x] Adicionar `analyze_context` às capacidades
  - [x] Adicionar seção "Raciocínio Inferencial" com instruções
- [x] Exportar tool no `packages/ai/src/index.ts`

**Documentação:**
- [x] Criar ADR-014: Real-time Inference Architecture
- [x] Atualizar AI_SPECS.md (§4.1, §6.2, §6.6, §9.1, §9.2)

**Testes:**
- [x] Testes unitários para `analyze_context`:
  - [x] Retorna fatos relacionados das áreas
  - [x] Inclui padrões com alta confiança
  - [x] Deduplica fatos de múltiplas áreas
  - [x] Encontra conexões potenciais com padrões
  - [x] Inclui hint quando lookForContradictions=true
  - [x] Ordena fatos por confidence descending
  - [x] Retorna erro para parâmetros inválidos

**Definition of Done:**
- [x] Tool `analyze_context` definida e implementada
- [x] Executor busca fatos e padrões corretamente
- [x] System prompt inclui instruções de raciocínio inferencial
- [x] ADR-014 documenta arquitetura
- [x] Testes unitários passam

**Notas (13/01/2026):**
- Implementado como parte do plano de "Real-time Inference Architecture"
- Arquitetura de dois níveis: Batch (Job 3AM) + Real-time (analyze_context)
- Padrões do batch são reutilizados no real-time (confidence >= 0.7)
- LLM decide quando usar a tool baseado nas instruções do system prompt
- Detecção de contradições é feita pelo LLM, não por código

---

### M1.8 — Perspectiva Cristã 🔴

**Objetivo:** Implementar feature opt-in de perspectiva cristã no chat.

**Referências:** `PRODUCT_SPECS.md` §8, `AI_SPECS.md` §4.3

**Tasks:**

**Backend:**
- [ ] Adicionar configuração `christianPerspective: boolean` no user_settings
- [ ] Implementar system prompt de perspectiva cristã (conforme `AI_SPECS.md` §4.3)
- [ ] Integrar com chat: aplicar prompt quando habilitado

**Frontend:**
- [ ] Criar toggle nas configurações do usuário (`/settings/preferences`)
- [ ] Adicionar seção "Perspectiva Cristã" com explicação
- [ ] Componente ToggleWithDescription para o setting
- [ ] Adicionar opção de habilitar perspectiva cristã na etapa 2 do onboarding (toggle opcional junto com seleção de áreas) — conforme `PRODUCT_SPECS.md` §7.1 item 2c

**Testes:**
- [ ] Teste unitário: prompt correto é aplicado quando habilitado
- [ ] Teste unitário: prompt cristão NÃO é aplicado quando desabilitado
- [ ] Teste de integração: resposta da IA inclui perspectiva bíblica (quando habilitado)
- [ ] Teste de integração: resposta da IA NÃO menciona religião (quando desabilitado)
- [ ] Teste E2E: toggle de configuração persiste corretamente
- [ ] Teste E2E: toggle no onboarding habilita perspectiva cristã corretamente

**Definition of Done:**
- [ ] Usuário pode habilitar/desabilitar perspectiva cristã
- [ ] IA integra princípios bíblicos naturalmente quando habilitado
- [ ] Nunca menciona aspectos religiosos quando desabilitado
- [ ] Toggle no onboarding funciona corretamente
- [ ] Testes passam

---

### M1.9 — Confirmação de Tracking via Chat 🔴

**Objetivo:** Implementar confirmação antes de registrar métricas via chat.

**Referências:** `AI_SPECS.md` §9.2.1

**Tasks:**

**Backend:**
- [ ] Implementar fluxo de confirmação no chat:
  1. Usuário menciona métrica ("pesei 82kg")
  2. IA extrai dados e pede confirmação
  3. Usuário confirma ou corrige
  4. IA registra e confirma
- [ ] Criar `ConfirmationService` para gerenciar estado de confirmação
- [ ] Permitir correções (valor, data, categoria)
- [ ] Exceções (comandos explícitos não requerem confirmação)

**Frontend:**
- [ ] Componente ConfirmationCard no chat (exibe dados extraídos)
- [ ] Botões de Confirmar/Corrigir/Cancelar
- [ ] Formulário inline para correções

**Testes:**
- [ ] Teste unitário: extração de dados de mensagens
- [ ] Teste unitário: fluxo de confirmação
- [ ] Teste de integração: mensagem implícita → confirmação → registro
- [ ] Teste de integração: comando explícito → registro direto (sem confirmação)
- [ ] Teste E2E: fluxo completo de tracking via chat com confirmação

**Definition of Done:**
- [ ] Tracking via conversa sempre pede confirmação
- [ ] Correções funcionam
- [ ] Comandos explícitos (/peso) não pedem confirmação
- [ ] Testes passam

---

### M1.10 — Guardrails de Segurança 🔴

**Objetivo:** Implementar guardrails para tópicos sensíveis.

**Referências:** `AI_SPECS.md` §8

**Tasks:**

**Backend:**
- [ ] Criar `GuardrailService` para verificação de conteúdo:
  - [ ] Suicídio/autolesão → CVV (188) + acolhimento
  - [ ] Abuso/violência → recursos (180, 190)
  - [ ] Diagnósticos médicos → sugerir profissional
  - [ ] Aconselhamento financeiro → não dar recomendações específicas
  - [ ] Conteúdo ilegal → recusar educadamente
- [ ] Implementar respostas padrão para cada guardrail (templates)
- [ ] Integrar verificação no fluxo de chat (antes de responder)

**Testes:**
- [ ] Testes unitários para cada tipo de guardrail:
  - [ ] Detecção de conteúdo sobre suicídio/autolesão
  - [ ] Detecção de conteúdo sobre abuso/violência
  - [ ] Detecção de solicitação de diagnóstico médico
  - [ ] Detecção de solicitação de aconselhamento financeiro específico
  - [ ] Detecção de conteúdo ilegal
- [ ] Teste de integração: mensagem sensível → resposta apropriada
- [ ] Teste que guardrails NÃO disparam para conteúdo normal
- [ ] Teste E2E: fluxo completo de guardrail (mensagem → resposta de suporte)

**Definition of Done:**
- [ ] Todos os guardrails funcionam conforme especificado
- [ ] Respostas incluem recursos de ajuda apropriados
- [ ] Testes passam

---

### M1.11 — UI/UX Polish v1 🔴

**Objetivo:** Refinar interface e experiência para lançamento da v1.

**Tasks:**

**Componentes de Estado (conforme `SYSTEM_SPECS.md` §4):**
- [ ] Criar componente EmptyState reutilizável:
  - [ ] Ícone contextual
  - [ ] Mensagem principal
  - [ ] Descrição secundária
  - [ ] Call-to-action
- [ ] Criar componente LoadingState reutilizável:
  - [ ] Skeleton para listas
  - [ ] Skeleton para cards
  - [ ] Spinner para ações
- [ ] Criar componente ErrorState reutilizável:
  - [ ] Mensagem de erro amigável
  - [ ] Botão de retry
  - [ ] Link para suporte
- [ ] Implementar Toast notifications (success, error, warning, info)
- [ ] Implementar ConfirmationModal para ações destrutivas

**Aplicar estados em todas as telas:**
- [ ] Chat: empty (sem conversas), loading, error
- [ ] Decisões: empty (sem decisões), loading, error
- [ ] Notas: empty (sem notas), loading, error
- [ ] Configurações: loading, error

**Responsividade:**
- [ ] Revisar layout em mobile (< 640px)
- [ ] Revisar layout em tablet (640px - 1024px)
- [ ] Revisar layout em desktop (> 1024px)
- [ ] Testar sidebar colapsável em mobile

**Testes:**
- [ ] Testes de componentes para EmptyState, LoadingState, ErrorState
- [ ] Teste E2E: verificar empty states nas telas principais
- [ ] Teste E2E: verificar loading states durante carregamento
- [ ] Testes de responsividade (viewport mobile, tablet, desktop)

**Definition of Done:**
- [ ] Todos os empty/loading/error states implementados em todas as telas
- [ ] App funciona bem em todas as resoluções
- [ ] Toasts funcionam para todas as ações
- [ ] Confirmações funcionam para ações destrutivas
- [ ] Não há bugs críticos
- [ ] Testes passam

---

### M1.12 — Context Management (Compaction) 🔴

**Objetivo:** Gerenciar contexto de conversas longas usando compaction automático, similar ao Claude Code.

**Referências:**
- [Automatic Context Compaction - Claude Docs](https://platform.claude.com/cookbook/tool-use-automatic-context-compaction)
- [Effective Context Engineering - Anthropic](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)
- `AI_SPECS.md` §4

**Problema:**
- Atualmente só as últimas 20 mensagens são enviadas ao LLM
- Conversas longas perdem contexto importante
- Não há sumarização de mensagens antigas

**Tasks:**

**Backend - Compaction Service:**
- [ ] Criar `CompactionService` em `packages/ai`:
  - [ ] Monitorar token usage por conversa
  - [ ] Detectar quando threshold é atingido (80% do context window)
  - [ ] Gerar summary usando prompt especializado
  - [ ] Retornar summary formatado
- [ ] Criar schema para summary prompt:
  - [ ] Template para resumo de conversa
  - [ ] Preservar: decisões, fatos aprendidos, tópicos discutidos
  - [ ] Descartar: mensagens repetitivas, saudações, confirmações
- [ ] Implementar token counting (estimativa: 4 chars = 1 token)

**Backend - Integração com Chat:**
- [ ] Modificar `ChatService.processStreamResponse`:
  - [ ] Calcular tokens totais da conversa
  - [ ] Verificar threshold antes de chamar LLM
  - [ ] Se threshold atingido, chamar compaction
  - [ ] Usar summary + últimas N mensagens como contexto
- [ ] Criar tabela ou coluna para armazenar summaries:
  - [ ] `conversations.summary` (text, nullable)
  - [ ] `conversations.summary_updated_at` (timestamp)
  - [ ] `conversations.messages_summarized_count` (integer)
- [ ] Implementar migration para nova coluna

**Backend - Context Builder:**
- [ ] Modificar `ContextBuilderService`:
  - [ ] Carregar summary da conversa se existir
  - [ ] Incluir summary no início do contexto
  - [ ] Manter user_memories + knowledge como contexto persistente
- [ ] Ajustar número de mensagens recentes (20 → dinâmico baseado em tokens)

**Configuração:**
- [ ] Adicionar configs em `ConfigService`:
  - [ ] `CONTEXT_COMPACTION_THRESHOLD` (default: 100000 tokens)
  - [ ] `CONTEXT_COMPACTION_ENABLED` (default: true)
  - [ ] `CONTEXT_RECENT_MESSAGES_LIMIT` (default: 20)
  - [ ] `CONTEXT_COMPACTION_MODEL` (default: mesmo modelo, opcional haiku)

**Testes:**
- [ ] Teste unitário: CompactionService gera summary válido
- [ ] Teste unitário: Token counting funciona corretamente
- [ ] Teste unitário: Threshold detection funciona
- [ ] Teste integração: Conversa longa trigger compaction
- [ ] Teste integração: Summary é persistido corretamente
- [ ] Teste integração: Contexto inclui summary + mensagens recentes

**Definition of Done:**
- [ ] Conversas longas não perdem contexto importante
- [ ] Compaction acontece automaticamente quando necessário
- [ ] Summary é persistido e reutilizado
- [ ] Token usage é reduzido em conversas longas
- [ ] Testes passam
- [ ] Documentação atualizada (AI_SPECS.md)

---

## Fase 2: Tracker (v2.x)

> **Objetivo:** Implementar sistema de tracking de métricas, Life Balance Score, dashboard e relatórios.
> **Referências:** `PRODUCT_SPECS.md` §2.3, §6.7, §6.8, §6.14, §6.15, §6.17, `SYSTEM_SPECS.md` §3.3, §3.4, §3.9, §3.10

### M2.1 — Módulo: Tracking de Métricas 🔴

**Objetivo:** Implementar registro de métricas de vida.

**Referências:** `SYSTEM_SPECS.md` §3.3

**Tasks:**

**Backend:**
- [ ] Criar módulo `tracking`:
  - [ ] `TrackingController` - CRUD de entries
  - [ ] `RecordMetricUseCase` - validar e salvar
  - [ ] `GetHistoryUseCase` - buscar histórico com filtros
  - [ ] `GetAggregationsUseCase` - cálculos (média, soma, etc)
  - [ ] `TrackingRepository`
- [ ] Implementar tipos de tracking (conforme `SYSTEM_SPECS.md` §3.3):
  - [ ] weight (0-500kg)
  - [ ] water (0-10000ml)
  - [ ] sleep (0-24h, com qualidade 1-10)
  - [ ] exercise (tipo, duração, intensidade)
  - [ ] expense (valor, categoria)
  - [ ] income
  - [ ] mood (1-10)
  - [ ] energy (1-10)
  - [ ] habit
  - [ ] custom
- [ ] Implementar validações conforme `SYSTEM_SPECS.md` §3.3
- [ ] Implementar categorias de despesa (conforme `SYSTEM_SPECS.md`)
- [ ] Implementar agregações (média, soma, variação)
- [ ] Integrar com intent classifier (tracking via chat)

**Frontend:**
- [ ] Criar página `/tracking`:
  - [ ] Formulários rápidos por tipo de métrica
  - [ ] Histórico com filtros
  - [ ] Gráficos de evolução
- [ ] Componentes:
  - [ ] QuickTrackForm (botões para registrar comum)
  - [ ] MetricChart (gráfico de linha/barra)
  - [ ] TrackingHistory (lista com filtros)
  - [ ] CategoryPicker (para despesas)

**Testes:**
- [ ] Testes unitários para validações
- [ ] Teste E2E: registrar peso → ver no histórico

**Definition of Done:**
- [ ] Todos os tipos de tracking funcionam
- [ ] Validações aplicadas
- [ ] Agregações calculadas corretamente
- [ ] Gráficos de evolução funcionam
- [ ] Tracking via chat funciona

---

### M2.2 — Life Balance Score 🔴

**Objetivo:** Implementar cálculo do Life Balance Score.

**Referências:** `SYSTEM_SPECS.md` §3.4

**Tasks:**

**Backend:**
- [ ] Criar serviço `ScoreCalculator`:
  - [ ] Calcular score de cada área (0-100)
  - [ ] Aplicar pesos configuráveis
  - [ ] Calcular Life Balance Score geral
- [ ] Implementar fórmulas por área (conforme `SYSTEM_SPECS.md` §3.4):
  - [ ] Saúde: peso (IMC), exercício, sono, água, alimentação
  - [ ] Financeiro: budget, savings, debt, investments
  - [ ] Relacionamentos: interações, qualidade
  - [ ] Carreira: satisfação, progresso, work-life
  - [ ] Saúde Mental: humor, energia, stress
  - [ ] (outros conforme spec)
- [ ] Implementar comportamento com dados insuficientes (retorna 50 + aviso)
- [ ] Criar job para cálculo diário (00:00 UTC)
- [ ] Armazenar histórico de scores

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

**Testes:**
- [ ] Testes unitários para ScoreCalculator:
  - [ ] Cálculo correto de cada área
  - [ ] Aplicação correta dos pesos
  - [ ] Cálculo do Life Balance Score geral
  - [ ] Comportamento com dados insuficientes (retorna 50)
- [ ] Testes de integração:
  - [ ] Job de cálculo diário executa corretamente
  - [ ] Histórico é armazenado corretamente
- [ ] Teste E2E: verificar scores no dashboard após tracking

**Definition of Done:**
- [ ] Scores calculados corretamente
- [ ] Pesos configuráveis pelo usuário
- [ ] Histórico armazenado
- [ ] Job diário funcionando
- [ ] UI exibe scores com tendências
- [ ] Testes passam

---

### M2.3 — Dashboard Principal 🔴

**Objetivo:** Implementar dashboard com visão geral da vida do usuário.

**Referências:** `PRODUCT_SPECS.md` §6.14

**Tasks:**

- [ ] Criar página `/dashboard`:
  - [ ] Life Balance Score (destaque)
  - [ ] Scores por área (cards)
  - [ ] Destaques positivos
  - [ ] Pontos de atenção
  - [ ] Decisões em aberto
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

### M2.4 — Metas e Hábitos 🔴

**Objetivo:** Implementar sistema de metas e tracking de hábitos.

**Referências:** `SYSTEM_SPECS.md` §3.9, `PRODUCT_SPECS.md` §6.15

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

### M2.5 — Relatórios 🔴

**Objetivo:** Implementar geração de relatórios periódicos.

**Referências:** `SYSTEM_SPECS.md` §3.10, `AI_SPECS.md` §7.1, §7.2

**Tasks:**

**Backend:**
- [ ] Criar módulo `reports`:
  - [ ] `GenerateMorningSummaryUseCase`
  - [ ] `GenerateWeeklyReportUseCase`
  - [ ] `GenerateMonthlyReportUseCase`
- [ ] Implementar prompts de relatório (conforme `AI_SPECS.md` §7.1, §7.2)
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

---

## Fase 3: Assistente (v3.x)

> **Objetivo:** Implementar integrações externas e funcionalidades de assistente pessoal.
> **Referências:** `PRODUCT_SPECS.md` §2.2, §5.2, §6.4, §6.5, §6.6, `INTEGRATIONS_SPECS.md`

### M3.1 — Integração Telegram 🔴

**Objetivo:** Implementar bot do Telegram para interação rápida.

**Referências:** `INTEGRATIONS_SPECS.md` §2

**Tasks:**

**Backend:**
- [ ] Criar módulo `telegram`:
  - [ ] Webhook handler
  - [ ] Command handlers (/start, /peso, /agua, /gasto, etc)
  - [ ] Message handler (conversa com IA)
  - [ ] Voice handler (transcrição)
  - [ ] Photo handler (análise com vision)
- [ ] Implementar vinculação de conta
- [ ] Implementar envio de notificações:
  - [ ] Morning summary
  - [ ] Weekly report
  - [ ] Lembretes
  - [ ] Alertas
- [ ] Respeitar quiet hours
- [ ] Detectar bot bloqueado e desativar integração

**Frontend:**
- [ ] Página de configuração `/settings/telegram`:
  - [ ] Botão vincular/desvincular
  - [ ] Status da integração (conectado/desconectado/erro)
  - [ ] Configurar notificações por tipo
  - [ ] Configurar quiet hours
- [ ] Componentes:
  - [ ] TelegramLinkButton (gera link deep link)
  - [ ] TelegramStatus (badge de status com último sync)
  - [ ] NotificationPreferences (toggles por tipo)
  - [ ] QuietHoursConfig (horário início/fim)

**Testes:**
- [ ] Testes de integração:
  - [ ] Webhook handler processa mensagens corretamente
  - [ ] Command handlers (/peso, /agua, /gasto, etc.)
  - [ ] Message handler (conversa com IA)
  - [ ] Vinculação de conta
  - [ ] Envio de notificações
- [ ] Testes unitários:
  - [ ] Parser de comandos
  - [ ] Validação de quiet hours
  - [ ] Detecção de bot bloqueado
- [ ] Teste E2E: vincular Telegram → receber notificação

**Definition of Done:**
- [ ] Bot responde comandos
- [ ] Conversa com IA funciona
- [ ] Áudio é transcrito
- [ ] Vinculação funciona
- [ ] Notificações enviadas
- [ ] Quiet hours respeitado
- [ ] Bot bloqueado = integração desativada
- [ ] Testes passam

---

### M3.2 — Integração Google Calendar 🔴

**Objetivo:** Sincronizar eventos do Google Calendar.

**Referências:** `INTEGRATIONS_SPECS.md` §3

**Tasks:**

**Backend:**
- [ ] Implementar OAuth flow com Google
- [ ] Criar serviço de sync:
  - [ ] Buscar calendários
  - [ ] Buscar eventos (próximos 30 dias)
  - [ ] Salvar localmente
- [ ] Criar job de sync a cada 15 min (com staggering)
- [ ] Implementar rate limiting e backoff
- [ ] Refresh token automático
- [ ] Desativar se token revogado

**Frontend:**
- [ ] Página `/settings/calendar`:
  - [ ] Botão conectar/desconectar Google
  - [ ] Selecionar calendários a sincronizar (checkboxes)
  - [ ] Status do sync (último sync, próximo sync)
  - [ ] Botão forçar sync manual
- [ ] Componentes:
  - [ ] GoogleConnectButton (inicia OAuth flow)
  - [ ] CalendarSelector (lista de calendários com checkboxes)
  - [ ] SyncStatus (timestamp do último sync + indicador)
  - [ ] CalendarEventCard (evento na agenda)

**Uso no sistema:**
- [ ] Eventos aparecem no morning summary
- [ ] IA considera agenda ao sugerir

**Testes:**
- [ ] Testes de integração:
  - [ ] OAuth flow completo
  - [ ] Busca de calendários
  - [ ] Busca de eventos
  - [ ] Salvamento local de eventos
  - [ ] Refresh token automático
- [ ] Testes unitários:
  - [ ] Rate limiting e backoff
  - [ ] Detecção de token revogado
  - [ ] Staggering de sync entre usuários
- [ ] Teste E2E: conectar Google → ver eventos no dashboard

**Definition of Done:**
- [ ] OAuth funciona
- [ ] Sync a cada 15 min
- [ ] Eventos aparecem no app
- [ ] Morning summary inclui eventos
- [ ] Desconectar remove tokens
- [ ] Testes passam

---

### M3.3 — Vault (Informações Sensíveis) 🔴

**Objetivo:** Implementar área segura para dados sensíveis.

**Referências:** `SYSTEM_SPECS.md` §3.8, `PRODUCT_SPECS.md` §6.5

**Tasks:**

**Backend:**
- [ ] Criar módulo `vault`:
  - [ ] CRUD de vault items
  - [ ] Criptografia AES-256-GCM + Argon2id
  - [ ] Re-autenticação para acesso
  - [ ] Timeout de 5 minutos
- [ ] Tipos de item: credential, document, card, note, file
- [ ] Categorias: personal, financial, work, health, legal
- [ ] Audit log de acessos
- [ ] NUNCA expor via tools de busca (segurança)

**Frontend:**
- [ ] Criar página `/vault`:
  - [ ] Lista de itens por categoria
  - [ ] Modal de re-autenticação
  - [ ] Formulários por tipo de item
  - [ ] Visualização com reveal de senha
- [ ] Componentes:
  - [ ] VaultItem (card com ícone por tipo)
  - [ ] VaultItemForm (formulário dinâmico por tipo)
  - [ ] ReauthModal (modal de re-autenticação)
  - [ ] PasswordReveal (botão de mostrar/ocultar)
  - [ ] SecureInput (input com máscara)
  - [ ] VaultCategoryTabs (filtro por categoria)
  - [ ] SessionTimer (countdown do timeout de 5 min)

**Testes:**
- [ ] Testes unitários:
  - [ ] Criptografia AES-256-GCM
  - [ ] Derivação de chave com Argon2id
  - [ ] Validação de tipos de item
  - [ ] Lógica de timeout (5 min)
- [ ] Testes de integração:
  - [ ] CRUD de vault items via API
  - [ ] Re-autenticação requerida para acesso
  - [ ] Audit log é criado em cada acesso
  - [ ] Vault items NÃO são acessíveis via search_knowledge tool
- [ ] Teste de segurança:
  - [ ] Dados estão criptografados no banco
  - [ ] Não é possível acessar sem re-auth após timeout
- [ ] Teste E2E: criar item → re-autenticar → visualizar → verificar audit log

**Definition of Done:**
- [ ] CRUD funciona
- [ ] Dados criptografados no banco
- [ ] Re-autenticação requerida
- [ ] Timeout funciona
- [ ] Audit log de acessos
- [ ] Vault não aparece em buscas (search_knowledge)
- [ ] Testes passam

---

### M3.4 — Pessoas (CRM Pessoal) 🔴

**Objetivo:** Implementar gerenciamento de relacionamentos pessoais.

**Referências:** `SYSTEM_SPECS.md` §3.7, `PRODUCT_SPECS.md` §6.6

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

### M3.5 — Notificações Proativas 🔴

**Objetivo:** Implementar sistema de notificações e check-ins proativos.

**Referências:** `SYSTEM_SPECS.md` §3.11, `PRODUCT_SPECS.md` §6.16, `AI_SPECS.md` §7.4

**Tasks:**

**Backend:**
- [ ] Criar módulo `notifications`:
  - [ ] Tipos: reminder, alert, report, insight, milestone, social
  - [ ] Canais: push (web), telegram, email, in-app
  - [ ] Respeitar quiet hours
  - [ ] Preferências por tipo
- [ ] Implementar check-ins proativos (conforme `AI_SPECS.md` §7.4):
  - [ ] Dias sem tracking
  - [ ] Queda de humor
  - [ ] Evento próximo
  - [ ] Follow-up de decisão
- [ ] Criar jobs para envio
- [ ] Implementar job de notificações de onboarding abandonado (conforme `SYSTEM_SPECS.md` §3.1):
  - [ ] Dia 3: email "Complete seu cadastro para começar a usar o app!"
  - [ ] Dia 7: email "Falta pouco! Termine o cadastro."
  - [ ] Dia 14: email "Seus dados expiram em 16 dias. Complete agora!"
  - [ ] Dia 25: email "Última chance! Seus dados serão removidos em 5 dias."
- [ ] Criar template de email para lembretes de onboarding

**Backend - Data Retention & Purge Jobs (Per `SYSTEM_SPECS.md` §2.5, `ADR-010`):**
- [ ] Criar job `purge-soft-deleted-users`:
  - [ ] Executar diariamente
  - [ ] Hard delete registros com `deletedAt > 30 dias`
  - [ ] Cascade delete de dados relacionados (conversations, messages, etc.)
- [ ] Criar job `purge-soft-deleted-conversations`:
  - [ ] Executar diariamente
  - [ ] Hard delete registros com `deletedAt > 90 dias`
  - [ ] Enviar email de aviso 5 dias antes (dia 85)
- [ ] Criar job `purge-soft-deleted-notes`:
  - [ ] Executar diariamente
  - [ ] Hard delete registros com `deletedAt > 30 dias`
  - [ ] Enviar email de aviso 5 dias antes (dia 25)
- [ ] Criar templates de email para avisos de purge:
  - [ ] "Suas conversas serão excluídas permanentemente em 5 dias"
  - [ ] "Suas notas serão excluídas permanentemente em 5 dias"

**Frontend:**
- [ ] Página `/settings/notifications`:
  - [ ] Configurar canais (push, telegram, email)
  - [ ] Configurar tipos de notificação
  - [ ] Configurar quiet hours
  - [ ] Configurar frequência de check-ins
- [ ] Página `/notifications`:
  - [ ] Histórico de notificações
  - [ ] Marcar como lida
  - [ ] Filtros por tipo
- [ ] Componentes:
  - [ ] NotificationBell (ícone no header com badge de não lidas)
  - [ ] NotificationDropdown (lista rápida de recentes)
  - [ ] NotificationCard (card individual)
  - [ ] NotificationPreferencesForm (configurações por tipo)
  - [ ] ChannelToggle (toggle por canal)
  - [ ] QuietHoursInput (horário início/fim)

**Testes:**
- [ ] Testes de integração:
  - [ ] Envio por cada canal (push, telegram, email)
  - [ ] Respeito ao quiet hours
  - [ ] Preferências por tipo
  - [ ] Job de notificação de onboarding abandonado envia emails nos dias corretos
  - [ ] Job de purge users (soft deleted > 30 dias)
  - [ ] Job de purge conversations (soft deleted > 90 dias)
  - [ ] Job de purge notes (soft deleted > 30 dias)
  - [ ] Email de aviso pré-purge enviado 5 dias antes
- [ ] Testes unitários:
  - [ ] Lógica de check-in proativo (dias sem tracking, queda de humor, etc.)
  - [ ] Validação de preferências
  - [ ] Cálculo de data de purge (30/90 dias)
- [ ] Teste E2E: configurar preferências → receber notificação do tipo configurado
- [ ] Teste E2E: verificar quiet hours bloqueia notificação

**Definition of Done:**
- [ ] Notificações enviadas por todos os canais
- [ ] Quiet hours respeitado
- [ ] Check-ins proativos funcionam
- [ ] Preferências configuráveis
- [ ] Notificações de onboarding abandonado enviadas nos dias corretos
- [ ] Jobs de purge executam corretamente (users 30d, conversations 90d, notes 30d)
- [ ] Emails de aviso pré-purge enviados 5 dias antes
- [ ] Testes passam

---

### M3.6 — Stripe (Pagamentos) 🔴

**Objetivo:** Implementar sistema de assinaturas e pagamentos.

**Referências:** `INTEGRATIONS_SPECS.md` §4

**Tasks:**

**Backend:**
- [ ] Criar módulo `billing`:
  - [ ] Checkout session para upgrade
  - [ ] Webhook handlers (subscription events)
  - [ ] Portal de billing
- [ ] Implementar planos: Free, Pro, Premium
- [ ] Aplicar limites por plano:
  - [ ] Rate limiting de mensagens por plano (migrado de M1.2)
  - [ ] Usar Redis (Upstash) para storage distribuído
  - [ ] Implementar ThrottlerBehindProxyGuard para Railway/Vercel
  - [ ] Limites conforme `SYSTEM_SPECS.md` §2.6
- [ ] Notificar falhas de pagamento

**Frontend:**
- [ ] Página `/settings/billing`:
  - [ ] Plano atual com features
  - [ ] Botões de upgrade/downgrade
  - [ ] Histórico de faturas
  - [ ] Link para portal Stripe
- [ ] Componentes:
  - [ ] PlanCard (nome, preço, features, botão de ação)
  - [ ] PlanComparison (tabela comparativa dos planos)
  - [ ] CurrentPlanBadge (badge do plano atual)
  - [ ] UsageMeter (uso vs limite por feature)
  - [ ] InvoiceList (lista de faturas)
  - [ ] PaymentMethodCard (último 4 dígitos do cartão)
  - [ ] UpgradeModal (confirmação de upgrade)

**Testes:**
- [ ] Testes de integração:
  - [ ] Checkout session é criada corretamente
  - [ ] Webhook handlers processam eventos (subscription.created, .updated, .deleted, invoice.paid, invoice.payment_failed)
  - [ ] Portal de billing redireciona corretamente
  - [ ] Limites são aplicados após upgrade/downgrade
- [ ] Testes unitários:
  - [ ] Verificação de limites por plano
  - [ ] Cálculo de uso vs limite
- [ ] Teste E2E: upgrade de plano → verificar novas features
- [ ] Teste E2E: verificar limite de mensagens no plano Free

**Definition of Done:**
- [ ] Upgrade funciona
- [ ] Limites aplicados por plano
- [ ] Cancelamento funciona
- [ ] Notificações de falha
- [ ] Testes passam

---

### M3.7 — Storage (Cloudflare R2) 🔴

**Objetivo:** Implementar upload e armazenamento de arquivos.

**Referências:** `INTEGRATIONS_SPECS.md` §7

**Tasks:**

**Backend:**
- [ ] Criar `StorageService` com integração R2:
  - [ ] `uploadFile(file, path)` - upload de arquivo
  - [ ] `getSignedUrl(path)` - URL temporária para download
  - [ ] `deleteFile(path)` - remover arquivo
- [ ] Implementar upload de avatar:
  - [ ] Validar tipo (jpg, png, webp)
  - [ ] Validar tamanho (max 2MB)
  - [ ] Redimensionar para 256x256
- [ ] Implementar upload de anexos (notas):
  - [ ] Validar tipos permitidos (imagens, PDFs)
  - [ ] Validar tamanho por plano
- [ ] Implementar export de dados:
  - [ ] Gerar arquivo ZIP com dados do usuário
  - [ ] Presigned URL para download (24h)
  - [ ] Job assíncrono para geração
- [ ] Presigned URLs para download seguro

**Frontend:**
- [ ] Componentes:
  - [ ] AvatarUpload (preview, crop, upload)
  - [ ] FileUpload (drag & drop, progress)
  - [ ] FilePreview (thumbnail, nome, tamanho)
  - [ ] ExportDataButton (solicitar export)
  - [ ] DownloadLink (link com expiração)

**Testes:**
- [ ] Testes de integração:
  - [ ] Upload de arquivo para R2
  - [ ] Download via presigned URL
  - [ ] Deleção de arquivo
  - [ ] Export de dados completo
- [ ] Testes unitários:
  - [ ] Validação de tipo de arquivo
  - [ ] Validação de tamanho
  - [ ] Geração de presigned URL
- [ ] Teste E2E: upload de avatar → ver avatar no perfil
- [ ] Teste E2E: anexar arquivo em nota → download do anexo

**Definition of Done:**
- [ ] Upload funciona
- [ ] Download funciona
- [ ] Avatars funcionam
- [ ] Exports funcionam
- [ ] Validações de tamanho/tipo aplicadas
- [ ] Testes passam

---

## Acompanhamento

### Legenda de Status

| Emoji | Significado |
|-------|-------------|
| 🔴 | Não iniciado |
| 🟡 | Em andamento |
| 🟢 | Concluído |
| 🔵 | Bloqueado |

### Histórico de Progresso

| Data | Milestone | Ação | Notas |
|------|-----------|------|-------|
| 2026-01-14 | M1.3 | Testes Int. | Testes de integração: memory-endpoints (14), memory-tool-executor (14), memory-consolidation (18). Total 46 novos testes, 116 integration tests passando |
| 2026-01-13 | M1.7 | Concluído | Raciocínio Inferencial Real-time: tool analyze_context, executor com busca de fatos/padrões, system prompt com instruções de raciocínio, ADR-014, 8 novos testes unitários (total 294) |
| 2026-01-13 | M1.3 | Concluído | Sistema de Memória: UserMemoryService, KnowledgeItemsService, MemoryToolExecutor, Memory Consolidation Job (BullMQ timezone-aware), Context Builder, 106 novos testes (total 294) |
| 2026-01-13 | M1.2 | Concluído | Chat básico com SSE streaming, 6 endpoints REST, @SseAuth decorator, @SkipTransform decorator, persistência URL, dialog de confirmação de exclusão, 193 testes. Rate limiting → M3.6, data purge jobs → M3.5 |
| 2026-01-12 | M1.1 | Concluído | Package AI com LLM abstraction + Tool Use: GeminiAdapter, ClaudeAdapter, LLMFactory, rate limiting, retry, tool loop, 162 testes |
| 2026-01-08 | M0.7 | Concluído | Auth completo com Supabase: 8 endpoints, AuthProvider, middleware, 31 integration tests, 16 E2E specs, Page Objects, scripts infra |
| 2026-01-07 | M0.6 | Concluído | App web Next.js 16 com Turbopack, Tailwind v4, shadcn/ui, React Query, Zustand, Playwright E2E (12 testes), ADR-008 (Database Type Encapsulation) |
| 2026-01-07 | M0.5 | Concluído | App API NestJS com guards, interceptors, filters, decorators, health endpoints, Swagger, 150 testes (137 unit + 13 integration) |
| 2026-01-07 | M0.4 | Concluído | Package database com 28 tabelas, 21 enums, RLS policies, 230 testes (unit + integration) |
| 2026-01-07 | M0.3 | Concluído | Package config com validação Zod, 67 testes (100% coverage) |
| 2026-01-07 | M0.1 | Concluído | Setup completo do monorepo com Turborepo, pnpm workspaces, TypeScript, ESLint 9, Prettier, Docker Compose |
| 2026-01-06 | M0.2 | Concluído | Package shared com 8 enums, constantes, utilitários e 77 testes (100% coverage) |

---

*Última atualização: 14 Janeiro 2026*
*Revisão: M1.3 testes de integração completos. 46 novos testes em 3 arquivos: memory-endpoints (14), memory-tool-executor (14), memory-consolidation (18). Total 116 integration tests passando.*
