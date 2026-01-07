// @life-assistant/ai
// Core de IA compartilhado - LLM Abstraction
// Implementacao completa no milestone M1.1

export const AI_VERSION = '0.1.0';

/**
 * Interface LLMPort - Abstrai provedores de LLM
 * Referencia: ENGINEERING.md §8.2
 */
export interface LLMPort {
  chat(params: ChatParams): Promise<ChatResponse>;
  stream(params: ChatParams): AsyncIterable<StreamChunk>;
  getInfo(): ProviderInfo;
}

export interface ChatParams {
  messages: Message[];
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatResponse {
  content: string;
  usage: { inputTokens: number; outputTokens: number };
  finishReason: 'stop' | 'length' | 'tool_calls';
}

export interface StreamChunk {
  content: string;
  done: boolean;
}

export interface ProviderInfo {
  name: string;
  model: string;
  version: string;
}
