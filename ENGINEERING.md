# ENGINEERING.md — Life Assistant AI
> **Documento normativo.** Define **COMO** a aplicação deve ser construída e operada.  
> **Objetivo:** Estrutura sólida desde o início que **não exige refatoração grande** para escalar.
>
> **Precedência (em caso de conflito):**
> 1. Escopo/features: `PRODUCT_SPECS.md`
> 2. Regras/fluxos/DoD: `SYSTEM_SPECS.md`
> 3. Tech/infra: `ENGINEERING.md` ← este documento
> 4. Modelo de dados: `DATA_MODEL.md`
> 5. IA/Prompts: `AI_SPECS.md`
> 6. Integrações: `INTEGRATIONS_SPECS.md`
>
> Pendências (TBD): `TBD_TRACKER.md`

---

## 0) Regras Inegociáveis (Guard Rails)

Princípios que **não podem ser violados** em nenhuma circunstância:

| Regra | Descrição |
|-------|-----------|
| **Monorepo obrigatório** | Todo código em um único repositório com Turborepo |
| **Modular Monolith** | Domínios bem separados, mas deploy único por app |
| **Nada pesado no request HTTP** | Sync, relatórios, memory consolidation, exports rodam **apenas em jobs** no worker |
| **DB é fonte única da verdade** | PostgreSQL com Drizzle. Sem cache como source of truth |
| **Multi-tenant forte** | `user_id` em toda tabela sensível + **RLS no Postgres** |
| **Idempotência obrigatória** | Jobs devem ser idempotentes (jobId determinístico, dedupe) |
| **Auditabilidade obrigatória** | Toda ação manual do usuário deve ter audit log |
| **LLM abstraído** | Trocar Gemini ↔ Claude = mudar ENV, não código |
| **Portabilidade obrigatória** | `Dockerfile` para API e `docker-compose` para dev desde dia 1 |
| **Sem dependências grandes sem ADR** | Auth, DB, ORM, Queue, Framework exigem ADR em `docs/adr/` |

---

## 1) Arquitetura de Software

### 1.1 Padrão: Modular Monolith + Clean Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           PRESENTATION LAYER                                 │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │  Next.js (Frontend)        │  NestJS Controllers (API)              │   │
│   │  - Pages/Components        │  - REST Endpoints                      │   │
│   │  - React Query             │  - WebSocket Gateways                  │   │
│   │  - Hooks                   │  - Webhooks (Telegram, Stripe)         │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           APPLICATION LAYER                                  │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │  Use Cases / Application Services                                    │   │
│   │  - Orquestram a lógica de negócio                                   │   │
│   │  - Coordenam múltiplos domain services                              │   │
│   │  - Não contêm regras de negócio                                     │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                             DOMAIN LAYER                                     │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │  Domain Services / Entities / Value Objects                          │   │
│   │  - Regras de negócio puras                                          │   │
│   │  - Sem dependência de frameworks                                     │   │
│   │  - Interfaces (Ports) para dependências externas                    │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          INFRASTRUCTURE LAYER                                │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │  Adapters / Implementations                                          │   │
│   │  - Database (Drizzle/Supabase)                                      │   │
│   │  - Cache (Redis)                                                     │   │
│   │  - LLM Providers (Gemini, Claude)                                   │   │
│   │  - External APIs (Telegram, Calendar, Stripe)                       │   │
│   │  - Storage (Cloudflare R2)                                          │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Arquitetura de Infraestrutura

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENTS                                         │
│   ┌──────────────┐    ┌──────────────┐    ┌──────────────┐                  │
│   │   Web App    │    │   Telegram   │    │   WhatsApp   │                  │
│   │  (Next.js)   │    │     Bot      │    │   Business   │                  │
│   └──────┬───────┘    └──────┬───────┘    └──────┬───────┘                  │
└──────────┼───────────────────┼───────────────────┼──────────────────────────┘
           │                   │                   │
           ▼                   ▼                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         VERCEL (Frontend)                                    │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │  Next.js (App Router) + React Query                                 │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼ REST/WebSocket
┌─────────────────────────────────────────────────────────────────────────────┐
│                         RAILWAY (Backend)                                    │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                           NestJS                                     │   │
│   │  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐            │   │
│   │  │ Modules   │ │ Services  │ │Controllers│ │  Guards   │            │   │
│   │  └───────────┘ └───────────┘ └───────────┘ └───────────┘            │   │
│   │  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐            │   │
│   │  │  BullMQ   │ │ Socket.io │ │ Tool Use  │ │ Webhooks  │            │   │
│   │  │  (Jobs)   │ │ (Realtime)│ │   (AI)    │ │(TG/Stripe)│            │   │
│   │  └───────────┘ └───────────┘ └───────────┘ └───────────┘            │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
           │                   │                   │
           ▼                   ▼                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              DATA LAYER                                      │
│   ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐            │
│   │    Supabase     │  │  Upstash Redis  │  │  Cloudflare R2  │            │
│   │  PostgreSQL     │  │  Cache + Queue  │  │  File Storage   │            │
│   │  + Auth + RLS   │  │  + BullMQ       │  │                 │            │
│   │                 │  │                 │  │                 │            │
│   └─────────────────┘  └─────────────────┘  └─────────────────┘            │
└─────────────────────────────────────────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         EXTERNAL SERVICES                                    │
│   ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐         │
│   │  Gemini  │ │  Google  │ │ Telegram │ │  Stripe  │ │  Resend  │         │
│   │  /Claude │ │ Calendar │ │ Bot API  │ │ Payments │ │  Emails  │         │
│   └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘         │
│   ┌──────────┐ ┌──────────┐                                                 │
│   │  Sentry  │ │  Axiom   │                                                 │
│   │  Errors  │ │   Logs   │                                                 │
│   └──────────┘ └──────────┘                                                 │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2) Stack Tecnológico

> **Nota sobre versões:** As tabelas abaixo indicam as tecnologias escolhidas. Para versões específicas de **pacotes npm**, sempre consulte a versão mais recente com `pnpm info <package> version` antes de instalar. Para **infraestrutura** (Node.js, pnpm, Docker), sempre use a versão **LTS mais recente** disponível no momento da configuração.

### 2.1 Visão Geral

| Camada | Tecnologia | Justificativa |
|--------|------------|---------------|
| **Monorepo** | Turborepo | Código compartilhado, builds otimizados |
| **Frontend** | Next.js + React Query | SSR, performance, DX |
| **Backend** | NestJS | Módulos, DI, escalável com time |
| **Database** | PostgreSQL (Supabase) + Drizzle | Confiável, RLS integrado |
| **Cache** | Redis (Upstash) | Sessions, rate limit, pub/sub, queues |
| **Real-time** | Socket.io | Chat, notificações em tempo real |
| **Jobs** | BullMQ | Background processing com Redis |
| **AI** | Gemini/Claude + Tool Use | LLM abstraction com function calling (ADR-012) |
| **Auth** | Supabase Auth | Social login, JWT, RLS integrado |
| **Storage** | Cloudflare R2 | Custo baixo, S3-compatible |
| **Infra** | Vercel + Railway | Managed, auto-scale |
| **Observability** | Sentry + Axiom | Erros + logs centralizados |

### 2.2 Frontend

| Tecnologia | Versão | Uso |
|------------|--------|-----|
| Next.js | 16.1.1 | Framework React com App Router, Turbopack |
| React | 19 | UI Library |
| TypeScript | 5.x | Type safety (strict mode) |
| TanStack Query | 5.90.16 | Server state management |
| Zustand | 5.0.9 | Client state com localStorage persistence |
| Tailwind CSS | 4.1.18 | Styling (CSS-first configuration) |
| shadcn/ui | 3.6.3 | Componentes base (new-york style) |
| React Hook Form | 7.70.0 | Formulários |
| Zod | 3.x | Validação de schemas |
| next-themes | 0.4.6 | Dark/Light mode |
| lucide-react | 0.562.0 | Ícones |
| Playwright | 1.57.0 | E2E testing |
| Tiptap | - | Notas automáticas (M1+) |

#### Decisões Arquiteturais Frontend

**Tailwind CSS v4 (CSS-first)**

Utiliza configuração CSS-first com `@import "tailwindcss"` em vez das antigas diretivas `@tailwind`. A configuração é feita via `@theme` directive em `globals.css`.

```css
/* apps/web/src/app/globals.css */
@import 'tailwindcss';

@theme {
  --color-background: oklch(100% 0 0);
  --color-foreground: oklch(9% 0 0);

  @media (prefers-color-scheme: dark) {
    --color-background: oklch(9% 0 0);
    --color-foreground: oklch(98% 0 0);
  }
}
```

**shadcn/ui Setup Manual**

Componentes criados manualmente em vez de usar CLI devido a problemas de resolução de pacotes workspace. Todos os componentes seguem convenções new-york style.

**State Management Patterns**

- **Server state**: TanStack Query com 60s staleTime para SSR
- **Client state**: Zustand com localStorage persistence para UI state (sidebar, modals)
- **Form state**: React Hook Form com validação Zod

```typescript
// apps/web/src/lib/query-client.ts
export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,  // SSR pattern
        gcTime: 5 * 60 * 1000,
        retry: 1,
      },
    },
  });
}
```

**Route Groups**

- `(auth)`: Centered layout para páginas de autenticação (sem sidebar)
- `(app)`: App layout com sidebar e header para páginas autenticadas

```
app/
├── (auth)/
│   ├── login/page.tsx
│   └── layout.tsx       # AuthLayout (centered)
├── (app)/
│   ├── dashboard/page.tsx
│   └── layout.tsx       # AppLayout (with sidebar)
└── layout.tsx           # RootLayout (providers)
```

### 2.3 Backend

| Tecnologia | Uso |
|------------|-----|
| NestJS | Framework backend |
| TypeScript | Type safety |
| Drizzle ORM | Database ORM |
| Zod | Validação |
| BullMQ | Job queues |
| Socket.io | WebSockets |
| jose | JWT validation (Supabase tokens) |
| Passport | OAuth strategies (opcional) |
| class-validator | Validação de DTOs |

### 2.4 AI/LLM

> **ADR-012:** Arquitetura Tool Use + Memory Consolidation (não RAG).

| Tecnologia | Uso |
|------------|-----|
| @google/genai | SDK Gemini (unified) com Function Calling |
| @anthropic-ai/sdk | SDK Claude com Tool Use |
| Zod | Validação de tool parameters |

**Nota:** LangChain.js e pgvector foram removidos (ver ADR-012). A arquitetura usa Tool Use nativo dos LLMs.

---

## 3) Estrutura do Monorepo

### 3.1 Estrutura de Diretórios

```
life-assistant/
├── apps/
│   ├── web/                          # Next.js Frontend
│   │   ├── app/                      # App Router
│   │   │   ├── (auth)/               # Rotas públicas
│   │   │   ├── (app)/                # Rotas autenticadas
│   │   │   └── api/                  # API Routes (BFF)
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── lib/
│   │   ├── stores/
│   │   ├── Dockerfile
│   │   └── package.json
│   │
│   └── api/                          # NestJS Backend
│       ├── src/
│       │   ├── modules/              # Módulos de domínio
│       │   ├── common/               # Guards, interceptors, filters
│       │   ├── config/               # Configurações
│       │   └── jobs/                 # BullMQ processors
│       ├── test/
│       ├── Dockerfile
│       └── package.json
│
├── packages/
│   ├── shared/                       # Tipos e utilitários compartilhados
│   │   ├── src/
│   │   │   ├── types/
│   │   │   ├── constants/
│   │   │   └── utils/
│   │   ├── tsup.config.ts
│   │   └── package.json
│   │
│   ├── database/                     # Schema Drizzle + migrations
│   │   ├── src/
│   │   │   ├── schema/
│   │   │   ├── migrations/
│   │   │   └── seed/
│   │   ├── drizzle.config.ts
│   │   └── package.json
│   │
│   ├── ai/                           # Core de IA compartilhado
│   │   ├── src/
│   │   │   ├── prompts/
│   │   │   └── types/
│   │   └── package.json
│   │
│   └── config/                       # Configurações e validação de ENV
│       ├── src/
│       │   └── env.ts
│       └── package.json
│
├── infra/
│   └── docker/
│       ├── docker-compose.yml        # Dev local
│       ├── docker-compose.prod.yml   # Produção (opcional)
│       └── init/
│           └── init.sql              # Setup inicial do DB
│
├── docs/
│   └── adr/                          # Architecture Decision Records
│
├── .github/
│   └── workflows/
│       ├── ci.yml
│       ├── deploy-web.yml
│       └── deploy-api.yml
│
├── turbo.json
├── pnpm-workspace.yaml
├── package.json
└── .env.example
```

### 3.2 Regras de Dependência entre Packages (Obrigatório)

```
┌─────────────────────────────────────────────────────────────────┐
│                         APPS LAYER                               │
│   ┌─────────────┐                    ┌─────────────┐            │
│   │  apps/web   │                    │  apps/api   │            │
│   └──────┬──────┘                    └──────┬──────┘            │
│          │                                  │                    │
│          │ pode importar                    │ pode importar      │
│          ▼                                  ▼                    │
├─────────────────────────────────────────────────────────────────┤
│                       PACKAGES LAYER                             │
│   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│   │  database   │  │     ai      │  │   config    │            │
│   └──────┬──────┘  └──────┬──────┘  └──────┬──────┘            │
│          │                │                │                    │
│          │ pode importar  │ pode importar  │ pode importar      │
│          ▼                ▼                ▼                    │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │                        shared                            │   │
│   │              (types, constants, utils)                   │   │
│   └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

**Regras:**

| Package | Pode importar | NÃO pode importar |
|---------|---------------|-------------------|
| `shared` | Nada (é a base) | Qualquer outro package |
| `config` | `shared` | `database`, `ai`, apps |
| `database` | `shared`, `config` | `ai`, apps |
| `ai` | `shared`, `config` | `database`, apps |
| `apps/web` | Todos os packages | `apps/api` |
| `apps/api` | Todos os packages | `apps/web` |

### 3.3 Package Patterns and Documentation

**Filosofia de Documentação:**
- Packages internos utilizam **documentação inline (JSDoc/TSDoc)** em vez de READMEs
- Especificações centralizadas em `ENGINEERING.md`, `DATA_MODEL.md`, `AI_SPECS.md`, etc.
- README raiz contém apenas setup essencial e comandos principais

#### Type Encapsulation Pattern

Quando um package encapsula uma biblioteca externa ou ORM, exporte um tipo customizado que abstrai a implementação (ver ADR-008):

```typescript
// ✅ BOM: packages/database/src/client.ts
export type Database = ReturnType<typeof drizzle<typeof schema>>;

export function getDb(): Database {
  db ??= drizzle(getPool(), { schema });
  return db;
}
```

```typescript
// ✅ BOM: apps/api/src/database/database.service.ts
import { type Database, getDb } from '@life-assistant/database';

get db(): Database {  // Tipo customizado, não NodePgDatabase
  return getDb();
}
```

**Benefícios:**
- Consumidores dependem de abstração, não de implementação concreta
- Facilita troca futura de bibliotecas (ex: Drizzle → Prisma)
- Previne vazamento de detalhes de infraestrutura

#### Singleton Pattern para Factories

Packages que provêm instâncias (database, cache, clients) devem usar singletons:

```typescript
// ✅ BOM: packages/database/src/client.ts
let pool: Pool | null = null;
let db: Database | null = null;

export function getDb(): Database {
  db ??= drizzle(getPool(), { schema });
  return db;
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    db = null;
  }
}
```

**Benefícios:**
- Pool único de conexões (eficiência de memória)
- Instância consistente entre imports
- Gerenciamento de ciclo de vida centralizado

#### Export Principles

1. **Exporte tipos, não implementações** de camadas de infraestrutura
2. **Exporte factory functions** para singletons (não instâncias diretamente)
3. **Exporte constants e enums** da camada shared
4. **Exporte utilities** domain-agnostic
5. **Oculte detalhes privados** (ex: não exporte tipos raw de ORMs)

#### Package API Reference

**`@life-assistant/database`**
```typescript
// Exports principais
export { getDb, getPool, closePool, withUserId, withTransaction, withUserTransaction, schema };
export type { Database, InferSelectModel, InferInsertModel };

// Uso
import { getDb, withUserId, type Database } from '@life-assistant/database';

const notes = await withUserId(userId, async (db) => {
  return db.select().from(schema.notes);
});
```
Ver: `DATA_MODEL.md` para schema completo, ADR-008 para rationale de tipo.

**`@life-assistant/config`**
```typescript
// Exports principais
export { loadConfig, getConfig, validateEnv, isEnvValid };
export type { EnvConfig, AppEnv, DatabaseEnv, RedisEnv, AiEnv, StorageEnv, IntegrationsEnv, ObservabilityEnv };

// Uso
import { getConfig } from '@life-assistant/config';

const config = getConfig();
console.log(config.app.port);  // Type-safe
```
Ver: `.env.example` para variáveis disponíveis.

**`@life-assistant/shared`**
```typescript
// Exports principais
export {
  // Enums
  LifeArea, TrackingType, DecisionStatus, VaultItemType, ExpenseCategory,
  // Constants
  DEFAULT_WEIGHTS, TRACKING_VALIDATIONS, RATE_LIMITS, STORAGE_LIMITS,
  // Utils
  formatCurrency, formatDate, normalizeText, sleep, retry,
};

// Uso
import { LifeArea, formatCurrency, normalizeText } from '@life-assistant/shared';

const amount = formatCurrency(1234.56, 'BRL');  // "R$ 1.234,56"
const normalized = normalizeText('São Paulo');  // "sao paulo"
```
Ver: `SYSTEM_SPECS.md` §4 para definição de Life Areas e enums.

**`@life-assistant/ai`** (M1.1 - não implementado)
```typescript
// Exports planejados
export { createLLM, type LLMPort, type LLMProvider };

// Uso futuro
import { createLLM } from '@life-assistant/ai';

const llm = await createLLM('gemini');  // ou 'claude'
const response = await llm.chat([{ role: 'user', content: 'Hello' }]);
```
Ver: `AI_SPECS.md` para configuração de prompts e providers.

#### Code Documentation Standards

Toda função/classe exportada de package DEVE ter JSDoc:

```typescript
/**
 * Execute uma callback com contexto RLS para um usuário específico.
 *
 * Define `app.user_id` no session context do PostgreSQL, garantindo que
 * políticas RLS sejam aplicadas corretamente.
 *
 * @param userId - ID do usuário para contexto RLS
 * @param callback - Função a executar com o database scoped
 * @returns Resultado da callback
 *
 * @example
 * const notes = await withUserId(userId, async (db) => {
 *   return db.select().from(schema.notes);
 * });
 */
export async function withUserId<T>(
  userId: string,
  callback: (db: Database) => Promise<T>
): Promise<T> {
  // implementação...
}
```

---

## 4) Estrutura Interna de Módulo (NestJS)

Cada módulo segue Clean Architecture:

```
modules/tracking/
├── tracking.module.ts               # NestJS Module (wiring)
│
├── presentation/                    # PRESENTATION LAYER
│   ├── controllers/
│   │   └── tracking.controller.ts
│   ├── gateways/
│   │   └── tracking.gateway.ts      # WebSocket
│   └── dtos/
│       └── record-weight.dto.ts
│
├── application/                     # APPLICATION LAYER
│   └── use-cases/
│       ├── record-weight.use-case.ts
│       └── calculate-score.use-case.ts
│
├── domain/                          # DOMAIN LAYER
│   ├── entities/
│   │   └── tracking-entry.entity.ts
│   ├── value-objects/
│   │   └── weight.vo.ts
│   ├── services/
│   │   └── score-calculator.service.ts
│   ├── events/
│   │   └── weight-recorded.event.ts
│   └── ports/
│       └── tracking.repository.port.ts
│
└── infrastructure/                  # INFRASTRUCTURE LAYER
    ├── repositories/
    │   └── tracking.repository.ts
    ├── mappers/
    │   └── tracking.mapper.ts
    └── listeners/
        └── tracking-events.listener.ts
```

### 4.1 Configuração do Projeto NestJS

#### Sistema de Módulos: CommonJS

NestJS usa **CommonJS** como sistema de módulos. Isso é documentado oficialmente (ver ADR-007) e confirmado pela documentação oficial do Prisma para NestJS que menciona "NestJS's CommonJS setup".

**Configuração obrigatória:**

```json
// apps/api/package.json - NÃO usar "type": "module"
{
  "name": "@life-assistant/api",
  "private": true
  // NÃO incluir: "type": "module"
}
```

```json
// apps/api/tsconfig.json
{
  "compilerOptions": {
    "module": "CommonJS",
    "moduleResolution": "Node"
  }
}
```

#### Compilação com SWC

NestJS usa SWC para compilação rápida. O arquivo `.swcrc` é obrigatório para configurar decorators:

```json
// apps/api/.swcrc
{
  "$schema": "https://swc.rs/schema.json",
  "sourceMaps": true,
  "jsc": {
    "parser": {
      "syntax": "typescript",
      "decorators": true,
      "dynamicImport": true
    },
    "transform": {
      "legacyDecorator": true,
      "decoratorMetadata": true
    },
    "target": "es2022",
    "baseUrl": "./"
  },
  "module": {
    "type": "commonjs"
  },
  "minify": false
}
```

Também configurar no `nest-cli.json`:

```json
// apps/api/nest-cli.json
{
  "compilerOptions": {
    "builder": "swc"
  }
}
```

#### Carregamento de Variáveis de Ambiente em Monorepo

Em um monorepo, o arquivo `.env` fica na raiz do workspace (`/life-assistant/.env`), mas a API é executada de `apps/api/`. O dotenv precisa ser carregado **antes** de qualquer import que use variáveis de ambiente:

```typescript
// apps/api/src/main.ts
import 'reflect-metadata';
import { config as loadEnv } from 'dotenv';
import { resolve } from 'path';

// Carrega .env da raiz do workspace (DEVE ser antes de outros imports)
loadEnv({ path: resolve(__dirname, '../../../.env') });

// Agora é seguro importar módulos que usam env vars
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
// ...
```

**Por que não usar `@nestjs/config`?**

O projeto usa um package customizado `@life-assistant/config` com validação Zod. O `@nestjs/config` carrega automaticamente o `.env` do diretório atual, mas em monorepos o `.env` está na raiz. A solução é carregar manualmente com dotenv antes dos imports.

#### Providers com Escopo (Transient/Request)

Providers marcados com `Scope.TRANSIENT` ou `Scope.REQUEST` **não podem** ser obtidos com `app.get()`. Use `app.resolve()`:

```typescript
// ❌ ERRADO - Gera InvalidClassScopeException
const logger = app.get(AppLoggerService);

// ✅ CORRETO - Para providers TRANSIENT ou REQUEST
const logger = await app.resolve(AppLoggerService);
```

### 4.2 API Response Format

All API responses are wrapped by the `TransformInterceptor` in a standard format:

```typescript
interface ApiResponse<T> {
  success: boolean;
  data: T;                    // Actual payload
  meta: {
    timestamp: string;        // ISO 8601
    requestId: string;        // UUID for tracing
  };
}
```

**Example response:**
```json
{
  "success": true,
  "data": {
    "currentStep": "areas",
    "completedSteps": ["profile"],
    "isComplete": false
  },
  "meta": {
    "timestamp": "2026-01-09T12:00:00.000Z",
    "requestId": "a1b2c3d4-e5f6-..."
  }
}
```

**Frontend handling:**

Frontend utilities (`use-api.ts`, `use-onboarding.ts`) automatically unwrap responses:

```typescript
// Frontend receives only the data
const status = await api.get<OnboardingStatus>('/onboarding/status');
// status = { currentStep: "areas", completedSteps: [...], isComplete: false }
```

**Implementation:**
- Backend: `apps/api/src/common/interceptors/transform.interceptor.ts`
- Types: `apps/api/src/common/types/request.types.ts` (ApiResponse interface)

---

## 5) Padrões de Código

### 5.1 TypeScript

| Regra | Obrigatório |
|-------|-------------|
| `strict: true` | ✅ Sim |
| Proibido `any` sem justificativa | ✅ Sim |
| DTOs validados com Zod ou class-validator | ✅ Sim |
| Interfaces para dependências externas (Ports) | ✅ Sim |

### 5.2 Convenções de Nomenclatura

| Tipo | Convenção | Exemplo |
|------|-----------|---------|
| Arquivos | kebab-case | `record-weight.use-case.ts` |
| Classes | PascalCase | `RecordWeightUseCase` |
| Interfaces | PascalCase + sufixo Port | `TrackingRepositoryPort` |
| Métodos | camelCase | `calculateScore()` |
| Constantes | SCREAMING_SNAKE_CASE | `MAX_RETRY_ATTEMPTS` |
| Enums | PascalCase | `TrackingType.WEIGHT` |

### 5.3 Tratamento de Erros

```typescript
// Domain Errors
export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class InvalidWeightError extends DomainError {
  constructor(value: number) {
    super(`Invalid weight: ${value}. Must be between 0 and 500.`);
  }
}

// Application Errors
export class ApplicationError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 400,
  ) {
    super(message);
  }
}

// Categorização no Worker
type ErrorCategory = 'retryable' | 'non-retryable';

// Retryable: rate limit, 5xx, timeout
// Non-retryable: validação, credencial inválida
```

### 5.4 Logging

| Regra | Descrição |
|-------|-----------|
| Formato | JSON estruturado |
| Campos obrigatórios | `user_id`, `request_id` ou `job_id`, `timestamp` |
| Proibido | Logar secrets (keys, tokens, senhas) |
| Dev | `LOG_LEVEL=debug`, stdout |
| Prod | `LOG_LEVEL=warn`, Axiom via drain |

```typescript
// Exemplo de log estruturado
logger.info({
  message: 'Weight recorded',
  userId: 'user-123',
  requestId: 'req-456',
  value: 82.5,
  area: 'health',
});
```

---

## 6) Multi-tenant e Segurança (RLS)

### 6.1 Regras

| Regra | Descrição |
|-------|-----------|
| `user_id` obrigatório | Toda tabela sensível tem `user_id` |
| RLS habilitado | Postgres Row Level Security em todas as tabelas |
| Context obrigatório | Toda query roda com `SET LOCAL app.user_id` |
| Proibido query sem escopo | Repositories exigem `userId` em todo método |

### 6.2 Exemplo RLS

```sql
-- Habilitar RLS
ALTER TABLE tracking_entries ENABLE ROW LEVEL SECURITY;

-- Policy: usuário só vê seus dados
CREATE POLICY "Users can only access own data" ON tracking_entries
  FOR ALL USING (user_id = current_setting('app.user_id')::uuid);
```

### 6.3 Repository com Context

```typescript
// Toda query DEVE ter userId
export interface TrackingRepositoryPort {
  save(userId: string, entry: TrackingEntry): Promise<void>;
  findByUser(userId: string, filters: Filters): Promise<TrackingEntry[]>;
  // NUNCA: findAll() sem userId
}
```

### 6.4 Rate Limiting Distribuído

Para ambientes com múltiplas instâncias (Railway, Vercel), usar storage Redis:

#### Dependência

```bash
pnpm --filter api add @nest-lab/throttler-storage-redis ioredis
```

#### Configuração

```typescript
// apps/api/src/app.module.ts
import { ThrottlerModule } from '@nestjs/throttler';
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

ThrottlerModule.forRoot({
  throttlers: [
    { name: 'short', ttl: 1000, limit: 10 },
    { name: 'medium', ttl: 60000, limit: 100 },
    { name: 'long', ttl: 3600000, limit: 1000 },
  ],
  storage: new ThrottlerStorageRedisService(redis),
}),
```

#### ThrottlerBehindProxyGuard

Para apps atrás de proxy (Railway, Vercel), extrair IP real do `X-Forwarded-For`:

```typescript
// apps/api/src/common/guards/throttler-behind-proxy.guard.ts
import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

@Injectable()
export class ThrottlerBehindProxyGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    // Extrair IP do X-Forwarded-For quando atrás de proxy
    return req.ips.length ? req.ips[0] : req.ip;
  }
}
```

#### Rate Limits por Plano

Conforme `SYSTEM_SPECS.md` §2.6:

| Plano | Msg/minuto | Msg/hora | Msg/dia |
|-------|------------|----------|---------|
| Free | 5 | 30 | 20 |
| Pro | 10 | 100 | 100 |
| Premium | 20 | Ilimitado | Ilimitado |

```typescript
// Decorator customizado por plano
@Injectable()
export class ChatThrottlerGuard extends ThrottlerBehindProxyGuard {
  protected async getLimit(context: ExecutionContext): Promise<number> {
    const user = context.switchToHttp().getRequest().user;
    const limits = {
      free: { minute: 5, hour: 30, day: 20 },
      pro: { minute: 10, hour: 100, day: 100 },
      premium: { minute: 20, hour: Infinity, day: Infinity },
    };
    return limits[user.plan]?.minute ?? limits.free.minute;
  }
}
```

---

## 7) Jobs e Filas (BullMQ)

### 7.1 Filas Definidas

| Fila | Propósito | Prioridade |
|------|-----------|------------|
| `morning-summary` | Resumo da manhã | Alta |
| `weekly-report` | Relatório semanal | Média |
| `memory-consolidation` | Consolidar memória do usuário (ADR-012) | Média |
| `sync-calendar` | Sync Google Calendar | Média |
| `proactive-checkin` | Check-ins proativos | Baixa |
| `notifications` | Envio de notificações | Alta |
| `cleanup-onboarding` | Limpeza de onboardings abandonados (30d) | Baixa |

### 7.2 Idempotência (Obrigatório)

```typescript
// jobId DEVE ser determinístico
const jobId = `morning-summary:${userId}:${date.toISOString().split('T')[0]}`;

await queue.add(
  { userId },
  {
    jobId, // Mesmo jobId = job ignorado se já existe
    attempts: 3,
    backoff: { type: 'exponential', delay: 1000 },
  },
);
```

### 7.3 Categorização de Erros

```typescript
@Processor('sync-calendar')
export class SyncCalendarProcessor {
  @Process()
  async process(job: Job) {
    try {
      await this.syncService.sync(job.data.userId);
    } catch (error) {
      if (this.isRetryable(error)) {
        throw error; // BullMQ vai fazer retry
      }
      // Non-retryable: logar e marcar como falho
      this.logger.error('Non-retryable error', { error, jobId: job.id });
      return { failed: true, reason: error.message };
    }
  }

  private isRetryable(error: Error): boolean {
    // Rate limit, 5xx, timeout = retryable
    // Validação, credencial inválida = non-retryable
    return error.message.includes('rate limit') 
        || error.message.includes('timeout')
        || error.message.includes('5');
  }
}
```

### 7.4 Testando Jobs com Redis Real

Para testar jobs BullMQ com comportamento real, use **QueueEvents** para aguardar completion:

```typescript
import { Queue, QueueEvents, Worker } from 'bullmq';

describe('Job Integration Test', () => {
  let queue: Queue;
  let queueEvents: QueueEvents;
  let worker: Worker | null = null;

  const redisConnection = {
    host: process.env.REDIS_HOST ?? 'localhost',
    port: Number(process.env.REDIS_PORT) || 6379,
  };

  beforeAll(async () => {
    // Use queue name específico para testes (evita conflito com workers reais)
    queue = new Queue('my-job-test', { connection: redisConnection });
    queueEvents = new QueueEvents('my-job-test', { connection: redisConnection });
    await queueEvents.waitUntilReady();
  });

  afterAll(async () => {
    if (worker) await worker.close();
    await queueEvents.close();
    await queue.close();
  });

  beforeEach(async () => {
    await queue.obliterate({ force: true }); // Limpa queue entre testes
  });

  afterEach(async () => {
    if (worker) {
      await worker.close();
      worker = null;
    }
  });

  it('should process job and wait for completion', async () => {
    // Arrange: Create worker
    worker = new Worker(
      'my-job-test',
      async (job) => ({ result: 'success', data: job.data }),
      { connection: redisConnection }
    );
    await worker.waitUntilReady();

    // Act: Add job to queue
    const job = await queue.add('test-job', { userId: 'user-123' });

    // Wait: Use QueueEvents to wait for completion
    const result = await job.waitUntilFinished(queueEvents, 10000);

    // Assert
    expect(result.result).toBe('success');
  });
});
```

**Boas Práticas:**
- Use nome de queue único para testes (evita conflito com @Processor registrados)
- Sempre feche workers em `afterEach` para evitar conexões pendentes
- Use `queue.obliterate({ force: true })` para limpar queue entre testes
- Timeout generoso (10-30s) para evitar flaky tests

---

## 8) Módulo de IA (LLM Abstraction)

### 8.1 Objetivo

Trocar de LLM (Gemini ↔ Claude) mudando **apenas variáveis de ambiente**, sem alterar código.

### 8.2 Interface (Port)

```typescript
// packages/ai/src/ports/llm.port.ts

export interface LLMPort {
  chat(params: ChatParams): Promise<ChatResponse>;
  chatWithTools(params: ChatWithToolsParams): Promise<ChatWithToolsResponse>;
  stream(params: ChatParams): AsyncIterable<StreamChunk>;
  streamWithTools(params: ChatWithToolsParams): AsyncIterable<StreamChunk>;
  getInfo(): ProviderInfo;
}

export interface ChatParams {
  messages: Message[];
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface ChatResponse {
  content: string;
  usage: { inputTokens: number; outputTokens: number };
  finishReason: 'stop' | 'length' | 'tool_calls';
}

// Tool Use (ADR-012)
export interface ToolDefinition {
  name: string;
  description: string;
  parameters: ZodSchema;
  requiresConfirmation?: boolean;
  inputExamples?: Record<string, unknown>[];  // Tool Use Examples (Claude beta)
}

export interface ChatWithToolsParams extends ChatParams {
  tools: ToolDefinition[];
  toolChoice?: 'auto' | 'required' | 'none';
}

export interface ChatWithToolsResponse extends ChatResponse {
  toolCalls?: ToolCall[];
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}
```

### 8.3 Factory

```typescript
// modules/ai/infrastructure/factory/llm.factory.ts

@Injectable()
export class LLMFactory {
  constructor(
    private gemini: GeminiProvider,
    private claude: ClaudeProvider,
    private config: ConfigService,
  ) {}

  getProvider(): LLMPort {
    const provider = this.config.get('LLM_PROVIDER'); // 'gemini' | 'claude'
    return provider === 'claude' ? this.claude : this.gemini;
  }
}
```

### 8.4 Configuração via ENV

```bash
# Gemini (default)
LLM_PROVIDER=gemini
GEMINI_API_KEY=xxx
GEMINI_MODEL=gemini-flash  # Usar versão mais recente disponível

# Claude (trocar = mudar aqui)
# LLM_PROVIDER=claude
# ANTHROPIC_API_KEY=xxx
# CLAUDE_MODEL=claude-sonnet  # Usar versão mais recente disponível
```

### 8.5 Tool Use Examples (Provider-Specific)

> **Referência:** Artigo Anthropic "Advanced Tool Use" (2025) - accuracy 72% → 90%

O campo `inputExamples` na interface `ToolDefinition` melhora accuracy de tool calls fornecendo exemplos concretos de uso.

#### Disponibilidade por Provider

| Provider | Suporte | Requisitos |
|----------|---------|------------|
| Claude | ✅ Nativo | Beta header: `advanced-tool-use-2025-11-20` |
| Gemini | ❌ Workaround | Enriquecer description com exemplos inline |

#### Implementação nos Adapters

```typescript
// ClaudeAdapter - usa feature nativa (beta)
async chatWithTools(params: ChatWithToolsParams) {
  return this.client.messages.create({
    model: this.model,
    betas: ["advanced-tool-use-2025-11-20"],
    tools: params.tools.map(t => ({
      name: t.name,
      description: t.description,
      input_schema: zodToJsonSchema(t.parameters),
      input_examples: t.inputExamples,  // Passa direto para API
    })),
    messages: params.messages,
  });
}

// GeminiAdapter - enriquece description (workaround)
async chatWithTools(params: ChatWithToolsParams) {
  const enrichedTools = params.tools.map(t => ({
    functionDeclarations: [{
      name: t.name,
      description: this.enrichDescription(t.description, t.inputExamples),
      parameters: zodToJsonSchema(t.parameters),
    }],
  }));
  // ...
}

private enrichDescription(desc: string, examples?: Record<string, unknown>[]): string {
  if (!examples?.length) return desc;
  const examplesText = examples
    .map((ex, i) => `Example ${i + 1}: ${JSON.stringify(ex)}`)
    .join('\n');
  return `${desc}\n\nUsage examples:\n${examplesText}`;
}
```

#### Boas Práticas

1. **2-4 exemplos por tool** - suficiente para cobrir casos principais
2. **Mostrar parâmetros opcionais** - alguns exemplos com, outros sem
3. **Casos diferentes** - variar valores de enums (ex: `type="weight"` vs `type="expense"`)
4. **Exemplos válidos** - devem passar validação do schema Zod

Ver `AI_SPECS.md` §6.2 para exemplos completos de cada tool.

---

## 9) Docker e Ambiente Local

### 9.1 Supabase CLI para Desenvolvimento

O projeto usa Supabase CLI para desenvolvimento local (veja ADR-009). Isso fornece alta paridade com produção (Supabase Cloud) e inclui PostgreSQL, Auth API, e captura de emails.

**Portas do Supabase CLI:**

| Serviço | Porta | Descrição |
|---------|-------|-----------|
| API | 54321 | REST API e Auth (GoTrue) |
| PostgreSQL | 54322 | Banco de dados |
| Studio | 54323 | Dashboard de administração |
| Inbucket | 54324 | Captura de emails |

```bash
# Inicializar (primeira vez)
npx supabase init

# Iniciar serviços
npx supabase start

# Ver status
npx supabase status

# Parar serviços
npx supabase stop

# Resetar banco (aplica migrations)
npx supabase db reset
```

**Emails de desenvolvimento:** Em ambiente local, todos os emails (confirmação, reset de senha) são capturados no Inbucket. Acesse http://localhost:54324 para visualizar.

### 9.2 Docker Compose (Serviços Complementares)

```yaml
# infra/docker/docker-compose.yml
# PostgreSQL foi movido para Supabase CLI (npx supabase start)
# Veja ADR-009 para detalhes

name: life-assistant  # Garante volumes únicos (life-assistant_redis_data)

services:
  redis:
    # Redis 8 Alpine (versão mais recente)
    image: redis:8-alpine
    container_name: life-assistant-redis
    ports:
      - '6379:6379'
    volumes:
      - redis_data:/data
    healthcheck:
      test: ['CMD', 'redis-cli', 'ping']
      interval: 5s
      timeout: 5s
      retries: 5

  minio:
    # MinIO via Quay.io (minio/minio no Docker Hub foi descontinuado em Out/2025)
    image: quay.io/minio/minio:latest
    container_name: life-assistant-minio
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: minio
      MINIO_ROOT_PASSWORD: minio123
    ports:
      - '9000:9000'
      - '9001:9001'
    volumes:
      - minio_data:/data

volumes:
  redis_data:
  minio_data:
```

> **Nota:** O atributo `name: life-assistant` faz com que os volumes sejam criados como `life-assistant_redis_data` e `life-assistant_minio_data`, evitando conflitos com outros projetos que usem estrutura similar.

### 9.3 Configuração do Supabase

```toml
# supabase/config.toml (principais configurações)
[auth]
enabled = true
site_url = "http://127.0.0.1:3000"
additional_redirect_urls = ["http://localhost:3000/callback"]
minimum_password_length = 8

[auth.email]
enable_signup = true
enable_confirmations = true
```

### 9.4 Dockerfile do Backend (API)

```dockerfile
# apps/api/Dockerfile
# Usar Node.js LTS mais recente (verificar em https://nodejs.org)

FROM node:24-alpine AS base
RUN corepack enable pnpm

# Dependencies
FROM base AS deps
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/database/package.json ./packages/database/
COPY packages/ai/package.json ./packages/ai/
COPY packages/config/package.json ./packages/config/
COPY apps/api/package.json ./apps/api/
RUN pnpm install --frozen-lockfile

# Builder
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm turbo build --filter=api

# Runner
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/node_modules ./node_modules
COPY --from=builder /app/apps/api/package.json ./

EXPOSE 4000

# Health check endpoint (note: uses /api prefix)
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:4000/api/health || exit 1

CMD ["node", "dist/main.js"]
```

### 9.5 Dockerfile do Frontend (Web)

```dockerfile
# apps/web/Dockerfile
# Usar Node.js LTS mais recente (verificar em https://nodejs.org)

FROM node:24-alpine AS base
RUN corepack enable pnpm

# Dependencies
FROM base AS deps
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/config/package.json ./packages/config/
COPY apps/web/package.json ./apps/web/
RUN pnpm install --frozen-lockfile

# Builder
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm turbo build --filter=web

# Runner
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/apps/web/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000

CMD ["node", "server.js"]
```

---

## 10) Build e Packaging

### 10.1 Configuração tsup (Packages)

```typescript
// packages/shared/tsup.config.ts

import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  outDir: 'dist',
});
```

### 10.2 Package.json com Exports

```json
// packages/shared/package.json
{
  "name": "@life-assistant/shared",
  "version": "1.0.0",
  "type": "module",
  "main": "./dist/index.cjs",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "require": "./dist/index.cjs",
      "types": "./dist/index.d.ts"
    }
  },
  "files": ["dist"],
  "scripts": {
    "build": "tsup",
    "dev": "tsup --watch"
  }
}
```

### 10.3 Turborepo Tasks

> **Nota:** Turborepo v2+ usa `tasks` em vez de `pipeline` (sintaxe antiga v1).

```json
// turbo.json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**", "!.next/cache/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {
      "dependsOn": ["^build"]
    },
    "typecheck": {
      "dependsOn": ["^build"]
    },
    "test": {
      "dependsOn": ["build"],
      "outputs": ["coverage/**"]
    },
    "test:e2e": {
      "dependsOn": ["build"],
      "outputs": ["playwright-report/**"]
    },
    "clean": {
      "cache": false
    }
  }
}
```

---

## 11) Testes

### 11.1 Estrutura

```
apps/api/test/
├── unit/                    # Testes unitários (use cases, services)
├── integration/             # Testes de integração (repositories, APIs)
└── e2e/                     # Testes end-to-end

apps/web/
├── __tests__/               # Testes de componentes
└── e2e/                     # Testes Playwright
```

### 11.2 Estratégia

| Tipo | Ferramenta | Cobertura Mínima |
|------|------------|------------------|
| Unit | Vitest | 80% em use cases |
| Integration | Vitest + Supertest | APIs críticas |
| E2E | Playwright | Fluxos principais |

### 11.3 Padrões

```typescript
// Test naming: should_[expected]_when_[condition]
describe('RecordWeightUseCase', () => {
  it('should_record_weight_when_valid_value', async () => {
    // Arrange
    const dto = { value: 82.5 };

    // Act
    const result = await useCase.execute(userId, dto);

    // Assert
    expect(result.value).toBe(82.5);
    expect(mockRepo.save).toHaveBeenCalledTimes(1);
  });

  it('should_throw_error_when_invalid_weight', async () => {
    const dto = { value: -10 };
    await expect(useCase.execute(userId, dto)).rejects.toThrow(InvalidWeightError);
  });
});
```

### 11.4 Playwright E2E (UI)

> **Regra de ouro:** Todo milestone que inclui desenvolvimento de UI deve incluir testes Playwright correspondentes.
> Os cenários específicos são definidos durante o desenvolvimento, não antecipadamente.

#### Estrutura de Arquivos

```
apps/web/
├── e2e/
│   ├── fixtures/              # Fixtures compartilhados (auth, data)
│   │   └── auth.fixture.ts
│   ├── pages/                 # Page Object Models
│   │   ├── login.page.ts
│   │   ├── dashboard.page.ts
│   │   └── chat.page.ts
│   ├── specs/                 # Arquivos de teste
│   │   ├── auth.spec.ts
│   │   ├── tracking.spec.ts
│   │   └── chat.spec.ts
│   └── utils/                 # Helpers e utilitários
│       └── test-utils.ts
├── playwright.config.ts       # Configuração do Playwright
└── package.json
```

#### Configuração Base

```typescript
// apps/web/playwright.config.ts

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e/specs',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html', { open: 'never' }],
    ['list'],
  ],

  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    // Setup: autenticação compartilhada
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
    },

    // Browsers
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['setup'],
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
      dependencies: ['setup'],
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
      dependencies: ['setup'],
    },

    // Mobile
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
      dependencies: ['setup'],
    },
  ],

  // Dev server
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
```

#### Convenções de Nomenclatura

| Tipo | Padrão | Exemplo |
|------|--------|---------|
| Arquivo de teste | `{feature}.spec.ts` | `auth.spec.ts`, `tracking.spec.ts` |
| Page Object | `{page}.page.ts` | `login.page.ts`, `dashboard.page.ts` |
| Fixture | `{name}.fixture.ts` | `auth.fixture.ts` |
| Describe | Funcionalidade em português | `'Autenticação'`, `'Registro de Peso'` |
| Test case | `should_[ação]_when_[condição]` | `should_redirect_to_dashboard_when_login_success` |

#### Exemplo de Teste

```typescript
// apps/web/e2e/specs/auth.spec.ts

import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/login.page';

test.describe('Autenticação', () => {
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    await loginPage.goto();
  });

  test('should_redirect_to_dashboard_when_login_success', async ({ page }) => {
    // Arrange
    const credentials = { email: 'test@example.com', password: 'password123' };

    // Act
    await loginPage.login(credentials.email, credentials.password);

    // Assert
    await expect(page).toHaveURL('/dashboard');
    await expect(page.getByTestId('welcome-message')).toBeVisible();
  });

  test('should_show_error_when_invalid_credentials', async ({ page }) => {
    // Arrange
    const credentials = { email: 'test@example.com', password: 'wrong' };

    // Act
    await loginPage.login(credentials.email, credentials.password);

    // Assert
    await expect(page.getByTestId('error-message')).toContainText('Credenciais inválidas');
    await expect(page).toHaveURL('/login');
  });
});
```

#### Page Object Model

```typescript
// apps/web/e2e/pages/login.page.ts

import { Page, Locator } from '@playwright/test';

export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.getByTestId('email-input');
    this.passwordInput = page.getByTestId('password-input');
    this.submitButton = page.getByTestId('login-button');
    this.errorMessage = page.getByTestId('error-message');
  }

  async goto() {
    await this.page.goto('/login');
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }
}
```

#### Comandos

```bash
# Rodar todos os testes E2E
pnpm --filter web test:e2e

# Rodar testes E2E em modo UI (debug)
pnpm --filter web test:e2e:ui

# Rodar testes específicos
pnpm --filter web test:e2e -- --grep "Autenticação"

# Gerar relatório HTML
pnpm --filter web test:e2e:report
```

#### Scripts no package.json

```json
// apps/web/package.json
{
  "scripts": {
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:report": "playwright show-report",
    "test:e2e:codegen": "playwright codegen localhost:3000"
  }
}
```

#### Regras de Desenvolvimento

| Regra | Descrição |
|-------|-----------|
| **UI nova = teste novo** | Todo componente de página/fluxo novo deve ter teste E2E |
| **Page Object obrigatório** | Usar POM para páginas com múltiplos testes |
| **data-testid** | Usar `data-testid` para seletores, nunca classes CSS |
| **Independência** | Cada teste deve ser independente e idempotente |
| **CI obrigatório** | Testes E2E rodam no CI antes de merge |
| **Flaky = fix imediato** | Testes instáveis devem ser corrigidos ou removidos |

#### Integração com CI

```yaml
# .github/workflows/ci.yml (adicionar ao job existente)

  e2e:
    runs-on: ubuntu-latest
    needs: quality
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with:
          version: 10  # Usar LTS mais recente (verificar em https://pnpm.io)
      - uses: actions/setup-node@v4
        with:
          node-version: 24  # Usar LTS mais recente (verificar em https://nodejs.org)
          cache: 'pnpm'

      - run: pnpm install --frozen-lockfile
      - run: pnpm build

      - name: Install Playwright Browsers
        run: pnpm --filter web exec playwright install --with-deps

      - name: Run E2E Tests
        run: pnpm --filter web test:e2e
        env:
          PLAYWRIGHT_BASE_URL: http://localhost:3000

      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: apps/web/playwright-report/
          retention-days: 7
```

### 11.5 Gerenciamento de Dados de Teste

> **Referência:** ADR-013 - Test Data Management

#### IDs Determinísticos

O seed usa UUIDs fixos para garantir idempotência. Novos dados de teste devem seguir o padrão:

```typescript
// packages/database/src/seed/index.ts
export const TEST_USER_ID = '00000000-0000-4000-8000-000000000001';
export const TEST_CONVERSATION_ID = '00000000-0000-4000-8000-000000000002';
// ... continuar sequência para novos dados
export const TEST_TRACKING_WEIGHT_ID = '00000000-0000-4000-8000-000000000008';
```

| Padrão | Formato |
|--------|---------|
| Base | `00000000-0000-4000-8000-00000000000X` |
| Incremento | Usar próximo número disponível (ex: 0011, 0012...) |

#### Global Setup e Teardown

```
apps/web/e2e/setup/
├── global-setup.ts      # Cria usuários de teste e auth state
└── global-teardown.ts   # Remove usuários dinâmicos (test-*@example.com)
```

| Usuário | Email | Comportamento |
|---------|-------|---------------|
| Fixo | `test@example.com` | Preservado entre runs |
| Fixo | `onboarding@example.com` | Preservado entre runs |
| Dinâmico | `test-{timestamp}@example.com` | Removido no teardown |

#### Variáveis de Ambiente

```bash
# Pular setup/teardown (útil para debug rápido)
SKIP_GLOBAL_SETUP=true pnpm --filter web test:e2e

# Credenciais customizadas
TEST_USER_EMAIL=custom@example.com
TEST_USER_PASSWORD=custompassword
```

#### Boas Práticas

| Regra | Descrição |
|-------|-----------|
| **IDs fixos no seed** | Sempre usar IDs determinísticos para dados do seed |
| **Usuários dinâmicos** | Testes de signup devem usar padrão `test-{timestamp}@example.com` |
| **Não modificar fixos** | Nunca alterar dados dos usuários fixos em testes |
| **Cleanup automático** | O teardown remove apenas usuários dinâmicos |

---

## 12) CI/CD

### 12.1 Pipeline CI

```yaml
# .github/workflows/ci.yml

name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with:
          version: 10  # Usar LTS mais recente (verificar em https://pnpm.io)
      - uses: actions/setup-node@v4
        with:
          node-version: 24  # Usar LTS mais recente (verificar em https://nodejs.org)
          cache: 'pnpm'

      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm typecheck
      - run: pnpm test
      - run: pnpm build
```

### 12.2 Deploy

| Ambiente | Frontend | Backend |
|----------|----------|---------|
| Preview | Vercel Preview | Railway Preview |
| Production | Vercel Prod | Railway Prod |

**Regras:**
- Web nunca roda jobs pesados
- Exports sempre em storage (URLs assinadas)
- Secrets em secret manager do provedor (nunca no repo)

### 12.3 Branch Protection (Quando Tiver Time)

> **Status atual:** Desabilitado (desenvolvimento solo)
> **Ativar quando:** Time de desenvolvimento com 2+ devs

Branch protection é uma configuração do GitHub que exige PRs e aprovação de CI antes de merge. Durante desenvolvimento solo, permite-se push direto para agilidade. Esta seção documenta a configuração recomendada para quando o projeto tiver um time.

**Configuração recomendada para `main`:**
- [ ] Require pull request before merging
- [ ] Require status checks to pass before merging
  - [ ] CI workflow (quality + e2e jobs)
- [ ] Require conversation resolution before merging
- [ ] Do not allow bypassing the above settings

**Configuração recomendada para `develop`:**
- [ ] Require status checks to pass before merging
  - [ ] CI workflow (quality job)
- [ ] Allow force pushes (para rebase)

**Como ativar:**
1. Acessar GitHub repo → Settings → Branches → Add branch ruleset
2. Definir branch pattern: `main` ou `develop`
3. Marcar as opções conforme acima
4. Save changes

**Quando ativar:**
- Ao adicionar segundo desenvolvedor ao projeto
- Ao entrar em fase de produção com usuários reais
- Quando quiser garantir code review obrigatório

---

## 13) Observabilidade

### 13.1 Sentry (Errors)

```typescript
// apps/api/src/main.ts

import * as Sentry from '@sentry/nestjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
});
```

### 13.2 Axiom (Logs)

- Dev: `stdout/stderr` (local + Docker)
- Prod: Logs enviados via drain/collector para Axiom
- `LOG_LEVEL`: `debug` em dev, `warn` em prod

### 13.3 Health Check

```typescript
// apps/api/src/health/health.controller.ts

@Controller('health')
export class HealthController {
  @Get()
  check() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: process.env.APP_VERSION,
    };
  }

  @Get('ready')
  async ready() {
    // Verificar conexões
    await this.db.query('SELECT 1');
    await this.redis.ping();
    return { status: 'ready' };
  }
}
```

---

## 14) ADRs (Architecture Decision Records)

### 14.1 Quando é Obrigatório Criar ADR

- Trocar auth, database, ORM, queue, framework principal
- Mudar estratégia de multi-tenant ou RLS
- Adicionar serviço separado (microservice)
- Expor API pública (REST/OpenAPI)
- Mudar provider de LLM padrão
- Adicionar dependência "grande" (> 1MB ou com lock-in)

### 14.2 Template ADR

```markdown
# ADR-XXX: [Título]

## Status
Proposed | Accepted | Deprecated | Superseded

## Contexto
[Por que essa decisão precisa ser tomada?]

## Decisão
[O que foi decidido?]

## Consequências

### Positivas
- ...

### Negativas
- ...

## Alternativas Consideradas
1. [Alternativa A]: [Por que não?]
2. [Alternativa B]: [Por que não?]
```

### 14.3 ADRs Iniciais

| ADR | Decisão | Status |
|-----|---------|--------|
| ADR-001 | Usar NestJS como framework backend | Accepted |
| ADR-002 | Usar Supabase para database e auth | Accepted |
| ADR-003 | Usar Gemini como LLM inicial | Accepted |
| ADR-004 | Usar BullMQ para job queue | Accepted |
| ADR-005 | Usar Socket.io para real-time | Accepted |
| ADR-006 | Usar jose para validação JWT | Accepted |
| ADR-007 | Usar CommonJS como sistema de módulos no NestJS | Accepted |
| ADR-008 | Database Type Encapsulation | Accepted |
| ADR-009 | Supabase CLI para desenvolvimento local | Accepted |
| ADR-010 | Soft delete para cleanup de onboardings abandonados | Accepted |

---

## 15) Definition of Done (Engenharia)

### 15.1 Checklist por PR

```markdown
## Checklist de PR

### Obrigatório
- [ ] Segue `SYSTEM_SPECS.md` (regras e defaults)
- [ ] Usa `application/use-cases` (sem lógica na UI)
- [ ] RLS/user context garantido em queries
- [ ] Logs estruturados com `userId`, `requestId`
- [ ] Sem secrets em logs/config
- [ ] Testes adicionados (unit mínimo)

### Se aplicável
- [ ] Jobs: idempotência + categorização de erro
- [ ] Audit log em ações manuais
- [ ] ADR criado (se nova dependência grande)
- [ ] Resolveu TBD? Atualizar `TBD_TRACKER.md`
- [ ] **Testes Playwright E2E para UI nova** (ver seção 11.4)
- [ ] Componentes com `data-testid` para seletores
- [ ] Documentação atualizada
```

### 15.2 Checklist por Release

```markdown
## Checklist de Release

- [ ] Todos os PRs merged passaram no CI
- [ ] Migrations testadas em staging
- [ ] Variáveis de ambiente atualizadas
- [ ] Health check passando
- [ ] Rollback plan documentado
- [ ] Changelog atualizado
```

---

## 16) Variáveis de Ambiente

```bash
# .env.example

# ============================================
# APP
# ============================================
NODE_ENV=development
PORT=4000
FRONTEND_URL=http://localhost:3000
APP_VERSION=1.0.0

# ============================================
# DATABASE (Supabase CLI local - porta 54322)
# ============================================
DATABASE_URL=postgresql://postgres:postgres@localhost:54322/postgres
SUPABASE_URL=http://localhost:54321
SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_KEY=xxx
SUPABASE_JWT_SECRET=xxx

# ============================================
# FRONTEND (Next.js public vars)
# ============================================
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx

# ============================================
# REDIS (Upstash)
# ============================================
REDIS_URL=redis://localhost:6379

# ============================================
# AI / LLM
# ============================================
LLM_PROVIDER=gemini
GEMINI_API_KEY=xxx
GEMINI_MODEL=gemini-flash  # Usar versão mais recente disponível
# ANTHROPIC_API_KEY=xxx
# CLAUDE_MODEL=claude-sonnet  # Usar versão mais recente disponível

# ============================================
# INTEGRATIONS
# ============================================
TELEGRAM_BOT_TOKEN=xxx
GOOGLE_CLIENT_ID=xxx
GOOGLE_CLIENT_SECRET=xxx
STRIPE_SECRET_KEY=xxx
STRIPE_WEBHOOK_SECRET=xxx

# ============================================
# STORAGE (Cloudflare R2)
# ============================================
R2_ACCOUNT_ID=xxx
R2_ACCESS_KEY_ID=xxx
R2_SECRET_ACCESS_KEY=xxx
R2_BUCKET_NAME=life-assistant

# ============================================
# OBSERVABILITY
# ============================================
SENTRY_DSN=xxx
AXIOM_TOKEN=xxx
AXIOM_DATASET=life-assistant
LOG_LEVEL=debug

# ============================================
# EMAIL
# ============================================
RESEND_API_KEY=xxx
```

---

## 17) Troubleshooting

### 17.1 Problemas Comuns - Frontend (Web)

#### Dev Server Não Inicia

**Sintomas:**
- `Error: listen EADDRINUSE: address already in use :::3000`
- Server trava durante startup

**Soluções:**
1. Verificar se porta 3000 está disponível: `lsof -i :3000`
2. Matar processo existente: `kill -9 $(lsof -t -i:3000)`
3. Limpar cache do Next.js: `rm -rf apps/web/.next`
4. Reinstalar dependências: `pnpm install`

#### Testes Playwright Falhando

**Sintomas:**
- `browserType.launch: Executable doesn't exist`
- Tests timeout ou falham com screenshot

**Soluções:**
1. Instalar browsers: `pnpm exec playwright install`
2. Instalar dependências do sistema (Linux): `pnpm exec playwright install-deps`
3. Garantir que dev server está rodando na porta 3000
4. Verificar `baseURL` em `playwright.config.ts`
5. Rodar com UI mode para debug: `pnpm --filter web test:e2e:ui`

#### Tema Não Persiste

**Sintomas:**
- Tema reseta para light/dark ao recarregar página
- Flash of unstyled content (FOUC)

**Soluções:**
1. Verificar localStorage: Abrir DevTools → Application → Local Storage → `theme` key
2. Verificar `ThemeProvider` em `app/layout.tsx` tem `attribute="class"`
3. Verificar HTML tem `suppressHydrationWarning` attribute
4. Limpar localStorage e testar novamente

#### Build Falha com Module Not Found

**Sintomas:**
- `Module not found: Can't resolve '@life-assistant/...'`
- Workspace package não encontrado

**Soluções:**
1. Verificar se package foi built: `pnpm --filter <package> build`
2. Build todos packages: `pnpm build`
3. Verificar `next.config.ts` tem `transpilePackages` configurado
4. Limpar cache: `rm -rf node_modules .next && pnpm install`

### 17.2 Problemas Comuns - Backend (API)

#### Database Connection Errors

**Sintomas:**
- `ECONNREFUSED` ou `Connection timeout`
- `password authentication failed`

**Soluções:**
1. Verificar Supabase está rodando: `npx supabase status`
2. Verificar DATABASE_URL usa porta 54322: `echo $DATABASE_URL`
3. Reiniciar Supabase: `npx supabase stop && npx supabase start`
4. Testar conexão manual: `psql $DATABASE_URL`
5. Resetar banco se necessário: `npx supabase db reset`

#### Migration Errors

**Sintomas:**
- `relation "my_table" already exists`
- `column "my_column" of relation "my_table" already exists`

**Soluções:**
1. Verificar migrations aplicadas: `pnpm --filter database db:studio` → Migrations tab
2. Drop e recriar (dev only, PERDE DADOS): `pnpm --filter database db:push --force`
3. Editar migration manualmente se conflito: `packages/database/migrations/*.sql`
4. Em último caso, resetar Supabase: `npx supabase db reset`

#### RLS Policy Violations

**Sintomas:**
- `new row violates row-level security policy`
- `permission denied for table users`

**Soluções:**
1. Verificar está usando `withUserId()` ou `withUserTransaction()`:
   ```typescript
   // ❌ Errado
   const notes = await db.select().from(schema.notes);

   // ✅ Correto
   const notes = await withUserId(userId, async (db) => {
     return db.select().from(schema.notes);
   });
   ```
2. Verificar `user_id` no insert corresponde ao userId do contexto RLS
3. Verificar policies no PostgreSQL: `SELECT * FROM pg_policies WHERE tablename = 'notes';`
4. Ver `packages/database/migrations/` para policies corretas

#### TypeScript Type Errors

**Sintomas:**
- `Cannot find module 'drizzle-orm/node-postgres'`
- `The inferred type of 'db' cannot be named`

**Soluções:**
1. Usar `type Database` de `@life-assistant/database` (ver ADR-008):
   ```typescript
   // ❌ Errado
   import type { NodePgDatabase } from 'drizzle-orm/node-postgres';

   // ✅ Correto
   import { type Database } from '@life-assistant/database';
   ```
2. Build package database: `pnpm --filter database build`
3. Verificar exports em `packages/database/src/index.ts`

### 17.3 Problemas Comuns - Docker e Supabase

#### Container Não Inicia

**Sintomas:**
- `Exited (1)` ou `Exited (137)` status
- Logs mostram erro de memória

**Soluções:**
1. Verificar logs: `docker compose -f infra/docker/docker-compose.yml logs <service>`
2. Aumentar memória Docker Desktop (Settings → Resources → Memory) - Supabase requer ~2GB adicional
3. Verificar portas não estão em uso: `lsof -i :54322` (PostgreSQL), `lsof -i :6379` (Redis)
4. Recriar containers: `docker compose down && docker compose up -d`

#### Supabase Não Inicia

**Sintomas:**
- `supabase start` trava ou falha
- Containers Supabase não aparecem

**Soluções:**
1. Verificar Docker está rodando e tem memória suficiente
2. Parar e reiniciar: `npx supabase stop && npx supabase start`
3. Verificar logs: `docker logs supabase_db_life-assistant`
4. Em último caso, remover containers: `npx supabase stop --no-backup && npx supabase start`

#### Volume Permission Errors

**Sintomas:**
- `permission denied` ao escrever em volumes
- Containers não conseguem criar arquivos

**Soluções:**
1. Deletar volumes Docker e recriar (PERDE DADOS): `docker compose down -v && docker compose up -d`
2. Para Supabase: `npx supabase stop --no-backup && npx supabase start`

### 17.4 Problemas Comuns - Testes

#### Vitest Testes Falhando

**Sintomas:**
- Import errors: `Cannot find module '@life-assistant/...'`
- Tests passam local mas falham em CI

**Soluções:**
1. Build packages antes de testar: `pnpm build`
2. Verificar `vitest.config.ts` tem resolvers corretos
3. Limpar cache Vitest: `pnpm test --clearCache`
4. Rodar com coverage para debug: `pnpm test --coverage`

#### E2E Tests Flaky

**Sintomas:**
- Tests passam às vezes, falham outras
- Timeouts intermitentes

**Soluções:**
1. Aumentar timeout em `playwright.config.ts`: `timeout: 30000`
2. Adicionar `waitFor` explícitos em elementos dinâmicos
3. Usar `data-testid` em vez de seletores CSS
4. Desabilitar parallel em CI: `workers: process.env.CI ? 1 : undefined`
5. Adicionar retry: `retries: process.env.CI ? 2 : 0`

### 17.5 Recursos Adicionais

- **Logs estruturados**: Ver §13 "Observabilidade"
- **Database debugging**: `pnpm --filter database db:studio` (Drizzle Studio GUI)
- **API debugging**: Swagger docs em `http://localhost:4000/api/docs`
- **Frontend debugging**: React Query Devtools (automatically enabled in dev)

---

## 18) Evolução para Escala

### 18.1 Quando Migrar Infra

- Volume alto de jobs
- SLA B2B
- Múltiplos ambientes (staging/prod) + compliance
- Custo e controle exigirem AWS

### 18.2 Alvo AWS (Sem Refatoração)

| Serviço Atual | Serviço AWS |
|---------------|-------------|
| Railway (API) | ECS/Fargate |
| Supabase | RDS PostgreSQL |
| Upstash Redis | ElastiCache |
| Cloudflare R2 | S3 |
| Vercel | CloudFront + S3 ou ECS |

### 18.3 Evoluções Técnicas Planejadas

| Evolução | Quando |
|----------|--------|
| BullMQ → Temporal | Workflows complexos |
| Particionamento de tabelas | Quando tabela atingir >10M rows |
| Data warehouse | Quando analytics exigir |
| Microservices | Apenas se necessário (evitar) |

### 18.4 Estratégia de Particionamento

> **Status:** Planejado para futuro. Não implementar agora.

#### Tabelas Candidatas

| Tabela | Trigger | Estratégia |
|--------|---------|------------|
| `tracking_entries` | >10M rows | Partition by month (entry_date) |
| `messages` | >10M rows | Partition by month (created_at) |
| `audit_logs` | >10M rows | Partition by month (created_at) |

#### Gatilho de Implementação

Monitorar via query:

```sql
-- Verificar tamanho das tabelas candidatas
SELECT
  schemaname,
  relname,
  n_live_tup AS row_count
FROM pg_stat_user_tables
WHERE relname IN ('tracking_entries', 'messages', 'audit_logs')
ORDER BY n_live_tup DESC;
```

**Implementar particionamento quando:**
- Qualquer tabela candidata atingir >10M rows
- Query performance degradar significativamente
- Vacuum se tornar problemático

#### Exemplo de Implementação (Quando Necessário)

```sql
-- 1. Criar nova tabela particionada
CREATE TABLE tracking_entries_partitioned (
  id UUID NOT NULL,
  user_id UUID NOT NULL,
  area VARCHAR(50) NOT NULL,
  type VARCHAR(50) NOT NULL,
  value JSONB NOT NULL,
  entry_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
) PARTITION BY RANGE (entry_date);

-- 2. Criar partições por mês
CREATE TABLE tracking_entries_y2026m01 PARTITION OF tracking_entries_partitioned
  FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');

CREATE TABLE tracking_entries_y2026m02 PARTITION OF tracking_entries_partitioned
  FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');

-- 3. Criar índices em cada partição (automático no PG 11+)
CREATE INDEX idx_tracking_partitioned_user_date
  ON tracking_entries_partitioned (user_id, entry_date);

-- 4. Migrar dados (fazer em batches durante manutenção)
INSERT INTO tracking_entries_partitioned
SELECT * FROM tracking_entries
WHERE entry_date >= '2026-01-01';

-- 5. Renomear tabelas
ALTER TABLE tracking_entries RENAME TO tracking_entries_old;
ALTER TABLE tracking_entries_partitioned RENAME TO tracking_entries;

-- 6. Atualizar RLS policies
ALTER TABLE tracking_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can only access own data" ON tracking_entries
  FOR ALL USING (user_id = current_setting('app.user_id')::uuid);
```

#### Automação de Partições Futuras

```sql
-- Função para criar partições automaticamente
CREATE OR REPLACE FUNCTION create_monthly_partition()
RETURNS void AS $$
DECLARE
  next_month DATE := DATE_TRUNC('month', NOW() + INTERVAL '1 month');
  partition_name TEXT;
  start_date TEXT;
  end_date TEXT;
BEGIN
  partition_name := 'tracking_entries_y' ||
    TO_CHAR(next_month, 'YYYY') || 'm' ||
    TO_CHAR(next_month, 'MM');

  start_date := TO_CHAR(next_month, 'YYYY-MM-DD');
  end_date := TO_CHAR(next_month + INTERVAL '1 month', 'YYYY-MM-DD');

  -- Criar partição se não existir
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables
    WHERE tablename = partition_name
  ) THEN
    EXECUTE format(
      'CREATE TABLE %I PARTITION OF tracking_entries FOR VALUES FROM (%L) TO (%L)',
      partition_name, start_date, end_date
    );
    RAISE NOTICE 'Created partition: %', partition_name;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Agendar via pg_cron (mensal)
-- SELECT cron.schedule('create-partitions', '0 0 25 * *', 'SELECT create_monthly_partition()');
```

#### Considerações de Performance

| Aspecto | Impacto |
|---------|---------|
| Queries com filtro de data | ✅ Muito mais rápido (partition pruning) |
| Queries sem filtro de data | ⚠️ Pode ser mais lento (scan em todas partições) |
| INSERTs | ✅ Sem impacto significativo |
| DELETEs em massa (por mês) | ✅ Muito mais rápido (DROP partition) |
| Vacuum | ✅ Mais rápido (por partição) |
| Backup | ⚠️ Mais complexo (considerar partições) |

---

*Última atualização: 11 Janeiro 2026*
*Revisão: ADR-012 - Removidos LangChain.js e pgvector. AI usa Tool Use nativo. Job process-embeddings substituído por memory-consolidation.*
