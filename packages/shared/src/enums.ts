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

// LifeArea - 6 áreas de vida (ADR-017)
export enum LifeArea {
  HEALTH = 'health',
  FINANCE = 'finance',
  PROFESSIONAL = 'professional',
  LEARNING = 'learning',
  SPIRITUAL = 'spiritual',
  RELATIONSHIPS = 'relationships',
}

// SubArea - Sub-áreas hierárquicas (ADR-017)
export enum SubArea {
  // health
  PHYSICAL = 'physical',
  MENTAL = 'mental',
  LEISURE = 'leisure',
  // finance
  BUDGET = 'budget',
  SAVINGS = 'savings',
  DEBTS = 'debts',
  INVESTMENTS = 'investments',
  // professional
  CAREER = 'career',
  BUSINESS = 'business',
  // learning
  FORMAL = 'formal',
  INFORMAL = 'informal',
  // spiritual
  PRACTICE = 'practice',
  COMMUNITY = 'community',
  // relationships
  FAMILY = 'family',
  ROMANTIC = 'romantic',
  SOCIAL = 'social',
}

// Mapping from SubArea to parent LifeArea
export const SUB_AREA_TO_LIFE_AREA: Record<SubArea, LifeArea> = {
  [SubArea.PHYSICAL]: LifeArea.HEALTH,
  [SubArea.MENTAL]: LifeArea.HEALTH,
  [SubArea.LEISURE]: LifeArea.HEALTH,
  [SubArea.BUDGET]: LifeArea.FINANCE,
  [SubArea.SAVINGS]: LifeArea.FINANCE,
  [SubArea.DEBTS]: LifeArea.FINANCE,
  [SubArea.INVESTMENTS]: LifeArea.FINANCE,
  [SubArea.CAREER]: LifeArea.PROFESSIONAL,
  [SubArea.BUSINESS]: LifeArea.PROFESSIONAL,
  [SubArea.FORMAL]: LifeArea.LEARNING,
  [SubArea.INFORMAL]: LifeArea.LEARNING,
  [SubArea.PRACTICE]: LifeArea.SPIRITUAL,
  [SubArea.COMMUNITY]: LifeArea.SPIRITUAL,
  [SubArea.FAMILY]: LifeArea.RELATIONSHIPS,
  [SubArea.ROMANTIC]: LifeArea.RELATIONSHIPS,
  [SubArea.SOCIAL]: LifeArea.RELATIONSHIPS,
};

// Sub-areas grouped by parent area
export const LIFE_AREA_SUB_AREAS: Record<LifeArea, SubArea[]> = {
  [LifeArea.HEALTH]: [SubArea.PHYSICAL, SubArea.MENTAL, SubArea.LEISURE],
  [LifeArea.FINANCE]: [SubArea.BUDGET, SubArea.SAVINGS, SubArea.DEBTS, SubArea.INVESTMENTS],
  [LifeArea.PROFESSIONAL]: [SubArea.CAREER, SubArea.BUSINESS],
  [LifeArea.LEARNING]: [SubArea.FORMAL, SubArea.INFORMAL],
  [LifeArea.SPIRITUAL]: [SubArea.PRACTICE, SubArea.COMMUNITY],
  [LifeArea.RELATIONSHIPS]: [SubArea.FAMILY, SubArea.ROMANTIC, SubArea.SOCIAL],
};

// TrackingType - Tipos de métricas rastreáveis (M2.1)
// 7 tipos: weight, water, sleep, exercise, mood, energy, custom
// Nota: Finance (expense, income, investment) usa módulo M2.2 separado
// Nota: Habits usa tabela própria (habits + habit_completions)
export enum TrackingType {
  WEIGHT = 'weight',
  WATER = 'water',
  SLEEP = 'sleep',
  EXERCISE = 'exercise',
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
export const ALL_SUB_AREAS = Object.values(SubArea);
export const ALL_TRACKING_TYPES = Object.values(TrackingType);
export const ALL_CONVERSATION_TYPES = Object.values(ConversationType);
export const ALL_VAULT_ITEM_TYPES = Object.values(VaultItemType);
export const ALL_VAULT_CATEGORIES = Object.values(VaultCategory);
export const ALL_EXPENSE_CATEGORIES = Object.values(ExpenseCategory);
