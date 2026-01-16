#!/usr/bin/env tsx
/**
 * Script para obter token de autenticação e disparar Memory Consolidation Job
 *
 * Uso:
 *   pnpm --filter @life-assistant/api trigger:consolidation           # Apenas mostra o token
 *   pnpm --filter @life-assistant/api trigger:consolidation --trigger # Dispara o job
 *   pnpm --filter @life-assistant/api trigger:consolidation --trigger --wait # Dispara e aguarda resultado
 *
 * Variáveis de ambiente (opcionais):
 *   TEST_USER_EMAIL    - Email do usuário (default: test@example.com)
 *   TEST_USER_PASSWORD - Senha do usuário (default: testpassword123)
 *
 * @see docs/specs/engineering.md §7.6 para documentação do endpoint admin
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

interface ConsolidationResult {
  id: string;
  user_id: string;
  messages_processed: number;
  facts_created: number;
  facts_updated: number;
  inferences_created: number;
  status: 'completed' | 'failed';
  error_message: string | null;
  created_at: string;
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
 * Wait for job completion by polling memory_consolidations table
 */
async function waitForJobResult(
  token: string,
  userId: string,
  startTime: Date,
  maxWaitMs: number = 60000,
  pollIntervalMs: number = 2000
): Promise<ConsolidationResult | null> {
  console.log(`\n⏳ Aguardando resultado do job (timeout: ${maxWaitMs / 1000}s)...`);

  const deadline = Date.now() + maxWaitMs;
  let lastCheckedAt = startTime;

  while (Date.now() < deadline) {
    // Query Supabase directly for the consolidation result
    const response = await fetch(
      `${config.supabaseUrl}/rest/v1/memory_consolidations?user_id=eq.${userId}&created_at=gt.${lastCheckedAt.toISOString()}&order=created_at.desc&limit=1`,
      {
        headers: {
          apikey: process.env.SUPABASE_ANON_KEY ?? '',
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      console.error(`   ⚠️ Erro ao consultar resultado: ${response.status}`);
      await sleep(pollIntervalMs);
      continue;
    }

    const results = (await response.json()) as ConsolidationResult[];

    if (results.length > 0) {
      return results[0];
    }

    process.stdout.write('.');
    await sleep(pollIntervalMs);
  }

  console.log('\n   ⚠️ Timeout aguardando resultado');
  return null;
}

/**
 * Print consolidation result
 */
function printJobResult(result: ConsolidationResult): void {
  console.log(`\n${'─'.repeat(60)}`);

  if (result.status === 'completed') {
    console.log('✅ Job completado com sucesso!');
    console.log(`${'─'.repeat(60)}`);
    console.log(`   📝 Mensagens processadas: ${result.messages_processed}`);
    console.log(`   📚 Fatos criados: ${result.facts_created}`);
    console.log(`   ✏️  Fatos atualizados: ${result.facts_updated}`);
    console.log(`   🧠 Inferências criadas: ${result.inferences_created}`);
  } else {
    console.log('❌ Job falhou!');
    console.log(`${'─'.repeat(60)}`);
    console.log(`   📝 Mensagens processadas: ${result.messages_processed}`);
    if (result.error_message) {
      console.log(`   ⚠️  Erro:`);
      // Format error message for better readability
      const errorLines = result.error_message.split('\n');
      for (const line of errorLines.slice(0, 10)) {
        console.log(`      ${line}`);
      }
      if (errorLines.length > 10) {
        console.log(`      ... (${errorLines.length - 10} more lines)`);
      }
    }
  }

  console.log(`${'─'.repeat(60)}`);
}

/**
 * Sleep helper
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
  --wait       Wait for job completion and show result (implies --trigger)
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

  # Trigger and wait for result (recommended)
  pnpm --filter @life-assistant/api trigger:consolidation --trigger --wait

  # Use different credentials
  TEST_USER_EMAIL=me@example.com TEST_USER_PASSWORD=mypass pnpm --filter @life-assistant/api trigger:consolidation --trigger --wait
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

  const shouldWait = args.includes('--wait');
  const shouldTrigger = args.includes('--trigger') || shouldWait; // --wait implies --trigger

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
      const startTime = new Date();
      await triggerConsolidation(token, userId);

      // Wait for result if requested
      if (shouldWait) {
        const result = await waitForJobResult(token, userId, startTime);

        if (result) {
          printJobResult(result);

          // Exit with error code if job failed
          if (result.status === 'failed') {
            process.exit(1);
          }
        } else {
          console.log('\n⚠️ Não foi possível obter o resultado do job.');
          console.log('   O job pode ainda estar em execução ou ter falhado silenciosamente.');
          process.exit(1);
        }
      } else {
        console.log(`\n📊 Para verificar o resultado:`);
        console.log(`   1. Supabase Studio: http://localhost:54323`);
        console.log(`   2. Query SQL:`);
        console.log(`      SELECT * FROM memory_consolidations WHERE user_id = '${userId}' ORDER BY created_at DESC LIMIT 1;`);
        console.log(`      SELECT * FROM knowledge_items WHERE user_id = '${userId}' ORDER BY created_at DESC;`);
        console.log(`\n💡 Dica: Use --wait para aguardar e ver o resultado automaticamente`);
      }
    } else {
      console.log(`\n💡 Dica: Use --trigger para disparar o job automaticamente`);
      console.log(`         Use --trigger --wait para disparar e ver o resultado`);
    }

    console.log('\n✨ Done!');
  } catch (error) {
    console.error('\n❌ Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();
