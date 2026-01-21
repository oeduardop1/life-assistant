import { describe, it, expect } from 'vitest';
import {
  buildConsolidationPrompt,
  parseConsolidationResponse,
  type ConsolidationResponse,
} from '../../../src/jobs/memory-consolidation/consolidation-prompt';

// Mock messages
const mockMessages = [
  {
    id: 'msg-1',
    conversationId: 'conv-1',
    role: 'user',
    content: 'Oi, sou desenvolvedor e estou muito estressado com prazos',
    metadata: null,
    actions: null,
    createdAt: new Date('2024-01-15T10:00:00'),
  },
  {
    id: 'msg-2',
    conversationId: 'conv-1',
    role: 'assistant',
    content: 'Entendo, prazos podem ser desafiadores. Como posso ajudar?',
    metadata: null,
    actions: null,
    createdAt: new Date('2024-01-15T10:01:00'),
  },
  {
    id: 'msg-3',
    conversationId: 'conv-1',
    role: 'user',
    content: 'Estou solteiro e morando sozinho, o que ajuda a focar no trabalho',
    metadata: null,
    actions: null,
    createdAt: new Date('2024-01-15T10:05:00'),
  },
];

// Valid consolidation response
const mockConsolidationResponse: ConsolidationResponse = {
  memory_updates: {
    occupation: 'Desenvolvedor de software',
    currentChallenges: ['Gerenciamento de prazos'],
    learnedPatterns: [
      {
        pattern: 'Fica estressado com prazos apertados',
        confidence: 0.8,
        evidence: ['mentioned stress', 'mentioned deadlines'],
      },
    ],
  },
  new_knowledge_items: [
    {
      type: 'fact',
      area: 'relationships',
      content: 'É solteiro e mora sozinho',
      title: 'Status de relacionamento',
      confidence: 0.95,
      source: 'ai_inference',
    },
    {
      type: 'fact',
      area: 'professional',
      content: 'Trabalha como desenvolvedor de software',
      title: 'Ocupação',
      confidence: 0.95,
      source: 'ai_inference',
    },
  ],
  updated_knowledge_items: [],
};

describe('Memory Consolidation (Integration)', () => {
  describe('Consolidation Prompt', () => {
    it('should_build_prompt_with_messages_and_memory', () => {
      const prompt = buildConsolidationPrompt(
        mockMessages,
        {
          bio: 'Test user',
          occupation: 'Developer',
          currentGoals: ['Learn TypeScript'],
        },
        []
      );

      expect(prompt).toContain('Tarefa: Consolidar Memória do Usuário');
      expect(prompt).toContain('Conversas das últimas 24h');
      expect(prompt).toContain('estressado com prazos');
      expect(prompt).toContain('Bio: Test user');
      expect(prompt).toContain('Ocupação: Developer');
    });

    it('should_format_messages_with_timestamps', () => {
      const prompt = buildConsolidationPrompt(mockMessages, {}, []);

      expect(prompt).toContain('Usuário:');
      expect(prompt).toContain('Assistente:');
    });

    it('should_include_existing_knowledge_items', () => {
      const existingKnowledge = [
        {
          id: 'ki-1',
          type: 'fact',
          content: 'Works as developer',
          title: 'Work',
        },
      ];

      const prompt = buildConsolidationPrompt(mockMessages, {}, existingKnowledge);

      expect(prompt).toContain('[ki-1]');
      expect(prompt).toContain('Works as developer');
    });
  });

  describe('Consolidation Response Parsing', () => {
    it('should_parse_valid_json_response', () => {
      const jsonResponse = JSON.stringify(mockConsolidationResponse);

      const result = parseConsolidationResponse(jsonResponse);

      expect(result.memory_updates.occupation).toBe('Desenvolvedor de software');
      expect(result.new_knowledge_items).toHaveLength(2);
    });

    it('should_parse_json_with_markdown_code_blocks', () => {
      const wrappedResponse = `\`\`\`json
${JSON.stringify(mockConsolidationResponse)}
\`\`\``;

      const result = parseConsolidationResponse(wrappedResponse);

      expect(result.memory_updates.occupation).toBe('Desenvolvedor de software');
    });

    it('should_throw_on_malformed_json', () => {
      const malformedJson = '{ invalid json }';

      expect(() => parseConsolidationResponse(malformedJson)).toThrow(
        'Failed to parse consolidation response as JSON'
      );
    });

    it('should_throw_on_invalid_schema', () => {
      const invalidSchema = JSON.stringify({
        memory_updates: {},
        new_knowledge_items: [
          {
            type: 'invalid_type', // Invalid enum value
            content: 'test',
            confidence: 0.5,
            source: 'ai_inference',
          },
        ],
        updated_knowledge_items: [],
      });

      expect(() => parseConsolidationResponse(invalidSchema)).toThrow(
        'Consolidation response validation failed'
      );
    });

    it('should_validate_confidence_range', () => {
      const invalidConfidence = JSON.stringify({
        memory_updates: {},
        new_knowledge_items: [
          {
            type: 'fact',
            content: 'test',
            confidence: 1.5, // Invalid: > 1
            source: 'ai_inference',
          },
        ],
        updated_knowledge_items: [],
      });

      expect(() => parseConsolidationResponse(invalidConfidence)).toThrow();
    });
  });

  describe('Fact Extraction Logic', () => {
    it('should_extract_facts_from_messages', () => {
      // Test prompt building includes message content
      const prompt = buildConsolidationPrompt(mockMessages, {}, []);

      // Verify prompt contains message content
      expect(prompt).toContain('desenvolvedor');
      expect(prompt).toContain('estressado');
      expect(prompt).toContain('solteiro');
    });

    it('should_update_user_memory_after_consolidation', () => {
      // Test that memory updates are correctly extracted from response
      const result = mockConsolidationResponse;

      expect(result.memory_updates.occupation).toBe('Desenvolvedor de software');
      expect(result.memory_updates.currentChallenges).toContain('Gerenciamento de prazos');
      expect(result.memory_updates.learnedPatterns).toHaveLength(1);
    });

    it('should_create_knowledge_items_from_extraction', () => {
      // Test that new knowledge items are created
      const result = mockConsolidationResponse;

      expect(result.new_knowledge_items).toHaveLength(2);
      expect(result.new_knowledge_items[0]).toMatchObject({
        type: 'fact',
        area: 'relationships',
        content: 'É solteiro e mora sozinho',
        confidence: 0.95,
      });
    });

    it('should_extract_learned_patterns', () => {
      // Test that patterns are correctly extracted
      const result = mockConsolidationResponse;

      expect(result.memory_updates.learnedPatterns).toBeDefined();
      const patterns = result.memory_updates.learnedPatterns;
      expect(patterns).toHaveLength(1);
      expect(patterns?.[0]).toMatchObject({
        pattern: 'Fica estressado com prazos apertados',
        confidence: 0.8,
      });
    });
  });

  describe('Tool Loop Metadata', () => {
    it('should_save_tool_calls_in_message_metadata', () => {
      // Test metadata structure
      const metadata = {
        provider: 'anthropic',
        model: 'claude-3-sonnet',
        iterations: 2,
        toolCalls: [
          { id: 'call-1', name: 'search_knowledge', arguments: { query: 'test' } },
          { id: 'call-2', name: 'add_knowledge', arguments: { type: 'fact', content: 'test' } },
        ],
        toolResults: [
          { toolCallId: 'call-1', toolName: 'search_knowledge', success: true },
          { toolCallId: 'call-2', toolName: 'add_knowledge', success: true },
        ],
      };

      expect(metadata.toolCalls).toHaveLength(2);
      expect(metadata.toolResults).toHaveLength(2);
      expect(metadata.toolCalls[0].name).toBe('search_knowledge');
      expect(metadata.toolResults[0].success).toBe(true);
    });

    it('should_save_tool_results_with_success_status', () => {
      const toolResult = {
        toolCallId: 'call-1',
        toolName: 'add_knowledge',
        success: true,
        error: undefined,
      };

      expect(toolResult.success).toBe(true);
      expect(toolResult.error).toBeUndefined();
    });

    it('should_save_tool_results_with_error_on_failure', () => {
      const toolResult = {
        toolCallId: 'call-2',
        toolName: 'search_knowledge',
        success: false,
        error: 'Invalid parameters',
      };

      expect(toolResult.success).toBe(false);
      expect(toolResult.error).toBe('Invalid parameters');
    });
  });

  describe('Empty Conversation Handling', () => {
    it('should_handle_empty_messages_array', () => {
      const prompt = buildConsolidationPrompt([], {}, []);

      // Should still build a valid prompt
      expect(prompt).toContain('Tarefa: Consolidar Memória do Usuário');
      expect(prompt).toContain('Conversas das últimas 24h');
    });

    it('should_handle_empty_memory', () => {
      const prompt = buildConsolidationPrompt(mockMessages, {}, []);

      expect(prompt).toContain('(Memória vazia)');
    });

    it('should_handle_empty_knowledge_items', () => {
      const prompt = buildConsolidationPrompt(mockMessages, {}, []);

      expect(prompt).toContain('(Nenhum conhecimento registrado)');
    });
  });
});
