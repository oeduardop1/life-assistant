/**
 * Memory Module Types
 *
 * Types for memory view and knowledge items management.
 * @see docs/milestones/phase-1-counselor.md M1.6 for Memory View implementation
 */

// =============================================================================
// Enums / Unions
// =============================================================================

export type KnowledgeItemType = 'fact' | 'preference' | 'memory' | 'insight' | 'person';

/**
 * Life areas (ADR-017: 6 main areas)
 */
export type LifeArea =
  | 'health'
  | 'finance'
  | 'professional'
  | 'learning'
  | 'spiritual'
  | 'relationships';

/**
 * Sub-areas (ADR-017: 17 sub-areas grouped by parent area)
 */
export type SubArea =
  // Health sub-areas
  | 'physical'
  | 'mental'
  | 'leisure'
  // Finance sub-areas
  | 'budget'
  | 'savings'
  | 'debts'
  | 'investments'
  // Professional sub-areas
  | 'career'
  | 'business'
  // Learning sub-areas
  | 'formal'
  | 'informal'
  // Spiritual sub-areas
  | 'practice'
  | 'community'
  // Relationships sub-areas
  | 'family'
  | 'romantic'
  | 'social';

export type KnowledgeItemSource = 'conversation' | 'user_input' | 'ai_inference';

export type ConfidenceLevel = 'high' | 'medium' | 'low';

// =============================================================================
// Entities
// =============================================================================

export interface KnowledgeItem {
  id: string;
  type: KnowledgeItemType;
  area: LifeArea | null;
  subArea: SubArea | null; // ADR-017
  title: string | null;
  content: string;
  source: KnowledgeItemSource;
  sourceRef: string | null;
  confidence: number;
  validatedByUser: boolean;
  tags: string[];
  createdAt: string;
  updatedAt: string;

  // Temporal tracking (M1.6.1)
  supersededById: string | null;
  supersededAt: string | null;
}

export interface UserMemory {
  id: string;
  userId: string;
  bio: string | null;
  occupation: string | null;
  familyContext: string | null;
  currentGoals: string[];
  currentChallenges: string[];
  topOfMind: string[];
  values: string[];
  communicationStyle: string | null;
  feedbackPreferences: string | null;
  christianPerspective: boolean;
  version: number;
  lastConsolidatedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// =============================================================================
// Statistics
// =============================================================================

export interface MemoryStats {
  byArea: Record<LifeArea, number>;
  byType: Record<KnowledgeItemType, number>;
  total: number;
}

// =============================================================================
// API Responses
// =============================================================================

export interface MemoryOverview {
  userMemory: UserMemory;
  stats: MemoryStats;
}

export interface KnowledgeItemListResponse {
  items: KnowledgeItem[];
  total: number;
  hasMore: boolean;
}

export interface ValidateItemResponse {
  success: boolean;
  id: string;
  confidence: number;
  validatedByUser: boolean;
}

export interface ExportMemoryResponse {
  items: KnowledgeItem[];
  total: number;
  exportedAt: string;

  // Temporal stats (M1.6.1)
  stats: {
    active: number;
    superseded: number;
  };
}

// =============================================================================
// Filter & Query Params
// =============================================================================

export interface ListItemsFilters {
  type?: KnowledgeItemType;
  area?: LifeArea;
  subArea?: SubArea; // ADR-017
  source?: KnowledgeItemSource;
  confidenceMin?: number;
  confidenceMax?: number;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  offset?: number;

  // Temporal filter (M1.6.1)
  includeSuperseded?: boolean;
}

// =============================================================================
// DTOs for mutations
// =============================================================================

export interface CreateKnowledgeItemInput {
  type: KnowledgeItemType;
  content: string;
  area?: LifeArea;
  subArea?: SubArea; // ADR-017
  title?: string;
  tags?: string[];
}

export interface UpdateKnowledgeItemInput {
  title?: string;
  content?: string;
  tags?: string[];
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Map numeric confidence to semantic level
 * High >= 0.8, Medium 0.6-0.79, Low < 0.6
 */
export function getConfidenceLevel(confidence: number): ConfidenceLevel {
  if (confidence >= 0.8) return 'high';
  if (confidence >= 0.6) return 'medium';
  return 'low';
}

/**
 * Human-readable labels for knowledge item types (PT-BR)
 */
export const knowledgeItemTypeLabels: Record<KnowledgeItemType, string> = {
  fact: 'Fato',
  preference: 'Preferência',
  memory: 'Lembrança',
  insight: 'Insight',
  person: 'Pessoa',
};

/**
 * Human-readable labels for life areas (PT-BR)
 * ADR-017: 6 main areas
 */
export const lifeAreaLabels: Record<LifeArea, string> = {
  health: 'Saúde',
  finance: 'Finanças',
  professional: 'Profissional',
  learning: 'Aprendizado',
  spiritual: 'Espiritual',
  relationships: 'Relacionamentos',
};

/**
 * Human-readable labels for sub-areas (PT-BR)
 * ADR-017: 17 sub-areas
 */
export const subAreaLabels: Record<SubArea, string> = {
  // Health
  physical: 'Física',
  mental: 'Mental',
  leisure: 'Lazer',
  // Finance
  budget: 'Orçamento',
  savings: 'Poupança',
  debts: 'Dívidas',
  investments: 'Investimentos',
  // Professional
  career: 'Carreira',
  business: 'Negócios',
  // Learning
  formal: 'Formal',
  informal: 'Informal',
  // Spiritual
  practice: 'Prática',
  community: 'Comunidade',
  // Relationships
  family: 'Família',
  romantic: 'Romântico',
  social: 'Social',
};

/**
 * Human-readable labels for sources (PT-BR)
 * @see docs/specs/data-model.md §3.1 for knowledge_item_source enum
 */
export const sourceLabels: Record<KnowledgeItemSource, string> = {
  conversation: 'Na conversa',
  user_input: 'Manual',
  ai_inference: 'Inferido pela IA',
};

/**
 * Human-readable labels for confidence levels (PT-BR)
 */
export const confidenceLevelLabels: Record<ConfidenceLevel, string> = {
  high: 'Alta',
  medium: 'Média',
  low: 'Baixa',
};
