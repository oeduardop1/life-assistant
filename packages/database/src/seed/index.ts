// packages/database/src/seed/index.ts
// Seed data for development and testing

import { getDb, closePool } from '../client';
import {
  users,
  conversations,
  messages,
  trackingEntries,
  notes,
  habits,
  goals,
  type NewUser,
  type NewConversation,
  type NewMessage,
  type NewTrackingEntry,
  type NewNote,
  type NewHabit,
  type NewGoal,
} from '../schema';
import { defaultUserPreferences } from '../schema/preferences';

// Deterministic UUIDs for test data
// These IDs will be consistent across runs
export const TEST_USER_ID = '00000000-0000-4000-8000-000000000001';
export const TEST_ONBOARDING_USER_ID = '00000000-0000-4000-8000-000000000007';
export const TEST_CONVERSATION_ID = '00000000-0000-4000-8000-000000000002';
export const TEST_NOTE_1_ID = '00000000-0000-4000-8000-000000000003';
export const TEST_NOTE_2_ID = '00000000-0000-4000-8000-000000000004';
export const TEST_HABIT_ID = '00000000-0000-4000-8000-000000000005';
export const TEST_GOAL_ID = '00000000-0000-4000-8000-000000000006';

export async function seed() {
  console.log('Seeding database...');

  const db = getDb();
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const endDateStr = new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  // Create test user
  console.log('Creating test user...');
  const testUser: NewUser = {
    id: TEST_USER_ID,
    email: 'test@example.com',
    name: 'Usuário Teste',
    status: 'active',
    plan: 'pro',
    preferences: defaultUserPreferences,
    emailVerifiedAt: new Date(),
    onboardingCompletedAt: new Date(),
  };
  await db.insert(users).values(testUser).onConflictDoNothing();

  // Create test user with pending onboarding (for E2E onboarding tests)
  console.log('Creating onboarding test user...');
  const onboardingTestUser: NewUser = {
    id: TEST_ONBOARDING_USER_ID,
    email: 'onboarding@example.com',
    name: 'Novo Usuario', // Initial name from signup, can be updated in profile step
    status: 'pending',
    plan: 'free',
    preferences: defaultUserPreferences,
    emailVerifiedAt: new Date(),
    onboardingCompletedAt: null, // Onboarding not completed
  };
  await db.insert(users).values(onboardingTestUser).onConflictDoNothing();

  // Create sample conversation
  console.log('Creating sample conversation...');
  const testConversation: NewConversation = {
    id: TEST_CONVERSATION_ID,
    userId: TEST_USER_ID,
    type: 'general',
    title: 'Primeira conversa',
  };
  await db.insert(conversations).values(testConversation).onConflictDoNothing();

  // Create sample messages
  console.log('Creating sample messages...');
  const testMessages: NewMessage[] = [
    {
      conversationId: TEST_CONVERSATION_ID,
      role: 'user',
      content: 'Olá! Como funciona o app?',
    },
    {
      conversationId: TEST_CONVERSATION_ID,
      role: 'assistant',
      content:
        'Oi! Eu sou sua assistente pessoal de vida. Posso te ajudar a organizar sua rotina, acompanhar métricas de saúde, finanças e muito mais!',
    },
  ];
  await db.insert(messages).values(testMessages).onConflictDoNothing();

  // Create sample tracking entries
  console.log('Creating sample tracking entries...');
  const testTrackingEntries: NewTrackingEntry[] = [
    {
      userId: TEST_USER_ID,
      type: 'weight',
      area: 'health',
      value: '82.5',
      unit: 'kg',
      entryDate: todayStr,
    },
    {
      userId: TEST_USER_ID,
      type: 'water',
      area: 'health',
      value: '2000',
      unit: 'ml',
      entryDate: todayStr,
    },
    {
      userId: TEST_USER_ID,
      type: 'mood',
      area: 'mental_health',
      value: '7',
      entryDate: todayStr,
    },
  ];
  await db
    .insert(trackingEntries)
    .values(testTrackingEntries)
    .onConflictDoNothing();

  // Create sample notes
  console.log('Creating sample notes...');
  const testNotes: NewNote[] = [
    {
      id: TEST_NOTE_1_ID,
      userId: TEST_USER_ID,
      title: 'Bem-vindo ao Segundo Cérebro',
      content:
        '# Bem-vindo!\n\nEste é seu espaço para organizar pensamentos, ideias e conhecimento.\n\n## Como usar\n\n- Crie notas livremente\n- Use [[wikilinks]] para conectar ideias\n- Use #tags para categorizar',
      folder: null,
      tags: ['tutorial', 'welcome'],
    },
    {
      id: TEST_NOTE_2_ID,
      userId: TEST_USER_ID,
      title: 'Metas 2026',
      content:
        '# Metas para 2026\n\n## Saúde\n- Manter peso saudável\n- Exercício 3x/semana\n\n## Financeiro\n- Reserva de emergência\n- Investir 20% da renda',
      folder: 'Planejamento',
      tags: ['metas', 'planejamento'],
    },
  ];
  await db.insert(notes).values(testNotes).onConflictDoNothing();

  // Create sample habit
  console.log('Creating sample habit...');
  const testHabit: NewHabit = {
    id: TEST_HABIT_ID,
    userId: TEST_USER_ID,
    title: 'Beber água',
    description: 'Beber pelo menos 2L de água por dia',
    area: 'health',
    frequency: 'daily',
    isActive: true,
  };
  await db.insert(habits).values(testHabit).onConflictDoNothing();

  // Create sample goal
  console.log('Creating sample goal...');
  const testGoal: NewGoal = {
    id: TEST_GOAL_ID,
    userId: TEST_USER_ID,
    title: 'Perder 5kg',
    description: 'Chegar a 77.5kg até o final do trimestre',
    area: 'health',
    targetValue: '77.5',
    currentValue: '82.5',
    unit: 'kg',
    startDate: todayStr,
    endDate: endDateStr,
    status: 'in_progress',
  };
  await db.insert(goals).values(testGoal).onConflictDoNothing();

  console.log('✅ Seed completed successfully!');
}

// Run seed when executed directly
const scriptPath = process.argv[1] ?? '';
if (import.meta.url === `file://${scriptPath}`) {
  seed()
    .catch((error: unknown) => {
      console.error('Seed failed:', error);
      process.exit(1);
    })
    .finally(() => closePool());
}
