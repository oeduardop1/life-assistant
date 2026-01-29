# ADR-016: Decisions via Knowledge Items

## Status

Accepted

## Date

2026-01-29

## History

> **Nota:** Este ADR substitui a versão anterior de 2026-01-19 que propunha um módulo dedicado de Decision Support com 4 tabelas, tool `save_decision`, e follow-up job. Após análise, concluiu-se que essa abordagem era redundante com o sistema de memória existente.

## Context

O Life Assistant possui o Modo Conselheira que oferece análise de decisões via prompt engineering (ai-personality.md §5.2). A versão anterior deste ADR propunha adicionar:

- 4 tabelas dedicadas (`decisions`, `decision_options`, `decision_criteria`, `decision_scores`)
- Tool `save_decision` para persistir decisões
- Job de follow-up proativo (3:30 AM)
- Learning loop com `decision_patterns` no Memory Consolidation

### Análise de Redundância

| Feature Proposta | Já Existe Via |
|------------------|---------------|
| Persistir decisões | `add_knowledge` com type: "fact" |
| Consultar decisões passadas | `search_knowledge` por área/tipo |
| Detectar padrões | Memory Consolidation (genérico) |
| Análise estruturada | §5.2 Decision Analysis prompt |
| Follow-up | Usuário pode iniciar conversa quando quiser |

### Motivos para Eliminar Módulo Dedicado

1. **Redundância:** Sistema de knowledge items já persiste informações importantes
2. **Over-engineering:** Matriz de critérios × opções × pesos é formal demais para uso cotidiano
3. **Preferência do usuário:** Follow-up proativo não desejado — usuário prefere ir até a IA quando quiser
4. **Complexidade desnecessária:** 4 tabelas + tool + job para funcionalidade que já existe

## Decision

**Não implementar módulo dedicado de Decision Support.**

Decisões importantes serão salvas via `add_knowledge` com formato consistente:

```typescript
// Instrução no system prompt
add_knowledge({
  type: "fact",
  content: "[DECISÃO] Título: X. Escolha: Y. Motivo: Z.",
  area: "professional", // ou finance, health, relationships, etc.
  confidence: 1.0
});
```

### Fluxo Simplificado

```
1. Usuário discute decisão no Modo Conselheira
2. IA ajuda com análise (§5.2 Decision Analysis)
3. Usuário toma decisão
4. IA salva via add_knowledge (se relevante)
5. Quando usuário quiser refletir, inicia nova conversa
6. search_knowledge encontra decisões passadas
7. IA faz conexões naturalmente
```

### O Que Permanece

| Feature | Status |
|---------|--------|
| Modo Conselheira | Inalterado |
| §5.2 Decision Analysis prompt | Inalterado |
| `analyze_context` tool | Inalterado |
| `add_knowledge` / `search_knowledge` | Inalterado |
| Memory Consolidation | Inalterado |

### O Que Foi Removido

| Feature | Status |
|---------|--------|
| Tabelas `decisions`, `decision_options`, etc. | Não implementar |
| Tool `save_decision` | Não implementar |
| Job `decision-followup` | Não implementar |
| `decision_patterns` no Memory Consolidation | Não implementar |
| Milestones M1.11 e M3.7 | Removidos |

## Consequences

### Positivos

- **Simplicidade:** Zero tabelas novas, zero tools novas
- **Menos manutenção:** Sem job adicional para gerenciar
- **Consistência:** Decisões são tratadas como qualquer outro conhecimento
- **Flexibilidade:** Usuário decide quando quer refletir sobre decisões

### Negativos

- **Sem follow-up automático:** Usuário precisa lembrar de revisar decisões
- **Menos estrutura:** Decisões são texto livre, não matriz de critérios

### Neutros

- **Análise de decisões:** Continua funcionando via Counselor Mode
- **Histórico:** Decisões são persistidas via knowledge items

## Alternatives Considered

### 1. Implementar módulo completo (versão anterior)

**Descartado:** Redundante com sistema existente, over-engineering.

### 2. Implementar apenas tool save_decision

**Descartado:** Ainda redundante — `add_knowledge` já faz o mesmo.

### 3. Implementar apenas follow-up job

**Descartado:** Usuário não quer notificações proativas de decisões.

## References

- ai-personality.md §5.2: Decision Analysis prompt
- ai-personality.md §8: Tool Use Architecture
- ADR-012: Tool Use + Memory Consolidation
- Milestones removidos: M1.11 (Decision Support Core), M3.7 (Decision Follow-up)
