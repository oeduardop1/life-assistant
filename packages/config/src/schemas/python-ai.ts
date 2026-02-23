/**
 * Schema de configuração do Python AI Service
 */

import { z } from 'zod';

export const pythonAiSchema = z.object({
  PYTHON_AI_URL: z.string().url().default('http://localhost:8000'),
  SERVICE_SECRET: z.string().min(1).default('dev-secret-change-me'),
  USE_PYTHON_AI: z.coerce.boolean().default(false),
});

export type PythonAiEnv = z.infer<typeof pythonAiSchema>;
