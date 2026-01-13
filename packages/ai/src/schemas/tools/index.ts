/**
 * Tool definitions for LLM Tool Use.
 * @module schemas/tools
 */

// Re-export all tool definitions
export {
  searchKnowledgeTool,
  searchKnowledgeParamsSchema,
  knowledgeTypeSchema,
  type SearchKnowledgeParams,
  type KnowledgeType,
} from './search-knowledge.tool.js';

export {
  getTrackingHistoryTool,
  getTrackingHistoryParamsSchema,
  type GetTrackingHistoryParams,
} from './get-tracking-history.tool.js';

export {
  getPersonTool,
  getPersonParamsSchema,
  type GetPersonParams,
} from './get-person.tool.js';

export {
  recordMetricTool,
  recordMetricParamsSchema,
  type RecordMetricParams,
} from './record-metric.tool.js';

export {
  addKnowledgeTool,
  addKnowledgeParamsSchema,
  type AddKnowledgeParams,
} from './add-knowledge.tool.js';

export {
  createReminderTool,
  createReminderParamsSchema,
  type CreateReminderParams,
} from './create-reminder.tool.js';

export {
  updatePersonTool,
  updatePersonParamsSchema,
  type UpdatePersonParams,
} from './update-person.tool.js';

// Convenience array of all tools
import { searchKnowledgeTool } from './search-knowledge.tool.js';
import { getTrackingHistoryTool } from './get-tracking-history.tool.js';
import { getPersonTool } from './get-person.tool.js';
import { recordMetricTool } from './record-metric.tool.js';
import { addKnowledgeTool } from './add-knowledge.tool.js';
import { createReminderTool } from './create-reminder.tool.js';
import { updatePersonTool } from './update-person.tool.js';
import type { ToolDefinition } from '../../ports/llm.port.js';

/**
 * All available tools.
 * READ tools: search_knowledge, get_tracking_history, get_person
 * WRITE tools: record_metric, add_knowledge, create_reminder, update_person
 */
export const allTools: ToolDefinition[] = [
  searchKnowledgeTool,
  getTrackingHistoryTool,
  getPersonTool,
  recordMetricTool,
  addKnowledgeTool,
  createReminderTool,
  updatePersonTool,
];

/**
 * READ-only tools (no confirmation required).
 */
export const readTools: ToolDefinition[] = [
  searchKnowledgeTool,
  getTrackingHistoryTool,
  getPersonTool,
];

/**
 * WRITE tools (confirmation required).
 */
export const writeTools: ToolDefinition[] = [
  recordMetricTool,
  addKnowledgeTool,
  createReminderTool,
  updatePersonTool,
];
