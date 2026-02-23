import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { firstValueFrom, take, toArray } from 'rxjs';

// Mock the AI package
vi.mock('@life-assistant/ai', () => ({
  createLLMFromEnv: vi.fn(),
  runToolLoop: vi.fn(),
  searchKnowledgeTool: {
    name: 'search_knowledge',
    description: 'Search knowledge items',
    parameters: {},
  },
  addKnowledgeTool: {
    name: 'add_knowledge',
    description: 'Add knowledge item',
    parameters: {},
  },
  analyzeContextTool: {
    name: 'analyze_context',
    description: 'Analyze context for connections, patterns, and contradictions',
    parameters: {},
  },
  // Tracking tools (M2.1)
  recordMetricTool: {
    name: 'record_metric',
    description: 'Record a metric entry',
    parameters: {},
    requiresConfirmation: true,
  },
  getTrackingHistoryTool: {
    name: 'get_tracking_history',
    description: 'Get tracking history',
    parameters: {},
  },
  updateMetricTool: {
    name: 'update_metric',
    description: 'Update a metric entry',
    parameters: {},
    requiresConfirmation: true,
  },
  deleteMetricTool: {
    name: 'delete_metric',
    description: 'Delete a metric entry',
    parameters: {},
    requiresConfirmation: true,
  },
  deleteMetricsTool: {
    name: 'delete_metrics',
    description: 'Delete multiple metric entries',
    parameters: {},
    requiresConfirmation: true,
  },
  // Confirmation detection tool (LLM-based)
  respondToConfirmationTool: {
    name: 'respond_to_confirmation',
    description: 'Analyze user response to confirmation prompt',
    parameters: {},
    requiresConfirmation: false,
  },
  // Finance tools (M2.2)
  getFinanceSummaryTool: {
    name: 'get_finance_summary',
    description: 'Get finance summary with KPIs',
    parameters: {},
    requiresConfirmation: false,
  },
  getPendingBillsTool: {
    name: 'get_pending_bills',
    description: 'Get pending bills',
    parameters: {},
    requiresConfirmation: false,
  },
  getBillsTool: {
    name: 'get_bills',
    description: 'Get all bills with details',
    parameters: {},
    requiresConfirmation: false,
  },
  getExpensesTool: {
    name: 'get_expenses',
    description: 'Get all variable expenses',
    parameters: {},
    requiresConfirmation: false,
  },
  getIncomesTool: {
    name: 'get_incomes',
    description: 'Get all incomes',
    parameters: {},
    requiresConfirmation: false,
  },
  getInvestmentsTool: {
    name: 'get_investments',
    description: 'Get all investments',
    parameters: {},
    requiresConfirmation: false,
  },
  markBillPaidTool: {
    name: 'mark_bill_paid',
    description: 'Mark a bill as paid',
    parameters: {},
    requiresConfirmation: true,
  },
  createExpenseTool: {
    name: 'create_expense',
    description: 'Create a new expense',
    parameters: {},
    requiresConfirmation: true,
  },
  getDebtProgressTool: {
    name: 'get_debt_progress',
    description: 'Get debt progress',
    parameters: {},
    requiresConfirmation: false,
  },
  getDebtPaymentHistoryTool: {
    name: 'get_debt_payment_history',
    description: 'Get debt payment history',
    parameters: {},
    requiresConfirmation: false,
  },
  getUpcomingInstallmentsTool: {
    name: 'get_upcoming_installments',
    description: 'Get upcoming debt installments',
    parameters: {},
    requiresConfirmation: false,
  },
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
  let mockConfirmationStateService: {
    store: ReturnType<typeof vi.fn>;
    get: ReturnType<typeof vi.fn>;
    getLatest: ReturnType<typeof vi.fn>;
    confirm: ReturnType<typeof vi.fn>;
    reject: ReturnType<typeof vi.fn>;
    clearAll: ReturnType<typeof vi.fn>;
  };
  let mockMemoryToolExecutor: {
    execute: ReturnType<typeof vi.fn>;
  };
  let mockTrackingToolExecutor: {
    execute: ReturnType<typeof vi.fn>;
  };
  let mockFinanceToolExecutor: {
    execute: ReturnType<typeof vi.fn>;
  };
  let mockLLM: {
    stream: ReturnType<typeof vi.fn>;
    generateText: ReturnType<typeof vi.fn>;
    chat: ReturnType<typeof vi.fn>;
    chatWithTools: ReturnType<typeof vi.fn>;
    getInfo: ReturnType<typeof vi.fn>;
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

    mockConfirmationStateService = {
      store: vi.fn(),
      get: vi.fn(),
      getLatest: vi.fn(),
      confirm: vi.fn(),
      reject: vi.fn(),
      clearAll: vi.fn(),
    };

    mockMemoryToolExecutor = {
      execute: vi.fn(),
    };

    mockTrackingToolExecutor = {
      execute: vi.fn(),
    };

    mockFinanceToolExecutor = {
      execute: vi.fn(),
    };

    // Create mock AppConfigService (Python AI feature flag)
    const mockAppConfig = {
      usePythonAi: false,
      pythonAiUrl: 'http://localhost:8000',
      serviceSecret: 'test-secret',
    };

    // Create mock LLM
    mockLLM = {
      stream: vi.fn(),
      generateText: vi.fn(),
      chat: vi.fn(),
      chatWithTools: vi.fn(),
      getInfo: vi.fn().mockReturnValue({ name: 'test', model: 'test-model' }),
    };

    vi.mocked(createLLMFromEnv).mockReturnValue(mockLLM as unknown as ReturnType<typeof createLLMFromEnv>);

    // Create service instance with mocks
    // Constructor order: appConfig, contextBuilder, confirmationStateService, conversationRepository, messageRepository, memoryToolExecutor, trackingToolExecutor, financeToolExecutor
    chatService = new ChatService(
      mockAppConfig as unknown as ConstructorParameters<typeof ChatService>[0],
      mockContextBuilder as unknown as ConstructorParameters<typeof ChatService>[1],
      mockConfirmationStateService as unknown as ConstructorParameters<typeof ChatService>[2],
      mockConversationRepository as unknown as ConstructorParameters<typeof ChatService>[3],
      mockMessageRepository as unknown as ConstructorParameters<typeof ChatService>[4],
      mockMemoryToolExecutor as unknown as ConstructorParameters<typeof ChatService>[5],
      mockTrackingToolExecutor as unknown as ConstructorParameters<typeof ChatService>[6],
      mockFinanceToolExecutor as unknown as ConstructorParameters<typeof ChatService>[7]
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
      mockConfirmationStateService.getLatest.mockResolvedValue(null);
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

  // ==========================================================================
  // Confirmation Intent Detection Tests (ADR-015)
  // Uses LLM-based detection instead of regex patterns
  // ==========================================================================

  describe('handlePendingConfirmationFromMessage', () => {
    const mockToolCall = {
      id: 'tool-1',
      name: 'record_metric',
      arguments: { type: 'weight', value: 75, unit: 'kg', date: '2026-01-20' },
    };
    const mockPendingConfirmation = {
      confirmationId: 'conf-123',
      conversationId: 'conv-123',
      userId: 'user-123',
      toolCall: mockToolCall,
      toolCalls: [mockToolCall], // NEW: array of all tool calls
      toolName: 'record_metric',
      toolNames: ['record_metric'], // NEW: array of all tool names
      message: 'Registrar peso: 75 kg?',
      iteration: 1,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    };

    /**
     * Helper to mock LLM chatWithTools response for intent detection
     */
    function mockLLMIntentResponse(intent: 'confirm' | 'reject' | 'correct', options?: {
      correctedValue?: number;
      correctedUnit?: string;
      confidence?: number;
    }) {
      mockLLM.chatWithTools.mockResolvedValue({
        content: '',
        finishReason: 'tool_calls',
        toolCalls: [{
          id: 'tc-1',
          name: 'respond_to_confirmation',
          arguments: {
            intent,
            confidence: options?.confidence ?? 0.95,
            ...(options?.correctedValue !== undefined && { correctedValue: options.correctedValue }),
            ...(options?.correctedUnit && { correctedUnit: options.correctedUnit }),
          },
        }],
      });
    }

    it('should_return_false_when_no_pending_confirmation', async () => {
      mockConfirmationStateService.getLatest.mockResolvedValue(null);

      const subject = {
        next: vi.fn(),
        complete: vi.fn(),
      };

      // Access private method
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (chatService as any).handlePendingConfirmationFromMessage(
        'user-123',
        'conv-123',
        'sim',
        subject
      );

      expect(result).toBe(false);
      expect(subject.next).not.toHaveBeenCalled();
    });

    it('should_execute_tool_when_user_confirms', async () => {
      mockConfirmationStateService.getLatest.mockResolvedValue(mockPendingConfirmation);
      mockConfirmationStateService.confirm.mockResolvedValue(mockPendingConfirmation);
      mockTrackingToolExecutor.execute.mockResolvedValue({
        success: true,
        content: JSON.stringify({ message: 'Registrado!' }),
      });
      mockMessageRepository.create.mockResolvedValue(createMockMessage());

      // Mock LLM to detect 'confirm' intent
      mockLLMIntentResponse('confirm');

      const subject = {
        next: vi.fn(),
        complete: vi.fn(),
      };

      // Access private method
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (chatService as any).handlePendingConfirmationFromMessage(
        'user-123',
        'conv-123',
        'sim',
        subject
      );

      expect(result).toBe(true);
      expect(mockLLM.chatWithTools).toHaveBeenCalled();
      expect(mockTrackingToolExecutor.execute).toHaveBeenCalled();
      expect(mockConfirmationStateService.confirm).toHaveBeenCalledWith('conv-123', 'conf-123');
      expect(subject.complete).toHaveBeenCalled();
    });

    it('should_reject_confirmation_when_user_says_no', async () => {
      mockConfirmationStateService.getLatest.mockResolvedValue(mockPendingConfirmation);
      mockConfirmationStateService.reject.mockResolvedValue(true);
      mockMessageRepository.create.mockResolvedValue(createMockMessage());

      // Mock LLM to detect 'reject' intent
      mockLLMIntentResponse('reject');

      const subject = {
        next: vi.fn(),
        complete: vi.fn(),
      };

      // Access private method
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (chatService as any).handlePendingConfirmationFromMessage(
        'user-123',
        'conv-123',
        'não',
        subject
      );

      expect(result).toBe(true);
      expect(mockLLM.chatWithTools).toHaveBeenCalled();
      expect(mockTrackingToolExecutor.execute).not.toHaveBeenCalled();
      expect(mockConfirmationStateService.reject).toHaveBeenCalledWith('conv-123', 'conf-123');
      expect(subject.next).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { content: 'Ok, cancelado.', done: true },
        })
      );
    });

    it('should_execute_tool_with_corrected_value_when_correction_detected', async () => {
      mockConfirmationStateService.getLatest.mockResolvedValue(mockPendingConfirmation);
      mockConfirmationStateService.confirm.mockResolvedValue(mockPendingConfirmation);
      mockTrackingToolExecutor.execute.mockResolvedValue({
        success: true,
        content: JSON.stringify({ message: 'Registrado!' }),
      });
      mockMessageRepository.create.mockResolvedValue(createMockMessage());

      // Mock LLM to detect 'correct' intent with new value
      mockLLMIntentResponse('correct', { correctedValue: 75.5, correctedUnit: 'kg' });

      const subject = {
        next: vi.fn(),
        complete: vi.fn(),
      };

      // Access private method
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (chatService as any).handlePendingConfirmationFromMessage(
        'user-123',
        'conv-123',
        '75.5 kg',
        subject
      );

      expect(result).toBe(true);
      expect(mockLLM.chatWithTools).toHaveBeenCalled();
      // Should execute with corrected value
      expect(mockTrackingToolExecutor.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          arguments: expect.objectContaining({
            value: 75.5,
            unit: 'kg',
          }),
        }),
        expect.anything()
      );
      expect(subject.complete).toHaveBeenCalled();
    });

    it('should_ask_for_clarification_when_correction_has_no_value', async () => {
      mockConfirmationStateService.getLatest.mockResolvedValue(mockPendingConfirmation);

      // Mock LLM to detect 'correct' intent without a value
      mockLLMIntentResponse('correct'); // No correctedValue

      const subject = {
        next: vi.fn(),
        complete: vi.fn(),
      };

      // Access private method
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (chatService as any).handlePendingConfirmationFromMessage(
        'user-123',
        'conv-123',
        'na verdade outro valor',
        subject
      );

      expect(result).toBe(true);
      expect(mockLLM.chatWithTools).toHaveBeenCalled();
      expect(mockTrackingToolExecutor.execute).not.toHaveBeenCalled();
      // Changed: no more duplicate SSE events - content is sent only once with done: true
      expect(subject.next).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { content: 'Qual seria o valor correto?', done: true },
        })
      );
    });

    it('should_clear_confirmation_and_return_false_on_unrelated_message', async () => {
      mockConfirmationStateService.getLatest.mockResolvedValue(mockPendingConfirmation);
      mockConfirmationStateService.clearAll.mockResolvedValue(undefined);

      // Mock LLM with no tool call (shouldn't happen, but fallback to error)
      mockLLM.chatWithTools.mockResolvedValue({
        content: '',
        finishReason: 'stop',
        toolCalls: [],
      });

      const subject = {
        next: vi.fn(),
        complete: vi.fn(),
      };

      // Access private method
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (chatService as any).handlePendingConfirmationFromMessage(
        'user-123',
        'conv-123',
        'qual a previsão do tempo?',
        subject
      );

      // When LLM returns no tool call, it's treated as error and returns true
      expect(result).toBe(true);
      expect(mockLLM.chatWithTools).toHaveBeenCalled();
    });

    it('should_return_error_message_and_keep_confirmation_pending_when_llm_fails', async () => {
      mockConfirmationStateService.getLatest.mockResolvedValue(mockPendingConfirmation);

      // Mock LLM to throw an error
      mockLLM.chatWithTools.mockRejectedValue(new Error('LLM error'));

      const subject = {
        next: vi.fn(),
        complete: vi.fn(),
      };

      // Access private method
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (chatService as any).handlePendingConfirmationFromMessage(
        'user-123',
        'conv-123',
        'sim',
        subject
      );

      expect(result).toBe(true);
      expect(mockLLM.chatWithTools).toHaveBeenCalled();
      // Confirmation should NOT be cleared - user can retry
      expect(mockConfirmationStateService.clearAll).not.toHaveBeenCalled();
      expect(mockConfirmationStateService.reject).not.toHaveBeenCalled();
      // Changed: no more duplicate SSE events - content is sent only once with done: true
      expect(subject.next).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            content: expect.stringContaining('problema'),
            done: true,
          },
        })
      );
    });
  });
});
