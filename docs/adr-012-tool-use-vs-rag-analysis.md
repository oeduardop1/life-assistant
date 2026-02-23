
## 1. O que o ADR-012 decidiu

O ADR eliminou completamente RAG/embeddings/pgvector e optou por:

- **Tool Use:** 21 functions definidas (13 read, 8 write), das quais **18 estão ativas** no ChatService — 3 tools (recordHabit, getHabits, createReminder) estão definidas em `packages/ai` mas não registradas em `ChatService.availableTools` nem no `toolToExecutorMap`, portanto o LLM não as vê durante o chat
- **User Memory:** ~500-800 tokens injetados no system prompt a cada mensagem
- **Memory Consolidation:** Job diário às 3:00 AM (timezone do usuário) que extrai fatos das conversas

---

## 2. Classificação dos dados do projeto

Para uma análise justa, categorizei as 26 tabelas do schema (`packages/database/src/schema/`) por tipo de dado:

| Tipo | Tabelas | Exemplos |
|---|---|---|
| Estruturado, consulta exata | 20 | incomes, bills, debts, tracking, goals, budgets, calendar, debt-payments, exports, integrations, investments, notifications, preferences, reminders, scores, subscriptions, users, variable-expenses, habits (via tracking), custom-metrics |
| Semi-estruturado | 3 | knowledge_items (facts com area/type/confidence), user_memories (compacted text), vault (documents + metadata) |
| Não-estruturado | 3 | messages/conversations (content livre), notes (markdown), audit (logs) |

---

## 3. Onde o ADR-012 acerta (Tool Use > RAG)

### 3.1 Dados financeiros — Tool Use vence de forma inequívoca

O benchmark TAG (UC Berkeley, CIDR 2025) demonstrou que todos os baselines tradicionais — incluindo RAG e Text2SQL — atingem <20% accuracy no benchmark TAG, que testa queries complexas envolvendo agregação, comparação, ranking e raciocínio semântico. Para perguntas como "Quanto gastei com alimentação em janeiro?", um `SELECT SUM(amount) WHERE category='food' AND month='2025-01'` retorna um valor deterministicamente correto. RAG retornaria chunks semanticamente próximos, possivelmente incluindo gastos de outros meses ou categorias vizinhas.

**Veredicto: ADR-012 correto.**

### 3.2 Operações de escrita — Tool Use é a única opção

8 das 21 tools definidas são write operations (record_metric, create_expense, mark_bill_paid, etc.), das quais 7 estão ativas no ChatService. RAG é read-only por natureza. Não existe alternativa.

**Veredicto: ADR-012 correto.**

### 3.3 Tracking/métricas — Tool Use vence

Queries temporais com filtros exatos (`get_tracking_history(metric='weight', days=30)`) requerem precisão. O benchmark Mem0/LOCOMO (arXiv 2504.19413) mostrou que OpenAI Memory (injection-based) atinge apenas 21.71% em queries temporais, enquanto Mem0 — que combina semantic search com fact extraction — atinge 55.51%. Tool Use com SQL supera ambos para dados estruturados.

**Veredicto: ADR-012 correto.**

### 3.4 Eliminação de custo de embeddings

O ADR elimina:

- Geração de embeddings a cada mensagem
- Armazenamento em pgvector
- Dependência de LangChain.js

Para um sistema com ~80% de dados estruturados, gerar embeddings em cada mensagem seria desperdício. O artigo "HNSW at Scale" (TowardsDataScience, Jan 2026¹) mostra que recall degrada de ~99% (10K vectors) para ~85% (10M vectors) com configurações padrão — o sistema perderia precisão à medida que crescesse.

¹ Blog post, não paper peer-reviewed. Testes realizados com LAION dataset + CLIP embeddings.

**Veredicto: ADR-012 correto.**

---

## 4. Onde o ADR-012 tem pontos cegos

### 4.1 Busca em notas (notes) — RAG seria superior

A tabela `notes` armazena markdown livre com conteúdo potencialmente longo. O tool `search_knowledge` busca em `knowledge_items`, não em notas diretamente. Se o usuário perguntar "O que eu escrevi sobre minha viagem a São Paulo?", o sistema depende de:

1. O consolidation job ter extraído essa informação como knowledge_item, OU
2. Existir um tool específico de busca em notas (não encontrado nas 18 tools ativas no ChatService)

RAG com embeddings sobre notas teria recall superior para busca semântica em texto livre. O usuário pode ter escrito "escapada para Sampa no carnaval" — busca por keyword falharia, mas embedding capturaria a similaridade semântica.

**Impacto: Médio-alto.** Notas são um recurso central do app.

### 4.2 Busca em histórico de conversas — lacuna real

Com potencialmente milhares de mensagens, o sistema não tem como buscar "aquela conversa que tivemos sobre trocar de emprego". Não existe tool de busca em mensagens, e o Memory Consolidation captura apenas fatos extraídos — não o contexto completo da conversa.

O benchmark LOCOMO (arXiv 2504.19413) mostrou que Mem0 (semantic search + fact extraction) atinge 66.88% de accuracy geral vs 52.90% do OpenAI Memory (injection-based). A diferença de ~14 pontos reflete principalmente o desempenho superior em queries temporais e multi-hop que requerem recall de detalhes conversacionais.

**Impacto: Alto.** "O que discutimos sobre X?" é um padrão de uso frequente em assistentes pessoais.

### 4.3 Knowledge items com busca por texto — limitação

O `search_knowledge` busca em `knowledge_items` usando `ILIKE` (substring case-insensitive) nos campos `title` e `content`, com filtros opcionais de type/area/subArea. O código contém o comentário enganoso `// Full-text search on title and content`, mas a implementação real é `ilike(title, '%${query}%') OR ilike(content, '%${query}%')` — pattern matching, não PostgreSQL full-text search (`tsvector/tsquery`).

Se o conteúdo de um knowledge_item for "Eduardo mencionou que prefere restaurantes japoneses perto do centro", e o usuário perguntar "onde eu gosto de comer?", a busca depende de:

- **Match de substring via ILIKE:** "comer" não é substring de "restaurantes japoneses" — busca falharia
- **Filtros corretos:** O LLM precisa inferir area e subArea corretos para encontrar via filtro

RAG com embeddings encontraria isso via similaridade semântica sem depender de categorização perfeita.

**Impacto: Médio.** Cresce com o volume de knowledge_items.

### 4.4 O ADR subestima o custo de Tool Use

O ADR lista como negativo "latência potencial de tool calls" mas não quantifica. Dados reais:

| Abordagem | Tokens por query | Roundtrips |
|---|---|---|
| RAG injection | +3K-5K input tokens, 0 roundtrips extras | 1 |
| Tool Use simples | +500-2K tokens/tool, 1-2 roundtrips | 2-3 |
| Tool Use complexo | +2K-5K tokens/tool, 3-5 roundtrips | 4-6 |

Para queries que requerem múltiplos tools (ex: "como estou financeiramente e na saúde?"), o sistema faz 3-5 tool calls sequenciais. Cada call é um roundtrip completo com reasoning tokens (cobrados como output tokens, que custam 3-5x mais que input tokens).

O paper "Online-Optimized RAG for Tool Use" (arXiv 2509.20415) propõe o uso de RAG especificamente para melhorar a seleção de tools, evidenciando que a seleção nativa por LLMs tende a degradar à medida que o inventário cresce. O projeto tem 21 tools definidas (18 ativas) — um ponto a monitorar conforme novas ferramentas são adicionadas. A migração para multi-agente (onde cada agente vê apenas 3-11 tools) mitiga esse problema de forma mais direta.

### 4.5 Memory Consolidation diária — risco de stale data

O consolidation job roda diariamente às 3:00 AM no timezone do usuário (CRON `'0 3 * * *'`), não "a cada 24h" relativas. Isso significa:

- Fato aprendido às 8h da manhã → insights extraídos pelo consolidation só ficam disponíveis às 3:00 AM do dia seguinte (~19h de delay)
- Fato aprendido às 2:55 AM → disponível em ~5 minutos
- Exceção: `add_knowledge` é chamado em tempo real pelo LLM durante a conversa (fatos explícitos são imediatos)
- Mas insights e padrões cross-conversation ficam atrasados até o próximo run

O benchmark Mem0 mostra que temporal awareness é o maior diferenciador entre memory systems. O delay prejudica queries como "o que mudou na minha rotina esta semana?".

---

## 5. O que o ADR descartou prematuramente

### 5.1 "Híbrido RAG + Tools — Descartado: Complexidade desnecessária"

Esta é a decisão mais questionável do ADR. O consenso da indústria em 2025-2026 (IBM, NVIDIA, Microsoft, Google) é que sistemas híbridos são superiores. O padrão dominante:

- **Dados estruturados** → Tool Use (SQL/API)
- **Dados não-estruturados** → RAG (embeddings + busca semântica)
- **Ações** → Tool Use (write operations)
- **Personalização** → Memory injection (system prompt)

A justificativa "tools são suficientes" é verdadeira para ~80% dos dados do projeto (finanças, tracking, habits) mas falha para os ~20% restantes (notas, histórico de conversas, knowledge items com busca semântica).

### 5.2 "RAG com Memory Consolidation em Tempo Real — Descartado: Custo alto"

O custo de gerar embeddings sob demanda é $0.02-0.13 por milhão de tokens (OpenAI ada-002/text-embedding-3). Para um SaaS pessoal com ~100 mensagens/dia/usuário e ~500 tokens/mensagem, o custo seria:

```
100 msgs × 500 tokens = 50,000 tokens/dia
50,000 × $0.02/1M = $0.001/dia/usuário = $0.03/mês/usuário
```

Custo negligível. A justificativa de "custo alto" não se sustenta para embeddings — o custo real do RAG está nos tokens de contexto injetados no LLM, que o Tool Use também paga via reasoning tokens.

---

## 6. Matriz comparativa final

| Critério | Tool Use (ADR-012) | RAG Puro | Híbrido |
|---|---|---|---|
| Queries financeiras exatas | A+ | D | A+ |
| Agregações/cálculos | A+ | F | A+ |
| Operações de escrita | A+ | F | A+ |
| Busca semântica em notas | D | A | A |
| Recall de conversas antigas | F | B+ | B+ |
| Busca em knowledge_items | C+ | A- | A |
| Latência (query simples) | B+ | A | B |
| Latência (query complexa) | C | B | B |
| Custo por query | B | B+ | B |
| Escalabilidade de tools (>30) | C | N/A | B+ |
| Complexidade de implementação | A | B | C+ |
| Aprendizado contínuo | B+ | C | A |

---

## 7. Conclusão técnica

### O que o ADR-012 acerta:

- Eliminar RAG como mecanismo primário para dados estruturados (80% do domínio)
- Tool Use para finanças, tracking, habits, goals — decisão sólida
- User Memory injection — alinhado com o que ChatGPT e Claude fazem
- Memory Consolidation — conceito valido para aprendizado contínuo

### O que o ADR-012 erra:

- Tratar RAG e Tool Use como mutuamente exclusivos quando a indústria converge para complementares
- Descartar RAG para os ~20% de dados não-estruturados (notas, conversas, busca semântica em knowledge_items) sem análise de trade-off
- Subestimar o custo real de embeddings ($0.03/mês/usuário) ao descartá-lo por "custo"
- Não prever o problema de tool selection à medida que o inventário cresce (21 tools definidas / 18 ativas atualmente, tendência de degradação documentada — mitigado pela migração planejada para multi-agente)

### Recomendação baseada nos dados:

Um approach **híbrido seletivo** seria tecnicamente superior:

1. **Manter Tool Use** para dados estruturados e write operations (como está)
2. **Adicionar RAG limitado** apenas para: notas, histórico de conversas, e busca semântica em knowledge_items
3. **User Memory injection** continua como está
4. **Memory Consolidation** continua, mas considerar reduzir o intervalo para 6-12h
5. **RAG para tool selection** quando o inventário ultrapassar 30 tools (futuro)

A complexidade adicional é localizada — um embedding pipeline apenas para 3 tabelas (notes, messages, knowledge_items), não para todo o sistema. Não requer LangChain.js; Drizzle + pgvector + um endpoint de embedding da OpenAI/Gemini são suficientes.

---

**Fontes:** TAG Benchmark (UC Berkeley CIDR 2025), Mem0/LOCOMO Benchmark (arXiv 2504.19413), HNSW at Scale (TowardsDataScience 2026), Online-Optimized RAG for Tool Use (arXiv 2509.20415), Microsoft RAG + Function Calling guidance (2025), IBM/NVIDIA Agentic RAG (2025).

> **Caveats das fontes:**
> ¹ HNSW at Scale é blog post, não paper peer-reviewed.
> ² Números do Mem0/LOCOMO referem-se a scores de produtos específicos (Mem0 vs OpenAI Memory), não categorias genéricas de arquitetura.
