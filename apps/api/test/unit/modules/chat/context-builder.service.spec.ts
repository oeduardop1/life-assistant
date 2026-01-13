import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the database package
vi.mock('@life-assistant/database', () => ({
  eq: vi.fn(() => 'eq-result'),
}));

import { ContextBuilderService } from '../../../../src/modules/chat/application/services/context-builder.service.js';

/**
 * Create a mock user for testing
 */
function createMockUser(
  overrides: Partial<{
    name: string | null;
    timezone: string;
  }> = {}
) {
  return {
    name: 'Test User',
    timezone: 'America/Sao_Paulo',
    ...overrides,
  };
}

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
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
  };
}

describe('ContextBuilderService', () => {
  let contextBuilderService: ContextBuilderService;
  let mockDatabaseService: {
    db: {
      select: ReturnType<typeof vi.fn>;
    };
    schema: { users: { id: unknown; name: unknown; timezone: unknown } };
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Create mock database service
    mockDatabaseService = {
      db: {
        select: vi.fn(),
      },
      schema: { users: { id: 'id-field', name: 'name-field', timezone: 'tz-field' } },
    };

    // Create service instance with mocks
    contextBuilderService = new ContextBuilderService(
      mockDatabaseService as unknown as ConstructorParameters<
        typeof ContextBuilderService
      >[0]
    );
  });

  describe('buildSystemPrompt', () => {
    it('should_build_system_prompt_for_general_conversation', async () => {
      const mockUser = createMockUser();
      const mockConversation = createMockConversation({ type: 'general' });

      mockDatabaseService.db.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockUser]),
          }),
        }),
      });

      const systemPrompt = await contextBuilderService.buildSystemPrompt(
        'user-123',
        mockConversation
      );

      expect(systemPrompt).toContain('Test User');
      expect(systemPrompt).toContain('America/Sao_Paulo');
      expect(systemPrompt).toContain('assistente pessoal de vida');
    });

    it('should_build_system_prompt_for_counselor_conversation', async () => {
      const mockUser = createMockUser();
      const mockConversation = createMockConversation({ type: 'counselor' });

      mockDatabaseService.db.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockUser]),
          }),
        }),
      });

      const systemPrompt = await contextBuilderService.buildSystemPrompt(
        'user-123',
        mockConversation
      );

      expect(systemPrompt).toContain('Test User');
      expect(systemPrompt).toContain('Conselheira');
    });

    it('should_handle_user_without_name', async () => {
      const mockUser = createMockUser({ name: null });
      const mockConversation = createMockConversation();

      mockDatabaseService.db.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockUser]),
          }),
        }),
      });

      const systemPrompt = await contextBuilderService.buildSystemPrompt(
        'user-123',
        mockConversation
      );

      // Should use fallback name
      expect(systemPrompt).toContain('Usuário');
    });

    it('should_throw_when_user_not_found', async () => {
      const mockConversation = createMockConversation();

      mockDatabaseService.db.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      await expect(
        contextBuilderService.buildSystemPrompt('nonexistent', mockConversation)
      ).rejects.toThrow('User not found');
    });

    it('should_include_timezone_in_context', async () => {
      const mockUser = createMockUser({ timezone: 'Europe/London' });
      const mockConversation = createMockConversation();

      mockDatabaseService.db.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockUser]),
          }),
        }),
      });

      const systemPrompt = await contextBuilderService.buildSystemPrompt(
        'user-123',
        mockConversation
      );

      expect(systemPrompt).toContain('Europe/London');
    });
  });
});
