// packages/database/src/schema/enums.test.ts
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { describe, it, expect } from 'vitest';
import {
  // pgEnums
  userStatusEnum,
  userPlanEnum,
  lifeAreaEnum,
  trackingTypeEnum,
  exerciseIntensityEnum,
  exerciseTypeEnum,
  conversationTypeEnum,
  messageRoleEnum,
  relationshipTypeEnum,
  interactionTypeEnum,
  vaultItemTypeEnum,
  vaultCategoryEnum,
  goalStatusEnum,
  habitFrequencyEnum,
  notificationTypeEnum,
  notificationStatusEnum,
  expenseCategoryEnum,
  subscriptionStatusEnum,
  exportStatusEnum,
  exportTypeEnum,
  // Types
  type UserStatus,
  type UserPlan,
  type LifeArea,
  type TrackingType,
  type ExerciseIntensity,
  type ExerciseType,
  type ConversationType,
  type MessageRole,
  type RelationshipType,
  type InteractionType,
  type VaultItemType,
  type VaultCategory,
  type GoalStatus,
  type HabitFrequency,
  type NotificationType,
  type NotificationStatus,
  type ExpenseCategory,
  type SubscriptionStatus,
  type ExportStatus,
  type ExportType,
} from './enums';

describe('enums', () => {
  describe('userStatusEnum', () => {
    it('should have correct enum name', () => {
      expect(userStatusEnum.enumName).toBe('user_status');
    });

    it('should have all expected values', () => {
      expect(userStatusEnum.enumValues).toEqual([
        'pending',
        'active',
        'suspended',
        'canceled',
        'deleted',
      ]);
    });

    it('should export correct TypeScript type', () => {
      const status: UserStatus = 'active';
      expect(userStatusEnum.enumValues).toContain(status);
    });
  });

  describe('userPlanEnum', () => {
    it('should have correct enum name', () => {
      expect(userPlanEnum.enumName).toBe('user_plan');
    });

    it('should have all expected values', () => {
      expect(userPlanEnum.enumValues).toEqual(['free', 'pro', 'premium']);
    });

    it('should export correct TypeScript type', () => {
      const plan: UserPlan = 'pro';
      expect(userPlanEnum.enumValues).toContain(plan);
    });
  });

  describe('lifeAreaEnum', () => {
    it('should have correct enum name', () => {
      expect(lifeAreaEnum.enumName).toBe('life_area');
    });

    it('should have exactly 8 life areas', () => {
      expect(lifeAreaEnum.enumValues).toHaveLength(8);
    });

    it('should have all expected values', () => {
      expect(lifeAreaEnum.enumValues).toEqual([
        'health',
        'financial',
        'relationships',
        'career',
        'personal_growth',
        'leisure',
        'spirituality',
        'mental_health',
      ]);
    });

    it('should export correct TypeScript type', () => {
      const area: LifeArea = 'health';
      expect(lifeAreaEnum.enumValues).toContain(area);
    });
  });

  describe('trackingTypeEnum', () => {
    it('should have correct enum name', () => {
      expect(trackingTypeEnum.enumName).toBe('tracking_type');
    });

    it('should have 11 tracking types', () => {
      expect(trackingTypeEnum.enumValues).toHaveLength(11);
    });

    it('should have all expected values', () => {
      expect(trackingTypeEnum.enumValues).toEqual([
        'weight',
        'water',
        'sleep',
        'exercise',
        'expense',
        'income',
        'investment',
        'habit',
        'mood',
        'energy',
        'custom',
      ]);
    });

    it('should export correct TypeScript type', () => {
      const type: TrackingType = 'weight';
      expect(trackingTypeEnum.enumValues).toContain(type);
    });
  });

  describe('exerciseIntensityEnum', () => {
    it('should have correct enum name', () => {
      expect(exerciseIntensityEnum.enumName).toBe('exercise_intensity');
    });

    it('should have all expected values', () => {
      expect(exerciseIntensityEnum.enumValues).toEqual(['low', 'medium', 'high']);
    });

    it('should export correct TypeScript type', () => {
      const intensity: ExerciseIntensity = 'medium';
      expect(exerciseIntensityEnum.enumValues).toContain(intensity);
    });
  });

  describe('exerciseTypeEnum', () => {
    it('should have correct enum name', () => {
      expect(exerciseTypeEnum.enumName).toBe('exercise_type');
    });

    it('should have all expected values', () => {
      expect(exerciseTypeEnum.enumValues).toEqual([
        'cardio',
        'strength',
        'flexibility',
        'sports',
        'other',
      ]);
    });

    it('should export correct TypeScript type', () => {
      const type: ExerciseType = 'cardio';
      expect(exerciseTypeEnum.enumValues).toContain(type);
    });
  });

  describe('conversationTypeEnum', () => {
    it('should have correct enum name', () => {
      expect(conversationTypeEnum.enumName).toBe('conversation_type');
    });

    it('should have all expected values', () => {
      expect(conversationTypeEnum.enumValues).toEqual([
        'general',
        'counselor',
        'quick_action',
        'report',
      ]);
    });

    it('should export correct TypeScript type', () => {
      const type: ConversationType = 'general';
      expect(conversationTypeEnum.enumValues).toContain(type);
    });
  });

  describe('messageRoleEnum', () => {
    it('should have correct enum name', () => {
      expect(messageRoleEnum.enumName).toBe('message_role');
    });

    it('should have all expected values', () => {
      expect(messageRoleEnum.enumValues).toEqual(['user', 'assistant', 'system']);
    });

    it('should export correct TypeScript type', () => {
      const role: MessageRole = 'user';
      expect(messageRoleEnum.enumValues).toContain(role);
    });
  });

  describe('relationshipTypeEnum', () => {
    it('should have correct enum name', () => {
      expect(relationshipTypeEnum.enumName).toBe('relationship_type');
    });

    it('should have all expected values', () => {
      expect(relationshipTypeEnum.enumValues).toEqual([
        'family',
        'friend',
        'work',
        'acquaintance',
        'romantic',
        'mentor',
        'other',
      ]);
    });

    it('should export correct TypeScript type', () => {
      const type: RelationshipType = 'family';
      expect(relationshipTypeEnum.enumValues).toContain(type);
    });
  });

  describe('interactionTypeEnum', () => {
    it('should have correct enum name', () => {
      expect(interactionTypeEnum.enumName).toBe('interaction_type');
    });

    it('should have all expected values', () => {
      expect(interactionTypeEnum.enumValues).toEqual([
        'call',
        'message',
        'meeting',
        'email',
        'gift',
        'other',
      ]);
    });

    it('should export correct TypeScript type', () => {
      const type: InteractionType = 'call';
      expect(interactionTypeEnum.enumValues).toContain(type);
    });
  });

  describe('vaultItemTypeEnum', () => {
    it('should have correct enum name', () => {
      expect(vaultItemTypeEnum.enumName).toBe('vault_item_type');
    });

    it('should have all expected values', () => {
      expect(vaultItemTypeEnum.enumValues).toEqual([
        'credential',
        'document',
        'card',
        'note',
        'file',
      ]);
    });

    it('should export correct TypeScript type', () => {
      const type: VaultItemType = 'credential';
      expect(vaultItemTypeEnum.enumValues).toContain(type);
    });
  });

  describe('vaultCategoryEnum', () => {
    it('should have correct enum name', () => {
      expect(vaultCategoryEnum.enumName).toBe('vault_category');
    });

    it('should have all expected values', () => {
      expect(vaultCategoryEnum.enumValues).toEqual([
        'personal',
        'financial',
        'work',
        'health',
        'legal',
        'other',
      ]);
    });

    it('should export correct TypeScript type', () => {
      const category: VaultCategory = 'personal';
      expect(vaultCategoryEnum.enumValues).toContain(category);
    });
  });

  describe('goalStatusEnum', () => {
    it('should have correct enum name', () => {
      expect(goalStatusEnum.enumName).toBe('goal_status');
    });

    it('should have all expected values', () => {
      expect(goalStatusEnum.enumValues).toEqual([
        'not_started',
        'in_progress',
        'completed',
        'failed',
        'canceled',
      ]);
    });

    it('should export correct TypeScript type', () => {
      const status: GoalStatus = 'in_progress';
      expect(goalStatusEnum.enumValues).toContain(status);
    });
  });

  describe('habitFrequencyEnum', () => {
    it('should have correct enum name', () => {
      expect(habitFrequencyEnum.enumName).toBe('habit_frequency');
    });

    it('should have all expected values', () => {
      expect(habitFrequencyEnum.enumValues).toEqual(['daily', 'weekly', 'custom']);
    });

    it('should export correct TypeScript type', () => {
      const frequency: HabitFrequency = 'daily';
      expect(habitFrequencyEnum.enumValues).toContain(frequency);
    });
  });

  describe('notificationTypeEnum', () => {
    it('should have correct enum name', () => {
      expect(notificationTypeEnum.enumName).toBe('notification_type');
    });

    it('should have all expected values', () => {
      expect(notificationTypeEnum.enumValues).toEqual([
        'reminder',
        'alert',
        'report',
        'insight',
        'milestone',
        'social',
      ]);
    });

    it('should export correct TypeScript type', () => {
      const type: NotificationType = 'reminder';
      expect(notificationTypeEnum.enumValues).toContain(type);
    });
  });

  describe('notificationStatusEnum', () => {
    it('should have correct enum name', () => {
      expect(notificationStatusEnum.enumName).toBe('notification_status');
    });

    it('should have all expected values', () => {
      expect(notificationStatusEnum.enumValues).toEqual([
        'pending',
        'sent',
        'read',
        'dismissed',
      ]);
    });

    it('should export correct TypeScript type', () => {
      const status: NotificationStatus = 'pending';
      expect(notificationStatusEnum.enumValues).toContain(status);
    });
  });

  describe('expenseCategoryEnum', () => {
    it('should have correct enum name', () => {
      expect(expenseCategoryEnum.enumName).toBe('expense_category');
    });

    it('should have 13 expense categories', () => {
      expect(expenseCategoryEnum.enumValues).toHaveLength(13);
    });

    it('should have all expected values', () => {
      expect(expenseCategoryEnum.enumValues).toEqual([
        'food',
        'transport',
        'housing',
        'health',
        'education',
        'entertainment',
        'shopping',
        'bills',
        'subscriptions',
        'travel',
        'gifts',
        'investments',
        'other',
      ]);
    });

    it('should export correct TypeScript type', () => {
      const category: ExpenseCategory = 'food';
      expect(expenseCategoryEnum.enumValues).toContain(category);
    });
  });

  describe('subscriptionStatusEnum', () => {
    it('should have correct enum name', () => {
      expect(subscriptionStatusEnum.enumName).toBe('subscription_status');
    });

    it('should have all expected values', () => {
      expect(subscriptionStatusEnum.enumValues).toEqual([
        'active',
        'past_due',
        'canceled',
        'incomplete',
        'incomplete_expired',
        'trialing',
        'unpaid',
        'paused',
      ]);
    });

    it('should export correct TypeScript type', () => {
      const status: SubscriptionStatus = 'active';
      expect(subscriptionStatusEnum.enumValues).toContain(status);
    });
  });

  describe('exportStatusEnum', () => {
    it('should have correct enum name', () => {
      expect(exportStatusEnum.enumName).toBe('export_status');
    });

    it('should have all expected values', () => {
      expect(exportStatusEnum.enumValues).toEqual([
        'pending',
        'processing',
        'completed',
        'failed',
        'expired',
      ]);
    });

    it('should export correct TypeScript type', () => {
      const status: ExportStatus = 'pending';
      expect(exportStatusEnum.enumValues).toContain(status);
    });
  });

  describe('exportTypeEnum', () => {
    it('should have correct enum name', () => {
      expect(exportTypeEnum.enumName).toBe('export_type');
    });

    it('should have all expected values', () => {
      expect(exportTypeEnum.enumValues).toEqual([
        'full_data',
        'partial_data',
        'deletion_request',
      ]);
    });

    it('should export correct TypeScript type', () => {
      const type: ExportType = 'full_data';
      expect(exportTypeEnum.enumValues).toContain(type);
    });
  });

  describe('total enum count', () => {
    it('should have exactly 20 enums defined', () => {
      const allEnums = [
        userStatusEnum,
        userPlanEnum,
        lifeAreaEnum,
        trackingTypeEnum,
        exerciseIntensityEnum,
        exerciseTypeEnum,
        conversationTypeEnum,
        messageRoleEnum,
        relationshipTypeEnum,
        interactionTypeEnum,
        vaultItemTypeEnum,
        vaultCategoryEnum,
        goalStatusEnum,
        habitFrequencyEnum,
        notificationTypeEnum,
        notificationStatusEnum,
        expenseCategoryEnum,
        subscriptionStatusEnum,
        exportStatusEnum,
        exportTypeEnum,
      ];
      expect(allEnums).toHaveLength(20);
    });
  });
});
