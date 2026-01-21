# Análise de Gaps Pendentes — Tracking Confirmation

> **Data original:** 2026-01-20
> **Última atualização:** 2026-01-21
> **Contexto:** Itens pendentes após implementação do fluxo de confirmação de tracking

---

## Gaps Resolvidos

| Gap | Solução | Data |
|-----|---------|------|
| Gap 1 | Intent detection antes do tool loop | 2026-01-20 |
| Gap 2 | Tools `update_metric` e `delete_metric` | 2026-01-20 |
| Gap 3 | Tools registradas em `availableTools` | 2026-01-20 |
| Gap 4 | IDs exatos em tool descriptions | 2026-01-20 |
| Gap 5 | Eliminada confirmação dupla | 2026-01-20 |
| Gap 6 | Pattern "exclua" adicionado | 2026-01-20 |
| Gap 7 | Detecção via LLM (`respond_to_confirmation`) | 2026-01-21 |

---

## Itens Pendentes

### 1. Testes e Monitoring (Prioridade Média 🟡)

#### 1.1 Contract Tests

Testes que definem o **contrato esperado** da LLM:

```typescript
// apps/api/test/contract/llm-behavior.contract.spec.ts

describe('LLM Behavior Contract', () => {
  describe('Tracking confirmation', () => {
    const testCases = [
      {
        name: 'should_ask_before_recording_weight',
        userMessage: 'Meu peso hoje é 75kg',
        expectedBehavior: 'ask_confirmation',
      },
      {
        name: 'should_detect_correction_request',
        context: [
          { role: 'user', content: 'Peso 75kg' },
          { role: 'assistant', content: 'Quer que eu registre?' },
          { role: 'user', content: 'Sim' },
          { role: 'assistant', content: 'Registrado!' },
        ],
        userMessage: 'Errei, era 75.5kg',
        expectedBehavior: 'call_update_metric_or_ask',
        expectedNotBehavior: 'call_record_metric',
      },
    ];
  });
});
```

#### 1.2 E2E com LLM Real (Opcional)

```typescript
// apps/api/test/e2e/llm-real.e2e.spec.ts
// NOTA: Rodar apenas manualmente ou em CI específico (caro!)

describe('E2E with Real LLM', () => {
  it('should_ask_confirmation_before_recording_metric', async () => {
    const response = await sendChatMessage('Peso 75kg');
    expect(response.content).toMatch(/quer.*regist|posso.*anot/i);
    expect(response.awaitingConfirmation).toBe(true);
  });
});
```

#### 1.3 Monitoring em Produção

Adicionar logging para detectar comportamento inesperado:

```typescript
// apps/api/src/modules/chat/application/services/chat.service.ts

private logToolBehavior(
  toolCall: ToolCall,
  conversationHistory: Message[],
  result: 'executed' | 'paused_for_confirmation'
): void {
  if (toolCall.name === 'record_metric' && result === 'executed') {
    const hasConfirmationInHistory = conversationHistory.some(
      m => m.role === 'user' && this.looksLikeConfirmation(m.content)
    );

    if (!hasConfirmationInHistory) {
      this.logger.warn(
        'ALERT: record_metric executed without apparent confirmation in history',
        { toolCall, lastMessages: conversationHistory.slice(-5) }
      );

      Sentry.captureMessage('Potential confirmation bypass', {
        level: 'warning',
        extra: { toolCall, conversationHistory },
      });
    }
  }
}
```

---

### 2. Frontend — UI de Edição (Prioridade Média 🟡)

Permitir edição/exclusão de métricas diretamente na UI:

| Task | Descrição |
|------|-----------|
| `TrackingHistory` botão "Editar" | Adicionar `DropdownMenuItem` no menu de cada entry |
| `TrackingEditModal` | Modal para editar valor/data de uma métrica |
| `useUpdateTrackingEntry` hook | Hook para chamar `PATCH /tracking/:id` |
| Testes de componente | Testes para edição inline |

---

## Prioridade de Implementação

| Item | Esforço | Valor | Quando |
|------|---------|-------|--------|
| Monitoring Sentry | Baixo | Alto | Próximo deploy |
| Frontend edição | Médio | Médio | M2.1 polish ou M2.3 |
| Contract tests | Médio | Médio | Quando houver tempo |
| E2E com LLM real | Alto | Baixo | Opcional, manual |
