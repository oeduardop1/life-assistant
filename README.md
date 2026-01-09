# Life Assistant AI

> Plataforma SaaS com IA integrada que funciona como segundo cerebro, conselheira, assistente pessoal e tracker de evolucao.

## Pre-requisitos

- **Node.js** >= 24.0.0 (LTS)
- **pnpm** >= 10.0.0
- **Docker** e Docker Compose v5+

## Setup Rapido

```bash
# 1. Clonar o repositorio
git clone https://github.com/seu-usuario/life-assistant.git
cd life-assistant

# 2. Instalar dependencias
pnpm install

# 3. Configurar variaveis de ambiente
cp .env.example .env
cp apps/web/.env.example apps/web/.env.local
# Edite os arquivos com suas credenciais (veja "Estrutura de .env" abaixo)

# 4. Iniciar toda a infraestrutura (Docker + Supabase)
pnpm infra:up

# 5. Aplicar schema do banco de dados
pnpm --filter database db:push

# 6. (Opcional) Popular banco com dados de teste
pnpm --filter database db:seed

# 7. Executar em modo desenvolvimento
pnpm dev
```

## Fluxo de Desenvolvimento Diario

```bash
# Comecar o dia
pnpm infra:up     # Inicia Redis, MinIO, PostgreSQL, Auth, Studio (~10s)
pnpm dev          # Inicia API (4000) + Web (3000)

# Durante o desenvolvimento, acesse:
# - Web App:         http://localhost:3000
# - API:             http://localhost:4000
# - API Docs:        http://localhost:4000/api/docs
# - Supabase Studio: http://localhost:54323
# - Emails (dev):    http://localhost:54324

# Terminar o dia
# Ctrl+C para parar o pnpm dev
pnpm infra:down   # Para toda a infraestrutura
```

> **Nota:** Os dados persistem entre reinicializacoes. O `infra:down` para os containers mas mantem os volumes (dados) e imagens (nao precisa baixar novamente).

## Comandos Disponiveis

```bash
# Infraestrutura (Docker + Supabase)
pnpm infra:up                # Iniciar toda a infraestrutura
pnpm infra:down              # Parar toda a infraestrutura

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
│   ├── web/                 # Next.js Frontend (M0.6)
│   └── api/                 # NestJS Backend (M0.5)
├── packages/
│   ├── shared/              # Tipos e utilitarios compartilhados
│   ├── database/            # Schema Drizzle + migrations (M0.4)
│   ├── ai/                  # Abstracao de LLM (M1.1)
│   └── config/              # Configuracoes e validacao ENV (M0.3)
├── infra/
│   └── docker/              # Docker Compose para dev local
├── docs/
│   └── adr/                 # Architecture Decision Records
└── [spec files]             # Documentacao de especificacoes
```

## Desenvolvimento Local

### Passo a Passo

```bash
# 1. Clone o repositorio
git clone https://github.com/oeduardop1/life-assistant.git
cd life-assistant

# 2. Instale as dependencias
pnpm install

# 3. Configure as variaveis de ambiente
cp .env.example .env
# Edite o .env se necessario (os valores padrao funcionam para dev local)

# 4. Inicie a infraestrutura (Docker + Supabase)
pnpm infra:up
# Aguarde ~1-2 min na primeira execucao (download de imagens Docker)

# 5. Inicie os apps (frontend + backend)
pnpm dev
# Web: http://localhost:3000
# API: http://localhost:4000
```

### Comandos de Infraestrutura

| Comando | Descricao |
|---------|-----------|
| `pnpm infra:up` | Inicia Redis, MinIO e Supabase |
| `pnpm infra:up --help` | Mostra ajuda do comando |
| `pnpm infra:down` | Para os servicos (preserva dados) |
| `pnpm infra:down --reset` | Para e **apaga todos os dados** |
| `pnpm infra:down --reset --force` | Reset sem confirmacao (para CI) |
| `pnpm infra:down --help` | Mostra todas as opcoes |

### Portas e Servicos

| Servico | Porta | Descricao |
|---------|-------|-----------|
| **Supabase API** | 54321 | REST API e Auth (GoTrue) |
| **PostgreSQL** | 54322 | Banco de dados com pgvector |
| **Supabase Studio** | 54323 | Dashboard de administracao |
| **Inbucket** | 54324 | Captura de emails de desenvolvimento |
| **Redis** | 6379 | Cache e filas (BullMQ) |
| **MinIO** | 9000/9001 | Storage S3-compatible |
| **Web (Next.js)** | 3000 | Frontend (quando rodando) |
| **API (NestJS)** | 4000 | Backend (quando rodando) |

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
curl http://localhost:4000/api/health
```

**Emails de desenvolvimento:** Em ambiente local, todos os emails (confirmacao, reset de senha) sao capturados no Inbucket. Acesse http://localhost:54324 para visualizar.

## Web App

O frontend é construído com Next.js 16, React 19, e shadcn/ui.

### Tecnologias

- **Next.js 16.1.1**: App Router, Turbopack, React 19
- **Tailwind CSS v4**: CSS-first configuration
- **shadcn/ui**: Componentes UI (new-york style)
- **TanStack Query v5**: Server state management
- **Zustand 5**: Client state com localStorage persistence
- **Playwright 1.57**: E2E testing

### Acessar

```bash
# Desenvolvimento
pnpm --filter web dev              # http://localhost:3000

# Build produção
pnpm --filter web build
pnpm --filter web start

# Testes E2E
pnpm --filter web test:e2e
```

### Features Implementadas

**Web App (M0.6):**
- ✅ Landing page responsiva
- ✅ Dashboard com sidebar e header
- ✅ Tema dark/light com persistência
- ✅ Sidebar toggle com estado persistente
- ✅ Error boundaries e loading states
- ✅ Componentes shadcn/ui base
- ✅ Suporte Docker com standalone output

**Autenticação (M0.7):**
- ✅ Signup com email/senha
- ✅ Login com validação
- ✅ Verificação de email
- ✅ Recuperação de senha
- ✅ Logout funcional
- ✅ Proteção de rotas via middleware

**Onboarding (M0.8):**
- ✅ Wizard de 4 etapas (Perfil, Áreas, Telegram, Tutorial)
- ✅ 2 etapas obrigatórias, 2 opcionais com skip
- ✅ Persistência de progresso parcial
- ✅ Job de cleanup de onboardings abandonados (30 dias)
- ✅ Redirect automático baseado em status do usuário

Veja `ENGINEERING.md` §2.2 para documentação técnica completa do frontend.

## Documentacao

| Documento | Descricao |
|-----------|-----------|
| `PRODUCT_SPECS.md` | O que o app faz, features, personas |
| `SYSTEM_SPECS.md` | Regras de negocio, fluxos, Definition of Done |
| `ENGINEERING.md` | Stack tecnica, arquitetura, padroes |
| `DATA_MODEL.md` | Schema do banco, tabelas, relacionamentos |
| `AI_SPECS.md` | Comportamento da IA, prompts, RAG |
| `INTEGRATIONS_SPECS.md` | APIs externas (Telegram, Stripe, Calendar) |
| `MILESTONES.md` | Roadmap de desenvolvimento |
| `TBD_TRACKER.md` | Decisoes pendentes |

## Licenca

Projeto privado. Todos os direitos reservados.
