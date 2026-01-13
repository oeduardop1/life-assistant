import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { firstValueFrom, take, toArray } from 'rxjs';

// Mock the AI package
vi.mock('@life-assistant/ai', () => ({
  createLLMFromEnv: vi.fn(),
}));

import { ChatService } from '../../../../src/modules/chat/application/services/chat.service.js';
import { createLLMFromEnv } from '@life-assistant/ai';

/**
 * Create a mock conversation for testing
 */
function createMockConversation(
  overrides: Partial<{
    id: string;
    userId: string;
    type: string;
    title: string | null;
    metadata: unknown;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
  }> = {}
) {
  return {
    id: 'conv-123',
    userId: 'user-123',
    type: 'general',
    title: null,
    metadata: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    deletedAt: null,
    ...overrides,
  };
}

/**
 * Create a mock message for testing
 */
function createMockMessage(
  overrides: Partial<{
    id: string;
    conversationId: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    metadata: unknown;
    createdAt: Date;
  }> = {}
) {
  return {
    id: 'msg-123',
    conversationId: 'conv-123',
    role: 'user' as const,
    content: 'Hello',
    metadata: null,
    createdAt: new Date('2024-01-01'),
    ...overrides,
  };
}

describe('ChatService', () => {
  let chatService: ChatService;
  let mockConversationRepository: {
    create: ReturnType<typeof vi.fn>;
    findById: ReturnType<typeof vi.fn>;
    findAllByUserId: ReturnType<typeof vi.fn>;
    countByUserId: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    softDelete: ReturnType<typeof vi.fn>;
  };
  let mockMessageRepository: {
    create: ReturnType<typeof vi.fn>;
    findByConversationId: ReturnType<typeof vi.fn>;
    countByConversationId: ReturnType<typeof vi.fn>;
    getRecentMessages: ReturnType<typeof vi.fn>;
  };
  let mockContextBuilder: {
    buildSystemPrompt: ReturnType<typeof vi.fn>;
  };
  let mockLLM: {
    stream: ReturnType<typeof vi.fn>;
    generateText: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Create mock repositories
    mockConversationRepository = {
      create: vi.fn(),
      findById: vi.fn(),
      findAllByUserId: vi.fn(),
      countByUserId: vi.fn(),
      update: vi.fn(),
      softDelete: vi.fn(),
    };

    mockMessageRepository = {
      create: vi.fn(),
      findByConversationId: vi.fn(),
      countByConversationId: vi.fn(),
      getRecentMessages: vi.fn(),
    };

    mockContextBuilder = {
      buildSystemPrompt: vi.fn(),
    };

    // Create mock LLM
    mockLLM = {
      stream: vi.fn(),
      generateText: vi.fn(),
    };

    vi.mocked(createLLMFromEnv).mockReturnValue(mockLLM as unknown as ReturnType<typeof createLLMFromEnv>);

    // Create service instance with mocks
    // Constructor order: contextBuilder, conversationRepository, messageRepository
    chatService = new ChatService(
      mockContextBuilder as unknown as ConstructorParameters<typeof ChatService>[0],
      mockConversationRepository as unknown as ConstructorParameters<typeof ChatService>[1],
      mockMessageRepository as unknown as ConstructorParameters<typeof ChatService>[2]
    );
  });

  describe('createConversation', () => {
    it('should_create_conversation_with_default_type', async () => {
      const mockConversation = createMockConversation();
      mockConversationRepository.create.mockResolvedValue(mockConversation);

      const result = await chatService.createConversation('user-123', {});

      expect(result).toEqual(mockConversation);
      expect(mockConversationRepository.create).toHaveBeenCalledWith(
        'user-123',
        expect.objectContaining({ type: 'general' })
      );
    });

    it('should_create_conversation_with_title', async () => {
      const mockConversation = createMockConversation({ title: 'My Conversation' });
      mockConversationRepository.create.mockResolvedValue(mockConversation);

      const result = await chatService.createConversation('user-123', {
        title: 'My Conversation',
      });

      expect(result.title).toBe('My Conversation');
    });

    it('should_create_counselor_conversation', async () => {
      const mockConversation = createMockConversation({ type: 'counselor' });
      mockConversationRepository.create.mockResolvedValue(mockConversation);

      const result = await chatService.createConversation('user-123', {
        type: 'counselor',
      });

      expect(result.type).toBe('counselor');
    });
  });

  describe('getConversation', () => {
    it('should_return_conversation_when_found', async () => {
      const mockConversation = createMockConversation();
      mockConversationRepository.findById.mockResolvedValue(mockConversation);

      const result = await chatService.getConversation('user-123', 'conv-123');

      expect(result).toEqual(mockConversation);
    });

    it('should_throw_not_found_when_conversation_not_exists', async () => {
      mockConversationRepository.findById.mockResolvedValue(null);

      await expect(
        chatService.getConversation('user-123', 'nonexistent')
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('listConversations', () => {
    it('should_return_conversations_with_pagination', async () => {
      const mockConversations = [
        createMockConversation({ id: 'conv-1' }),
        createMockConversation({ id: 'conv-2' }),
      ];
      mockConversationRepository.findAllByUserId.mockResolvedValue(mockConversations);
      mockConversationRepository.countByUserId.mockResolvedValue(2);

      const result = await chatService.listConversations('user-123', {
        limit: 10,
        offset: 0,
      });

      expect(result.conversations).toEqual(mockConversations);
      expect(result.total).toBe(2);
    });
  });

  describe('deleteConversation', () => {
    it('should_soft_delete_conversation', async () => {
      mockConversationRepository.softDelete.mockResolvedValue(true);

      await chatService.deleteConversation('user-123', 'conv-123');

      expect(mockConversationRepository.softDelete).toHaveBeenCalledWith(
        'user-123',
        'conv-123'
      );
    });

    it('should_throw_not_found_when_delete_fails', async () => {
      mockConversationRepository.softDelete.mockResolvedValue(false);

      await expect(
        chatService.deleteConversation('user-123', 'nonexistent')
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('sendMessage', () => {
    it('should_save_user_message_and_return_it', async () => {
      const mockConversation = createMockConversation();
      const mockMessage = createMockMessage({ content: 'Hello AI' });

      mockConversationRepository.findById.mockResolvedValue(mockConversation);
      mockMessageRepository.create.mockResolvedValue(mockMessage);

      const result = await chatService.sendMessage('user-123', 'conv-123', {
        content: 'Hello AI',
      });

      expect(result).toEqual(mockMessage);
      expect(mockMessageRepository.create).toHaveBeenCalledWith(
        'user-123',
        expect.objectContaining({
          conversationId: 'conv-123',
          role: 'user',
          content: 'Hello AI',
        })
      );
    });

    it('should_throw_not_found_when_conversation_not_exists', async () => {
      mockConversationRepository.findById.mockResolvedValue(null);

      await expect(
        chatService.sendMessage('user-123', 'nonexistent', { content: 'Hello' })
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getMessages', () => {
    it('should_return_messages_with_total', async () => {
      const mockConversation = createMockConversation();
      const mockMessages = [
        createMockMessage({ id: 'msg-1', role: 'user' }),
        createMockMessage({ id: 'msg-2', role: 'assistant' }),
      ];

      mockConversationRepository.findById.mockResolvedValue(mockConversation);
      mockMessageRepository.findByConversationId.mockResolvedValue(mockMessages);
      mockMessageRepository.countByConversationId.mockResolvedValue(2);

      const result = await chatService.getMessages('user-123', 'conv-123', {});

      expect(result.messages).toEqual(mockMessages);
      expect(result.total).toBe(2);
    });

    it('should_throw_not_found_when_conversation_not_exists', async () => {
      mockConversationRepository.findById.mockResolvedValue(null);

      await expect(
        chatService.getMessages('user-123', 'nonexistent', {})
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('generateTitle', () => {
    it('should_generate_title_from_first_user_message', async () => {
      const mockMessages = [
        createMockMessage({ role: 'user', content: 'Hello, can you help me?' }),
      ];

      mockMessageRepository.findByConversationId.mockResolvedValue(mockMessages);
      mockConversationRepository.update.mockResolvedValue({
        ...createMockConversation(),
        title: 'Hello, can you help me?',
      });

      await chatService.generateTitle('user-123', 'conv-123');

      expect(mockConversationRepository.update).toHaveBeenCalledWith(
        'user-123',
        'conv-123',
        { title: 'Hello, can you help me?' }
      );
    });

    it('should_truncate_long_messages_for_title', async () => {
      const longContent = 'This is a very long message that should be truncated to fit the title limit.';
      const mockMessages = [
        createMockMessage({ role: 'user', content: longContent }),
      ];

      mockMessageRepository.findByConversationId.mockResolvedValue(mockMessages);
      mockConversationRepository.update.mockResolvedValue({
        ...createMockConversation(),
        title: longContent.substring(0, 47) + '...',
      });

      await chatService.generateTitle('user-123', 'conv-123');

      expect(mockConversationRepository.update).toHaveBeenCalledWith(
        'user-123',
        'conv-123',
        { title: expect.stringMatching(/\.\.\.$/u) }
      );
    });

    it('should_not_generate_title_if_no_messages', async () => {
      mockMessageRepository.findByConversationId.mockResolvedValue([]);

      const result = await chatService.generateTitle('user-123', 'conv-123');

      expect(result).toBeNull();
      expect(mockConversationRepository.update).not.toHaveBeenCalled();
    });

    it('should_not_generate_title_if_no_user_messages', async () => {
      const mockMessages = [
        createMockMessage({ role: 'assistant', content: 'Hello!' }),
      ];

      mockMessageRepository.findByConversationId.mockResolvedValue(mockMessages);

      const result = await chatService.generateTitle('user-123', 'conv-123');

      expect(result).toBeNull();
      expect(mockConversationRepository.update).not.toHaveBeenCalled();
    });
  });

  describe('streamResponse', () => {
    it('should_return_observable_that_emits_stream_chunks', async () => {
      const mockConversation = createMockConversation();
      const mockMessages = [
        createMockMessage({ role: 'user', content: 'Hello' }),
      ];

      // Mock async generator for stream
      async function* mockStreamGenerator() {
        yield { content: 'Hello', done: false };
        yield { content: ' there!', done: false };
        yield { content: '', done: true };
      }

      mockConversationRepository.findById.mockResolvedValue(mockConversation);
      mockContextBuilder.buildSystemPrompt.mockResolvedValue('System prompt');
      mockMessageRepository.getRecentMessages.mockResolvedValue(mockMessages);
      mockLLM.stream.mockReturnValue(mockStreamGenerator());
      mockMessageRepository.create.mockResolvedValue(
        createMockMessage({ role: 'assistant', content: 'Hello there!' })
      );

      const observable = chatService.streamResponse('user-123', 'conv-123');

      // Get first event (should be a chunk)
      const firstEvent = await firstValueFrom(observable);

      expect(firstEvent.data).toBeDefined();
    });
  });
});
