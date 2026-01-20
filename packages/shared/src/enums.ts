/**
 * Enums compartilhados - docs/specs/data-model.md §3.2
 */

// UserStatus - Status do usuário no sistema
export enum UserStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  CANCELED = 'canceled',
  DELETED = 'deleted',
}

// LifeArea - 8 áreas de vida
export enum LifeArea {
  HEALTH = 'health',
  FINANCIAL = 'financial',
  CAREER = 'career',
  RELATIONSHIPS = 'relationships',
  SPIRITUALITY = 'spirituality',
  PERSONAL_GROWTH = 'personal_growth',
  MENTAL_HEALTH = 'mental_health',
  LEISURE = 'leisure',
}

// TrackingType - Tipos de métricas rastreáveis
// M2.1: weight, water, sleep, exercise, mood, energy, custom
// M2.4: habit
// M2.6: expense, income, investment
export enum TrackingType {
  WEIGHT = 'weight',
  WATER = 'water',
  SLEEP = 'sleep',
  EXERCISE = 'exercise',
  EXPENSE = 'expense',
  INCOME = 'income',
  INVESTMENT = 'investment',
  HABIT = 'habit',
  MOOD = 'mood',
  ENERGY = 'energy',
  CUSTOM = 'custom',
}

// ConversationType - Tipos de conversa com a IA
export enum ConversationType {
  GENERAL = 'general',
  COUNSELOR = 'counselor',
  QUICK_ACTION = 'quick_action',
  REPORT = 'report',
}

// VaultItemType - Tipos de itens no cofre
export enum VaultItemType {
  CREDENTIAL = 'credential',
  DOCUMENT = 'document',
  CARD = 'card',
  NOTE = 'note',
  FILE = 'file',
}

// VaultCategory - Categorias do cofre
export enum VaultCategory {
  PERSONAL = 'personal',
  FINANCIAL = 'financial',
  WORK = 'work',
  HEALTH = 'health',
  LEGAL = 'legal',
  OTHER = 'other',
}

// ExpenseCategory - Categorias de despesas - docs/specs/system.md §3.3
export enum ExpenseCategory {
  FOOD = 'food',
  TRANSPORT = 'transport',
  HOUSING = 'housing',
  HEALTH = 'health',
  EDUCATION = 'education',
  ENTERTAINMENT = 'entertainment',
  SHOPPING = 'shopping',
  BILLS = 'bills',
  SUBSCRIPTIONS = 'subscriptions',
  TRAVEL = 'travel',
  GIFTS = 'gifts',
  INVESTMENTS = 'investments',
  OTHER = 'other',
}

// Arrays para iteração
export const ALL_USER_STATUSES = Object.values(UserStatus);
export const ALL_LIFE_AREAS = Object.values(LifeArea);
export const ALL_TRACKING_TYPES = Object.values(TrackingType);
export const ALL_CONVERSATION_TYPES = Object.values(ConversationType);
export const ALL_VAULT_ITEM_TYPES = Object.values(VaultItemType);
export const ALL_VAULT_CATEGORIES = Object.values(VaultCategory);
export const ALL_EXPENSE_CATEGORIES = Object.values(ExpenseCategory);
