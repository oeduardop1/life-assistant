# Gemini (Google AI) Integration

> LLM provider for AI conversations and tool use.

---

## Overview

| Aspecto | Valor |
|---------|-------|
| **Propósito** | LLM para conversação e function calling |
| **SDK** | @google/genai (unified) |
| **Model** | Gemini Flash (padrão) |

---

## Capabilities

| Feature | Status |
|---------|--------|
| Chat | ✅ Ativo |
| Streaming | ✅ Ativo |
| Function Calling | ✅ Ativo |
| Vision | ✅ Ativo |
| Audio transcription | 🟡 Via Whisper/alternativo |

---

## LLM Abstraction

O sistema usa uma interface abstrata `LLMPort`:

```typescript
interface LLMPort {
  chat(messages: Message[]): Promise<ChatResponse>;
  chatWithTools(messages: Message[], tools: ToolDefinition[]): Promise<ChatWithToolsResponse>;
  stream(messages: Message[]): AsyncIterable<StreamChunk>;
  streamWithTools(messages: Message[], tools: ToolDefinition[]): AsyncIterable<StreamChunk>;
}
```

---

## Adapter Implementation

```typescript
class GeminiAdapter implements LLMPort {
  private client: GoogleGenAI;

  constructor() {
    this.client = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
    });
  }

  async chatWithTools(messages, tools) {
    const model = this.client.getGenerativeModel({
      model: process.env.GEMINI_MODEL || 'gemini-flash',
      tools: this.convertTools(tools),
    });

    const result = await model.generateContent({
      contents: this.convertMessages(messages),
    });

    return this.parseResponse(result);
  }
}
```

---

## Tool Use

Tools são definidas com Zod schemas:

```typescript
const tools: ToolDefinition[] = [
  {
    name: 'record_metric',
    description: 'Registrar métrica de tracking',
    parameters: z.object({
      type: z.enum(['weight', 'water', 'mood']),
      value: z.number(),
    }),
    requiresConfirmation: true,
  },
];
```

---

## Provider Switching

Para trocar de provider, apenas altere as variáveis de ambiente:

```bash
# Gemini (padrão)
LLM_PROVIDER=gemini
GEMINI_API_KEY=xxx
GEMINI_MODEL=gemini-flash

# Claude (alternativo)
LLM_PROVIDER=claude
ANTHROPIC_API_KEY=xxx
CLAUDE_MODEL=claude-sonnet
```

---

## Migration Plan (Gemini -> Claude)

**Phase 1: Preparation**
- Garantir abstracao `LLMPort` completa
- Testes de integracao com multiplos providers
- Documentar diferencas de API e comportamento

**Phase 2: Dual-Provider**
- Implementar `ClaudeAdapter`
- A/B test com % pequeno de usuarios
- Comparar qualidade, latencia, custo

**Phase 3: Migration**
- Trocar `LLM_PROVIDER=claude`
- Monitorar metricas de qualidade
- Rollback automatico se houver degradacao

**Why this works**
- Troca de provider sem refatoracao
- Fallback automatico quando provider falha
- Otimizacao de custo por tarefa

---

## Rate Limits & Costs

| Aspecto | Valor |
|---------|-------|
| Rate limit | 60 RPM (free tier) |
| Max tokens | 8192 output |
| Cost optimization | Use flash para tarefas simples |

---

## Rate Limiter

```typescript
import { RateLimiter } from 'limiter';

class AIRateLimiter {
  private requestLimiter: RateLimiter;
  private tokenLimiter: RateLimiter;

  constructor() {
    this.requestLimiter = new RateLimiter({
      tokensPerInterval: 60, // 60 RPM
      interval: 'minute',
    });

    this.tokenLimiter = new RateLimiter({
      tokensPerInterval: 100000, // 100k tokens/min
      interval: 'minute',
    });
  }

  async waitForRequest(): Promise<void> {
    await this.requestLimiter.removeTokens(1);
  }

  async waitForTokens(count: number): Promise<void> {
    await this.tokenLimiter.removeTokens(count);
  }
}

const rateLimiter = new AIRateLimiter();

// Uso no adapter
async function chat(messages: ChatMessage[]): Promise<ChatResponse> {
  await rateLimiter.waitForRequest();

  try {
    return await geminiClient.generateContent(messages);
  } catch (error) {
    if (error.code === 429) {
      // Rate limited - wait and retry
      await sleep(60000);
      return chat(messages);
    }
    throw error;
  }
}
```

---

## Fallback Strategy

```typescript
interface AIProvider {
  name: string;
  priority: number;
  adapter: LLMAdapter;
  isAvailable: () => Promise<boolean>;
}

const providers: AIProvider[] = [
  {
    name: 'gemini',
    priority: 1,
    adapter: new GeminiAdapter(),
    isAvailable: async () => !!process.env.GEMINI_API_KEY,
  },
  {
    name: 'claude',
    priority: 2,
    adapter: new ClaudeAdapter(),
    isAvailable: async () => !!process.env.ANTHROPIC_API_KEY,
  },
  {
    name: 'openai',
    priority: 3,
    adapter: new OpenAIAdapter(),
    isAvailable: async () => !!process.env.OPENAI_API_KEY,
  },
];

async function getAvailableProvider(): Promise<LLMAdapter> {
  const sortedProviders = providers.sort((a, b) => a.priority - b.priority);

  for (const provider of sortedProviders) {
    if (await provider.isAvailable()) {
      return provider.adapter;
    }
  }

  throw new Error('No AI provider available');
}

async function chatWithFallback(
  messages: ChatMessage[],
  options?: ChatOptions
): Promise<ChatResponse> {
  const failedProviders: string[] = [];

  for (const provider of providers.sort((a, b) => a.priority - b.priority)) {
    if (!await provider.isAvailable()) continue;

    try {
      console.log(`Trying AI provider: ${provider.name}`);
      return await provider.adapter.chat(messages, options);
    } catch (error) {
      console.error(`Provider ${provider.name} failed:`, error.message);
      failedProviders.push(provider.name);

      // Se rate limited, não tentar próximo provider ainda
      if (error.code === 429) {
        await sleep(1000);
      }
    }
  }

  throw new Error(`All AI providers failed: ${failedProviders.join(', ')}`);
}
```

---

## Provider Strategy Pattern

```typescript
// Interface comum para todos os providers (ADR-012)
interface LLMPort {
  chat(messages: ChatMessage[], options?: ChatOptions): Promise<ChatResponse>;
  chatWithTools(messages: ChatMessage[], tools: ToolDefinition[], options?: ChatOptions): Promise<ChatWithToolsResponse>;
  stream(messages: ChatMessage[], options?: ChatOptions): AsyncIterable<StreamChunk>;
  streamWithTools(messages: ChatMessage[], tools: ToolDefinition[], options?: ChatOptions): AsyncIterable<StreamChunk>;
  analyzeImage?(imageBuffer: Buffer, prompt: string, mimeType?: string): Promise<string>;
  transcribeAudio?(audioBuffer: Buffer, mimeType?: string): Promise<string>;
}

// Factory
function createLLMAdapter(provider: string): LLMPort {
  switch (provider) {
    case 'gemini':
      return new GeminiAdapter();
    case 'claude':
      return new ClaudeAdapter();
    case 'openai':
      return new OpenAIAdapter();
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

// Singleton com provider configurado
const llmAdapter = createLLMAdapter(process.env.LLM_PROVIDER || 'gemini');
export { llmAdapter };
```

---

## Tool Use Examples (Provider-specific)

### Why examples matter

- Aumenta a precisao do tool selection
- Reduz ambiguidade de parametros
- Ajuda a manter consistencia entre providers

### Best practices

- Use exemplos reais e curtos
- Cubra casos comuns e edge cases
- Evite exemplos redundantes

> **Referência:** Anthropic "Advanced Tool Use" — accuracy 72% → 90%

### Gemini Workaround

Gemini não suporta `input_examples` nativamente. Enriquecer description:

```typescript
private enrichDescriptionWithExamples(
  description: string,
  examples?: Record<string, unknown>[]
): string {
  if (!examples?.length) return description;

  const examplesText = examples
    .map((ex, i) => `Example ${i + 1}: ${JSON.stringify(ex)}`)
    .join('\n');

  return `${description}\n\nUsage examples:\n${examplesText}`;
}
```

### Claude Native Support

```typescript
// ClaudeAdapter
const response = await client.messages.create({
  model: "claude-sonnet-4-5",
  betas: ["advanced-tool-use-2025-11-20"],
  tools: tools.map(t => ({
    name: t.name,
    description: t.description,
    input_schema: zodToJsonSchema(t.parameters),
    input_examples: t.inputExamples,  // Native support
  })),
  messages,
});
```

---

## Configuration

```bash
# Primary provider
LLM_PROVIDER=gemini
GEMINI_API_KEY=xxx
GEMINI_MODEL=gemini-flash

# Fallback providers
ANTHROPIC_API_KEY=xxx    # Optional
OPENAI_API_KEY=xxx       # Optional
```

---

## Definition of Done

- [ ] Chat funciona com streaming
- [ ] Function calling (Tool Use) funciona
- [ ] Tool loop (max 5 iterações)
- [ ] inputExamples processados (description enrichment)
- [ ] Rate limiter implementado
- [ ] Fallback para Claude funciona
- [ ] Fallback para OpenAI funciona
- [ ] Provider strategy pattern implementado
- [ ] Análise de imagem funciona
- [ ] Transcrição de áudio funciona (Gemini 2.0)

---

*Última atualização: 26 Janeiro 2026*
