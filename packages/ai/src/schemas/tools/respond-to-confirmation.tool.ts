/**
 * Tool for LLM-based confirmation response detection.
 * Used with forced toolChoice to guarantee deterministic execution.
 *
 * @see ADR-015 Low Friction Tracking Philosophy
 * @module schemas/tools/respond-to-confirmation.tool
 */

import { z } from 'zod';
import type { ToolDefinition } from '../../ports/llm.port.js';

/**
 * Intent types for confirmation responses
 */
export const confirmationIntentSchema = z.enum([
  'confirm', // User confirms the action
  'reject', // User rejects the action
  'correct', // User wants to correct the value
]);

export type ConfirmationIntent = z.infer<typeof confirmationIntentSchema>;

/**
 * Parameters for respond_to_confirmation tool
 */
export const respondToConfirmationParamsSchema = z.object({
  intent: confirmationIntentSchema.describe(
    'The detected intent from user message: confirm (yes/proceed), reject (no/cancel), or correct (change value)'
  ),
  correctedValue: z.number().optional().describe(
    'If intent is "correct", the new numeric value extracted from user message'
  ),
  correctedUnit: z.string().optional().describe(
    'If intent is "correct", the unit for the corrected value (kg, ml, hours, etc.)'
  ),
  confidence: z.number().min(0).max(1).describe(
    'Confidence level of the intent detection (0-1)'
  ),
  reasoning: z.string().optional().describe(
    'Brief explanation of why this intent was detected'
  ),
});

export type RespondToConfirmationParams = z.infer<typeof respondToConfirmationParamsSchema>;

/**
 * Tool definition for responding to confirmation prompts.
 *
 * This tool is used with forced tool_choice to guarantee deterministic
 * execution when detecting user intent for pending confirmations.
 *
 * @see ADR-015 Low Friction Tracking Philosophy
 */
export const respondToConfirmationTool: ToolDefinition<typeof respondToConfirmationParamsSchema> = {
  name: 'respond_to_confirmation',
  description: `Analyze user response to a pending confirmation and determine their intent.

Use this tool to interpret user messages in response to a confirmation prompt like "Registrar peso: 82kg?".

Intent detection guidelines:
- "confirm": User agrees (sim, ok, pode, beleza, manda ver, vai lá, tá certo, bora, isso aí, fechou, etc.)
- "reject": User declines (não, cancela, deixa, esquece, para, não precisa, etc.)
- "correct": User provides a different value (na verdade 81, errei era 80kg, são 83, corrige pra X, etc.)

Return high confidence (>0.9) for clear intents, lower for ambiguous cases.`,
  parameters: respondToConfirmationParamsSchema,
  requiresConfirmation: false, // This tool itself doesn't need confirmation
  inputExamples: [
    { intent: 'confirm', confidence: 0.95, reasoning: 'User said "sim"' },
    { intent: 'confirm', confidence: 0.92, reasoning: 'User said "beleza" - colloquial confirmation' },
    { intent: 'reject', confidence: 0.95, reasoning: 'User said "não, deixa"' },
    { intent: 'correct', correctedValue: 81, correctedUnit: 'kg', confidence: 0.90, reasoning: 'User corrected to 81kg' },
  ],
};
