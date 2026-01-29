import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UserMemoryService } from '../../../../src/modules/memory/application/services/user-memory.service.js';
import type { UserMemory } from '@life-assistant/database';

/**
 * Create a mock user memory for testing
 */
function createMockUserMemory(
  overrides: Partial<UserMemory> = {}
): UserMemory {
  return {
    id: 'memory-123',
    userId: 'user-123',
    bio: null,
    occupation: null,
    familyContext: null,
    currentGoals: [],
    currentChallenges: [],
    topOfMind: [],
    values: [],
    learnedPatterns: [],
    communicationStyle: null,
    feedbackPreferences: null,
    version: 1,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    lastConsolidatedAt: null,
    ...overrides,
  };
}

describe('UserMemoryService', () => {
  let userMemoryService: UserMemoryService;
  let mockRepository: {
    findByUserId: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    updateLastConsolidatedAt: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockRepository = {
      findByUserId: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateLastConsolidatedAt: vi.fn(),
    };

    userMemoryService = new UserMemoryService(
      mockRepository as unknown as ConstructorParameters<typeof UserMemoryService>[0]
    );
  });

  describe('getOrCreate', () => {
    it('should_return_existing_memory_when_found', async () => {
      const existingMemory = createMockUserMemory();
      mockRepository.findByUserId.mockResolvedValue(existingMemory);

      const result = await userMemoryService.getOrCreate('user-123');

      expect(result).toEqual(existingMemory);
      expect(mockRepository.findByUserId).toHaveBeenCalledWith('user-123');
      expect(mockRepository.create).not.toHaveBeenCalled();
    });

    it('should_create_new_memory_when_not_found', async () => {
      const newMemory = createMockUserMemory();
      mockRepository.findByUserId.mockResolvedValue(null);
      mockRepository.create.mockResolvedValue(newMemory);

      const result = await userMemoryService.getOrCreate('user-123');

      expect(result).toEqual(newMemory);
      expect(mockRepository.findByUserId).toHaveBeenCalledWith('user-123');
      expect(mockRepository.create).toHaveBeenCalledWith('user-123', {
        currentGoals: [],
        currentChallenges: [],
        topOfMind: [],
        values: [],
        learnedPatterns: [],
      });
    });
  });

  describe('update', () => {
    it('should_update_memory_with_partial_data', async () => {
      const updatedMemory = createMockUserMemory({
        bio: 'Updated bio',
        version: 2,
      });
      mockRepository.update.mockResolvedValue(updatedMemory);

      const result = await userMemoryService.update('user-123', {
        bio: 'Updated bio',
      });

      expect(result).toEqual(updatedMemory);
      expect(mockRepository.update).toHaveBeenCalledWith('user-123', {
        bio: 'Updated bio',
      });
    });

    it('should_return_null_when_memory_not_found', async () => {
      mockRepository.update.mockResolvedValue(null);

      const result = await userMemoryService.update('user-123', {
        bio: 'Test',
      });

      expect(result).toBeNull();
    });
  });

  describe('updateLastConsolidatedAt', () => {
    it('should_update_timestamp', async () => {
      const timestamp = new Date('2024-01-15');
      mockRepository.updateLastConsolidatedAt.mockResolvedValue(undefined);

      await userMemoryService.updateLastConsolidatedAt('user-123', timestamp);

      expect(mockRepository.updateLastConsolidatedAt).toHaveBeenCalledWith(
        'user-123',
        timestamp
      );
    });
  });

  describe('formatForPrompt', () => {
    it('should_format_empty_memory', () => {
      const memory = createMockUserMemory();

      const result = userMemoryService.formatForPrompt(memory);

      expect(result.text).toBe('');
      expect(result.tokenEstimate).toBe(0);
    });

    it('should_format_memory_with_profile_info', () => {
      const memory = createMockUserMemory({
        bio: 'Software developer from Brazil',
        occupation: 'Engineer',
        familyContext: 'Married with 2 kids',
      });

      const result = userMemoryService.formatForPrompt(memory);

      expect(result.text).toContain('## Sobre o Usuário');
      expect(result.text).toContain('Software developer from Brazil');
      expect(result.text).toContain('Profissão: Engineer');
      expect(result.text).toContain('Família: Married with 2 kids');
      expect(result.tokenEstimate).toBeGreaterThan(0);
    });

    it('should_format_memory_with_values', () => {
      const memory = createMockUserMemory({
        values: ['honesty', 'family', 'growth'],
      });

      const result = userMemoryService.formatForPrompt(memory);

      expect(result.text).toContain('## Valores');
      expect(result.text).toContain('- honesty');
      expect(result.text).toContain('- family');
      expect(result.text).toContain('- growth');
    });

    it('should_format_memory_with_goals', () => {
      const memory = createMockUserMemory({
        currentGoals: ['Learn Spanish', 'Run marathon'],
      });

      const result = userMemoryService.formatForPrompt(memory);

      expect(result.text).toContain('## Objetivos Atuais');
      expect(result.text).toContain('- Learn Spanish');
      expect(result.text).toContain('- Run marathon');
    });

    it('should_format_memory_with_challenges', () => {
      const memory = createMockUserMemory({
        currentChallenges: ['Time management', 'Work-life balance'],
      });

      const result = userMemoryService.formatForPrompt(memory);

      expect(result.text).toContain('## Desafios Atuais');
      expect(result.text).toContain('- Time management');
      expect(result.text).toContain('- Work-life balance');
    });

    it('should_format_memory_with_top_of_mind', () => {
      const memory = createMockUserMemory({
        topOfMind: ['Project deadline', 'Vacation planning'],
      });

      const result = userMemoryService.formatForPrompt(memory);

      expect(result.text).toContain('## Em Mente');
      expect(result.text).toContain('- Project deadline');
      expect(result.text).toContain('- Vacation planning');
    });

    it('should_include_high_confidence_patterns_only', () => {
      const memory = createMockUserMemory({
        learnedPatterns: [
          { pattern: 'Prefers morning meetings', confidence: 0.9, evidence: [] },
          { pattern: 'Low confidence pattern', confidence: 0.5, evidence: [] },
          { pattern: 'Works best in quiet', confidence: 0.8, evidence: [] },
        ],
      });

      const result = userMemoryService.formatForPrompt(memory);

      expect(result.text).toContain('## Padrões Observados');
      expect(result.text).toContain('- Prefers morning meetings');
      expect(result.text).toContain('- Works best in quiet');
      expect(result.text).not.toContain('Low confidence pattern');
    });

    it('should_limit_patterns_to_5', () => {
      const memory = createMockUserMemory({
        learnedPatterns: [
          { pattern: 'Pattern 1', confidence: 0.9, evidence: [] },
          { pattern: 'Pattern 2', confidence: 0.9, evidence: [] },
          { pattern: 'Pattern 3', confidence: 0.9, evidence: [] },
          { pattern: 'Pattern 4', confidence: 0.9, evidence: [] },
          { pattern: 'Pattern 5', confidence: 0.9, evidence: [] },
          { pattern: 'Pattern 6', confidence: 0.9, evidence: [] },
          { pattern: 'Pattern 7', confidence: 0.9, evidence: [] },
        ],
      });

      const result = userMemoryService.formatForPrompt(memory);

      // Count occurrences of "- Pattern"
      const patternMatches = result.text.match(/- Pattern \d/g);
      expect(patternMatches).toHaveLength(5);
    });

    it('should_include_communication_style_when_present', () => {
      const memory = createMockUserMemory({
        communicationStyle: 'Direct and concise',
        feedbackPreferences: 'Prefer written feedback',
      });

      const result = userMemoryService.formatForPrompt(memory);

      expect(result.text).toContain('## Comunicação');
      expect(result.text).toContain('Estilo: Direct and concise');
      expect(result.text).toContain('Preferências: Prefer written feedback');
    });

    it('should_estimate_tokens_at_4_chars_per_token', () => {
      const memory = createMockUserMemory({
        bio: 'Test bio with 40 characters total here!',
      });

      const result = userMemoryService.formatForPrompt(memory);

      // Token estimate should be roughly text.length / 4
      const expectedMinTokens = Math.floor(result.text.length / 5);
      const expectedMaxTokens = Math.ceil(result.text.length / 3);
      expect(result.tokenEstimate).toBeGreaterThanOrEqual(expectedMinTokens);
      expect(result.tokenEstimate).toBeLessThanOrEqual(expectedMaxTokens);
    });

    it('should_omit_empty_arrays', () => {
      const memory = createMockUserMemory({
        bio: 'Has bio',
        values: [],
        currentGoals: [],
      });

      const result = userMemoryService.formatForPrompt(memory);

      expect(result.text).toContain('## Sobre o Usuário');
      expect(result.text).not.toContain('## Valores');
      expect(result.text).not.toContain('## Objetivos Atuais');
    });
  });

  describe('findByUserId', () => {
    it('should_return_memory_when_found', async () => {
      const memory = createMockUserMemory();
      mockRepository.findByUserId.mockResolvedValue(memory);

      const result = await userMemoryService.findByUserId('user-123');

      expect(result).toEqual(memory);
      expect(mockRepository.findByUserId).toHaveBeenCalledWith('user-123');
    });

    it('should_return_null_when_not_found', async () => {
      mockRepository.findByUserId.mockResolvedValue(null);

      const result = await userMemoryService.findByUserId('user-123');

      expect(result).toBeNull();
    });
  });
});
