import { Injectable, Inject, Logger } from '@nestjs/common';
import type { UserMemory } from '@life-assistant/database';
import {
  UserMemoryRepositoryPort,
  USER_MEMORY_REPOSITORY,
} from '../../domain/ports/user-memory.repository.port';

/**
 * Formatted user memory for system prompt injection
 * ~500-800 tokens
 */
export interface FormattedUserMemory {
  text: string;
  tokenEstimate: number;
}

/**
 * Service for managing user memories
 *
 * @see docs/specs/data-model.md §4.5 for user_memories entity
 * @see docs/specs/ai.md §6.3 for system prompt structure
 */
@Injectable()
export class UserMemoryService {
  private readonly logger = new Logger(UserMemoryService.name);

  constructor(
    @Inject(USER_MEMORY_REPOSITORY)
    private readonly userMemoryRepository: UserMemoryRepositoryPort
  ) {}

  /**
   * Get user memory or create a default one if not exists
   */
  async getOrCreate(userId: string): Promise<UserMemory> {
    let memory = await this.userMemoryRepository.findByUserId(userId);

    if (!memory) {
      this.logger.log(`Creating default user memory for user ${userId}`);
      memory = await this.userMemoryRepository.create(userId, {
        // Start with empty defaults
        currentGoals: [],
        currentChallenges: [],
        topOfMind: [],
        values: [],
        learnedPatterns: [],
        christianPerspective: false,
      });
    }

    return memory;
  }

  /**
   * Update user memory (partial update)
   */
  async update(
    userId: string,
    updates: Partial<Omit<UserMemory, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'version'>>
  ): Promise<UserMemory | null> {
    return this.userMemoryRepository.update(userId, updates);
  }

  /**
   * Update last consolidated timestamp
   */
  async updateLastConsolidatedAt(userId: string, timestamp: Date): Promise<void> {
    await this.userMemoryRepository.updateLastConsolidatedAt(userId, timestamp);
  }

  /**
   * Format user memory for system prompt injection
   * Targets ~500-800 tokens
   *
   * @see docs/specs/ai.md §6.3.2 for format specification
   */
  formatForPrompt(memory: UserMemory): FormattedUserMemory {
    const sections: string[] = [];

    // Profile summary section
    const profileParts: string[] = [];
    if (memory.bio) {
      profileParts.push(memory.bio);
    }
    if (memory.occupation) {
      profileParts.push(`Profissão: ${memory.occupation}`);
    }
    if (memory.familyContext) {
      profileParts.push(`Família: ${memory.familyContext}`);
    }
    if (profileParts.length > 0) {
      sections.push(`## Sobre o Usuário\n${profileParts.join('\n')}`);
    }

    // Values
    const values = memory.values;
    if (Array.isArray(values) && values.length > 0) {
      sections.push(`## Valores\n${values.map((v) => `- ${v}`).join('\n')}`);
    }

    // Current goals
    const goals = memory.currentGoals;
    if (Array.isArray(goals) && goals.length > 0) {
      sections.push(`## Objetivos Atuais\n${goals.map((g) => `- ${g}`).join('\n')}`);
    }

    // Current challenges
    const challenges = memory.currentChallenges;
    if (Array.isArray(challenges) && challenges.length > 0) {
      sections.push(`## Desafios Atuais\n${challenges.map((c) => `- ${c}`).join('\n')}`);
    }

    // Top of mind
    const topOfMind = memory.topOfMind;
    if (Array.isArray(topOfMind) && topOfMind.length > 0) {
      sections.push(`## Em Mente\n${topOfMind.map((t) => `- ${t}`).join('\n')}`);
    }

    // Learned patterns (with confidence)
    const patterns = memory.learnedPatterns;
    if (Array.isArray(patterns) && patterns.length > 0) {
      const patternList = patterns
        .filter((p) => p.confidence >= 0.7) // Only include high-confidence patterns
        .slice(0, 5) // Limit to top 5
        .map((p) => `- ${p.pattern}`)
        .join('\n');

      if (patternList) {
        sections.push(`## Padrões Observados\n${patternList}`);
      }
    }

    // Communication preferences
    const commParts: string[] = [];
    if (memory.communicationStyle) {
      commParts.push(`Estilo: ${memory.communicationStyle}`);
    }
    if (memory.feedbackPreferences) {
      commParts.push(`Preferências: ${memory.feedbackPreferences}`);
    }
    if (commParts.length > 0) {
      sections.push(`## Comunicação\n${commParts.join('\n')}`);
    }

    // Christian perspective
    if (memory.christianPerspective) {
      sections.push(
        `## Preferências\n- Incluir perspectiva cristã quando relevante`
      );
    }

    const text = sections.length > 0 ? sections.join('\n\n') : '';

    // Rough token estimate: ~4 chars per token for Portuguese
    const tokenEstimate = Math.ceil(text.length / 4);

    return { text, tokenEstimate };
  }

  /**
   * Find user memory by user ID
   */
  async findByUserId(userId: string): Promise<UserMemory | null> {
    return this.userMemoryRepository.findByUserId(userId);
  }
}
