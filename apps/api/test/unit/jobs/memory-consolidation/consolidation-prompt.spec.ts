import { describe, it, expect } from 'vitest';
import {
  buildConsolidationPrompt,
  parseConsolidationResponse,
} from '../../../../src/jobs/memory-consolidation/consolidation-prompt.js';
import type { Message } from '@life-assistant/database';

/**
 * Create a mock message for testing
 */
function createMockMessage(
  overrides: Partial<Message> = {}
): Message {
  return {
    id: 'msg-123',
    conversationId: 'conv-123',
    role: 'user',
    content: 'Test message',
    metadata: null,
    actions: null,
    createdAt: new Date('2024-01-01T10:00:00Z'),
    ...overrides,
  };
}

describe('buildConsolidationPrompt', () => {
  it('should_format_messages_with_timestamps', () => {
    const messages = [
      createMockMessage({
        role: 'user',
        content: 'Hello!',
        createdAt: new Date('2024-01-01T10:00:00Z'),
      }),
      createMockMessage({
        role: 'assistant',
        content: 'Hi there!',
        createdAt: new Date('2024-01-01T10:01:00Z'),
      }),
    ];

    const prompt = buildConsolidationPrompt(messages, {}, []);

    expect(prompt).toContain('Usuário: Hello!');
    expect(prompt).toContain('Assistente: Hi there!');
  });

  it('should_include_current_memory', () => {
    const messages = [createMockMessage()];
    const memory = {
      bio: 'Software developer',
      occupation: 'Engineer',
      familyContext: 'Married',
      values: ['honesty', 'family'],
      currentGoals: ['Learn Spanish'],
      currentChallenges: ['Time management'],
      topOfMind: ['Project deadline'],
    };

    const prompt = buildConsolidationPrompt(messages, memory, []);

    expect(prompt).toContain('Bio: Software developer');
    expect(prompt).toContain('Ocupação: Engineer');
    expect(prompt).toContain('Família: Married');
    expect(prompt).toContain('Valores: honesty, family');
    expect(prompt).toContain('Objetivos: Learn Spanish');
    expect(prompt).toContain('Desafios: Time management');
    expect(prompt).toContain('Em mente: Project deadline');
  });

  it('should_show_empty_memory_placeholder', () => {
    const messages = [createMockMessage()];

    const prompt = buildConsolidationPrompt(messages, {}, []);

    expect(prompt).toContain('(Memória vazia)');
  });

  it('should_include_existing_knowledge_items', () => {
    const messages = [createMockMessage()];
    const knowledgeItems = [
      {
        id: 'item-1',
        type: 'fact',
        content: 'User likes coffee',
        title: 'Coffee preference',
      },
      {
        id: 'item-2',
        type: 'preference',
        content: 'Morning person',
        title: 'Sleep pattern',
      },
    ];

    const prompt = buildConsolidationPrompt(messages, {}, knowledgeItems);

    expect(prompt).toContain('[item-1]');
    expect(prompt).toContain('(fact)');
    expect(prompt).toContain('Coffee preference');
    expect(prompt).toContain('User likes coffee');
    expect(prompt).toContain('[item-2]');
    expect(prompt).toContain('(preference)');
  });

  it('should_show_empty_knowledge_placeholder', () => {
    const messages = [createMockMessage()];

    const prompt = buildConsolidationPrompt(messages, {}, []);

    expect(prompt).toContain('(Nenhum conhecimento registrado)');
  });

  it('should_include_instructions', () => {
    const messages = [createMockMessage()];

    const prompt = buildConsolidationPrompt(messages, {}, []);

    expect(prompt).toContain('## Tarefa: Consolidar Memória do Usuário');
    expect(prompt).toContain('### Instruções:');
    expect(prompt).toContain('Confidence >= 0.7 para inferências');
    expect(prompt).toContain('Confidence >= 0.9 para fatos explícitos');
  });

  it('should_include_json_format_specification', () => {
    const messages = [createMockMessage()];

    const prompt = buildConsolidationPrompt(messages, {}, []);

    expect(prompt).toContain('### Formato de saída (JSON estrito):');
    expect(prompt).toContain('"memory_updates"');
    expect(prompt).toContain('"new_knowledge_items"');
    expect(prompt).toContain('"updated_knowledge_items"');
  });
});

describe('parseConsolidationResponse', () => {
  it('should_parse_valid_json_response', () => {
    const response = JSON.stringify({
      memory_updates: {
        bio: 'Updated bio',
      },
      new_knowledge_items: [
        {
          type: 'fact',
          content: 'New fact',
          confidence: 0.9,
          source: 'ai_inference',
        },
      ],
      updated_knowledge_items: [],
    });

    const result = parseConsolidationResponse(response);

    expect(result.memory_updates.bio).toBe('Updated bio');
    expect(result.new_knowledge_items).toHaveLength(1);
    expect(result.new_knowledge_items[0].type).toBe('fact');
    expect(result.updated_knowledge_items).toHaveLength(0);
  });

  it('should_strip_markdown_code_blocks', () => {
    const response = `\`\`\`json
{
  "memory_updates": {},
  "new_knowledge_items": [],
  "updated_knowledge_items": []
}
\`\`\``;

    const result = parseConsolidationResponse(response);

    expect(result.memory_updates).toEqual({});
    expect(result.new_knowledge_items).toEqual([]);
    expect(result.updated_knowledge_items).toEqual([]);
  });

  it('should_strip_plain_code_blocks', () => {
    const response = `\`\`\`
{
  "memory_updates": {},
  "new_knowledge_items": [],
  "updated_knowledge_items": []
}
\`\`\``;

    const result = parseConsolidationResponse(response);

    expect(result).toBeDefined();
  });

  it('should_throw_on_invalid_json', () => {
    const response = 'This is not JSON at all';

    expect(() => parseConsolidationResponse(response)).toThrow(
      'Failed to parse consolidation response as JSON'
    );
  });

  it('should_throw_on_schema_validation_failure', () => {
    const response = JSON.stringify({
      memory_updates: {},
      // Missing required fields
    });

    expect(() => parseConsolidationResponse(response)).toThrow(
      'Consolidation response validation failed'
    );
  });

  it('should_validate_knowledge_item_types', () => {
    const response = JSON.stringify({
      memory_updates: {},
      new_knowledge_items: [
        {
          type: 'invalid_type',
          content: 'Test',
          confidence: 0.9,
          source: 'ai_inference',
        },
      ],
      updated_knowledge_items: [],
    });

    expect(() => parseConsolidationResponse(response)).toThrow();
  });

  it('should_validate_confidence_range', () => {
    const response = JSON.stringify({
      memory_updates: {},
      new_knowledge_items: [
        {
          type: 'fact',
          content: 'Test',
          confidence: 1.5, // Out of range
          source: 'ai_inference',
        },
      ],
      updated_knowledge_items: [],
    });

    expect(() => parseConsolidationResponse(response)).toThrow();
  });

  it('should_parse_memory_updates_with_all_fields', () => {
    const response = JSON.stringify({
      memory_updates: {
        bio: 'Test bio',
        occupation: 'Engineer',
        familyContext: 'Single',
        currentGoals: ['Goal 1', 'Goal 2'],
        currentChallenges: ['Challenge 1'],
        topOfMind: ['Priority 1'],
        values: ['Value 1'],
        learnedPatterns: [
          {
            pattern: 'Morning person',
            confidence: 0.8,
            evidence: ['wakes up early', 'productive in AM'],
          },
        ],
      },
      new_knowledge_items: [],
      updated_knowledge_items: [],
    });

    const result = parseConsolidationResponse(response);

    expect(result.memory_updates.bio).toBe('Test bio');
    expect(result.memory_updates.occupation).toBe('Engineer');
    expect(result.memory_updates.familyContext).toBe('Single');
    expect(result.memory_updates.currentGoals).toEqual(['Goal 1', 'Goal 2']);
    expect(result.memory_updates.learnedPatterns).toHaveLength(1);
    expect(result.memory_updates.learnedPatterns?.[0].pattern).toBe('Morning person');
  });

  it('should_parse_knowledge_items_with_all_fields', () => {
    const response = JSON.stringify({
      memory_updates: {},
      new_knowledge_items: [
        {
          type: 'insight',
          area: 'health',
          content: 'User exercises regularly',
          title: 'Exercise habit',
          confidence: 0.85,
          source: 'ai_inference',
          inferenceEvidence: 'Mentioned 3 times in conversations',
        },
      ],
      updated_knowledge_items: [
        {
          id: '550e8400-e29b-41d4-a716-446655440000',
          content: 'Updated content',
          confidence: 0.95,
        },
      ],
    });

    const result = parseConsolidationResponse(response);

    expect(result.new_knowledge_items[0].type).toBe('insight');
    expect(result.new_knowledge_items[0].area).toBe('health');
    expect(result.new_knowledge_items[0].inferenceEvidence).toBe(
      'Mentioned 3 times in conversations'
    );
    expect(result.updated_knowledge_items[0].id).toBe(
      '550e8400-e29b-41d4-a716-446655440000'
    );
    expect(result.updated_knowledge_items[0].content).toBe('Updated content');
  });

  it('should_validate_updated_item_uuid_format', () => {
    const response = JSON.stringify({
      memory_updates: {},
      new_knowledge_items: [],
      updated_knowledge_items: [
        {
          id: 'not-a-uuid',
          confidence: 0.9,
        },
      ],
    });

    expect(() => parseConsolidationResponse(response)).toThrow();
  });

  it('should_handle_whitespace_in_response', () => {
    const response = `

      {
        "memory_updates": {},
        "new_knowledge_items": [],
        "updated_knowledge_items": []
      }

    `;

    const result = parseConsolidationResponse(response);

    expect(result).toBeDefined();
    expect(result.memory_updates).toEqual({});
  });
});
