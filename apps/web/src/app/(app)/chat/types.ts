/**
 * Chat types for frontend
 *
 * @see apps/api/src/modules/chat/presentation/dtos for API DTOs
 */

export interface Conversation {
  id: string;
  userId: string;
  title?: string;
  type: 'general' | 'counselor';
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface ConversationListResponse {
  conversations: Conversation[];
  total: number;
}

export interface MessageListResponse {
  messages: Message[];
  total: number;
}

export interface SendMessageResponse {
  userMessage: Message;
  streamUrl: string;
}

export interface StreamChunk {
  content: string;
  done: boolean;
  error?: string;
}

export type ConversationType = 'general' | 'counselor';
