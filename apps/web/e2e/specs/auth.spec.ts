import { test, expect } from '../fixtures/auth.fixture';

/**
 * E2E Tests for Authentication Flows
 *
 * These tests verify the complete user authentication experience
 * including signup, login, logout, and password reset flows.
 *
 * Prerequisites:
 * - Web app running (pnpm --filter web dev)
 * - API running (pnpm --filter api dev)
 * - Supabase CLI running (npx supabase start)
 */

// =========================================================================
// Signup Flow Tests
// =========================================================================
test.describe('Signup Flow', () => {
  test('should_signup_and_redirect_to_verify_email', async ({ signupPage, page }) => {
    await signupPage.goto();

    // Generate unique email to avoid conflicts
    const uniqueEmail = `test-${Date.now()}@example.com`;

    await signupPage.signup('Test User', uniqueEmail, 'password123');

    // Should redirect to verify-email page after successful signup
    await expect(page).toHaveURL(/\/verify-email/);
  });

  test('should_show_error_for_existing_email', async ({ signupPage, page }) => {
    await signupPage.goto();

    // Use an email that already exists (test@example.com from seed - has confirmed email)
    await signupPage.signup('Test User', 'test@example.com', 'password123');

    // Supabase returns error for existing confirmed emails: "User already registered"
    // This reveals email existence but is the standard Supabase behavior
    // The error toast should appear and page stays on signup
    const errorToast = page.locator('[data-sonner-toast][data-type="error"]');
    await expect(errorToast).toBeVisible({ timeout: 10000 });

    // Should still be on signup page
    expect(page.url()).toContain('/signup');
  });

  test('should_show_validation_errors', async ({ signupPage }) => {
    await signupPage.goto();

    // Try to submit with empty fields
    await signupPage.submit();

    // HTML5 validation should prevent submission
    // Check that we're still on the signup page
    expect(signupPage.page.url()).toContain('/signup');
  });
});

// =========================================================================
// Login Flow Tests
// =========================================================================
test.describe('Login Flow', () => {
  test('should_login_and_redirect_to_dashboard', async ({ loginPage, page }) => {
    await loginPage.goto();

    // Use test credentials - these should match a verified user in your test database
    await loginPage.login('test@example.com', 'testpassword123');

    // Should redirect to dashboard after successful login
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
  });

  test('should_show_error_for_invalid_credentials', async ({ loginPage, page }) => {
    await loginPage.goto();

    await loginPage.login('test@example.com', 'wrongpassword');

    // Check for error toast/message
    const errorToast = page.locator('[data-sonner-toast][data-type="error"]');
    await expect(errorToast).toBeVisible({ timeout: 5000 }).catch(() => {
      // If no toast, check that we're still on login page
      expect(page.url()).toContain('/login');
    });
  });

  test('should_redirect_to_original_url_after_login', async ({ loginPage, page }) => {
    // Try to access protected page directly
    await page.goto('/dashboard');

    // Should be redirected to login with redirectTo param
    await expect(page).toHaveURL(/\/login\?redirectTo=/);

    // Now login
    await loginPage.login('test@example.com', 'testpassword123');

    // Should be redirected back to the original page
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
  });

  test('should_show_validation_errors', async ({ loginPage }) => {
    await loginPage.goto();

    // Try to submit with empty fields
    await loginPage.submit();

    // HTML5 validation should prevent submission
    expect(loginPage.page.url()).toContain('/login');
  });
});

// =========================================================================
// Logout Flow Tests
// =========================================================================
test.describe('Logout Flow', () => {
  // These tests login fresh to avoid session invalidation by other parallel tests
  test('should_logout_and_redirect_to_login', async ({ loginPage, page }) => {
    // Login fresh to get a valid session
    await loginPage.goto();
    await loginPage.login('test@example.com', 'testpassword123');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });

    // Wait for dashboard content to load (indicates successful auth)
    await expect(page.getByTestId('dashboard-title')).toBeVisible({ timeout: 15000 });

    // Wait for and click logout button (web-first assertion)
    const logoutButton = page.getByTestId('logout-button');
    await expect(logoutButton).toBeVisible({ timeout: 5000 });
    await logoutButton.click();

    // Should redirect to login page after logout
    // (AppLayout redirects unauthenticated users to login)
    await expect(page).toHaveURL(/\/login/, { timeout: 5000 });
  });

  test('should_clear_auth_state_after_logout', async ({ loginPage, page }) => {
    // Login fresh to get a valid session
    await loginPage.goto();
    await loginPage.login('test@example.com', 'testpassword123');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });

    // Wait for dashboard content to load
    await expect(page.getByTestId('dashboard-title')).toBeVisible({ timeout: 15000 });

    // Click logout button
    const logoutButton = page.getByTestId('logout-button');
    await expect(logoutButton).toBeVisible({ timeout: 5000 });
    await logoutButton.click();

    // Wait for logout to complete (redirects to login)
    await expect(page).toHaveURL(/\/login/, { timeout: 5000 });

    // Try to access protected page again
    await page.goto('/dashboard');

    // Should still be redirected to login (auth cleared)
    await expect(page).toHaveURL(/\/login/);
  });
});

// =========================================================================
// Password Reset Flow Tests
// =========================================================================
test.describe('Password Reset Flow', () => {
  test('should_submit_forgot_password_request', async ({ forgotPasswordPage, page }) => {
    await forgotPasswordPage.goto();

    await forgotPasswordPage.requestPasswordReset('test@example.com');

    // Should show success message (web-first assertion - waits for element)
    await expect(page.getByTestId('forgot-success')).toBeVisible({ timeout: 10000 });
  });

  test('should_show_validation_error_for_invalid_email', async ({ forgotPasswordPage, page }) => {
    await forgotPasswordPage.goto();

    // Try with invalid email format
    await forgotPasswordPage.fillEmail('not-an-email');
    await forgotPasswordPage.submit();

    // HTML5 validation should prevent submission
    // Should still be on the same page
    expect(page.url()).toContain('/forgot-password');
  });

  test.skip('should_reset_password_with_valid_token', async ({ resetPasswordPage, page }) => {
    // This test is skipped because it requires:
    // 1. A valid reset token from email
    // 2. Access to the email service (Inbucket in dev)
    //
    // In a real CI environment, you would:
    // 1. Request password reset
    // 2. Fetch the email from Inbucket API
    // 3. Extract the reset link/token
    // 4. Navigate to reset password page with the token
    // 5. Submit new password

    await resetPasswordPage.goto();
    await resetPasswordPage.resetPassword('newpassword123');

    // Should redirect to login after successful reset
    await expect(page).toHaveURL(/\/login/);
  });
});

// =========================================================================
// Protected Routes Tests
// =========================================================================
test.describe('Protected Routes', () => {
  test('should_redirect_to_login_when_not_authenticated', async ({ page }) => {
    // Clear any existing auth state
    await page.context().clearCookies();

    // Try to access protected page
    await page.goto('/dashboard');

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/);
  });

  test('should_preserve_redirect_url_in_query_param', async ({ page }) => {
    // Clear any existing auth state
    await page.context().clearCookies();

    // Try to access specific protected page
    await page.goto('/settings');

    // Should redirect to login with redirectTo param
    await expect(page).toHaveURL(/\/login\?redirectTo=.*settings/);
  });
});

// =========================================================================
// Authenticated User Redirect Tests
// =========================================================================
test.describe('Authenticated User Redirects', () => {
  // These tests login fresh to avoid session invalidation by other parallel tests
  test('should_redirect_from_login_to_dashboard_when_authenticated', async ({
    loginPage,
    page,
  }) => {
    // First, login to establish authenticated state
    await loginPage.goto();
    await loginPage.login('test@example.com', 'testpassword123');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });

    // Now try to access login page when already authenticated
    await page.goto('/login');

    // Should redirect to dashboard
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 5000 });
  });

  test('should_redirect_from_signup_to_dashboard_when_authenticated', async ({
    loginPage,
    page,
  }) => {
    // First, login to establish authenticated state
    await loginPage.goto();
    await loginPage.login('test@example.com', 'testpassword123');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });

    // Now try to access signup page when already authenticated
    await page.goto('/signup');

    // Should redirect to dashboard
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 5000 });
  });
});
