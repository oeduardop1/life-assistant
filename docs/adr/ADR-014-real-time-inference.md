# ADR-014: Real-time Inference Architecture

## Status

Accepted

## Date

2026-01-13

## Context

O ADR-012 estabeleceu a arquitetura de **Tool Use + Memory Consolidation**, onde:
- Tools (`search_knowledge`, `add_knowledge`) permitem acesso sob demanda
- Memory Consolidation Job (3AM) extrai patterns e inferências das conversas diárias

A seção "Alternatives Considered" do ADR-012 descartou "Memory Consolidation em Tempo Real" devido ao custo alto de processar todas as conversas em tempo real.

**Porém**, identificamos uma lacuna importante:

A IA atualmente não faz **conexões entre fatos** durante as conversas:
- Usuário menciona "estou devendo R$5000" em uma conversa
- Dias depois diz "estou dormindo mal"
- A IA deveria inferir: "pode estar relacionado à ansiedade com a dívida"

Este tipo de raciocínio inferencial é **crítico** para:
1. **Decisões**: Analisar contexto completo antes de recomendar
2. **Conselhos**: Conectar problemas aparentemente não relacionados
3. **Detecção de contradições**: Identificar inconsistências nas informações

## Decision

Implementar **Real-time Inference** como extensão do ADR-012, usando arquitetura **Cache + Fallback**:

### Arquitetura de Dois Níveis

```
┌─────────────────────────────────────────────────────────────────┐
│  NÍVEL 1: Batch (Job 3AM - JÁ EXISTE via ADR-012)              │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ • Processa todas as conversas do dia                    │   │
│  │ • Encontra padrões (mínimo 3 ocorrências)               │   │
│  │ • Salva como "insight" + learnedPatterns               │   │
│  │ • Alta confiança (>= 0.7)                              │   │
│  └─────────────────────────────────────────────────────────┘   │
│                           ↓ salva                               │
│                    [knowledge_items]                            │
│                    [user_memories.learnedPatterns]              │
│                           ↓ consulta                            │
│  NÍVEL 2: Real-time (NOVO - ADR-014)                           │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ • Context Builder traz patterns no prompt               │   │
│  │ • Nova tool analyze_context para inferências on-demand  │   │
│  │ • Detecção de contradições                             │   │
│  │ • Não persiste (apenas responde)                       │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 1. Nova Tool: `analyze_context`

Tool que a LLM chama quando precisa fazer análise profunda:

```typescript
{
  name: 'analyze_context',
  description: 'Analisa o contexto atual buscando conexões, padrões e contradições',
  parameters: {
    currentTopic: string,      // Assunto atual
    relatedAreas: LifeArea[],  // Áreas potencialmente relacionadas
    lookForContradictions: boolean,
  },
  returns: {
    relatedFacts: KnowledgeItem[],
    existingPatterns: LearnedPattern[],
    potentialConnections: string[],
    contradictions: Contradiction[],
  }
}
```

### 2. Context Builder Aprimorado

Incluir `learnedPatterns` de alta confiança no system prompt:

```typescript
## Padrões Aprendidos (Alta Confiança)
- Fica ansioso antes de reuniões importantes (baseado em: 3 ocorrências em Jan/2026)
- Gasta mais quando estressado (baseado em: padrão identificado em Dez/2025)
```

### 3. Instruções de Raciocínio no System Prompt

```typescript
## Raciocínio Inferencial
1. Antes de responder sobre assuntos pessoais importantes, use analyze_context
2. Quando detectar conexão relevante, mencione naturalmente
3. Quando detectar contradição, pergunte gentilmente
```

## Consequences

### Positivos

- **Respostas mais contextualizadas**: IA conecta informações de diferentes conversas
- **Detecção de contradições**: Evita aceitar informações conflitantes
- **Reutilização de cache**: Patterns do batch job são usados em tempo real
- **Custo controlado**: Tool é chamada apenas quando necessário (não automático)
- **Não persiste em tempo real**: Inferências on-demand não poluem a base

### Negativos

- **Latência adicional**: 1 tool call extra quando analyze_context é usado
- **Tokens extras**: ~100-200 tokens para patterns no prompt
- **Complexidade de prompt**: Instruções de raciocínio adicionam tokens

### Trade-offs

| Aspecto | Batch (ADR-012) | Real-time (ADR-014) |
|---------|-----------------|---------------------|
| Quando executa | 3AM diário | Durante conversa |
| Custo | Fixo por dia | Por tool call |
| Persistência | Salva em DB | Não persiste |
| Confiança mínima | 0.7 | Não aplica |
| Ocorrências | 3+ | Qualquer |

## Alternatives Considered

### 1. Expandir Memory Consolidation para tempo real
- **Descartado**: ADR-012 já considerou e descartou por custo

### 2. Melhorar apenas search_knowledge
- **Descartado**: Não detecta contradições nem faz conexões

### 3. Incluir todos os knowledge_items no prompt
- **Descartado**: Excederia limite de tokens

### 4. Inferência automática em toda mensagem
- **Descartado**: Custo alto, LLM deve decidir quando usar

## Implementation Notes

### Infraestrutura Reutilizada (do ADR-012)

| Campo | Tabela | Uso |
|-------|--------|-----|
| `inferenceEvidence` | knowledge_items | Evidência de inferências batch |
| `confidence` | knowledge_items | Score 0.0-1.0 |
| `source: 'ai_inference'` | knowledge_items | Marca itens do batch |
| `learnedPatterns` | user_memories | Patterns com evidence |

### Novos Componentes

| Componente | Descrição |
|------------|-----------|
| `analyze-context.tool.ts` | Schema da nova tool |
| `MemoryToolExecutorService` | Handler para analyze_context |

### Nenhuma Migração Necessária

A infraestrutura de dados já existe (ADR-012). Apenas código novo.

## References

- [ADR-012: Tool Use + Memory Consolidation](./ADR-012-tool-use-memory-consolidation.md)
- [AI_SPECS.md §6.5](../../AI_SPECS.md) - Memory Consolidation specification
- [MILESTONES.md M1.7](../../MILESTONES.md) - Real-time Inference milestone
