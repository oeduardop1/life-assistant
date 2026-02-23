# Fase 4: Migração da IA para Python (v4.x)

> **Objetivo:** Migrar toda a camada de inteligência artificial (packages/ai/ + tool executors + memory workers) de TypeScript/NestJS para um serviço Python independente com FastAPI + LangGraph, seguindo o padrão Strangler Fig.
> **Referências:** `docs/ai-python-service-migration-plan.md`, `docs/adr-012-tool-use-vs-rag-analysis.md`, `docs/specs/core/architecture.md`

> **Contexto:** O ecossistema Python domina AI/ML (LangGraph, LangChain, LangSmith, scikit-learn, pandas). A implementação atual em TypeScript (`packages/ai/` — 7.677 linhas, 49 arquivos) foi adequada para o MVP mas limita a evolução para multi-agente, RAG futuro, e ferramentas avançadas de observabilidade de AI. A migração cria um serviço Python dedicado (`services/ai/`) mantendo NestJS como API REST + auth + dashboard.
>
> **Filosofia:**
> - **Strangler Fig:** Sistema TypeScript e Python coexistem via feature flag (`USE_PYTHON_AI`). Rollback instantâneo em qualquer ponto.
> - **Milestones atômicos:** Cada milestone produz um sistema funcional e testável. Nunca há estado quebrado entre milestones.
> - **LangGraph substitui, não porta:** Muitos componentes TypeScript custom (~1.639 linhas) são substituídos por primitivas LangGraph, não portados 1:1.
> - **Python independente do Turbo:** O serviço Python **NÃO** faz parte do pnpm workspace nem do Turborepo pipeline. Python é gerido 100% com ferramentas nativas (uv, ruff, mypy, pytest). O `pnpm dev` usa `concurrently` para iniciar Turbo + Python em paralelo. CI roda jobs Node e Python separados. Decisão baseada em [Turborepo multi-language docs](https://turborepo.dev/docs/guides/multi-language) e análise de trade-offs — o pattern de package.json wrapper é oficialmente suportado pelo Turbo, mas gera artefatos artificiais (node_modules, lockfile entries) sem benefício real de cache para Python.

### Insight: O que LangGraph substitui

A migração **NÃO é um port 1:1** do TypeScript. LangGraph substitui vários componentes custom:

| Componente TypeScript | Linhas | Equivalente LangGraph/LangChain | Resultado |
|---|---|---|---|
| `tool-loop.service.ts` | 310 | `create_react_agent()` (`langgraph.prebuilt`) | **Eliminado** |
| `LLMPort` interface | 245 | `ChatGoogleGenerativeAI` (`langchain-google-genai`) / `ChatAnthropic` (`langchain-anthropic`) | **Eliminado** |
| `retry.ts` + `rate-limiter.ts` | 382 | `max_retries` + `.with_retry()` + `InMemoryRateLimiter` (LangChain built-in) | **Eliminado** |
| `zod-to-gemini.ts` | 227 | `.bind_tools()` converte Pydantic → formato do provider automaticamente | **Eliminado** |
| `confirmation-state.service.ts` (Redis TTL 5min) | 475 | `interrupt()` / `Command(resume=)` (`langgraph.types`) com PostgreSQL checkpoint (`AsyncPostgresSaver`) | **Redesenhado** |
| Tool definitions (Zod schemas) | ~1.000 | Pydantic models + `@tool` decorator | **Reescrito** |

> ~1.639 linhas de `packages/ai/` não precisam ser portadas — são substituídas por primitivas LangGraph. O código Python será mais enxuto que o TypeScript equivalente.

### Inventário do código afetado

**packages/ai/ (7.677 linhas, 49 arquivos) — será DELETADO:**

| Categoria | Linhas | Arquivos | Destino |
|---|---|---|---|
| Adapters (Claude + Gemini) | 1.932 | 4 | Substituídos por `langchain-google-genai` / `langchain-anthropic` |
| Services (Factory, ToolLoop, Executor) | 1.503 | 7 | Substituídos por LangGraph `create_react_agent()` |
| Tool definitions (22 tools + schemas) | 2.159 | 27 | Reescritos como Pydantic + `@tool` decorator |
| Utilities (retry, rate-limit, zod-to-gemini) | 1.484 | 8 | Substituídos por primitivas LangChain |
| Ports/Interfaces | 245 | 1 | Eliminados (LangGraph abstrai) |
| Errors + Core | 354 | 2 | Python exception hierarchy |

**apps/api/ — código AI-related (~5.700 linhas) — será DELETADO ou SIMPLIFICADO:**

| Arquivo | Linhas | Ação |
|---|---|---|
| `chat.service.ts` | 1.232 | Simplificado para ~200L (proxy SSE) |
| `finance-tool-executor.service.ts` | 1.047 | Deletado (migra para Python) |
| `tracking-tool-executor.service.ts` | 587 | Deletado (migra para Python) |
| `memory-consolidation.processor.ts` | 557 | Simplificado para ~50L (BullMQ trigger → HTTP POST para Python) |
| `confirmation-state.service.ts` | 475 | Deletado (LangGraph interrupt) |
| `contradiction-detector.adapter.ts` | 435 | Deletado (migra para Python) |
| `context-builder.service.ts` | 337 | Deletado (migra para Python) |
| `memory-tool-executor.service.ts` | 297 | Deletado (migra para Python) |
| `consolidation-prompt.ts` | 337 | Deletado (migra para Python) |
| `contradiction-resolution.service.ts` | 311 | Deletado (migra para Python) |
| `contradiction-detector.port.ts` | 86 | Deletado (interface eliminada) |

**Total:** ~11.600 linhas deletadas + ~2.700 simplificadas (~1.800 delta removido) → ~5.000-7.000 linhas Python novas

### Paralelismo entre milestones

- M4.5 (Finance Tools) e M4.6 (Memory Tools) podem rodar **em paralelo** (ambos dependem de M4.4 mas são independentes entre si)
- M4.1 pode começar **imediatamente** sem afetar trabalho nas outras fases
- Feature flag permite **rollback instantâneo** em qualquer ponto da migração

---

## M4.1 — Python Service: Scaffold + Infra + CI 🟢

**Objetivo:** Serviço Python bootável com FastAPI, integrado no fluxo de dev local (`pnpm infra:up` + `pnpm dev`) e CI. Nenhuma lógica de AI — apenas infraestrutura.

**Referências:** `docs/ai-python-service-migration-plan.md` §3, §10

**Dependências:** Nenhuma (pode começar imediatamente)

> **Decisão arquitetural:** O serviço Python NÃO faz parte do pnpm workspace nem do Turborepo. Python é gerido com ferramentas nativas (uv, ruff, mypy, pytest). `pnpm dev` usa `concurrently` para iniciar Turbo (JS/TS) + uvicorn (Python) em paralelo. Esta decisão segue o princípio de separação de concerns — cada linguagem com seu toolchain nativo, sem artefatos artificiais.

**Tasks:**

**Scaffold do projeto Python (via CLI):**
- [x] Inicializar projeto: `uv init --app --python 3.12 services/ai`
  - Cria: `pyproject.toml`, `.python-version`, `.gitignore`, `README.md`, `main.py`
  - Flag `--no-workspace` se existir `pyproject.toml` na raiz do monorepo (evita auto-join)
- [x] Adicionar dependências runtime:
  ```bash
  cd services/ai
  uv add fastapi 'uvicorn[standard]' 'sqlalchemy[asyncio]' asyncpg langgraph langgraph-checkpoint-postgres langchain-google-genai langchain-anthropic pydantic pydantic-settings sse-starlette
  ```
- [x] Adicionar dependências dev:
  ```bash
  uv add --dev pytest pytest-asyncio ruff mypy httpx
  ```
- [x] Configurar tool settings no `pyproject.toml` (seções `[tool.ruff]`, `[tool.mypy]`, `[tool.pytest.ini_options]`)
- [x] Remover `main.py` gerado pelo scaffold e reorganizar para estrutura `app/`:
  ```
  services/ai/
  ├── app/
  │   ├── __init__.py
  │   ├── main.py          # FastAPI app + lifespan (startup/shutdown)
  │   ├── config.py         # Pydantic Settings (BaseSettings)
  │   ├── dependencies.py   # FastAPI Depends() — DB session, config
  │   └── api/
  │       ├── routes/
  │       │   └── health.py # GET /health (status + DB check)
  │       └── middleware/
  │           └── auth.py   # Service-to-service auth (Bearer token)
  ├── tests/
  ├── pyproject.toml
  ├── uv.lock
  └── .python-version
  ```
- [x] Criar `app/main.py` com FastAPI lifespan:
  - Startup: `AsyncPostgresSaver.setup()` (cria tabelas de checkpoint: `checkpoints`, `checkpoint_blobs`, `checkpoint_writes`, `checkpoint_migrations`)
  - Shutdown: dispose engine
- [x] Criar `app/config.py` com Pydantic Settings:
  - `DATABASE_URL`, `GEMINI_API_KEY`, `SERVICE_SECRET`, `ANTHROPIC_API_KEY` (opcional)
  - Loads from root `.env` via `model_config = SettingsConfigDict(env_file="../../.env")`
- [x] Criar `app/dependencies.py` — FastAPI `Depends()` com generator `yield` para DB session
- [x] Criar `app/api/routes/health.py` — GET /health (status + versão + check de DB)
- [x] Criar `app/api/middleware/auth.py` — service-to-service auth via shared secret (Bearer token)
- [x] Estender `.gitignore` gerado pelo uv: adicionar `__pycache__/`, `.mypy_cache/`, `.pytest_cache/`, `.ruff_cache/`

> **Nota:** `sse-starlette` é dependência explícita — FastAPI não tem classe SSE built-in. Usar `EventSourceResponse` para streaming.
> **Nota:** `REDIS_URL` removido da config Python — não necessário na fase inicial. Confirmação usa PostgreSQL (LangGraph checkpoints), não Redis TTL. BullMQ scheduling permanece no NestJS.

**Integração com `pnpm dev` (via `concurrently`):**
- [x] Instalar concurrently: `pnpm add -Dw concurrently`
- [x] Atualizar `package.json` root:
  ```json
  {
    "scripts": {
      "dev": "concurrently -k -p [{name}] -n turbo,ai -c blue,yellow \"turbo run dev\" \"cd services/ai && uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000\"",
      "dev:js": "turbo run dev",
      "dev:ai": "cd services/ai && uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"
    }
  }
  ```
- [x] Verificar que `Ctrl+C` mata todos os processos (flag `-k` do concurrently)
- [x] Verificar que output mostra prefixos `[turbo]` e `[ai]` no terminal

**Integração com `pnpm infra:up` (dev-start.sh):**
- [x] Adicionar porta 8000 ao `check_ports()` existente
- [x] Criar novo Step (entre Service Status e Database Schema):
  ```
  Step 4: Python AI Service Setup
    ✓ Check Python 3.12+
    ✓ Check uv package manager
    ✓ Install dependencies (uv sync)
    ✓ Python environment ready
  ```
- [x] Implementar `check_python()`:
  - Verificar `python3 --version` >= 3.12
  - Se não encontrado: mensagem com instruções de instalação
- [x] Implementar `check_uv()`:
  - Verificar `uv --version`
  - Se não encontrado: sugerir `curl -LsSf https://astral.sh/uv/install.sh | sh`
- [x] Implementar `setup_python_env()`:
  - `cd services/ai && uv sync` (cria .venv + instala deps)
  - Idempotente: <2s em runs subsequentes
  - Verificação: `uv run python -c "import fastapi; print('OK')"`
- [x] Atualizar summary final para mostrar Python AI Service URL (localhost:8000)
- [x] Renumerar steps: 1-Docker, 2-Supabase, 3-Status, **4-Python**, 5-Database

**Docker (produção + CI):**
- [x] Criar `services/ai/Dockerfile`:
  ```dockerfile
  FROM python:3.12-slim AS base
  WORKDIR /app
  RUN pip install uv

  FROM base AS deps
  COPY pyproject.toml uv.lock ./
  RUN uv sync --frozen --no-dev

  FROM base AS runner
  COPY --from=deps /app/.venv /app/.venv
  COPY app/ app/
  ENV PATH="/app/.venv/bin:$PATH"
  EXPOSE 8000
  CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
  ```
- [x] Criar `services/ai/.dockerignore` — `.venv/`, `__pycache__/`, `.git/`, `tests/`, `.mypy_cache/`
- [x] **NÃO** adicionar Python ao docker-compose.yml (Python roda nativo em dev, Docker só para produção)

**Variáveis de ambiente:**
- [x] Adicionar ao `.env.example`:
  ```bash
  # Python AI Service
  PYTHON_AI_URL=http://localhost:8000
  SERVICE_SECRET=dev-secret-change-me
  USE_PYTHON_AI=false
  ```
- [x] Adicionar `PYTHON_AI_URL` ao `packages/config/`

**CI (GitHub Actions — job separado):**
- [x] Criar `services/ai/tests/conftest.py` — fixtures base (async test client via `httpx.AsyncClient`, test DB session)
- [x] Adicionar job `python` no workflow CI:
  ```yaml
  python:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: services/ai
    steps:
      - uses: actions/checkout@v4
      - uses: astral-sh/setup-uv@v5
        with:
          python-version: "3.12"
      - run: uv sync
      - run: uv run ruff check .
      - run: uv run ruff format --check .
      - run: uv run mypy app/
      - run: uv run pytest
  ```
- [x] Job Python roda em **paralelo** com job Node (não sequencial)

**Documentação:**
- [x] Atualizar `CLAUDE.md`:
  - Requirements: adicionar `Python >=3.12, uv`
  - Commands: adicionar `pnpm dev:ai` e explicar `pnpm dev` (agora usa concurrently)
  - Estrutura do monorepo: adicionar `services/ai/`
- [x] Atualizar `DEVELOPMENT.md` (se existir) com setup Python

**Definition of Done:**
- [x] `pnpm infra:up` verifica Python, instala deps via `uv sync`
- [x] `pnpm dev` inicia web (:3000) + api (:4000) + python (:8000) em paralelo
- [x] `curl http://localhost:8000/health` retorna 200
- [x] Request sem Bearer token retorna 401
- [x] CI passa: job Node (turbo) + job Python (ruff, mypy, pytest) em paralelo
- [x] `Ctrl+C` no `pnpm dev` mata todos os processos
- [x] `services/ai/` NÃO aparece em `pnpm-workspace.yaml` nem `pnpm-lock.yaml`

### Notas

_Concluído em 2026-02-22._

**Melhorias sobre o plano original:**
- Adicionada dependência `psycopg[binary]` — necessária para `langgraph-checkpoint-postgres` funcionar sem `libpq` nativo instalado no sistema
- Dockerfile usa `COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/` em vez de `RUN pip install uv` — mais eficiente (layer de cache, sem pip)
- CI usa `astral-sh/setup-uv@v7` (plano dizia `@v5`, Context7 confirmou v7 como latest)
- `AsyncPostgresSaver.from_conn_string()` retorna context manager (`async with`) — validado via Context7 docs + source code inspection. Plano não especificava esse detalhe
- Entradas Python adicionadas no `.gitignore` root em vez de criar `.gitignore` separado em `services/ai/` (já coberto pelo root)
- `README.md` gerado pelo `uv init` removido (desnecessário)
- Auth middleware implementado como `BaseHTTPMiddleware` do Starlette com `PUBLIC_PATHS` incluindo `/health`, `/docs`, `/openapi.json`, `/redoc`
- Testes do `@life-assistant/config` e `apps/api/test/setup.ts` atualizados para incluir `SERVICE_SECRET` nos fixtures (campo obrigatório adicionado ao `envSchema`)

**Verificação local:**
- Python: ruff check (0), ruff format (15 files OK), mypy (0 issues, 11 files), pytest (5/5)
- JS/TS: typecheck (10/10), lint (5/6 — web failure preexistente), test (5/6 — web failures preexistentes)
- Health endpoint: `curl localhost:8000/health` → 200 `{"status":"ok","version":"0.1.0","database":"connected"}`
- Auth: endpoint sem Bearer → 401, `/health` sem auth → 200
- Isolamento: `services/ai/` não aparece em `pnpm-workspace.yaml` nem `pnpm-lock.yaml`
- Concurrently rodando com flags corretos (`-k -p [{name}] -n turbo,ai -c blue,yellow`)

---

## M4.2 — SQLAlchemy Data Layer + RLS 🟢

**Objetivo:** Python consegue ler/escrever no PostgreSQL com Row Level Security, mapeando tabelas do Drizzle.

**Referências:** `docs/ai-python-service-migration-plan.md` §8, `docs/specs/core/data-conventions.md`, `docs/specs/core/auth-security.md`

**Dependências:** M4.1

> **Contexto:** Drizzle (NestJS) é o source of truth para schema e migrations. SQLAlchemy models são mapeamentos passivos — não geram migrations. PostgreSQL garante integridade via constraints, foreign keys e RLS policies independente de qual ORM escreve.

**Tasks:**

**Engine + Session:**
- [x] Criar `app/db/engine.py`:
  - `create_async_engine("postgresql+asyncpg://...")` com pool config
  - `async_sessionmaker(engine, expire_on_commit=False)` — `expire_on_commit=False` obrigatório para evitar lazy-loading I/O em async
- [x] Criar `app/db/session.py` — context managers RLS-aware que executam `SET LOCAL request.jwt.claim.sub = '{user_id}'` antes de cada operação (matching NestJS `set_config('request.jwt.claim.sub', ...)` e RLS policies que usam `auth.uid()`)
  - Deve ser **obrigatório** — impossível fazer query sem user_id setado
  - Testes que tentam query sem middleware devem falhar com RLS

**Models (mapeamento passivo das tabelas Drizzle):**
- [x] Criar `app/db/models/base.py` — `DeclarativeBase` + mixins comuns (`TimestampMixin`, `SoftDeleteMixin`)
- [x] Criar `app/db/models/enums.py` — Enums Python (`StrEnum`) espelhando os PostgreSQL `CREATE TYPE` (22 enums usados pelas tabelas modeladas)
- [x] Criar `app/db/models/users.py` — `users`, `user_memories` (read-only para Python)
- [x] Criar `app/db/models/tracking.py` — `tracking_entries`, `custom_metric_definitions`, `habits`, `habit_completions`
- [x] Criar `app/db/models/finance.py` — `incomes`, `bills`, `variable_expenses`, `debts`, `debt_payments`, `investments`, `budgets`
- [x] Criar `app/db/models/memory.py` — `knowledge_items`, `memory_consolidations`
- [x] Criar `app/db/models/chat.py` — `conversations`, `messages`
- [x] Todos os `Numeric` fields com `asdecimal=False` na definição do model (retorna `float` ao invés de `Decimal`):
  ```python
  amount = mapped_column(Numeric(precision=12, scale=2, asdecimal=False))  # → float
  ```

> **NUNCA criar SQLAlchemy models para tabelas de checkpoint do LangGraph** (`checkpoints`, `checkpoint_blobs`, `checkpoint_writes`, `checkpoint_migrations`). Essas tabelas são gerenciadas exclusivamente pelo `AsyncPostgresSaver.setup()` chamado no lifespan do FastAPI (M4.1).

**Repositories:**
- [x] Criar `app/db/repositories/tracking.py` — TrackingRepository (create, find, aggregate, update, delete)
- [x] Criar `app/db/repositories/finance.py` — FinanceRepository (summary, bills, expenses, incomes, investments, debts)
- [x] Criar `app/db/repositories/memory.py` — MemoryRepository (search knowledge, add knowledge, get user memories)
- [x] Criar `app/db/repositories/chat.py` — ChatRepository (save message, get history, get conversation)
- [x] Criar `app/db/repositories/user.py` — UserRepository (get user, get settings — read-only)

**Schema Drift CI Check:**
- [x] Criar script `services/ai/scripts/check_schema_drift.py`:
  - Conecta ao DB, lê `information_schema` real
  - Compara com SQLAlchemy models declarados
  - Falha se tabela/coluna/tipo existir no DB mas não no model (ou vice-versa)
- [x] Integrar no CI: roda a cada PR que toca `packages/database/src/schema/` ou `services/ai/app/db/models/`

**Testes:**
- [x] Teste de integração: RLS impede User A de ler dados do User B
- [x] Teste de integração: DECIMAL fields retornam `float`, não `Decimal`
- [x] Teste de integração: CRUD completo em cada repository (tracking, finance, memory, chat)
- [x] Teste: session RLS rejeita session sem user_id

**Definition of Done:**
- [x] Python lê/escreve em todas as tabelas necessárias
- [x] RLS funciona: user A não vê dados de user B
- [x] DECIMAL → float em todas as queries
- [x] CI detecta schema drift quando Drizzle muda e SQLAlchemy não acompanha
- [x] Testes de integração passam

> **Riscos:**
> - DECIMAL handling: Drizzle retorna **string**, SQLAlchemy retorna **`Decimal`** por default. Solução: usar `Numeric(asdecimal=False)` em todos os money fields nos models SQLAlchemy. Testes de integração que comparam outputs dos dois ORMs para as mesmas queries.
> - RLS com SQLAlchemy async pode ter edge cases com connection pooling (`expire_on_commit=False` é obrigatório). Testar com múltiplos users concorrentes.
> - Concurrent writes: ambos os serviços escrevem na mesma tabela (ex: `tracking_entries`). Usar `ON CONFLICT` / upsert patterns. Idempotency keys para write operations via chat.

### Notas

_Concluído em 2026-02-23._

**Melhorias sobre o plano original:**
- RLS implementado como context managers em `app/db/session.py` (`get_user_session`, `get_service_session`) em vez de middleware HTTP (`app/db/middleware.py` no plano original). Context managers são mais seguros — garantem que `SET LOCAL` e a transação estejam sempre no mesmo escopo, e permitem uso direto em workers/scripts sem depender do ciclo HTTP. `get_service_session()` adicional para worker jobs que bypassam RLS via `SET LOCAL role = 'service_role'`
- 22 enums implementados (dos 30 no DB) — apenas os referenciados pelas tabelas que Python modela. Enums não utilizados (ex: `vault_item_type`, `notification_type`, `export_status`) ficam de fora até que Python precise dessas tabelas
- Colunas `metadata` nos modelos `TrackingEntry`, `Conversation` e `Message` renomeadas no Python (`entry_metadata`, `conversation_metadata`, `message_metadata`) com mapeamento explícito `mapped_column("metadata", JSON)` porque `metadata` é atributo reservado do `DeclarativeBase` do SQLAlchemy. A coluna no banco continua `metadata`
- `app/main.py` refatorado para usar `get_async_engine()` e `get_session_factory()` do novo módulo `app/db/engine`, com `session_factory` armazenado em `app.state`
- `app/dependencies.py` estendido com `get_db_session()` que injeta sessão RLS-scoped via FastAPI `Depends()`
- Schema drift check integrado no job `e2e` do CI (após migrations, antes do build) — requer Supabase rodando, por isso roda no e2e e não no job `python`
- Testes de integração (RLS + repositories) usam flag `--run-db` e são skipped automaticamente no CI sem Supabase. 16 testes unitários (models) passam sem DB

**Verificação local:**
- Python: ruff check (0 errors), ruff format (34 files OK), mypy (0 issues, 26 files), pytest (16 passed, 14 skipped)
- JS/TS: typecheck (10/10 cached) — nenhuma regressão

---

## M4.3 — LangGraph Basic Chat + NestJS Proxy 🟢

**Objetivo:** Primeira mensagem end-to-end pelo Python service: Frontend → NestJS → Python → resposta. Chat funcional sem tools.

**Referências:** `docs/ai-python-service-migration-plan.md` §2, §4, §9

**Dependências:** M4.2

> **Contexto:** Este milestone estabelece o "pipe" completo. Depois que mensagens fluem end-to-end, os milestones seguintes adicionam tools incrementalmente. O frontend NÃO muda — NestJS proxeia SSE transparentemente.

**Tasks:**

**LangGraph Core:**
- [x] Criar `app/agents/state.py` — `AgentState` TypedDict:
  ```python
  class AgentState(TypedDict):
      messages: Annotated[list, add_messages]
      user_id: str
      conversation_id: str
      current_agent: str | None
  ```
- [x] Criar `app/agents/llm.py` — LLM factory baseado em `LLM_PROVIDER` env (Gemini/Anthropic)
- [x] Criar `app/agents/domains/general.py` — agente conversacional (sem tools, só responde)
  - Usa LLM factory (model configurável via `LLM_MODEL` env, default `gemini-2.5-flash`)
- [x] Criar `app/agents/graph.py` — StateGraph básico:
  - START → general_agent → save_response → END
  - `AsyncPostgresSaver` como checkpointer (persistência de threads)
  - Import: `from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver`
  - `.setup()` chamado no lifespan do FastAPI (M4.1) — cria tabelas `checkpoints`, `checkpoint_blobs`, `checkpoint_writes`, `checkpoint_migrations`
- [x] Criar `app/agents/save_response.py` — node que salva mensagem do assistente no DB via SQLAlchemy

**Context Builder (versão simplificada):**
- [x] Criar `app/prompts/system.py` — system prompt base:
  - Nome do usuário, timezone, data atual
  - Personalidade conforme `docs/specs/core/ai-personality.md`
- [x] Criar `app/prompts/context_builder.py` (versão mínima):
  - User memories formatadas do `user_memories` table
  - Apenas campos essenciais: bio, goals, topOfMind
  - Context builder completo será expandido em M4.6

**SSE Streaming (via `sse-starlette`):**
- [x] Criar `app/api/routes/chat.py`:
  - POST `/chat/invoke` — recebe `{ user_id, conversation_id, message }`, retorna SSE stream
  - Usar `EventSourceResponse` de `sse-starlette` (FastAPI não tem SSE built-in)
  - SSE events compatíveis com formato atual do frontend:
    - `{ data: { content: "...", done: false } }` — text delta
    - `{ data: { content: "...", done: true } }` — resposta final
    - `{ data: { content: "", done: true, error: "..." } }` — erro (matching NestJS format)
- [x] Carregar histórico de mensagens do DB quando não existe checkpoint (conversas originadas no TypeScript)

**NestJS Proxy:**
- [x] Consumir `pythonAiSchema` no API module via `AppConfigService` (getters: `pythonAiUrl`, `serviceSecret`, `usePythonAi`)
- [x] Criar método `proxyToPython()` no `chat.service.ts`:
  - POST para Python `/chat/invoke` com Bearer `SERVICE_SECRET`
  - Parseia SSE stream do Python via `ReadableStream` reader e emite para o frontend
- [x] Quando `USE_PYTHON_AI=true`: proxy para Python. Quando `false`: usa lógica TypeScript atual

**Testes:**
- [x] Teste E2E: enviar mensagem simples → receber resposta via Python (SSE streaming)
- [x] Teste: save response node persiste mensagem no DB
- [x] Teste: context builder inclui user memories no system prompt
- [x] Teste: feature flag alterna corretamente entre TypeScript e Python
- [x] Teste: frontend recebe SSE events no formato esperado (sem mudanças no frontend)

**Definition of Done:**
- [x] Com `USE_PYTHON_AI=true`, chat funciona end-to-end pelo Python (sem tools)
- [x] Com `USE_PYTHON_AI=false`, sistema TypeScript continua funcionando normalmente
- [x] Frontend não percebe diferença (mesmos SSE events)
- [x] Mensagens são salvas no DB pelo Python

> **Decisão tomada:** Feature flag via environment variable (`USE_PYTHON_AI`), já definida em `packages/config/src/schemas/python-ai.ts`.

**Notas (2026-02-23):**
Implementação completa do pipe Python end-to-end. **Python (16 arquivos criados, 2 modificados):** `app/agents/` (state.py, llm.py, graph.py, save_response.py, domains/general.py) — StateGraph com `general_agent → save_response`, `AsyncPostgresSaver` checkpointer, LLM factory suportando Gemini + Anthropic via `LLM_PROVIDER` env. `app/prompts/` (system.py, context_builder.py) — system prompt completo com personalidade §4, guardrails §7 (CVV 188, Ligue 180), counselor mode §5.1, user memories (bio, occupation, family, goals, challenges, topOfMind, values, communication_style). `app/api/routes/chat.py` — POST `/chat/invoke` com `EventSourceResponse`, checkpoint-or-DB-fallback para conversas originadas no TypeScript (carrega histórico do DB se checkpoint não existe), `convert_db_messages()` com IDs preservados para dedup do `add_messages` reducer, `await request.is_disconnected()` para disconnect detection. Error SSE retorna mensagem genérica "Erro ao gerar resposta" (não vaza `str(e)` ao cliente). Modificados: `app/main.py` (build graph no lifespan + registra chat router), `app/dependencies.py` (get_checkpointer helper). Reusa código existente de M4.2: `get_user_session()` (RLS), `ChatRepository`, `UserRepository`, `get_settings()`. **NestJS (3 arquivos modificados):** `config.service.ts` (3 getters: pythonAiUrl, serviceSecret, usePythonAi), `chat.service.ts` (`AppConfigService` injetado como 1º param do constructor + feature flag check no topo de `processStreamResponse()` + `proxyToPython()` com native `fetch` + `ReadableStream` reader para SSE parsing + `reader.releaseLock()` no finally), `chat.service.spec.ts` (mock do `AppConfigService` com `usePythonAi: false`). **Testes:** 26 Python (pytest) — test_llm_factory (4), test_agents (4), test_context_builder (6), test_chat_endpoint (5), test_graph (2), conftest + existing (5). 853 NestJS (jest). Todos passando. `ruff check .` + `mypy app/` + `pnpm typecheck` + `pnpm lint` limpos.

---

## M4.4 — Tracking Tools + Habits + Confirmation Framework 🔴

**Objetivo:** Primeiros tools funcionando no Python com confirmação via `interrupt()`. Tracking é o domínio mais simples — ideal para validar o framework.

**Referências:** `docs/ai-python-service-migration-plan.md` §4.5, `docs/specs/domains/tracking.md`, `ADR-015`

**Dependências:** M4.3

> **Contexto:** O framework de confirmação com `interrupt()` / `Command(resume=)` do LangGraph (import de `langgraph.types`) substitui o sistema atual de Redis TTL (5 min) do `confirmation-state.service.ts`. A persistência passa a ser via PostgreSQL (`AsyncPostgresSaver`), sem TTL por default. Isso é uma **melhoria**: confirmações não expiram, sobrevivem a crashes do processo, e o thread pode ser retomado a qualquer momento. Este milestone valida o padrão que será usado por todos os write tools.
>
> **Mudança de infra:** Confirmation state migra de Redis (ioredis SETEX 5min) → PostgreSQL (LangGraph checkpoint tables). Python **não precisa de Redis** para confirmações.

**Tasks:**

**Confirmation Framework:**
- [ ] Criar `app/tools/common/confirmation.py`:
  - Wrapper de `interrupt()` que padroniza o formato de confirmação
  - Emite SSE event `confirmation_required` com `{ confirmationId, toolName, toolArgs, message, expiresAt }`
- [ ] Adicionar endpoint POST `/chat/resume` em `app/api/routes/chat.py`:
  - Recebe `{ thread_id, action: "confirm" | "reject" }`
  - Executa `Command(resume={"action": "confirm"})` ou `Command(resume={"action": "reject"})`
  - Retorna SSE stream com resultado
- [ ] **NestJS:** Proxy do endpoint `/confirm` para Python `/chat/resume`
- [ ] SSE event `confirmation_required` compatível com frontend atual:
  ```json
  {
    "type": "confirmation_required",
    "data": {
      "confirmationId": "uuid",
      "toolName": "record_metric",
      "toolArgs": { "type": "water", "value": 2000 },
      "message": "Registrar água: 2000ml em 2026-02-22",
      "expiresAt": "ISO string"
    }
  }
  ```
- [ ] SSE event `tool_result` após execução:
  ```json
  { "type": "tool_result", "data": { "toolName": "record_metric", "result": "...", "success": true } }
  ```

**Tracking Tools (4 tools):**
- [ ] Criar `app/tools/tracking/record_metric.py` — registra métrica (WRITE, confirmation)
  - Params: type, value, entry_date, unit (opcional), area (opcional)
  - Usa TrackingRepository para INSERT
  - Default units/areas por tipo de métrica
- [ ] Criar `app/tools/tracking/get_history.py` — histórico de métricas (READ)
  - Params: metric_type, days (opcional, default 30)
  - Retorna entries ordenadas por data
- [ ] Criar `app/tools/tracking/update_metric.py` — atualiza métrica existente (WRITE, confirmation)
  - Params: entry_id, value, entry_date (opcionais)
  - Verifica que entry pertence ao user
- [ ] Criar `app/tools/tracking/delete_metric.py` — deleta métrica (WRITE, confirmation)
  - Params: entry_id
  - Suporte a delete em batch (múltiplos IDs)

**Habit Tools (2 tools — definidos mas atualmente INATIVOS no ChatService):**
- [ ] Criar `app/tools/tracking/record_habit.py` — registra hábito (WRITE, confirmation)
  - Params: habit_name, completed, entry_date
  - Match por nome fuzzy do hábito
- [ ] Criar `app/tools/tracking/get_habits.py` — lista hábitos (READ)
  - Retorna hábitos com status de hoje

> **Nota:** `analyze_context` está mapeado para o executor `'memory'` no código (chat.service.ts:121), não tracking. Esse tool é implementado em M4.6 (Memory Tools).

**Tracking Agent:**
- [ ] Criar `app/agents/domains/tracking.py`:
  - Usa `create_react_agent()` com os 6 tools acima (4 tracking + 2 habits) (ver nota sobre deprecation em M4.7)
  - System prompt com regras de tracking (timezone, unidades default, regras de confirmação)
- [ ] Atualizar graph principal: START → general_agent → save_response (tracking agent será integrado ao routing em M4.7)
  - Por enquanto, tracking agent é invocado diretamente quando tools de tracking são necessários

**Testes:**
- [ ] Teste: record_metric com confirmação (confirm + reject)
- [ ] Teste: get_tracking_history retorna dados corretos
- [ ] Teste: update_metric verifica ownership
- [ ] Teste: delete_metric em batch
- [ ] Teste: record_habit com fuzzy match de nome
- [ ] Teste de integração: dados escritos pelo Python visíveis no dashboard NestJS (via Drizzle)
- [ ] Teste: SSE events de confirmação compatíveis com frontend
- [ ] Teste: flow completo "Registra 2L de água hoje" end-to-end

**Definition of Done:**
- [ ] "Registra 2L de água hoje" funciona end-to-end pelo Python (card de confirmação no frontend)
- [ ] Confirmação e rejeição funcionam corretamente
- [ ] Dados escritos pelo Python aparecem no dashboard
- [ ] Todos os 6 tools passam em testes isolados + integração

---

## M4.5 — Finance Tools 🔴

**Objetivo:** Todos os 11 tools financeiros migrados para Python. Maior executor em linhas de código (~1.047L no TypeScript).

**Referências:** `docs/specs/domains/finance.md`, `apps/api/src/modules/finance/application/services/finance-tool-executor.service.ts`

**Dependências:** M4.4

> **Contexto:** O `finance-tool-executor.service.ts` é o maior executor (1.047 linhas) com lógica complexa de agregação, cálculos mensais, projeções e breakdown por categoria. Requer atenção especial ao handling de DECIMAL (string no Drizzle, float no Python).

**Tasks:**

**Finance Tools — READ (9 tools):**
- [ ] Criar `app/tools/finance/get_finance_summary.py` — resumo financeiro mensal
  - Params: month, year (opcionais, default: mês atual)
  - Retorna: income total, expenses total, bills total, balance, breakdown por categoria
- [ ] Criar `app/tools/finance/get_pending_bills.py` — contas pendentes
  - Params: nenhum obrigatório
  - Retorna: bills com status pending/overdue, valor total pendente
- [ ] Criar `app/tools/finance/get_bills.py` — todas as contas com status
  - Params: month, year, status (opcionais)
  - Retorna: lista de bills com paid/pending/overdue
- [ ] Criar `app/tools/finance/get_expenses.py` — despesas variáveis
  - Params: month, year, category (opcionais)
  - Retorna: lista de expenses com categoria e valor
- [ ] Criar `app/tools/finance/get_incomes.py` — receitas
  - Params: month, year (opcionais)
  - Retorna: lista de incomes
- [ ] Criar `app/tools/finance/get_investments.py` — investimentos
  - Params: nenhum obrigatório
  - Retorna: lista de investments com tipo e valor
- [ ] Criar `app/tools/finance/get_debt_progress.py` — progresso de dívidas
  - Params: debt_id (opcional — todas se omitido)
  - Retorna: total pago, percentual quitado, parcelas restantes
- [ ] Criar `app/tools/finance/get_debt_payment_history.py` — histórico de pagamentos de dívida
  - Params: debt_id
  - Retorna: lista de pagamentos com data e valor
- [ ] Criar `app/tools/finance/get_upcoming_installments.py` — próximas parcelas
  - Params: days_ahead (opcional, default 30)
  - Retorna: installments com data de vencimento e valor

**Finance Tools — WRITE (2 tools):**
- [ ] Criar `app/tools/finance/mark_bill_paid.py` — marcar conta como paga (WRITE, confirmation)
  - Params: bill_id, paid_date (opcional, default: hoje)
  - Verifica que bill pertence ao user e está pendente
- [ ] Criar `app/tools/finance/create_expense.py` — criar despesa variável (WRITE, confirmation)
  - Params: description, amount, category, date (opcional)
  - Mapeamento de categorias PT→EN preservado (alimentacao→food, transporte→transport, etc.)

**Finance Agent:**
- [ ] Criar `app/agents/domains/finance.py`:
  - Usa `create_react_agent()` com os 11 tools (ver nota sobre deprecation em M4.7)
  - System prompt com regras de finance (categorias PT→EN, formatação monetária BRL, regras de confirmação)

**Lógica de agregação:**
- [ ] Implementar cálculos mensais: income - expenses - bills = balance
- [ ] Implementar breakdown por categoria com percentuais
- [ ] Implementar projeções baseadas em histórico
- [ ] Garantir que todos os cálculos usam `float` (não `Decimal` nem `string`)

**Testes:**
- [ ] Teste: cada tool isoladamente com dados de seed
- [ ] Teste: get_finance_summary com múltiplas categorias e breakdown correto
- [ ] Teste: mark_bill_paid com confirmação
- [ ] Teste: create_expense com mapeamento de categoria PT→EN
- [ ] Teste cross-ORM: mesma query financeira via Drizzle e SQLAlchemy retorna mesmos valores
- [ ] Teste: queries complexas ("quanto gastei com alimentação este mês?", "quais contas vencem esta semana?")

**Definition of Done:**
- [ ] Todos os 11 finance tools funcionam no Python
- [ ] Valores financeiros são precisos (cross-ORM verification)
- [ ] Confirmação funciona para mark_bill_paid e create_expense
- [ ] Categorias PT→EN mapeadas corretamente

---

## M4.6 — Memory Tools + Context Builder Completo 🔴

**Objetivo:** Tools de memória migrados e context builder completo (system prompt com todas as instruções de tools).

**Referências:** `docs/specs/domains/memory.md`, `docs/specs/core/ai-personality.md` §4-8, `ADR-012`

**Dependências:** M4.4

> **Nota:** Este milestone pode rodar **em paralelo** com M4.5 (Finance Tools).

**Tasks:**

**Memory Tools (3 tools):**
- [ ] Criar `app/tools/memory/search_knowledge.py` — busca em knowledge_items (READ)
  - Params: query, type (opcional), area (opcional), sub_area (opcional)
  - Busca por keyword/filtros em knowledge_items
- [ ] Criar `app/tools/memory/add_knowledge.py` — adicionar fato/preferência/insight (WRITE, confirmation)
  - Params: content, type (fact/preference/insight), area, sub_area (opcionais)
  - Detecta duplicatas antes de inserir
- [ ] Criar `app/tools/memory/analyze_context.py` — análise de contexto memória (READ)
  - Params: query
  - Retorna knowledge_items relevantes para contexto da conversa

**Memory Agent:**
- [ ] Criar `app/agents/domains/memory.py`:
  - Usa `create_react_agent()` com os 3 tools (ver nota sobre deprecation em M4.7)
  - System prompt com regras de memória (tipos de knowledge, áreas, quando adicionar vs buscar)

**Context Builder Completo:**
- [ ] Expandir `app/prompts/context_builder.py` (iniciado em M4.3):
  - User memories completas: bio, occupation, family, goals, challenges, topOfMind, values, learnedPatterns
  - Tool instructions completas (~88 linhas):
    - Memory tools: quando usar search_knowledge vs add_knowledge
    - Tracking tools: confirmação obrigatória, nunca inventar IDs, timezone do user
    - Finance tools: mapeamento de categorias, formatação monetária
    - Habits tools: match por nome, regras de registro
  - Regras explícitas: "sempre confirme antes de registrar", "nunca invente IDs para update/delete"
  - Counselor mode: instruções especiais para conversas tipo "counselor"
- [ ] Integrar context builder no graph principal (substituir versão simplificada de M4.3)

**Testes:**
- [ ] Teste: search_knowledge com filtros por type/area
- [ ] Teste: add_knowledge com detecção de duplicata
- [ ] Teste: context builder produz system prompt equivalente ao TypeScript
- [ ] Teste: counselor mode altera instruções corretamente
- [ ] Teste: tool instructions estão presentes e completas no prompt

**Definition of Done:**
- [ ] Memory tools funcionam no Python
- [ ] Context builder produz system prompt completo e equivalente ao TypeScript
- [ ] "O que você sabe sobre mim?" retorna informações corretas das user_memories

---

## M4.7 — Multi-Agent: Triage + Domain Routing 🔴

**Objetivo:** Arquitetura multi-agente com triage inteligente roteando mensagens para agentes especializados.

**Referências:** `docs/ai-python-service-migration-plan.md` §4

**Dependências:** M4.4, M4.5, M4.6

> **Contexto:** Até este ponto, o graph usa um único agente com todos os tools. Este milestone implementa a arquitetura final: triage node classifica a intenção e roteia para domain agents especializados. Isso permite usar modelo rápido (Flash) para triagem e modelo capaz (Pro) para execução, reduzindo custo e latência.

**Tasks:**

**Triage Node:**
- [ ] Criar `app/agents/triage.py`:
  - Usa modelo rápido: `ChatGoogleGenerativeAI(model="gemini-2.0-flash")`
  - Triage prompt com exemplos de roteamento:
    - "Registra 2L de água" → tracking_agent
    - "Quanto gastei este mês?" → finance_agent
    - "O que você sabe sobre mim?" → memory_agent
    - "Estou me sentindo ansioso" → wellbeing_agent
    - "Bom dia!" → general_agent
  - Retorna `{ current_agent: "tracking_agent" | "finance_agent" | "memory_agent" | "wellbeing_agent" | "general_agent" }`

**Wellbeing Agent (novo):**
- [ ] Criar `app/agents/domains/wellbeing.py`:
  - Sem tools (modo counselor puro)
  - System prompt com instruções de counselor mode: reflexão profunda, perguntas exploratórias, menos emojis

**Graph Atualizado:**
- [ ] Atualizar `app/agents/graph.py`:
  - START → triage → conditional_edges → [tracking_agent, finance_agent, memory_agent, wellbeing_agent, general_agent] → save_response → END
  - `route_to_agent()` baseado em `state["current_agent"]`
  - Fallback para `general_agent` quando triage retorna intenção desconhecida

**Agent Registry:**
- [ ] Cada domain agent é criado com `create_react_agent()` (ou `create_agent` se disponível — ver nota) e seus tools específicos:
  - `tracking_agent`: 6 tools (M4.4)
  - `finance_agent`: 11 tools (M4.5)
  - `memory_agent`: 3 tools (M4.6)
  - `wellbeing_agent`: 0 tools (counselor mode)
  - `general_agent`: 0 tools (conversacional)

> **Nota sobre `create_react_agent` deprecation:** Em LangGraph v1.0, `create_react_agent` do `langgraph.prebuilt` está em processo de migração para `create_agent` de `langchain.agents`. No momento da implementação, verificar via Context7 qual é a API estável recomendada. Se `create_agent` já estiver estável, usar essa. Caso contrário, `create_react_agent` continua funcional.

**Testes:**
- [ ] Teste: 20+ mensagens classificadas corretamente pelo triage (cobrindo todos os 5 agents)
- [ ] Teste: mensagens ambíguas caem no general_agent
- [ ] Teste: mensagens multi-domínio ("como estou financeiramente e na saúde?") — definir estratégia (rota para o primeiro, ou executa sequencialmente)
- [ ] Teste: wellbeing agent responde com tom de counselor
- [ ] Teste: triage com modelo Flash é significativamente mais rápido que Pro

**Definition of Done:**
- [ ] Mensagens são roteadas para o agente correto
- [ ] Cada agente executa seus tools especializados
- [ ] Triage usa modelo rápido, agents usam modelo capaz
- [ ] Fallback funciona para intenções ambíguas

---

## M4.8 — Workers: Memory Consolidation + Contradiction Detection 🔴

**Objetivo:** Migrar jobs assíncronos (memory consolidation, contradiction detection) para Python, mantendo BullMQ como scheduler.

**Referências:** `docs/ai-python-service-migration-plan.md` §11 Fase 3, `docs/specs/domains/memory.md`

**Dependências:** M4.6

> **Contexto:** `memory-consolidation.processor.ts` (557L) e `contradiction-detector.adapter.ts` (435L) usam LLM para extrair fatos de conversas e detectar contradições. A estratégia recomendada é manter BullMQ no NestJS como scheduler e chamar Python via HTTP para a lógica de AI. Isso minimiza mudanças na infraestrutura de jobs.

**Tasks:**

**Memory Consolidation:**
- [ ] Criar `app/workers/consolidation.py`:
  - Recebe: `{ user_id, timezone, date }`
  - Busca mensagens desde última consolidação (via ChatRepository)
  - Usa LLM para extrair fatos, preferências, insights das mensagens
  - Atualiza `user_memories`: bio, occupation, family, goals, challenges, topOfMind, values, learnedPatterns
  - Cria novos `knowledge_items` (com contradiction detection)
  - Atualiza `knowledge_items` existentes quando informação evolui
  - Registra consolidation log em `memory_consolidations`
- [ ] Criar endpoint POST `/workers/consolidation` em `app/api/routes/workers.py`:
  - Auth via SERVICE_SECRET
  - Recebe job data, executa consolidation, retorna resultado
  - Retorna: `{ usersProcessed, usersConsolidated, usersSkipped, errors, completedAt }`

**Contradiction Detection:**
- [ ] Criar `app/memory/contradiction.py`:
  - Single item: "novo fato torna fato existente obsoleto?"
  - Batch items: check novo fato contra 3+ fatos existentes em uma chamada LLM
  - Parse JSON response do LLM com fallback para output truncado
  - Retorna: `{ is_contradiction, confidence, explanation }`
- [ ] Integrar com consolidation: antes de salvar knowledge_item, detectar contradições

**NestJS Bridge:**
- [ ] Atualizar `memory-consolidation.processor.ts`:
  - Quando `USE_PYTHON_AI=true`: POST para Python `/workers/consolidation` via HTTP
  - Quando `false`: executa lógica TypeScript atual
  - BullMQ scheduler permanece no NestJS (sem mudanças no cron/trigger)

**Testes:**
- [ ] Teste: consolidation extrai fatos corretos de conversas
- [ ] Teste: contradictions detectadas (ex: "gosta de café" → "parou de tomar café")
- [ ] Teste: user_memories atualizadas corretamente após consolidation
- [ ] Teste: knowledge_items criados sem duplicatas
- [ ] Teste: endpoint /workers/consolidation retorna resultado esperado
- [ ] Teste: batch contradiction detection com múltiplos fatos

**Definition of Done:**
- [ ] Consolidation job roda via BullMQ → HTTP → Python → resultado
- [ ] Fatos extraídos corretamente de conversas
- [ ] Contradictions detectadas com confiança adequada
- [ ] Resultado equivalente ao sistema TypeScript

> **Decisão tomada:** NestJS BullMQ mantém o scheduling e chama Python via HTTP (opção A — menor mudança). Existe um pacote oficial `bullmq` para Python (v2.19.5) com classe `Worker`, mas está classificado como **Alpha** e não suporta todas as features do Node.js — por isso a decisão de manter o scheduler no NestJS. Se no futuro Python precisar de jobs próprios, considerar APScheduler ou Celery.
>
> **Padrão de comunicação:** NestJS BullMQ (cron trigger + retry + job history) → HTTP POST → Python (AI/LLM execution logic) → JSON response. BullMQ retry config permanece no NestJS — Python não precisa implementar retry de job.

---

## M4.9 — Feature Parity + Parallel Validation 🔴

**Objetivo:** Validar que o sistema Python produz resultados funcionalmente equivalentes ao TypeScript em todos os cenários antes de deletar código.

**Referências:** Todos os milestones anteriores (M4.1-M4.8)

**Dependências:** M4.7, M4.8

> **Contexto:** Este milestone é uma "safety net" antes da limpeza. Roda ambos os sistemas em paralelo e compara resultados. Qualquer discrepância é corrigida antes de prosseguir para M4.10.

**Tasks:**

**Suite de Paridade (50+ cenários):**
- [ ] Mensagens simples:
  - "Bom dia" → general agent responde
  - "Como você está?" → general agent
  - Conversa tipo counselor → wellbeing agent
- [ ] Tracking com confirmação:
  - "Registra 2L de água hoje" → confirm → verificar DB
  - "Registra 2L de água hoje" → reject → nada salvo
  - "Quanto peso eu registrei esta semana?" → read → dados corretos
  - "Apaga o registro de água de ontem" → confirm → delete
  - "Atualiza meu peso de hoje para 75kg" → confirm → update
  - "Registra que fiz exercício hoje" → confirm → habit entry
- [ ] Finance queries:
  - "Quanto gastei este mês?" → summary correto
  - "Quais contas vencem esta semana?" → pending bills
  - "Registra gasto de R$50 com almoço" → confirm → expense criada
  - "Marca conta de luz como paga" → confirm → bill updated
  - "Como estão minhas dívidas?" → debt progress
- [ ] Memory:
  - "O que você sabe sobre mim?" → user memories
  - "Lembra que eu prefiro café sem açúcar" → confirm → knowledge added
  - Busca em knowledge_items com filtros
- [ ] Multi-tool:
  - "Como estou financeiramente e na saúde?" → múltiplos agents/tools
- [ ] Edge cases:
  - Timeout de LLM → error handling graceful
  - Tool não encontrado → error message
  - Confirmação após 5+ minutos → behavior correto (LangGraph checkpoints persistem em PostgreSQL sem TTL por default, diferente do Redis 5min anterior)
  - Mensagem vazia → rejection ou resposta default

**SSE Event Compatibility:**
- [ ] Verificar que todos os SSE events emitidos pelo Python têm o mesmo formato do TypeScript:
  - `tool_calls` (iteration, toolCalls array)
  - `tool_result` (toolName, result, success)
  - `confirmation_required` (confirmationId, toolName, toolArgs, message, expiresAt)
  - Final response `{ content, done: true }`
  - Error `{ content, done: true, error }`
  - `{ done: true, awaitingConfirmation: true }`
- [ ] Frontend funciona sem nenhuma mudança de código

**Performance:**
- [ ] Load testing: 50 concurrent chat requests ao Python service
- [ ] Verificar latência do proxy NestJS → Python (deve ser <50ms overhead)
- [ ] Verificar que triage com Flash model < 500ms
- [ ] Validar `InMemoryRateLimiter` do LangChain sob carga (single-process). Se insuficiente em produção com múltiplos workers uvicorn, avaliar Redis-based rate limiter como melhoria futura

**Observabilidade:**
- [ ] Sentry configurado para Python service (error tracking)
- [ ] Structured logging (JSON) com request_id para correlação com NestJS
- [ ] Health check inclui status do DB (Python não depende de Redis)

**Testes:**
- [ ] Suite completa de paridade passa (50+ cenários)
- [ ] Frontend funciona sem mudanças
- [ ] Load test: sem erros em 50 concurrent requests
- [ ] Sentry captura erros do Python service

**Definition of Done:**
- [ ] Todos os cenários produzem resultados funcionalmente equivalentes
- [ ] Frontend funciona identicamente com `USE_PYTHON_AI=true` e `false`
- [ ] Performance aceitável sob carga
- [ ] Observabilidade configurada

---

## M4.10 — NestJS Cleanup + Production Deploy 🔴

**Objetivo:** Deletar todo o código TypeScript AI obsoleto (~13.400 linhas), simplificar NestJS para proxy, deploy em produção.

**Referências:** `docs/ai-python-service-migration-plan.md` §5, §7, §12

**Dependências:** M4.9

> **Contexto:** Este é o milestone de maior risco — deleta ~13.400 linhas de código AI em produção (~11.600 deletadas + ~2.700 simplificadas). A safety net é o M4.9 (validação de paridade) e o deploy strategy (blue-green ou canary). Rollback é possível revertendo o commit + `USE_PYTHON_AI=false`.

**Tasks:**

**Deletar packages/ai/ (~7.677 linhas):**
- [ ] Deletar diretório `packages/ai/` inteiro
- [ ] Remover `@life-assistant/ai` do `pnpm-workspace.yaml`
- [ ] Remover dependências npm: `@anthropic-ai/sdk`, `@google/genai`, `zod-to-json-schema`
- [ ] Remover referências em `tsconfig` base

**Deletar tool executors do NestJS:**
- [ ] Deletar `tracking-tool-executor.service.ts` (~587L)
- [ ] Deletar `finance-tool-executor.service.ts` (~1.047L)
- [ ] Deletar `memory-tool-executor.service.ts` (~297L)
- [ ] Remover providers dos respectivos modules

**Deletar serviços AI do NestJS:**
- [ ] Deletar `confirmation-state.service.ts` (~475L)
- [ ] Deletar `context-builder.service.ts` (~337L)
- [ ] Deletar `contradiction-detector.adapter.ts` (~435L)

**Simplificar memory consolidation:**
- [ ] Remover lógica LLM do `memory-consolidation.processor.ts` (~557L)
- [ ] Manter apenas: BullMQ trigger → HTTP POST para Python `/workers/consolidation`
- [ ] Resultado: ~50 linhas (de ~557)

**Simplificar chat.service.ts:**
- [ ] Remover lógica de tool loop TypeScript
- [ ] Remover imports de `@life-assistant/ai`
- [ ] Remover feature flag `USE_PYTHON_AI` (Python é o único caminho)
- [ ] Resultado: ~200 linhas (de ~1.232) — apenas: salvar msg do user + proxy HTTP/SSE para Python

**Simplificar chat.module.ts:**
- [ ] Remover providers de AI/tools/confirmation
- [ ] Manter apenas: ChatController, ChatService (proxy), ChatRepository, MessageRepository

**Atualizar monorepo:**
- [ ] Remover imports quebrados em todo o codebase
- [ ] Atualizar `CLAUDE.md` — remover referências a `packages/ai/`, adicionar `services/ai/`
- [ ] Atualizar `docs/specs/core/architecture.md` — nova arquitetura de 3 serviços

**Testes de regressão:**
- [ ] `pnpm typecheck` — sem erros de tipo
- [ ] `pnpm lint` — sem erros de lint
- [ ] `pnpm test` — todos os testes unitários passam
- [ ] `pnpm test:e2e` — todos os testes E2E passam (Playwright)
- [ ] Testes de paridade de M4.9 ainda passam

**Deploy produção:**
- [ ] Railway: criar serviço Python AI (Nixpacks, Python buildpack)
- [ ] Railway: configurar internal networking (`python-ai.railway.internal:8000`)
- [ ] Railway: configurar env vars (DATABASE_URL, GEMINI_API_KEY, SERVICE_SECRET)
- [ ] Deploy strategy: blue-green ou canary
- [ ] Monitoramento pós-deploy: 24-48h de observação
- [ ] Verificar Sentry: sem novos erros no Python service
- [ ] Verificar logs: requests fluindo corretamente NestJS → Python

**Definition of Done:**
- [ ] `packages/ai/` deletado (0 linhas)
- [ ] NestJS `chat.service.ts` é ~200L de proxy (de ~1.232L)
- [ ] `pnpm typecheck && pnpm lint && pnpm test` passam
- [ ] `pnpm test:e2e` passa
- [ ] Produção estável por 48h sem novos erros
- [ ] Total removido: **~11.600 linhas deletadas** + **~2.700 simplificadas** (~1.800 delta removido)

> **Riscos:**
> - Regressões em edge cases de confirmação (SSE event ordering diferente)
> - Imports quebrados em arquivos não cobertos pelos testes
> - Performance em produção diferente de local (latência Railway internal networking)
> - Rollback plan: reverter commit + `USE_PYTHON_AI=false` no NestJS (requer que packages/ai/ ainda exista no git history)

---

## Resumo Quantitativo

| Métrica | Valor |
|---|---|
| Milestones | 10 (M4.1 — M4.10) |
| Linhas deletadas do NestJS | **~11.600** (deletadas) + **~2.700** (simplificadas, ~1.800 delta removido) |
| Linhas adicionadas no NestJS | ~160 (proxy SSE + config + feature flag) |
| Novo código Python | **~5.000-7.000** (estimativa — Python mais conciso que TypeScript equivalente) |
| SQLAlchemy models | ~120-200 linhas (mapeamento passivo + CI check) |
| Pacote deletado | `packages/ai/` (**7.677 linhas**, 49 arquivos) |
| Novo diretório | `services/ai/` (Python AI Service) |
| Serviços NestJS intactos | Auth, REST controllers, domain services, repositories, BullMQ (scheduler) |
| Mudanças no frontend | Nenhuma (SSE events mantêm mesmo formato) |

### Estrutura do monorepo após migração

```
life-assistant/
├── apps/
│   ├── web/                    # Next.js (sem mudanças)
│   └── api/                    # NestJS (simplificado — sem AI code)
│
├── services/
│   └── ai/                     # Python AI Service (NOVO)
│       ├── app/
│       │   ├── agents/         # LangGraph agents + graph
│       │   ├── api/            # FastAPI routes + middleware
│       │   ├── db/             # SQLAlchemy models + repositories
│       │   ├── memory/         # Contradiction detection
│       │   ├── prompts/        # System prompt + context builder
│       │   ├── tools/          # 20 tool implementations
│       │   └── workers/        # Memory consolidation
│       ├── tests/
│       ├── pyproject.toml
│       └── Dockerfile
│
├── packages/
│   ├── database/               # Drizzle schemas + migrations (source of truth)
│   ├── config/                 # Zod config (NestJS)
│   └── shared/                 # Shared enums/constants
│   # packages/ai/ → DELETADO em M4.10
│
├── docs/
├── infra/
└── ...
```
