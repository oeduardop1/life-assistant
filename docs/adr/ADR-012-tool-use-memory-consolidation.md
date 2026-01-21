# ADR-012: Tool Use + Memory Consolidation Architecture

## Status

Accepted

## Date

2026-01-11

## Context

O sistema Life Assistant originalmente planejava usar **RAG (Retrieval Augmented Generation)** com embeddings e busca vetorial para injetar contexto relevante nas conversas com a IA. Esta abordagem envolvia:

- Geração de embeddings para mensagens, notas, decisões e tracking entries
- Armazenamento em pgvector para busca por similaridade
- Recuperação automática de chunks a cada mensagem do usuário
- Uso de LangChain.js para orquestração do pipeline RAG

Após análise comparativa com sistemas como **Claude AI** e **Claude Code**, identificamos limitações nesta abordagem:

1. **Falta de controle**: RAG injeta chunks baseado em similaridade, não em necessidade real
2. **Custo desnecessário**: Embeddings são gerados a cada mensagem, mesmo para conversas simples
3. **Contexto fragmentado**: Chunks podem perder contexto ao serem cortados
4. **Opacidade**: Usuário não sabe o que a IA "lembra" sobre ele

## Decision

Substituir RAG tradicional por **Tool Use + Memory Consolidation**:

### 1. Tool Use (Function Calling)

A LLM decide quando precisa buscar dados, chamando tools específicas:

```typescript
// Tools disponíveis (ver packages/ai/src/schemas/tools/ para definições completas)
// Status: ✅ executor implementado | 🔜 schema definido, executor em milestone futuro

// READ tools (sem confirmação):
const readTools = [
  { name: 'search_knowledge', description: 'Busca fatos, preferências, insights' }, // ✅ M1.3
  { name: 'analyze_context', description: 'Analisa contexto para conexões e contradições' }, // ✅ M1.7
  { name: 'get_tracking_history', description: 'Obtém histórico de métricas' }, // 🔜 M2.1
  { name: 'get_person', description: 'Obtém informações de pessoa do CRM' }, // 🔜 M2.4
];

// WRITE tools (requerem confirmação, exceto add_knowledge):
const writeTools = [
  { name: 'add_knowledge', description: 'Adiciona fato aprendido' }, // ✅ M1.3
  { name: 'record_metric', description: 'Registra métrica (peso, gasto, etc.)' }, // 🔜 M2.1
  { name: 'create_reminder', description: 'Cria lembrete' }, // 🔜 M3.4
  { name: 'update_person', description: 'Atualiza pessoa no CRM' }, // 🔜 M2.4
];
```

### 2. User Memory (Contexto Sempre Presente)

Contexto compacto (~500-800 tokens) sempre injetado no system prompt:

- Nome, idade, localização, ocupação
- Objetivos e desafios atuais
- Preferências de comunicação
- Padrões aprendidos
- Top of mind (prioridades atuais)

### 3. Memory Consolidation (Job Assíncrono)

Job que roda a cada 24h para extrair conhecimento das conversas:

- Fatos novos (com confidence score)
- Atualizações de fatos existentes
- Inferências/insights sobre o usuário
- Padrões de comportamento (3+ ocorrências)

## Consequences

### Positivos

- **Maior controle**: LLM decide quando buscar dados, não busca automática
- **Menor custo**: Sem embeddings a cada mensagem
- **Contexto estruturado**: User memory é compacto e sempre relevante
- **Aprendizado contínuo**: Memory consolidation extrai conhecimento automaticamente
- **Transparência**: Usuário pode ver e corrigir o que a IA aprendeu
- **Inferências**: IA tira conclusões com confidence tracking

### Negativos

- **Complexidade de tools**: Requer definição cuidadosa de cada tool
- **Job adicional**: Memory consolidation adiciona complexidade de background job
- **Latência potencial**: Tool calls adicionam roundtrips (mitigado por tool loop eficiente)

### Impacto Técnico

| Componente | Antes | Depois |
|------------|-------|--------|
| pgvector | Necessário | **Removido** |
| LangChain.js | Necessário | **Removido** |
| Embeddings | A cada mensagem | Não usado |
| Context | RAG chunks | User memory + tools |
| Aprendizado | Manual (notas) | Automático (consolidation) |

## Alternatives Considered

### 1. Manter RAG Tradicional
- **Descartado**: Menor controle sobre o que é injetado no contexto

### 2. Híbrido RAG + Tools
- **Descartado**: Complexidade desnecessária, tools são suficientes

### 3. Só Tools (sem Memory Consolidation)
- **Descartado**: Perderia capacidade de aprendizado contínuo

### 4. Memory Consolidation em Tempo Real
- **Descartado**: Custo alto, 24h é suficiente para a maioria dos casos

## Implementation Notes

### Novas Tabelas

```sql
-- Contexto compacto do usuário (sempre no prompt)
CREATE TABLE user_memories (...)

-- Fatos granulares buscáveis via tools
CREATE TABLE knowledge_items (...)

-- Log de consolidações
CREATE TABLE memory_consolidations (...)
```

### Tabelas Removidas

```sql
-- Não mais necessária
DROP TABLE embeddings;
```

### Jobs Atualizados

| Job | Status |
|-----|--------|
| `process-embeddings` | **Removido** |
| `memory-consolidation` | **Novo** |

## References

- [Claude AI Memory System](https://claude.ai) - Inspiração para user memory
- [Claude Code Tool Use](https://claude.ai/code) - Inspiração para tool architecture
- [Gemini Function Calling](https://ai.google.dev/docs/function_calling) - API reference
- [Anthropic Tool Use](https://docs.anthropic.com/claude/docs/tool-use) - API reference
