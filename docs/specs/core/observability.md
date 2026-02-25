# Observability & Operations

> Métricas, logs, traces, alertas e runbooks.
> Fonte: `docs/specs/core/architecture.md`, `apps/web/*sentry*`, `apps/api/src/logger/*`.

---

## 1. Ferramentas

| Área | Tool | Uso |
|------|------|-----|
| Errors | **Sentry** | Frontend + Backend |
| Logs | **Axiom** | Logs estruturados (prod) |
| Health | `/api/health` | Liveness |
| Health | `/api/health/ready` | Readiness (DB + Redis) |

---

## 2. Logging (Axiom)

**Formato obrigatório:**
- JSON estruturado
- `user_id`, `request_id` ou `job_id`, `timestamp`

**Níveis:**
| Ambiente | Level |
|----------|-------|
| Dev | `debug` |
| Prod | `warn` |

**Proibido:** logar tokens, senhas, chaves.

---

## 3. Sentry

### 3.1 Web

Configurações em:
- `apps/web/sentry.client.config.ts`
- `apps/web/sentry.server.config.ts`
- `apps/web/sentry.edge.config.ts`

### 3.2 API

Instrumentação no bootstrap:
`apps/api/src/instrument.ts` (importado no topo do `main.ts`).

### 3.3 Python AI Service

Instrumentação em `services/ai/app/observability.py`:
- `init_sentry()` — `sentry-sdk[fastapi]` com `FastApiIntegration` + `StarletteIntegration`
- `configure_logging()` — JSON estruturado via `python-json-logger` (`pythonjsonlogger.json.JsonFormatter`)
- `RequestIdMiddleware` — propaga `x-request-id` do NestJS proxy, gera UUID4 se ausente, injeta em logs via ContextVar

---

## 4. Alertas (propostos)

| Tipo | Sinal | Threshold |
|------|-------|-----------|
| API p95 latency | APM | > 500ms |
| Error rate | Sentry | > 1% |
| Queue depth | BullMQ | > 1000 |
| Redis down | Health check | Falha 2x |
| DB down | Health check | Falha 2x |

---

## 5. Runbooks (mínimo)

### 5.1 API fora do ar
1. Verificar `/api/health/ready`
2. Checar Redis e DB
3. Verificar deploy no Railway

### 5.2 Erro em massa no chat
1. Ver Sentry (issue volume)
2. Ver Axiom (logs de `chat.service`)
3. Checar provider LLM (rate limit)

### 5.3 Falha em jobs
1. Ver logs BullMQ
2. Identificar retries e `jobId`
3. Reprocessar manualmente (dev)

---

## 6. Tracing

Atualmente não há tracing distribuído formalizado.

**Planejado:**
- Propagar `requestId` entre API, jobs e integrações.

---

## 7. Incident Response (mínimo)

- **Severidade:** S1 (parado), S2 (degradação), S3 (impacto limitado)
- **Canal:** abrir issue interna + log no Sentry/Axiom
- **Comunicação:** status page (futuro) + aviso in-app (quando crítico)

---

*Última atualização: 26 Janeiro 2026*
