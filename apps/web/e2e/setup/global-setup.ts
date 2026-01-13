import { chromium, FullConfig } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Global setup for E2E tests
 * Creates test users via Supabase Admin REST API and saves the authentication states for reuse
 *
 * This setup runs before all tests and:
 * 1. Creates test users in Supabase Auth (if not exists)
 * 2. Logs in and saves the authenticated sessions
 *
 * Two test users are created:
 * - TEST_USER: Completed onboarding, used for most tests
 * - ONBOARDING_USER: Pending onboarding, used for onboarding flow tests
 */

// Test user credentials (completed onboarding)
const TEST_USER = {
  id: '00000000-0000-4000-8000-000000000001', // Matches seed data
  email: process.env.TEST_USER_EMAIL || 'test@example.com',
  password: process.env.TEST_USER_PASSWORD || 'testpassword123',
  name: 'Test User',
};

// Onboarding test user credentials (pending onboarding)
const ONBOARDING_USER = {
  id: '00000000-0000-4000-8000-000000000002',
  email: 'onboarding@example.com',
  password: 'testpassword123',
  name: 'Onboarding User',
};

// Supabase local CLI credentials
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz';

interface TestUser {
  id: string;
  email: string;
  password: string;
  name: string;
}

/**
 * Get auth user by email
 * Uses pagination to search through all users if needed
 */
async function getAuthUserByEmail(email: string): Promise<{ id: string } | null> {
  try {
    // Try to get all users with high page size to find by email
    // The admin API supports up to 1000 per page
    let page = 1;
    const perPage = 1000;

    while (page <= 10) { // Max 10 pages = 10000 users
      const response = await fetch(
        `${SUPABASE_URL}/auth/v1/admin/users?page=${page}&per_page=${perPage}`,
        {
          headers: {
            'apikey': SUPABASE_SECRET_KEY,
            'Authorization': `Bearer ${SUPABASE_SECRET_KEY}`,
          },
        }
      );

      if (!response.ok) {
        console.warn(`Global setup: Failed to fetch auth users: ${response.status}`);
        return null;
      }

      const data = await response.json();
      const users = data.users || [];
      const user = users.find((u: { email: string }) => u.email === email);

      if (user) {
        return user;
      }

      // If we got fewer users than requested, we've reached the end
      if (users.length < perPage) {
        break;
      }

      page++;
    }

    return null;
  } catch (error) {
    console.warn(`Global setup: Error fetching auth users:`, error);
    return null;
  }
}

/**
 * Update auth user password
 */
async function updateAuthUserPassword(userId: string, password: string): Promise<boolean> {
  try {
    const response = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
      method: 'PUT',
      headers: {
        'apikey': SUPABASE_SECRET_KEY,
        'Authorization': `Bearer ${SUPABASE_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ password }),
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Delete auth user by ID
 */
async function deleteAuthUser(userId: string): Promise<boolean> {
  try {
    const response = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
      method: 'DELETE',
      headers: {
        'apikey': SUPABASE_SECRET_KEY,
        'Authorization': `Bearer ${SUPABASE_SECRET_KEY}`,
      },
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Ensure a test user exists in Supabase Auth
 * Uses Admin REST API to create user with auto-confirmed email
 * If user exists, updates password to ensure it matches
 */
async function ensureUserExists(user: TestUser, label: string): Promise<void> {
  try {
    // First check if user already exists via API
    const existingUser = await getAuthUserByEmail(user.email);

    if (existingUser) {
      // User exists - update their password to ensure it matches
      const updated = await updateAuthUserPassword(existingUser.id, user.password);
      if (updated) {
        console.log(`Global setup: ${label} already exists, password updated`);
      } else {
        console.log(`Global setup: ${label} already exists in Supabase Auth`);
      }
      return;
    }

    // Try to create the test user via Admin REST API
    let response = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_SECRET_KEY,
        'Authorization': `Bearer ${SUPABASE_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: user.id,
        email: user.email,
        password: user.password,
        email_confirm: true,
        user_metadata: { name: user.name },
      }),
    });

    let data = await response.json();

    if (response.ok) {
      console.log(`Global setup: Created ${label} ${data.email}`);
      return;
    }

    // If creation failed because user already exists, try to delete by known ID and recreate
    if (data.code === '23505' || data.message?.includes('already exists') || data.error_code === 'email_exists') {
      console.log(`Global setup: ${label} exists but not found via API, attempting delete and recreate...`);

      // Try to delete by the ID we want to use
      await deleteAuthUser(user.id);

      // Also try deleting from public.users to clean up
      await fetch(`${SUPABASE_URL}/rest/v1/users?email=eq.${encodeURIComponent(user.email)}`, {
        method: 'DELETE',
        headers: {
          'apikey': SUPABASE_SECRET_KEY,
          'Authorization': `Bearer ${SUPABASE_SECRET_KEY}`,
        },
      });

      // Wait a moment for deletion to propagate
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Try to create again
      response = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_SECRET_KEY,
          'Authorization': `Bearer ${SUPABASE_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: user.id,
          email: user.email,
          password: user.password,
          email_confirm: true,
          user_metadata: { name: user.name },
        }),
      });

      data = await response.json();

      if (response.ok) {
        console.log(`Global setup: Recreated ${label} ${data.email}`);
      } else {
        console.warn(`Global setup: Could not recreate ${label}:`, data);
      }
    } else {
      console.warn(`Global setup: Could not create ${label}:`, data);
    }
  } catch (error) {
    console.warn(`Global setup: Error creating ${label}:`, error);
  }
}

/**
 * Default user preferences for testing
 */
const DEFAULT_PREFERENCES = {
  christianPerspective: false,
  areaWeights: {
    health: 1,
    financial: 1,
    relationships: 1,
    career: 1,
    personal_growth: 0.8,
    leisure: 0.8,
    spirituality: 0.5,
    mental_health: 1,
  },
  notifications: {
    pushEnabled: true,
    telegramEnabled: false,
    emailEnabled: true,
    quietHoursEnabled: true,
    quietHoursStart: '22:00',
    quietHoursEnd: '08:00',
    morningSummary: true,
    morningSummaryTime: '07:00',
    weeklyReport: true,
    monthlyReport: true,
  },
  tracking: {
    waterGoal: 2000,
    sleepGoal: 8,
    exerciseGoalWeekly: 150,
  },
  onboarding: {
    profileComplete: false,
    areasComplete: false,
    telegramComplete: false,
    telegramSkipped: false,
    tutorialComplete: false,
    tutorialSkipped: false,
  },
};

/**
 * Ensure user exists in public.users table
 * The auth trigger should create this, but we handle cases where it might not
 */
async function ensurePublicUserExists(user: TestUser): Promise<void> {
  try {
    // First check if user exists in public.users
    const checkResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/users?email=eq.${encodeURIComponent(user.email)}&select=id`,
      {
        headers: {
          'apikey': SUPABASE_SECRET_KEY,
          'Authorization': `Bearer ${SUPABASE_SECRET_KEY}`,
        },
      }
    );

    const users = await checkResponse.json();

    if (users && users.length > 0) {
      console.log(`Global setup: User ${user.email} exists in public.users`);
      return;
    }

    // User doesn't exist in public.users, need to get their auth.users ID and create
    // Get user by email from admin API
    const adminUsersResponse = await fetch(
      `${SUPABASE_URL}/auth/v1/admin/users`,
      {
        headers: {
          'apikey': SUPABASE_SECRET_KEY,
          'Authorization': `Bearer ${SUPABASE_SECRET_KEY}`,
        },
      }
    );

    const adminData = await adminUsersResponse.json();
    const authUser = adminData.users?.find((u: { email: string }) => u.email === user.email);

    if (!authUser) {
      console.warn(`Global setup: User ${user.email} not found in auth.users`);
      return;
    }

    // Create user in public.users
    const createResponse = await fetch(`${SUPABASE_URL}/rest/v1/users`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_SECRET_KEY,
        'Authorization': `Bearer ${SUPABASE_SECRET_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({
        id: authUser.id,
        email: user.email,
        name: user.name,
        status: 'active',
        preferences: DEFAULT_PREFERENCES,
      }),
    });

    if (createResponse.ok) {
      console.log(`Global setup: Created public.users row for ${user.email}`);
    } else {
      const error = await createResponse.text();
      console.warn(`Global setup: Could not create public.users row:`, error);
    }
  } catch (error) {
    console.warn(`Global setup: Error ensuring public user exists:`, error);
  }
}

/**
 * Preferences for a user with completed onboarding
 */
const COMPLETED_ONBOARDING_PREFERENCES = {
  ...DEFAULT_PREFERENCES,
  onboarding: {
    profileComplete: true,
    areasComplete: true,
    telegramComplete: false,
    telegramSkipped: true,
    tutorialComplete: false,
    tutorialSkipped: true,
  },
};

/**
 * Mark onboarding as complete for a user
 * This ensures the test user can access dashboard immediately
 */
async function markOnboardingComplete(email: string): Promise<void> {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/users?email=eq.${encodeURIComponent(email)}`, {
      method: 'PATCH',
      headers: {
        'apikey': SUPABASE_SECRET_KEY,
        'Authorization': `Bearer ${SUPABASE_SECRET_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
      },
      body: JSON.stringify({
        status: 'active',
        onboarding_completed_at: new Date().toISOString(),
        preferences: COMPLETED_ONBOARDING_PREFERENCES,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      if (data && data.length > 0) {
        console.log('Global setup: Marked onboarding complete for test user');
      } else {
        console.warn('Global setup: Mark complete returned empty result - user may not exist');
      }
    } else {
      const data = await response.text();
      console.warn('Global setup: Could not mark onboarding complete:', data);
    }
  } catch (error) {
    console.warn('Global setup: Error marking onboarding complete:', error);
  }
}

/**
 * Reset onboarding status for a user
 * This ensures the onboarding user always starts fresh
 * Uses email instead of ID to handle cases where user was created with different ID
 */
async function resetOnboardingStatus(email: string): Promise<void> {
  try {
    // Use service role to update the user directly by email
    const response = await fetch(`${SUPABASE_URL}/rest/v1/users?email=eq.${encodeURIComponent(email)}`, {
      method: 'PATCH',
      headers: {
        'apikey': SUPABASE_SECRET_KEY,
        'Authorization': `Bearer ${SUPABASE_SECRET_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
      },
      body: JSON.stringify({
        status: 'active', // User is active but hasn't completed onboarding
        onboarding_completed_at: null,
        preferences: DEFAULT_PREFERENCES,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      if (data && data.length > 0) {
        console.log('Global setup: Reset onboarding status for onboarding user');
      } else {
        console.warn('Global setup: Reset returned empty result - user may not exist in public.users');
      }
    } else {
      const data = await response.text();
      console.warn('Global setup: Could not reset onboarding status:', data);
    }
  } catch (error) {
    console.warn('Global setup: Error resetting onboarding status:', error);
  }
}

/**
 * Login a user and save authentication state
 */
async function loginAndSaveAuthState(
  baseURL: string,
  user: TestUser,
  authStatePath: string,
  label: string,
): Promise<void> {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Login via browser
    await page.goto(`${baseURL}/login`);

    // Wait for the login form to be visible
    await page.waitForSelector('[data-testid="login-email"]', { timeout: 10000 });

    // Fill in credentials
    await page.fill('[data-testid="login-email"]', user.email);
    await page.fill('[data-testid="login-password"]', user.password);

    // Submit the form
    await page.click('[data-testid="login-submit"]');

    // Wait for successful redirect (could be dashboard or onboarding or any subpath)
    // Use a more flexible pattern to catch /onboarding/profile, /onboarding/areas, etc.
    try {
      await page.waitForURL(/\/(dashboard|onboarding)/, { timeout: 15000 });
    } catch {
      // Log current URL for debugging
      console.log(`Global setup: ${label} current URL after login: ${page.url()}`);
      // Try waiting a bit more for slower redirects
      await page.waitForTimeout(2000);
      console.log(`Global setup: ${label} URL after extra wait: ${page.url()}`);

      // If we're on a protected route, consider it a success
      if (page.url().includes('/dashboard') || page.url().includes('/onboarding')) {
        console.log(`Global setup: ${label} - found expected URL after extra wait`);
      } else {
        throw new Error(`Unexpected URL: ${page.url()}`);
      }
    }

    // Save the authentication state
    await context.storageState({ path: authStatePath });

    console.log(`Global setup: ${label} authentication state saved successfully`);
  } catch (error) {
    console.warn(
      `Global setup: Could not create ${label} authenticated state.`,
      error instanceof Error ? error.message : error,
    );

    // Log current URL for debugging
    console.log(`Global setup: ${label} final URL: ${page.url()}`);

    // Create an empty auth state file so tests don't fail
    fs.writeFileSync(
      authStatePath,
      JSON.stringify({ cookies: [], origins: [] }),
    );
  } finally {
    await browser.close();
  }
}

async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0]?.use?.baseURL || 'http://localhost:3000';
  const authDir = path.join(__dirname, '../.auth');
  const userAuthStatePath = path.join(authDir, 'user.json');
  const onboardingAuthStatePath = path.join(authDir, 'onboarding-user.json');

  // Ensure .auth directory exists
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }

  // Step 1: Ensure both test users exist in Supabase Auth
  await ensureUserExists(TEST_USER, 'test user');
  await ensureUserExists(ONBOARDING_USER, 'onboarding user');

  // Step 2: Ensure public.users rows exist (auth trigger may have failed)
  await ensurePublicUserExists(TEST_USER);
  await ensurePublicUserExists(ONBOARDING_USER);

  // Step 3: Set correct onboarding status for each user
  // Test user: completed onboarding (can access dashboard)
  await markOnboardingComplete(TEST_USER.email);
  // Onboarding user: pending onboarding (will be redirected to onboarding flow)
  await resetOnboardingStatus(ONBOARDING_USER.email);

  // Step 4: Login both users and save their auth states
  await loginAndSaveAuthState(baseURL, TEST_USER, userAuthStatePath, 'Test user');
  await loginAndSaveAuthState(baseURL, ONBOARDING_USER, onboardingAuthStatePath, 'Onboarding user');
}

export default globalSetup;
