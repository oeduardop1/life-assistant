/**
 * Memory Consolidation Job
 *
 * Daily job that extracts facts, preferences, and insights
 * from user conversations and updates their memory.
 *
 * @see AI_SPECS.md §6.5 for consolidation specification
 * @see ADR-012 for Tool Use + Memory Consolidation architecture
 */
export { MemoryConsolidationProcessor } from './memory-consolidation.processor';
export { MemoryConsolidationScheduler } from './memory-consolidation.scheduler';
export {
  buildConsolidationPrompt,
  parseConsolidationResponse,
  consolidationResponseSchema,
  type ConsolidationResponse,
} from './consolidation-prompt';
