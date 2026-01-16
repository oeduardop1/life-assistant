/**
 * Memory Module Types
 *
 * Types for memory view and knowledge items management.
 * @see MILESTONES.md M1.6 for Memory View implementation
 */

// =============================================================================
// Enums / Unions
// =============================================================================

export type KnowledgeItemType = 'fact' | 'preference' | 'memory' | 'insight' | 'person';

export type LifeArea =
  | 'health'
  | 'financial'
  | 'relationships'
  | 'career'
  | 'personal_growth'
  | 'leisure'
  | 'spirituality'
  | 'mental_health';

export type KnowledgeItemSource = 'conversation' | 'user_input' | 'ai_inference';

export type ConfidenceLevel = 'high' | 'medium' | 'low';

// =============================================================================
// Entities
// =============================================================================

export interface KnowledgeItem {
  id: string;
  type: KnowledgeItemType;
  area: LifeArea | null;
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
 */
export const lifeAreaLabels: Record<LifeArea, string> = {
  health: 'Saúde',
  financial: 'Financeiro',
  relationships: 'Relacionamentos',
  career: 'Carreira',
  personal_growth: 'Crescimento Pessoal',
  leisure: 'Lazer',
  spirituality: 'Espiritualidade',
  mental_health: 'Saúde Mental',
};

/**
 * Human-readable labels for sources (PT-BR)
 * @see DATA_MODEL.md §3.1 for knowledge_item_source enum
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
