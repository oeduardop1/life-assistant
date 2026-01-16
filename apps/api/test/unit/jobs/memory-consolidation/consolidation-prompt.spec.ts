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

  it('should_skip_knowledge_items_with_unmappable_types', () => {
    // Items with completely invalid types that can't be mapped are skipped
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

    const result = parseConsolidationResponse(response);
    // The invalid item should be skipped, resulting in empty array
    expect(result.new_knowledge_items).toHaveLength(0);
  });

  it('should_map_known_invalid_types_to_valid_ones', () => {
    // Items with known invalid types are mapped to valid ones
    const response = JSON.stringify({
      memory_updates: {},
      new_knowledge_items: [
        {
          type: 'challenge', // Should be mapped to 'insight'
          content: 'Test challenge',
          confidence: 0.9,
          source: 'ai_inference',
        },
        {
          type: 'goal', // Should be mapped to 'fact'
          content: 'Test goal',
          confidence: 0.8,
          source: 'ai_inference',
        },
      ],
      updated_knowledge_items: [],
    });

    const result = parseConsolidationResponse(response);
    expect(result.new_knowledge_items).toHaveLength(2);
    expect(result.new_knowledge_items[0].type).toBe('insight');
    expect(result.new_knowledge_items[1].type).toBe('fact');
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

  // Tests for null handling (bug fix for LLM responses)
  describe('null value handling', () => {
    it('should_convert_null_memory_update_fields_to_undefined', () => {
      // LLMs often return null instead of omitting optional fields
      const response = JSON.stringify({
        memory_updates: {
          bio: null,
          occupation: 'Engineer',
          familyContext: null,
          currentGoals: null,
          currentChallenges: ['Challenge 1'],
          topOfMind: null,
          values: null,
          learnedPatterns: null,
        },
        new_knowledge_items: [],
        updated_knowledge_items: [],
      });

      const result = parseConsolidationResponse(response);

      // null values should be converted to undefined (and thus omitted)
      expect(result.memory_updates.bio).toBeUndefined();
      expect(result.memory_updates.occupation).toBe('Engineer');
      expect(result.memory_updates.familyContext).toBeUndefined();
      expect(result.memory_updates.currentGoals).toBeUndefined();
      expect(result.memory_updates.currentChallenges).toEqual(['Challenge 1']);
      expect(result.memory_updates.topOfMind).toBeUndefined();
      expect(result.memory_updates.values).toBeUndefined();
      expect(result.memory_updates.learnedPatterns).toBeUndefined();
    });

    it('should_handle_all_null_memory_updates', () => {
      // Edge case: LLM returns all nulls in memory_updates
      const response = JSON.stringify({
        memory_updates: {
          bio: null,
          occupation: null,
          familyContext: null,
          currentGoals: null,
          currentChallenges: null,
          topOfMind: null,
          values: null,
          learnedPatterns: null,
        },
        new_knowledge_items: [],
        updated_knowledge_items: [],
      });

      const result = parseConsolidationResponse(response);

      // Should succeed and return empty memory_updates
      expect(result.memory_updates).toBeDefined();
      expect(Object.keys(result.memory_updates)).toHaveLength(0);
    });

    it('should_handle_null_in_arrays', () => {
      // Edge case: null values inside arrays
      const response = JSON.stringify({
        memory_updates: {
          currentGoals: ['Goal 1', null, 'Goal 2'],
          values: [null, 'Value 1'],
        },
        new_knowledge_items: [],
        updated_knowledge_items: [],
      });

      const result = parseConsolidationResponse(response);

      // null values in arrays should be filtered out
      expect(result.memory_updates.currentGoals).toEqual(['Goal 1', 'Goal 2']);
      expect(result.memory_updates.values).toEqual(['Value 1']);
    });

    it('should_handle_null_fields_in_knowledge_items', () => {
      // Knowledge items with null optional fields
      const response = JSON.stringify({
        memory_updates: {},
        new_knowledge_items: [
          {
            type: 'fact',
            area: null,
            content: 'Test content',
            title: null,
            confidence: 0.9,
            source: 'ai_inference',
            inferenceEvidence: null,
          },
        ],
        updated_knowledge_items: [],
      });

      const result = parseConsolidationResponse(response);

      expect(result.new_knowledge_items).toHaveLength(1);
      expect(result.new_knowledge_items[0].type).toBe('fact');
      expect(result.new_knowledge_items[0].content).toBe('Test content');
      expect(result.new_knowledge_items[0].area).toBeUndefined();
      expect(result.new_knowledge_items[0].title).toBeUndefined();
      expect(result.new_knowledge_items[0].inferenceEvidence).toBeUndefined();
    });

    it('should_handle_null_in_learned_patterns', () => {
      // Learned patterns with null values
      const response = JSON.stringify({
        memory_updates: {
          learnedPatterns: [
            {
              pattern: 'Pattern 1',
              confidence: 0.8,
              evidence: ['Evidence 1', null, 'Evidence 2'],
            },
          ],
        },
        new_knowledge_items: [],
        updated_knowledge_items: [],
      });

      const result = parseConsolidationResponse(response);

      expect(result.memory_updates.learnedPatterns).toHaveLength(1);
      expect(result.memory_updates.learnedPatterns?.[0].evidence).toEqual([
        'Evidence 1',
        'Evidence 2',
      ]);
    });

    it('should_handle_deeply_nested_null_values', () => {
      // Complex nested structure with nulls
      const response = JSON.stringify({
        memory_updates: {
          learnedPatterns: [
            null, // null item in array
            {
              pattern: 'Valid pattern',
              confidence: 0.7,
              evidence: ['e1', null],
            },
          ],
        },
        new_knowledge_items: [],
        updated_knowledge_items: [],
      });

      const result = parseConsolidationResponse(response);

      // null pattern should be filtered, valid one kept
      expect(result.memory_updates.learnedPatterns).toHaveLength(1);
      expect(result.memory_updates.learnedPatterns?.[0].pattern).toBe('Valid pattern');
      expect(result.memory_updates.learnedPatterns?.[0].evidence).toEqual(['e1']);
    });
  });
});
