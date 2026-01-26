# Fase 1: Conselheira (v1.x)

> **Objetivo:** Implementar a feature principal de ajudar o usuário através de chat com IA e memória gerenciada pela IA (ADR-012).
> **Referências:** `docs/specs/README.md`, `docs/specs/core/ai-personality.md`, `docs/specs/domains/chat.md`

---

## M1.1 — Package: AI (LLM Abstraction + Tool Use) 🟢

**Objetivo:** Criar abstração de LLM com suporte a Tool Use (Function Calling).

**Referências:** `docs/specs/core/architecture.md` §8, `docs/specs/core/ai-personality.md` §2, `ADR-012`

**Tasks:**

- [x] Criar interface `LLMPort` conforme `docs/specs/core/ai-personality.md` §6:
  ```typescript
  interface LLMPort {
    chat(params: ChatParams): Promise<ChatResponse>;
    chatWithTools(params: ChatWithToolsParams): Promise<ChatWithToolsResponse>;
    stream(params: ChatParams): AsyncIterable<StreamChunk>;
    streamWithTools(params: ChatWithToolsParams): AsyncIterable<StreamChunk>;
    getInfo(): ProviderInfo;
  }
  ```
- [x] Criar `ToolDefinition` schema com Zod (incluir `inputExamples`)
- [x] **Implementar Tool Use Examples por provider:**
  - [x] Claude: usar campo `input_examples` com beta header `advanced-tool-use-2025-11-20`
  - [x] Gemini: criar método `enrichDescriptionWithExamples()` para workaround
  - [x] Adicionar exemplos para todas as 7 tools conforme `docs/specs/core/ai-personality.md` §8
- [x] Implementar `GeminiAdapter` com suporte a Function Calling
- [x] Implementar `ClaudeAdapter` com suporte a Tool Use
- [x] Criar `LLMFactory` que retorna adapter baseado em ENV
- [x] Implementar rate limiting
- [x] Implementar retry com backoff exponencial
- [x] Criar `ToolExecutorService` (executa tools chamadas pela LLM)
- [x] Implementar tool loop com max iterations (5)
- [x] Testes para ambos adapters (incluindo Tool Use)
- [x] Criar `zod-to-gemini.ts` (conversor Zod → Gemini Type)
- [x] Criar `examples-enricher.ts` (workaround inputExamples para Gemini)
- [x] Criar `message.schema.ts` (tipos Message, ChatParams, etc.)
- [x] Criar `ai.errors.ts` (erros customizados do módulo AI)

**Definition of Done:**
- [x] `LLM_PROVIDER=gemini` usa Gemini com Tool Use
- [x] `LLM_PROVIDER=claude` usa Claude com Tool Use
- [x] Streaming funciona
- [x] Tool calls são retornados corretamente
- [x] Tool loop funciona (LLM → tool → LLM → resposta)
- [x] **Tool Use Examples funcionam corretamente:**
  - [x] Claude recebe `input_examples` via API
  - [x] Gemini recebe description enriquecida com exemplos
  - [x] Todas as 7 tools têm 2-4 exemplos definidos
- [x] Rate limiting aplicado
- [x] Testes passam

**Notas (2025-01-12):**
- Package `@life-assistant/ai` implementado em `packages/ai/`
- Adapters: `GeminiAdapter` (Google GenAI SDK) e `ClaudeAdapter` (Anthropic SDK)
- Factory: `createLLM()` e `createLLMFromEnv()` para criação baseada em ENV vars
- Tool Use Examples: Claude usa beta header `advanced-tool-use-2025-11-20`, Gemini usa `enrichDescriptionWithExamples()`
- Rate limiting com token bucket algorithm
- Retry com backoff exponencial (1s, 2s, 4s)
- Tool loop com max 5 iterações e suporte a confirmação
- **Cobertura de testes: 162 testes passando**
  - adapters: claude.adapter.test.ts (21 testes), gemini.adapter.test.ts (26 testes)
  - services: tool-loop.service.test.ts (19 testes), tool-executor.service.test.ts (12 testes), llm.factory.test.ts (16 testes)
  - utils: rate-limiter.test.ts (14 testes), retry.test.ts (20 testes), zod-to-gemini.test.ts (23 testes), examples-enricher.test.ts (11 testes)

---

## M1.2 — Módulo: Chat Básico 🟢

**Objetivo:** Implementar chat com IA com streaming de resposta.

**Referências:** `docs/specs/domains/chat.md`, `docs/specs/core/ai-personality.md` §4

**Tasks:**

**Backend:**
- [x] Criar módulo `chat` com Clean Architecture:
  - [x] `ChatController` - endpoints REST + SSE
  - [x] `ChatService` - orquestra envio de mensagem e streaming
  - [x] `ConversationRepository` - CRUD de conversas
  - [x] `MessageRepository` - CRUD de mensagens
  - [x] `ContextBuilderService` - monta system prompt
- [x] Implementar endpoints REST:
  - [x] POST /chat/conversations - criar conversa
  - [x] GET /chat/conversations - listar conversas
  - [x] GET /chat/conversations/:id - detalhes da conversa
  - [x] GET /chat/conversations/:id/messages - histórico de mensagens
  - [x] POST /chat/conversations/:id/messages - enviar mensagem
  - [x] DELETE /chat/conversations/:id - soft delete (90 dias retenção)
- [x] Implementar DTOs com class-validator
- [x] Implementar streaming via Server-Sent Events (SSE)
- [x] Implementar system prompt base conforme `docs/specs/core/ai-personality.md` §4
- [ ] ~~Implementar rate limiting por plano~~ → Migrado para **M3.5**
- [x] Salvar mensagens no banco
- [x] Implementar tipos de conversa: general, counselor
- [x] Implementar `@SkipTransform()` decorator para SSE
- [x] Implementar `SseAuthGuard` para autenticação via query param

**Frontend:**
- [x] Criar página `/chat`:
  - [x] Lista de conversas (sidebar)
  - [x] Área de mensagens com scroll
  - [x] Input de mensagem
  - [x] Botão enviar
- [x] Implementar streaming de resposta (SSE)
- [x] Implementar typing indicator
- [x] Implementar auto-scroll
- [x] Criar nova conversa
- [x] Histórico de conversas
- [x] Implementar empty state (sem conversas)
- [x] Implementar loading states
- [x] Implementar error handling (rate limit, LLM errors)
- [x] Adicionar link Chat no sidebar de navegação
- [x] Persistência de conversa via URL (?c=conversationId)

**Testes:**
- [x] Testes unitários:
  - [x] ChatService (streaming, error handling)
  - [x] ConversationRepository
  - [x] MessageRepository
  - [x] ContextBuilderService
- [x] Testes de integração:
  - [x] API de chat (CRUD + mensagens)
  - [ ] ~~Rate limiting~~ → Migrado para **M3.5**
  - [x] SSE streaming
- [x] Testes E2E:
  - [x] Enviar mensagem e receber resposta com streaming
  - [x] Criar nova conversa
  - [x] Alternar entre conversas
  - [ ] ~~Rate limit error handling~~ → Migrado para **M3.5**

**Definition of Done:**
- [x] Usuário envia mensagem e recebe resposta com streaming
- [x] Histórico de conversa é mantido
- [x] Múltiplas conversas funcionam
- [x] Testes passam

**Notas (13 Janeiro 2026):**
- Chat funcional com streaming SSE via `@life-assistant/ai` package
- Autenticação SSE via query param token (EventSource não suporta headers)
- `@SkipTransform()` decorator criado para bypass do `TransformInterceptor` em SSE
- URL-based state: conversa persiste em refresh via `?c=conversationId`
- **Tasks de rate limiting migradas para M3.5 (Stripe/Pagamentos)** — rate limiting depende de definição de planos de negócio (Free/Pro/Premium), que será implementado junto com billing

---

## M1.3 — Sistema de Memória (Tool Use + Memory Consolidation) 🟢

**Objetivo:** Implementar sistema de memória com Tool Use e consolidação automática.

**Referências:** `docs/specs/core/ai-personality.md` §8, `docs/specs/domains/memory.md`, `ADR-012`

**Tasks:**

**Banco de Dados:**
- [x] Criar migration para tabela `user_memories`
- [x] Criar migration para tabela `knowledge_items`
- [x] Criar migration para tabela `memory_consolidations`
- [x] Criar enums: `knowledge_item_type`, `knowledge_item_source`, `consolidation_status`
- [x] Implementar RLS para novas tabelas

**Backend - Serviços:**
- [x] Criar módulo `memory`:
  - [x] `UserMemoryService` - CRUD de perfil do usuário
  - [x] `KnowledgeItemsService` - CRUD de knowledge items
  - [x] `MemoryConsolidationProcessor` - job de consolidação (Processor pattern)
  - [x] `ContextBuilderService` - monta system prompt com memória
- [x] Implementar `ContextBuilder`:
  - [x] Carregar user_memory (sempre presente, ~500-800 tokens)
  - [x] Montar seção de memória do system prompt
  - [x] Injetar tools disponíveis no contexto

**Backend - Tools:**
- [x] Criar tool `search_knowledge`:
  - [x] Busca por texto em knowledge_items
  - [x] Filtros por área, tipo, tags
  - [x] Ordenação por relevância/data
- [x] Criar tool `add_knowledge`:
  - [x] Adicionar novo fato/preferência
  - [x] Validar com Zod
  - [x] Requer confirmação do usuário

**Backend - Tool Integration:**
- [x] Criar `MemoryToolExecutor` implementando interface `ToolExecutor`
- [x] Integrar `runToolLoop()` com `ChatService`
- [x] Handle de confirmação de tools via SSE (event type: tool_confirmation)
- [x] Atualizar message metadata para armazenar tool calls e results

**Backend - Memory API Endpoints:**
- [x] GET /api/memory - Ver memória do usuário
- [x] GET /api/memory/knowledge - Listar knowledge items (paginado)
- [x] DELETE /api/memory/knowledge/:id - Deletar knowledge item

**Backend - Memory Consolidation Job:**
- [x] Criar job BullMQ `memory-consolidation`:
  - [x] Executa a cada 24h por usuário (3:00 AM timezone local)
  - [x] Busca mensagens desde última consolidação
  - [x] Envia para LLM com prompt de extração
  - [x] Parseia resposta JSON estruturada
  - [x] Cria/atualiza knowledge_items
  - [x] Atualiza user_memory
  - [x] Salva registro em memory_consolidations
- [x] Criar consolidation prompt builder conforme docs/specs/core/ai-personality.md §8
- [x] Criar response parser com validação Zod
- [x] Implementar scheduling timezone-aware via BullMQ `tz` option

**Testes:**
- [x] Testes unitários:
  - [x] ContextBuilderService monta prompt corretamente (5 tests)
  - [x] KnowledgeItemsService CRUD funciona (31 tests)
  - [x] Tools validam parâmetros com Zod
  - [x] UserMemoryService formatForPrompt respeita ~800 tokens (19 tests)
  - [x] MemoryToolExecutor execute e requiresConfirmation (18 tests)
  - [x] ConsolidationPrompt build e parse (18 tests)
  - [x] MemoryConsolidationProcessor (8 tests)
  - [x] MemoryConsolidationScheduler (7 tests)
- [x] Testes de integração:
  - [x] Memory consolidation extrai fatos de conversas
  - [x] search_knowledge retorna itens relevantes
  - [x] user_memory é atualizado após consolidação
  - [x] Tool executor retorna resultados corretos com DB real
  - [x] Tool loop completa e salva metadata na mensagem
  - [x] Fluxo de confirmação funciona via SSE (N/A - add_knowledge tem requiresConfirmation: false)
  - [x] API endpoints /memory/* funcionam com auth
  - [x] Job executa via BullMQ com Redis real (QueueEvents pattern)

**Definition of Done:**
- [x] user_memory é sempre incluído no contexto
- [x] Tools search_knowledge e add_knowledge funcionam
- [x] Memory consolidation roda a cada 24h
- [x] Knowledge items são criados/atualizados automaticamente
- [x] Usuário pode ver o que a IA sabe (via API)
- [x] Testes unitários passam (106 novos tests)

**Notas (2026-01-13):**
- Implementação completa de M1.3 Sistema de Memória
- Memory module: `UserMemoryService`, `KnowledgeItemsService`, `MemoryToolExecutorService`
- Repositories: `UserMemoryRepository`, `KnowledgeItemRepository` (com RLS)
- Context builder enhanced com user memory formatting (~500-800 tokens)
- Chat service integrado com tool loop via `runToolLoop()` e `continueToolLoop()`
- Memory consolidation job usando BullMQ com timezone-aware scheduling (`tz` option)
- Scheduler cria um job por timezone único (não por usuário, para escalabilidade)
- Consolidation prompt usa Zod schema para validação de resposta LLM
- 106 novos testes unitários adicionados
- 7 testes de integração para BullMQ job com Redis real usando QueueEvents pattern
- API endpoints: `/api/memory`, `/api/memory/knowledge`, `/api/memory/knowledge/:id`
- Arquivos críticos:
  - `apps/api/src/modules/memory/` - Memory module completo
  - `apps/api/src/jobs/memory-consolidation/` - Consolidation job
  - `packages/ai/src/schemas/tools/` - Tool definitions
  - `packages/database/src/schema/` - user_memories, knowledge_items, memory_consolidations

**Notas (2026-01-14):**
- Testes de integração completos para M1.3 Sistema de Memória
- 3 arquivos de teste criados em `apps/api/test/integration/memory/`:
  - `memory-endpoints.integration.spec.ts` - 14 testes (API /memory/*)
  - `memory-tool-executor.integration.spec.ts` - 14 testes (search/add/analyze tools)
  - `memory-consolidation.integration.spec.ts` - 18 testes (prompt build, parsing, fact extraction)
- Total: 46 testes de integração para memory module
- Padrão: inline controllers com JWT auth via `jose`, mock services
- 116 testes de integração passando (total geral)

### Ferramentas de Desenvolvimento (M1.3)

- [x] Admin endpoint para disparo manual do Memory Consolidation Job
  - [x] Criar AdminModule (`apps/api/src/modules/admin/`)
  - [x] Criar AdminJobsController com endpoint `POST /admin/jobs/memory-consolidation/trigger`
  - [x] Proteger endpoint para `NODE_ENV=development`
  - [x] Documentar uso em `docs/specs/core/architecture.md`

---

## M1.4 — Memory View (Visualização de Memória) 🟢

**Objetivo:** Implementar tela para visualizar e gerenciar o que a IA sabe sobre o usuário.

**Referências:** `docs/specs/domains/memory.md`, `ADR-012`

**Tasks:**

**Backend:**
- [x] Criar endpoints de memória:
  - [x] `GET /memory` - user_memory + estatísticas
  - [x] `GET /memory/items` - lista de knowledge_items com filtros
  - [x] `PATCH /memory/items/:id` - corrigir item
  - [x] `DELETE /memory/items/:id` - deletar item
  - [x] `POST /memory/items/:id/validate` - validar item
  - [x] `POST /memory/items` - adicionar item manualmente
  - [x] `GET /memory/export` - exportar todos os items (JSON)
- [x] Renomear endpoint existente `/memory/knowledge` → `/memory/items`
- [x] Implementar filtros:
  - [x] Por área (health, finance, professional, learning, spiritual, relationships)
  - [x] Por tipo (fact, preference, insight, person, memory)
  - [x] Por confiança (high, medium, low)
  - [x] Por fonte (conversation, user_input, ai_inference)
  - [x] Por data
- [x] Implementar busca full-text em knowledge_items

**Frontend:**
- [x] Criar página `/memory`:
  - [x] Resumo do user_memory (perfil, objetivos, desafios)
  - [x] Lista de knowledge_items organizada por área
  - [x] Filtros por tipo, confiança, fonte
  - [x] Busca por texto
- [x] Componentes:
  - [x] MemoryOverview (resumo do perfil)
  - [x] KnowledgeItemsList (lista com filtros)
  - [x] KnowledgeItemCard (item com ações)
  - [x] ConfidenceIndicator (alta/média/baixa)
  - [x] EditItemModal (para correções)
  - [x] AddItemModal (para adições manuais)
- [x] Ações por item:
  - [x] Confirmar (confirmar que está correto)
  - [x] Corrigir (editar conteúdo)
  - [x] Deletar (remover permanentemente)
  - [x] Ver fonte (link para conversa original)

**Testes:**
- [x] Testes unitários para filtros e novos métodos do service
- [x] Testes de integração para novos endpoints:
  - [x] PATCH /memory/items/:id
  - [x] POST /memory/items/:id/validate
  - [x] POST /memory/items
  - [x] GET /memory/export
  - [x] Filtros expandidos (confidence, source, date)
- [ ] Teste E2E: confirmar item → verificar flag
- [ ] Teste E2E: corrigir item → verificar novo valor
- [ ] Teste E2E: deletar item → verificar remoção
- [ ] Teste E2E: adicionar item manualmente → verificar criação

**Definition of Done:**
- [x] Usuário vê todos os knowledge_items
- [x] Filtros funcionam (área, tipo, confiança)
- [x] Busca por texto funciona
- [x] Confirmar item marca como confirmado
- [x] Corrigir item atualiza conteúdo
- [x] Deletar item remove permanentemente
- [x] Testes passam (unit/integration - E2E pendentes)

**Notas (14/01/2026):**
- Implementação completa de backend e frontend
- Endpoints: GET /memory, GET/POST /memory/items, PATCH/DELETE /memory/items/:id, POST /memory/items/:id/validate, GET /memory/export
- Filtros: área, tipo, confiança (min/max), fonte, busca, data
- UI: página /memory com overview, lista paginada, filtros, modais de adição/edição
- Testes E2E pendentes para próxima iteração

---

## M1.5 — Temporal Knowledge Management 🟢

**Objetivo:** Implementar gerenciamento temporal de conhecimento com detecção de mudanças de estado (padrão Zep/Graphiti Temporal Knowledge Graphs).

**Referências:** `docs/specs/core/ai-personality.md` §8, `docs/specs/core/data-conventions.md`

**Contexto:**
Sistema detectava contradições de forma inconsistente:
- "solteiro" → "namorando" = detectado ✓
- "tem dívida" → "quitou dívida" = NÃO detectado ✗

Solução: reformular prompt para detectar "mudanças de estado atual" + UI toggle "Ver histórico".

**Tasks:**

**Backend:**
- [x] Corrigir prompt de detecção de contradições (`contradiction-detector.adapter.ts`)
  - [x] Reformular para detectar "mudanças de estado" em vez de "contradições"
  - [x] Exemplos claros: estado civil, situação financeira, local, valores numéricos
- [x] Adicionar suporte a `includeSuperseded` no repositório
  - [x] Atualizar `KnowledgeItemSearchParams` com campo `includeSuperseded`
  - [x] Modificar `search()` e `countSearch()` para filtrar quando necessário
- [x] Atualizar DTOs para incluir filtro temporal
  - [x] `ListKnowledgeItemsQueryDto.includeSuperseded`
  - [x] `KnowledgeItemResponseDto.supersededById/supersededAt`
- [x] Atualizar export para incluir metadados temporais
  - [x] `ExportMemoryResponseDto` com stats (active/superseded)
  - [x] Incluir todos os items (ativos + superseded) no export

**Frontend:**
- [x] Adicionar campos `supersededById`, `supersededAt` aos types
- [x] Implementar toggle "Ver histórico" na FilterBar
- [x] Estilizar items superseded com badge e opacidade

**Documentação:**
- [x] Atualizar docs/specs/core/data-conventions.md com campos temporais
- [x] Adicionar seção ao docs/specs/core/ai-personality.md (Contradiction Detection)

**Testes:**
- [x] Atualizar unit tests para `KnowledgeItemsService.exportAll()`
- [x] Atualizar unit tests para `MemoryController.exportMemory()`
- [x] Atualizar integration tests para temporal queries

**Definition of Done:**
- [x] "Tem dívida" → "Quitou dívida" detectado como mudança de estado
- [x] UI mostra apenas items ativos por padrão
- [x] Toggle "Ver histórico" mostra items superseded
- [x] Export inclui todos os items com metadados temporais
- [x] Testes passando (338 unit tests)

**Notas (14/01/2026):**
- Padrão de Temporal Knowledge Graphs (Zep/Graphiti)
- Bi-temporal model: `supersededById` + `supersededAt`
- Items superseded NÃO são deletados, preservam histórico
- UI: Switch "Ver histórico" + badge "Substituído em {data}"
- Arquivos modificados: 12 backend, 4 frontend, 2 docs, 4 test files

---

## M1.6 — Raciocínio Inferencial Real-time 🟢

**Objetivo:** Permitir que a IA faça conexões entre fatos e detecte contradições em tempo real durante conversas.

**Referências:** `docs/specs/core/ai-personality.md` §8, `ADR-014`

**Tasks:**

**Backend:**
- [x] Criar tool `analyze_context`:
  - [x] Definir schema em `packages/ai/src/schemas/tools/analyze-context.tool.ts`
  - [x] Parâmetros: currentTopic, relatedAreas, lookForContradictions
  - [x] Retornar fatos relacionados, padrões existentes, conexões potenciais, contradições
- [x] Implementar executor para `analyze_context`:
  - [x] Buscar knowledge_items das áreas relacionadas
  - [x] Buscar learnedPatterns com confidence >= 0.7
  - [x] Detectar conexões via keyword matching
  - [x] Estrutura para contradições (LLM faz análise)
- [x] Atualizar system prompt:
  - [x] Adicionar `analyze_context` às capacidades
  - [x] Adicionar seção "Raciocínio Inferencial" com instruções
- [x] Exportar tool no `packages/ai/src/index.ts`

**Documentação:**
- [x] Criar ADR-014: Real-time Inference Architecture
- [x] Atualizar docs/specs/core/ai-personality.md (§4, §8)

**Testes:**
- [x] Testes unitários para `analyze_context`:
  - [x] Retorna fatos relacionados das áreas
  - [x] Inclui padrões com alta confiança
  - [x] Deduplica fatos de múltiplas áreas
  - [x] Encontra conexões potenciais com padrões
  - [x] Inclui hint quando lookForContradictions=true
  - [x] Ordena fatos por confidence descending
  - [x] Retorna erro para parâmetros inválidos

**Definition of Done:**
- [x] Tool `analyze_context` definida e implementada
- [x] Executor busca fatos e padrões corretamente
- [x] System prompt inclui instruções de raciocínio inferencial
- [x] ADR-014 documenta arquitetura
- [x] Testes unitários passam

**Notas (13/01/2026):**
- Implementado como parte do plano de "Real-time Inference Architecture"
- Arquitetura de dois níveis: Batch (Job 3AM) + Real-time (analyze_context)
- Padrões do batch são reutilizados no real-time (confidence >= 0.7)
- LLM decide quando usar a tool baseado nas instruções do system prompt
- Detecção de contradições é feita pelo LLM, não por código

---

## M1.7 — Perspectiva Cristã 🔴

**Objetivo:** Implementar feature opt-in de perspectiva cristã no chat.

**Referências:** `docs/specs/domains/spiritual.md`, `docs/specs/core/ai-personality.md` §5

**Tasks:**

**Backend:**
- [ ] Adicionar configuração `christianPerspective: boolean` no user_settings
- [ ] Implementar system prompt de perspectiva cristã (conforme `docs/specs/core/ai-personality.md` §5)
- [ ] Integrar com chat: aplicar prompt quando habilitado

**Frontend:**
- [ ] Criar toggle nas configurações do usuário (`/settings/preferences`)
- [ ] Adicionar seção "Perspectiva Cristã" com explicação
- [ ] Componente ToggleWithDescription para o setting
- [ ] Adicionar opção de habilitar perspectiva cristã na etapa 2 do onboarding (toggle opcional junto com seleção de áreas) — conforme `docs/specs/core/user-journeys.md`

**Testes:**
- [ ] Teste unitário: prompt correto é aplicado quando habilitado
- [ ] Teste unitário: prompt cristão NÃO é aplicado quando desabilitado
- [ ] Teste de integração: resposta da IA inclui perspectiva bíblica (quando habilitado)
- [ ] Teste de integração: resposta da IA NÃO menciona religião (quando desabilitado)
- [ ] Teste E2E: toggle de configuração persiste corretamente
- [ ] Teste E2E: toggle no onboarding habilita perspectiva cristã corretamente

**Definition of Done:**
- [ ] Usuário pode habilitar/desabilitar perspectiva cristã
- [ ] IA integra princípios bíblicos naturalmente quando habilitado
- [ ] Nunca menciona aspectos religiosos quando desabilitado
- [ ] Toggle no onboarding funciona corretamente
- [ ] Testes passam

---

## M1.8 — Guardrails de Segurança 🔴

**Objetivo:** Implementar guardrails para tópicos sensíveis.

**Referências:** `docs/specs/core/ai-personality.md` §7

**Tasks:**

**Backend:**
- [ ] Criar `GuardrailService` para verificação de conteúdo:
  - [ ] Suicídio/autolesão → CVV (188) + acolhimento
  - [ ] Abuso/violência → recursos (180, 190)
  - [ ] Diagnósticos médicos → sugerir profissional
  - [ ] Aconselhamento financeiro → não dar recomendações específicas
  - [ ] Conteúdo ilegal → recusar educadamente
- [ ] Implementar respostas padrão para cada guardrail (templates)
- [ ] Integrar verificação no fluxo de chat (antes de responder)

**Logging Seguro:**
- [ ] Implementar filtro de dados sensíveis em tool call logging:
  - [ ] Criar `SensitiveDataFilter` utility em `packages/ai/src/utils/`
  - [ ] Campos a mascarar:
    - `add_knowledge.content` → `"[CONTENT REDACTED - ${length} chars]"`
    - `search_knowledge.query` → `"[QUERY REDACTED]"` (se contiver dados pessoais)
  - [ ] Aplicar filtro em:
    - `memory-tool-executor.service.ts:139` (add_knowledge params)
    - `memory-tool-executor.service.ts:89` (search_knowledge params)
  - [ ] Manter log de tool_name, duration, success/failure sem filtro
- [ ] Revisar metadata de mensagens no banco:
  - [ ] Avaliar se `toolCalls.arguments` deve ser armazenado completo (chat.service.ts:278-282)
  - [ ] Opção 1: Não armazenar argumentos (apenas id, name)
  - [ ] Opção 2: Aplicar SensitiveDataFilter antes de salvar
  - [ ] Considerar impacto em debugging

**Testes:**
- [ ] Testes unitários para cada tipo de guardrail:
  - [ ] Detecção de conteúdo sobre suicídio/autolesão
  - [ ] Detecção de conteúdo sobre abuso/violência
  - [ ] Detecção de solicitação de diagnóstico médico
  - [ ] Detecção de solicitação de aconselhamento financeiro específico
  - [ ] Detecção de conteúdo ilegal
- [ ] Teste de integração: mensagem sensível → resposta apropriada
- [ ] Teste que guardrails NÃO disparam para conteúdo normal
- [ ] Teste E2E: fluxo completo de guardrail (mensagem → resposta de suporte)

**Definition of Done:**
- [ ] Todos os guardrails funcionam conforme especificado
- [ ] Respostas incluem recursos de ajuda apropriados
- [ ] Testes passam

---

## M1.9 — UI/UX Polish v1 🟡

**Objetivo:** Finalizar refinamentos de interface e implementar responsividade para lançamento da v1.

> **Contexto:** Componentes base (EmptyState, LoadingSpinner, Skeleton, Toast, AlertDialog,
> ErrorBoundary) foram implementados em M0.6, M1.2, M1.4. Este milestone finaliza ajustes
> pendentes e implementa responsividade completa.

**Tasks:**

**Finalizar componentes de estado:**
- [x] ErrorBoundary: adicionar link "Precisa de ajuda?" para suporte

**Alinhar Empty States com `docs/specs/core/ux-states.md`:**
- [x] Chat: ajustar mensagem para "Converse com sua assistente" + CTA "Iniciar conversa"
- [x] Memória: ajustar mensagem para "A IA ainda está aprendendo sobre você" + CTA "Iniciar conversa"

**Finalizar Error Handling:**
- [x] Chat: adicionar botão "Tentar novamente" explícito no error state inline
- [x] Memória: adicionar ErrorState persistente quando fetch de items falha (além do toast)

**Adicionar Toasts faltantes:**
- [x] Chat: toast de sucesso ao criar conversa ("Nova conversa criada")
- [x] Chat: toast de sucesso ao deletar conversa ("Conversa excluída")

**Chat UX:**
- [x] Renderizar Markdown nas respostas da IA (Streamdown + @tailwindcss/typography)

**Dashboard:**
- [x] Adicionar loading skeleton (preparação para quando buscar dados reais)

**Responsividade:**
- [x] Implementar hamburger menu em mobile (< 640px) — já existia em header.tsx
- [x] Implementar sidebar como overlay em mobile (backdrop + translate-x animation)
- [x] Revisar layout do Chat em mobile (conversation list hidden, chat area full-width)
- [x] Revisar layout da Memória em mobile (overview full-width, filters wrap)
- [x] Revisar layout em tablet (768px) — sidebar always visible
- [x] Verificar e ajustar layouts em desktop (> 1024px) — confirmado funcional

**Testes (pendente):**
- [ ] Testes unitários para ajustes em ErrorBoundary
- [ ] Teste E2E: verificar empty states em Chat e Memória
- [ ] Teste E2E: verificar error states com retry
- [ ] Teste E2E: verificar toasts em operações CRUD
- [ ] Testes de responsividade (Playwright viewports: mobile 375px, tablet 768px, desktop 1280px)

**Definition of Done:**
- [x] Empty states alinhados com docs/specs/core/ux-states.md
- [x] Error states com botão retry e link suporte
- [x] Toasts em todas as operações CRUD (Chat + Memória)
- [x] App responsivo e funcional em mobile, tablet e desktop
- [x] Sidebar com hamburger menu em mobile
- [ ] Todos os testes passam

**Notas (2026-01-15):**
- 14 tasks de UI implementadas (Estados, Toasts, Dashboard, Responsividade)
- Sidebar: transform-based com backdrop em mobile, sempre visível em desktop (md+)
- Chat: conversation list hidden em mobile, usa empty state para iniciar conversa
- Memory: overview full-width em mobile (lg:flex-row), error state persistente com retry
- Dashboard: skeleton durante loading inicial, textos atualizados para "Memória"
- Testes serão implementados em etapa posterior
- **Bug fix (M1.2):** Typing indicator corrigido — adicionado ThinkingIndicator + typewriter effect + auto-scroll
- **Nova feature:** Markdown rendering com Streamdown (lida com markdown incompleto durante typewriter)
- **Bug fix:** Memory area cards — ícones Lucide (Sparkles, Sun) + truncate em textos longos

---

## M1.10 — Context Management (Compaction) 🔴

**Objetivo:** Gerenciar contexto de conversas longas usando compaction automático, similar ao Claude Code.

**Referências:**
- [Automatic Context Compaction - Claude Docs](https://platform.claude.com/cookbook/tool-use-automatic-context-compaction)
- [Effective Context Engineering - Anthropic](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)
- `docs/specs/core/ai-personality.md` §4

**Problema:**
- Atualmente só as últimas 20 mensagens são enviadas ao LLM
- Conversas longas perdem contexto importante
- Não há sumarização de mensagens antigas

**Tasks:**

**Backend - Compaction Service:**
- [ ] Criar `CompactionService` em `packages/ai`:
  - [ ] Monitorar token usage por conversa
  - [ ] Detectar quando threshold é atingido (80% do context window)
  - [ ] Gerar summary usando prompt especializado
  - [ ] Retornar summary formatado
- [ ] Criar schema para summary prompt:
  - [ ] Template para resumo de conversa
  - [ ] Preservar: fatos aprendidos, tópicos discutidos
  - [ ] Descartar: mensagens repetitivas, saudações, confirmações
- [ ] Implementar token counting (estimativa: 4 chars = 1 token)

**Backend - Integração com Chat:**
- [ ] Modificar `ChatService.processStreamResponse`:
  - [ ] Calcular tokens totais da conversa
  - [ ] Verificar threshold antes de chamar LLM
  - [ ] Se threshold atingido, chamar compaction
  - [ ] Usar summary + últimas N mensagens como contexto
- [ ] Criar tabela ou coluna para armazenar summaries:
  - [ ] `conversations.summary` (text, nullable)
  - [ ] `conversations.summary_updated_at` (timestamp)
  - [ ] `conversations.messages_summarized_count` (integer)
- [ ] Implementar migration para nova coluna

**Backend - Context Builder:**
- [ ] Modificar `ContextBuilderService`:
  - [ ] Carregar summary da conversa se existir
  - [ ] Incluir summary no início do contexto
  - [ ] Manter user_memories + knowledge como contexto persistente
- [ ] Ajustar número de mensagens recentes (20 → dinâmico baseado em tokens)

**Configuração:**
- [ ] Adicionar configs em `ConfigService`:
  - [ ] `CONTEXT_COMPACTION_THRESHOLD` (default: 100000 tokens)
  - [ ] `CONTEXT_COMPACTION_ENABLED` (default: true)
  - [ ] `CONTEXT_RECENT_MESSAGES_LIMIT` (default: 20)
  - [ ] `CONTEXT_COMPACTION_MODEL` (default: mesmo modelo, opcional haiku)

**Testes:**
- [ ] Teste unitário: CompactionService gera summary válido
- [ ] Teste unitário: Token counting funciona corretamente
- [ ] Teste unitário: Threshold detection funciona
- [ ] Teste integração: Conversa longa trigger compaction
- [ ] Teste integração: Summary é persistido corretamente
- [ ] Teste integração: Contexto inclui summary + mensagens recentes

**Definition of Done:**
- [ ] Conversas longas não perdem contexto importante
- [ ] Compaction acontece automaticamente quando necessário
- [ ] Summary é persistido e reutilizado
- [ ] Token usage é reduzido em conversas longas
- [ ] Testes passam
- [ ] Documentação atualizada (docs/specs/core/ai-personality.md)

---

## M1.11 — Decision Support Core 🔴

**Objetivo:** Implementar funcionalidade core de suporte a decisões: captura via chat, CRUD, e visualização.

**Referências:** `docs/adr/ADR-016-decision-support-architecture.md`, `docs/specs/domains/decisions.md`, `docs/specs/core/ai-personality.md` §8

**Pré-requisitos:** M1.3 (Knowledge Items)

> **Nota:** Tabelas `decisions`, `decision_options`, `decision_criteria`, `decision_scores` já existem no banco (M0.4).
> Este milestone cria o schema TypeScript e implementa a lógica core (sem follow-up job, que depende de M3.4 Notificações).

**Tasks:**

**Database Schema:**
- [ ] Criar `packages/database/src/schema/decisions.ts`:
  - [ ] Schema para `decisions` com relações
  - [ ] Schema para `decision_options`
  - [ ] Schema para `decision_criteria`
  - [ ] Schema para `decision_scores`
  - [ ] Enum `decision_status`
  - [ ] Types inferidos (Decision, NewDecision, etc.)
- [ ] Exportar schemas em `packages/database/src/schema/index.ts`

**Backend Services:**
- [ ] Criar `DecisionRepository`:
  - [ ] `create(data)` - criar decisão
  - [ ] `findById(id)` - buscar por ID
  - [ ] `findByUser(userId, filters)` - listar do usuário
  - [ ] `update(id, data)` - atualizar
  - [ ] `softDelete(id)` - soft delete
- [ ] Criar `DecisionService`:
  - [ ] `createFromChat(userId, data)` - criar via tool
  - [ ] `addOption(decisionId, option)` - adicionar opção
  - [ ] `addCriterion(decisionId, criterion)` - adicionar critério
  - [ ] `setScore(optionId, criterionId, score)` - pontuar
  - [ ] `getContext(userId, area)` - buscar decisões similares
- [ ] Criar `DecisionController`:
  - [ ] `GET /decisions` - listar
  - [ ] `GET /decisions/:id` - detalhes
  - [ ] `POST /decisions` - criar
  - [ ] `PATCH /decisions/:id` - atualizar
  - [ ] `POST /decisions/:id/options` - adicionar opção
  - [ ] `DELETE /decisions/:id` - soft delete

**Tool Implementation:**
- [ ] Criar `SaveDecisionTool`:
  - [ ] Schema Zod conforme `ai.md` §6.2
  - [ ] Validação de área
  - [ ] Criação de decisão + opções
  - [ ] Cálculo de `review_date`
  - [ ] Confirmação obrigatória (`requiresConfirmation: true`)
- [ ] Registrar tool no `ToolExecutorService`
- [ ] Adicionar tool ao system prompt (§4.1)

**Memory Consolidation:**
- [ ] Atualizar prompt de consolidação (§6.5.2):
  - [ ] Adicionar campo `decision_patterns` no output
  - [ ] Instruções para extrair padrões de decisões
- [ ] Implementar persistência de `decision_patterns` em `knowledge_items`

**Frontend:**
- [ ] Criar página `/decisions`:
  - [ ] Lista de decisões com filtros (área, status, período)
  - [ ] Cards com título, área, status, data
  - [ ] Navegação para detalhes
- [ ] Criar página `/decisions/[id]`:
  - [ ] Detalhes da decisão
  - [ ] Opções com prós/contras
  - [ ] Critérios e scores (se houver)
  - [ ] Timeline (criação → decisão)
- [ ] Componentes:
  - [ ] DecisionCard (card resumido)
  - [ ] DecisionTimeline (histórico visual)
  - [ ] OptionCard (opção com prós/contras)
  - [ ] DecisionFilters (área, status, período)
- [ ] Integrar no menu lateral

**Testes:**
- [ ] Testes unitários:
  - [ ] DecisionRepository (CRUD completo)
  - [ ] DecisionService (lógica de negócio)
  - [ ] SaveDecisionTool (validação, criação)
- [ ] Testes de integração:
  - [ ] API endpoints completa
  - [ ] Tool execution via chat
  - [ ] Memory Consolidation com decision_patterns
- [ ] Teste E2E:
  - [ ] Criar decisão via chat → ver em /decisions

**Definition of Done:**
- [ ] Schema TypeScript criado para todas as tabelas
- [ ] Tool `save_decision` funciona com confirmação
- [ ] CRUD de decisões via API
- [ ] Memory Consolidation extrai `decision_patterns`
- [ ] Modo Conselheira consulta decisões similares
- [ ] Dashboard /decisions lista decisões com filtros
- [ ] Testes passam

> **Nota:** Follow-up job e notificações proativas de revisão serão implementados em M3.7 (Decision Follow-up), que depende de M3.4 (Notificações Proativas).
