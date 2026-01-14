/**
 * Services for LLM operations.
 * @module services
 */

export {
  createLLM,
  createLLMFromEnv,
  LLM_ENV_VARS,
  type LLMProvider,
  type LLMFactoryConfig,
} from './llm.factory.js';

export {
  type ToolExecutor,
  type ToolExecutionResult,
  type ToolExecutionContext,
  createErrorResult,
  createSuccessResult,
} from './tool-executor.service.js';

export {
  runToolLoop,
  createSimpleExecutor,
  DEFAULT_MAX_ITERATIONS,
  type ToolLoopConfig,
  type ToolLoopResult,
} from './tool-loop.service.js';
