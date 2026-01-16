# Life Assistant AI

[![CI](https://github.com/oeduardop1/life-assistant/actions/workflows/ci.yml/badge.svg)](https://github.com/oeduardop1/life-assistant/actions/workflows/ci.yml)
[![Deploy Web](https://github.com/oeduardop1/life-assistant/actions/workflows/deploy-web.yml/badge.svg)](https://github.com/oeduardop1/life-assistant/actions/workflows/deploy-web.yml)
[![Deploy API](https://github.com/oeduardop1/life-assistant/actions/workflows/deploy-api.yml/badge.svg)](https://github.com/oeduardop1/life-assistant/actions/workflows/deploy-api.yml)

> Plataforma SaaS com IA integrada que funciona como memoria pessoal, conselheira, assistente e tracker de evolucao.

## Pre-requisitos

- **Node.js** >= 24.0.0 (LTS)
- **pnpm** >= 10.0.0
- **Docker** e Docker Compose v5+

## Setup Rapido

```bash
# 1. Clonar o repositorio
git clone https://github.com/oeduardop1/life-assistant.git
cd life-assistant

# 2. Instalar dependencias
pnpm install

# 3. Configurar variaveis de ambiente
cp .env.example .env
cp apps/web/.env.example apps/web/.env.local
# Edite os arquivos com suas credenciais (veja "Estrutura de .env" abaixo)

# 4. Iniciar toda a infraestrutura (Docker + Supabase + Migrations + Seed)
pnpm infra:up

# 5. Executar em modo desenvolvimento
pnpm dev
```

> O `infra:up` ja aplica as migrations do banco e executa o seed automaticamente.

## Fluxo de Desenvolvimento Diario

```bash
# Comecar o dia
pnpm infra:up     # Inicia Redis, MinIO, PostgreSQL, Auth, Studio (~60s)
pnpm dev          # Inicia API (4000) + Web (3000)

# Veja "Portas e Servicos" abaixo para URLs de acesso

# Terminar o dia
# Ctrl+C para parar o pnpm dev
pnpm infra:down   # Para toda a infraestrutura (~15s)
```

> **Nota:** Os dados persistem entre reinicializacoes. O `infra:down` para os containers mas mantem os volumes (dados) e imagens (nao precisa baixar novamente).

> **Dica:** Se o `infra:up` falhar, use `pnpm infra:up --clean` para limpar e tentar novamente.

## Comandos Disponiveis

```bash
# Infraestrutura (Docker + Supabase)
pnpm infra:up                # Iniciar toda a infraestrutura + migrations + seed
pnpm infra:up --clean        # Limpar containers zombie e iniciar (use apos falha)
pnpm infra:down              # Parar toda a infraestrutura
pnpm infra:down -rf          # Parar e apagar todos os dados (reset completo)

# Desenvolvimento
pnpm dev                     # Rodar todos os apps em modo dev
pnpm --filter web dev        # Rodar apenas o frontend
pnpm --filter api dev        # Rodar apenas o backend

# Build
pnpm build                   # Build de todos os packages e apps

# Qualidade de Codigo
pnpm lint                    # Executar ESLint
pnpm typecheck               # Verificar tipos TypeScript
pnpm format                  # Formatar codigo com Prettier
pnpm format:check            # Verificar formatacao

# Testes
pnpm test                    # Executar testes unitarios
pnpm test:e2e                # Executar testes E2E
pnpm --filter api test:integration  # Testes de integracao da API

# Database (requer infra:up rodando)
pnpm --filter database db:generate  # Gerar migrations a partir do schema
pnpm --filter database db:migrate   # Aplicar migrations pendentes
pnpm --filter database db:push      # Push schema direto (dev only)
pnpm --filter database db:studio    # Abrir Drizzle Studio (GUI)
pnpm --filter database db:seed      # Popular banco com dados de teste

# Limpeza
pnpm clean                   # Limpar builds e node_modules
```

## Testando Jobs Manualmente

Alguns jobs (como Memory Consolidation) rodam em horarios especificos (ex: 3AM).
Durante desenvolvimento, voce pode dispara-los manualmente:

```bash
# Requer: pnpm infra:up + pnpm dev rodando

# Opcao 1: Script automatico (recomendado)
pnpm --filter @life-assistant/api trigger:consolidation --trigger

# Opcao 2: Especificar usuario via variaveis de ambiente
TEST_USER_EMAIL=<email> TEST_USER_PASSWORD=<senha> pnpm --filter @life-assistant/api trigger:consolidation --trigger

# Opcao 3: Especificar usuario e aguardar conclusao do job
TEST_USER_EMAIL=<email> TEST_USER_PASSWORD=<senha> pnpm --filter @life-assistant/api trigger:consolidation --trigger --wait

# Opcao 4: Apenas obter token (para usar manualmente)
pnpm --filter @life-assistant/api trigger:consolidation

# Opcao 5: curl manual
curl -X POST http://localhost:4000/api/admin/jobs/memory-consolidation/trigger \
  -H "Authorization: Bearer <seu-token>" \
  -H "Content-Type: application/json"

# Verificar resultado no banco
# Via Supabase Studio: http://localhost:54323
# Ou via psql:
docker exec -it supabase_db_life-assistant psql -U postgres -d postgres \
  -c "SELECT * FROM memory_consolidations ORDER BY created_at DESC LIMIT 1;"
```

> **Nota:** Endpoints `/admin/*` so existem em `NODE_ENV=development`.

## Estrutura de Arquivos .env

O projeto usa arquivos `.env` separados por necessidade dos frameworks:

| Arquivo | Proposito | Lido por |
|---------|-----------|----------|
| `.env` (raiz) | Variaveis do backend (DATABASE_URL, SUPABASE_*, REDIS_*, etc) | NestJS via dotenv |
| `apps/web/.env.local` | Variaveis do frontend (NEXT_PUBLIC_*) | Next.js automaticamente |

**Por que arquivos separados?**
- O Next.js **so carrega** `.env*` do diretorio do projeto (`apps/web/`)
- O Turborepo **nao injeta** variaveis de ambiente no runtime
- Esta e a abordagem padrao para monorepos Next.js + NestJS

**Nota:** Variaveis `NEXT_PUBLIC_*` nao devem ficar no `.env` raiz (nao serao lidas pelo Next.js).

## Estrutura do Projeto

```
life-assistant/
├── apps/
│   ├── web/                 # Next.js Frontend
│   └── api/                 # NestJS Backend
├── packages/
│   ├── ai/                  # Abstracao de LLM (Anthropic, Google)
│   ├── config/              # Configuracoes e validacao ENV
│   ├── database/            # Schema Drizzle + migrations
│   └── shared/              # Tipos e utilitarios compartilhados
├── supabase/                # Migrations e seeds do banco
├── infra/
│   └── docker/              # Docker Compose para dev local
├── scripts/                 # Scripts de automacao
├── docs/
│   └── adr/                 # Architecture Decision Records
└── [spec files]             # Documentacao de especificacoes
```

## Referencia de Desenvolvimento

### Portas e Servicos

| Servico | Porta | Descricao |
|---------|-------|-----------|
| **Supabase API** | 54321 | REST API e Auth (GoTrue) |
| **PostgreSQL** | 54322 | Banco de dados |
| **Supabase Studio** | 54323 | Dashboard de administracao |
| **Inbucket** | 54324 | Captura de emails de desenvolvimento |
| **Redis** | 6379 | Cache e filas (BullMQ) |
| **MinIO** | 9000/9001 | Storage S3-compatible |
| **Web (Next.js)** | 3000 | Frontend (quando rodando) |
| **API (NestJS)** | 4000 | Backend (quando rodando) |

### Observabilidade

- **Sentry**: Error tracking e performance monitoring configurado em ambos apps (web e api)
- **Logs**: Estruturados via `AppLoggerService` no backend

### Comandos Uteis

```bash
# Ver status do Supabase
npx supabase status

# Resetar banco (aplica todas migrations do Supabase)
npx supabase db reset

# Ver logs do Docker
docker compose -f infra/docker/docker-compose.yml logs -f

# Verificar Redis
docker exec life-assistant-redis redis-cli ping

# Verificar API (requer pnpm dev rodando)
curl http://localhost:4000/api/health        # Liveness check (basico)
curl http://localhost:4000/api/health/ready  # Readiness check (com dependencias)
```

### API Documentation (Swagger)

Em desenvolvimento, a documentacao da API esta disponivel via Swagger UI:

```bash
# Acesse enquanto o backend estiver rodando (pnpm dev)
open http://localhost:4000/api/docs
```

> **Nota:** Swagger so esta disponivel em `NODE_ENV=development`. Em producao, use a spec OpenAPI gerada localmente.

**Emails de desenvolvimento:** Em ambiente local, todos os emails (confirmacao, reset de senha) sao capturados no Inbucket. Acesse http://localhost:54324 para visualizar.

### Opcoes de Infraestrutura

Os scripts `infra:up` e `infra:down` possuem opcoes avancadas para diferentes cenarios.

**Iniciar (`pnpm infra:up`)**

| Flag | Descricao |
|------|-----------|
| `--clean, -c` | Limpa containers zombie antes de iniciar (use apos falha) |
| `--timeout, -t N` | Timeout em segundos (default: 120) |
| `--verbose, -v` | Mostra output detalhado para debug |
| `--skip-migrations` | Pula migrations e seed do banco |
| `--help, -h` | Mostra todas as opcoes |

**Parar (`pnpm infra:down`)**

| Flag | Descricao |
|------|-----------|
| `--reset, -r` | Para e **apaga todos os dados** (volumes) |
| `--force, -f` | Sem confirmacao (para CI/scripts) |
| `--timeout, -t N` | Timeout em segundos (default: 30) |
| `--verbose, -v` | Mostra output detalhado para debug |
| `--help, -h` | Mostra todas as opcoes |

**Exemplos**

```bash
# Iniciar apos falha anterior (recomendado)
pnpm infra:up --clean

# Iniciar com timeout maior e debug
pnpm infra:up -t 180 -v

# Reset completo sem confirmacao (CI)
pnpm infra:down -rf

# Ver todas as opcoes
pnpm infra:up --help
pnpm infra:down --help
```

**Troubleshooting**

| Problema | Solucao |
|----------|---------|
| Timeout ao iniciar | `pnpm infra:up --clean` |
| Portas em uso | `pnpm infra:down -rf && pnpm infra:up` |
| Containers zombie | `pnpm infra:up -c` |
| Ver o que esta acontecendo | Adicione `-v` ao comando |

### Setup de Producao

Script interativo para configurar variaveis de ambiente em Vercel, Railway e GitHub:

```bash
pnpm setup:prod          # Setup completo interativo
pnpm setup:prod:dry      # Preview sem executar mudancas
pnpm setup:prod:check    # Verificar status atual das variaveis
pnpm setup:vercel        # Configurar apenas Vercel
pnpm setup:railway       # Configurar apenas Railway
```

**Pre-requisitos:** CLIs instalados e autenticados (`vercel login`, `railway login`, `gh auth login`).

Veja `DEPLOYMENT.md` para guia completo de deploy.

## Web App

O frontend e construido com Next.js, React, e shadcn/ui.

### Tecnologias

- **Next.js**: App Router, Turbopack, React 19
- **Tailwind CSS**: CSS-first configuration
- **shadcn/ui**: Componentes UI (new-york style)
- **TanStack Query**: Server state management
- **Zustand**: Client state com localStorage persistence
- **Playwright**: E2E testing

### Acessar

```bash
# Desenvolvimento
pnpm --filter web dev              # http://localhost:3000

# Build producao
pnpm --filter web build
pnpm --filter web start

# Testes E2E
pnpm --filter web test:e2e
```

### Status do Projeto

Veja `MILESTONES.md` para lista completa de features implementadas e roadmap.

**Milestones concluidos:** Veja `MILESTONES.md` para status atual.

Veja `ENGINEERING.md` §2.2 para documentacao tecnica completa do frontend.

## API (Backend)

O backend e construido com NestJS seguindo Clean Architecture.

### Tecnologias

- **NestJS**: Framework Node.js enterprise-grade
- **Drizzle ORM**: Type-safe database access
- **BullMQ**: Job queues com Redis
- **Zod**: Runtime validation
- **Vitest**: Unit e integration testing

### Endpoints Principais

| Modulo | Prefixo | Descricao |
|--------|---------|-----------|
| Auth | `/api/auth` | Autenticacao e sessoes |
| Onboarding | `/api/onboarding` | Fluxo de onboarding |
| Memory | `/api/memory` | Gestao de conhecimento |
| Chat | `/api/chat` | Conversas com IA |
| Health | `/api/health` | Health checks |

### Acessar

```bash
# Desenvolvimento
pnpm --filter api dev              # http://localhost:4000

# Build producao
pnpm --filter api build
pnpm --filter api start:prod

# Testes
pnpm --filter api test             # Unit tests
pnpm --filter api test:integration # Integration tests
```

Veja `ENGINEERING.md` §2.3 para documentacao tecnica completa do backend.

## Deploy

Para deploy em producao, consulte **[DEPLOYMENT.md](DEPLOYMENT.md)**.

| Serviço | Plataforma |
|---------|------------|
| Web (Next.js) | [Vercel](https://vercel.com) |
| API (NestJS) | [Railway](https://railway.app) |
| Database | [Supabase](https://supabase.com) |

## Documentacao

| Documento | Descricao |
|-----------|-----------|
| `PRODUCT_SPECS.md` | O que o app faz, features, personas |
| `SYSTEM_SPECS.md` | Regras de negocio, fluxos, Definition of Done |
| `ENGINEERING.md` | Stack tecnica, arquitetura, padroes |
| `DATA_MODEL.md` | Schema do banco, tabelas, relacionamentos |
| `AI_SPECS.md` | Comportamento da IA, prompts, Tool Use |
| `INTEGRATIONS_SPECS.md` | APIs externas (Telegram, Stripe, Calendar) |
| `MILESTONES.md` | Roadmap de desenvolvimento |
| `TBD_TRACKER.md` | Decisoes pendentes |
| `DEPLOYMENT.md` | Guia de deploy em producao |

## Licenca

Projeto privado. Todos os direitos reservados.
