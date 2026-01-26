# Error Handling & HTTP Codes

> Padrão de erros da API, taxonomia de códigos e formato de resposta.
> Fonte: `apps/api/src/common/filters/all-exceptions.filter.ts` e `apps/api/src/common/types/request.types.ts`.
> Referência NestJS: Exception Filters (Context7).

---

## 1. Error Envelope (padrão)

Todas as respostas de erro seguem o envelope `ApiResponse<T>`:

```ts
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta: {
    timestamp: string;
    requestId: string;
  };
}
```

**Regra:** `success = false`, `data` ausente e `error` presente.

> **Details** só aparece em **ambiente não-produção**.

---

## 2. Fontes de Erro

O filtro global (`AllExceptionsFilter`) normaliza os erros a partir de:

1. **DomainError**  
   - HTTP: `422 Unprocessable Entity`
   - `code`: `DOMAIN_ERROR`
2. **ApplicationError**  
   - HTTP: definido pelo erro
   - `code`: definido pelo erro
3. **HttpException (NestJS)**  
   - HTTP: definido pelo exception
   - `code`: `error` do response ou fallback por status
4. **Erro desconhecido**  
   - HTTP: `500 Internal Server Error`
   - `code`: `INTERNAL_ERROR`

---

## 3. Taxonomia de Códigos (Status → Code)

Mapeamento de status para `code` padrão:

| HTTP | Code |
|------|------|
| 400 | `BAD_REQUEST` |
| 401 | `UNAUTHORIZED` |
| 403 | `FORBIDDEN` |
| 404 | `NOT_FOUND` |
| 409 | `CONFLICT` |
| 422 | `UNPROCESSABLE_ENTITY` |
| 429 | `TOO_MANY_REQUESTS` |
| 500 | `INTERNAL_ERROR` |
| 502 | `BAD_GATEWAY` |
| 503 | `SERVICE_UNAVAILABLE` |
| other | `UNKNOWN_ERROR` |

> **Nota:** O mapeamento acima é o *fallback* usado quando o erro não define um `code` próprio.
> `DomainError` sempre usa `code: DOMAIN_ERROR` independentemente do status 422.

---

## 4. Exemplos

### 4.1 Erro de Validação

```json
{
  "success": false,
  "error": {
    "code": "BAD_REQUEST",
    "message": "monthYear must be in YYYY-MM format"
  },
  "meta": {
    "timestamp": "2026-01-26T12:00:00.000Z",
    "requestId": "a1b2c3d4-e5f6-..."
  }
}
```

### 4.2 Erro de Domínio

```json
{
  "success": false,
  "error": {
    "code": "DOMAIN_ERROR",
    "message": "Invalid weight: 900. Must be between 0 and 500."
  },
  "meta": {
    "timestamp": "2026-01-26T12:00:00.000Z",
    "requestId": "a1b2c3d4-e5f6-..."
  }
}
```

---

## 5. Regras Operacionais

- **Nunca** expor stack traces em produção.
- **Sempre** incluir `requestId` e `timestamp`.
- Para SSE/streams, usar erro no stream quando aplicável e **não** o envelope padrão.

---

*Última atualização: 26 Janeiro 2026*
