/**
 * Vitest setup file
 * Runs before each test file
 */

import 'reflect-metadata';

// Set test environment
process.env.NODE_ENV = 'test';
process.env.PORT = '4000';
process.env.FRONTEND_URL = 'http://localhost:3000';
process.env.APP_VERSION = '0.1.0-test';

// Database config (for integration tests)
process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/life_assistant_test';
process.env.SUPABASE_URL = 'http://localhost:54321';
process.env.SUPABASE_ANON_KEY = 'test-anon-key';
process.env.SUPABASE_SERVICE_KEY = 'test-service-key';
process.env.SUPABASE_JWT_SECRET = 'super-secret-jwt-token-with-at-least-32-characters-for-testing';

// Redis config
process.env.REDIS_URL = 'redis://localhost:6379';

// AI config
process.env.LLM_PROVIDER = 'gemini';
process.env.GEMINI_API_KEY = 'test-gemini-key';
process.env.GEMINI_MODEL = 'gemini-flash';

// Storage config
process.env.R2_ACCOUNT_ID = 'test-account';
process.env.R2_ACCESS_KEY_ID = 'test-access-key';
process.env.R2_SECRET_ACCESS_KEY = 'test-secret-key';
process.env.R2_BUCKET_NAME = 'test-bucket';

// Observability
process.env.LOG_LEVEL = 'error'; // Reduce noise in tests
