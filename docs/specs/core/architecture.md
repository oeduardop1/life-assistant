# Architecture

> Technical foundations: architecture patterns, tech stack, code conventions, testing, and Docker setup.

---

## 1. Guard Rails — Regras Inegociáveis

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

### 1.1 Documentation Precedence

- Escopo/features: `docs/specs/README.md`
- Regras/fluxos/DoD: `docs/specs/domains/*` e `docs/specs/core/*`
- Contrato de API: `docs/specs/core/api-contract.md`
- Erros e códigos HTTP: `docs/specs/core/errors.md`
- Tech/infra: `docs/specs/core/architecture.md`
- Frontend: `docs/specs/core/frontend-architecture.md`
- Modelo de dados: `docs/specs/core/data-conventions.md`
- IA/Prompts: `docs/specs/core/ai-personality.md`
- Realtime: `docs/specs/core/realtime.md`
- Observabilidade: `docs/specs/core/observability.md`
- Importação de dados: `docs/specs/core/data-import.md`
- Integrações: `docs/specs/integrations/*`
- Priorização: `docs/milestones/`
- Pendências: `TBD_TRACKER.md`

---

## 2. Software Architecture

### 2.1 Modular Monolith + Clean Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           PRESENTATION LAYER                                 │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │  Next.js (Frontend)        │  NestJS Controllers (API)              │   │
│   │  - Pages/Components        │  - REST Endpoints                      │   │
│   │  - React Query             │  - SSE Streaming (Chat)                │   │
│   │                            │  - WebSocket Gateways (planejado)      │   │
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

### 2.2 Infrastructure Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENTS                                         │
│   ┌──────────────┐    ┌──────────────┐    ┌──────────────┐                  │
│   │   Web App    │    │   Telegram   │    │   WhatsApp   │                  │
│   │  (Next.js)   │    │     Bot      │    │   Business   │                  │
│   └──────┬───────┘    └──────┬───────┘    └──────┬───────┘                  │
└──────────┼───────────────────┼───────────────────┼──────────────────────────┘
           ▼                   ▼                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         VERCEL (Frontend)                                    │
│   Next.js (App Router) + React Query                                        │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼ REST/SSE (hoje) / WebSocket (futuro)
┌─────────────────────────────────────────────────────────────────────────────┐
│                         RAILWAY (Backend)                                    │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                           NestJS                                     │   │
│   │  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐            │   │
│   │  │ Modules   │ │ Services  │ │Controllers│ │  Guards   │            │   │
│   │  └───────────┘ └───────────┘ └───────────┘ └───────────┘            │   │
│   │  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐            │   │
│   │  │  BullMQ   │ │ SSE (Chat)│ │ Tool Use  │ │ Webhooks  │            │   │
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

## 3. Tech Stack

| Camada | Tecnologia | Justificativa |
|--------|------------|---------------|
| **Monorepo** | Turborepo | Código compartilhado, builds otimizados |
| **Frontend** | Next.js + React Query | SSR, performance, DX |
| **Backend** | NestJS | Módulos, DI, escalável com time |
| **Database** | PostgreSQL (Supabase) + Drizzle | Confiável, RLS integrado |
| **Cache** | Redis (Upstash) | Sessions, rate limit, pub/sub, queues |
| **Real-time** | SSE (Chat) + Socket.io (futuro) | Streaming do chat hoje, websockets planejados |
| **Jobs** | BullMQ | Background processing com Redis |
| **AI** | Gemini/Claude + Tool Use | LLM abstraction com function calling (ADR-012) |
| **Auth** | Supabase Auth | Social login, JWT, RLS integrado |
| **Storage** | Cloudflare R2 | Custo baixo, S3-compatible |
| **Infra** | Vercel + Railway | Managed, auto-scale |
| **Observability** | Sentry + Axiom | Erros + logs centralizados |

### 3.1 Frontend Stack

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
| Playwright | 1.57.0 | E2E testing |

### 3.2 Backend Stack

| Tecnologia | Uso |
|------------|-----|
| NestJS | Framework backend |
| TypeScript | Type safety |
| Drizzle ORM | Database ORM |
| Zod | Validação |
| BullMQ | Job queues |
| SSE (Chat) | Streaming de respostas |
| Socket.io | WebSockets (planejado) |
| jose | JWT validation (Supabase tokens) |

### 3.3 AI Stack

| Tecnologia | Uso |
|------------|-----|
| @google/genai | SDK Gemini (unified) com Function Calling |
| @anthropic-ai/sdk | SDK Claude com Tool Use |
| Zod | Validação de tool parameters |

> **Nota:** LangChain.js e pgvector foram removidos (ver ADR-012). A arquitetura usa Tool Use nativo dos LLMs.

---

## 4. Monorepo Structure

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
│   │   └── stores/
│   │
│   └── api/                          # NestJS Backend
│       ├── src/
│       │   ├── modules/              # Módulos de domínio
│       │   ├── common/               # Guards, interceptors, filters
│       │   ├── config/               # Configurações
│       │   └── jobs/                 # BullMQ processors
│       └── test/
│
├── packages/
│   ├── shared/                       # Tipos e utilitários compartilhados
│   ├── database/                     # Schema Drizzle + migrations
│   ├── ai/                           # Core de IA compartilhado
│   └── config/                       # Configurações e validação de ENV
│
├── infra/
│   └── docker/
│       └── docker-compose.yml        # Dev local
│
└── docs/
    ├── adr/                          # Architecture Decision Records
    ├── specs/                        # Specifications
    └── milestones/                   # Tasks and progress
```

### 4.1 Package Dependencies

```
┌─────────────────────────────────────────────────────────────────┐
│                         APPS LAYER                               │
│   ┌─────────────┐                    ┌─────────────┐            │
│   │  apps/web   │                    │  apps/api   │            │
│   └──────┬──────┘                    └──────┬──────┘            │
│          │ pode importar                    │ pode importar      │
│          ▼                                  ▼                    │
├─────────────────────────────────────────────────────────────────┤
│                       PACKAGES LAYER                             │
│   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│   │  database   │  │     ai      │  │   config    │            │
│   └──────┬──────┘  └──────┬──────┘  └──────┬──────┘            │
│          │ pode importar  │ pode importar  │ pode importar      │
│          ▼                ▼                ▼                    │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │                        shared                            │   │
│   │              (types, constants, utils)                   │   │
│   └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

| Package | Pode importar | NÃO pode importar |
|---------|---------------|-------------------|
| `shared` | Nada (é a base) | Qualquer outro package |
| `config` | `shared` | `database`, `ai`, apps |
| `database` | `shared`, `config` | `ai`, apps |
| `ai` | `shared`, `config` | `database`, apps |
| `apps/web` | Todos os packages | `apps/api` |
| `apps/api` | Todos os packages | `apps/web` |

---

## 5. Module Structure (NestJS)

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

### 5.1 NestJS Project Configuration

#### Sistema de Módulos: CommonJS

NestJS usa **CommonJS** como sistema de módulos (ADR-007).

```json
// apps/api/package.json - NÃO usar "type": "module"
{
  "name": "@life-assistant/api",
  "private": true
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

```json
// apps/api/nest-cli.json
{
  "compilerOptions": {
    "builder": "swc"
  }
}
```

#### Carregamento de Variáveis de Ambiente em Monorepo

```typescript
// apps/api/src/main.ts
import 'reflect-metadata';
import { config as loadEnv } from 'dotenv';
import { resolve } from 'path';

// Carrega .env da raiz do workspace (DEVE ser antes de outros imports)
loadEnv({ path: resolve(__dirname, '../../../.env') });

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
```

#### Providers com Escopo (Transient/Request)

Providers `Scope.TRANSIENT` ou `Scope.REQUEST` **não podem** ser obtidos com `app.get()`.

```typescript
// ❌ ERRADO
const logger = app.get(AppLoggerService);

// ✅ CORRETO
const logger = await app.resolve(AppLoggerService);
```

---

## 6. Code Patterns

### 6.1 TypeScript Rules

| Regra | Obrigatório |
|-------|-------------|
| `strict: true` | ✅ Sim |
| Proibido `any` sem justificativa | ✅ Sim |
| DTOs validados com Zod ou class-validator | ✅ Sim |
| Interfaces para dependências externas (Ports) | ✅ Sim |

### 6.2 Naming Conventions

| Tipo | Convenção | Exemplo |
|------|-----------|---------|
| Arquivos | kebab-case | `record-weight.use-case.ts` |
| Classes | PascalCase | `RecordWeightUseCase` |
| Interfaces | PascalCase + sufixo Port | `TrackingRepositoryPort` |
| Métodos | camelCase | `calculateScore()` |
| Constantes | SCREAMING_SNAKE_CASE | `MAX_RETRY_ATTEMPTS` |
| Enums | PascalCase | `TrackingType.WEIGHT` |

### 6.3 Error Handling

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
```

### 6.4 Logging

| Regra | Descrição |
|-------|-----------|
| Formato | JSON estruturado |
| Campos obrigatórios | `user_id`, `request_id` ou `job_id`, `timestamp` |
| Proibido | Logar secrets (keys, tokens, senhas) |
| Dev | `LOG_LEVEL=debug`, stdout |
| Prod | `LOG_LEVEL=warn`, Axiom via drain |

### 6.5 API Response Format

All API responses are wrapped in a standard format:

```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string; details?: unknown };
  meta: {
    timestamp: string;  // ISO 8601
    requestId: string;  // UUID for tracing
  };
}
```

> Erros seguem `docs/specs/core/errors.md`.

### 6.6 Package Patterns & Documentation

**Filosofia de Documentação:**
- Packages internos utilizam **documentação inline (JSDoc/TSDoc)** em vez de READMEs
- Especificações centralizadas em `core/*`, `domains/*`, `integrations/*`
- README raiz contém apenas setup essencial e comandos principais

#### Type Encapsulation Pattern (ADR-008)

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

```typescript
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

1. Exporte **tipos**, não implementações de infraestrutura
2. Exporte **factory functions** para singletons (não instâncias diretamente)
3. Exporte **constants e enums** da camada shared
4. Exporte **utilities** domain-agnostic
5. Oculte detalhes privados (ex: não exporte tipos raw de ORMs)

#### Package API Reference

**`@life-assistant/database`**
```typescript
export { getDb, getPool, closePool, withUserId, withTransaction, withUserTransaction, schema };
export type { Database, InferSelectModel, InferInsertModel };

import { getDb, withUserId, type Database } from '@life-assistant/database';

const notes = await withUserId(userId, async (db) => {
  return db.select().from(schema.notes);
});
```

**`@life-assistant/config`**
```typescript
export { loadConfig, getConfig, validateEnv, isEnvValid };
export type { EnvConfig, AppEnv, DatabaseEnv, RedisEnv, AiEnv, StorageEnv, IntegrationsEnv, ObservabilityEnv };

import { getConfig } from '@life-assistant/config';
const config = getConfig();
```

**`@life-assistant/shared`**
```typescript
export {
  LifeArea, TrackingType, VaultItemType, ExpenseCategory,
  DEFAULT_WEIGHTS, TRACKING_VALIDATIONS, RATE_LIMITS, STORAGE_LIMITS,
  formatCurrency, formatDate, normalizeText, sleep, retry,
};
```

**`@life-assistant/ai`** (M1.1 - não implementado)
```typescript
export { createLLM, type LLMPort, type LLMProvider };
```

#### Code Documentation Standards

Toda função/classe exportada de package DEVE ter JSDoc:

```typescript
/**
 * Execute uma callback com contexto RLS para um usuário específico.
 *
 * Define `request.jwt.claim.sub` no session context do PostgreSQL para que
 * auth.uid() retorne o ID do usuário e políticas RLS sejam aplicadas.
 *
 * @see https://supabase.com/docs/guides/database/postgres/row-level-security
 */
export async function withUserId<T>(
  userId: string,
  callback: (db: Database) => Promise<T>
): Promise<T> {
  // implementação...
}
```

### 6.7 Functional Rules (System)

#### Deduplicação

- Tracking entries: `user_id + type + date + value` (mesmo minuto)
- Notas: Título único por pasta (folders removidos; manter unicidade por usuário)
- Pessoas: Email ou nome+relacionamento únicos

#### Edição Manual (Sempre Auditada)

Qualquer alteração manual em dados sensíveis exige:
- Registro do valor anterior
- Registro do novo valor
- Autor (userId)
- Timestamp
- Motivo (quando aplicável)

---

## 7. Jobs & Queues (BullMQ)

### 7.1 Defined Queues

| Fila | Propósito | Prioridade |
|------|-----------|------------|
| `morning-summary` | Resumo da manhã | Alta |
| `weekly-report` | Relatório semanal | Média |
| `memory-consolidation` | Consolidar memória do usuário (ADR-012) | Média |
| `decision-followup` | Verificar decisões com follow-up pendente (ADR-016) | Média |
| `sync-calendar` | Sync Google Calendar | Média |
| `proactive-checkin` | Check-ins proativos | Baixa |
| `notifications` | Envio de notificações | Alta |
| `cleanup-onboarding` | Limpeza de onboardings abandonados (30d) | Baixa |
| `finance-reminders` | Lembretes de vencimento de contas (M2.2) | Alta |
| `finance-overdue-check` | Atualizar status de contas vencidas (M2.2) | Média |

### 7.2 Idempotency (Required)

```typescript
// jobId MUST be deterministic
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

### 7.3 Error Categorization

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
    return error.message.includes('rate limit')
        || error.message.includes('timeout')
        || error.message.includes('5');
  }
}
```

### 7.4 Testing Jobs with Real Redis

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
    await queue.obliterate({ force: true });
  });

  afterEach(async () => {
    if (worker) {
      await worker.close();
      worker = null;
    }
  });
});
```

### 7.5 Manual Job Triggering (Development)

```
pnpm --filter @life-assistant/api trigger:consolidation --trigger
pnpm --filter @life-assistant/api trigger:consolidation --trigger --wait
```

---

## 8. LLM Abstraction

### 8.1 Objective

Trocar de LLM (Gemini ↔ Claude) mudando **apenas variáveis de ambiente**, sem alterar código.

### 8.2 Interface (Port)

```typescript
export interface LLMPort {
  chat(params: ChatParams): Promise<ChatResponse>;
  chatWithTools(params: ChatWithToolsParams): Promise<ChatWithToolsResponse>;
  stream(params: ChatParams): AsyncIterable<StreamChunk>;
  streamWithTools(params: ChatWithToolsParams): AsyncIterable<StreamChunk>;
  getInfo(): ProviderInfo;
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: ZodSchema;
  requiresConfirmation?: boolean;
  inputExamples?: Record<string, unknown>[];  // Tool Use Examples (Claude beta)
}
```

### 8.3 Configuration

```bash
# Gemini (default)
LLM_PROVIDER=gemini
GEMINI_API_KEY=xxx
GEMINI_MODEL=gemini-flash

# Claude (switch = change here)
# LLM_PROVIDER=claude
# ANTHROPIC_API_KEY=xxx
# CLAUDE_MODEL=claude-sonnet
```

---

## 9. Docker & Local Dev

### 9.1 Supabase CLI

O projeto usa Supabase CLI para desenvolvimento local (ADR-009).

| Serviço | Porta | Descrição |
|---------|-------|-----------|
| API | 54321 | REST API e Auth (GoTrue) |
| PostgreSQL | 54322 | Banco de dados |
| Studio | 54323 | Dashboard de administração |
| Inbucket | 54324 | Captura de emails |

```bash
npx supabase start   # Iniciar serviços
npx supabase status  # Ver status
npx supabase stop    # Parar serviços
```

> **Nota:** Migrations são gerenciadas pelo Drizzle ORM, não pelo Supabase CLI.

### 9.2 Docker Compose (Redis + MinIO)

```yaml
# infra/docker/docker-compose.yml
name: life-assistant

services:
  redis:
    image: redis:8-alpine
    container_name: life-assistant-redis
    ports:
      - '6379:6379'
    volumes:
      - redis_data:/data

  minio:
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

---

## 10. Testing Strategy

### 10.1 Test Types

| Tipo | Ferramenta | Cobertura Mínima |
|------|------------|------------------|
| Unit | Vitest | 80% em use cases |
| Integration | Vitest + Supertest | APIs críticas |
| E2E | Playwright | Fluxos principais |

### 10.2 Test Structure

```
apps/api/test/
├── unit/                    # Testes unitários (use cases, services)
├── integration/             # Testes de integração (repositories, APIs)
└── e2e/                     # Testes end-to-end

apps/web/
├── __tests__/               # Testes de componentes
└── e2e/                     # Testes Playwright
```

### 10.3 Naming Convention

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
  });
});
```

### 10.4 E2E Rules

| Regra | Descrição |
|-------|-----------|
| **UI nova = teste novo** | Todo componente de página/fluxo novo deve ter teste E2E |
| **Page Object obrigatório** | Usar POM para páginas com múltiplos testes |
| **data-testid** | Usar `data-testid` para seletores, nunca classes CSS |
| **Independência** | Cada teste deve ser independente e idempotente |
| **CI obrigatório** | Testes E2E rodam no CI antes de merge |

### 10.5 Playwright E2E (UI)

> **Regra de ouro:** Todo milestone que inclui desenvolvimento de UI deve incluir testes Playwright correspondentes.

#### Estrutura de Arquivos

```
apps/web/
├── e2e/
│   ├── fixtures/
│   │   └── auth.fixture.ts
│   ├── pages/
│   │   ├── login.page.ts
│   │   ├── dashboard.page.ts
│   │   └── chat.page.ts
│   ├── specs/
│   │   ├── auth.spec.ts
│   │   ├── tracking.spec.ts
│   │   └── chat.spec.ts
│   └── utils/
│       └── test-utils.ts
├── playwright.config.ts
└── package.json
```

#### Configuração Base

```typescript
// apps/web/playwright.config.ts
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
    { name: 'setup', testMatch: /.*\.setup\.ts/ },
    { name: 'chromium', use: { ...devices['Desktop Chrome'] }, dependencies: ['setup'] },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] }, dependencies: ['setup'] },
    { name: 'webkit', use: { ...devices['Desktop Safari'] }, dependencies: ['setup'] },
    { name: 'mobile-chrome', use: { ...devices['Pixel 5'] }, dependencies: ['setup'] },
  ],
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
| Arquivo de teste | `{feature}.spec.ts` | `auth.spec.ts` |
| Page Object | `{page}.page.ts` | `login.page.ts` |
| Fixture | `{name}.fixture.ts` | `auth.fixture.ts` |
| Describe | Funcionalidade em português | `'Autenticação'` |
| Test case | `should_[ação]_when_[condição]` | `should_redirect_to_dashboard_when_login_success` |

#### Comandos

```bash
pnpm --filter web test:e2e
pnpm --filter web test:e2e:ui
pnpm --filter web test:e2e -- --grep "Autenticação"
pnpm --filter web test:e2e:report
```

#### Scripts no package.json

```json
{
  "scripts": {
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:report": "playwright show-report",
    "test:e2e:codegen": "playwright codegen localhost:3000"
  }
}
```

#### Integração com CI

```yaml
e2e:
  runs-on: ubuntu-latest
  needs: quality
  steps:
    - uses: actions/checkout@v4
    - uses: pnpm/action-setup@v2
      with:
        version: 10
    - uses: actions/setup-node@v4
      with:
        node-version: 24
        cache: 'pnpm'
    - run: pnpm install --frozen-lockfile
    - run: pnpm build
    - run: pnpm --filter web exec playwright install --with-deps
    - run: pnpm --filter web test:e2e
      env:
        PLAYWRIGHT_BASE_URL: http://localhost:3000
```

---

## 11. CI/CD

### 11.1 Pipeline

```yaml
# .github/workflows/ci.yml
jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm typecheck
      - run: pnpm test
      - run: pnpm build

  e2e:
    needs: quality
    steps:
      - run: pnpm exec playwright install --with-deps
      - run: pnpm --filter web test:e2e
```

### 11.2 Deployment

| Ambiente | Frontend | Backend |
|----------|----------|---------|
| Preview | Vercel Preview | Railway Preview |
| Production | Vercel Prod | Railway Prod |

### 11.3 Branch Protection

- `main` protegido
- CI obrigatório antes de merge
- Pelo menos 1 aprovação para merge

### 11.4 Definition of Done (Engenharia)

#### Checklist por PR

```markdown
## Checklist de PR

### Obrigatório
- [ ] Segue `docs/specs/*` (regras e defaults)
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
- [ ] Testes Playwright E2E para UI nova
- [ ] Componentes com `data-testid` para seletores
- [ ] Documentação atualizada
```

#### Checklist por Release

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

## 12. Observability

### 12.1 Sentry (Errors)

```typescript
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
});
```

### 12.2 Axiom (Logs)

- Dev: `stdout/stderr` (local + Docker)
- Prod: Logs enviados via drain/collector para Axiom

### 12.3 Health Check

```typescript
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
    await this.db.query('SELECT 1');
    await this.redis.ping();
    return { status: 'ready' };
  }
}
```

---

## 13. ADRs (Architecture Decision Records)

### When to Create ADR

- Trocar auth, database, ORM, queue, framework principal
- Mudar estratégia de multi-tenant ou RLS
- Adicionar serviço separado (microservice)
- Mudar provider de LLM padrão
- Adicionar dependência "grande" (> 1MB ou com lock-in)

### Existing ADRs

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
| ADR-012 | Tool Use + Memory Consolidation (não RAG) | Accepted |
| ADR-015 | Low-friction tracking philosophy | Accepted |
| ADR-016 | Decision Support system | Accepted |
| ADR-017 | Life Areas structure | Accepted |

> **Nota:** Apesar do ADR-005, o real-time **atual** de chat usa SSE. Socket.io permanece planejado.

---

## 14. Tool Call Logging

### 14.1 Structure

```typescript
interface ToolCallLog {
  id: string;           // UUID
  userId: string;       // User who triggered
  conversationId: string; // Conversation context
  toolName: string;     // Tool called
  input: object;        // Tool input (sanitized)
  output: object;       // Tool output (sanitized)
  duration: number;     // Execution time (ms)
  status: 'success' | 'error' | 'timeout';
  errorMessage?: string; // If status = error
  createdAt: Date;      // When executed
}
```

### 14.2 Sensitive Data Rules

| Rule | Description |
|------|-------------|
| **NEVER log** | Passwords, tokens, vault data, secrets |
| **ALWAYS sanitize** | PII, financial values (show ranges, not exact) |
| **Log structure, not content** | For sensitive tools like vault operations |

```typescript
// Example sanitization
function sanitizeToolInput(toolName: string, input: object): object {
  if (toolName === 'vault_access') {
    return { type: input.type, id: '[REDACTED]' };
  }
  return input;
}
```

### 14.3 What Is Logged

| Dado | Nível | Local |
|------|-------|-------|
| Tool name + userId | LOG | memory-tool-executor.service |
| search_knowledge params | DEBUG | memory-tool-executor.service |
| search_knowledge results count | DEBUG | memory-tool-executor.service |
| add_knowledge params (inclui conteúdo) | DEBUG | memory-tool-executor.service |
| add_knowledge item id | LOG | memory-tool-executor.service |
| Tool loop start | LOG | chat.service |
| Tool loop iteration | DEBUG | chat.service |
| Tool loop completion | LOG | chat.service |

### 14.4 Log Format (Exemplo)

```
[MemoryToolExecutorService] Executing tool search_knowledge for user abc-123
[MemoryToolExecutorService] search_knowledge params: query="meu salário", type=fact, area=finance, limit=10
[MemoryToolExecutorService] search_knowledge found 3 items
[ChatService] Tool loop iteration 1: 2 tool calls
[ChatService] Tool loop completed with 2 iterations, content length: 450
```

### 14.5 Sensitive Data Warning

> **ATENÇÃO:** Argumentos de tools são logados sem filtro em DEBUG level.
> Isso inclui: queries de busca, conteúdo completo de knowledge items, dados pessoais.
>
> **Mitigação atual:** DEBUG não habilitado em produção por padrão.
> **Recomendação:** Implementar filtro de dados sensíveis antes de habilitar DEBUG em prod.

### 14.6 Metadata Stored in Messages

Mensagens armazenam em `metadata`:

```typescript
{
  provider: string,
  model: string,
  iterations: number,
  toolCalls?: Array<{
    id: string,
    name: string,
    arguments: object
  }>,
  toolResults?: Array<{
    toolCallId: string,
    toolName: string,
    success: boolean,
    error?: string
  }>
}
```

### 14.7 Retention

Segue política geral de retenção de mensagens.
Não há retenção específica para tool calls.

---

## 15. Build & Packaging

### 15.1 tsup Configuration

```typescript
// packages/shared/tsup.config.ts
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  sourcemap: true,
});
```

### 15.2 Package Exports

```json
// packages/shared/package.json
{
  "name": "@life-assistant/shared",
  "exports": {
    ".": {
      "import": "./dist/index.mjs",
      "require": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  }
}
```

### 15.3 Turborepo Tasks

```json
// turbo.json
{
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {},
    "typecheck": {},
    "test": {
      "dependsOn": ["build"]
    }
  }
}
```

### 15.4 Build Order

```
shared → config → database → ai → apps/api → apps/web
```

---

## 16. ADR Template

### File: `docs/adr/ADR-XXX-title.md`

```markdown
# ADR-XXX: Title

## Status
Proposed | Accepted | Deprecated | Superseded by ADR-YYY

## Context
[Problem and constraints we're facing]

## Decision
[What we decided to do]

## Consequences

### Positive
- [Benefit 1]
- [Benefit 2]

### Negative
- [Downside 1]
- [Downside 2]

### Neutral
- [Side effect 1]

## References
- [Link to discussion]
- [Link to documentation]
```

---

## 17. Environment Variables

### 17.1 Required

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection | `postgres://user:pass@host:5432/db` |
| `REDIS_URL` | Redis connection | `redis://host:6379` |
| `SUPABASE_URL` | Supabase project URL | `https://xxx.supabase.co` |
| `SUPABASE_ANON_KEY` | Supabase anon key | `eyJ...` |
| `SUPABASE_SERVICE_KEY` | Supabase service key (server only) | `eyJ...` |
| `LLM_PROVIDER` | LLM provider (`gemini` or `claude`) | `gemini` |
| `GEMINI_API_KEY` | Google AI API key | `AIza...` |

### 17.2 Optional

| Variable | Default | Description |
|----------|---------|-------------|
| `LOG_LEVEL` | `info` | Logging level |
| `PORT` | `3001` | API port |
| `CORS_ORIGIN` | `*` | CORS origins |
| `SENTRY_DSN` | - | Sentry error tracking |
| `TELEGRAM_BOT_TOKEN` | - | Telegram integration |
| `STRIPE_SECRET_KEY` | - | Stripe payments |

### 17.3 Per Environment

| Variable | Development | Production |
|----------|-------------|------------|
| `LOG_LEVEL` | `debug` | `warn` |
| `DATABASE_URL` | `postgres://...localhost` | `postgres://...supabase.co` |
| `NODE_ENV` | `development` | `production` |

### 17.4 `.env.example` (Referência Completa)

```bash
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

## 18. Troubleshooting

### 18.1 Database Connection

**Symptoms:** Connection refused, timeout, SSL errors

**Solutions:**
```bash
# Check connection
psql $DATABASE_URL -c "SELECT 1"

# Reset Supabase local
npx supabase stop && npx supabase start

# Check pooler mode
# Use ?pgbouncer=true for connection pooling
```

### 18.2 Redis Connection

**Symptoms:** ECONNREFUSED, timeout

**Solutions:**
```bash
# Check Redis is running
docker ps | grep redis

# Test connection
redis-cli -u $REDIS_URL ping

# Restart
docker-compose -f infra/docker/docker-compose.yml restart redis
```

### 18.3 Build Failures

**Symptoms:** TypeScript errors, missing dependencies

**Solutions:**
```bash
# Clean and rebuild
pnpm clean && pnpm install && pnpm build

# Check Turborepo cache
rm -rf .turbo node_modules/.cache

# Rebuild specific package
pnpm --filter @life-assistant/shared build
```

### 18.4 Memory Issues

**Symptoms:** JavaScript heap out of memory

**Solutions:**
```bash
# Increase Node memory
NODE_OPTIONS=--max-old-space-size=4096 pnpm build

# For Next.js
NEXT_TELEMETRY_DISABLED=1 NODE_OPTIONS=--max-old-space-size=4096 pnpm build
```

### 18.5 Frontend (Web)

#### Dev Server Não Inicia

**Sintomas:** `EADDRINUSE: address already in use :::3000`

**Soluções:**
- Finalizar processo na porta 3000
- Trocar porta (`PORT=3001 pnpm --filter web dev`)

#### Testes Playwright Falhando

**Soluções:**
- Instalar browsers: `pnpm --filter web exec playwright install --with-deps`
- Definir `PLAYWRIGHT_BASE_URL`
- Aumentar timeout em CI

#### Tema Não Persiste

**Soluções:**
- Garantir provider de tema no root
- Validar armazenamento local/cookies

#### Build Falha com Module Not Found

**Soluções:**
- `pnpm clean && pnpm install`
- Verificar paths no `tsconfig.json`

### 18.6 Backend (API)

#### Database Connection Errors

**Soluções:**
- Validar `.env` (DATABASE_URL, SUPABASE_URL)
- `pnpm infra:up` ou `npx supabase start`

#### Migration Errors

**Soluções:**
- `pnpm --filter database db:migrate`
- Verificar SQL gerado e RLS

#### RLS Policy Violations

**Soluções:**
- Usar `withUserId()` ou `withUserTransaction()` helpers (set `request.jwt.claim.sub`)
- Conferir policies em `core/data-conventions.md`

#### TypeScript Type Errors

**Soluções:**
- Atualizar tipos compartilhados
- Rodar `pnpm typecheck`

### 18.7 Docker e Supabase

#### Container Não Inicia

- Verificar conflitos de porta
- `pnpm infra:down` e reiniciar

#### Supabase Não Inicia

- Atualizar CLI (`npx supabase --version`)
- Ver logs `npx supabase status`

#### Volume Permission Errors

- Remover volumes locais e reiniciar

### 18.8 Testes

#### Vitest Testes Falhando

- Verificar variáveis de ambiente
- Rodar `pnpm test` isolado

#### E2E Tests Flaky

- Usar trace e screenshots
- Garantir dados determinísticos

### 18.9 Recursos Adicionais

- README (setup e comandos)
- Logs de CI (`.github/workflows/ci.yml`)

---

## 19. Scale Evolution Path

### 19.1 Current Architecture (Modular Monolith)

- Single NestJS application on Railway
- All modules in one process
- Horizontal scaling via Railway replicas

**Handles:** ~1,000 concurrent users

### 19.2 Phase 1: Vertical Scaling

**When:** Response times > 500ms p95

**Actions:**
- Increase Railway instance size
- Add Redis caching for hot paths
- Optimize database queries with indexes

### 19.3 Phase 2: Horizontal API Scaling

**When:** Single instance at 70% CPU

**Actions:**
- Add Railway replicas (2-4 instances)
- Ensure session affinity for WebSocket
- Move jobs to dedicated worker instances

### 19.4 Phase 3: Microservices Extraction

**When:** Team grows to 10+ engineers OR specific module needs independent scaling

**Candidates for extraction:**
1. `chat` module (high AI load)
2. `notifications` module (high volume)
3. `finance` module (complex calculations)

**Prerequisites:**
- Create ADR for each extraction
- Define clear API contracts
- Set up service mesh or API gateway

### 19.5 Metrics for Scaling Decisions

| Metric | Threshold | Action |
|--------|-----------|--------|
| API p95 latency | > 500ms | Investigate bottleneck |
| CPU usage | > 70% sustained | Scale horizontally |
| Memory usage | > 80% | Check for leaks, scale |
| Error rate | > 1% | Investigate and fix |
| Queue depth | > 1000 jobs | Add worker replicas |

### 19.6 Partitioning Strategy (Planned)

> **Status:** Planejado para futuro. Não implementar agora.

#### Candidate Tables

| Tabela | Trigger | Estratégia |
|--------|---------|------------|
| `tracking_entries` | >10M rows | Partition by month (entry_date) |
| `messages` | >10M rows | Partition by month (created_at) |
| `audit_logs` | >10M rows | Partition by month (created_at) |

#### Trigger de Implementação

```sql
SELECT
  schemaname,
  relname,
  n_live_tup AS row_count
FROM pg_stat_user_tables
WHERE relname IN ('tracking_entries', 'messages', 'audit_logs')
ORDER BY n_live_tup DESC;
```

#### Exemplo de Implementação (Quando Necessário)

```sql
CREATE TABLE tracking_entries_partitioned (
  id UUID NOT NULL,
  user_id UUID NOT NULL,
  area VARCHAR(50) NOT NULL,
  type VARCHAR(50) NOT NULL,
  value JSONB NOT NULL,
  entry_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
) PARTITION BY RANGE (entry_date);

CREATE TABLE tracking_entries_y2026m01 PARTITION OF tracking_entries_partitioned
  FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');

CREATE INDEX idx_tracking_partitioned_user_date
  ON tracking_entries_partitioned (user_id, entry_date);

ALTER TABLE tracking_entries RENAME TO tracking_entries_old;
ALTER TABLE tracking_entries_partitioned RENAME TO tracking_entries;
```

#### Automação de Partições Futuras

```sql
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
```

#### Performance Considerations

| Aspecto | Impacto |
|---------|---------|
| Queries com filtro de data | ✅ Mais rápido (partition pruning) |
| Queries sem filtro de data | ⚠️ Pode ser mais lento |
| DELETEs em massa (por mês) | ✅ Mais rápido (DROP partition) |
| Vacuum | ✅ Mais rápido (por partição) |

---

## 20. Docker Configuration

### 20.1 API Dockerfile

```dockerfile
# apps/api/Dockerfile
FROM node:20-alpine AS base

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Dependencies
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages/*/package.json ./packages/
RUN pnpm install --frozen-lockfile

# Build
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm --filter api build

# Production
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/package.json ./

EXPOSE 3001
CMD ["node", "dist/main.js"]
```

### 20.2 Web Dockerfile

```dockerfile
# apps/web/Dockerfile
FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@latest --activate

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json ./apps/web/
COPY packages/*/package.json ./packages/
RUN pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm --filter web build

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
CMD ["node", "server.js"]
```

### 20.3 Docker Compose (Full Development)

```yaml
# infra/docker/docker-compose.yml
name: life-assistant

services:
  redis:
    image: redis:8-alpine
    container_name: life-assistant-redis
    ports:
      - '6379:6379'
    volumes:
      - redis_data:/data
    healthcheck:
      test: ['CMD', 'redis-cli', 'ping']
      interval: 10s
      timeout: 5s
      retries: 5

  minio:
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
    healthcheck:
      test: ['CMD', 'curl', '-f', 'http://localhost:9000/minio/health/live']
      interval: 30s
      timeout: 20s
      retries: 3

volumes:
  redis_data:
  minio_data:
```

---

*Última atualização: 26 Janeiro 2026*
