# Realtime Protocol (SSE + Socket.io)

> Contratos de eventos em tempo real, payloads e reconexão.
> Fonte: `apps/api/src/modules/chat/*` + `apps/web/src/app/(app)/chat/*`.

---

## 1. Estado Atual

- **SSE** é usado para streaming do chat (produção).
- **Socket.io** está previsto na arquitetura, mas **não há gateways ativos** no código atual.

---

## 2. SSE (Chat)

### 2.1 Endpoints

```
GET /api/chat/conversations/:id/stream?token=<jwt>
GET /api/chat/conversations/:id/confirm/:confirmationId?token=<jwt>
```

### 2.2 Autenticação SSE

EventSource não suporta headers; o token JWT é enviado via query param `token`.

Guard: `SseAuthGuard`.

### 2.3 Envelope de Evento

```ts
interface MessageEvent {
  data: string | Record<string, unknown>;
  id?: string;
  type?: string; // opcional
}
```

### 2.4 Tipos de Evento

**1) Chunk de resposta (padrão `onmessage`)**

```json
{ "content": "Texto parcial...", "done": false }
```

**2) Tool calls (debug de tool loop)**

```json
{
  "type": "tool_calls",
  "data": {
    "iteration": 1,
    "toolCalls": [{ "id": "uuid", "name": "record_metric", "arguments": {...} }]
  }
}
```

**3) Resultado de tool**

```json
{
  "type": "tool_result",
  "data": { "toolName": "record_metric", "success": true }
}
```

**4) Confirmação requerida**

```json
{
  "type": "confirmation_required",
  "data": {
    "confirmationId": "uuid",
    "toolName": "record_metric",
    "toolArgs": { ... },
    "message": "Quer que eu registre...?",
    "expiresAt": "2026-01-26T12:00:00.000Z"
  }
}
```

**5) Erro**

O frontend trata erros no `onmessage` se o payload incluir `error`:

```json
{ "error": "Conexão perdida. Por favor, tente novamente." }
```

---

## 3. Reconexão e Cancelamento (frontend)

Padrão no hook `use-chat`:

- Fecha qualquer EventSource anterior antes de abrir um novo.
- `onerror` é tratado com delay para evitar falso positivo quando `done=true`.
- Cancelamento explícito fecha o stream e limpa estado local.

---

## 4. Socket.io (planejado)

> Sem implementação ativa no código atual.

Quando ativado, deverá definir:
- namespaces por módulo (ex: `/chat`, `/notifications`)
- eventos documentados por payload
- estratégia de reconexão e ack

---

*Última atualização: 26 Janeiro 2026*
