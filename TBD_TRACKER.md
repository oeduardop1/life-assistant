# TBD_TRACKER.md — Life Assistant AI
> **Documento vivo.** Registra **decisões pendentes, dúvidas e itens a definir** durante o desenvolvimento.  
> Deve ser atualizado pela IA (Claude Code) sempre que encontrar algo que precisa de decisão humana.

---

## 🤖 Instruções para Claude Code

### Quando adicionar um TBD

Adicione um item neste arquivo quando:
- Encontrar **ambiguidade** nas specs que impede implementação
- Precisar de **decisão de negócio** (não técnica)
- Identificar **conflito** entre documentos
- Encontrar **caso de borda** não especificado
- Precisar de **credenciais/configuração** que não possui
- Identificar **risco ou trade-off** que o humano deve decidir

### Quando NÃO adicionar um TBD

Não adicione TBD para:
- Decisões técnicas que você pode tomar (escolha de biblioteca, etc)
- Coisas já definidas nos documentos de specs
- Bugs ou erros de implementação (use issues)
- Melhorias futuras já no roadmap

### Como adicionar

1. Escolha a categoria correta
2. Use o template abaixo
3. Preencha todos os campos
4. Adicione ao final da categoria

### Template de Item

```markdown
### [TBD-XXX] Título curto e descritivo

| Campo | Valor |
|-------|-------|
| **Status** | 🔴 Pendente / 🟡 Em discussão / 🟢 Resolvido |
| **Prioridade** | 🔴 Bloqueante / 🟡 Alta / 🟢 Baixa |
| **Categoria** | Negócio / Técnico / UX / Segurança / Integração |
| **Origem** | Arquivo ou contexto onde surgiu |
| **Data** | YYYY-MM-DD |

**Contexto:**
Descrição do contexto e por que isso surgiu.

**Pergunta/Decisão necessária:**
O que precisa ser decidido?

**Opções consideradas:**
1. Opção A - prós e contras
2. Opção B - prós e contras

**Recomendação da IA (se houver):**
O que a IA sugere e por quê.

**Decisão (preencher depois):**
_Pendente_

**Implementação (preencher depois):**
_Pendente_
```

---

## 📊 Resumo

| Status | Quantidade |
|--------|------------|
| 🔴 Pendente | 7 |
| 🟡 Em discussão | 0 |
| 🟢 Resolvido | 5 |
| **Total** | **12** |

| Prioridade | Quantidade |
|------------|------------|
| 🔴 Bloqueante | 0 |
| 🟡 Alta | 0 |
| 🟢 Baixa | 12 |

---

## 🔴 Bloqueantes

_Nenhum item bloqueante no momento._

<!-- 
Adicionar aqui itens que IMPEDEM o desenvolvimento de continuar.
Exemplo: credenciais faltando, decisão crítica de arquitetura, etc.
-->

---

## 🟡 Decisões de Negócio

> **Nota:** Estes itens são para decisão futura, caso o produto vá para o mercado.
> Foco atual: validação pessoal do produto.

### [TBD-100] Definição de Preços dos Planos

| Campo | Valor |
|-------|-------|
| **Status** | 🔴 Pendente |
| **Prioridade** | 🟢 Baixa (decidir antes de ir ao mercado) |
| **Categoria** | Negócio |
| **Origem** | docs/specs/product.md §10.1 |
| **Data** | 2026-01-12 |

**Contexto:**
Os planos Free/Pro/Premium estão documentados com features e limites, mas não há valores definidos em R$ ou USD.

**Pergunta/Decisão necessária:**
Qual o preço de cada plano? Considerar:
- Preço Pro mensal/anual
- Preço Premium mensal/anual
- Desconto para pagamento anual (se houver)
- Moeda (BRL, USD, ou ambos)

**Opções consideradas:**
1. **Preço único global (USD)** — Simplifica, mas pode ser caro para BR
2. **Preço regionalizado (BRL para BR, USD para outros)** — Mais acessível, mais complexo
3. **Paridade de poder de compra (PPP)** — Desconto automático por país

**Recomendação da IA:**
Definir após validação pessoal. Pesquisar preços de competidores (Notion AI, ChatGPT Plus, etc.) como referência.

**Decisão:**
_Pendente — decidir antes de lançamento público_

---

### [TBD-101] Duração do Período Trial

| Campo | Valor |
|-------|-------|
| **Status** | 🔴 Pendente |
| **Prioridade** | 🟢 Baixa (decidir antes de ir ao mercado) |
| **Categoria** | Negócio |
| **Origem** | docs/specs/product.md §10.1 |
| **Data** | 2026-01-12 |

**Contexto:**
docs/specs/product.md menciona "Trial" mas não especifica duração ou condições.

**Pergunta/Decisão necessária:**
- Duração do trial (7, 14, 30 dias?)
- Requer cartão de crédito para iniciar?
- Trial de qual plano (Pro ou Premium)?
- Comportamento após trial expirar (downgrade automático para Free?)

**Opções consideradas:**
1. **7 dias sem cartão** — Baixa fricção, conversão menor
2. **14 dias com cartão** — Maior fricção, conversão maior
3. **30 dias sem cartão** — Muito generoso, pode atrair freeloaders

**Recomendação da IA:**
14 dias sem cartão parece equilibrado. Stripe suporta trials facilmente.

**Decisão:**
_Pendente — decidir antes de lançamento público_

---

### [TBD-102] Ciclo de Cobrança

| Campo | Valor |
|-------|-------|
| **Status** | 🔴 Pendente |
| **Prioridade** | 🟢 Baixa (decidir antes de ir ao mercado) |
| **Categoria** | Negócio |
| **Origem** | docs/specs/integrations.md §7.3 (Stripe) |
| **Data** | 2026-01-12 |

**Contexto:**
Não está definido se a cobrança será mensal, anual, ou ambos.

**Pergunta/Decisão necessária:**
- Oferecer apenas mensal?
- Oferecer mensal + anual?
- Se anual, qual desconto? (tipicamente 15-20%)
- Permitir troca de ciclo a qualquer momento?

**Opções consideradas:**
1. **Apenas mensal** — Simples, menor comprometimento do usuário
2. **Mensal + anual com 20% desconto** — Padrão de mercado, melhora LTV
3. **Apenas anual** — Maior comprometimento, pode afastar usuários

**Recomendação da IA:**
Opção 2 é o padrão SaaS. Stripe suporta ambos nativamente.

**Decisão:**
_Pendente — decidir antes de lançamento público_

---

### [TBD-103] Política de Cancelamento e Reembolso

| Campo | Valor |
|-------|-------|
| **Status** | 🔴 Pendente |
| **Prioridade** | 🟢 Baixa (decidir antes de ir ao mercado) |
| **Categoria** | Negócio |
| **Origem** | Requisito legal e de UX |
| **Data** | 2026-01-12 |

**Contexto:**
Não há política documentada sobre cancelamento e reembolso.

**Pergunta/Decisão necessária:**
- Cancelamento imediato ou no fim do ciclo?
- Reembolso pro-rata para cancelamentos?
- Período de arrependimento (CDC Brasil: 7 dias)?
- O que acontece com dados após cancelamento?

**Opções consideradas:**
1. **Cancelamento no fim do ciclo, sem reembolso** — Simples, padrão
2. **Cancelamento imediato com reembolso pro-rata** — Mais justo, mais complexo
3. **Reembolso total em 7 dias, depois sem reembolso** — Equilibrado, legal no BR

**Recomendação da IA:**
Opção 3 atende CDC brasileiro e é justo. Dados podem ser mantidos por 30 dias após cancelamento para possível reativação.

**Decisão:**
_Pendente — decidir antes de lançamento público_

---

### [TBD-104] Análise Competitiva e Posicionamento

| Campo | Valor |
|-------|-------|
| **Status** | 🔴 Pendente |
| **Prioridade** | 🟢 Baixa (decidir antes de ir ao mercado) |
| **Categoria** | Negócio |
| **Origem** | Planejamento de go-to-market |
| **Data** | 2026-01-12 |

**Contexto:**
Não há análise documentada de competidores ou posicionamento de mercado.

**Pergunta/Decisão necessária:**
- Quem são os competidores diretos e indiretos?
- Como o Life Assistant se diferencia?
- Qual o posicionamento de preço (premium, mid-market, budget)?
- Qual o público-alvo prioritário para lançamento?

**Competidores potenciais a analisar:**
- **IA Genérica:** ChatGPT Plus, Claude Pro, Gemini Advanced
- **Assistentes de vida:** Notion AI, Mem.ai, Reflect
- **Tracking:** Daylio, Fabulous, Habitica
- **Finanças pessoais:** Mobills, Organizze, YNAB
- **Nicho cristão:** ?

**Recomendação da IA:**
Criar documento separado `COMPETITIVE_ANALYSIS.md` quando for para o mercado. O diferencial principal (memória persistente + perspectiva cristã) é único.

**Decisão:**
_Pendente — realizar análise antes de lançamento público_

---

<!--
Adicionar aqui itens que precisam de decisão do product owner.
Exemplo: regras de negócio, limites, comportamentos de UX, etc.
-->

---

## 🔵 Decisões Técnicas

### [TBD-207] Fonte de Dados para Área "Professional" no Life Balance Score

| Campo | Valor |
|-------|-------|
| **Status** | 🔴 Pendente |
| **Prioridade** | 🟢 Baixa |
| **Categoria** | Técnico/Negócio |
| **Origem** | Análise de dependências M2.5 Life Balance Score |
| **Data** | 2026-01-21 |

**Contexto:**
O Life Balance Score (M2.5) calcula scores para 6 áreas hierárquicas (ADR-017). Cinco áreas têm fontes de dados definidas:
- **health** (physical, mental, leisure): M2.1 Tracking & Habits
- **finance** (budget, savings, debts, investments): M2.2 Finance
- **learning** (formal, informal): M2.1 Tracking & Habits
- **spiritual** (practice, community): M2.1 Tracking & Habits
- **relationships** (family, romantic, social): M2.4 CRM Pessoas

Porém, a área **professional** (career, business) não tem fonte de dados definida nos milestones.

**Pergunta/Decisão necessária:**
Como calcular o score da área "professional"?

**Opções consideradas:**
1. **Tracking type "career"** — Criar novo tipo de tracking para satisfação/progresso profissional
   - Prós: Alinhado com filosofia de baixo atrito (conversa natural)
   - Contras: Mais um tracking type a implementar, pode ser subjetivo
2. **Metas de carreira** — Usar M2.3 Metas com área "professional"
   - Prós: Reutiliza infraestrutura existente
   - Contras: Metas são diferentes de satisfação diária
3. **Integração externa** — LinkedIn, calendário de trabalho, etc.
   - Prós: Dados objetivos
   - Contras: Complexidade de integração, privacidade
4. **Conversa periódica** — Check-in mensal via IA sobre carreira
   - Prós: Baixo atrito, rico em contexto
   - Contras: Frequência baixa, dados qualitativos
5. **Retornar 50 (neutro)** — Comportamento padrão do ADR-015 para áreas sem dados
   - Prós: Simples, não penaliza usuário
   - Contras: Score incompleto

**Recomendação da IA:**
Começar com opção 5 (retornar 50) como comportamento default. Adicionar tracking type "career" no futuro se houver demanda. A filosofia de baixo atrito (ADR-015) já prevê que áreas sem dados retornam 50.

**Decisão:**
_Pendente — Comportamento atual: retorna 50 (neutro) conforme ADR-015_

> **Nota (2026-01-26):** Com a decisão de pesos fixos (1.0 para todas as áreas), a área "professional" também terá peso 1.0. Ela retornará score 50 (neutro) por falta de fonte de dados, conforme ADR-015 (áreas sem dados retornam 50 sem penalização).

**Implementação:**
_Pendente — Definir após validação do Life Balance Score com as 5 áreas que têm dados_

---

### [TBD-208] Migrar E2E tests de PostgREST para API/Drizzle e desabilitar PostgREST

| Campo | Valor |
|-------|-------|
| **Status** | 🔴 Pendente |
| **Prioridade** | 🟢 Baixa |
| **Categoria** | Técnico |
| **Origem** | Análise de containers Supabase CLI (sessão 2026-02-06) |
| **Data** | 2026-02-06 |

**Contexto:**
Análise dos containers do Supabase CLI revelou que PostgREST (`[api]` no `config.toml`) não é usado em produção — o backend usa Drizzle ORM com conexão direta ao PostgreSQL. Porém, 2 arquivos dependem de PostgREST:
- `apps/web/e2e/setup/global-setup.ts` — chamadas `DELETE/GET/POST/PATCH /rest/v1/users` para seed/cleanup de dados de teste
- `apps/api/scripts/trigger-consolidation.ts` — `GET /rest/v1/memory_consolidations` para polling de resultados

Esses são os únicos motivos para manter PostgREST habilitado no `config.toml`.

**Pergunta/Decisão necessária:**
Migrar essas dependências e desabilitar PostgREST para economizar 1 container?

**Opções consideradas:**
1. **Migrar E2E para API do backend** — global-setup.ts passa a usar `POST /api/...` ou chamadas diretas ao Drizzle
   - Prós: Testa os mesmos endpoints que produção usa, mais realista
   - Contras: Precisa de endpoints admin ou seed helper no backend
2. **Migrar E2E para Drizzle direto** — global-setup.ts importa o database client e opera direto no PG
   - Prós: Sem dependência de nenhuma API intermediária
   - Contras: E2E test setup acoplado ao schema do banco
3. **Manter como está** — PostgREST fica habilitado
   - Prós: Zero trabalho
   - Contras: Container desnecessário rodando, inconsistência (prod não usa PostgREST)

**Recomendação da IA:**
Opção 2 — Migrar para Drizzle direto é o mais limpo para test setup. Não é urgente.

**Decisão:**
_Pendente — baixa prioridade, fazer quando houver refactor de E2E tests_

**Implementação:**
_Pendente_

---

<!--
Adicionar aqui itens técnicos que precisam de input humano.
Exemplo: escolha entre abordagens com trade-offs significativos, etc.
-->

---

## 🟣 Integrações

_Nenhum item pendente no momento._

<!-- 
Adicionar aqui itens relacionados a integrações externas.
Exemplo: credenciais, configurações de terceiros, limites de API, etc.
-->

---

## ⚪ UX/Design

_Nenhum item pendente no momento._

<!-- 
Adicionar aqui itens que precisam de decisão de design.
Exemplo: fluxos não especificados, textos de UI, comportamentos visuais, etc.
-->

---

## 🟢 Resolvidos (Histórico)

### [TBD-200] Arquitetura de Memória: RAG vs Tool Use

| Campo | Valor |
|-------|-------|
| **Status** | 🟢 Resolvido |
| **Prioridade** | 🟢 Baixa (decisão arquitetural, não bloqueante) |
| **Categoria** | Técnico |
| **Origem** | Planejamento de docs/specs/ai.md |
| **Data** | 2026-01-11 |

**Contexto:**
O sistema precisava de uma estratégia para contextualizar as respostas da IA com informações do usuário. Duas abordagens foram consideradas: RAG tradicional (embeddings + busca vetorial) e Tool Use (LLM decide quando buscar).

**Pergunta/Decisão necessária:**
Qual arquitetura usar para memória e contextualização?

**Opções consideradas:**
1. **RAG tradicional** - Embeddings com pgvector, busca automática de chunks
   - Prós: Amplamente documentado, busca semântica
   - Contras: Chunks aleatórios, custo de embeddings, menor controle
2. **Tool Use + Memory Consolidation** - LLM decide quando buscar via tools
   - Prós: Maior controle, menor custo, transparência, inferências
   - Contras: Depende de boas definições de tools

**Recomendação da IA:**
Opção 2 - Tool Use oferece mais controle e se alinha com a filosofia de transparência do produto.

**Decisão:**
✅ Opção 2 - Tool Use + Memory Consolidation (ADR-012)

**Implementação:**
- Criado ADR-012 documentando a decisão
- Atualizado docs/specs/ai.md, docs/specs/data-model.md, docs/specs/engineering.md, docs/specs/system.md
- Removido pgvector e embeddings do stack
- Milestones M1.1, M1.3, M1.6 atualizados

---

### [TBD-201] Simplificação do Segundo Cérebro

| Campo | Valor |
|-------|-------|
| **Status** | 🟢 Resolvido |
| **Prioridade** | 🟢 Baixa (decisão de produto, não bloqueante) |
| **Categoria** | Negócio/UX |
| **Origem** | docs/specs/product.md §6.2 |
| **Data** | 2026-01-11 |

**Contexto:**
O "Segundo Cérebro" foi originalmente planejado como um sistema completo de notas estilo Obsidian (graph view, wikilinks, pastas, templates). Isso conflita com a proposta "zero friction" do produto.

**Pergunta/Decisão necessária:**
Manter sistema completo de notas ou simplificar para visualização de memória?

**Opções consideradas:**
1. **Sistema completo** - Graph View, editor Markdown, wikilinks, templates, pastas
   - Prós: Feature-rich, familiar para usuários de Obsidian
   - Contras: Alto atrito, conflita com "zero friction", muito código
2. **Memory View simplificado** - Lista de fatos com validação/correção
   - Prós: Zero friction, transparência, alinhado com Tool Use
   - Contras: Menos features, usuários power podem sentir falta

**Recomendação da IA:**
Opção 2 - Alinha-se com a proposta de valor "você só conversa, a IA organiza".

**Decisão:**
✅ Opção 2 - Simplificar para "Memória" com visualização e gestão de knowledge items

**Implementação:**
- Renomeado "Segundo Cérebro" para "Memória" em docs/specs/product.md
- Removido Graph View, wikilinks, pastas, templates, Quick Switcher
- Adicionado sistema de knowledge items com validação/correção
- Milestone M1.6 atualizado para "Memory View"

---

### [TBD-202] Tool Use Examples (input_examples)

| Campo | Valor |
|-------|-------|
| **Status** | 🟢 Resolvido |
| **Prioridade** | 🟢 Baixa |
| **Categoria** | Técnico |
| **Origem** | Artigo Anthropic "Advanced Tool Use" |
| **Data** | 2026-01-12 |

**Contexto:**
Artigo da Anthropic apresenta feature `input_examples` para melhorar accuracy de tool calls de 72% para 90%.

**Pergunta/Decisão necessária:**
Como implementar Tool Use Examples considerando que Gemini não suporta nativamente?

**Opções consideradas:**
1. **Só Claude** - Implementar apenas para Claude, ignorar Gemini
   - Prós: Simples
   - Contras: Não aproveita feature no provider principal atual
2. **Dual strategy** - Claude usa nativo, Gemini usa workaround (enriquecer description)
   - Prós: Aproveita feature nativa no Claude e mantém compatibilidade com Gemini
   - Contras: Código específico por provider
3. **Não implementar** - Esperar Gemini suportar nativamente
   - Prós: Sem complexidade adicional
   - Contras: Não aproveita melhoria de accuracy

**Recomendação da IA:**
Opção 2 - Dual strategy. Aproveita feature nativa no Claude e mantém compatibilidade com Gemini.

**Decisão:**
✅ Opção 2 - Implementar estratégia dual:
- Claude: usar campo `input_examples` com beta header `advanced-tool-use-2025-11-20`
- Gemini: enriquecer description com exemplos inline via `enrichDescriptionWithExamples()`

**Implementação:**
- docs/specs/engineering.md §8.2 (interface ToolDefinition) + §8.5 (nova seção)
- docs/specs/ai.md §2.4 (nova seção) + §6.2 (exemplos em todas 7 tools)
- docs/specs/integrations.md §6.4 (interface) + §6.7 (nova seção)
- docs/milestones/phase-1-counselor.md M1.1 (nova task)

---

### [TBD-205] Repensar Modelo de Tracking Diário (M2.1)

| Campo | Valor |
|-------|-------|
| **Status** | 🟢 Resolvido |
| **Prioridade** | 🟢 Baixa |
| **Categoria** | Negócio/Técnico |
| **Origem** | Planejamento M2.6 Finance |
| **Data** | 2026-01-19 |

**Contexto:**
O M2.1 (Tracking de Métricas) define `tracking_entries` para micro-tracking diário (peso, água, humor, gastos). Com a criação do M2.6 Finance (planejamento financeiro mensal), surge a dúvida se micro-tracking faz sentido para o modelo "baixo atrito" do produto.

O Finance module usa modelo de planejamento mensal (não micro-tracking de gastos diários), o que pode conflitar com a proposta original do M2.1 que incluía tracking de despesas individuais.

**Pergunta/Decisão necessária:**
- Manter `tracking_entries` para micro-tracking diário?
- Modificar para modelo híbrido?
- Remover em favor de planejamento mensal apenas?

**Opções consideradas:**
1. **Manter como está** — Micro-tracking disponível para quem quiser
   - Prós: Flexibilidade máxima, dados granulares
   - Contras: Pode conflitar com filosofia "baixo atrito"
2. **Simplificar** — Tracking apenas de métricas simples (peso, humor), sem gastos
   - Prós: Alinhado com filosofia do produto, menos sobreposição com Finance
   - Contras: Perde granularidade para quem quer
3. **Remover** — Foco apenas em planejamento mensal (Finance)
   - Prós: Simplicidade máxima
   - Contras: Perde funcionalidade de saúde/bem-estar
4. **Modelo Híbrido Orientado a Conversa** — Captura conversacional + dashboard manual opcional
   - Prós: Baixo atrito como default, poder para quem quer, alinhado com M2.6 Finance
   - Contras: Requer redesign do M2.1, tracking_entries muda de propósito

**Recomendação da IA:**
Opção 4 — Modelo híbrido que combina:
- Captura conversacional: IA detecta métricas em conversa natural e pede confirmação
- Dashboard manual opcional: Formulários para usuários que preferem registrar ativamente
- Mesma filosofia do M2.6 Finance aplicada a todas as áreas

**Decisão:**
✅ Opção 4 — Modelo Híbrido Orientado a Conversa (ADR-015)

Filosofia adotada:
- Tracking via conversa natural com confirmação obrigatória
- Dashboard manual opcional para usuários que querem controle/metas
- `tracking_entries` passa a registrar apenas métricas confirmadas pelo usuário
- Mesma abordagem do M2.6 Finance aplicada a todas as áreas
- Sistema funciona normalmente sem nenhum tracking ativo

**Implementação:**
- Criado ADR-015 documentando a filosofia de tracking de baixo atrito
- Atualizados: product.md (§2.3, §3, §6.6, §6.10, §7.2, §7.6), system.md (§2.3, §3.3, §3.4), ai.md (record_metric, §6.5, §4.1), data-model.md (§4.3)
- Reformulado M2.1 em phase-2-tracker.md com nova filosofia
- Movido `get_trends` do M2.1 para M2.2 (junto com Life Balance Score)

---

### [TBD-206] Escopo do Sistema de Decisões

| Campo | Valor |
|-------|-------|
| **Status** | 🟢 Resolvido |
| **Prioridade** | 🟢 Baixa |
| **Categoria** | Técnico/Negócio |
| **Origem** | Análise de divergências docs/analise-divergencias-visao.md |
| **Data** | 2026-01-19 |

**Contexto:**
Durante análise de divergências entre visão do produto e estado atual, descobriu-se que tabelas de decisões (`decisions`, `decision_options`, `decision_criteria`, `decision_scores`) já existem no banco de dados (migration snapshot M0.4), mas nunca foram implementadas. Linha 1146 do product.md dizia "Removido Sistema de Decisões".

**Pergunta/Decisão necessária:**
O que fazer com as tabelas de decisões existentes no banco?

**Opções consideradas:**
1. **ATIVAR** — Criar schema TypeScript para as tabelas existentes, documentar em todas as specs, implementar como M3.8 Decision Support
   - Prós: Aproveita trabalho existente, alinha com visão "JARVIS-first", habilita learning loop
   - Contras: ~120-155h de desenvolvimento
2. **REMOVER** — Apagar tabelas do banco, documentar que foi descartado
   - Prós: Simplifica codebase, menos código para manter
   - Contras: Perde funcionalidade valiosa para o produto

**Recomendação da IA:**
Opção 1 — ATIVAR. As tabelas já existem, o sistema de decisões é diferencial importante (histórico + learning loop + follow-up), e alinha com a visão "JARVIS-first" do produto.

**Decisão:**
✅ Opção 1 — ATIVAR tabelas existentes como M3.8 Decision Support

Escopo definido:
- Criar schema TypeScript para tabelas existentes
- Documentar em todas as specs (product.md, system.md, ai.md, data-model.md)
- Criar ADR-016 Decision Support Architecture
- Implementar como M3.8 em phase-3-assistant.md
- Tool `save_decision` com requiresConfirmation: true
- Follow-up pós-decisão via job diário
- Learning loop para melhoria de conselhos

**Implementação:**
- Criado ADR-016 documentando arquitetura de suporte a decisões
- Atualizados: product.md (§1.4, §2.1, §5.1, §6.X, linha 1146), system.md (§1.X, §3.X), ai.md (§4.1, §6.2, §6.5, §6.X), data-model.md (§4.X), engineering.md
- Criado M3.8 em phase-3-assistant.md com tasks completas

---

<!--
Mover itens resolvidos para cá com a decisão tomada.
Manter como histórico para referência futura.
-->

---

## 📋 Exemplo de Item Preenchido

### [TBD-001] Limite de mensagens no plano Free

| Campo | Valor |
|-------|-------|
| **Status** | 🟢 Resolvido |
| **Prioridade** | 🟡 Alta |
| **Categoria** | Negócio |
| **Origem** | Implementação de rate limiting |
| **Data** | 2026-01-15 |

**Contexto:**
Ao implementar o rate limiting para o chat, percebi que docs/specs/system.md define 50 mensagens/dia para Free, mas não especifica se isso inclui mensagens da IA ou apenas do usuário.

**Pergunta/Decisão necessária:**
O limite de 50 mensagens/dia conta apenas mensagens do usuário ou o total (usuário + IA)?

**Opções consideradas:**
1. **Apenas usuário** - Mais generoso, usuário envia 50, recebe 50 = 100 msgs no histórico
2. **Total (usuário + IA)** - Mais restritivo, 25 trocas por dia efetivamente

**Recomendação da IA:**
Opção 1 (apenas usuário) - Mais intuitivo para o usuário e alinha com como outros produtos contam.

**Decisão:**
✅ Opção 1 - Contar apenas mensagens do usuário.

**Implementação:**
Atualizado `chat.service.ts` para contar apenas `role: 'user'` no rate limit.

---

## 🔗 Referências Rápidas

| Documento | Quando consultar |
|-----------|------------------|
| `docs/specs/product.md` | Features, roadmap, personas |
| `docs/specs/system.md` | Regras de negócio, fluxos, limites |
| `docs/specs/engineering.md` | Stack, arquitetura, padrões |
| `docs/specs/ai.md` | Prompts, comportamentos de IA |
| `docs/specs/data-model.md` | Schema, tabelas, relações |
| `docs/specs/integrations.md` | APIs externas, webhooks |

---

## 💡 Convenções de Numeração

- **TBD-0XX**: Bloqueantes (001-099)
- **TBD-1XX**: Decisões de Negócio (100-199)
- **TBD-2XX**: Decisões Técnicas (200-299)
- **TBD-3XX**: Integrações (300-399)
- **TBD-4XX**: UX/Design (400-499)

---

*Última atualização: 06 Fevereiro 2026*
*Revisão: Adicionado TBD-208 (migrar E2E de PostgREST para Drizzle)*
