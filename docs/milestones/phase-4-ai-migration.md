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

## M4.4 — Tracking Tools + Habits + Confirmation Framework 🟢

**Objetivo:** Primeiros tools funcionando no Python com confirmação via `interrupt()`. Tracking é o domínio mais simples — ideal para validar o framework.

**Referências:** `docs/ai-python-service-migration-plan.md` §4.5, `docs/specs/domains/tracking.md`, `ADR-015`

**Dependências:** M4.3

> **Contexto:** O framework de confirmação com `interrupt()` / `Command(resume=)` do LangGraph (import de `langgraph.types`) substitui o sistema atual de Redis TTL (5 min) do `confirmation-state.service.ts`. A persistência passa a ser via PostgreSQL (`AsyncPostgresSaver`), sem TTL por default. Isso é uma **melhoria**: confirmações não expiram, sobrevivem a crashes do processo, e o thread pode ser retomado a qualquer momento. Este milestone valida o padrão que será usado por todos os write tools.
>
> **Mudança de infra:** Confirmation state migra de Redis (ioredis SETEX 5min) → PostgreSQL (LangGraph checkpoint tables). Python **não precisa de Redis** para confirmações.

**Tasks:**

**Confirmation Framework:**
- [x] Criar `app/tools/common/confirmation.py`:
  - Wrapper de `interrupt()` que padroniza o formato de confirmação
  - `generate_confirmation_message()` — mensagens em PT (ex: "Registrar peso: 75 kg em 2026-02-23?")
  - `generate_batch_confirmation_message()` — batch (ex: "Remover 3 registros?")
  - Constraint de idempotência documentada: código antes de `interrupt()` re-executa no resume — sem side effects antes do interrupt
  - `expiresAt` = now + 24h (soft limit — checkpoints PostgreSQL não expiram, frontend usa para UX)
- [x] Criar `app/tools/common/confirmable_tool_node.py` — `ConfirmableToolNode`:
  - Substitui `ToolNode` do `create_react_agent` para agents com WRITE tools
  - Separa READ tools (executa imediatamente) de WRITE tools (batch em único `interrupt()`)
  - 3 ações no resume: `confirm` (executa), `reject` (cancela), `edit` (corrige args e executa)
  - Emite SSE events `tool_calls` (antes) e `tool_result` (após cada tool)
- [x] Adicionar endpoint POST `/chat/resume` em `app/api/routes/chat.py`:
  - Recebe `{ thread_id, action: "confirm" | "reject" | "edit", edited_args?: dict }`
  - Executa `Command(resume={"action": ..., "args": ...})`
  - Retorna SSE stream com resultado (reutiliza lógica de streaming)
- [x] Atualizar streaming em `app/api/routes/chat.py`:
  - `stream_mode="messages"` → `stream_mode=["messages", "updates"]` para detectar `__interrupt__`
  - Chunks "updates" com `__interrupt__` → SSE `confirmation_required` + `{ done: true, awaitingConfirmation: true }`
  - Chunks "updates" com tool data → SSE `tool_calls` e `tool_result`
- [x] Implementar detecção de confirmação por mensagem em `/chat/invoke`:
  - Verificar interrupt pendente via `graph.get_state(config)` antes de processar
  - Classificar intent via LLM: confirm / reject / correction / unrelated
  - Confirm → `Command(resume={"action": "confirm"})`; Reject → `Command(resume={"action": "reject"})`
  - Correction → `Command(resume={"action": "edit", "args": corrected_args})`
  - Unrelated → rejeitar pendente + processar como nova mensagem
- [x] **NestJS:** Proxy de confirmação para Python:
  - `confirm/:confirmationId` → Python `/chat/resume` action "confirm"
  - `reject/:confirmationId` → Python `/chat/resume` action "reject"
  - Proxy SSE response de volta ao frontend
- [x] SSE event `confirmation_required` compatível com frontend atual:
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
- [x] SSE event `tool_result` após execução:
  ```json
  { "type": "tool_result", "data": { "toolName": "record_metric", "result": "...", "success": true } }
  ```

**Tracking Tools (4 tools):**
- [x] Criar `app/tools/tracking/record_metric.py` — registra métrica (WRITE, confirmation)
  - Params: metric_type, value, date (opcional, default hoje), unit (opcional, auto-fill), notes (opcional)
  - Validação de ranges por tipo (weight 0.1–500, water 1–20000, mood 1–10, sleep 0.1–24, etc.)
  - Mapeamento automático metric_type → area/sub_area (ex: weight→health/physical, mood→health/mental)
  - Usa TrackingRepository para INSERT, retorna JSON com entryId
- [x] Criar `app/tools/tracking/get_history.py` — histórico de métricas (READ)
  - Params: metric_type, days (opcional, default 30)
  - Retorna entries com UUIDs (para update/delete), stats (count, avg, min, max, sum, trend), variação %
  - Inclui `_note` instruindo o LLM a usar IDs exatos para update/delete
- [x] Criar `app/tools/tracking/update_metric.py` — atualiza métrica existente (WRITE, confirmation)
  - Params: entry_id (UUID exato), value, unit (opcional), reason (opcional — audit trail)
  - Ownership verificada via RLS (SET LOCAL request.jwt.claim.sub)
- [x] Criar `app/tools/tracking/delete_metric.py` — deleta métrica (WRITE, confirmation)
  - Params: entry_id (UUID exato), reason (opcional)
  - Delete individual (batch removido — LLM alucinava IDs em batch, mesma decisão do TypeScript M2.1)

**Habit Tools (2 tools):**
- [x] Criar `app/tools/tracking/record_habit.py` — registra hábito (WRITE, confirmation)
  - Params: habit_name, date (opcional, default hoje), notes (opcional)
  - Fuzzy match por nome: exact case-insensitive → contains bidirecional
  - Detecção de duplicata (já completado na data), cálculo de streak após registro
- [x] Criar `app/tools/tracking/get_habits.py` — lista hábitos (READ)
  - Params: include_streaks (bool, default true), include_today_status (bool, default true)
  - Retorna hábitos com streak atual, longest streak, status de hoje

> **Nota:** `analyze_context` está mapeado para o executor `'memory'` no código (chat.service.ts:121), não tracking. Esse tool é implementado em M4.6 (Memory Tools).

**Tracking Agent:**
- [x] Criar `app/agents/domains/tracking.py`:
  - Exporta `TRACKING_TOOLS` (6 tools) e `TRACKING_WRITE_TOOLS` (4 nomes) para uso pelo graph builder
  - Graph construído via `build_domain_agent_graph()` factory reutilizável (agent_factory.py)
  - System prompt vem do context_builder.py (centralizado, não embarcado no agente)
- [x] Atualizar graph principal: `build_domain_agent_graph(llm, TRACKING_TOOLS, TRACKING_WRITE_TOOLS, checkpointer)`
  - Grafo: agent → should_continue → tools (ConfirmableToolNode) → agent (loop) ou save_response → END
  - Loop guard em agent_node previne Gemini de re-chamar WRITE tool após sucesso (força resposta textual)

**Confirmation Flow Hardening (bugs encontrados durante E2E testing):**
- [x] Salvar mensagem de confirmação no DB ao detectar `__interrupt__` no stream (espelha NestJS L1189-1201)
  - Mensagem persiste após page refresh. Metadata inclui `pendingConfirmation` (confirmationId, toolName, toolArgs)
- [x] Reject usa `graph.ainvoke()` em vez de `graph.astream()` — resposta curta enviada como evento SSE único
  - Corrige bug onde resposta de rejeição não aparecia no frontend (perdia-se no pipeline streaming multi-camada)
- [x] Loop guard para re-chamada de WRITE tools — Gemini chamava `record_metric` em loop após sucesso
  - Detecta ToolMessage de WRITE tool seguida de nova chamada ao mesmo tool; força AIMessage textual
- [x] Guard de content blocks vazios do Gemini — `[{"type":"text","text":""}]` é truthy mas sem conteúdo
  - `tokens_streamed` só é setado como `True` quando token extraído é non-empty
- [x] `skip_save_response` para intent "unrelated" — rejeição silenciosa não salva "Operação cancelada" como mensagem separada
  - Nova mensagem do fluxo normal inclui menção ao cancelamento em resposta única combinada
- [x] JSON format para ToolMessage de rejeição — `json.dumps({"success": False, "message": "..."})` em vez de plain text
  - Gemini interpretava plain text como resultado de tool a ser re-processado
- [x] Frontend: safety net `useEffect` em `use-chat.ts` — quando `done:true` chega sem streaming content, chama `finishStreaming()` diretamente
  - Cobre edge case onde backend termina sem ter feito stream de tokens (ex: resposta via ainvoke)

**Testes:**
- [x] Teste: pipeline SSE de interrupt — salva confirmação no DB (`test_invoke_interrupt_saves_confirmation_to_db`), reject via ainvoke envia content (`test_invoke_reject_uses_ainvoke_and_sends_content`). Nota: testa pipeline de streaming, não o tool record_metric com ConfirmableToolNode end-to-end (coberto por E2E manual)
- [x] Teste: get_tracking_history retorna dados corretos (`test_get_history_returns_formatted_entries`)
- [x] Teste: update_metric retorna erro quando entry não existe (`test_update_metric_not_found`). Nota: ownership real é garantida por RLS (`SET LOCAL`) mas não há teste de integração com 2 users — requer DB real
- [x] Teste: record_habit com fuzzy match de nome (`test_record_habit_fuzzy_matching`, `test_record_habit_already_completed`)
- [x] Teste: SSE events de confirmação compatíveis com frontend (`test_invoke_interrupt_saves_confirmation_to_db`, `test_resume_confirm_returns_sse`)
- [x] Teste: flow completo "Registra 2L de água hoje" end-to-end (verificação manual — 4 cenários: confirm, reject, unrelated, e reject→re-register→confirm)
- [x] Teste: loop guard previne re-chamada de WRITE tool (`test_loop_guard_breaks_write_tool_re_call`)
- [x] Teste: empty Gemini blocks não escondem loop guard (`test_invoke_empty_gemini_blocks_do_not_shadow_loop_guard`)
- [x] Teste: DB failure no interrupt não quebra stream (`test_invoke_interrupt_db_failure_still_streams`)

**Definition of Done:**
- [x] "Registra 2L de água hoje" funciona end-to-end pelo Python (card de confirmação no frontend)
- [x] Confirmação, rejeição, mensagem não-relacionada e re-registro funcionam corretamente
- [x] Dados escritos pelo Python aparecem no dashboard (persistem após page refresh)
- [x] Todos os 6 tools passam em testes isolados (82 passed, 14 skipped)

### Notas

_Concluído em 2026-02-23._

**Desvios do plano original:**
- `delete_metric` batch removido do tool (repositório mantém `delete_batch()` para uso futuro). Decisão alinhada com TypeScript M2.1 — LLM alucinava IDs quando recebia operação batch. Chamadas paralelas de `delete_metric` individual com UUIDs reais do `get_history` é mais confiável
- `update_metric` não suporta alteração de `entry_date` (plano previa). Params reais: `entry_id`, `value`, `unit?`, `reason?`. `reason` adiciona audit trail de correções
- `record_habit` sem param `completed` (plano previa). Sempre registra como concluído — "registrar hábito" no chat implica completude. Param `notes` adicionado
- Tracking agent implementado como bridge (`tracking.py` exporta tools/write_tools) + factory reutilizável (`agent_factory.py`) em vez de graph customizado por domínio. Factory será reusada por M4.5 (Finance) e M4.6 (Memory) sem duplicação

**Melhorias sobre o plano original:**
- `record_metric` inclui validação de ranges por tipo (weight 0.1–500 kg, water 1–20000 ml, mood 1–10, etc.) — não previsto no plano
- `get_history` retorna estatísticas completas (count, avg, min, max, sum, trend, variação %) + `_note` instruindo LLM a usar IDs exatos — não previsto no plano
- `get_habits` retorna streaks (atual e recorde) e status de hoje com params configuráveis — excede spec original
- `build_domain_agent_graph()` factory em `agent_factory.py` — pattern reutilizável com agent → ConfirmableToolNode → agent loop + save_response, compilado com checkpointer. Elimina duplicação para M4.5/M4.6
- Loop guard no agent_node — detecta quando Gemini re-chama WRITE tool após ToolMessage de sucesso e força resposta textual. Essencial para estabilidade com Gemini
- 7 bugs de confirmation flow descobertos e corrigidos durante E2E testing (vide seção "Confirmation Flow Hardening")
- Frontend `use-chat.ts` safety net — `useEffect` que detecta `done:true` sem conteúdo streamed e chama `finishStreaming()` direto

**Verificação local:**
- Python: ruff check (0 errors), mypy (0 issues, 51 files), pytest (82 passed, 14 skipped)
- TypeScript: typecheck compilado sem erros
- E2E manual: 4 cenários testados (confirm, reject, unrelated intent, reject→re-register→confirm) — todos funcionando

---

## M4.5 — Finance Tools 🟢

**Objetivo:** Todos os 11 tools financeiros migrados para Python. Maior executor em linhas de código (~1.047L no TypeScript).

**Referências:** `docs/specs/domains/finance.md`, `apps/api/src/modules/finance/application/services/finance-tool-executor.service.ts`

**Dependências:** M4.4

> **Contexto:** O `finance-tool-executor.service.ts` é o maior executor (1.047 linhas) com lógica complexa de agregação, cálculos mensais, projeções e breakdown por categoria. Requer atenção especial ao handling de DECIMAL (string no Drizzle, float no Python).

**Tasks:**

**Finance Tools — Shared Helpers:**
- [x] Criar `app/tools/finance/_helpers.py` — TZ utils + ensure_recurring
  - Funções: get_current_month_tz, get_today_tz, get_days_until_due_day, resolve_month_year, get_previous_month, months_diff
  - `ensure_recurring_for_month()` — geração lazy de itens recorrentes (bills, incomes, expenses)
- [x] Adicionar métodos ao `app/db/repositories/finance.py`:
  - get_debt_by_id, get_debt_payments_for_debts (batch), sum_payments_by_month_year

**Finance Tools — READ (9 tools):**
- [x] Criar `app/tools/finance/get_finance_summary.py` — resumo financeiro mensal
  - Params: period (Literal["current_month", "last_month", "year"], default: "current_month")
  - Retorna: KPIs (income, budgeted, spent, balance), breakdown por entidade, ensure_recurring para 3 tabelas
- [x] Criar `app/tools/finance/get_pending_bills.py` — contas pendentes
  - Params: month, year (opcionais, default: mês atual via TZ)
  - Retorna: bills com status pending, daysUntilDue, reclassifica overdue, ensure_recurring
- [x] Criar `app/tools/finance/get_bills.py` — todas as contas com status
  - Params: month, year, status (opcionais, status default: "all")
  - Retorna: lista de bills com paid/pending/overdue, daysUntilDue, ensure_recurring
- [x] Criar `app/tools/finance/get_expenses.py` — despesas variáveis
  - Params: month, year (opcionais)
  - Retorna: lista de expenses com variance, percentUsed, ensure_recurring
- [x] Criar `app/tools/finance/get_incomes.py` — receitas
  - Params: month, year (opcionais)
  - Retorna: lista de incomes com variance, receivedCount/pendingCount, ensure_recurring
- [x] Criar `app/tools/finance/get_investments.py` — investimentos
  - Params: nenhum
  - Retorna: lista com progress, remainingToGoal, monthsToGoal
- [x] Criar `app/tools/finance/get_debt_progress.py` — progresso de dívidas
  - Params: debt_id (opcional), month_year (opcional, YYYY-MM)
  - Retorna: total pago, percentual, parcelas restantes, projeção de quitação, regras de visibilidade §3.6
- [x] Criar `app/tools/finance/get_debt_payment_history.py` — histórico de pagamentos de dívida
  - Params: debt_id (obrigatório), limit (opcional, default 50)
  - Retorna: lista de pagamentos com paidEarly flag, contexto da dívida
- [x] Criar `app/tools/finance/get_upcoming_installments.py` — próximas parcelas
  - Params: month_year (opcional, YYYY-MM, default: mês atual)
  - Retorna: installments com status (paid/paid_early/overdue/pending), regras de visibilidade §3.6

**Finance Tools — WRITE (2 tools):**
- [x] Criar `app/tools/finance/mark_bill_paid.py` — marcar conta como paga (WRITE, confirmation)
  - Params: bill_id, paid_date (opcional, default: hoje)
  - Verifica que bill pertence ao user e está pendente
- [x] Criar `app/tools/finance/create_expense.py` — criar despesa variável (WRITE, confirmation)
  - Params: description, amount, category, date (opcional)
  - Mapeamento de categorias PT→EN preservado (alimentacao→food, transporte→transport, etc.)

**Finance Agent Bridge + Graph:**
- [x] Criar `app/agents/domains/finance.py` — bridge (re-export FINANCE_TOOLS, FINANCE_WRITE_TOOLS)
- [x] Atualizar `app/agents/graph.py` — merge finance + tracking tools no grafo único

**Lógica de agregação:**
- [x] Implementar cálculos mensais: income - expenses - bills = balance
- [x] Implementar breakdown por categoria com percentuais
- [x] Implementar projeções baseadas em histórico
- [x] Garantir que todos os cálculos usam `float` (não `Decimal` nem `string`)

**Testes:**
- [x] Teste: cada READ tool isoladamente com mocks (41 testes)
- [x] Teste: get_finance_summary com KPI aggregation e breakdown correto
- [x] Teste: helpers TZ (20 testes) + ensure_recurring (4 testes)
- [x] Teste: mark_bill_paid com confirmação (5 testes: success, not_found, already_paid, overdue_success, invalid_uuid)
- [x] Teste: create_expense com mapeamento de categoria PT→EN (5 testes: success, category_mapping 7x, defaults, invalid_category, budgeted_fallback)
- [x] Teste cross-ORM: coberto por M4.2 integration tests (DECIMAL→float) + E2E manual verification
- [x] Teste: queries complexas — verificadas via E2E manual (Playwright)

**Definition of Done:**
- [x] Todos os 11 finance tools funcionam no Python
- [x] Valores financeiros são precisos (cross-ORM verification)
- [x] Confirmação funciona para mark_bill_paid e create_expense
- [x] Categorias PT→EN mapeadas corretamente

**Notas (2026-02-23) — READ tools session:**
- 9 READ tools implementados: get_finance_summary, get_pending_bills, get_bills, get_expenses, get_incomes, get_investments, get_debt_progress, get_debt_payment_history, get_upcoming_installments
- `_helpers.py`: TZ utils (6 funções) + `ensure_recurring_for_month()` genérico para 3 entidades (Bill, Income, VariableExpense) via `_ENTITY_CONFIG` dict
- `__init__.py`: exports FINANCE_TOOLS (list de 9) e FINANCE_WRITE_TOOLS (set vazio, preparado para WRITE tools)
- Repository: +3 métodos (get_debt_by_id, get_debt_payments_for_debts batch com guard lista vazia, sum_payments_by_month_year com func.coalesce)
- Graph atualizado: ALL_TOOLS = TRACKING_TOOLS + FINANCE_TOOLS (15 tools total)
- `pyproject.toml`: adicionado `"app/tools/finance/*.py" = ["TCH002"]` per-file-ignores (RunnableConfig necessário em runtime, mesmo padrão de tracking)
- 41 testes unitários (mocked), 112 total suite passando (ruff + mypy + pytest limpos)
- Correções do milestone: params alinhados com NestJS (period em vez de month/year para summary, month_year YYYY-MM para debts, limit para payment_history)
- E2E manual via Playwright: 9/9 tools testados com dados reais do seed, todos os valores conferem com o banco de dados
- Verificação de tool calls via LangGraph checkpoints: confirmado que a IA chama tools corretamente (paralelo quando possível, sequencial para resolver IDs como debt_id)
- WRITE tools (mark_bill_paid, create_expense) serão implementados na próxima sessão

**Notas (2026-02-23) — WRITE tools session:**
- 2 WRITE tools implementados: mark_bill_paid, create_expense
- `mark_bill_paid`: validates UUID, checks bill exists (via new `get_bill_by_id` repo method), verifies status is pending/overdue, defaults paid_date to today in user TZ
- `create_expense`: 7 PT→EN category mappings (alimentacao→food, etc.), defaults expected_amount to actual_amount or 0, generates UUID client-side
- Confirmation templates fixed: old templates used mismatched PT arg names ({nome}, {data}, {valor}, {categoria}) that never matched Python tool params — always fell back to generic. New templates use actual Python param names or static messages
- `_OPTIONAL_DEFAULTS` extended for mark_bill_paid and create_expense
- `FINANCE_WRITE_TOOLS = {"mark_bill_paid", "create_expense"}` — graph.py already merges with TRACKING_WRITE_TOOLS via set union
- 12 new unit tests (5 mark_bill_paid + 5 create_expense + 2 graph integration), confirmation tests updated
- All checks pass: ruff (0), mypy (0 issues, 65 files), pytest (134 passed, 14 skipped)
- M4.5 complete: 11 finance tools (9 READ + 2 WRITE) fully migrated from TypeScript

---

## M4.6 — Memory Tools + Context Builder Completo 🟢

**Objetivo:** Tools de memória migrados e context builder completo (system prompt com todas as instruções de tools).

**Referências:** `docs/specs/domains/memory.md`, `docs/specs/core/ai-personality.md` §4-8, `ADR-012`

**Dependências:** M4.4

> **Nota:** Este milestone pode rodar **em paralelo** com M4.5 (Finance Tools).

**Tasks:**

**MemoryRepository Enhancements:**
- [x] Enhance `MemoryRepository.search_knowledge()` with keyword search (ILIKE on title+content) and sub_area filter

**Memory Tools (3 tools):**
- [x] Criar `app/tools/memory/search_knowledge.py` — busca em knowledge_items (READ)
  - Params: query (keyword ILIKE), type (opcional), area (opcional), sub_area (opcional), limit
  - Busca por keyword/filtros em knowledge_items
- [x] Criar `app/tools/memory/add_knowledge.py` — adicionar fato/preferência/insight (WRITE, confirmation)
  - Params: content, type (fact/preference/memory/insight/person), area, sub_area, confidence
  - LLM-based contradiction detection (matching TS ContradictionDetectorAdapter)
  - Supersede contradicted items
- [x] Criar `app/tools/memory/_contradiction_detector.py` — LLM-based semantic contradiction detection
  - Uses `create_llm(settings, temperature=0)` for deterministic comparison
  - PT-BR prompt with contradiction examples
  - Safe default: returns empty on LLM error
- [x] Criar `app/tools/memory/analyze_context.py` — análise de contexto memória (READ)
  - Params: current_topic (str), related_areas (list[str]), look_for_contradictions (bool)
  - Retorna knowledge_items relevantes, padrões aprendidos, conexões potenciais

**Memory Agent Registration:**
- [x] Criar `app/agents/domains/memory.py` — re-export MEMORY_TOOLS/MEMORY_WRITE_TOOLS
- [x] Registrar memory tools em `graph.py` (ALL_TOOLS + ALL_WRITE_TOOLS)

**Confirmation Template Fix:**
- [x] Fix `confirmation.py` template: `{conteudo}` → `{content}` (match add_knowledge param)

**Context Builder Completo:**
- [x] Expandir `app/prompts/system.py` — full TS parity (~120 linhas tool instructions):
  - Memory tools: search_knowledge, add_knowledge, analyze_context com exemplos
  - Tracking tools: record_metric (ADR-015 flow), update_metric (UUID rules), delete_metric (batch)
  - Habits tools: record_habit (name matching, confirmation), get_habits
  - Finance tools: categories, READ/WRITE tools, mandatory flow, critical rules
  - Inferential reasoning: FLUXO OBRIGATÓRIO, contradiction detection, connection examples
  - Expanded rules (11 rules matching TS)
  - Counselor extension: add "Tom" subsection
- [x] Expandir `app/prompts/context_builder.py`:
  - Add learnedPatterns (confidence >= 0.7, max 5)
  - Add feedback_preferences
  - Use markdown headers (## Sobre o Usuário, ## Valores, etc.)
  - Skip empty sections, match TS formatForPrompt()

**Testes:**
- [x] Teste: search_knowledge sem filtros, com type, com area, com keyword ILIKE
- [x] Teste: add_knowledge basic, title generation, contradiction detection, no contradiction
- [x] Teste: contradiction detector LLM error retorna safe default
- [x] Teste: analyze_context multi-area, patterns, hint flag
- [x] Teste: context builder tool instructions presentes (memory, tracking, finance, habits)
- [x] Teste: context builder learned patterns, counselor Tom section, all 11 rules
- [x] Teste: context builder memory formatting com markdown headers

**Definition of Done:**
- [x] Memory tools funcionam no Python (3 tools registrados em graph.py)
- [x] Contradiction detection via LLM funciona com safe fallback
- [x] Context builder produz system prompt completo e equivalente ao TypeScript
- [x] "O que você sabe sobre mim?" retorna informações corretas das user_memories

**Notas (2026-02-24):**
- 3 memory tools: search_knowledge (READ), add_knowledge (WRITE+confirmation), analyze_context (READ)
- LLM-based contradiction detector using `create_llm(settings, temperature=0)` — same pattern as intent classifier
- Context builder expanded from ~60 to ~280 lines, full TS parity with all tool instructions
- Memory formatting uses markdown ## headers matching TS formatForPrompt()
- Counselor extension now includes "Tom" subsection (pausado, reflexivo, minimize emojis)
- 30 new tests (18 memory tools + 12 context builder expansion), all passing
- `confirmation.py` template fixed: `{conteudo}` → `{content}` to match tool param name

---

## M4.7 — Multi-Agent: Triage + Domain Routing 🟢

**Objetivo:** Arquitetura multi-agente com triage inteligente roteando mensagens para agentes especializados.

**Referências:** `docs/ai-python-service-migration-plan.md` §4

**Dependências:** M4.4, M4.5, M4.6

> **Contexto:** Até este ponto, o graph usa um único agente com todos os tools. Este milestone implementa a arquitetura final: triage node classifica a intenção e roteia para domain agents especializados. Isso permite usar modelo rápido (Flash) para triagem e modelo capaz (Pro) para execução, reduzindo custo e latência.

**Tasks:**

**Triage Node:**
- [x] Criar `app/agents/triage.py`:
  - Usa modelo rápido: `ChatGoogleGenerativeAI(model=settings.TRIAGE_LLM_MODEL)` (default: `gemini-flash-latest`)
  - `TriageDecision` Pydantic model com `with_structured_output()` para classificação determinística
  - Triage prompt com exemplos de roteamento:
    - "Registra 2L de água" → tracking
    - "Quanto gastei este mês?" → finance
    - "O que você sabe sobre mim?" → memory
    - "Estou me sentindo ansioso" → wellbeing
    - "Bom dia!" → general
  - Retorna `{ current_agent: "tracking" | "finance" | "memory" | "wellbeing" | "general" }`
  - Factory pattern: `make_triage_node(triage_llm)` captura LLM em closure
  - Fallback para `"general"` em caso de erro do LLM (try/except com log warning)

**Triage LLM Config:**
- [x] Adicionar `TRIAGE_LLM_MODEL: str = "gemini-flash-latest"` em `app/config.py`
- [x] Adicionar `create_triage_llm(settings)` em `app/agents/llm.py` (temperature=0)

**System Prompt Split:**
- [x] Refatorar `app/prompts/system.py`:
  - Separar `BASE_SYSTEM_PROMPT` monolítico em:
    - `CORE_SYSTEM_PROMPT`: persona, regras gerais, segurança, memória do usuário, contexto
    - `SHARED_MEMORY_INSTRUCTIONS`: instruções de search_knowledge + analyze_context (compartilhado por todos os domínios)
    - `TRACKING_PROMPT_EXTENSION`: instruções de record_metric, get_history, update/delete_metric, record_habit, get_habits
    - `FINANCE_PROMPT_EXTENSION`: instruções de todas as ferramentas financeiras
    - `MEMORY_WRITE_EXTENSION`: instruções de add_knowledge (WRITE)
    - `WELLBEING_PROMPT_EXTENSION`: modo counselor (atual `COUNSELOR_EXTENSION`)
  - Cada domain extension = SHARED_MEMORY_INSTRUCTIONS + extensão específica do domínio
- [x] Atualizar `app/prompts/context_builder.py`:
  - Remover append de `COUNSELOR_EXTENSION` (extensões agora são aplicadas pelo agent_node)
  - `build_context()` retorna apenas o prompt core com contexto do usuário

**Memory Tools Compartilhados:**
- [x] Exportar `MEMORY_READ_TOOLS = [search_knowledge, analyze_context]` em `app/tools/memory/__init__.py`
- [x] Todos os domain agents recebem memory READ tools (search_knowledge + analyze_context):
  - tracking: 6 + 2 = 8 tools (4 WRITE)
  - finance: 11 + 2 = 13 tools (2 WRITE)
  - memory: 3 tools (1 WRITE)
  - wellbeing: 0 + 2 = 2 tools (0 WRITE)
  - general: 0 + 2 = 2 tools (0 WRITE)

**Wellbeing Agent (novo):**
- [x] Criar `app/agents/domains/wellbeing.py`:
  - Export de listas vazias (WELLBEING_TOOLS, WELLBEING_WRITE_TOOLS) seguindo padrão de tracking.py, finance.py, memory.py
  - Tools reais vêm do registry (memory READ compartilhado)
  - Modo counselor puro: reflexão profunda, perguntas exploratórias, menos emojis

**Domain Registry:**
- [x] Criar `app/agents/registry.py`:
  - `DomainConfig` dataclass: tools, write_tools, prompt_extension
  - `build_domain_registry()` retorna mapeamento dos 5 domínios
  - Imports lazy para evitar dependências circulares

**Graph Atualizado (Dynamic Dispatch):**
- [x] Adicionar `build_multi_agent_graph()` em `app/tools/common/agent_factory.py`:
  - Topologia: START → triage → agent → should_continue → {tools, save_response}
  - `agent_node` dinâmico: bind tools + prompt extension baseado em `state["current_agent"]`
  - Pre-bind LLMs por domínio no build time (um `llm.bind_tools()` por domínio)
  - `ConfirmableToolNode` registrado com ALL tools (deduplicados) — LLM só chama tools que tem bound
  - Loop guard mantido sem alterações
- [x] Atualizar `app/agents/graph.py`:
  - Substituir `build_chat_graph()` por novo entry point usando `build_multi_agent_graph`
  - Manter `build_domain_agent_graph` no factory para backward compat
- [x] Atualizar `app/main.py`:
  - Criar triage LLM e domain LLM no startup
  - Chamar novo graph builder

> **Nota sobre arquitetura "Dynamic Dispatch":** Verificado via Context7 (Fev 2026): Em vez de subgraphs ou `create_react_agent`, usa um único graph com triage node no início e agent node com dispatch dinâmico. Vantagem: ZERO mudanças no streaming (`chat.py`), no resume/interrupt, e no `ConfirmableToolNode`. Node names "agent" e "tools" permanecem iguais, SSE filtering funciona sem alteração. Pattern validado: `llm.with_structured_output(Pydantic)` é o padrão recomendado pelo LangGraph para routing.

**Estratégia Multi-Domínio:**
- [x] Mensagens multi-domínio ("como estou financeiramente e na saúde?"): triage roteia para o domínio **primário** (mais relevante). Orquestração multi-agente sequencial diferida para pós-M4.10.

**Testes:**
- [x] test_triage.py: 20+ mensagens classificadas corretamente pelo triage (cobrindo todos os 5 agents)
- [x] test_triage.py: mensagens ambíguas caem no general
- [x] test_triage.py: fallback para general em caso de erro do LLM
- [x] test_triage.py: mensagens multi-domínio roteiam para domínio primário
- [x] test_multi_agent_graph.py: roteamento correto para cada domínio
- [x] test_multi_agent_graph.py: isolamento de tools (tracking não chama finance tools)
- [x] test_multi_agent_graph.py: wellbeing agent usa prompt de counselor
- [x] test_multi_agent_graph.py: fallback no graph quando triage falha
- [x] test_multi_agent_graph.py: resume de interrupt não re-executa triage
- [x] test_registry.py: registry contém todos os 5 domínios com counts corretos
- [x] test_registry.py: todos os domínios têm memory READ tools
- [x] test_llm_factory.py: create_triage_llm funciona corretamente
- [x] Atualizar test_graph.py para novo builder
- [x] Atualizar test_context_builder.py para prompt split

**Definition of Done:**
- [x] Mensagens são roteadas para o agente correto
- [x] Cada agente executa seus tools especializados + memory READ tools compartilhados
- [x] Triage usa modelo rápido (Flash), agents usam modelo capaz
- [x] Fallback funciona para intenções ambíguas e erros do triage
- [x] System prompt dividido em core + extensões por domínio
- [x] ZERO mudanças em chat.py, confirmable_tool_node.py, save_response.py
- [x] Todos os testes passando (ruff + mypy + pytest)

**Notas (2026-02-24):**
- Arquitetura "Dynamic Dispatch" com ~200 LOC novos (vs ~500-700 LOC para subgraphs/swarm)
- Triage usa `gemini-flash-latest` com `with_structured_output(TriageDecision)` — temperatura 0, determinístico
- Default original `gemini-2.0-flash` dava 404 (deprecated pela Google); corrigido para `gemini-flash-latest`
- Prompt monolítico (252 linhas) dividido em CORE + 6 extensões composáveis
- ZERO alterações em chat.py, confirmable_tool_node.py, save_response.py, state.py, e todos os 20 tool files
- `build_domain_agent_graph` mantido no factory para backward compat
- 214 testes passed, 14 skipped (DB), ruff + mypy clean
- **Validação manual E2E** (Playwright): 6 cenários testados — general (cumprimento), finance READ (gastos do mês com dados reais do banco), tracking READ (água da semana), tracking WRITE (registrar água + confirmação + verificação no DB), memory (perfil completo do usuário), wellbeing (resposta empática de conselheira). Todos os domínios rotearam corretamente com confidence >= 0.98. Tools chamadas corretas e isoladas por domínio. Memory READ compartilhada usada em 4 dos 6 testes.

---

## M4.8 — Workers: Memory Consolidation + Contradiction Detection 🟢

**Objetivo:** Migrar memory consolidation e contradiction detection para Python com scheduling nativo via APScheduler (arquitetura híbrida: jobs AI em Python, jobs CRUD em NestJS BullMQ).

**Referências:** `docs/ai-python-service-migration-plan.md` §11 Fase 3, `docs/specs/domains/memory.md`

**Dependências:** M4.6

> **Contexto:** `memory-consolidation.processor.ts` (557L), `consolidation-prompt.ts` (337L) e `contradiction-detector.adapter.ts` (435L) usam LLM para extrair fatos de conversas e detectar contradições. Esses são jobs de AI que pertencem ao runtime Python, onde toda a lógica LLM já reside.
>
> **Decisão arquitetural (atualizada em 2026-02-24):** Adotar **arquitetura híbrida** em vez de HTTP bridge:
> - **Jobs AI** (memory consolidation, follow-ups futuros): scheduling + execução em **Python via APScheduler**
> - **Jobs CRUD** (cleanup-onboarding, hard-deletes, calendar sync futuros): permanecem em **NestJS BullMQ**
>
> Essa decisão se baseia em pesquisa técnica detalhada:
> - **BullMQ Python** (v2.19.5) é classificado Alpha no PyPI, **não suporta cron/repeat jobs** ([Issue #2772](https://github.com/taskforcesh/bullmq/issues/2772)), e tem bugs críticos (Redis disconnect infinite loop [#3103](https://github.com/taskforcesh/bullmq/issues/3103), graceful shutdown quebrado). Descartado.
> - **HTTP bridge** (NestJS BullMQ → POST → Python) adiciona ponto de falha desnecessário, duplicação de codebases, e complexidade operacional — sem benefício real dado que o sistema não está em produção.
> - **APScheduler 3.x** é production-ready, async-native (`AsyncIOScheduler`), integra com FastAPI via lifespan, persiste schedules em PostgreSQL via SQLAlchemy + asyncpg (infra que o Python service já usa), e suporta CronTrigger com timezone.
>
> **Princípio:** Cada runtime agenda e executa o que é do seu domínio. Sem HTTP bridge para jobs agendados.

**Tasks:**

**APScheduler Setup:**
- [x] Adicionar dependência: `uv add apscheduler==3.11.2`
- [x] Adicionar configurações de scheduler ao `app/config.py` Settings:
  - `CONSOLIDATION_ENABLED`, `CONSOLIDATION_CRON_HOUR`, `CONSOLIDATION_CRON_MINUTE`
- [x] Criar `app/workers/scheduler.py`:
  - Configurar `AsyncIOScheduler` com MemoryJobStore (in-memory, re-registra no startup)
  - Integrar no FastAPI lifespan (`app/main.py`): `scheduler.start()` no startup, `scheduler.shutdown()` no teardown
  - No startup: query distinct user timezones ativos, registrar `CronTrigger` por timezone
  - Usar `replace_existing=True` em `add_job()` para idempotência no startup

**Memory Consolidation:**
- [x] Criar `app/workers/consolidation.py`:
  - Função `async run_consolidation(timezone: str)` — entry point do scheduler
  - Usar `get_service_session()` para bypass de RLS (operação cross-user)
  - Per-user: messages since lastConsolidatedAt, dedup, LLM call, apply updates, log
  - Retorna: `ConsolidationResult(users_processed, users_consolidated, users_skipped, errors, completed_at)`
  - Error handling per-user: falha em um usuário não impede processamento dos demais
- [x] Portar `consolidation-prompt.ts` (337L) para Python (`consolidation_prompt.py`):
  - Prompt builder em português (mesma estrutura do TypeScript)
  - Parser de response com validação Pydantic (equivalente ao Zod schema atual)
  - Normalização de tipos inválidos do LLM (ex: `challenge` → `insight`)
  - Fallback para JSON truncado/malformado
- [x] Criar `app/workers/utils.py`:
  - `refresh_schedules(scheduler, session_factory)` — re-query timezones e upsert schedules
  - `run_consolidation_for_user(user_id)` — trigger manual (dev/testing)
  - `retry_with_backoff()` — exponencial 1s→2s→4s (3 tentativas)

**Contradiction Detection:**
- [x] Expandir `app/tools/memory/_contradiction_detector.py`:
  - Melhorar parse de JSON com fallback para output truncado (`_try_extract_json_array()`)
  - Manter threshold de confiança 0.7
- [x] Integrar com consolidation: antes de salvar knowledge_item, chamar contradiction detection
- [x] Reutilizar `ContradictionResult` dataclass existente

**NestJS Deactivation:**
- [x] Atualizar `memory-consolidation.scheduler.ts`:
  - Quando `USE_PYTHON_AI=true`: **não registrar** schedulers BullMQ para memory-consolidation (skip no `onModuleInit`)
  - Quando `false`: comportamento atual (fallback TypeScript)
  - Log indicando qual sistema está ativo: `"Memory consolidation: Python APScheduler"` ou `"Memory consolidation: NestJS BullMQ"`
- [x] Manter `cleanup-onboarding` inalterado (não usa LLM, fica no NestJS BullMQ)
- [x] Código TypeScript do memory-consolidation NÃO é deletado aqui (cleanup em M4.10)

**Admin/Dev Endpoints:**
- [x] Criar endpoint POST `/workers/consolidation/trigger` em `app/api/routes/workers.py`:
  - Auth via SERVICE_SECRET
  - Recebe: `{ user_id?: string, timezone?: string }`
  - Trigger manual para dev/testing (equivalente ao admin endpoint NestJS)
  - Retorna: `ConsolidationResult`

**Testes:**
- [x] Teste: APScheduler registra schedules por timezone no startup
- [x] Teste: consolidation extrai fatos corretos de conversas
- [x] Teste: contradictions detectadas (ex: "gosta de café" → "parou de tomar café")
- [x] Teste: user_memories atualizadas corretamente após consolidation
- [x] Teste: knowledge_items criados sem duplicatas
- [x] Teste: batch contradiction detection com múltiplos fatos
- [x] Teste: retry funciona após falha de LLM (3 tentativas com backoff)
- [x] Teste: schedules re-registrados após restart do serviço (idempotência)
- [x] Teste: NestJS não registra memory-consolidation schedulers quando `USE_PYTHON_AI=true`
- [x] Teste: skip user se 0 mensagens desde lastConsolidatedAt (deduplicação)
- [x] Teste: falha parcial — um user falha, outros continuam processando
- [x] Teste: consolidation log criado corretamente em memory_consolidations
- [x] Teste: endpoint admin trigger retorna resposta correta

**Definition of Done:**
- [x] APScheduler roda consolidation diariamente às 3:00 AM por timezone
- [x] Fatos extraídos corretamente de conversas (equivalente ao TypeScript)
- [x] Contradictions detectadas com confiança adequada (threshold 0.7)
- [x] Schedules re-registrados no startup (idempotentes via `replace_existing=True`)
- [x] NestJS memory-consolidation desativado quando `USE_PYTHON_AI=true`
- [x] Resultado equivalente ao sistema TypeScript

> **Decisão tomada (2026-02-24):** Arquitetura híbrida — jobs AI em Python (APScheduler), jobs CRUD em NestJS (BullMQ). Pesquisa técnica completa documentada na sessão de análise.
>
> **Decisão atualizada (2026-02-24):** Usar **APScheduler 3.11.2 (estável)** com `AsyncIOScheduler` + `MemoryJobStore` (in-memory). Schedules re-registrados no startup via `add_job(replace_existing=True)` — mesmo padrão do NestJS `upsertJobScheduler`. APScheduler 4.x descartado (ainda alpha, 4.0.0a6). Persistência em PostgreSQL desnecessária para single-process com re-registro automático.
>
> **Stack de scheduling Python:** APScheduler 3.11.2 + `AsyncIOScheduler` + `MemoryJobStore` + `CronTrigger(timezone=)`. Roda in-process no FastAPI via lifespan — sem processo separado (diferente de Celery Beat).
>
> **Alternativas avaliadas e descartadas:**
> - APScheduler 4.x (alpha 4.0.0a6 — API instável, sem release estável)
> - BullMQ Python (Alpha, sem cron jobs, bugs críticos)
> - HTTP bridge NestJS→Python (complexidade operacional desnecessária para sistema não em produção)
> - Celery (não async-native, impedance mismatch com FastAPI + asyncpg)
> - Taskiq (pre-1.0, comunidade pequena)
> - arq (maintenance-only mode)
>
> **Padrão de scheduling:**
> ```
> Jobs AI:   FastAPI lifespan → APScheduler AsyncIOScheduler (CronTrigger, MemoryJobStore) → async Python function
> Jobs CRUD: NestJS BullMQ (cron trigger, Redis) → NestJS processor
> ```

**Notas (2026-02-24):**
- Implementação completa: APScheduler + consolidation worker + prompt parser + contradiction detection + admin endpoint + NestJS guard
- Novos arquivos Python: `workers/__init__.py`, `scheduler.py`, `consolidation.py`, `consolidation_prompt.py`, `utils.py`, `api/routes/workers.py`
- Modificados: `config.py` (3 settings), `main.py` (scheduler lifespan + workers route), `db/repositories/user.py` (2 métodos), `tools/memory/_contradiction_detector.py` (JSON fallback)
- NestJS: `memory-consolidation.scheduler.ts` guarded com `USE_PYTHON_AI` flag via `AppConfigService`
- Testes completos (18 Python + 1 NestJS): `tests/test_workers.py` (7 testes: scheduler, retry, endpoint trigger), `tests/test_consolidation.py` (11 testes: extraction, contradictions, memory updates, deduplication, partial failure, logging, priority resolution), `memory-consolidation.scheduler.spec.ts` (+1 teste: skip BullMQ when usePythonAi=true)
- `ruff check .` + `mypy app/` + `pytest` (232 passed) + `vitest` (854 passed) all pass

---

## M4.9 — Production Readiness: Observability + Validation 🔴

**Objetivo:** Preparar o serviço Python para produção: configurar observabilidade (Sentry, logging estruturado), corrigir gaps de validação, e validar paridade funcional com o sistema TypeScript via testes E2E com `USE_PYTHON_AI=true`.

**Referências:** Todos os milestones anteriores (M4.1-M4.8), `docs/specs/core/observability.md`

**Dependências:** M4.7, M4.8

> **Contexto:** Este milestone fecha os gaps de infra/observabilidade identificados na comparação NestJS↔Python. A funcionalidade de AI/chat (20 tools, confirmation flow, memory consolidation, multi-agent triage) já está em paridade funcional ou melhor no Python. Os gaps são de **infraestrutura de produção**: Sentry (zero error tracking no Python), structured logging (sem JSON, sem request_id), e input validation (aceita mensagem vazia). Além disso, valida paridade funcional via testes E2E Playwright rodando com `USE_PYTHON_AI=true`.
>
> **Nota sobre "parallel validation":** NÃO é shadow traffic (rodar ambos os sistemas e comparar). É testar com a flag `USE_PYTHON_AI` alternada — os mesmos testes E2E devem passar com `true` e `false`.

**Tasks:**

**Sentry para Python Service (gap: ZERO error tracking hoje):**
> No NestJS: `@sentry/nestjs@10.32.1` com `nestIntegration()`, auto-capture de exceções, `tracesSampleRate: 0.1` em prod, `sendDefaultPii: false`, disabled em test. No Python: **nada** — erros vão para stdout e são invisíveis.
- [ ] Instalar SDK: `cd services/ai && uv add 'sentry-sdk[fastapi]'`
- [ ] Criar `app/observability.py` com `init_sentry(settings)`:
  - `FastApiIntegration()` — auto-capture de exceções em endpoints
  - `SqlalchemyIntegration()` — capture de erros de DB
  - `traces_sample_rate`: 0.1 em prod, 1.0 em dev (match NestJS)
  - `send_default_pii=False` (match NestJS)
  - `environment` from settings (`development` | `production`)
  - `release` from `APP_VERSION`
  - `enabled`: False quando `ENVIRONMENT=test`
  - Inicializar apenas se `SENTRY_DSN` estiver configurado (match NestJS: optional)
- [ ] Chamar `init_sentry()` no topo de `app/main.py` (antes de criar FastAPI app — Sentry precisa instrumentar antes)
- [ ] Adicionar `SENTRY_DSN` ao `app/config.py` (Settings): `SENTRY_DSN: str = ""` (optional, empty = disabled)
- [ ] Adicionar `ENVIRONMENT` ao `app/config.py`: `ENVIRONMENT: str = "development"`
- [ ] Testar: provocar erro intencional → verificar que aparece no Sentry dashboard
- [ ] Verificar: erros de LLM (timeout, rate limit) capturados automaticamente
- [ ] Verificar: erros de DB (connection, RLS) capturados automaticamente

**Structured Logging + Request-ID Correlation (gap: plain text logs sem correlação):**
> No NestJS: `AppLoggerService` (176L) com JSON structured output `{level, message, timestamp, requestId, userId, statusCode, durationMs}` + `RequestIdMiddleware` (45L) propaga `x-request-id` + `LoggingInterceptor` (74L) loga cada request/response. No Python: `logging.getLogger()` default com output `INFO: message` — sem JSON, sem requestId, impossível correlacionar com logs do NestJS.
- [ ] Criar `app/api/middleware/request_id.py`:
  - Ler `x-request-id` header do request (propagado pelo NestJS proxy)
  - Se ausente, gerar `uuid4()`
  - Armazenar em contexto (ContextVar) para acesso global
  - Retornar no response header `x-request-id`
- [ ] Configurar JSON logging formatter em `app/observability.py`:
  - Format: `{"level", "message", "timestamp", "request_id", "user_id", "duration_ms"}`
  - Usar `python-json-logger` ou formatter custom (avaliar se dependência extra vale)
  - Configurar `uvicorn.access` e `uvicorn.error` loggers para JSON
- [ ] Adicionar middleware de logging (equivalente ao `LoggingInterceptor` do NestJS):
  - Log de entrada: `POST /chat/invoke {request_id, user_id}`
  - Log de saída: `POST /chat/invoke 200 {request_id, duration_ms}`
- [ ] Propagar `request_id` para Sentry (via `sentry_sdk.set_tag("request_id", ...)`)
- [ ] Testar: fazer request via NestJS proxy → verificar que requestId aparece nos logs Python e Sentry

**Input Validation (gap: aceita mensagem vazia):**
> No NestJS: `class-validator` com `@IsNotEmpty()` no DTO global validation pipe. No Python: Pydantic `message: str` sem `min_length` — `""` passa.
- [ ] Adicionar `min_length=1` no Pydantic model de `/chat/invoke`: `message: str = Field(min_length=1)`
- [ ] Adicionar validação no `/chat/resume`: `action` deve ser `"confirm" | "reject" | "edit"` (Literal type)
- [ ] Testar: POST com `message: ""` → retorna 422 Validation Error

**Suite de Paridade — Testes E2E Playwright (`USE_PYTHON_AI=true`):**
> Mesmos testes E2E existentes, executados com flag alternada. O objetivo é garantir que o frontend funciona identicamente. Cenários testados via Playwright (browser real) contra a API com proxy Python ativo.
- [ ] Mensagens simples:
  - "Bom dia" → triage classifica como general → resposta coerente
  - "Como você está?" → general agent
  - Conversa tipo counselor → triage classifica como wellbeing
- [ ] Tracking com confirmação (6 cenários):
  - "Registra 2L de água hoje" → confirm → verificar registro no DB
  - "Registra 2L de água hoje" → reject → nada salvo
  - "Quanto peso eu registrei esta semana?" → READ tool → dados corretos
  - "Apaga o registro de água de ontem" → confirm → delete no DB
  - "Atualiza meu peso de hoje para 75kg" → confirm → update no DB
  - "Registra que fiz exercício hoje" → confirm → habit completion
- [ ] Finance queries (5 cenários):
  - "Quanto gastei este mês?" → `get_finance_summary` → summary correto
  - "Quais contas vencem esta semana?" → `get_pending_bills` → lista
  - "Registra gasto de R$50 com almoço" → confirm → expense criada
  - "Marca conta de luz como paga" → confirm → bill status updated
  - "Como estão minhas dívidas?" → `get_debt_progress` → dados corretos
- [ ] Memory (3 cenários):
  - "O que você sabe sobre mim?" → `search_knowledge` / `analyze_context` → user memories
  - "Lembra que eu prefiro café sem açúcar" → confirm → knowledge item criado
  - Busca em knowledge_items com filtros (type, area)
- [ ] Edge cases:
  - Timeout de LLM → SSE error event graceful (não crash)
  - Confirmação após 5+ minutos → funciona (LangGraph checkpoints em PostgreSQL sem TTL, melhoria vs Redis 5min do TypeScript)
  - Mensagem vazia → 422 rejeitado (após fix de input validation)
  - Duas mensagens rápidas em sequência → sem race condition

> **Nota sobre cenário multi-domain:** "Como estou financeiramente e na saúde?" é roteado pelo triage para UM domínio (limitação arquitetural do single-domain dispatch em M4.7). O agente responde sobre o domínio primário e pode complementar via memory tools (compartilhadas). Isso é comportamento esperado, não bug de paridade — o sistema TypeScript anterior também usava single agent sem routing inteligente.

**SSE Event Compatibility:**
> Verificado na análise de código: Python emite os mesmos eventos que o TypeScript. O NestJS proxy (`parsePythonSSEStream()`) já adapta diferenças menores. Diferenças conhecidas e aceitas:
> - `tool_calls`: Python não inclui campo `iteration` (NestJS proxy não usa esse campo)
> - `awaitingConfirmation`: Python inclui `content` com mensagem de confirmação (NestJS proxy repassa)
- [ ] Verificar via testes E2E que todos os SSE events são renderizados corretamente no frontend:
  - `tool_calls` → UI mostra indicador de tool execution
  - `tool_result` → UI mostra resultado
  - `confirmation_required` → UI mostra dialog de confirmação
  - Final response `{ content, done: true }` → UI mostra resposta
  - Error `{ content, done: true, error: true }` → UI mostra erro
  - `{ done: true, awaitingConfirmation: true }` → UI aguarda resposta do usuário
- [ ] Confirmar que frontend NÃO precisa de mudanças de código

**Memory Consolidation Parity:**
> Migrado em M4.8 (APScheduler no Python substitui BullMQ no NestJS). NestJS já tem guard `if usePythonAi → skip BullMQ scheduler`. Validar que o worker Python produz resultados equivalentes.
- [ ] Trigger manual (`POST /workers/consolidation/trigger`) → consolidation executa e retorna métricas
- [ ] Verificar que `user_memories` é atualizado corretamente (bio, goals, challenges, patterns)
- [ ] Verificar que `knowledge_items` são criados com contradiction detection
- [ ] Verificar que `memory_consolidations` audit log é criado
- [ ] Verificar que scheduler APScheduler registra jobs por timezone no startup

**Performance:**
- [ ] Load testing com k6 ou locust: 50 concurrent chat requests ao Python service
  - Métricas: p50, p95, p99 latency + error rate
- [ ] Verificar latência do proxy NestJS → Python (deve ser <50ms overhead em localhost)
- [ ] Verificar que triage com Flash model < 500ms (p95)
- [ ] Validar `InMemoryRateLimiter` do LangChain sob carga (single-process). Se insuficiente em produção com múltiplos workers uvicorn, documentar como melhoria futura (Redis-based rate limiter)

**Testes:**
- [ ] Testes E2E Playwright passam com `USE_PYTHON_AI=true` (mesmos cenários que passam com `false`)
- [ ] Frontend funciona sem mudanças de código
- [ ] Load test: sem erros em 50 concurrent requests (p99 < 30s para chat com tool calls)
- [ ] Sentry captura erros do Python service (verificar no dashboard)
- [ ] Logs Python em JSON com request_id correlacionável com NestJS
- [ ] Memory consolidation manual trigger funciona corretamente

**Definition of Done:**
- [ ] Sentry configurado e capturando erros do Python (FastAPI + SQLAlchemy integrations)
- [ ] Logs estruturados (JSON) com request_id propagado do NestJS
- [ ] Input validation: mensagem vazia rejeitada (422)
- [ ] Testes E2E passam identicamente com `USE_PYTHON_AI=true` e `false`
- [ ] Performance aceitável sob carga (50 concurrent, p95 < 15s)
- [ ] Memory consolidation worker validado (trigger manual + audit log)
- [ ] Observability spec (`docs/specs/core/observability.md`) atualizada com Python service

---

## M4.10 — NestJS Cleanup + Production Deploy 🔴

**Objetivo:** Deletar todo o código TypeScript AI obsoleto (~13.400 linhas), simplificar NestJS para proxy, deploy em produção.

**Referências:** `docs/ai-python-service-migration-plan.md` §5, §7, §12

**Dependências:** M4.9

> **Contexto:** Este é o milestone de maior risco — deleta ~12.650 linhas de código AI (~11.600 + ~1.048 do memory consolidation, que foi migrado para Python APScheduler em M4.8) e simplifica ~1.650 linhas. A safety net é o M4.9 (validação de paridade) e o deploy strategy (blue-green ou canary). Rollback é possível revertendo o commit + `USE_PYTHON_AI=false`.

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

**Deletar memory consolidation do NestJS (migrado para Python APScheduler em M4.8):**
- [ ] Deletar `memory-consolidation.processor.ts` (~557L)
- [ ] Deletar `memory-consolidation.scheduler.ts` (~151L)
- [ ] Deletar `consolidation-prompt.ts` (~337L)
- [ ] Remover queue `MEMORY_CONSOLIDATION` de `queues.ts` e `jobs.module.ts`
- [ ] Remover `MemoryConsolidationScheduler` e `MemoryConsolidationProcessor` dos providers em `jobs.module.ts`
- [ ] Remover dependência de `MemoryModule` em `JobsModule` (se não usada pelo cleanup-onboarding)
- [ ] Manter `cleanup-onboarding` intacto (BullMQ, não usa LLM)
- [ ] Resultado: ~1.048 linhas deletadas (de ~1.048)

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
- [ ] Railway: configurar env vars (DATABASE_URL, GEMINI_API_KEY, SERVICE_SECRET, SENTRY_DSN, ENVIRONMENT=production)
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
- [ ] Total removido: **~12.650 linhas deletadas** + **~1.650 simplificadas**

> **Riscos:**
> - Regressões em edge cases de confirmação (SSE event ordering diferente)
> - Imports quebrados em arquivos não cobertos pelos testes
> - Performance em produção diferente de local (latência Railway internal networking)
> - Rollback plan: reverter commit + `USE_PYTHON_AI=false` no NestJS (requer que packages/ai/ ainda exista no git history)
> - Memory consolidation: rollback requer reativar BullMQ schedulers no NestJS (código ainda existe até ser deletado neste milestone)

---

## Resumo Quantitativo

| Métrica | Valor |
|---|---|
| Milestones | 10 (M4.1 — M4.10) |
| Linhas deletadas do NestJS | **~12.650** (deletadas, inclui memory consolidation ~1.048L migrado para Python) |
| Linhas simplificadas no NestJS | **~1.650** (chat.service.ts, chat.module.ts, jobs.module.ts) |
| Linhas adicionadas no NestJS | ~160 (proxy SSE + config + feature flag) |
| Novo código Python | **~5.500-7.500** (estimativa — inclui APScheduler setup + consolidation) |
| SQLAlchemy models | ~120-200 linhas (mapeamento passivo + CI check) |
| Pacote deletado | `packages/ai/` (**7.677 linhas**, 49 arquivos) |
| Novo diretório | `services/ai/` (Python AI Service) |
| Serviços NestJS intactos | Auth, REST controllers, domain services, repositories, BullMQ (cleanup + CRUD jobs) |
| Scheduling AI | APScheduler no Python (memory consolidation, follow-ups futuros) |
| Scheduling CRUD | BullMQ no NestJS (cleanup-onboarding, calendar sync futuro) |
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
│       │   ├── api/            # FastAPI routes + middleware (incl. request_id)
│       │   ├── db/             # SQLAlchemy models + repositories
│       │   ├── observability.py # Sentry init + JSON logging (M4.9)
│       │   ├── prompts/        # System prompt + context builder
│       │   ├── tools/          # 20 tool implementations
│       │   └── workers/        # APScheduler + Memory consolidation (cron jobs AI)
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
