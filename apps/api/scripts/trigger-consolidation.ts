#!/usr/bin/env tsx
/**
 * Script para obter token de autenticação e disparar Memory Consolidation Job
 *
 * Uso:
 *   pnpm --filter @life-assistant/api trigger:consolidation           # Apenas mostra o token
 *   pnpm --filter @life-assistant/api trigger:consolidation --trigger # Dispara o job
 *
 * Variáveis de ambiente (opcionais):
 *   TEST_USER_EMAIL    - Email do usuário (default: test@example.com)
 *   TEST_USER_PASSWORD - Senha do usuário (default: testpassword123)
 *
 * @see ENGINEERING.md §7.6 para documentação do endpoint admin
 */

import 'dotenv/config';

// =============================================================================
// Configuration
// =============================================================================

const config = {
  supabaseUrl: process.env.SUPABASE_URL ?? 'http://localhost:54321',
  apiUrl: process.env.API_URL ?? 'http://localhost:4000',
  email: process.env.TEST_USER_EMAIL ?? 'test@example.com',
  password: process.env.TEST_USER_PASSWORD ?? 'testpassword123',
};

// =============================================================================
// Types
// =============================================================================

interface SupabaseAuthResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  user: {
    id: string;
    email: string;
  };
}

interface ConsolidationResponse {
  success: boolean;
  data: {
    status: string;
    jobId: string;
    message: string;
  };
  meta: {
    timestamp: string;
    requestId: string;
  };
}

// =============================================================================
// Functions
// =============================================================================

/**
 * Authenticate with Supabase and get access token
 */
async function getAccessToken(): Promise<{ token: string; userId: string }> {
  console.log(`\n🔐 Authenticating as ${config.email}...`);

  const response = await fetch(
    `${config.supabaseUrl}/auth/v1/token?grant_type=password`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: process.env.SUPABASE_ANON_KEY ?? '',
      },
      body: JSON.stringify({
        email: config.email,
        password: config.password,
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Authentication failed: ${response.status} - ${error}`);
  }

  const data = (await response.json()) as SupabaseAuthResponse;

  console.log(`✅ Authenticated as ${data.user.email} (${data.user.id})`);

  return {
    token: data.access_token,
    userId: data.user.id,
  };
}

/**
 * Trigger memory consolidation job
 */
async function triggerConsolidation(
  token: string,
  userId?: string
): Promise<ConsolidationResponse> {
  console.log(`\n🚀 Triggering memory consolidation job...`);

  const body = userId ? JSON.stringify({ userId }) : '{}';

  const response = await fetch(
    `${config.apiUrl}/api/admin/jobs/memory-consolidation/trigger`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body,
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Trigger failed: ${response.status} - ${error}`);
  }

  const data = (await response.json()) as ConsolidationResponse;

  console.log(`✅ Job queued successfully!`);
  console.log(`   Job ID: ${data.data.jobId}`);
  console.log(`   Message: ${data.data.message}`);

  return data;
}

/**
 * Print token for manual use
 */
function printToken(token: string): void {
  console.log(`\n${'─'.repeat(60)}`);
  console.log('📋 Access Token (copie para usar manualmente):');
  console.log(`${'─'.repeat(60)}`);
  console.log(token);
  console.log(`${'─'.repeat(60)}`);

  console.log('\n📝 Exemplo de uso com curl:');
  console.log(`
curl -X POST ${config.apiUrl}/api/admin/jobs/memory-consolidation/trigger \\
  -H "Authorization: Bearer ${token.slice(0, 20)}..." \\
  -H "Content-Type: application/json"
`);
}

/**
 * Print help message
 */
function printHelp(): void {
  console.log(`
Usage: pnpm --filter @life-assistant/api trigger:consolidation [options]

Options:
  --trigger    Trigger the memory consolidation job after getting token
  --help, -h   Show this help message

Environment Variables:
  TEST_USER_EMAIL     Email for authentication (default: test@example.com)
  TEST_USER_PASSWORD  Password for authentication (default: testpassword123)
  SUPABASE_URL        Supabase URL (default: http://localhost:54321)
  API_URL             API URL (default: http://localhost:4000)

Examples:
  # Just get the token
  pnpm --filter @life-assistant/api trigger:consolidation

  # Get token and trigger the job
  pnpm --filter @life-assistant/api trigger:consolidation --trigger

  # Use different credentials
  TEST_USER_EMAIL=me@example.com TEST_USER_PASSWORD=mypass pnpm --filter @life-assistant/api trigger:consolidation --trigger
`);
}

// =============================================================================
// Main
// =============================================================================

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  // Check for help flag
  if (args.includes('--help') || args.includes('-h')) {
    printHelp();
    process.exit(0);
  }

  const shouldTrigger = args.includes('--trigger');

  console.log('🧠 Memory Consolidation Job Trigger');
  console.log(`   Supabase: ${config.supabaseUrl}`);
  console.log(`   API: ${config.apiUrl}`);

  try {
    // Get access token
    const { token, userId } = await getAccessToken();

    // Print token for manual use
    printToken(token);

    // Trigger job if requested
    if (shouldTrigger) {
      await triggerConsolidation(token, userId);

      console.log(`\n📊 Para verificar o resultado:`);
      console.log(`   1. Supabase Studio: http://localhost:54323`);
      console.log(`   2. Query SQL:`);
      console.log(`      SELECT * FROM memory_consolidations WHERE user_id = '${userId}' ORDER BY created_at DESC LIMIT 1;`);
      console.log(`      SELECT * FROM knowledge_items WHERE user_id = '${userId}' ORDER BY created_at DESC;`);
    } else {
      console.log(`\n💡 Dica: Use --trigger para disparar o job automaticamente`);
    }

    console.log('\n✨ Done!');
  } catch (error) {
    console.error('\n❌ Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();
