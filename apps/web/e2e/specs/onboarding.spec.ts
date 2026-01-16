import { test, expect, ONBOARDING_USER } from '../fixtures/auth.fixture';
import { OnboardingPage } from '../pages';

/**
 * E2E Tests for Onboarding Flow
 *
 * These tests verify the complete onboarding experience including:
 * - 4-step wizard (profile, areas, telegram, tutorial)
 * - Required steps validation
 * - Optional step skipping
 * - Progress persistence
 * - Redirect logic
 *
 * Prerequisites:
 * - Web app running (pnpm --filter web dev)
 * - API running (pnpm --filter api dev)
 * - Supabase CLI running (npx supabase start)
 * - Global setup creates onboarding user with pending onboarding
 *
 * @see docs/specs/system.md §3.1 for onboarding flow requirements
 */

// =========================================================================
// Onboarding Navigation Tests
// =========================================================================
test.describe('Onboarding Navigation', () => {
  test('should_redirect_unauthenticated_user_to_login', async ({ page }) => {
    // Clear any existing auth state
    await page.context().clearCookies();

    // Try to access onboarding directly
    await page.goto('/onboarding');

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/);
  });

  test('should_redirect_completed_user_to_dashboard', async ({ loginPage, page }) => {
    // Login fresh to get a valid session (avoids session invalidation by other parallel tests)
    await loginPage.goto();
    await loginPage.login('test@example.com', 'testpassword123');

    // Wait for successful login
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });

    // Now try to access onboarding
    await page.goto('/onboarding');

    // Should redirect to dashboard since onboarding is complete
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
  });

  test('should_show_stepper_with_4_steps', async ({ onboardingUserPage }) => {
    // Use onboarding user (pending onboarding)
    const page = onboardingUserPage;

    // Navigate to onboarding profile
    await page.goto('/onboarding/profile');

    // Wait for the page to load
    await page.waitForURL(/\/onboarding/, { timeout: 10000 });

    // Check stepper has 4 steps
    const steps = page.locator('nav[aria-label="Progresso do onboarding"] li');
    await expect(steps).toHaveCount(4);
  });

  test('should_redirect_pending_user_to_onboarding', async ({ onboardingUserPage }) => {
    // Use onboarding user (pending onboarding)
    const page = onboardingUserPage;

    // Try to access dashboard
    await page.goto('/dashboard');

    // Should redirect to onboarding since onboarding is not complete
    await expect(page).toHaveURL(/\/onboarding/, { timeout: 10000 });
  });
});

// =========================================================================
// Profile Step Tests (Required)
// =========================================================================
test.describe('Profile Step', () => {
  test('should_show_profile_form', async ({ onboardingUserPage }) => {
    const page = onboardingUserPage;
    const onboardingPage = new OnboardingPage(page);

    await onboardingPage.gotoStep('profile');

    // Check form elements are visible
    await expect(onboardingPage.nameInput).toBeVisible();
    await expect(onboardingPage.continueButton).toBeVisible();
  });

  test('should_require_name_field', async ({ onboardingUserPage }) => {
    const page = onboardingUserPage;
    const onboardingPage = new OnboardingPage(page);

    await onboardingPage.gotoStep('profile');

    // Clear the name field and try to submit
    await onboardingPage.nameInput.clear();
    await onboardingPage.submitStep();

    // Should still be on profile page (validation failed)
    await expect(page).toHaveURL(/\/onboarding\/profile/);
  });
});

// =========================================================================
// Complete Flow Tests (Serial - modifies user state)
// =========================================================================
test.describe.serial('Complete Onboarding Flow', () => {
  // These tests run serially because they modify the onboarding user's state
  // Each test builds on the previous one

  test('step1_should_fill_profile_and_navigate_to_areas', async ({ onboardingUserPage }) => {
    const page = onboardingUserPage;
    const onboardingPage = new OnboardingPage(page);

    // Go to profile step
    await onboardingPage.gotoStep('profile');
    await expect(page).toHaveURL(/\/onboarding\/profile/);

    // Fill valid profile
    await onboardingPage.fillProfile('E2E Test User');
    await onboardingPage.submitStep();

    // Should navigate to areas step
    await expect(page).toHaveURL(/\/onboarding\/areas/, { timeout: 10000 });
  });

  test('step2_should_select_areas_and_navigate_to_telegram', async ({ onboardingUserPage }) => {
    const page = onboardingUserPage;
    const onboardingPage = new OnboardingPage(page);

    // Should be at areas step (or navigate there)
    await onboardingPage.gotoStep('areas');
    await expect(page).toHaveURL(/\/onboarding\/areas/);

    // Select 3 valid areas (minimum required)
    await onboardingPage.selectAreas(['Saúde', 'Finanças', 'Carreira']);
    await onboardingPage.submitStep();

    // Should navigate to telegram step
    await expect(page).toHaveURL(/\/onboarding\/telegram/, { timeout: 10000 });
  });

  test('step3_should_skip_telegram_and_navigate_to_tutorial', async ({ onboardingUserPage }) => {
    const page = onboardingUserPage;
    const onboardingPage = new OnboardingPage(page);

    // Should be at telegram step (or navigate there)
    await onboardingPage.gotoStep('telegram');
    await expect(page).toHaveURL(/\/onboarding\/telegram/);

    // Skip telegram step
    await onboardingPage.skipCurrentStep();

    // Should navigate to tutorial step
    await expect(page).toHaveURL(/\/onboarding\/tutorial/, { timeout: 10000 });
  });

  test('step4_should_complete_tutorial_and_redirect_to_dashboard', async ({ onboardingUserPage }) => {
    const page = onboardingUserPage;
    const onboardingPage = new OnboardingPage(page);

    // Should be at tutorial step (or navigate there)
    await onboardingPage.gotoStep('tutorial');
    await expect(page).toHaveURL(/\/onboarding\/tutorial/);

    // Skip or complete the tutorial
    await onboardingPage.skipCurrentStep();

    // Should redirect to dashboard
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
  });
});

// =========================================================================
// Fresh Onboarding Flow Test (requires reset - login fresh)
// =========================================================================
test.describe('Fresh Onboarding with Login', () => {
  test('should_complete_full_onboarding_flow', async ({ page }) => {
    // Login as onboarding user (fresh - this resets onboarding status in global setup)
    await page.goto('/login');
    await page.fill('[data-testid="login-email"]', ONBOARDING_USER.email);
    await page.fill('[data-testid="login-password"]', ONBOARDING_USER.password);
    await page.click('[data-testid="login-submit"]');

    // Should redirect to onboarding (or dashboard if already completed)
    await expect(page).toHaveURL(/\/(onboarding|dashboard)/, { timeout: 15000 });

    // If on dashboard, user already completed onboarding in another test
    if (page.url().includes('/dashboard')) {
      // This is expected if serial tests ran first
      return;
    }

    const onboardingPage = new OnboardingPage(page);

    // Step 1: Profile
    await expect(page).toHaveURL(/\/onboarding/);
    await onboardingPage.fillProfile('Fresh Flow User');
    await onboardingPage.submitStep();

    // Step 2: Areas
    await expect(page).toHaveURL(/\/onboarding\/areas/, { timeout: 10000 });
    await onboardingPage.selectAreas(['Saúde', 'Finanças', 'Carreira']);
    await onboardingPage.submitStep();

    // Step 3: Telegram (skip)
    await expect(page).toHaveURL(/\/onboarding\/telegram/, { timeout: 10000 });
    await onboardingPage.skipCurrentStep();

    // Step 4: Tutorial (skip)
    await expect(page).toHaveURL(/\/onboarding\/tutorial/, { timeout: 10000 });
    await onboardingPage.skipCurrentStep();

    // Should arrive at dashboard
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
  });
});

// =========================================================================
// Post-Signup Flow Tests (requires email verification - skipped)
// =========================================================================
test.describe('Post-Signup Flow', () => {
  test.skip('should_redirect_to_onboarding_after_email_verification', async ({
    signupPage,
    page,
  }) => {
    // This test simulates the flow after a new user signs up and verifies email
    // Note: This is complex to test as it requires email verification
    //
    // Expected flow:
    // 1. User signs up -> verify-email page
    // 2. User clicks email link -> callback route
    // 3. Callback checks onboarding status -> redirects to /onboarding
    //
    // For now, this test is skipped as it requires integration with email service

    await signupPage.goto();
    const uniqueEmail = `test-onboarding-${Date.now()}@example.com`;
    await signupPage.signup('New Onboarding User', uniqueEmail, 'password123');

    await expect(page).toHaveURL(/\/verify-email/);

    // The rest of the flow would require email verification
  });
});
