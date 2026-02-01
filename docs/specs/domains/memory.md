# Memory System (ADR-012)

> Knowledge management: Knowledge Items, Memory Consolidation, and contradiction detection.

---

## 1. Overview

O sistema de memória do Life Assistant usa uma arquitetura de **Tool Use + Memory Consolidation** (não RAG tradicional). A LLM decide quando buscar dados via function calling.

### Components

| Componente | Propósito | Persistência |
|------------|-----------|--------------|
| **User Memory** | Contexto compacto sempre presente (~500-800 tokens) | `user_memories` |
| **Knowledge Items** | Fatos, preferências, insights buscáveis sob demanda | `knowledge_items` |
| **Memory Consolidation** | Job que extrai conhecimento de conversas | `memory_consolidations` |

### Benefits over RAG

- LLM tem controle sobre o que buscar (não chunks aleatórios por similaridade)
- Menor custo (não processa embeddings a cada mensagem)
- Contexto mais relevante e estruturado
- Inferências automáticas com confidence tracking
- Transparência para o usuário (pode ver e corrigir o que a IA aprendeu)

---

## 2. Knowledge Items

### 2.1 Structure

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID | Identificador único |
| userId | UUID | Dono do item |
| type | enum | `fact`, `preference`, `memory`, `insight`, `person` |
| area | enum | Área da vida (health, finance, etc.) |
| subArea | enum | Sub-área específica |
| title | string | Título curto |
| content | text | Conteúdo detalhado |
| source | enum | `conversation`, `user_input`, `ai_inference` |
| sourceRef | UUID | Referência à origem (conversationId, messageId) |
| inferenceEvidence | text | Evidência para inferências |
| confidence | float | 0.0 a 1.0 |
| validatedByUser | boolean | Se usuário confirmou |
| relatedItems | UUID[] | Itens relacionados |
| tags | string[] | Tags de categorização |
| deletedAt | timestamp | Soft delete |

### 2.2 Types

| Tipo | Descrição | Exemplos |
|------|-----------|----------|
| `fact` | Informação factual sobre o usuário | "Nasceu em 15/03/1990", "Trabalha na Empresa X" |
| `preference` | Preferência declarada | "Prefere café sem açúcar", "Gosta de acordar cedo" |
| `memory` | Evento ou experiência passada | "Viajou para Paris em 2024", "Casou em 2020" |
| `insight` | Padrão ou correlação identificada | "Dorme melhor quando pratica exercício" |
| `person` | Informação sobre pessoa do círculo | "Maria é a esposa", "João é colega de trabalho" |

> **Nota (2026-02-01):** O tipo `person` substitui o módulo de CRM (M2.4). Informações sobre pessoas são capturadas organicamente via conversas e journals, armazenadas como Knowledge Items com `personMetadata` para dados estruturados (nome, relacionamento, aniversário, preferências).

### 2.3 Confidence Levels

| Nível | Range | Fonte Típica |
|-------|-------|--------------|
| High | 0.9 - 1.0 | Declaração explícita do usuário |
| Medium | 0.7 - 0.89 | Inferência forte com evidência |
| Low | 0.5 - 0.69 | Inferência fraca, precisa validação |

**Regras de Confidence:**
- Fatos explícitos: confidence >= 0.9
- Inferências: confidence = 0.7 base, ajustável
- Validação do usuário: confidence += 0.1 (max 1.0)
- Rejeição do usuário: soft delete do item

### 2.4 Visualization

| Feature | Descrição |
|---------|-----------|
| Lista de itens | Todos os fatos organizados por área da vida |
| Indicador de confiança | Mostra certeza da IA (alta/média/baixa) |
| Fonte do item | De onde a IA extraiu (conversa, inferência) |
| Filtros | Por área, tipo, confiança, data |
| Busca | Encontrar qualquer informação por texto |
| Relacionados | Ver itens conectados a um item específico |

### 2.5 Iconography

Cada área da vida tem um ícone Lucide React associado:

| Área | Ícone | Cor |
|------|-------|-----|
| Saúde | `Heart` | red-500 |
| Financeiro | `$` (texto) | green-500 |
| Relacionamentos | `Users` | pink-500 |
| Carreira | `Briefcase` | blue-500 |
| Crescimento Pessoal | `Target` | purple-500 |
| Lazer | `Sparkles` | yellow-500 |
| Espiritualidade | `Sun` | indigo-500 |
| Saúde Mental | `Brain` | teal-500 |

---

## 3. User Memory

Contexto compacto sempre presente no system prompt (~500-800 tokens).

### Structure

```typescript
interface UserMemory {
  name: string;
  age?: number;
  location?: string;
  occupation?: string;
  familyContext?: string;
  currentGoals: string[];
  currentChallenges: string[];
  topOfMind: string[];
  values: string[];
  communicationStyle?: string;
  timezone: string;
  learnedPatterns: Record<string, unknown>;
  version: number;
  lastConsolidatedAt: Date;
}
```

### Update Rules

- Atualizado pelo job de Memory Consolidation (a cada 24h)
- Mantém apenas informações mais relevantes
- Prioriza: goals atuais > desafios > padrões aprendidos
- Version incrementa a cada consolidação

---

## 4. Memory Consolidation

### 4.1 Job Architecture

| Configuração | Valor |
|--------------|-------|
| Queue | `memory-consolidation` |
| Schedule | Diário às 3:00 AM (timezone usuário) |
| Timeout | 5 minutos por usuário |
| Retry | 3 tentativas com backoff exponencial |

> **Deduplicação:** Se o usuário não enviou mensagens desde a última consolidação (`lastConsolidatedAt`), o job é ignorado (retorna sem processar). Isso evita reprocessamento desnecessário e custo com LLM.

### 4.2 Process Flow

```
1. Buscar mensagens desde última consolidação
2. Para cada batch de mensagens:
   a. Extrair fatos explícitos
   b. Identificar preferências
   c. Detectar mudanças de status
   d. Gerar inferências (com evidência)
3. Verificar contradições com conhecimento existente
4. Criar/atualizar knowledge_items
5. Atualizar user_memories compacto
6. Registrar em memory_consolidations
```

### 4.3 Consolidation Prompt

```markdown
Analise as mensagens abaixo e extraia:

## Extrair
1. **Fatos explícitos** - Informações objetivas que o usuário declarou
2. **Preferências** - Gostos, preferências, hábitos declarados
3. **Mudanças de status** - Alterações em trabalho, relacionamento, saúde
4. **Inferências** - Padrões observados (inclua evidência)

## Regras
- Fatos explícitos: confidence = 0.95
- Inferências: confidence = 0.7 (ajuste se evidência forte)
- Inclua área e subArea quando identificável
- Marque contradições com conhecimento existente

## Formato de saída
{
  "facts": [{ "content": "...", "area": "...", "confidence": 0.95 }],
  "preferences": [...],
  "inferences": [{ "content": "...", "evidence": "...", "confidence": 0.7 }],
  "contradictions": [{ "existing": "...", "new": "...", "resolution": "..." }],
  "memoryUpdates": { "topOfMind": [...], "currentGoals": [...] }
}
```

### 4.4 Consolidation Record

```typescript
interface MemoryConsolidation {
  id: string;
  userId: string;
  consolidatedFrom: Date;
  consolidatedTo: Date;
  messagesProcessed: number;
  factsCreated: number;
  factsUpdated: number;
  inferencesCreated: number;
  memoryUpdates: Record<string, unknown>;
  rawOutput: Record<string, unknown>;
  status: 'completed' | 'failed' | 'partial';
  errorMessage?: string;
  createdAt: Date;
}
```

---

## 5. Contradiction Detection

### 5.1 Temporal Knowledge

Alguns fatos são temporais e substituem versões anteriores:

| Categoria | Comportamento |
|-----------|---------------|
| Estado civil | Novo substitui antigo |
| Emprego | Novo substitui antigo |
| Moradia | Novo substitui antigo |
| Peso/altura | Novo é mais recente |
| Objetivos | Podem coexistir ou substituir |

### 5.2 Supersession Rules

```typescript
// Regras de supersessão por tipo
const supersessionRules = {
  'marital_status': 'replace',      // Casado substitui Solteiro
  'employment': 'replace',          // Novo emprego substitui antigo
  'residence': 'replace',           // Nova cidade substitui antiga
  'weight': 'update_timestamp',     // Mantém histórico, usa mais recente
  'goal': 'check_completion',       // Verifica se meta foi concluída
};
```

### 5.3 Conflict Resolution

#### Prioridade de Decisão (3 Tiers)

Quando dois knowledge items conflitam, o sistema decide qual manter:

| Tier | Critério | Regra |
|------|----------|-------|
| 1 | `validatedByUser` | Item confirmado pelo usuário NUNCA é sobrescrito |
| 2 | `confidence` | Item com maior confidence é mantido |
| 3 | `createdAt` | Item mais recente ganha (desempate) |

> Código: `contradiction-resolution.service.ts`

#### Threshold de Detecção

- Valor: `0.7` (70%)
- Contradições com confiança menor são ignoradas (reduz falsos positivos)

#### Comportamento de Supersession

- Item perdedor recebe `supersededById` e `supersededAt`
- **Confidence NÃO é alterada** — representa certeza no momento da criação (Temporal Knowledge)
- Item superseded permanece no histórico (não é deletado)
- UI filtra superseded por padrão; toggle "Ver histórico" mostra todos

> Código: `knowledge-item.repository.ts`

#### Proteção de Input do Usuário

Items criados manualmente pelo usuário:
- Recebem `source: 'user_input'`
- Recebem `confidence: 1.0` automaticamente
- Quando confirmados: `validatedByUser: true`
- Resultado: Máxima proteção (Tier 1 + Tier 2)

#### Fluxo de Resolução

Quando detectada contradição:

1. **Se temporal:** Aplicar regra de supersessão
2. **Se ambíguo:** Criar knowledge_item com `needsResolution = true`
3. **Na próxima conversa:** IA pergunta gentilmente:
   - "Você mencionou antes que [A], mas agora disse [B]. Mudou algo?"
4. **Resposta do usuário:** Atualiza confidence ou deleta item incorreto

### 5.4 Contradiction Detection Prompt

```markdown
## Contexto
- Tipo: {type}
- Área: {area}

## Fato existente
"{existingContent}"

## Fato novo
"{newContent}"

## Instruções
Determine se o FATO NOVO torna o FATO EXISTENTE obsoleto para o ESTADO ATUAL.

### SÃO mudanças de estado (isContradiction: true):
- Estado civil mudou
- Situação financialira mudou
- Local de moradia mudou
- Valor numérico atual é diferente

### NÃO são mudanças de estado (isContradiction: false):
- Evolução temporal (começou → terminou)
- Informações complementares
- Detalhes adicionais

## Resposta (JSON)
{ "isContradiction": boolean, "confidence": 0.0-1.0, "explanation": "..." }
```

### 5.5 Temporal Data Model

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `superseded_by_id` | UUID | ID do item que substituiu este |
| `superseded_at` | TIMESTAMPTZ | Quando foi substituído |

### 5.6 Inferential Reasoning

A IA analisa automaticamente a memória e fornece insights proativos:

| Feature | Descrição |
|---------|-----------|
| Conexões automáticas | Detecta relações entre itens de conhecimento (ex: "Seu stress financeiro correlaciona com gastos impulsivos") |
| Detecção de contradições | Identifica inconsistências na memória (ex: novo fato contradiz um antigo) |
| Resolução automática | Resolve contradições com regras de prioridade (item confirmado > maior confiança > mais recente) |
| Insights temporais | Analisa padrões ao longo do tempo |

### 5.7 UI: Toggle "Ver Historico"

Quando um knowledge item tem supersession:
- Exibir toggle "Ver historico" na UI
- Mostrar itens anteriores com status "superseded"
- Destacar o item atual como fonte principal

### 5.8 Export Temporal

No export de memoria, incluir historico temporal completo:
- Itens superseded com `superseded_by_id` e `superseded_at`
- Ordenacao cronologica por `created_at`
- Flag `is_current` para facilitar consumo no cliente

---

## 6. AI Tools

> **Nota:** Tools de tracking como `record_metric` e `get_user_context` estão documentadas em [tracking.md](tracking.md). Esta seção cobre apenas tools específicas do sistema de memória.

### 6.1 search_knowledge

Busca fatos, preferências ou insights sobre o usuário.

```typescript
{
  name: 'search_knowledge',
  parameters: {
    query: string,        // O que buscar
    type?: KnowledgeType, // Filtrar por tipo
    area?: LifeArea,      // Filtrar por área
    limit?: number,       // Max 10, default 5
  },
  requiresConfirmation: false,
}
```

### 6.2 add_knowledge

Registra novo fato aprendido sobre o usuário.

```typescript
{
  name: 'add_knowledge',
  parameters: {
    type: KnowledgeType,
    content: string,
    area: LifeArea,        // OBRIGATÓRIO
    subArea?: SubArea,
    confidence?: number,   // Default 0.9
  },
  requiresConfirmation: false,
}
```

**Quando usar:**
- ✅ Fatos permanentes, preferências declaradas, mudanças de status
- ❌ Opiniões momentâneas, estados temporários, especulações

### 6.3 analyze_context

Analisa contexto para encontrar conexões e contradições.

```typescript
{
  name: 'analyze_context',
  parameters: {
    currentTopic: string,
    relatedAreas: LifeArea[],
    lookForContradictions?: boolean,
  },
  requiresConfirmation: false,
}
```

**Retorna:**
- Fatos relacionados ao tópico
- Padrões aprendidos relevantes
- Contradições detectadas (se solicitado)
- Sugestões de conexões

---

## 7. User Actions

### 7.1 View Memory

Usuário pode ver lista de knowledge_items organizada por área.

### 7.2 Validate Item

Usuário confirma item como correto:
- `validatedByUser = true`
- `confidence += 0.1` (max 1.0)

### 7.3 Correct Item

Usuário corrige informação incorreta:
- Cria novo item com valor correto
- Soft delete do item incorreto
- Novo item: `confidence = 1.0`

### 7.4 Delete Item

Usuário remove item:
- Soft delete (`deletedAt = now`)
- Item não aparece mais em buscas
- Mantido para auditoria

### 7.5 Add Item

Usuário adiciona informação que a IA não sabe:
- Cria knowledge_item manual
- `validatedByUser = true`
- `confidence = 1.0`

### 7.6 View History

Usuário pode ver quando o item foi criado/atualizado:
- `createdAt`, `updatedAt`
- Histórico de supersessão (se aplicável)

---

## 8. Automatic Notes & Export

### 8.1 Automatic Notes

| Feature | Descrição |
|---------|-----------|
| Nota de consulta | Resumo preparado para consultas médicas |
| Nota de relatório | Relatórios semanais/mensais salvos como nota |

### 8.2 Export

| Feature | Descrição |
|---------|-----------|
| Exportar memória | Download de todos os itens em JSON ou Markdown |
| Exportar notas | Download de notas automáticas em .md |

---

## 9. Data Model

### 9.1 Tables

```sql
-- Memória compacta do usuário
CREATE TABLE user_memories (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES users(id),
  name VARCHAR(255),
  age INTEGER,
  location VARCHAR(255),
  occupation VARCHAR(255),
  family_context TEXT,
  current_goals TEXT[],
  current_challenges TEXT[],
  top_of_mind TEXT[],
  values TEXT[],
  communication_style VARCHAR(100),
  timezone VARCHAR(50),
  learned_patterns JSONB,
  version INTEGER DEFAULT 1,
  last_consolidated_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Itens de conhecimento
CREATE TABLE knowledge_items (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  type knowledge_item_type NOT NULL,
  area life_area,
  sub_area sub_area,
  title VARCHAR(255),
  content TEXT NOT NULL,
  source knowledge_item_source NOT NULL,
  source_ref UUID,
  inference_evidence TEXT,
  confidence REAL DEFAULT 0.9,
  validated_by_user BOOLEAN DEFAULT FALSE,
  related_items UUID[],
  tags TEXT[],
  deleted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Histórico de consolidações
CREATE TABLE memory_consolidations (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  consolidated_from TIMESTAMP NOT NULL,
  consolidated_to TIMESTAMP NOT NULL,
  messages_processed INTEGER,
  facts_created INTEGER,
  facts_updated INTEGER,
  inferences_created INTEGER,
  memory_updates JSONB,
  raw_output JSONB,
  status consolidation_status NOT NULL,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 9.2 RLS Policies

```sql
ALTER TABLE user_memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE memory_consolidations ENABLE ROW LEVEL SECURITY;

-- Uses Supabase built-in auth.uid() function
CREATE POLICY "user_access" ON user_memories
  FOR ALL USING (user_id = (SELECT auth.uid()));

CREATE POLICY "user_access" ON knowledge_items
  FOR ALL USING (user_id = (SELECT auth.uid()));

CREATE POLICY "user_access" ON memory_consolidations
  FOR ALL USING (user_id = (SELECT auth.uid()));
```

> **Referência:** Ver `docs/specs/core/auth-security.md` §3.2 para detalhes sobre `auth.uid()`.

---

## 10. Definition of Done

- [ ] Lista de knowledge_items exibida
- [ ] Filtros (área, tipo, confiança) funcionando
- [ ] Busca por texto implementada
- [ ] Validar item funciona
- [ ] Corrigir item funciona
- [ ] Deletar item funciona
- [ ] Job de consolidação executa diariamente
- [ ] search_knowledge tool funciona
- [ ] add_knowledge tool funciona
- [ ] analyze_context tool funciona
- [ ] Contradições detectadas e resolvidas
- [ ] User Memory atualizado após consolidação
- [ ] Notas automáticas geradas
- [ ] Export de memória e notas funcionando

---

*Última atualização: 27 Janeiro 2026*
