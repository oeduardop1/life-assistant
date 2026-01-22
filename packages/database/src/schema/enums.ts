// packages/database/src/schema/enums.ts
// 21 PostgreSQL enums as defined in docs/specs/data-model.md §3.2

import { pgEnum } from 'drizzle-orm/pg-core';

// ============================================================================
// User & Auth
// ============================================================================

export const userStatusEnum = pgEnum('user_status', [
  'pending',
  'active',
  'suspended',
  'canceled',
  'deleted',
]);

export const userPlanEnum = pgEnum('user_plan', ['free', 'pro', 'premium']);

// ============================================================================
// Life Areas (6 areas - ADR-017)
// ============================================================================

export const lifeAreaEnum = pgEnum('life_area', [
  'health',
  'finance',
  'professional',
  'learning',
  'spiritual',
  'relationships',
]);

// ============================================================================
// Sub Areas (ADR-017)
// ============================================================================

export const subAreaEnum = pgEnum('sub_area', [
  // health
  'physical',
  'mental',
  'leisure',
  // finance
  'budget',
  'savings',
  'debts',
  'investments',
  // professional
  'career',
  'business',
  // learning
  'formal',
  'informal',
  // spiritual
  'practice',
  'community',
  // relationships
  'family',
  'romantic',
  'social',
]);

// ============================================================================
// Tracking
// ============================================================================

export const trackingTypeEnum = pgEnum('tracking_type', [
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

export const exerciseIntensityEnum = pgEnum('exercise_intensity', [
  'low',
  'medium',
  'high',
]);

export const exerciseTypeEnum = pgEnum('exercise_type', [
  'cardio',
  'strength',
  'flexibility',
  'sports',
  'other',
]);

// ============================================================================
// Chat
// ============================================================================

export const conversationTypeEnum = pgEnum('conversation_type', [
  'general',
  'counselor',
  'quick_action',
  'report',
]);

export const messageRoleEnum = pgEnum('message_role', [
  'user',
  'assistant',
  'system',
]);

// ============================================================================
// People/CRM
// ============================================================================

export const relationshipTypeEnum = pgEnum('relationship_type', [
  'family',
  'friend',
  'work',
  'acquaintance',
  'romantic',
  'mentor',
  'other',
]);

export const interactionTypeEnum = pgEnum('interaction_type', [
  'call',
  'message',
  'meeting',
  'email',
  'gift',
  'other',
]);

// ============================================================================
// Vault
// ============================================================================

export const vaultItemTypeEnum = pgEnum('vault_item_type', [
  'credential',
  'document',
  'card',
  'note',
  'file',
]);

export const vaultCategoryEnum = pgEnum('vault_category', [
  'personal',
  'financial',
  'work',
  'health',
  'legal',
  'other',
]);

// ============================================================================
// Goals & Habits
// ============================================================================

export const goalStatusEnum = pgEnum('goal_status', [
  'not_started',
  'in_progress',
  'completed',
  'failed',
  'canceled',
]);

export const habitFrequencyEnum = pgEnum('habit_frequency', [
  'daily',
  'weekly',
  'custom',
]);

// ============================================================================
// Notifications
// ============================================================================

export const notificationTypeEnum = pgEnum('notification_type', [
  'reminder',
  'alert',
  'report',
  'insight',
  'milestone',
  'social',
]);

export const notificationStatusEnum = pgEnum('notification_status', [
  'pending',
  'sent',
  'read',
  'dismissed',
]);

// ============================================================================
// Finance
// ============================================================================

export const incomeTypeEnum = pgEnum('income_type', [
  'salary',
  'freelance',
  'bonus',
  'passive',
  'investment',
  'gift',
  'other',
]);

export const incomeFrequencyEnum = pgEnum('income_frequency', [
  'monthly',
  'biweekly',
  'weekly',
  'annual',
  'irregular',
]);

export const billCategoryEnum = pgEnum('bill_category', [
  'housing',
  'utilities',
  'subscription',
  'insurance',
  'other',
]);

export const billStatusEnum = pgEnum('bill_status', [
  'pending',
  'paid',
  'overdue',
  'canceled',
]);

export const expenseCategoryEnum = pgEnum('expense_category', [
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

export const debtStatusEnum = pgEnum('debt_status', [
  'active',
  'paid_off',
  'settled',
  'defaulted',
]);

export const investmentTypeEnum = pgEnum('investment_type', [
  'emergency_fund',
  'retirement',
  'short_term',
  'long_term',
  'education',
  'custom',
]);

// ============================================================================
// Subscriptions (Stripe)
// ============================================================================

export const subscriptionStatusEnum = pgEnum('subscription_status', [
  'active',
  'past_due',
  'canceled',
  'incomplete',
  'incomplete_expired',
  'trialing',
  'unpaid',
  'paused',
]);

// ============================================================================
// Memory System (ADR-012)
// ============================================================================

export const knowledgeItemTypeEnum = pgEnum('knowledge_item_type', [
  'fact',
  'preference',
  'memory',
  'insight',
  'person',
]);

export const knowledgeItemSourceEnum = pgEnum('knowledge_item_source', [
  'conversation',
  'user_input',
  'ai_inference',
]);

export const consolidationStatusEnum = pgEnum('consolidation_status', [
  'completed',
  'failed',
  'partial',
]);

// ============================================================================
// Exports (LGPD)
// ============================================================================

export const exportStatusEnum = pgEnum('export_status', [
  'pending',
  'processing',
  'completed',
  'failed',
  'expired',
]);

export const exportTypeEnum = pgEnum('export_type', [
  'full_data',
  'partial_data',
  'deletion_request',
]);

// ============================================================================
// TypeScript enum types for application use
// ============================================================================

export type UserStatus = (typeof userStatusEnum.enumValues)[number];
export type UserPlan = (typeof userPlanEnum.enumValues)[number];
export type LifeArea = (typeof lifeAreaEnum.enumValues)[number];
export type SubArea = (typeof subAreaEnum.enumValues)[number];
export type TrackingType = (typeof trackingTypeEnum.enumValues)[number];
export type ExerciseIntensity = (typeof exerciseIntensityEnum.enumValues)[number];
export type ExerciseType = (typeof exerciseTypeEnum.enumValues)[number];
export type ConversationType = (typeof conversationTypeEnum.enumValues)[number];
export type MessageRole = (typeof messageRoleEnum.enumValues)[number];
export type RelationshipType = (typeof relationshipTypeEnum.enumValues)[number];
export type InteractionType = (typeof interactionTypeEnum.enumValues)[number];
export type VaultItemType = (typeof vaultItemTypeEnum.enumValues)[number];
export type VaultCategory = (typeof vaultCategoryEnum.enumValues)[number];
export type GoalStatus = (typeof goalStatusEnum.enumValues)[number];
export type HabitFrequency = (typeof habitFrequencyEnum.enumValues)[number];
export type NotificationType = (typeof notificationTypeEnum.enumValues)[number];
export type NotificationStatus = (typeof notificationStatusEnum.enumValues)[number];
export type IncomeType = (typeof incomeTypeEnum.enumValues)[number];
export type IncomeFrequency = (typeof incomeFrequencyEnum.enumValues)[number];
export type BillCategory = (typeof billCategoryEnum.enumValues)[number];
export type BillStatus = (typeof billStatusEnum.enumValues)[number];
export type ExpenseCategory = (typeof expenseCategoryEnum.enumValues)[number];
export type DebtStatus = (typeof debtStatusEnum.enumValues)[number];
export type InvestmentType = (typeof investmentTypeEnum.enumValues)[number];
export type SubscriptionStatus = (typeof subscriptionStatusEnum.enumValues)[number];
export type ExportStatus = (typeof exportStatusEnum.enumValues)[number];
export type ExportType = (typeof exportTypeEnum.enumValues)[number];
export type KnowledgeItemType = (typeof knowledgeItemTypeEnum.enumValues)[number];
export type KnowledgeItemSource = (typeof knowledgeItemSourceEnum.enumValues)[number];
export type ConsolidationStatus = (typeof consolidationStatusEnum.enumValues)[number];
