# ADR-016: Decision Support Architecture

## Status

Accepted

## Date

2026-01-19

## Context

O Life Assistant possui dois modos de conversa: **Chat** (conversação geral) e **Conselheira** (aconselhamento estruturado). O Modo Conselheira já oferece análise de decisões via prompt engineering (ai.md §4.2, §7.3), mas apresenta limitações:

### Funcionalidade Existente (ai.md §4.2, §7.3)

| Existe | Descrição |
|--------|-----------|
| ✅ | Análise de situação em múltiplas perspectivas |
| ✅ | Template de análise de decisão (contexto, opções, prós/contras) |
| ✅ | `analyze_context` detecta padrões e correlações em tempo real |
| ✅ | Encoraja reflexão antes de dar opinião |

### Limitações Identificadas

| Faltava | Impacto |
|---------|---------|
| ❌ Persistência de decisões | Decisões importantes se perdem no histórico de chat |
| ❌ Follow-up pós-decisão | Sem acompanhamento de resultados |
| ❌ Learning loop | IA não aprende com outcomes de decisões passadas |
| ❌ Modelagem de cenários | Não calcula impacto numérico de opções |
| ❌ Detecção proativa | Usuário precisa pedir ajuda explicitamente |

### Descoberta: Tabelas Existentes

Durante análise, descobriu-se que **tabelas de decisões já existem no banco** (migration snapshot M0.4):

```sql
-- Tabelas criadas mas nunca implementadas
decisions (id, user_id, title, description, area, deadline, status,
           chosen_option_id, reasoning, ai_analysis, review_date,
           review_score, review_notes, ...)
decision_options (id, decision_id, title, pros, cons, score, ...)
decision_criteria (id, decision_id, name, description, weight, ...)
decision_scores (id, option_id, criterion_id, score, ...)
```

Estas tabelas foram criadas durante M0.4 (Database Foundation) mas o código de implementação (TypeScript schema, services, tools) nunca foi criado. A linha 1146 do product.md dizia "Removido Sistema de Decisões", indicando que foi deprioritizado mas não removido do banco.

## Decision

Ativar e implementar o **Sistema de Suporte a Decisões** completo como M3.8, utilizando as tabelas existentes e adicionando:

### 1. Tool `save_decision`

Nova tool para persistir decisões importantes:

```typescript
{
  name: 'save_decision',
  description: `Salva decisão importante do usuário para follow-up futuro.
    QUANDO USAR:
    - Usuário tomou decisão significativa (carreira, finanças, relacionamentos)
    - Decisão tem consequências que podem ser avaliadas depois
    - Usuário quer acompanhamento do resultado
    NUNCA salvar decisões triviais (o que comer, etc.)`,
  parameters: z.object({
    title: z.string().describe('Título breve da decisão'),
    description: z.string().optional().describe('Contexto detalhado'),
    area: z.enum(['health', 'finance', 'professional', 'learning', 'spiritual', 'relationships']),
    options: z.array(z.object({
      title: z.string(),
      pros: z.array(z.string()).optional(),
      cons: z.array(z.string()).optional(),
    })).optional().describe('Opções consideradas'),
    chosenOption: z.string().optional().describe('Opção escolhida'),
    reasoning: z.string().optional().describe('Razão da escolha'),
    reviewDays: z.number().default(30).describe('Dias até follow-up'),
  }),
  requiresConfirmation: true, // SEMPRE requer confirmação
}
```

### 2. Follow-up Proativo

Job diário que verifica decisões com `review_date` próximo:

```typescript
// Decision Follow-up Job (3:30 AM, após Memory Consolidation)
async function processDecisionFollowups() {
  const dueDecisions = await findDecisionsDueForReview(userId);

  for (const decision of dueDecisions) {
    // Adiciona mensagem de follow-up na próxima conversa
    await queueProactiveMessage({
      userId,
      type: 'decision_followup',
      content: `Há ${days} dias você decidiu: "${decision.title}".
                Como foi essa decisão? Gostaria de registrar o resultado?`,
      decisionId: decision.id,
    });
  }
}
```

### 3. Learning Loop

Memory Consolidation extrai padrões de decisões:

```typescript
// Novo campo em consolidation prompt (ai.md §6.5)
decision_patterns: [
  {
    pattern: "Decisões financeiras acima de R$500 feitas por impulso têm 70% de arrependimento",
    frequency: 3,
    suggestion: "Sugerir período de reflexão de 48h para compras acima desse valor"
  }
]
```

### 4. Ciclo de Vida da Decisão

```
draft → analyzing → ready → decided → [postponed|canceled] → reviewed
   ↓         ↓         ↓        ↓                              ↓
Criação  IA analisa  Opções   Escolha                     Follow-up
                    prontas   feita                       com outcome
```

### 5. Integração com Modo Conselheira

O system prompt do Modo Conselheira (ai.md §4.2) é atualizado:

```markdown
## Regra 12: Persistência de Decisões
Quando identificar que o usuário tomou uma decisão importante:
1. Ofereça salvar para acompanhamento futuro
2. Use `save_decision` se aceitar
3. Explique que fará follow-up em X dias
4. Consulte histórico de decisões similares via `search_knowledge`
```

## Consequences

### Positivos

- **Continuidade**: Decisões importantes não se perdem no histórico
- **Accountability**: Follow-up ajuda usuário a avaliar qualidade de suas decisões
- **Learning**: IA melhora conselhos baseado em outcomes reais
- **Diferencial**: Poucos assistentes oferecem tracking de decisões com aprendizado
- **Reuso**: Aproveita tabelas já existentes no banco

### Negativos

- **Complexidade**: Adiciona mais uma entidade ao sistema
- **Storage**: Mais dados armazenados por usuário
- **Intrusividade**: Follow-ups podem ser percebidos como spam (mitigado com opt-out)

### Neutros

- **Opt-in**: Usuário escolhe quais decisões salvar
- **Modo Conselheira**: Continua funcionando sem persistência para quem preferir

## Alternatives Considered

### 1. Manter apenas em chat history

**Descartado**: Decisões se perdem em conversas longas, sem follow-up estruturado.

### 2. Remover tabelas do banco

**Descartado**: Perde diferencial importante do produto, trabalho já feito.

### 3. Implementar apenas persistência sem follow-up

**Descartado**: Perde valor principal (learning loop, accountability).

## Implementation Notes

### Milestone M3.8 — Decision Support Framework

| Sub-milestone | Escopo | Estimativa |
|---------------|--------|------------|
| M3.8.1 | Histórico de Decisões (schema, services, tool) | 20-30h |
| M3.8.2 | Modelagem de Cenários | 30-40h |
| M3.8.3 | Learning Loop (memory consolidation) | 35-45h |
| M3.8.4 | Follow-ups Pós-Decisão (job, notifications) | 25-35h |
| M3.8.5 | Detecção Proativa (identificar decisões em conversa) | 10-15h |

**Início sugerido**: M3.8.1 (Histórico de Decisões) — base para todos os outros.

### Documentos Atualizados

| Documento | Seções |
|-----------|--------|
| **product.md** | §1.4, §2.1, §5.1, §6.X (novo módulo), linha 1146 |
| **system.md** | §1.X (entidade Decision), §3.X (módulo decisões) |
| **ai.md** | §4.1 (regra 12), §6.2 (save_decision), §6.5 (decision_patterns), §6.X (follow-up job) |
| **data-model.md** | §2 (ER diagram), §4.X (tabelas existentes documentadas) |
| **engineering.md** | Referência a este ADR |

## References

- TBD-206: Escopo do Sistema de Decisões
- ADR-012: Tool Use + Memory Consolidation (base arquitetural)
- ADR-014: Real-time Inference (analyze_context)
- ai.md §4.2: Modo Conselheira
- ai.md §7.3: Template de Análise de Decisão
- product.md §2.1: Modo Conselheira (comportamentos)
