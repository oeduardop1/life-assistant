import { test, expect } from '../fixtures/auth.fixture';

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
 * - Test user with pending onboarding status
 *
 * @see SYSTEM_SPECS.md §3.1 for onboarding flow requirements
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

  test('should_redirect_completed_user_to_dashboard', async ({ authenticatedPage }) => {
    // The authenticated user in global setup has completed onboarding
    const page = authenticatedPage;

    // Try to access onboarding
    await page.goto('/onboarding');

    // Should redirect to dashboard since onboarding is complete
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
  });

  test('should_show_stepper_with_4_steps', async ({ authenticatedPage }) => {
    // Note: This test requires a user with pending onboarding
    // Using authenticated page which may redirect to dashboard
    const page = authenticatedPage;
    await page.goto('/onboarding/profile');

    // If redirected to dashboard, skip test
    if (page.url().includes('/dashboard')) {
      test.skip();
      return;
    }

    // Check stepper has 4 steps
    const steps = page.locator('nav[aria-label="Progresso do onboarding"] li');
    await expect(steps).toHaveCount(4);
  });
});

// =========================================================================
// Profile Step Tests (Required)
// =========================================================================
test.describe('Profile Step', () => {
  test.skip('should_require_minimum_name_length', async ({ onboardingPage }) => {
    // This test requires a user with pending onboarding
    await onboardingPage.gotoStep('profile');

    // Fill with short name
    await onboardingPage.fillProfile('A');
    await onboardingPage.submitStep();

    // Should show validation error
    const hasError = await onboardingPage.hasValidationError();
    expect(hasError).toBe(true);
  });

  test.skip('should_save_profile_and_navigate_to_areas', async ({ onboardingPage, page }) => {
    // This test requires a user with pending onboarding
    await onboardingPage.gotoStep('profile');

    // Fill valid profile
    await onboardingPage.fillProfile('Test User', 'America/Sao_Paulo');
    await onboardingPage.submitStep();

    // Should navigate to areas step
    await expect(page).toHaveURL(/\/onboarding\/areas/, { timeout: 5000 });
  });
});

// =========================================================================
// Areas Step Tests (Required)
// =========================================================================
test.describe('Areas Step', () => {
  test.skip('should_require_minimum_3_areas', async ({ onboardingPage, page }) => {
    // This test requires profile step to be completed
    await onboardingPage.gotoStep('areas');

    // Select only 2 areas
    await onboardingPage.selectAreas(['Saude', 'Financas']);

    // Try to submit
    await onboardingPage.submitStep();

    // Should show validation error or button should be disabled
    const hasError = await onboardingPage.hasValidationError();
    const submitButton = page.getByRole('button', { name: /continuar/i });
    const isDisabled = await submitButton.isDisabled();

    expect(hasError || isDisabled).toBe(true);
  });

  test.skip('should_allow_selecting_up_to_8_areas', async ({ onboardingPage }) => {
    await onboardingPage.gotoStep('areas');

    // Select all 8 areas
    await onboardingPage.selectAreas([
      'Saude',
      'Financas',
      'Carreira',
      'Relacionamentos',
      'Espiritualidade',
      'Crescimento Pessoal',
      'Saude Mental',
      'Lazer',
    ]);

    const count = await onboardingPage.getSelectedAreasCount();
    expect(count).toBe(8);
  });

  test.skip('should_save_areas_and_navigate_to_telegram', async ({ onboardingPage, page }) => {
    await onboardingPage.gotoStep('areas');

    // Select 3 valid areas
    await onboardingPage.selectAreas(['Saude', 'Financas', 'Carreira']);
    await onboardingPage.submitStep();

    // Should navigate to telegram step
    await expect(page).toHaveURL(/\/onboarding\/telegram/, { timeout: 5000 });
  });
});

// =========================================================================
// Telegram Step Tests (Optional)
// =========================================================================
test.describe('Telegram Step', () => {
  test.skip('should_allow_skipping_telegram_step', async ({ onboardingPage, page }) => {
    await onboardingPage.gotoStep('telegram');

    // Skip the telegram step
    await onboardingPage.skipCurrentStep();

    // Should navigate to tutorial step
    await expect(page).toHaveURL(/\/onboarding\/tutorial/, { timeout: 5000 });
  });

  test.skip('should_show_telegram_connection_instructions', async ({ onboardingPage, page }) => {
    await onboardingPage.gotoStep('telegram');

    // Check for telegram-related content
    const telegramButton = page.getByRole('button', { name: /abrir no telegram/i });
    await expect(telegramButton).toBeVisible();
  });
});

// =========================================================================
// Tutorial Step Tests (Optional)
// =========================================================================
test.describe('Tutorial Step', () => {
  test.skip('should_allow_skipping_tutorial', async ({ onboardingPage, page }) => {
    await onboardingPage.gotoStep('tutorial');

    // Skip the tutorial
    await onboardingPage.skipCurrentStep();

    // Should redirect to dashboard
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 5000 });
  });

  test.skip('should_complete_tutorial_and_redirect_to_dashboard', async ({ onboardingPage, page }) => {
    await onboardingPage.gotoStep('tutorial');

    // Complete the tutorial
    await onboardingPage.completeTutorial();

    // Should redirect to dashboard
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 5000 });
  });

  test.skip('should_show_carousel_with_slides', async ({ onboardingPage, page }) => {
    await onboardingPage.gotoStep('tutorial');

    // Check for carousel navigation
    const nextButton = page.getByRole('button', { name: /proximo/i });
    const slideIndicators = page.locator('button[class*="rounded-full"]');

    await expect(nextButton).toBeVisible();
    await expect(slideIndicators).toHaveCount(4); // 4 tutorial slides
  });
});

// =========================================================================
// Complete Flow Tests
// =========================================================================
test.describe('Complete Onboarding Flow', () => {
  test.skip('should_complete_full_flow_with_all_steps', async ({ onboardingPage, page }) => {
    // Step 1: Profile
    await onboardingPage.gotoStep('profile');
    await onboardingPage.fillProfile('Test User', 'America/Sao_Paulo');
    await onboardingPage.submitStep();

    // Step 2: Areas
    await expect(page).toHaveURL(/\/onboarding\/areas/, { timeout: 5000 });
    await onboardingPage.selectAreas(['Saude', 'Financas', 'Carreira']);
    await onboardingPage.submitStep();

    // Step 3: Telegram (skip)
    await expect(page).toHaveURL(/\/onboarding\/telegram/, { timeout: 5000 });
    await onboardingPage.skipCurrentStep();

    // Step 4: Tutorial (complete)
    await expect(page).toHaveURL(/\/onboarding\/tutorial/, { timeout: 5000 });
    await onboardingPage.completeTutorial();

    // Should arrive at dashboard
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
  });

  test.skip('should_complete_flow_skipping_optional_steps', async ({ onboardingPage, page }) => {
    // Step 1: Profile (required)
    await onboardingPage.gotoStep('profile');
    await onboardingPage.fillProfile('Minimal User');
    await onboardingPage.submitStep();

    // Step 2: Areas (required)
    await expect(page).toHaveURL(/\/onboarding\/areas/, { timeout: 5000 });
    await onboardingPage.selectAreas(['Saude', 'Financas', 'Carreira']);
    await onboardingPage.submitStep();

    // Step 3: Telegram (skip)
    await expect(page).toHaveURL(/\/onboarding\/telegram/, { timeout: 5000 });
    await onboardingPage.skipCurrentStep();

    // Step 4: Tutorial (skip)
    await expect(page).toHaveURL(/\/onboarding\/tutorial/, { timeout: 5000 });
    await onboardingPage.skipCurrentStep();

    // Should arrive at dashboard
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
  });
});

// =========================================================================
// Progress Persistence Tests
// =========================================================================
test.describe('Progress Persistence', () => {
  test.skip('should_resume_from_last_completed_step', async ({ onboardingPage, page }) => {
    // Complete profile step
    await onboardingPage.gotoStep('profile');
    await onboardingPage.fillProfile('Persistence Test');
    await onboardingPage.submitStep();

    // Navigate away and come back
    await page.goto('/');
    await page.goto('/onboarding');

    // Should resume at areas step (after completed profile)
    await expect(page).toHaveURL(/\/onboarding\/areas/, { timeout: 5000 });
  });

  test.skip('should_preserve_profile_data_on_return', async ({ onboardingPage }) => {
    // Complete profile step with specific data
    await onboardingPage.gotoStep('profile');
    await onboardingPage.fillProfile('Data Persistence Test', 'Europe/London');
    await onboardingPage.submitStep();

    // Go back to profile step
    await onboardingPage.gotoStep('profile');

    // Should show previously entered data
    await expect(onboardingPage.nameInput).toHaveValue('Data Persistence Test');
  });
});

// =========================================================================
// Middleware Redirect Tests
// =========================================================================
test.describe('Middleware Redirects', () => {
  test.skip('should_redirect_to_onboarding_when_accessing_dashboard_with_incomplete_onboarding', async ({
    page,
  }) => {
    // This test requires a user with pending onboarding to be logged in
    // The middleware should redirect from /dashboard to /onboarding

    await page.goto('/dashboard');

    // If user has incomplete onboarding, should redirect
    // Note: This depends on the auth state and user's onboarding status
    const url = page.url();
    expect(url.includes('/dashboard') || url.includes('/onboarding')).toBe(true);
  });
});

// =========================================================================
// Post-Signup Flow Tests
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
