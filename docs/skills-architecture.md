# Skills Architecture — Life Assistant AI

> **Documento de estudo e proposta arquitetural.**
> Define como a IA pode evoluir de um assistente monolítico para um sistema de skills especializadas por domínio.
>
> **Status:** Proposta (não implementado)
> **Inspiração:** Claude Code Skills System + Claude Code Subagents
> **Referência atual:** `docs/specs/ai.md`, `docs/specs/engineering.md` §8, `ADR-012`

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
   * Palavras-chave para detecção rápida (heurística, zero-cost).
   * Se qualquer pattern for encontrado na mensagem, a skill é candidata.
   * Matching é case-insensitive e usa includes().
   */
  triggerPatterns: string[];

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
   * Preferência do usuário necessária para ativar esta skill.
   * Ex: 'christian_perspective' — só ativa se o usuário habilitou nas settings.
   * undefined = sempre disponível.
   */
  requiresUserPreference?: string;

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
    'gast', 'conta', 'dívida', 'divida', 'salário', 'salario',
    'invest', 'orçamento', 'orcamento', 'pagu', 'paguei',
    'boleto', 'parcela', 'finance', 'dinheiro', 'real', 'reais',
    'cartão', 'cartao', 'fatura', 'débito', 'credito',
    'economiz', 'poupar', 'poupança', 'renda',
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
    'peso', 'exerc', 'acade', 'musculação', 'treino', 'trein',
    'sono', 'dormi', 'dormir', 'insônia',
    'água', 'agua', 'litro',
    'humor', 'energia', 'cansad', 'dispost',
    'dieta', 'aliment', 'comer', 'comida',
    'saúde', 'saude', 'médic', 'medic',
    'caminh', 'corr', 'yoga', 'alongamento',
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
    'conselho', 'não sei o que fazer', 'nao sei o que fazer',
    'preciso desabafar', 'desabaf',
    'confus', 'indecis', 'dilema',
    'ansied', 'ansios', 'preocupad',
    'trist', 'chorand', 'deprimid',
    'decid', 'decisão', 'decisao',
    'conflito', 'briga', 'discuss',
    'frustr', 'raiva', 'irritad',
    'medo', 'insegur', 'incert',
    'sozinho', 'solidão', 'solidao',
    'me ajuda a pensar', 'o que você acha',
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
    'namor', 'namorad', 'casament', 'esposa', 'esposo', 'marid',
    'família', 'familia', 'pai', 'mãe', 'mae', 'irmã', 'irma',
    'amig', 'amizade', 'colega',
    'relacion', 'término', 'termino', 'separaç',
    'filho', 'filha', 'criança',
    'sogr', 'cunhad', 'parente',
    'chefe', 'gestor',
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
    'trabalh', 'emprego', 'carreira',
    'promoção', 'promoc', 'demiss',
    'projeto', 'prazo', 'deadline',
    'reunião', 'reuniao', 'apresent',
    'curriculo', 'currículo', 'entrevista',
    'salário', 'salario', 'aumento',
    'chefe', 'gestor', 'equipe', 'time',
    'produtiv', 'foco', 'procrastin',
    'freelanc', 'negócio', 'negocio', 'empreend',
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

#### Spiritual Skill

```typescript
const spiritualSkill: SkillDefinition = {
  name: 'spiritual',
  description: 'Domínio espiritual: fé, oração, gratidão, propósito, valores, igreja, comunidade de fé e perspectiva cristã.',
  triggerPatterns: [
    'oraç', 'orar', 'deus', 'jesus', 'bíblia', 'biblia',
    'igreja', 'culto', 'fé',
    'gratidão', 'gratidao', 'agradeç',
    'propósito', 'proposito', 'sentido da vida',
    'espiritual', 'alma', 'paz interior',
    'versículo', 'versiculo', 'salmo',
  ],
  tools: [
    // Usa apenas base tools
  ],
  promptExtension: `## Skill: Espiritual
- Integre princípios e valores cristãos naturalmente
- Referencie versículos bíblicos quando relevante e apropriado
- Encoraje práticas espirituais (oração, gratidão, meditação bíblica)
- Conecte desafios com perspectiva de fé
- Tom esperançoso e encorajador
- NÃO force referências religiosas
- NÃO seja pregador ou moralizante
- Equilibre fé com ação prática`,
  tone: {
    style: 'hopeful',
    emojiLevel: 'minimal',
    responseLength: 'moderate',
    formality: 'careful-informal',
  },
  temperature: 0.6,
  requiresUserPreference: 'christian_perspective', // Só se o usuário ativou
  priority: 5,
};
```

#### General Skill (fallback)

```typescript
const generalSkill: SkillDefinition = {
  name: 'general',
  description: 'Fallback para conversas casuais, saudações, perguntas gerais ou tópicos que não se encaixam em nenhuma skill específica.',
  triggerPatterns: [], // Nunca ativada por trigger — é o fallback
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

```typescript
/**
 * Quando uma skill está ativa na conversa, ela permanece ativa
 * até que outra skill seja detectada ou a conversa mude de assunto.
 *
 * Isso evita "flickering" entre skills em conversas longas sobre um tema.
 */
interface ConversationSkillState {
  activeSkills: string[];      // Skills atualmente ativas
  lastDetectedAt: number;      // Timestamp da última detecção
  messagesSinceDetection: number; // Mensagens desde última ativação
}

// Regra de inércia:
// - Skill permanece ativa por até 5 mensagens sem re-detecção
// - Se nova skill é detectada, substitui ou combina
// - Se nenhuma skill detectada por 5 msgs, volta para 'general'
const SKILL_INERTIA_MESSAGES = 5;
```

### 5.4 Multi-Skill Activation

O sistema permite múltiplas skills ativas simultaneamente. Isso é o diferencial principal:

**Exemplo real — Stress financeiro:**
```
Usuário: "Estou perdendo o sono porque não consigo pagar as parcelas"
```

Detecção:
1. "sono" → triggers `health`
2. "pagar", "parcelas" → triggers `finance`
3. "perdendo o sono" + contexto emocional → `counselor` (via inércia ou padrão)

Skills ativas: `[counselor, finance, health]` (ordenadas por priority)

**Composição do prompt:**
```
[Base Prompt - ~1.500 tokens]
[Counselor Extension - ~350 tokens]
[Finance Extension - ~300 tokens]
[Health Extension - ~300 tokens]
[User Memory - ~500-800 tokens]

Tools disponíveis: base (3) + finance (5) + health (4) = 12 tools (~5.500 tokens)
```

**Total: ~8.000 tokens** (vs ~10.000 atuais com TODAS as tools)

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
│       ├── spiritual.skill.ts
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
 * 1. Heurística: triggerPatterns (zero-cost, <1ms)
 * 2. Inércia: manter skill da conversa se nenhuma nova detectada
 */
export class SkillDetectorService {
  private readonly skills: SkillDefinition[];

  /**
   * Detecta skills para uma mensagem.
   *
   * @param message - Mensagem do usuário
   * @param conversationState - Estado atual de skills da conversa (inércia)
   * @param userPreferences - Preferências do usuário (ex: christian_perspective)
   * @returns Skills ativas ordenadas por prioridade
   */
  detect(
    message: string,
    conversationState?: ConversationSkillState,
    userPreferences?: Record<string, boolean>
  ): SkillDefinition[] {
    // Camada 1: Heurística
    const candidates = this.matchTriggerPatterns(message);

    // Filtrar por preferências do usuário
    const filtered = candidates.filter(skill =>
      !skill.requiresUserPreference ||
      userPreferences?.[skill.requiresUserPreference]
    );

    // Se encontrou matches: usar
    if (filtered.length > 0) {
      return this.sortByPriority(filtered);
    }

    // Camada 2: Inércia (manter skill anterior se < 5 mensagens)
    if (conversationState && conversationState.messagesSinceDetection < SKILL_INERTIA_MESSAGES) {
      return conversationState.activeSkills
        .map(name => this.skills.find(s => s.name === name))
        .filter(Boolean) as SkillDefinition[];
    }

    // Fallback: general
    return [this.skills.find(s => s.name === 'general')!];
  }

  private matchTriggerPatterns(message: string): SkillDefinition[] {
    const lowerMessage = message.toLowerCase();
    return this.skills.filter(skill =>
      skill.triggerPatterns.some(pattern => lowerMessage.includes(pattern))
    );
  }

  private sortByPriority(skills: SkillDefinition[]): SkillDefinition[] {
    return [...skills].sort((a, b) => (a.priority ?? 5) - (b.priority ?? 5));
  }
}
```

#### SkillComposer

```typescript
/**
 * Compõe o contexto final (prompt + tools + config) baseado nas skills ativas.
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

    // 5. Determinar tone (skill com menor priority number domina)
    const dominantSkill = activeSkills[0]; // Já ordenadas por priority
    const tone = dominantSkill?.tone;

    return { tools, promptExtension, temperature, tone };
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
  const conversationSkillState = await this.getConversationSkillState(conversationId);
  const userPreferences = await this.getUserPreferences(userId);

  const activeSkills = this.skillDetector.detect(
    lastUserMessage,
    conversationSkillState,
    userPreferences
  );

  // Atualizar estado de skills da conversa
  await this.updateConversationSkillState(conversationId, activeSkills);

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
| `disable-model-invocation` | `requiresUserPreference` | Mesmo conceito, naming diferente |
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

## 13) Plano de Migração

### 13.1 Fases

**Fase 0: Preparação (sem mudança funcional)**
- Criar estrutura `packages/ai/src/skills/`
- Definir tipos (`SkillDefinition`, `ToneConfig`, `ConversationSkillState`)
- Implementar `SkillDetectorService` e `SkillComposerService`
- Testes unitários para detecção e composição
- Feature flag: `SKILLS_ENABLED=false`

**Fase 1: Refactor do Base Prompt**
- Extrair instruções tool-specific do `buildBasePrompt()` para skill definitions
- Reduzir base prompt para instruções universais (~800 tokens)
- Manter backward compat: quando skills desabilitado, usa prompt monolítico

**Fase 2: Integração com ChatService**
- Adicionar detecção de skills no `processStreamResponse()`
- Filtrar tools baseado em skills ativas
- Injetar temperature por skill
- Feature flag: `SKILLS_ENABLED=true` para A/B test

**Fase 3: Mapping de Conversation.type**
- Migrar `type: 'counselor'` para skill detection automática
- Remover switch no `ContextBuilderService`
- Deprecar `type` field (manter para backward compat)

**Fase 4: Observabilidade**
- Logar skills ativas por request (Sentry breadcrumbs)
- Dashboard de distribuição de skills
- Alertar quando skill accuracy cair (via tool call success rate)

### 13.2 Feature Flag

```typescript
// .env
SKILLS_ENABLED=false  // Fase 0-1
SKILLS_ENABLED=true   // Fase 2+

// chat.service.ts
const activeSkills = this.config.get('SKILLS_ENABLED')
  ? this.skillDetector.detect(lastUserMessage, ...)
  : [this.allSkillsFallback]; // Simula comportamento atual (todas as tools)
```

---

## 14) Referências

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
