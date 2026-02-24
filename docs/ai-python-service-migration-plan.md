

## 1. Arquitetura de 3 Serviços

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────────────┐
│  Next.js     │────▶│  NestJS API      │────▶│  Python AI Service  │
│  (Vercel)    │     │  (Railway)       │     │  (Railway)          │
│              │     │                  │     │                     │
│  - UI/UX     │     │  - Auth/RLS      │     │  - LangGraph agents │
│  - SSE proxy │     │  - REST API      │     │  - Tool execution   │
│  - Dashboard │     │  - Domain CRUD   │     │  - DB read+write    │
│              │     │  - SSE proxy     │     │  - Memory/context   │
│              │     │  - Jobs/queues   │     │  - SSE streaming    │
└─────────────┘     └──────┬───────────┘     └──────┬──────────────┘
                           │                        │
                           │    ┌──────────┐        │
                           └───▶│PostgreSQL│◀───────┘
                           │    │(Supabase)│        │
                           │    └──────────┘        │
                           │    ┌──────────┐        │
                           └───▶│  Redis   │◀───────┘
                                └──────────┘
```

### Responsabilidades

| Serviço | Responsabilidade | DB Access |
|---|---|---|
| Next.js | UI, SSE rendering, dashboard | Nenhum (via API) |
| NestJS | Auth, REST API (CRUD dashboard), BullMQ jobs, SSE proxy | Read+Write (Drizzle) |
| Python AI | Agentes LangGraph, tool execution, memory, context building | Read+Write (SQLAlchemy) |

### Comunicação entre serviços

| Direção | Protocolo | Quando |
|---|---|---|
| Frontend → NestJS | HTTPS REST | CRUD, auth, dashboard |
| Frontend → NestJS | SSE | Chat streaming (proxy) |
| NestJS → Python | HTTP POST interno | Nova mensagem de chat |
| NestJS → Python | HTTP POST interno | Confirmação/rejeição de tool |
| Python → NestJS | Nenhum | Python escreve direto no DB |

> **Railway internal networking:** Serviços se comunicam via `*.railway.internal` com latência ~1ms.

---

## 2. Protocolo de Comunicação

### 2.1 Frontend → NestJS (sem mudanças)

Mantém o contrato REST + SSE atual:

```
POST /api/chat/conversations/:id/messages  →  SSE stream
POST /api/chat/conversations/:id/confirm   →  SSE stream
```

### 2.2 NestJS → Python AI Service

**Nova mensagem:**

```http
POST http://python-ai.railway.internal:8000/chat/invoke
Authorization: Bearer <service-secret>
Content-Type: application/json

{
  "user_id": "uuid",
  "conversation_id": "uuid",
  "message": "Registra 2L de água hoje",
  "thread_id": "uuid"  // LangGraph thread
}
```

Response: SSE stream (`text/event-stream`)

**Confirmação/Rejeição:**

```http
POST http://python-ai.railway.internal:8000/chat/resume
Authorization: Bearer <service-secret>
Content-Type: application/json

{
  "thread_id": "uuid",
  "action": "confirm" | "reject"
}
```

Response: SSE stream (`text/event-stream`)

### 2.3 NestJS proxeia SSE do Python para o Frontend

```typescript
// chat.service.ts simplificado (~200 linhas)
async sendMessage(userId: string, conversationId: string, content: string): Promise<Observable<SSEEvent>> {
  // 1. Salva mensagem do usuário no DB
  await this.messageRepo.create(userId, conversationId, { role: 'user', content });

  // 2. Faz POST para Python AI e retorna stream SSE
  const pythonStream = await this.httpService.post(
    `${this.pythonUrl}/chat/invoke`,
    { user_id: userId, conversation_id: conversationId, message: content },
    { responseType: 'stream' }
  );

  // 3. Proxeia eventos SSE do Python para o frontend
  return this.proxySSEStream(pythonStream);
}
```

> Python salva a resposta do assistente diretamente no DB via SQLAlchemy ao final do processamento. NestJS não precisa salvar a resposta.

---

## 3. Estrutura do Python AI Service

```
services/ai/
├── pyproject.toml              # Dependencies (FastAPI, LangGraph, SQLAlchemy, etc.)
├── Dockerfile
├── alembic.ini                 # Alembic config (migrations read-only, Drizzle is source of truth)
│
├── app/
│   ├── main.py                 # FastAPI app + lifespan
│   ├── config.py               # Environment config (Pydantic Settings)
│   ├── dependencies.py         # FastAPI dependency injection
│   │
│   ├── api/
│   │   ├── routes/
│   │   │   ├── chat.py         # POST /chat/invoke, POST /chat/resume
│   │   │   └── health.py       # GET /health
│   │   └── middleware/
│   │       └── auth.py         # Service-to-service auth (shared secret)
│   │
│   ├── db/
│   │   ├── engine.py           # SQLAlchemy async engine + session factory
│   │   ├── models/             # SQLAlchemy models (mapeiam tabelas existentes)
│   │   │   ├── tracking.py     # tracking_entries, custom_metrics
│   │   │   ├── finance.py      # finance_transactions, finance_categories, etc.
│   │   │   ├── memory.py       # memories, memory_consolidations
│   │   │   ├── chat.py         # conversations, messages
│   │   │   └── users.py        # users (read-only)
│   │   └── repositories/       # Data access layer (CRUD operations)
│   │       ├── tracking.py     # TrackingRepository (create, find, aggregate)
│   │       ├── finance.py      # FinanceRepository
│   │       ├── memory.py       # MemoryRepository
│   │       └── chat.py         # ChatRepository (save messages)
│   │
│   ├── agents/
│   │   ├── graph.py            # LangGraph principal (triage → domain agents)
│   │   ├── state.py            # TypedDict com estado compartilhado
│   │   ├── triage.py           # Nó de triagem (classifica intenção)
│   │   └── domains/
│   │       ├── tracking.py     # Agente de tracking (5-8 tools)
│   │       ├── finance.py      # Agente de finanças (8-12 tools)
│   │       ├── memory.py       # Agente de memória (4-6 tools)
│   │       ├── wellbeing.py    # Agente de bem-estar
│   │       └── general.py      # Agente conversacional (sem tools)
│   │
│   ├── tools/
│   │   ├── tracking/
│   │   │   ├── record_metric.py
│   │   │   ├── get_history.py
│   │   │   ├── get_stats.py
│   │   │   └── manage_custom_metrics.py
│   │   ├── finance/
│   │   │   ├── record_transaction.py
│   │   │   ├── get_balance.py
│   │   │   ├── manage_categories.py
│   │   │   └── ...
│   │   ├── memory/
│   │   │   ├── store_memory.py
│   │   │   ├── search_memories.py
│   │   │   └── ...
│   │   └── common/
│   │       └── confirmation.py  # interrupt() wrapper para ADR-015
│   │
│   ├── prompts/
│   │   ├── system.py           # System prompt (personalidade, ADR-012)
│   │   ├── context_builder.py  # Constrói contexto (memórias, histórico, hora)
│   │   └── templates/          # Templates por domínio
│   │
│   └── workers/
│       ├── consolidation.py    # Memory consolidation (BullMQ consumer ou cron)
│       └── analysis.py         # Análise proativa (ADR-014)
│
└── tests/
    ├── unit/
    ├── integration/
    └── conftest.py
```

---

## 4. LangGraph: Estrutura Multi-Agente

### 4.1 State

```python
from typing import TypedDict, Annotated
from langgraph.graph.message import add_messages

class AgentState(TypedDict):
    messages: Annotated[list, add_messages]
    user_id: str
    conversation_id: str
    current_agent: str | None
    pending_confirmation: dict | None
```

### 4.2 Graph Principal

```python
from langgraph.graph import StateGraph, START, END
from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver

def build_graph(checkpointer: AsyncPostgresSaver):
    graph = StateGraph(AgentState)

    # Nós
    graph.add_node("triage", triage_node)
    graph.add_node("tracking_agent", tracking_agent)
    graph.add_node("finance_agent", finance_agent)
    graph.add_node("memory_agent", memory_agent)
    graph.add_node("general_agent", general_agent)
    graph.add_node("save_response", save_response_node)

    # Roteamento
    graph.add_edge(START, "triage")
    graph.add_conditional_edges("triage", route_to_agent)

    # Todos os agentes → salvar resposta → END
    for agent in ["tracking_agent", "finance_agent", "memory_agent", "general_agent"]:
        graph.add_edge(agent, "save_response")
    graph.add_edge("save_response", END)

    return graph.compile(checkpointer=checkpointer)
```

### 4.3 Triage Node

```python
from langchain_google_genai import ChatGoogleGenerativeAI

async def triage_node(state: AgentState) -> AgentState:
    """Classifica intenção e roteia para agente especializado."""
    llm = ChatGoogleGenerativeAI(model="gemini-2.0-flash")  # Modelo rápido para triagem

    response = await llm.ainvoke([
        SystemMessage(content=TRIAGE_PROMPT),
        *state["messages"]
    ])

    # Extrai agente-alvo da resposta
    target = parse_triage_response(response.content)
    return {"current_agent": target}

def route_to_agent(state: AgentState) -> str:
    return state["current_agent"] or "general_agent"
```

### 4.4 Domain Agent (exemplo: Tracking)

```python
from langgraph.prebuilt import create_react_agent
from langchain_google_genai import ChatGoogleGenerativeAI

def create_tracking_agent():
    llm = ChatGoogleGenerativeAI(model="gemini-2.5-pro")  # Modelo capaz para tools
    tools = [record_metric, get_history, get_stats, manage_custom_metrics]

    return create_react_agent(
        model=llm,
        tools=tools,
        prompt=TRACKING_SYSTEM_PROMPT,
    )
```

### 4.5 Confirmação com interrupt() (ADR-015)

```python
from langgraph.types import interrupt, Command

@tool
async def record_metric(
    type: str, value: float, entry_date: str,
    unit: str | None = None, area: str | None = None,
    db: AsyncSession = Depends(get_db),
) -> str:
    """Registra uma métrica de tracking."""

    # 1. Pede confirmação ao usuário (PAUSA o grafo)
    confirmation = interrupt({
        "type": "confirmation_required",
        "tool": "record_metric",
        "description": f"Registrar {type}: {value} {unit or ''} em {entry_date}",
        "data": {"type": type, "value": value, "entry_date": entry_date}
    })

    # 2. Retorna aqui quando o usuário confirmar/rejeitar
    if confirmation.get("action") == "reject":
        return "Operação cancelada pelo usuário."

    # 3. Executa: escreve direto no DB via SQLAlchemy
    repo = TrackingRepository(db)
    entry = await repo.create(
        user_id=state["user_id"],
        type=type, value=value, unit=unit or default_units[type],
        area=area or default_areas[type], entry_date=entry_date,
        source="chat",
    )

    return f"✅ {type} registrado: {value} {entry.unit} em {entry_date}"
```

### 4.6 Save Response Node

```python
async def save_response_node(state: AgentState) -> AgentState:
    """Salva a resposta do assistente no DB."""
    last_message = state["messages"][-1]

    if last_message.type == "ai" and last_message.content:
        repo = ChatRepository(db)
        await repo.save_message(
            user_id=state["user_id"],
            conversation_id=state["conversation_id"],
            role="assistant",
            content=last_message.content,
        )

    return state
```

---

## 5. Mudanças no NestJS

### 5.1 Código DELETADO (migra para Python)

| Arquivo/Pacote | Linhas | Destino no Python |
|---|---|---|
| packages/ai/ (inteiro) | **~7.677** | agents/, tools/, prompts/ |
| chat.service.ts (80% do código) | ~1.000 | agents/graph.py, api/routes/chat.py |
| context-builder.service.ts | ~337 | prompts/context_builder.py |
| confirmation-state.service.ts | ~475 | LangGraph interrupt()/Command(resume=) |
| tracking-tool-executor.service.ts | ~587 | tools/tracking/ |
| finance-tool-executor.service.ts | ~1.047 | tools/finance/ |
| memory-tool-executor.service.ts | ~297 | tools/memory/ |
| memory-consolidation.processor.ts | **~557** | workers/consolidation.py (simplificado para ~50L bridge) |
| contradiction-detector.adapter.ts | **~435** | memory/contradiction.py |
| consolidation-prompt.ts | **~337** | workers/consolidation.py |
| contradiction-resolution.service.ts | **~311** | memory/contradiction.py |
| contradiction-detector.port.ts | **~86** | Eliminado (Python não usa ports) |
| **Total deletado** | **~13.146** | |

### 5.2 Código SIMPLIFICADO

| Arquivo | Antes | Depois | Motivo |
|---|---|---|---|
| chat.service.ts | ~1.232 | ~200 | Só salva msg do user + proxy HTTP/SSE para Python |
| chat.module.ts | Providers complexos | Simplificado | Remove AI/tool/confirmation providers |

### 5.3 Código ADICIONADO

| Arquivo | Linhas | Função |
|---|---|---|
| Proxy SSE no chat.service.ts | ~50 | Proxeia stream do Python para frontend |
| Config PYTHON_AI_URL | ~10 | URL do serviço Python |
| **Total adicionado** | **~60** | |

### 5.4 Código que PERMANECE no NestJS (sem mudanças)

- **Auth module** — Supabase JWT validation, guards
- **Domain services** — TrackingService, FinanceService, MemoryService (servem REST API do dashboard)
- **Domain repositories** — Drizzle ORM (servem REST API)
- **REST controllers** — CRUD endpoints para dashboard
- **BullMQ infrastructure** — Queue setup (Python pode publicar jobs via Redis direto)
- **Database module** — Drizzle connection, RLS via `withUserId()`

### 5.5 Balanço no NestJS

```
Antes:  ~13.400 linhas de código AI-related
        (packages/ai: 7.677 + chat services: 2.044 + tool executors: 1.931 +
         jobs/memory: 1.726)
Depois: ~250 linhas (proxy + bridge)
Removido: ~11.600 linhas deletadas + ~1.800 simplificadas
Adicionado: ~160 linhas
```

---

## 6. Mudanças no Frontend

**Mínimas.** O frontend continua se comunicando apenas com NestJS via REST + SSE.

| Item | Mudança |
|---|---|
| SSE event types | Pequenos ajustes nos nomes de eventos (se necessário) |
| Confirmation UI | Pode permanecer igual (NestJS traduz interrupt → SSE confirmation_required) |
| Dashboard | Nenhuma mudança (REST API NestJS permanece) |

---

## 7. Estrutura do Monorepo Atualizada

```
life-assistant/
├── apps/
│   ├── web/                    # Next.js (sem mudanças)
│   └── api/                    # NestJS (simplificado)
│
├── services/
│   └── ai/                     # Python AI Service (NOVO)
│       ├── app/
│       ├── tests/
│       ├── pyproject.toml
│       └── Dockerfile
│
├── packages/
│   ├── database/               # Drizzle schemas + migrations (source of truth)
│   ├── config/                 # Zod config (NestJS)
│   └── shared/                 # Shared enums/constants (NestJS + frontend)
│   # packages/ai/ → DELETADO
│
├── docs/
├── infra/
└── ...
```

---

## 8. DB: Dois ORMs, Zero Problema

Ambos os serviços acessam o mesmo PostgreSQL:

| ORM | Serviço | Função |
|---|---|---|
| Drizzle | NestJS | Read+Write para REST API (dashboard, CRUD) |
| SQLAlchemy | Python | Read+Write para AI (tools, agents, context) |

### Por que isso funciona sem problema

1. **Drizzle é o source of truth para schema** (migrações via `db:generate` + `db:migrate`)
2. **SQLAlchemy models são mapeamentos passivos** (~120 linhas) das tabelas existentes — não geram migrações
3. **PostgreSQL garante integridade** — constraints, foreign keys, RLS policies se aplicam independente de qual ORM escreve
4. **Cada tabela tem escritores claros** — `tracking_entries` é escrita pelo NestJS (dashboard form) E pelo Python (chat tools), mas ambos respeitam as mesmas constraints
5. **RLS via SET LOCAL** — Python usa `SET LOCAL app.current_user_id = '{user_id}'` antes de cada operação, análogo ao `withUserId()` do Drizzle

### Não existe duplicação problemática

- **SQLAlchemy models (~120 linhas):** Mapeiam tabelas que Drizzle define. Isso é padrão em arquiteturas polyglot — não é duplicação, é cada serviço acessando o banco na linguagem nativa
- **Enums/constants (ex: TrackingType, LifeArea):** São conceitos de domínio expressos em cada linguagem. Python usa `StrEnum`, TypeScript usa `string literal union` — ambos refletem os mesmos valores do PostgreSQL `CREATE TYPE`
- **Validação de negócio (ex: peso min 0.1 max 500):** Cada serviço valida na entrada. As constraints do PostgreSQL são a última linha de defesa

### Riscos e mitigações

| Risco | Impacto | Mitigação |
|---|---|---|
| **Schema drift** — SQLAlchemy models ficam desatualizados após mudança no Drizzle | Alto: queries falham ou retornam dados incorretos silenciosamente | CI check que compara SQLAlchemy models com schema Drizzle a cada PR. Script que gera diff automático |
| **RLS bypass** — Python esquece de executar `SET LOCAL app.current_user_id` antes de uma query | Crítico: data leak entre usuários | Middleware SQLAlchemy obrigatório que injeta `SET LOCAL` em toda session. Teste de integração que verifica RLS em cada repository |
| **Behavioral differences** — Drizzle retorna DECIMAL como string, SQLAlchemy pode retornar como Decimal ou float | Médio: cálculos financeiros incorretos | Padronizar: SQLAlchemy models usam `Numeric` com coerção explícita para `float`. Testes de integração que comparam outputs dos dois ORMs para as mesmas queries |
| **Concurrent writes** — Ambos os serviços escrevem na mesma tabela (ex: `tracking_entries`) | Baixo: PostgreSQL constraints previnem corrupção, mas race conditions podem causar duplicatas | Usar `ON CONFLICT` / upsert patterns. Idempotency keys para write operations via chat |

---

## 9. Fluxo de Dados Completo (Exemplo)

**Usuário:** "Registra 2L de água hoje"

**1. Frontend**

```
POST /api/chat/conversations/:id/messages { content: "Registra 2L de água hoje" }
```

**2. NestJS (chat.service.ts)**

- Valida auth (JWT guard)
- Salva mensagem do user no DB (Drizzle)
- `POST http://python-ai.railway.internal:8000/chat/invoke`
  `{ user_id, conversation_id, message, thread_id }`
- Retorna SSE stream do Python como proxy

**3. Python AI Service**

- a) Triage node → classifica como "tracking"
- b) Tracking agent recebe mensagem
- c) Agent chama tool `record_metric(type="water", value=2000, unit="ml", entry_date="2026-02-19")`
- d) Tool executa `interrupt()` → SSE event: `confirmation_required`
  `{ tool: "record_metric", description: "Registrar água: 2000ml em 2026-02-19" }`

**4. Frontend exibe card de confirmação**

**5. Usuário clica "Confirmar"**

```
POST /api/chat/conversations/:id/confirm { action: "confirm" }
```

**6. NestJS**

- `POST http://python-ai.railway.internal:8000/chat/resume`
  `{ thread_id, action: "confirm" }`
- Proxeia SSE stream

**7. Python AI Service**

- a) LangGraph retoma execução (`Command(resume={"action": "confirm"})`)
- b) Tool `record_metric` continua:
  - SQLAlchemy: `INSERT INTO tracking_entries (...) VALUES (...)`
  - Retorna "Agua registrada: 2000ml em 2026-02-19"
- c) Save response node: salva mensagem do assistente no DB (SQLAlchemy)
- d) SSE event: `text_delta` → "Agua registrada: 2000ml em 2026-02-19"

**8. Frontend renderiza resposta**

---

## 10. Infraestrutura

### Docker (local dev)

```yaml
# infra/docker/docker-compose.yml (adicionar)
python-ai:
  build:
    context: ../../services/ai
    dockerfile: Dockerfile
  ports:
    - "8000:8000"
  environment:
    - DATABASE_URL=${DATABASE_URL}
    - GEMINI_API_KEY=${GEMINI_API_KEY}
    - SERVICE_SECRET=${SERVICE_SECRET}
  depends_on:
    - redis
```

### Railway (produção)

| Serviço | Source | Buildpack | Start Command |
|---|---|---|---|
| NestJS API | apps/api | Node.js | `node dist/main.js` |
| Python AI | services/ai | Python (Nixpacks) | `uvicorn app.main:app` |
| Redis | — | Managed | — |

### Variáveis de ambiente novas

| Variável | Onde | Valor |
|---|---|---|
| PYTHON_AI_URL | NestJS | `http://python-ai.railway.internal:8000` |
| SERVICE_SECRET | Ambos | Shared secret para auth service-to-service |
| DATABASE_URL | Python | Mesma connection string do NestJS |

---

## 11. Plano de Migração (Strangler Fig)

### Fase 1: Fundação Python (3-4 semanas)

1. Setup `services/ai/` com FastAPI + SQLAlchemy + LangGraph
2. Implementar `db/models/` e `db/repositories/` (mapeando tabelas existentes)
3. Implementar CI check de schema drift (Drizzle ↔ SQLAlchemy)
4. Implementar graph básico (triage + general agent)
5. Endpoint `/chat/invoke` com SSE streaming
6. NestJS: criar proxy SSE no `chat.service.ts`
7. Testes: mensagem simples end-to-end

**Riscos:** Setup de SQLAlchemy async + Supabase RLS pode ter edge cases

### Fase 2: Migrar Tools (3-4 semanas)

1. Migrar tracking tools (record_metric, get_history, get_stats, update, delete)
2. Migrar finance tools (11 tools)
3. Migrar memory tools (search_knowledge, add_knowledge, analyze_context)
4. Migrar habits tools (record_habit, get_habits)
5. Implementar `interrupt()` para confirmação (ADR-015)
6. Migrar context builder (~337 linhas)
7. Testes: cada tool com confirmação + testes de integração cross-ORM

**Riscos:** Volume maior que estimado anteriormente (packages/ai/ = ~7.677 linhas, não ~3.500)

### Fase 3: Multi-Agente + Workers (2-3 semanas)

1. Criar domain agents (tracking, finance, memory, wellbeing, general)
2. Implementar triage com modelo rápido (gemini-2.0-flash)
3. Migrar memory consolidation worker (~557 linhas)
4. Migrar contradiction detector (~435 linhas)
5. Definir estratégia de scheduling: NestJS BullMQ chama Python via HTTP (recomendado) ou Python cron nativo
6. Testes: roteamento multi-agente + consolidation job

**Riscos:** Decisão sobre BullMQ consumer em Python precisa ser tomada (ver nota abaixo)

### Fase 4: Limpeza + Estabilização (2-3 semanas)

1. Deletar `packages/ai/` (~7.677 linhas)
2. Deletar tool executors do NestJS
3. Deletar `confirmation-state.service.ts`
4. Simplificar `chat.service.ts` (remover código morto)
5. Deletar `context-builder.service.ts`
6. Testes end-to-end completos (regressão de todos os flows)
7. Load testing do proxy NestJS → Python
8. Deploy produção (blue-green ou canary)

**Riscos:** Regressões em edge cases de confirmação, SSE event ordering

**Total estimado: 10-14 semanas**

> **Nota sobre scheduling (atualizada 2026-02-24):** Adotada arquitetura híbrida após pesquisa técnica:
> - **(b) Python usa APScheduler para cron de jobs AI** ← ESCOLHIDO (async-native, PostgreSQL persistence, integra com FastAPI lifespan)
> - ~~(a) NestJS mantém o scheduler e chama Python via HTTP~~ — descartado (complexidade operacional desnecessária para sistema não em produção)
> - ~~(c) BullMQ Python~~ — descartado (Alpha, sem cron jobs, bugs críticos)
> - BullMQ permanece no NestJS apenas para jobs CRUD (cleanup-onboarding, calendar sync futuro)
> - Ver `docs/milestones/phase-4-ai-migration.md` M4.8 para decisão completa

---

## 12. Resumo Quantitativo

| Métrica | Valor |
|---|---|
| Linhas removidas do NestJS | **~11.600** (deletadas) + **~1.800** (simplificadas) |
| Linhas adicionadas no NestJS | ~160 (proxy SSE + config + feature flag) |
| Novo código Python | **~5.000-7.000** (estimativa ajustada) |
| SQLAlchemy models | ~120-200 linhas (mapeamento passivo + CI check) |
| Pacotes deletados | packages/ai/ (**~7.677 linhas**) |
| Serviços NestJS que permanecem intactos | Auth, REST controllers, domain services, repositories, BullMQ |
| Mudanças no frontend | Mínimas (ajuste de SSE events se necessário) |

---

## 13. Benefícios da Arquitetura Final

1. **Escalabilidade de AI:** Adicionar novos agentes/tools = novos arquivos Python, sem tocar NestJS
2. **Modelo por agente:** Triage usa modelo rápido (Flash), domain agents usam modelo capaz (Pro)
3. **Confirmação robusta:** `interrupt()`/`Command(resume=)` com persistência PostgreSQL (substitui Redis TTL)
4. **Ecossistema Python:** Acesso direto a LangChain, LangGraph, LangSmith, scikit-learn, pandas
5. **Separação clara:** NestJS = auth + REST API + dashboard. Python = toda inteligência artificial
6. **Deploy independente:** Atualizar AI sem redeployar NestJS e vice-versa
7. **Sem duplicação problemática:** Cada serviço acessa o DB na sua linguagem nativa, PostgreSQL garante consistência
