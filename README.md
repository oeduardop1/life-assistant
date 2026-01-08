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
# Edite .env com suas credenciais

# 4. Subir servicos de desenvolvimento (PostgreSQL, Redis, MinIO)
docker compose -f infra/docker/docker-compose.yml up -d

# 5. Verificar se os servicos estao rodando
docker compose -f infra/docker/docker-compose.yml ps

# 6. Aplicar schema do banco de dados
pnpm --filter database db:push

# 7. (Opcional) Popular banco com dados de teste
pnpm --filter database db:seed

# 8. Executar em modo desenvolvimento
pnpm dev
```

## Comandos Disponiveis

```bash
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

# Database (requer Docker rodando)
pnpm --filter database db:generate  # Gerar migrations a partir do schema
pnpm --filter database db:migrate   # Aplicar migrations pendentes
pnpm --filter database db:push      # Push schema direto (dev only)
pnpm --filter database db:studio    # Abrir Drizzle Studio (GUI)
pnpm --filter database db:seed      # Popular banco com dados de teste

# Limpeza
pnpm clean                   # Limpar builds e node_modules
```

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

## Docker Services

O ambiente de desenvolvimento local inclui:

| Servico | Porta | Descricao |
|---------|-------|-----------|
| PostgreSQL | 5432 | Banco de dados com pgvector |
| Redis | 6379 | Cache e filas (BullMQ) |
| MinIO | 9000/9001 | Storage S3-compatible |
| API (dev) | 4000 | Backend NestJS (quando rodando) |

### Comandos Docker

```bash
# Subir servicos
docker compose -f infra/docker/docker-compose.yml up -d

# Ver status
docker compose -f infra/docker/docker-compose.yml ps

# Ver logs
docker compose -f infra/docker/docker-compose.yml logs -f

# Parar servicos
docker compose -f infra/docker/docker-compose.yml down

# Parar e remover volumes (CUIDADO: apaga dados)
docker compose -f infra/docker/docker-compose.yml down -v
```

### Verificar Servicos

```bash
# PostgreSQL
docker exec life-assistant-db pg_isready -U postgres

# Redis
docker exec life-assistant-redis redis-cli ping

# Verificar extensoes PostgreSQL
docker exec life-assistant-db psql -U postgres -d life_assistant -c "SELECT extname FROM pg_extension;"

# API (requer pnpm --filter api dev rodando)
curl http://localhost:4000/api/health
# Swagger docs disponivel em http://localhost:4000/api/docs
```

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

### Features Implementadas (M0.6)

- ✅ Landing page responsiva
- ✅ Dashboard com sidebar e header
- ✅ Tema dark/light com persistência
- ✅ Sidebar toggle com estado persistente
- ✅ Error boundaries e loading states
- ✅ Componentes shadcn/ui base
- ✅ Suporte Docker com standalone output

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
