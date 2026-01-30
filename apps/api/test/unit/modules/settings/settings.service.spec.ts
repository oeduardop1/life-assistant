import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { SettingsService } from '../../../../src/modules/settings/application/services/settings.service.js';

describe('SettingsService', () => {
  let settingsService: SettingsService;
  let mockDatabaseService: {
    withUserId: ReturnType<typeof vi.fn>;
    schema: {
      users: { id: string; name: string; email: string };
    };
  };
  let mockSupabaseAuth: {
    verifyPassword: ReturnType<typeof vi.fn>;
    updateEmail: ReturnType<typeof vi.fn>;
    updatePassword: ReturnType<typeof vi.fn>;
  };
  let mockEmailService: {
    sendEmailChangeNotification: ReturnType<typeof vi.fn>;
    sendPasswordChangeNotification: ReturnType<typeof vi.fn>;
  };
  let mockLogger: {
    setContext: ReturnType<typeof vi.fn>;
    log: ReturnType<typeof vi.fn>;
    debug: ReturnType<typeof vi.fn>;
    error: ReturnType<typeof vi.fn>;
  };

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
  };

  // Helper to create a chainable mock for drizzle queries
  const createQueryChainMock = (result: unknown[]) => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue(result),
      update: vi.fn().mockReturnThis(),
      set: vi.fn().mockReturnThis(),
    };
    return chain;
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock database service - returns user by default
    const defaultDbChain = createQueryChainMock([mockUser]);
    mockDatabaseService = {
      withUserId: vi.fn().mockImplementation(async (_userId, callback) => {
        return callback(defaultDbChain);
      }),
      schema: {
        users: { id: 'id', name: 'name', email: 'email' },
      },
    };

    mockSupabaseAuth = {
      verifyPassword: vi.fn(),
      updateEmail: vi.fn(),
      updatePassword: vi.fn(),
    };

    mockEmailService = {
      sendEmailChangeNotification: vi.fn(),
      sendPasswordChangeNotification: vi.fn(),
    };

    mockLogger = {
      setContext: vi.fn(),
      log: vi.fn(),
      debug: vi.fn(),
      error: vi.fn(),
    };

    settingsService = new SettingsService(
      mockDatabaseService as unknown as ConstructorParameters<typeof SettingsService>[0],
      mockSupabaseAuth as unknown as ConstructorParameters<typeof SettingsService>[1],
      mockEmailService as unknown as ConstructorParameters<typeof SettingsService>[2],
      mockLogger as unknown as ConstructorParameters<typeof SettingsService>[3],
    );
  });

  describe('getUserSettings', () => {
    it('should return user settings', async () => {
      const result = await settingsService.getUserSettings('user-123');

      expect(result).toEqual({
        name: 'Test User',
        email: 'test@example.com',
      });
      expect(mockDatabaseService.withUserId).toHaveBeenCalledWith('user-123', expect.any(Function));
    });

    it('should throw when user not found', async () => {
      // Return empty array (no user found)
      mockDatabaseService.withUserId.mockImplementation(async (_userId, callback) => {
        return callback(createQueryChainMock([]));
      });

      await expect(settingsService.getUserSettings('user-123')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('updateProfile', () => {
    it('should update profile name', async () => {
      // Mock for getUserById (first call) and update (second call)
      let callCount = 0;
      mockDatabaseService.withUserId.mockImplementation(async (_userId, callback) => {
        callCount++;
        if (callCount === 1) {
          // getUserById
          return callback(createQueryChainMock([mockUser]));
        } else {
          // update call
          const updateChain = createQueryChainMock([]);
          updateChain.update = vi.fn().mockReturnValue({
            set: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue(undefined),
            }),
          });
          return callback(updateChain);
        }
      });

      const result = await settingsService.updateProfile('user-123', {
        name: 'New Name',
      });

      expect(result.success).toBe(true);
      expect(mockDatabaseService.withUserId).toHaveBeenCalledTimes(2);
    });

    it('should throw when user not found', async () => {
      mockDatabaseService.withUserId.mockImplementation(async (_userId, callback) => {
        return callback(createQueryChainMock([]));
      });

      await expect(
        settingsService.updateProfile('user-123', { name: 'Test' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateEmail', () => {
    it('should update email when password is valid', async () => {
      // First call: getUserById, Second call: isEmailInUse check
      let callCount = 0;
      mockDatabaseService.withUserId.mockImplementation(async (_userId, callback) => {
        callCount++;
        if (callCount === 1) {
          // getUserById returns user
          return callback(createQueryChainMock([mockUser]));
        } else {
          // isEmailInUse returns empty (email not in use)
          return callback(createQueryChainMock([]));
        }
      });
      mockSupabaseAuth.verifyPassword.mockResolvedValue(true);
      mockSupabaseAuth.updateEmail.mockResolvedValue({ success: true });
      mockEmailService.sendEmailChangeNotification.mockResolvedValue(undefined);

      const result = await settingsService.updateEmail('user-123', {
        newEmail: 'new@example.com',
        currentPassword: 'password123',
      });

      expect(result.success).toBe(true);
      expect(mockSupabaseAuth.updateEmail).toHaveBeenCalledWith('user-123', 'new@example.com');
      expect(mockEmailService.sendEmailChangeNotification).toHaveBeenCalledWith(
        'test@example.com',
        'new@example.com',
        'Test User',
      );
    });

    it('should throw when new email is same as current', async () => {
      await expect(
        settingsService.updateEmail('user-123', {
          newEmail: 'test@example.com',
          currentPassword: 'password123',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw when password is invalid', async () => {
      mockSupabaseAuth.verifyPassword.mockResolvedValue(false);

      await expect(
        settingsService.updateEmail('user-123', {
          newEmail: 'new@example.com',
          currentPassword: 'wrongpassword',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw when email is already in use', async () => {
      // First call: getUserById, Second call: isEmailInUse returns existing user
      let callCount = 0;
      mockDatabaseService.withUserId.mockImplementation(async (_userId, callback) => {
        callCount++;
        if (callCount === 1) {
          return callback(createQueryChainMock([mockUser]));
        } else {
          // isEmailInUse returns a user (email is in use)
          return callback(createQueryChainMock([{ id: 'other-user' }]));
        }
      });
      mockSupabaseAuth.verifyPassword.mockResolvedValue(true);

      await expect(
        settingsService.updateEmail('user-123', {
          newEmail: 'existing@example.com',
          currentPassword: 'password123',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('updatePassword', () => {
    it('should update password when current password is valid and new password is strong', async () => {
      // First call: verify current password (true)
      // Second call: check if new password is same as current (false)
      mockSupabaseAuth.verifyPassword
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false);
      mockSupabaseAuth.updatePassword.mockResolvedValue(undefined);
      mockEmailService.sendPasswordChangeNotification.mockResolvedValue(undefined);

      const result = await settingsService.updatePassword('user-123', {
        currentPassword: 'oldPassword123',
        newPassword: 'MyStr0ng!P@ssword2024',
      });

      expect(result.success).toBe(true);
      expect(mockSupabaseAuth.updatePassword).toHaveBeenCalledWith(
        'user-123',
        'MyStr0ng!P@ssword2024',
      );
      expect(mockEmailService.sendPasswordChangeNotification).toHaveBeenCalled();
    });

    it('should throw when current password is invalid', async () => {
      mockSupabaseAuth.verifyPassword.mockResolvedValue(false);

      await expect(
        settingsService.updatePassword('user-123', {
          currentPassword: 'wrongpassword',
          newPassword: 'newSecurePassword123!',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw when new password is same as current', async () => {
      // Both calls return true (current password valid, new password same as current)
      mockSupabaseAuth.verifyPassword
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(true);

      await expect(
        settingsService.updatePassword('user-123', {
          currentPassword: 'samePassword123!',
          newPassword: 'samePassword123!',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw when new password is too weak', async () => {
      mockSupabaseAuth.verifyPassword
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false);

      await expect(
        settingsService.updatePassword('user-123', {
          currentPassword: 'oldPassword123',
          newPassword: '12345678', // Very weak password
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('validatePasswordStrength', () => {
    it('should return low score for weak password', () => {
      const result = settingsService.validatePasswordStrength('password');
      expect(result.score).toBeLessThan(2);
    });

    it('should return high score for strong password', () => {
      const result = settingsService.validatePasswordStrength('MyStr0ng!P@ssword2024');
      expect(result.score).toBeGreaterThanOrEqual(2);
    });

    it('should consider user inputs when calculating strength', () => {
      const weakResult = settingsService.validatePasswordStrength('TestUser123', [
        'testuser@example.com',
        'Test User',
      ]);
      const strongResult = settingsService.validatePasswordStrength('Unr3l@tedP@ssword!', [
        'testuser@example.com',
        'Test User',
      ]);

      expect(strongResult.score).toBeGreaterThan(weakResult.score);
    });
  });
});
