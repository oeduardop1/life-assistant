import type { FullConfig } from '@playwright/test';

/**
 * Global teardown for E2E tests
 * Cleans up dynamic test users created during test runs (see ADR-013)
 *
 * This teardown runs after all tests and:
 * 1. Removes dynamic test users (test-{timestamp}@example.com pattern)
 * 2. Preserves fixed test users (test@example.com, onboarding@example.com)
 *
 * The cleanup is selective to:
 * - Preserve development data created manually
 * - Keep fixed test users for faster subsequent runs
 * - Only remove users created by E2E signup tests
 */

// Supabase local CLI credentials (same as global-setup.ts)
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const SUPABASE_SECRET_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz';

// Fixed test users that should NOT be deleted
const PRESERVED_EMAILS = ['test@example.com', 'onboarding@example.com'];

// Pattern for dynamic test users created by E2E tests
const DYNAMIC_USER_PATTERN = /^test-\d+@example\.com$/;

interface AuthUser {
  id: string;
  email: string;
}

/**
 * Get all auth users from Supabase
 * Uses pagination to fetch all users
 */
async function getAllAuthUsers(): Promise<AuthUser[]> {
  const allUsers: AuthUser[] = [];

  try {
    let page = 1;
    const perPage = 1000;

    while (page <= 10) {
      const response = await fetch(
        `${SUPABASE_URL}/auth/v1/admin/users?page=${page}&per_page=${perPage}`,
        {
          headers: {
            apikey: SUPABASE_SECRET_KEY,
            Authorization: `Bearer ${SUPABASE_SECRET_KEY}`,
          },
        }
      );

      if (!response.ok) {
        console.warn(`Global teardown: Failed to fetch auth users: ${response.status}`);
        break;
      }

      const data = await response.json();
      const users = data.users || [];
      allUsers.push(...users);

      if (users.length < perPage) {
        break;
      }

      page++;
    }
  } catch (error) {
    console.warn('Global teardown: Error fetching auth users:', error);
  }

  return allUsers;
}

/**
 * Delete auth user by ID
 */
async function deleteAuthUser(userId: string): Promise<boolean> {
  try {
    const response = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
      method: 'DELETE',
      headers: {
        apikey: SUPABASE_SECRET_KEY,
        Authorization: `Bearer ${SUPABASE_SECRET_KEY}`,
      },
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Check if a user should be cleaned up
 * Returns true for dynamic test users (test-{timestamp}@example.com)
 * Returns false for preserved users and non-test users
 */
function shouldDeleteUser(email: string): boolean {
  // Never delete preserved test users
  if (PRESERVED_EMAILS.includes(email)) {
    return false;
  }

  // Only delete users matching the dynamic test pattern
  return DYNAMIC_USER_PATTERN.test(email);
}

/**
 * Main teardown function
 * Cleans up dynamic test users created during E2E tests
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function globalTeardown(_config: FullConfig): Promise<void> {
  console.log('🧹 Running global teardown...');

  // Get all auth users
  const users = await getAllAuthUsers();
  console.log(`Global teardown: Found ${users.length} total auth users`);

  // Filter to dynamic test users
  const usersToDelete = users.filter((user) => shouldDeleteUser(user.email));

  if (usersToDelete.length === 0) {
    console.log('Global teardown: No dynamic test users to clean up');
    console.log('✅ Global teardown complete');
    return;
  }

  console.log(`Global teardown: Found ${usersToDelete.length} dynamic test users to clean up`);

  // Delete each dynamic test user
  let deletedCount = 0;
  let failedCount = 0;

  for (const user of usersToDelete) {
    const success = await deleteAuthUser(user.id);
    if (success) {
      deletedCount++;
    } else {
      failedCount++;
      console.warn(`Global teardown: Failed to delete user ${user.email}`);
    }
  }

  console.log(`Global teardown: Deleted ${deletedCount} users, ${failedCount} failed`);
  console.log('✅ Global teardown complete');
}

export default globalTeardown;
