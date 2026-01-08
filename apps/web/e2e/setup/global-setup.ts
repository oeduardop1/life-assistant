import { chromium, FullConfig } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Global setup for E2E tests
 * Creates a test user and saves the authentication state for reuse
 *
 * This setup runs before all tests and creates an authenticated session
 * that can be reused by tests that need an authenticated user.
 *
 * Note: In a real environment, you would need Supabase running locally
 * with a test user created. For CI, you might want to use API calls
 * to create the test user directly.
 */
async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0]?.use?.baseURL || 'http://localhost:3000';
  const authStatePath = path.join(__dirname, '../.auth/user.json');

  // Ensure .auth directory exists
  const authDir = path.dirname(authStatePath);
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }

  // Test user credentials - should match a user in your test database
  const testUser = {
    email: process.env.TEST_USER_EMAIL || 'test@example.com',
    password: process.env.TEST_USER_PASSWORD || 'testpassword123',
  };

  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Navigate to login page
    await page.goto(`${baseURL}/login`);

    // Wait for the login form to be visible
    await page.waitForSelector('[data-testid="login-email"]', { timeout: 10000 });

    // Fill in credentials
    await page.fill('[data-testid="login-email"]', testUser.email);
    await page.fill('[data-testid="login-password"]', testUser.password);

    // Submit the form
    await page.click('[data-testid="login-submit"]');

    // Wait for successful redirect to dashboard
    await page.waitForURL('**/dashboard', { timeout: 15000 });

    // Save the authentication state
    await context.storageState({ path: authStatePath });

    console.log('Global setup: Authentication state saved successfully');
  } catch (error) {
    console.warn(
      'Global setup: Could not create authenticated state.',
      'Tests requiring authentication will create their own sessions.',
      error instanceof Error ? error.message : error,
    );

    // Create an empty auth state file so tests don't fail
    fs.writeFileSync(
      authStatePath,
      JSON.stringify({ cookies: [], origins: [] }),
    );
  } finally {
    await browser.close();
  }
}

export default globalSetup;
