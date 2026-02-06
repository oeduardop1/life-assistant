/**
 * @life-assistant/ai
 * Core de IA compartilhado - LLM Abstraction + Tool Use
 *
 * @module @life-assistant/ai
 *
 * @example
 * ```typescript
 * import { createLLMFromEnv, runToolLoop, allTools } from '@life-assistant/ai';
 *
 * // Create LLM from environment
 * const llm = createLLMFromEnv();
 *
 * // Simple chat
 * const response = await llm.chat({
 *   messages: [{ role: 'user', content: 'Hello!' }],
 * });
 *
 * // Chat with tools
 * const result = await runToolLoop(llm, messages, {
 *   tools: allTools,
 *   executor: myToolExecutor,
 * });
 * ```
 */

export const AI_VERSION = '0.2.0';

// ============================================================================
// Ports (Core Interfaces)
// ============================================================================

export type {
  LLMPort,
  ChatParams,
  ChatResponse,
  ChatWithToolsParams,
  ChatWithToolsResponse,
  Message,
  ToolDefinition,
  ToolCall,
  ToolChoice,
  StreamChunk,
  ProviderInfo,
  FinishReason,
  TokenUsage,
} from './ports/llm.port.js';

// ============================================================================
// Adapters
// ============================================================================

export { ClaudeAdapter, type ClaudeAdapterConfig } from './adapters/claude.adapter.js';
export { GeminiAdapter, type GeminiAdapterConfig } from './adapters/gemini.adapter.js';

// ============================================================================
// Services
// ============================================================================

export {
  // Factory
  createLLM,
  createLLMFromEnv,
  LLM_ENV_VARS,
  type LLMProvider,
  type LLMFactoryConfig,
  // Tool Executor
  type ToolExecutor,
  type ToolExecutionResult,
  type ToolExecutionContext,
  createErrorResult,
  createSuccessResult,
  // Tool Loop
  runToolLoop,
  createSimpleExecutor,
  DEFAULT_MAX_ITERATIONS,
  type ToolLoopConfig,
  type ToolLoopResult,
  type PendingConfirmation,
} from './services/index.js';

// ============================================================================
// Tool Definitions
// ============================================================================

export {
  // All tools
  allTools,
  readTools,
  writeTools,
  // Individual tools
  searchKnowledgeTool,
  searchKnowledgeParamsSchema,
  knowledgeTypeSchema,
  type SearchKnowledgeParams,
  type KnowledgeType,
  getTrackingHistoryTool,
  getTrackingHistoryParamsSchema,
  type GetTrackingHistoryParams,
  recordMetricTool,
  recordMetricParamsSchema,
  type RecordMetricParams,
  // Habits tools (M2.1)
  recordHabitTool,
  recordHabitParamsSchema,
  type RecordHabitParams,
  getHabitsTool,
  getHabitsParamsSchema,
  type GetHabitsParams,
  updateMetricTool,
  updateMetricParamsSchema,
  type UpdateMetricParams,
  deleteMetricTool,
  deleteMetricParamsSchema,
  type DeleteMetricParams,
  // delete_metrics (batch) removed - LLM hallucinates entry IDs
  addKnowledgeTool,
  addKnowledgeParamsSchema,
  type AddKnowledgeParams,
  createReminderTool,
  createReminderParamsSchema,
  type CreateReminderParams,
  analyzeContextTool,
  analyzeContextParamsSchema,
  analyzeContextResponseSchema,
  type AnalyzeContextParams,
  type AnalyzeContextResponse,
  // Confirmation detection tool (used with forced toolChoice)
  respondToConfirmationTool,
  respondToConfirmationParamsSchema,
  confirmationIntentSchema,
  type RespondToConfirmationParams,
  type ConfirmationIntent,
  // Finance tools (M2.2)
  getFinanceSummaryTool,
  getFinanceSummaryParamsSchema,
  getPendingBillsTool,
  getPendingBillsParamsSchema,
  getBillsTool,
  getBillsParamsSchema,
  getExpensesTool,
  getExpensesParamsSchema,
  getIncomesTool,
  getIncomesParamsSchema,
  getInvestmentsTool,
  getInvestmentsParamsSchema,
  markBillPaidTool,
  markBillPaidParamsSchema,
  createExpenseTool,
  createExpenseParamsSchema,
  getDebtProgressTool,
  getDebtProgressParamsSchema,
  getDebtPaymentHistoryTool,
  getDebtPaymentHistoryParamsSchema,
  getUpcomingInstallmentsTool,
  getUpcomingInstallmentsParamsSchema,
} from './schemas/tools/index.js';

// ============================================================================
// Schemas
// ============================================================================

export {
  toolNameSchema,
  toolDefinitionMetaSchema,
  toolCallSchema,
  toolResultSchema,
} from './schemas/tool.schema.js';

export {
  messageRoleSchema,
  messageSchema,
  chatParamsSchema,
  chatResponseSchema,
  finishReasonSchema,
} from './schemas/message.schema.js';

// ============================================================================
// Utilities
// ============================================================================

export { zodToGeminiSchema } from './utils/zod-to-gemini.js';
export { enrichDescriptionWithExamples } from './utils/examples-enricher.js';
export {
  RateLimiter,
  getRateLimiter,
  type RateLimiterConfig,
} from './utils/rate-limiter.js';
export {
  retryWithBackoff,
  withRetry,
  isRetryableError,
  calculateDelay,
  DEFAULT_RETRY_CONFIG,
  type RetryConfig,
} from './utils/retry.js';

// ============================================================================
// Errors
// ============================================================================

export {
  AIError,
  ProviderConfigError,
  LLMAPIError,
  RateLimitError,
  ToolNotFoundError,
  ToolExecutionError,
  ToolValidationError,
  MaxIterationsExceededError,
  StreamingError,
} from './errors/ai.errors.js';
