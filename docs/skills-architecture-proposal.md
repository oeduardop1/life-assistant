# Skills Architecture — Life Assistant AI

> **Documento de estudo e proposta arquitetural.**
> Define como a IA pode evoluir de um assistente monolítico para um sistema de skills especializadas por domínio.
>
> **Status:** Proposta (não implementado)
> **Inspiração:** Claude Code Skills System + Claude Code Subagents
> **Referência atual:** `docs/specs/ai.md`, `docs/specs/engineering.md` §8, `ADR-012`
> **Decisões de Design:** Seção 15 (baseada em pesquisa de padrões da indústria 2025-2026)

---

## 1) Sumário Executivo

### O que é proposto

Evoluir a IA do Life Assistant de uma **assistente monolítica** (todas as tools + tom único) para um sistema de **skills especializadas** que se ativam automaticamente por domínio da conversa, cada uma com:

- Subset de tools relevantes
- Tom de voz e abordagem específicos
- Instruções adicionais de prompt (progressive disclosure)
- Temperatura/configuração de LLM otimizada

### Por que não Subagents

| Aspecto | Skills (recomendado) | Subagents (descartado) |
|---------|---------------------|------------------------|
| Contexto | Mesmo contexto de conversa | Contexto isolado |
| Memória | Mantém user_memory + histórico | Perde continuidade |
| UX | Transição suave, invisível | "Troca de agente" perceptível |
| Complexidade | Evolução natural do ContextBuilder | Requer orquestração pesada |
| Aplicabilidade | Conversa 1:1 contínua | Tarefas paralelas independentes |

---

## 2) Problema: Estado Atual

### 2.1 Diagnóstico baseado no código-fonte

#### Todas as tools são carregadas sempre

**Arquivo:** `apps/api/src/modules/chat/application/services/chat.service.ts` (linhas 85-101)

```typescript
private readonly availableTools: ToolDefinition[] = [
  // Memory tools
  searchKnowledgeTool,
  addKnowledgeTool,
  analyzeContextTool,
  // Tracking tools (M2.1)
  recordMetricTool,
  getTrackingHistoryTool,
  updateMetricTool,
  deleteMetricTool,
  // Finance tools (M2.2)
  getFinanceSummaryTool,
  getPendingBillsTool,
  markBillPaidTool,
  createExpenseTool,
  getDebtProgressTool,
];
```

**Impacto:** ~7.500 tokens consumidos em tool definitions a cada chamada LLM, independente do tópico da conversa.

#### Modes são apenas 2 e manuais

**Arquivo:** `apps/api/src/modules/chat/application/services/context-builder.service.ts` (linhas 47-53)

```typescript
switch (conversation.type) {
  case 'counselor':
    return this.addCounselorMode(basePrompt);
  case 'general':
  default:
    return basePrompt;
}
```

**Impacto:** O usuário precisa escolher manualmente "modo conselheira". Não há adaptação automática por tópico.

#### System prompt monolítico

**Arquivo:** `apps/api/src/modules/chat/application/services/context-builder.service.ts` (linhas 60-251)

O `buildBasePrompt` retorna ~250 linhas de instruções, incluindo regras detalhadas para TODAS as tools (finance, tracking, memory, confirmação, etc.) mesmo quando o tópico é simples.

**Impacto:** ~2.000-2.500 tokens de system prompt + ~7.500 tokens de tools = **~10.000 tokens fixos** antes de qualquer mensagem do usuário.

#### Tool loop não distingue domínios

**Arquivo:** `packages/ai/src/services/tool-loop.service.ts` (linhas 139-147)

```typescript
const response = await llm.chatWithTools({
  messages,
  tools: config.tools, // SEMPRE todas as tools
  ...(config.systemPrompt && { systemPrompt: config.systemPrompt }),
  ...(config.temperature !== undefined && { temperature: config.temperature }),
});
```

**Impacto:** O LLM precisa "navegar" entre 15 tools para decidir qual usar, mesmo quando a conversa é claramente sobre um único domínio.

### 2.2 Números atuais

| Métrica | Valor Atual |
|---------|-------------|
| Tools carregadas | 15 (todas, sempre) |
| Tokens em tool definitions | ~7.500 |
| Tokens em system prompt | ~2.000-2.500 |
| Tokens fixos por request | ~10.000 |
| Modes disponíveis | 2 (general, counselor) |
| Seleção de mode | Manual (usuário escolhe) |
| Adaptação por tópico | Nenhuma |

### 2.3 Crescimento projetado (milestones futuros)

Baseado nos milestones planejados (`docs/milestones/phase-2-tracker.md`, `phase-3-assistant.md`):

| Milestone | Novas Tools | Total Acumulado |
|-----------|-------------|-----------------|
| Atual (M2.2) | — | 15 tools |
| M2.3 (Hábitos) | ~3-4 (CRUD hábitos) | ~19 tools |
| M2.4 (CRM) | ~3-4 (CRUD pessoas) | ~23 tools |
| M2.5 (Trends) | 1 (get_trends) | ~24 tools |
| M3.x (Assistant) | ~4-5 (suggest_action, create_followup, save_decision, etc.) | **~29 tools** |

**Com 29 tools carregadas simultaneamente:** ~14.000 tokens só em definitions. Isso representa **~35% do contexto de um modelo de 40K tokens** consumido antes de qualquer conteúdo real.

---

## 3) Solução: Skills System

### 3.1 Conceito

Uma **Skill** é um pacote de configuração que modifica o comportamento da IA para um domínio específico:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              USER MESSAGE                                    │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           SKILL DETECTOR                                     │
│   Analisa mensagem + contexto → Determina skill(s) ativa(s)                 │
│   (Heurística rápida + fallback LLM quando ambíguo)                         │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                          ┌─────────┼─────────┐
                          ▼         ▼         ▼
                    ┌──────────┐ ┌──────────┐ ┌──────────┐
                    │ Skill A  │ │ Skill B  │ │  Base    │
                    │ (ativa)  │ │ (ativa)  │ │ (sempre) │
                    ├──────────┤ ├──────────┤ ├──────────┤
                    │ +tools   │ │ +tools   │ │ tools:   │
                    │ +prompt  │ │ +prompt  │ │ search   │
                    │ +tone    │ │ +tone    │ │ add_know │
                    │ +temp    │ │ +temp    │ │ analyze  │
                    └──────────┘ └──────────┘ └──────────┘
                          │         │         │
                          ▼         ▼         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      CONTEXT BUILDER (evoluído)                               │
│   System Prompt = Base + Skills Ativas + User Memory + Current Context       │
│   Tools = Base Tools + Skills Tools (sem duplicatas)                          │
│   Temperature = Média ponderada das skills ativas                            │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         TOOL LOOP (inalterado)                                │
│   Mesmo runToolLoop, mas com subset de tools filtrado                        │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Princípio: Progressive Disclosure (do Claude Code)

Inspirado no sistema de skills do Claude Code, a informação é carregada em 3 níveis:

| Nível | Quando Carregado | Custo em Tokens | Conteúdo |
|-------|-----------------|-----------------|----------|
| **L1: Metadata** | Sempre (startup) | ~50 tokens/skill | Nome + description (para routing) |
| **L2: Instructions** | Quando skill ativa | ~200-500 tokens | Prompt extension + tone config |
| **L3: Tools** | Quando skill ativa | ~1.500-3.000 tokens | Tool definitions do domínio |

**Comparação com estado atual:**

| Cenário | Tokens Fixos (Atual) | Tokens com Skills |
|---------|---------------------|-------------------|
| Conversa casual ("oi, tudo bem?") | ~10.000 | ~3.500 (base only) |
| Conversa sobre finanças | ~10.000 | ~5.500 (base + finance skill) |
| Conversa emocional profunda | ~10.000 | ~4.500 (base + counselor skill) |
| Conversa sobre peso + ansiedade | ~10.000 | ~6.500 (base + health + counselor) |

**Economia média: 40-65% dos tokens fixos por request.**

---

## 4) Definição de Skill

### 4.1 Interface

```typescript
/**
 * Definição de uma skill do sistema de IA.
 * Skills são pacotes de configuração que adaptam o comportamento da IA por domínio.
 *
 * Inspirado em: Claude Code Skills (SKILL.md + frontmatter)
 * Diferença: Skills aqui são runtime (não filesystem), pois o produto é SaaS.
 */
interface SkillDefinition {
  /** Identificador único da skill */
  name: string;

  /** Descrição para routing automático (LLM usa isso para decidir ativação) */
  description: string;

  /**
   * Patterns regex para detecção rápida (heurística, zero-cost).
   * Usa word boundaries (\b) para evitar falsos positivos.
   * Matching é case-insensitive.
   *
   * @see Seção 15.2 - Decisão sobre falsos positivos
   */
  triggerPatterns: RegExp[];

  /**
   * Patterns de exclusão (opcional).
   * Se qualquer excludePattern der match, a skill NÃO é ativada.
   * Útil para desambiguar: "gastei tempo" não deve ativar finance.
   */
  excludePatterns?: RegExp[];

  /**
   * Tools disponíveis quando esta skill está ativa.
   * Base tools (search_knowledge, add_knowledge, analyze_context) são SEMPRE disponíveis.
   * Estas tools são ADICIONADAS às base tools.
   */
  tools: string[];

  /**
   * Instruções adicionais injetadas no system prompt quando a skill está ativa.
   * Deve ser conciso (<500 tokens).
   * Pode referenciar tools da skill e definir comportamentos específicos.
   */
  promptExtension: string;

  /**
   * Configuração de tom de voz para esta skill.
   * Influencia como a IA se comunica neste domínio.
   */
  tone: ToneConfig;

  /**
   * Temperature override para LLM quando esta skill está ativa.
   * Se múltiplas skills ativas, usa a MENOR temperature (mais determinístico).
   * undefined = usa default do provider.
   */
  temperature?: number;

  /**
   * Prioridade de ativação (menor = maior prioridade).
   * Usado para resolver conflitos quando múltiplas skills são candidatas.
   * Default: 5.
   */
  priority?: number;
}

interface ToneConfig {
  /** Estilo geral da comunicação */
  style: 'practical' | 'reflective' | 'empathetic' | 'hopeful' | 'direct' | 'celebratory';

  /** Nível de uso de emojis */
  emojiLevel: 'none' | 'minimal' | 'moderate';

  /** Comprimento esperado das respostas */
  responseLength: 'concise' | 'moderate' | 'elaborated';

  /** Formalidade */
  formality: 'informal' | 'careful-informal';
}
```

### 4.2 Base Tools (sempre disponíveis)

Independente da skill ativa, estas tools estão SEMPRE disponíveis pois são transversais:

```typescript
const BASE_TOOLS: string[] = [
  'search_knowledge',   // Buscar fatos sobre o usuário
  'add_knowledge',      // Registrar fato aprendido
  'analyze_context',    // Inferência e conexões (ADR-014)
];
```

**Justificativa:** Qualquer conversa pode levar a um fato novo (add_knowledge), precisar de contexto (search_knowledge), ou detectar conexões (analyze_context). Remover essas tools de qualquer skill quebraria a capacidade de aprendizado contínuo.

### 4.3 Skills Definidas

#### Finance Skill

```typescript
const financeSkill: SkillDefinition = {
  name: 'finance',
  description: 'Domínio financeiro: gastos, receitas, contas, dívidas, investimentos, orçamento, parcelas, boletos e planejamento financeiro.',
  triggerPatterns: [
    /\bgast(o|ei|ou|ar|ando|os)\b/i,           // gasto, gastei, gastou, gastar
    /\bconta(s)?\s+(fixa|pagar|pendente)/i,    // conta fixa, conta pagar
    /\bdívida/i, /\bdivida/i,                  // dívida (sempre finance)
    /\bsalário/i, /\bsalario/i,                // salário
    /\binvest/i,                               // investir, investimento
    /\borçamento/i, /\borcamento/i,            // orçamento
    /\bpagu?ei\b/i,                            // paguei, pago
    /\bboleto/i, /\bparcela/i,                 // boleto, parcela
    /\bdinheiro\b/i,                           // dinheiro
    /R\$\s*\d/,                                // R$ 50, R$ 100
    /\bcartão/i, /\bcartao/i,                  // cartão
    /\bfatura/i,                               // fatura
    /\beconomiz/i, /\bpoupar/i, /\bpoupança/i, // economizar, poupar
    /\brenda\b/i,                              // renda
  ],
  excludePatterns: [
    /\bgast(o|ar)\s+(tempo|energia|horas)/i,   // "gastei tempo" → não é finance
    /\bconta(r|ou|ndo|va)\b/i,                 // "contou uma história" → não é finance
    /\brenda\s+(se|os|as)\b/i,                 // "renda-se" → não é finance
  ],
  tools: [
    'get_finance_summary',
    'get_pending_bills',
    'mark_bill_paid',
    'create_expense',
    'get_debt_progress',
  ],
  promptExtension: `## Skill: Finanças
- Seja prática e objetiva com números
- Mostre sempre o impacto no orçamento geral quando relevante
- Nunca julgue gastos, apenas informe dados e tendências
- Use get_finance_summary proativamente para contextualizar respostas
- Ofereça registrar despesas quando o usuário mencionar gastos
- Conecte finanças com bem-estar quando detectar stress financeiro (combine com counselor)
- Formate valores em R$ com separadores brasileiros (ex: R$ 1.234,56)`,
  tone: {
    style: 'practical',
    emojiLevel: 'minimal',
    responseLength: 'concise',
    formality: 'informal',
  },
  temperature: 0.3, // Dados financeiros requerem mais precisão
  priority: 3,
};
```

#### Health Skill

```typescript
const healthSkill: SkillDefinition = {
  name: 'health',
  description: 'Domínio de saúde: peso, exercícios, sono, hidratação, humor, energia, alimentação, hábitos de saúde e bem-estar físico/mental.',
  triggerPatterns: [
    /\bpeso\b/i, /\bpes(ei|ou|ar)\b/i,         // peso, pesei
    /\bexerc/i, /\bacademia/i,                 // exercício, academia
    /\bmusculação/i, /\btrein/i,               // treino
    /\bsono\b/i, /\bdormi/i, /\binsônia/i,     // sono, dormir
    /\b\d+\s*(ml|litro)/i,                     // 500ml, 2 litros
    /\bágua\b/i, /\bagua\b/i,                  // água
    /\bhumor\b/i, /\benergia\b/i,              // humor, energia
    /\bcansad/i, /\bdispost/i,                 // cansado, disposto
    /\bdieta\b/i, /\baliment/i,                // dieta, alimentação
    /\bcomer\b/i, /\bcomida\b/i,               // comer, comida
    /\bsaúde\b/i, /\bsaude\b/i,                // saúde
    /\bmédic/i, /\bmedic/i,                    // médico
    /\bcaminh/i, /\bcorr(er|i|eu)\b/i,         // caminhada, correr
    /\byoga\b/i, /\balongamento/i,             // yoga
  ],
  tools: [
    'record_metric',
    'get_tracking_history',
    'update_metric',
    'delete_metric',
  ],
  promptExtension: `## Skill: Saúde & Bem-Estar
- Siga rigorosamente ADR-015: OFEREÇA registrar, nunca registre sem confirmação
- Nunca cobre tracking não mencionado pelo usuário
- Seja positiva sobre progressos, sem julgar retrocessos
- Para peso: sensibilidade com imagem corporal, foque em saúde não estética
- Para sono: conecte com humor/energia quando padrões aparecerem
- Para exercício: celebre constância, não intensidade
- Detecte conexões: stress → sono, exercício → humor, alimentação → energia`,
  tone: {
    style: 'empathetic',
    emojiLevel: 'moderate',
    responseLength: 'moderate',
    formality: 'informal',
  },
  temperature: 0.5,
  priority: 4,
};
```

#### Counselor Skill

```typescript
const counselorSkill: SkillDefinition = {
  name: 'counselor',
  description: 'Modo conselheira: reflexão, decisões difíceis, apoio emocional, desabafos, conflitos, ansiedade, incertezas e autoconhecimento.',
  triggerPatterns: [
    /\bconselho/i,                             // conselho
    /não sei o que fazer/i,                    // frase completa
    /preciso desabafar/i, /\bdesabaf/i,        // desabafar
    /\bconfus/i, /\bindecis/i, /\bdilema/i,    // confuso, indeciso
    /\bansie?d/i, /\bansios/i,                 // ansiedade, ansioso
    /\bpreocupad/i,                            // preocupado
    /\btrist/i, /\bchorand/i,                  // triste, chorando
    /\bdeprimid/i,                             // deprimido
    /\bdecis/i,                                // decisão, decidir
    /\bconflito/i, /\bbriga/i,                 // conflito, briga
    /\bfrustr/i, /\braiva\b/i, /\birritad/i,   // frustrado, raiva
    /\bmedo\b/i, /\binsegur/i,                 // medo, inseguro
    /\bsozinho/i, /\bsolidão/i,                // sozinho, solidão
    /me ajuda a pensar/i,                      // frase completa
    /o que você acha/i,                        // pedindo opinião
  ],
  tools: [
    // Counselor não precisa de tracking/finance tools
    // Foca em memória e inferência
  ],
  promptExtension: `## Skill: Conselheira
- Faça perguntas abertas que estimulem reflexão
- Explore sentimentos e motivações por trás das situações
- Ajude o usuário a encontrar suas próprias respostas
- Use técnicas de escuta ativa (parafrasear, validar emoções)
- Conecte a conversa com padrões do histórico (via analyze_context)
- Estrutura: acolher → perguntar reflexivo → perspectiva → próximo passo
- NUNCA dê respostas rápidas ou superficiais
- Para decisões importantes: ofereça usar save_decision (quando implementado)
- Detecte quando o assunto cruza com outros domínios (finance + counselor é frequente)`,
  tone: {
    style: 'reflective',
    emojiLevel: 'none',
    responseLength: 'elaborated',
    formality: 'careful-informal',
  },
  temperature: 0.7, // Mais criativo para respostas reflexivas
  priority: 2, // Alta prioridade quando detectado
};
```

#### Relationships Skill

```typescript
const relationshipsSkill: SkillDefinition = {
  name: 'relationships',
  description: 'Domínio de relacionamentos: família, amigos, namoro, casamento, colegas de trabalho, CRM pessoal e dinâmicas interpessoais.',
  triggerPatterns: [
    /\bnamor/i, /\bnamorad/i,                  // namoro, namorada
    /\bcasament/i, /\besposa?\b/i,             // casamento, esposo/a
    /\bmarid/i,                                // marido
    /\bfamília/i, /\bfamilia/i,                // família
    /\b(meu|minha)\s+(pai|mãe|mae)\b/i,        // meu pai, minha mãe
    /\birmã/i, /\birmao/i,                     // irmã, irmão
    /\bamig/i, /\bamizade/i,                   // amigo, amizade
    /\bcolega/i,                               // colega
    /\brelacion/i,                             // relacionamento
    /\btérmino/i, /\btermino/i, /\bseparaç/i,  // término, separação
    /\bfilho/i, /\bfilha/i,                    // filho, filha
    /\bsogr/i, /\bcunhad/i,                    // sogro, cunhado
    /\bparente/i,                              // parente
  ],
  tools: [
    'get_person',
    'update_person',
  ],
  promptExtension: `## Skill: Relacionamentos
- Use get_person para buscar contexto sobre pessoas mencionadas
- Mantenha neutralidade em conflitos (não tome lados)
- Lembre conexões anteriores sobre a pessoa mencionada
- Para namoro/casamento: sensibilidade e respeito
- Para família: considerar dinâmicas complexas
- Para trabalho: separar pessoal de profissional
- Ofereça usar update_person quando aprender algo novo sobre alguém`,
  tone: {
    style: 'empathetic',
    emojiLevel: 'minimal',
    responseLength: 'moderate',
    formality: 'careful-informal',
  },
  temperature: 0.6,
  priority: 4,
};
```

#### Professional Skill

```typescript
const professionalSkill: SkillDefinition = {
  name: 'professional',
  description: 'Domínio profissional: carreira, trabalho, emprego, promoção, demissão, projetos, produtividade, metas profissionais e desenvolvimento.',
  triggerPatterns: [
    /\btrabalh/i,                              // trabalho, trabalhando
    /\bemprego\b/i, /\bcarreira\b/i,           // emprego, carreira
    /\bpromoção/i, /\bpromoc/i,                // promoção
    /\bdemiss/i,                               // demissão
    /\bprojeto/i,                              // projeto
    /\bprazo\b/i, /\bdeadline\b/i,             // prazo, deadline
    /\breunião/i, /\breuniao/i,                // reunião
    /\bapresentaç/i,                           // apresentação
    /\bcurrículo/i, /\bcurriculo/i,            // currículo
    /\bentrevista/i,                           // entrevista
    /\baumento\b/i,                            // aumento (salarial)
    /\b(meu|minha)\s+(chefe|gestor)/i,         // meu chefe, minha gestora
    /\bequipe\b/i, /\btime\b/i,                // equipe, time
    /\bprodutiv/i,                             // produtividade
    /\bfoco\b/i, /\bprocrastin/i,              // foco, procrastinar
    /\bfreelanc/i,                             // freelancer
    /\bnegócio/i, /\bnegocio/i,                // negócio
    /\bempreend/i,                             // empreendedor
  ],
  tools: [
    // Usa base tools + pode cruzar com finance (salário) ou relationships (colegas)
  ],
  promptExtension: `## Skill: Profissional
- Seja direto e orientado a ações concretas
- Ajude a estruturar planos (próximos passos, prazos)
- Para conflitos no trabalho: objectividade sem julgar
- Para decisões de carreira: análise de prós/contras
- Conecte com finanças quando relevante (mudança salarial)
- Conecte com bem-estar quando detectar burnout/stress`,
  tone: {
    style: 'direct',
    emojiLevel: 'minimal',
    responseLength: 'concise',
    formality: 'informal',
  },
  temperature: 0.4,
  priority: 4,
};
```

#### General Skill (fallback)

```typescript
const generalSkill: SkillDefinition = {
  name: 'general',
  description: 'Fallback para conversas casuais, saudações, perguntas gerais ou tópicos que não se encaixam em nenhuma skill específica.',
  triggerPatterns: [], // Nunca ativada por trigger — é o fallback (RegExp[] vazio)
  tools: [], // Apenas base tools
  promptExtension: '', // Sem extensão adicional
  tone: {
    style: 'practical',
    emojiLevel: 'moderate',
    responseLength: 'concise',
    formality: 'informal',
  },
  priority: 10, // Menor prioridade (fallback)
};
```

---

## 5) Skill Detection (Routing)

### 5.1 Estratégia em duas camadas

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                         SKILL DETECTION PIPELINE                              │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  Camada 1: HEURÍSTICA (zero-cost, <1ms)                                      │
│  ─────────────────────────────────────                                        │
│  • Verifica triggerPatterns contra mensagem do usuário                         │
│  • Case-insensitive, includes() match                                         │
│  • Retorna: candidateSkills[]                                                 │
│                                                                               │
│  Se candidateSkills.length >= 1:                                              │
│    → Usa skills detectadas (ordenadas por priority)                           │
│    → NÃO chama LLM para routing                                              │
│                                                                               │
│  Se candidateSkills.length === 0:                                             │
│    → Camada 2                                                                 │
│                                                                               │
│  Camada 2: CONTEXTO (usa histórico, zero LLM call extra)                      │
│  ───────────────────────────────────────────────────────                       │
│  • Verifica últimas 3 mensagens por triggerPatterns                            │
│  • Se conversa já estava em skill X, mantém X (inércia)                       │
│  • Se nenhum match: usa 'general' (fallback)                                  │
│                                                                               │
│  Nota: NÃO usa LLM call extra para routing.                                  │
│  O custo de uma LLM call para routing > economia de tokens por filtering.     │
│                                                                               │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 5.2 Por que NÃO usar LLM para routing

| Abordagem | Custo | Latência | Accuracy |
|-----------|-------|----------|----------|
| Heurística (triggerPatterns) | 0 tokens | <1ms | ~85% |
| LLM call extra para routing | ~500 tokens | 500-1000ms | ~95% |
| LLM implícito (no prompt) | 0 extra | 0 extra | ~90% |

A diferença de accuracy (85% → 95%) não justifica o custo de uma LLM call extra. Além disso:

- **Falso positivo** (skill ativada sem necessidade): Impacto mínimo — adiciona tools que não serão usadas naquele request
- **Falso negativo** (skill não ativada): Base tools (`analyze_context`) ainda funcionam — a IA apenas não terá as instruções de tom específicas

### 5.3 Inércia de Skill (Continuidade Conversacional)

> **Decisão de Design:** Inércia é **derivada do histórico**, não armazenada.
> Ver Seção 15.4 para justificativa baseada em padrões da indústria.

A skill ativa é derivada das últimas N mensagens do usuário em cada request.
Isso elimina a necessidade de armazenar estado adicional (zero storage).

```typescript
/**
 * Deriva skills ativas do histórico de mensagens.
 * Não há estado persistido — tudo é calculado on-the-fly.
 *
 * @see Seção 15.4 - Decisão: Storage de ConversationSkillState
 */
function deriveActiveSkills(
  currentMessage: string,
  recentUserMessages: string[],  // Últimas 5 mensagens do usuário
  maxSkills: number = 2          // Limite de skills simultâneas
): SkillDefinition[] {
  // 1. Tentar detectar skills na mensagem atual
  const currentSkills = detectSkills(currentMessage);

  if (currentSkills.length > 0) {
    return currentSkills.slice(0, maxSkills);
  }

  // 2. Se não detectou (ex: "sim", "ok"), usar contexto recente
  const contextSkills = recentUserMessages
    .flatMap(msg => detectSkills(msg));

  if (contextSkills.length > 0) {
    // Retornar as mais frequentes
    return getMostFrequent(contextSkills, maxSkills);
  }

  // 3. Fallback: general
  return [generalSkill];
}

// Configuração de inércia
const SKILL_CONTEXT_MESSAGES = 5;  // Quantas mensagens olhar para trás
```

**Por que derivar ao invés de armazenar:**

| Aspecto | Armazenar (Redis) | Derivar (histórico) |
|---------|------------------|---------------------|
| Latência | +1 RTT por request | Zero adicional |
| Complexidade | Gerenciar TTL, invalidação | Cálculo simples |
| Consistência | Pode dessincronizar | Sempre consistente |
| Debug | Precisa inspecionar Redis | Basta ver mensagens |

### 5.4 Multi-Skill Activation

> **Decisão de Design:** Máximo **2 skills simultâneas** (dominante + secundária).
> Ver Seção 15.3 para justificativa baseada em padrões da indústria.

O sistema permite até 2 skills ativas simultaneamente. Isso equilibra contexto cruzado com simplicidade:

**Exemplo real — Stress financeiro:**
```
Usuário: "Estou perdendo o sono porque não consigo pagar as parcelas"
```

Detecção (triggers encontrados):
1. "sono" → triggers `health` (priority 4)
2. "pagar", "parcelas" → triggers `finance` (priority 3)
3. "perdendo o sono" sugere stress → `counselor` também seria candidato (priority 2)

**Com limite de 2 skills:** `[counselor, finance]` (as 2 com menor priority number)

> **Nota:** `health` é descartado pois excede o limite. Porém, as base tools
> (`analyze_context`) ainda permitem detectar conexões com saúde.

**Composição do prompt:**
```
[Base Prompt - ~1.500 tokens]
[Counselor Extension - ~350 tokens]  ← skill dominante (priority 2)
[Finance Extension - ~300 tokens]    ← skill secundária (priority 3)
[User Memory - ~500-800 tokens]

Tools disponíveis: base (3) + finance (5) = 8 tools (~4.000 tokens)
```

**Total: ~6.500 tokens** (vs ~10.000 atuais com TODAS as tools)

E mais importante: as instruções são **relevantes** para o contexto, não genéricas.

---

## 6) Fluxo de Implementação

### 6.1 Comparação: Fluxo Atual vs. Fluxo com Skills

#### Fluxo Atual

```
Usuário envia: "gastei 50 reais no mercado"
         │
         ▼
┌─────────────────────────────────────┐
│ 1. buildSystemPrompt()              │ ← ~2.500 tokens (TUDO incluído)
│    - Base prompt completo            │
│    - Instruções de TODAS as tools   │
│    - Regras de tracking             │
│    - Regras de finance              │
│    - Regras de counselor            │
│    - User memory                    │
└─────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│ 2. runToolLoop()                     │
│    tools: TODAS (15)                 │ ← ~7.500 tokens em definitions
│    temperature: undefined (default)  │
└─────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│ 3. LLM navega 15 tools              │
│    - Identifica create_expense       │
│    - Ignora 14 tools irrelevantes    │
│    - Pode confundir com record_metric│ ← Ambiguidade por excesso de opções
└─────────────────────────────────────┘
```

#### Fluxo com Skills

```
Usuário envia: "gastei 50 reais no mercado"
         │
         ▼
┌─────────────────────────────────────┐
│ 1. detectSkills("gastei 50 reais")   │ ← <1ms, 0 tokens
│    - "gast" match → finance skill    │
│    - Result: ['finance']             │
└─────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│ 2. buildSystemPrompt(skills)         │ ← ~2.000 tokens (base + finance extension)
│    - Base prompt (compacto)          │
│    - Finance extension: tom, regras │
│    - User memory                    │
│    - SEM regras de tracking          │
│    - SEM regras de counselor         │
└─────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│ 3. runToolLoop()                     │
│    tools: base(3) + finance(5) = 8   │ ← ~3.500 tokens em definitions
│    temperature: 0.3 (finance)        │
└─────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│ 4. LLM navega 8 tools               │
│    - Identifica create_expense       │
│    - Sem ambiguidade com record_metric│ ← record_metric não está presente
│    - Mais rápido e mais preciso      │
└─────────────────────────────────────┘
```

**Ganhos:**
- **47% menos tokens** em tools (8 vs 15)
- **20% menos tokens** em system prompt (sem instruções irrelevantes)
- **Maior accuracy** do LLM (menos opções = menos confusão)
- **Menor latência** (menos tokens = processamento mais rápido)
- **Tom adequado** (prático para finanças, não reflexivo)

### 6.2 Fluxo Multi-Skill Detalhado

```
Usuário envia: "estou com insônia por causa das dívidas"
         │
         ▼
┌─────────────────────────────────────┐
│ 1. detectSkills(message)             │
│    - "insônia" → health              │
│    - "dívidas" → finance             │
│    - contexto emocional → counselor  │ (via inércia ou padrão composto)
│    Result: ['counselor', 'health',   │
│             'finance']               │
└─────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│ 2. composeSkills(activeSkills)       │
│    tools: base(3) + health(4) +     │
│           finance(5) = 12 tools      │
│    prompt: base + counselor ext      │
│           + health ext + finance ext │
│    temperature: min(0.7, 0.5, 0.3)  │
│               = 0.3                  │
│    tone: counselor priority (menor   │
│          priority number = dominante)│
└─────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│ 3. runToolLoop()                     │
│    LLM com instruções de:           │
│    - Counselor: reflexão, empatia    │
│    - Health: conexão sono→stress     │
│    - Finance: dados de dívidas       │
│                                      │
│    Possível tool loop:              │
│    1. analyze_context(topic:"insônia │
│       por dívidas", areas:["health", │
│       "finance"])                     │
│    2. get_finance_summary()          │
│    3. Resposta integrando todos os   │
│       contextos                      │
└─────────────────────────────────────┘
```

---

## 7) Comparações Detalhadas

### 7.1 Token Usage por Cenário

| Cenário | Atual (tokens) | Com Skills (tokens) | Economia |
|---------|---------------|--------------------:|----------|
| "Oi, tudo bem?" | ~10.000 | ~3.500 | **-65%** |
| "Gastei 50 no mercado" | ~10.000 | ~5.500 | **-45%** |
| "Estou triste hoje" | ~10.000 | ~4.500 | **-55%** |
| "Pesei 82kg hoje" | ~10.000 | ~5.000 | **-50%** |
| "Como estão minhas dívidas?" | ~10.000 | ~5.500 | **-45%** |
| "Não sei se peço demissão" | ~10.000 | ~5.500 | **-45%** |
| "Insônia por causa das dívidas" | ~10.000 | ~7.500 | **-25%** |
| **Média ponderada** | **~10.000** | **~5.200** | **-48%** |

**Nota:** A economia é em tokens FIXOS (system prompt + tools). Os tokens de mensagens do usuário e histórico não mudam.

### 7.2 Tool Accuracy

Com 15 tools disponíveis, o LLM pode confundir:

| Confusão Atual | Por que acontece | Com Skills |
|----------------|------------------|------------|
| `record_metric` vs `create_expense` | Ambos registram "gastos" | Finance skill: só `create_expense` disponível |
| `update_metric` vs `delete_metric` | Ambos operam em registros existentes | Health skill: ambos disponíveis, mas prompt extension clarifica |
| `get_tracking_history` vs `get_trends` (futuro) | Ambos buscam dados históricos | Health skill: prompt extension diferencia uso |
| `search_knowledge` vs `get_person` | Ambos buscam informações | Relationships skill: `get_person` priorizado no prompt |
| `add_knowledge` vs `record_metric` | "Lembra que peso 82kg" vs "Registra 82kg" | Health skill: regras ADR-015 no prompt extension |

### 7.3 Qualidade de Resposta

| Aspecto | Atual | Com Skills |
|---------|-------|------------|
| **Tom** | Mesmo tom para tudo | Adaptado: prático (finance), reflexivo (counselor), empático (health) |
| **Profundidade** | Respostas de tamanho similar | Elaborated para counselor, concise para finance |
| **Emojis** | "Moderado" sempre | None para counselor, moderate para general |
| **Proatividade** | Mesma para todos os domínios | Finance: mostra impacto no orçamento. Health: detecta padrões. |
| **Conexões** | Depende do analyze_context | Skills combinadas naturalmente conectam domínios |

### 7.4 Custo Operacional (projeção com 29 tools futuras)

| Métrica | Atual (15 tools) | Futuro sem Skills (29 tools) | Futuro com Skills |
|---------|-------------------|------------------------------|-------------------|
| Tokens fixos/request | ~10.000 | ~16.500 | ~5.500 (média) |
| Custo input/1000 msgs (Gemini Flash) | ~$0.15 | ~$0.25 | ~$0.08 |
| Custo input/1000 msgs (Claude Sonnet) | ~$0.90 | ~$1.50 | ~$0.50 |
| Tool accuracy (estimada) | ~90% | ~80% (mais confusão) | ~95% (menos opções) |

---

## 8) Impacto na Arquitetura Existente

### 8.1 Componentes Afetados

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     IMPACTO NOS COMPONENTES EXISTENTES                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────┐    ┌──────────────────────────────────────┐    │
│  │ ContextBuilderService   │    │ ChatService                          │    │
│  │ (EVOLUÇÃO PRINCIPAL)    │    │ (EVOLUÇÃO MENOR)                     │    │
│  ├─────────────────────────┤    ├──────────────────────────────────────┤    │
│  │ ANTES:                  │    │ ANTES:                               │    │
│  │ - buildBasePrompt()     │    │ - availableTools = ALL               │    │
│  │ - addCounselorMode()    │    │ - toolLoopConfig.tools = ALL         │    │
│  │                         │    │                                      │    │
│  │ DEPOIS:                 │    │ DEPOIS:                              │    │
│  │ - buildBasePrompt()     │    │ - availableTools = detectSkills()    │    │
│  │ - composeSkillPrompts() │    │   → getToolsForSkills()             │    │
│  │ - detectSkills()        │    │ - toolLoopConfig.tools = filtered   │    │
│  │ - getToolsForSkills()   │    │ - toolLoopConfig.temperature =      │    │
│  └─────────────────────────┘    │   getTemperature(skills)            │    │
│                                  └──────────────────────────────────────┘    │
│                                                                              │
│  ┌─────────────────────────┐    ┌──────────────────────────────────────┐    │
│  │ ToolLoopService         │    │ Tool Definitions                     │    │
│  │ (SEM MUDANÇA)           │    │ (SEM MUDANÇA)                        │    │
│  ├─────────────────────────┤    ├──────────────────────────────────────┤    │
│  │ runToolLoop() continua  │    │ Schemas continuam iguais             │    │
│  │ exatamente como está.   │    │ Apenas o filtering muda QUAIS       │    │
│  │ Recebe tools via config │    │ são passadas ao toolLoopConfig       │    │
│  │ e executa normalmente.  │    │                                      │    │
│  └─────────────────────────┘    └──────────────────────────────────────┘    │
│                                                                              │
│  ┌─────────────────────────┐    ┌──────────────────────────────────────┐    │
│  │ packages/ai/            │    │ Confirmation System                  │    │
│  │ (ADIÇÃO: skills/)       │    │ (SEM MUDANÇA)                        │    │
│  ├─────────────────────────┤    ├──────────────────────────────────────┤    │
│  │ Novo diretório:         │    │ ConfirmationStateService             │    │
│  │ src/skills/             │    │ funciona independente de skills      │    │
│  │ - definitions/          │    │ (opera sobre tool calls, não skills) │    │
│  │ - detector.ts           │    │                                      │    │
│  │ - composer.ts           │    │                                      │    │
│  └─────────────────────────┘    └──────────────────────────────────────┘    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 8.2 Mudanças Necessárias por Arquivo

| Arquivo | Tipo de Mudança | Complexidade |
|---------|----------------|--------------|
| `packages/ai/src/skills/` (novo) | Criar diretório com definitions, detector, composer | Média |
| `context-builder.service.ts` | Injetar skill extensions no prompt | Baixa |
| `chat.service.ts` | Filtrar tools baseado em skills ativas | Baixa |
| `tool-loop.service.ts` | **NENHUMA** (recebe tools via config) | Zero |
| `packages/ai/src/schemas/tools/` | **NENHUMA** (schemas não mudam) | Zero |
| Tool executors | **NENHUMA** (routing por toolName continua) | Zero |
| `confirmation-state.service.ts` | **NENHUMA** (opera sobre tool calls) | Zero |

### 8.3 Retrocompatibilidade

A implementação é **100% retrocompatível**:

1. Se skill detection falhar → usa 'general' (todas as tools, como hoje)
2. Tool definitions não mudam → testes existentes continuam passando
3. Tool loop não muda → comportamento idêntico
4. Confirmation system não muda → fluxo de confirmação inalterado
5. Modo 'counselor' existente → mapeado para counselor skill automaticamente

---

## 9) Implementação Proposta

### 9.1 Estrutura de Arquivos

```
packages/ai/src/
├── skills/
│   ├── index.ts                    # Exports públicos
│   ├── skill.types.ts              # SkillDefinition, ToneConfig, etc.
│   ├── skill-detector.service.ts   # Detecção de skills por mensagem
│   ├── skill-composer.service.ts   # Composição de prompt + tools
│   ├── skill-state.ts              # ConversationSkillState (inércia)
│   └── definitions/
│       ├── index.ts                # Array com todas as skills
│       ├── finance.skill.ts
│       ├── health.skill.ts
│       ├── counselor.skill.ts
│       ├── relationships.skill.ts
│       ├── professional.skill.ts
│       └── general.skill.ts
├── schemas/tools/                  # (inalterado)
├── services/
│   └── tool-loop.service.ts        # (inalterado)
└── ports/
    └── llm.port.ts                 # (inalterado)
```

### 9.2 Pseudocódigo dos Componentes Principais

#### SkillDetector

```typescript
/**
 * Detecta skills relevantes baseado na mensagem do usuário e contexto.
 *
 * Estratégia em 2 camadas:
 * 1. Heurística: triggerPatterns com regex (zero-cost, <1ms)
 * 2. Inércia: derivar do histórico recente se nenhuma nova detectada
 *
 * @see Seção 15 para decisões de design
 */
export class SkillDetectorService {
  private readonly skills: SkillDefinition[];
  private readonly maxSimultaneousSkills = 2; // Decisão 15.3

  /**
   * Detecta skills para uma mensagem.
   *
   * @param message - Mensagem do usuário
   * @param recentUserMessages - Últimas N mensagens do usuário (para inércia)
   * @returns Skills ativas ordenadas por prioridade (máximo 2)
   */
  detect(
    message: string,
    recentUserMessages: string[] = []
  ): SkillDefinition[] {
    // Camada 1: Heurística na mensagem atual
    const candidates = this.matchTriggerPatterns(message);

    if (candidates.length > 0) {
      return this.sortByPriority(candidates)
        .slice(0, this.maxSimultaneousSkills);
    }

    // Camada 2: Inércia — derivar do histórico recente
    const contextCandidates = recentUserMessages
      .flatMap(msg => this.matchTriggerPatterns(msg));

    if (contextCandidates.length > 0) {
      return this.getMostFrequent(contextCandidates, this.maxSimultaneousSkills);
    }

    // Fallback: general
    return [this.skills.find(s => s.name === 'general')!];
  }

  /**
   * Matching com regex e word boundaries.
   * Também verifica excludePatterns para evitar falsos positivos.
   */
  private matchTriggerPatterns(message: string): SkillDefinition[] {
    return this.skills.filter(skill => {
      // Verificar se algum trigger dá match
      const hasMatch = skill.triggerPatterns.some(pattern => pattern.test(message));
      if (!hasMatch) return false;

      // Verificar exclusões (se definidas)
      if (skill.excludePatterns?.length) {
        const isExcluded = skill.excludePatterns.some(pattern => pattern.test(message));
        if (isExcluded) return false;
      }

      return true;
    });
  }

  private sortByPriority(skills: SkillDefinition[]): SkillDefinition[] {
    return [...skills].sort((a, b) => (a.priority ?? 5) - (b.priority ?? 5));
  }

  private getMostFrequent(skills: SkillDefinition[], limit: number): SkillDefinition[] {
    const counts = new Map<string, { skill: SkillDefinition; count: number }>();
    for (const skill of skills) {
      const existing = counts.get(skill.name);
      if (existing) {
        existing.count++;
      } else {
        counts.set(skill.name, { skill, count: 1 });
      }
    }
    return [...counts.values()]
      .sort((a, b) => b.count - a.count)
      .slice(0, limit)
      .map(entry => entry.skill);
  }
}
```

#### SkillComposer

```typescript
/**
 * Compõe o contexto final (prompt + tools + config) baseado nas skills ativas.
 *
 * @see Seção 15.5 para regras de combinação de ToneConfig
 */
export class SkillComposerService {
  private readonly allToolDefinitions: Map<string, ToolDefinition>;
  private readonly baseToolNames: string[] = ['search_knowledge', 'add_knowledge', 'analyze_context'];

  /**
   * Compõe o resultado de skills ativas.
   *
   * @returns Prompt extensions, tools filtradas, e config de LLM
   */
  compose(activeSkills: SkillDefinition[]): SkillComposition {
    // 1. Coletar tools (base + skills, sem duplicatas)
    const toolNames = new Set<string>(this.baseToolNames);
    for (const skill of activeSkills) {
      for (const toolName of skill.tools) {
        toolNames.add(toolName);
      }
    }

    // 2. Resolver tool definitions
    const tools: ToolDefinition[] = [...toolNames]
      .map(name => this.allToolDefinitions.get(name))
      .filter(Boolean) as ToolDefinition[];

    // 3. Compor prompt extension (concatenar, skill mais prioritária primeiro)
    const promptExtension = activeSkills
      .filter(s => s.promptExtension.length > 0)
      .map(s => s.promptExtension)
      .join('\n\n');

    // 4. Determinar temperature (menor = mais determinístico = prevalece)
    const temperatures = activeSkills
      .map(s => s.temperature)
      .filter((t): t is number => t !== undefined);
    const temperature = temperatures.length > 0
      ? Math.min(...temperatures)
      : undefined;

    // 5. Combinar tone configs (Decisão 15.5)
    const tone = this.combineTones(activeSkills.map(s => s.tone));

    return { tools, promptExtension, temperature, tone };
  }

  /**
   * Combina ToneConfig de múltiplas skills.
   * - style: skill dominante (primeira, já ordenada por priority)
   * - emojiLevel: mínimo (mais restritivo)
   * - responseLength: máximo (mais elaborado)
   * - formality: skill dominante
   *
   * @see Seção 15.5 - Decisão de Combinação de ToneConfig
   */
  private combineTones(tones: ToneConfig[]): ToneConfig | undefined {
    if (tones.length === 0) return undefined;
    if (tones.length === 1) return tones[0];

    const dominantTone = tones[0]!;

    // Mapeamentos para comparação
    const emojiLevels = { 'none': 0, 'minimal': 1, 'moderate': 2 };
    const responseLengths = { 'concise': 0, 'moderate': 1, 'elaborated': 2 };

    // Calcular mínimo de emojiLevel
    const minEmojiValue = Math.min(...tones.map(t => emojiLevels[t.emojiLevel]));
    const minEmojiLevel = Object.entries(emojiLevels)
      .find(([_, v]) => v === minEmojiValue)?.[0] as ToneConfig['emojiLevel'];

    // Calcular máximo de responseLength
    const maxLengthValue = Math.max(...tones.map(t => responseLengths[t.responseLength]));
    const maxResponseLength = Object.entries(responseLengths)
      .find(([_, v]) => v === maxLengthValue)?.[0] as ToneConfig['responseLength'];

    return {
      style: dominantTone.style,               // Dominante
      emojiLevel: minEmojiLevel,               // Mínimo
      responseLength: maxResponseLength,       // Máximo
      formality: dominantTone.formality,       // Dominante
    };
  }
}

interface SkillComposition {
  tools: ToolDefinition[];
  promptExtension: string;
  temperature?: number;
  tone?: ToneConfig;
}
```

### 9.3 Integração com ContextBuilderService

```typescript
// context-builder.service.ts — EVOLUÇÃO (não reescrita)

async buildSystemPrompt(
  userId: string,
  conversation: Conversation,
  activeSkills: SkillDefinition[] // NOVO parâmetro
): Promise<string> {
  const user = await this.getUserData(userId);
  const userMemory = await this.userMemoryService.getOrCreate(userId);
  const formattedMemory = this.userMemoryService.formatForPrompt(userMemory);

  // Base prompt (COMPACTO — sem instruções de tools específicas)
  const basePrompt = this.buildCompactBasePrompt(user, formattedMemory.text);

  // Compor skill extensions
  const composition = this.skillComposer.compose(activeSkills);

  // Injetar tone no prompt
  const toneInstruction = composition.tone
    ? this.buildToneInstruction(composition.tone)
    : '';

  return [basePrompt, toneInstruction, composition.promptExtension].join('\n\n');
}

private buildToneInstruction(tone: ToneConfig): string {
  const parts: string[] = ['## Tom de Comunicação'];

  if (tone.style === 'reflective') parts.push('- Seja reflexiva e pausada');
  if (tone.style === 'practical') parts.push('- Seja prática e direta');
  if (tone.style === 'empathetic') parts.push('- Seja empática e acolhedora');
  if (tone.style === 'hopeful') parts.push('- Seja esperançosa e encorajadora');
  if (tone.style === 'direct') parts.push('- Seja objetiva e orientada a ações');

  if (tone.emojiLevel === 'none') parts.push('- NÃO use emojis');
  if (tone.emojiLevel === 'minimal') parts.push('- Use emojis raramente');

  if (tone.responseLength === 'concise') parts.push('- Respostas curtas e diretas');
  if (tone.responseLength === 'elaborated') parts.push('- Pode elaborar e se aprofundar');

  return parts.join('\n');
}
```

### 9.4 Integração com ChatService

```typescript
// chat.service.ts — Mudança mínima no processStreamResponse

private async processStreamResponse(
  userId: string,
  conversationId: string,
  subject: Subject<MessageEvent>
): Promise<void> {
  const conversation = await this.getConversation(userId, conversationId);
  const recentMessages = await this.messageRepository.getRecentMessages(
    userId, conversationId, 20
  );

  // === NOVO: Detectar skills ===
  const lastUserMessage = recentMessages.findLast(m => m.role === 'user')?.content ?? '';

  // Coletar últimas N mensagens do usuário para inércia (derivada, não stored)
  const recentUserMessages = recentMessages
    .filter(m => m.role === 'user')
    .slice(-5)  // SKILL_CONTEXT_MESSAGES
    .map(m => m.content);

  const activeSkills = this.skillDetector.detect(
    lastUserMessage,
    recentUserMessages  // Inércia derivada do histórico
  );

  // Não há estado para atualizar — tudo é derivado

  // === EVOLUÍDO: buildSystemPrompt agora recebe skills ===
  const systemPrompt = await this.contextBuilder.buildSystemPrompt(
    userId, conversation, activeSkills
  );

  // === EVOLUÍDO: tools filtradas por skills ===
  const composition = this.skillComposer.compose(activeSkills);

  // ... (resto do fluxo idêntico ao atual)

  const toolLoopConfig: ToolLoopConfig = {
    tools: composition.tools,                    // ← FILTRADO (era: this.availableTools)
    executor: this.combinedExecutor,             // ← inalterado
    context: { userId, conversationId },         // ← inalterado
    systemPrompt,                                // ← agora com skill extensions
    maxIterations: 5,                            // ← inalterado
    temperature: composition.temperature,        // ← NOVO: per-skill
  };

  const result = await runToolLoop(this.llm, llmMessages, toolLoopConfig);
  // ... (resto idêntico)
}
```

---

## 10) Onde Agrega Valor (Resumo)

### 10.1 Benefícios Mensuráveis

| Benefício | Métrica | Impacto |
|-----------|---------|---------|
| **Economia de tokens** | Tokens fixos/request | -48% média |
| **Custo operacional** | $/1000 msgs | -40% a -50% |
| **Tool accuracy** | % tool calls corretas | ~90% → ~95% |
| **Latência** | ms por request | -15% a -25% (menos tokens = menos processamento) |
| **Escalabilidade** | Tools suportadas | De 15 → 50+ sem degradação |

### 10.2 Benefícios Qualitativos

| Benefício | Descrição |
|-----------|-----------|
| **Especialização** | Cada domínio tem instruções otimizadas (finanças ≠ counselor) |
| **Tom adaptativo** | Resposta reflexiva para emoções, direta para finanças |
| **Menos confusão** | LLM com 5-8 tools relevantes > 15-29 tools genéricas |
| **Extensibilidade** | Adicionar nova skill = 1 arquivo, zero mudança em infra |
| **Testabilidade** | Testar skill isoladamente (inputs → outputs esperados) |
| **Separação de responsabilidades** | Cada skill pode ter seus testes, exemplos, e docs |

### 10.3 Onde NÃO agrega valor

| Aspecto | Por que não melhora |
|---------|---------------------|
| **Tool loop** | Já funciona bem — skills não mudam a mecânica do loop |
| **Confirmation** | Sistema de confirmação é ortogonal a skills |
| **Memory** | User memory e knowledge items são transversais |
| **LLM abstraction** | LLMPort e adapters não são afetados |
| **Infraestrutura** | Redis, BullMQ, Supabase — nada muda |

---

## 11) Riscos e Mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|---------|-----------|
| Skill errada ativada | Média | Baixo | Fallback: base tools sempre disponíveis |
| Skill não ativada | Baixa | Médio | Inércia mantém skill anterior |
| Multi-skill conflitante | Baixa | Baixo | Priority ordering + menor temperature prevalece |
| Overhead de detecção | Muito Baixa | Zero | Heurística <1ms, 0 tokens |
| Skill com instruções ruins | Média | Médio | Testes unitários por skill |
| Migração quebra fluxo | Baixa | Alto | Feature flag + rollback |

---

## 12) Comparação com Claude Code

### 12.1 O que foi adaptado

| Claude Code | Life Assistant | Razão da adaptação |
|-------------|----------------|-------------------|
| Skills como arquivos `.md` | Skills como código TypeScript | SaaS, não CLI — config em runtime |
| `context: fork` (subagent) | Sempre no mesmo contexto | Conversa contínua 1:1, não tarefas paralelas |
| `allowed-tools` (restrição) | Tools por skill (extensão) | Base tools sempre disponíveis |
| `model` override por skill | `temperature` override | Trocar model é caro; temperature é suficiente |
| User invocation (`/skill`) | Auto-detection por trigger | Produto consumer, não developer |
| `disable-model-invocation` | Não implementado | Todas skills são sempre disponíveis |
| Hooks (PreToolUse/PostToolUse) | Não implementado | Confirmation system já cobre o caso de uso |

### 12.2 O que NÃO se aplica

| Claude Code Feature | Por que não se aplica |
|---------------------|----------------------|
| **Subagents** | Conversa 1:1 contínua, não tarefas paralelas |
| **Background agents** | BullMQ jobs já resolvem processamento async |
| **`!`command`` preprocessing** | Não há shell no contexto de um SaaS |
| **Enterprise/Personal hierarchy** | Single-user por instância, não multi-team |
| **Agent SDK programático** | O produto É o agente, não precisa SDK externo |
| **Filesystem-based config** | Código + DB, não dotfiles |

---

## 13) Referências

| Fonte | Link/Path | Uso neste documento |
|-------|-----------|---------------------|
| ADR-012 | `docs/adr/ADR-012-tool-use-memory-consolidation.md` | Decisão de remover LangChain |
| AI Spec | `docs/specs/ai.md` | System prompts, tool definitions, modes |
| Engineering Spec | `docs/specs/engineering.md` §8 | LLM abstraction, ports |
| ToolLoopService | `packages/ai/src/services/tool-loop.service.ts` | Mecânica do tool loop |
| ChatService | `apps/api/src/modules/chat/application/services/chat.service.ts` | Orquestração atual |
| ContextBuilder | `apps/api/src/modules/chat/application/services/context-builder.service.ts` | Build de system prompt |
| Tool Index | `packages/ai/src/schemas/tools/index.ts` | Definições de tools |
| Claude Code Skills | https://code.claude.com/docs/en/skills | Inspiração arquitetural |
| Claude Code Subagents | https://code.claude.com/docs/en/sub-agents | Análise comparativa |
| Phase 2 Milestones | `docs/milestones/phase-2-tracker.md` | Projeção de crescimento de tools |
| Phase 3 Milestones | `docs/milestones/phase-3-assistant.md` | Tools futuras planejadas |

---

## 15) Decisões de Design

> **Contexto:** Durante a análise desta proposta, foram identificadas decisões de design que precisavam de definição. As decisões abaixo foram tomadas com base em pesquisa de padrões da indústria (2025-2026).

### 15.1 Confirmação Pendente + Mudança de Skill

**Decisão:** Durante confirmação pendente, **bloquear detecção de skills**.

**Padrão da indústria:** O LangGraph implementa o padrão `interrupt()` que bloqueia transições de estado até receber input humano.

```python
# LangGraph - Human-in-the-loop pattern
def approval_node(state):
    approval = interrupt(value={"question": "Approve?"})
    # Workflow PARA até receber resposta
```

**Justificativa:** O sistema de confirmação (ADR-015) já usa este padrão implicitamente. Durante uma confirmação pendente, a skill que gerou a tool call permanece ativa até confirmação/rejeição.

**Fontes:**
- [LangGraph Documentation](https://langchain-ai.github.io/langgraph/)
- [State Machine Based Human-Bot Conversation](https://pmc.ncbi.nlm.nih.gov/articles/PMC7266438/)

---

### 15.2 Falsos Positivos em Triggers

**Decisão:** Usar **regex com word boundaries** + **lista de exclusões**.

**Padrão da indústria:** Abordagem híbrida combina pattern matching rápido com regras de exclusão.

> *"Modern approaches use hybrid systems that combine quick pattern matching with embedding-based classification. If pattern matching has confidence > 0.9, it returns that result."* — [Label Your Data](https://labelyourdata.com/articles/machine-learning/intent-classification)

**Implementação:**

```typescript
// Antes (falso positivo: "gastei tempo pensando")
triggerPatterns: ['gast', ...]

// Depois (word boundary evita falsos positivos)
triggerPatterns: [/\bgast(o|ei|ou)\b/i, ...],
excludePatterns: [/\bgast(o|ar)\s+(tempo|energia)/i, ...]
```

**Casos de exclusão implementados:**
| Padrão | Exclusão | Motivo |
|--------|----------|--------|
| `gast*` | `gastei tempo/energia` | Não é contexto financeiro |
| `conta*` | `contou/contando/contava` | Verbo "contar história" |
| `renda*` | `renda-se` | Verbo "render-se" |

**Fontes:**
- [Intent Classification 2025](https://labelyourdata.com/articles/machine-learning/intent-classification)
- [Rasa NLU - Intent Classification](https://rasa.com/blog/rasa-nlu-in-depth-part-1-intent-classification/)

---

### 15.3 Limite de Skills Simultâneas

**Decisão:** Máximo **2 skills** simultâneas (dominante + secundária).

**Padrão da indústria:** Frameworks recomendam começar simples e evitar complexidade prematura.

> *"Start simple: Do not build a nested loop system on day one. Start with a sequential chain, debug it, and then add complexity."* — [Google ADK](https://developers.googleblog.com/developers-guide-to-multi-agent-patterns-in-adk/)

> *"An alternative approach is splitting large agents into smaller, specialized ones."* — [IBM](https://www.ibm.com/think/tutorials/llm-agent-orchestration-with-langchain-and-granite)

**Justificativa:**
| Limite | Prós | Contras |
|--------|------|---------|
| 1 skill | Simples | Perde contexto cruzado |
| **2 skills** | Equilíbrio, cobre 90% casos | Alguma complexidade |
| 3+ skills | Flexível | Prompt explosion, difícil debug |

**Fontes:**
- [Google ADK Multi-agent Patterns](https://developers.googleblog.com/developers-guide-to-multi-agent-patterns-in-adk/)
- [IBM LLM Agent Orchestration](https://www.ibm.com/think/tutorials/llm-agent-orchestration-with-langchain-and-granite)
- [OpenAI Agents SDK](https://openai.github.io/openai-agents-python/multi_agent/)

---

### 15.4 Storage de ConversationSkillState

**Decisão:** **Derivar do histórico** (últimas 5 mensagens do usuário), não armazenar.

**Padrão da indústria:** Tendência é stateless com derivação para simplicidade.

> *"If you're skimming: stateless is simpler but forgets everything; stateful remembers but costs you in complexity."* — [Tacnode](https://tacnode.io/post/stateful-vs-stateless-ai-agents-practical-architecture-guide-for-developers)

> *"Most 'chatbots with memory' are actually stateful agents under the hood. The server stores past messages and feeds them back into an otherwise stateless model."*

**Comparação:**
| Aspecto | Redis (stored) | Histórico (derived) |
|---------|----------------|---------------------|
| Latência | +1 RTT | Zero adicional |
| Consistência | Pode dessincronizar | Sempre correto |
| Complexidade | TTL, invalidação | Cálculo simples |
| Debug | Inspecionar Redis | Ver mensagens |

**Implementação:**
```typescript
const recentUserMessages = messages
  .filter(m => m.role === 'user')
  .slice(-5)
  .map(m => m.content);

const activeSkills = detector.detect(lastMessage, recentUserMessages);
```

**Fontes:**
- [Tacnode - Stateless vs Stateful Agents](https://tacnode.io/post/stateful-vs-stateless-ai-agents-practical-architecture-guide-for-developers)
- [LangGraph & Redis](https://redis.io/blog/langgraph-redis-build-smarter-ai-agents-with-memory-persistence/)
- [Temporal - Persistent Chatbot](https://temporal.io/blog/building-a-persistent-conversational-ai-chatbot-with-temporal)

---

### 15.5 Combinação de ToneConfig

**Decisão:** Skill dominante (menor priority) define **style**. Outros atributos usam regras de merge.

**Padrão da indústria:** Layered prompting com hierarquia clara.

> *"Layered prompting blends role framing, structured reasoning, and format constraints into a single instruction set. This reduces ambiguity."* — [Garrett Landers](https://garrettlanders.com/prompt-engineering-guide-2025/)

> *"Overemphasis on style or tone can occasionally lead to incorrect or vague responses."* — [Latitude](https://latitude-blog.ghost.io/blog/10-examples-of-tone-adjusted-prompts-for-llms/)

**Regras de merge:**
| Atributo | Regra | Exemplo |
|----------|-------|---------|
| `style` | Skill dominante | counselor (reflective) + finance → reflective |
| `emojiLevel` | Mínimo | moderate + none → none |
| `responseLength` | Máximo | concise + elaborated → elaborated |
| `formality` | Dominante | informal + careful-informal → careful-informal |

**Fontes:**
- [Learn Prompting - Role Prompting](https://learnprompting.org/docs/advanced/zero_shot/role_prompting)
- [Brim Labs - LLM Personas](https://brimlabs.ai/blog/llm-personas-how-system-prompts-influence-style-tone-and-intent/)

---

### 15.6 Skill Detection para Continuações

**Decisão:** **Inércia derivada** — se nenhuma skill detectada na mensagem atual, buscar nas últimas 3 mensagens do usuário.

**Padrão da indústria:** Context carryover com `last_active_agent`.

```python
# LangGraph - Multi-agent com inércia
class MultiAgentState(MessagesState):
    last_active_agent: str  # Mantém contexto

def human_node(state):
    user_input = interrupt("Ready")
    active_agent = state["last_active_agent"]  # Inércia
    return Command(goto=active_agent)
```

**Cenário:**
```
1. Usuário: "Quanto gastei esse mês?" → finance
2. IA: "Você gastou R$ 2.500. Quer ver o breakdown?"
3. Usuário: "sim" → Nenhum trigger, usa inércia → finance
```

**Fontes:**
- [LangGraph Documentation](https://langchain-ai.github.io/langgraph/)
- [CHI 2025 - Proactive Conversational Agents](https://dl.acm.org/doi/10.1145/3706598.3713760)
- [Master of Code - Conversational AI Trends](https://masterofcode.com/blog/conversational-ai-trends)

---

### Resumo das Decisões

| # | Decisão | Escolha | Padrão Base |
|---|---------|---------|-------------|
| 1 | Confirmação + skill | Bloquear | LangGraph interrupt |
| 2 | Falsos positivos | Regex + exclusões | Hybrid NLU |
| 3 | Limite skills | Máximo 2 | Google ADK |
| 4 | Storage state | Derivar histórico | Stateless pattern |
| 5 | Combinação tone | Dominante + merge | Layered prompting |
| 6 | Continuações | Inércia derivada | last_active_agent |
