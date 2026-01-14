import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { LifeArea, UserStatus } from '@life-assistant/shared';

// Mock the database package
vi.mock('@life-assistant/database', () => ({
  eq: vi.fn((field: unknown, value: unknown) => ({ field, value })),
  safeParseUserPreferences: vi.fn(),
}));

// Import after mocking
import { OnboardingService } from '../../../../src/modules/onboarding/application/services/onboarding.service.js';
import { safeParseUserPreferences } from '@life-assistant/database';

/**
 * Create a mock user for testing
 */
function createMockUser(overrides: Partial<{
  id: string;
  name: string | null;
  email: string;
  timezone: string;
  status: UserStatus;
  preferences: unknown;
  onboardingCompletedAt: Date | null;
}> = {}) {
  return {
    id: 'user-123',
    name: null,
    email: 'test@example.com',
    timezone: 'UTC',
    status: UserStatus.PENDING,
    preferences: null,
    onboardingCompletedAt: null,
    ...overrides,
  };
}

/**
 * Create default onboarding preferences for testing
 */
function createDefaultPrefs() {
  return {
    onboarding: {
      profileComplete: false,
      areasComplete: false,
      telegramComplete: false,
      telegramSkipped: false,
      tutorialComplete: false,
      tutorialSkipped: false,
    },
    areaWeights: {
      health: 1.0,
      financial: 1.0,
      career: 1.0,
      relationships: 1.0,
      spirituality: 0.5,
      personal_growth: 0.8,
      mental_health: 1.0,
      leisure: 0.8,
    },
    notifications: {
      emailEnabled: true,
      pushEnabled: true,
      telegramEnabled: false,
    },
  };
}

describe('OnboardingService', () => {
  let onboardingService: OnboardingService;
  let mockDatabaseService: {
    schema: { users: object };
    withUserId: ReturnType<typeof vi.fn>;
    withUserTransaction: ReturnType<typeof vi.fn>;
  };
  let mockLogger: {
    setContext: ReturnType<typeof vi.fn>;
    debug: ReturnType<typeof vi.fn>;
    log: ReturnType<typeof vi.fn>;
    error: ReturnType<typeof vi.fn>;
  };
  let mockConsolidationScheduler: {
    refreshSchedulers: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Create mock database service
    mockDatabaseService = {
      schema: { users: {} },
      withUserId: vi.fn(),
      withUserTransaction: vi.fn(),
    };

    // Create mock logger
    mockLogger = {
      setContext: vi.fn(),
      debug: vi.fn(),
      log: vi.fn(),
      error: vi.fn(),
    };

    // Create mock consolidation scheduler
    mockConsolidationScheduler = {
      refreshSchedulers: vi.fn().mockResolvedValue(undefined),
    };

    // Create service instance with mocks
    onboardingService = new OnboardingService(
      mockDatabaseService as unknown as ConstructorParameters<typeof OnboardingService>[0],
      mockLogger as unknown as ConstructorParameters<typeof OnboardingService>[1],
      mockConsolidationScheduler as unknown as ConstructorParameters<typeof OnboardingService>[2],
    );
  });

  describe('getOnboardingStatus', () => {
    it('should_return_status_for_new_user', async () => {
      const mockUser = createMockUser();
      const mockPrefs = createDefaultPrefs();

      mockDatabaseService.withUserId.mockImplementation(async (_userId, callback) => {
        return callback({
          select: () => ({
            from: () => ({
              where: () => ({
                limit: () => Promise.resolve([mockUser]),
              }),
            }),
          }),
        });
      });

      vi.mocked(safeParseUserPreferences).mockReturnValue(mockPrefs);

      const status = await onboardingService.getOnboardingStatus('user-123');

      expect(status.currentStep).toBe('profile');
      expect(status.completedSteps).toEqual([]);
      expect(status.isComplete).toBe(false);
    });

    it('should_return_areas_as_current_step_when_profile_complete', async () => {
      const mockUser = createMockUser({ name: 'Test User' });
      const mockPrefs = createDefaultPrefs();
      mockPrefs.onboarding.profileComplete = true;

      mockDatabaseService.withUserId.mockImplementation(async (_userId, callback) => {
        return callback({
          select: () => ({
            from: () => ({
              where: () => ({
                limit: () => Promise.resolve([mockUser]),
              }),
            }),
          }),
        });
      });

      vi.mocked(safeParseUserPreferences).mockReturnValue(mockPrefs);

      const status = await onboardingService.getOnboardingStatus('user-123');

      expect(status.currentStep).toBe('areas');
      expect(status.completedSteps).toContain('profile');
    });

    it('should_return_completed_status_when_all_steps_done', async () => {
      const mockUser = createMockUser({
        name: 'Test User',
        onboardingCompletedAt: new Date(),
      });
      const mockPrefs = createDefaultPrefs();
      mockPrefs.onboarding = {
        profileComplete: true,
        areasComplete: true,
        telegramComplete: true,
        telegramSkipped: false,
        tutorialComplete: true,
        tutorialSkipped: false,
      };

      mockDatabaseService.withUserId.mockImplementation(async (_userId, callback) => {
        return callback({
          select: () => ({
            from: () => ({
              where: () => ({
                limit: () => Promise.resolve([mockUser]),
              }),
            }),
          }),
        });
      });

      vi.mocked(safeParseUserPreferences).mockReturnValue(mockPrefs);

      const status = await onboardingService.getOnboardingStatus('user-123');

      expect(status.isComplete).toBe(true);
      expect(status.completedSteps).toEqual(['profile', 'areas', 'telegram', 'tutorial']);
    });

    it('should_throw_when_user_not_found', async () => {
      mockDatabaseService.withUserId.mockImplementation(async (_userId, callback) => {
        return callback({
          select: () => ({
            from: () => ({
              where: () => ({
                limit: () => Promise.resolve([]),
              }),
            }),
          }),
        });
      });

      await expect(onboardingService.getOnboardingStatus('nonexistent')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('saveProfileStep', () => {
    it('should_save_profile_data_and_return_next_step', async () => {
      const mockUser = createMockUser();
      const mockPrefs = createDefaultPrefs();
      const mockUpdate = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      });

      mockDatabaseService.withUserId.mockImplementation(async (_userId, callback) => {
        return callback({
          select: () => ({
            from: () => ({
              where: () => ({
                limit: () => Promise.resolve([mockUser]),
              }),
            }),
          }),
        });
      });

      mockDatabaseService.withUserTransaction.mockImplementation(async (_userId, callback) => {
        return callback({
          update: mockUpdate,
        });
      });

      vi.mocked(safeParseUserPreferences).mockReturnValue(mockPrefs);

      const result = await onboardingService.saveProfileStep('user-123', {
        name: 'Test User',
        timezone: 'America/Sao_Paulo',
      });

      expect(result.success).toBe(true);
      expect(result.nextStep).toBe('areas');
      expect(mockDatabaseService.withUserTransaction).toHaveBeenCalledWith(
        'user-123',
        expect.any(Function),
      );
    });

    it('should_throw_when_user_not_found', async () => {
      mockDatabaseService.withUserId.mockImplementation(async (_userId, callback) => {
        return callback({
          select: () => ({
            from: () => ({
              where: () => ({
                limit: () => Promise.resolve([]),
              }),
            }),
          }),
        });
      });

      await expect(
        onboardingService.saveProfileStep('nonexistent', {
          name: 'Test',
          timezone: 'UTC',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('saveAreasStep', () => {
    it('should_save_areas_with_correct_weights', async () => {
      const mockUser = createMockUser({ name: 'Test User' });
      const mockPrefs = createDefaultPrefs();
      mockPrefs.onboarding.profileComplete = true;

      let savedPreferences: unknown = null;
      const mockUpdate = vi.fn().mockReturnValue({
        set: vi.fn().mockImplementation((data: { preferences: unknown }) => {
          savedPreferences = data.preferences;
          return {
            where: vi.fn().mockResolvedValue(undefined),
          };
        }),
      });

      mockDatabaseService.withUserId.mockImplementation(async (_userId, callback) => {
        return callback({
          select: () => ({
            from: () => ({
              where: () => ({
                limit: () => Promise.resolve([mockUser]),
              }),
            }),
          }),
        });
      });

      mockDatabaseService.withUserTransaction.mockImplementation(async (_userId, callback) => {
        return callback({
          update: mockUpdate,
        });
      });

      vi.mocked(safeParseUserPreferences).mockReturnValue(mockPrefs);

      const selectedAreas = [LifeArea.HEALTH, LifeArea.FINANCIAL, LifeArea.CAREER];

      const result = await onboardingService.saveAreasStep('user-123', {
        areas: selectedAreas,
      });

      expect(result.success).toBe(true);
      expect(result.nextStep).toBe('telegram');
      expect(savedPreferences).toBeDefined();

      const prefs = savedPreferences as { areaWeights: Record<string, number> };
      expect(prefs.areaWeights.health).toBe(1.0);
      expect(prefs.areaWeights.financial).toBe(1.0);
      expect(prefs.areaWeights.career).toBe(1.0);
      expect(prefs.areaWeights.relationships).toBe(0.0);
      expect(prefs.areaWeights.leisure).toBe(0.0);
    });
  });

  describe('saveTelegramStep', () => {
    it('should_save_telegram_connection', async () => {
      const mockUser = createMockUser({ name: 'Test User' });
      const mockPrefs = createDefaultPrefs();
      mockPrefs.onboarding.profileComplete = true;
      mockPrefs.onboarding.areasComplete = true;

      const mockUpdate = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      });

      mockDatabaseService.withUserId.mockImplementation(async (_userId, callback) => {
        return callback({
          select: () => ({
            from: () => ({
              where: () => ({
                limit: () => Promise.resolve([mockUser]),
              }),
            }),
          }),
        });
      });

      mockDatabaseService.withUserTransaction.mockImplementation(async (_userId, callback) => {
        return callback({
          update: mockUpdate,
        });
      });

      vi.mocked(safeParseUserPreferences).mockReturnValue(mockPrefs);

      const result = await onboardingService.saveTelegramStep('user-123', {
        telegramId: 'telegram-123',
        skipped: false,
      });

      expect(result.success).toBe(true);
      expect(result.nextStep).toBe('tutorial');
    });

    it('should_handle_skipped_telegram', async () => {
      const mockUser = createMockUser({ name: 'Test User' });
      const mockPrefs = createDefaultPrefs();

      const mockUpdate = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      });

      mockDatabaseService.withUserId.mockImplementation(async (_userId, callback) => {
        return callback({
          select: () => ({
            from: () => ({
              where: () => ({
                limit: () => Promise.resolve([mockUser]),
              }),
            }),
          }),
        });
      });

      mockDatabaseService.withUserTransaction.mockImplementation(async (_userId, callback) => {
        return callback({
          update: mockUpdate,
        });
      });

      vi.mocked(safeParseUserPreferences).mockReturnValue(mockPrefs);

      const result = await onboardingService.saveTelegramStep('user-123', {
        skipped: true,
      });

      expect(result.success).toBe(true);
      expect(result.nextStep).toBe('tutorial');
    });
  });

  describe('completeOnboarding', () => {
    it('should_complete_onboarding_when_required_steps_done', async () => {
      const mockUser = createMockUser({ name: 'Test User' });
      const mockPrefs = createDefaultPrefs();
      mockPrefs.onboarding.profileComplete = true;
      mockPrefs.onboarding.areasComplete = true;

      const mockUpdate = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      });

      mockDatabaseService.withUserId.mockImplementation(async (_userId, callback) => {
        return callback({
          select: () => ({
            from: () => ({
              where: () => ({
                limit: () => Promise.resolve([mockUser]),
              }),
            }),
          }),
        });
      });

      mockDatabaseService.withUserTransaction.mockImplementation(async (_userId, callback) => {
        return callback({
          update: mockUpdate,
        });
      });

      vi.mocked(safeParseUserPreferences).mockReturnValue(mockPrefs);

      const result = await onboardingService.completeOnboarding('user-123');

      expect(result.success).toBe(true);
      expect(result.redirectTo).toBe('/dashboard');
    });

    it('should_throw_when_required_steps_not_complete', async () => {
      const mockUser = createMockUser();
      const mockPrefs = createDefaultPrefs();
      // Only profile is complete, areas is not

      mockDatabaseService.withUserId.mockImplementation(async (_userId, callback) => {
        return callback({
          select: () => ({
            from: () => ({
              where: () => ({
                limit: () => Promise.resolve([mockUser]),
              }),
            }),
          }),
        });
      });

      vi.mocked(safeParseUserPreferences).mockReturnValue(mockPrefs);

      await expect(onboardingService.completeOnboarding('user-123')).rejects.toThrow(
        'Required steps (profile, areas) must be completed before finishing onboarding',
      );
    });

    it('should_handle_skipped_tutorial', async () => {
      const mockUser = createMockUser({ name: 'Test User' });
      const mockPrefs = createDefaultPrefs();
      mockPrefs.onboarding.profileComplete = true;
      mockPrefs.onboarding.areasComplete = true;

      let savedPreferences: unknown = null;
      const mockUpdate = vi.fn().mockReturnValue({
        set: vi.fn().mockImplementation((data: { preferences: unknown }) => {
          savedPreferences = data.preferences;
          return {
            where: vi.fn().mockResolvedValue(undefined),
          };
        }),
      });

      mockDatabaseService.withUserId.mockImplementation(async (_userId, callback) => {
        return callback({
          select: () => ({
            from: () => ({
              where: () => ({
                limit: () => Promise.resolve([mockUser]),
              }),
            }),
          }),
        });
      });

      mockDatabaseService.withUserTransaction.mockImplementation(async (_userId, callback) => {
        return callback({
          update: mockUpdate,
        });
      });

      vi.mocked(safeParseUserPreferences).mockReturnValue(mockPrefs);

      const result = await onboardingService.completeOnboarding('user-123', true);

      expect(result.success).toBe(true);
      expect(savedPreferences).toBeDefined();

      const prefs = savedPreferences as { onboarding: { tutorialSkipped: boolean } };
      expect(prefs.onboarding.tutorialSkipped).toBe(true);
    });
  });

  describe('isOnboardingComplete', () => {
    it('should_return_false_for_incomplete_onboarding', async () => {
      const mockUser = createMockUser();

      mockDatabaseService.withUserId.mockImplementation(async (_userId, callback) => {
        return callback({
          select: () => ({
            from: () => ({
              where: () => ({
                limit: () => Promise.resolve([mockUser]),
              }),
            }),
          }),
        });
      });

      const result = await onboardingService.isOnboardingComplete('user-123');

      expect(result).toBe(false);
    });

    it('should_return_true_for_completed_onboarding', async () => {
      const mockUser = createMockUser({
        onboardingCompletedAt: new Date(),
      });

      mockDatabaseService.withUserId.mockImplementation(async (_userId, callback) => {
        return callback({
          select: () => ({
            from: () => ({
              where: () => ({
                limit: () => Promise.resolve([mockUser]),
              }),
            }),
          }),
        });
      });

      const result = await onboardingService.isOnboardingComplete('user-123');

      expect(result).toBe(true);
    });
  });
});
