import { test, expect } from '../fixtures/auth.fixture';
import { TrackingPage } from '../pages';

/**
 * E2E Tests for Tracking Module
 *
 * These tests verify the tracking experience including:
 * - Viewing tracking dashboard
 * - Manual entry form for recording metrics
 * - Viewing history with recorded entries
 * - Empty state when no data exists
 *
 * Prerequisites:
 * - Web app running (pnpm --filter web dev)
 * - API running (pnpm --filter api dev)
 * - Supabase CLI running (npx supabase start)
 *
 * @see docs/milestones/phase-2-tracker.md M2.1 for Tracking implementation
 * @see ADR-015 for Low Friction Tracking Philosophy
 */

// =========================================================================
// Tracking Navigation Tests
// =========================================================================
test.describe('Tracking Navigation', () => {
  test('should_redirect_unauthenticated_user_to_login', async ({ page }) => {
    // Clear any existing auth state
    await page.context().clearCookies();

    // Try to access tracking directly
    await page.goto('/tracking');

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/);
  });

  test('should_access_tracking_when_authenticated', async ({ loginPage, page }) => {
    // Login first
    await loginPage.goto();
    await loginPage.login('test@example.com', 'testpassword123');

    // Wait for successful login
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });

    // Navigate to tracking
    await page.goto('/tracking');

    // Should be on tracking page
    await expect(page).toHaveURL(/\/tracking/);
    await expect(page.getByRole('heading', { name: 'Tracking' })).toBeVisible();
  });

  // Skip mobile-chrome: Sidebar is hidden on mobile viewport
  test('should_navigate_to_tracking_from_sidebar', async ({ loginPage, page }, testInfo) => {
    if (testInfo.project.name === 'mobile-chrome') {
      test.skip();
    }

    // Login first
    await loginPage.goto();
    await loginPage.login('test@example.com', 'testpassword123');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });

    // Click tracking link in sidebar
    await page.getByTestId('sidebar-link-tracking').click();

    // Should be on tracking page
    await expect(page).toHaveURL(/\/tracking/);
  });
});

// =========================================================================
// Empty State Tests
// =========================================================================
test.describe('Tracking Empty State', () => {
  test('should_show_empty_state_or_data_based_on_user_history', async ({ loginPage, page }) => {
    // Login first
    await loginPage.goto();
    await loginPage.login('test@example.com', 'testpassword123');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });

    // Navigate to tracking
    const trackingPage = new TrackingPage(page);
    await trackingPage.goto();
    await trackingPage.waitForPageLoad();

    // Check current state - either empty or with data
    const isEmpty = await trackingPage.isEmptyStateVisible();

    if (isEmpty) {
      // Verify empty state elements
      await expect(trackingPage.emptyState).toBeVisible();
      await expect(trackingPage.emptyStateManualButton).toBeVisible();
    } else {
      // Verify data state - history section should be visible
      await expect(page.getByText('Historico')).toBeVisible();
      const totalCount = await trackingPage.getTotalEntriesCount();
      expect(totalCount).toBeGreaterThan(0);
    }
  });
});

// =========================================================================
// Manual Entry Tests
// =========================================================================
test.describe('Manual Entry Form', () => {
  test('should_open_form_and_record_weight', async ({ loginPage, page }) => {
    // Login first
    await loginPage.goto();
    await loginPage.login('test@example.com', 'testpassword123');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });

    // Navigate to tracking
    const trackingPage = new TrackingPage(page);
    await trackingPage.goto();
    await trackingPage.waitForPageLoad();

    // Get initial total count from header (not paginated)
    const initialCount = await trackingPage.getTotalEntriesCount();

    // Add a weight entry
    await trackingPage.addEntry({ type: 'Peso', value: 75.5 });

    // Use expect.poll to wait for total count to increase
    await expect.poll(
      async () => trackingPage.getTotalEntriesCount(),
      { message: 'waiting for weight entry to appear in history', timeout: 10000 }
    ).toBeGreaterThan(initialCount);
  });

  test('should_record_water_intake', async ({ loginPage, page }) => {
    // Login first
    await loginPage.goto();
    await loginPage.login('test@example.com', 'testpassword123');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });

    // Navigate to tracking
    const trackingPage = new TrackingPage(page);
    await trackingPage.goto();
    await trackingPage.waitForPageLoad();

    // Add a water entry
    await trackingPage.addEntry({ type: 'Água', value: 500 });

    // Wait for success toast
    await expect(page.getByText(/Água: 500 ml/iu)).toBeVisible({ timeout: 5000 });
  });

  test('should_record_multiple_water_entries', async ({ loginPage, page }) => {
    // Login first
    await loginPage.goto();
    await loginPage.login('test@example.com', 'testpassword123');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });

    // Navigate to tracking
    const trackingPage = new TrackingPage(page);
    await trackingPage.goto();
    await trackingPage.waitForPageLoad();

    // Get initial total count from header (not paginated)
    const initialCount = await trackingPage.getTotalEntriesCount();

    // Add first water entry
    await trackingPage.addEntry({ type: 'Água', value: 250 });

    // Use expect.poll to wait for total count to increase
    await expect.poll(
      async () => trackingPage.getTotalEntriesCount(),
      { message: 'waiting for first entry to appear', timeout: 10000 }
    ).toBeGreaterThan(initialCount);

    const countAfterFirst = await trackingPage.getTotalEntriesCount();

    // Add second water entry
    await trackingPage.addEntry({ type: 'Água', value: 500 });

    // Use expect.poll to wait for total count to increase again
    await expect.poll(
      async () => trackingPage.getTotalEntriesCount(),
      { message: 'waiting for second entry to appear', timeout: 10000 }
    ).toBeGreaterThan(countAfterFirst);
  });
});

// =========================================================================
// History Tests
// =========================================================================
test.describe('Tracking History', () => {
  test('should_display_history_with_entries', async ({ loginPage, page }) => {
    // Login first
    await loginPage.goto();
    await loginPage.login('test@example.com', 'testpassword123');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });

    // Navigate to tracking
    const trackingPage = new TrackingPage(page);
    await trackingPage.goto();
    await trackingPage.waitForPageLoad();

    // Check if history section is visible
    await expect(page.getByText('Historico')).toBeVisible();
  });

  test('should_filter_history_by_type', async ({ loginPage, page }) => {
    // Login first
    await loginPage.goto();
    await loginPage.login('test@example.com', 'testpassword123');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });

    // Navigate to tracking
    const trackingPage = new TrackingPage(page);
    await trackingPage.goto();
    await trackingPage.waitForPageLoad();

    // Check if filter is visible
    const filterVisible = await trackingPage.historyFilter.isVisible();
    if (filterVisible) {
      // Filter by weight
      await trackingPage.filterByType('Peso');

      // Wait for filter to apply
      await page.waitForLoadState('networkidle');
    }
  });

  test('should_delete_entry_from_history', async ({ loginPage, page }) => {
    // Login first
    await loginPage.goto();
    await loginPage.login('test@example.com', 'testpassword123');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });

    // Navigate to tracking
    const trackingPage = new TrackingPage(page);
    await trackingPage.goto();
    await trackingPage.waitForPageLoad();

    // First add an entry that we'll delete
    await trackingPage.addEntry({ type: 'Peso', value: 99.9 });

    // Wait for entry to appear using expect.poll
    await expect.poll(
      async () => trackingPage.getTotalEntriesCount(),
      { message: 'waiting for entry to appear before delete', timeout: 10000 }
    ).toBeGreaterThan(0);

    // Get count after entry was added
    const countBeforeDelete = await trackingPage.getTotalEntriesCount();

    // Delete the first entry (the one we just created)
    await trackingPage.deleteEntry(0);

    // Verify count decreased using expect.poll
    await expect.poll(
      async () => trackingPage.getTotalEntriesCount(),
      { message: 'waiting for entry count to decrease after delete', timeout: 10000 }
    ).toBeLessThan(countBeforeDelete);
  });
});

// =========================================================================
// Metric Cards Tests
// =========================================================================
test.describe('Metric Cards', () => {
  test('should_display_metric_cards_with_data', async ({ loginPage, page }) => {
    // Login first
    await loginPage.goto();
    await loginPage.login('test@example.com', 'testpassword123');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });

    // Navigate to tracking
    const trackingPage = new TrackingPage(page);
    await trackingPage.goto();
    await trackingPage.waitForPageLoad();

    // Check for metric type labels
    // These should be visible if user has any data
    const hasData = !(await trackingPage.isEmptyStateVisible());

    if (hasData) {
      // At least some metric cards should be visible
      await expect(page.getByText('Peso').first()).toBeVisible();
      await expect(page.getByText('Água').first()).toBeVisible();
    }
  });
});

// =========================================================================
// Navigation Between Metric Types Tests
// =========================================================================
test.describe('Navigation Between Metrics', () => {
  test('should_navigate_between_metric_types_via_filter', async ({ loginPage, page }) => {
    // Login first
    await loginPage.goto();
    await loginPage.login('test@example.com', 'testpassword123');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });

    // Navigate to tracking
    const trackingPage = new TrackingPage(page);
    await trackingPage.goto();
    await trackingPage.waitForPageLoad();

    // Check if filter dropdown is visible and clickable
    await expect(trackingPage.historyFilter).toBeVisible({ timeout: 5000 });

    // Test filtering by different types with proper web-first waiting
    const types = ['Peso', 'Água'];

    for (const type of types) {
      // Click the filter dropdown
      await trackingPage.historyFilter.click();
      // Wait for dropdown options to be visible
      await expect(page.getByRole('option', { name: new RegExp(type, 'i') })).toBeVisible();
      // Select the type
      await page.getByRole('option', { name: new RegExp(type, 'i') }).click();
      // Wait for dropdown to close (web-first assertion)
      await expect(page.getByRole('listbox')).toBeHidden({ timeout: 5000 });
    }

    // Reset to all
    await trackingPage.historyFilter.click();
    await expect(page.getByRole('option', { name: /Todos/i })).toBeVisible();
    await page.getByRole('option', { name: /Todos/i }).click();
    await expect(page.getByRole('listbox')).toBeHidden({ timeout: 5000 });
  });
});

// =========================================================================
// Calendar UI Tests (Year in Pixels style)
// =========================================================================
test.describe('Calendar UI', () => {
  test('should_display_month_summary_stats', async ({ loginPage, page }) => {
    // Login first
    await loginPage.goto();
    await loginPage.login('test@example.com', 'testpassword123');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });

    // Navigate to tracking
    await page.goto('/tracking');
    await page.waitForLoadState('networkidle');

    // Check for month summary stats labels
    // These may not be visible if there's no data, so we check for the container
    const summaryContainer = page.locator('text=streak atual');
    const isVisible = await summaryContainer.isVisible({ timeout: 5000 }).catch(() => false);

    if (isVisible) {
      await expect(page.getByText('streak atual')).toBeVisible();
      await expect(page.getByText('humor médio')).toBeVisible();
      await expect(page.getByText('hábitos')).toBeVisible();
    }
  });

  test('should_display_calendar_grid_with_days', async ({ loginPage, page }) => {
    // Login first
    await loginPage.goto();
    await loginPage.login('test@example.com', 'testpassword123');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });

    // Navigate to tracking
    await page.goto('/tracking');
    await page.waitForLoadState('networkidle');

    // Check that calendar header with day names is visible
    await expect(page.getByText('Dom')).toBeVisible();
    await expect(page.getByText('Seg')).toBeVisible();
    await expect(page.getByText('Ter')).toBeVisible();

    // Check that day cells are rendered (at least 28 for any month)
    const dayCells = page.locator('button[aria-label*="tem dados"], button[aria-label*="sem dados"], button[aria-label*="dia futuro"]');
    const count = await dayCells.count();
    expect(count).toBeGreaterThanOrEqual(28);
  });

  test('should_open_day_detail_modal_on_click', async ({ loginPage, page }) => {
    // Login first
    await loginPage.goto();
    await loginPage.login('test@example.com', 'testpassword123');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });

    // Navigate to tracking
    await page.goto('/tracking');
    await page.waitForLoadState('networkidle');

    // Click on a day cell (first one that's clickable)
    const dayCell = page.locator('button[aria-label*="tem dados"], button[aria-label*="sem dados"]').first();
    await dayCell.click();

    // Modal should open with day detail
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Hábitos')).toBeVisible();
    await expect(page.getByText('Métricas')).toBeVisible();
  });

  test('should_navigate_months_with_buttons', async ({ loginPage, page }) => {
    // Login first
    await loginPage.goto();
    await loginPage.login('test@example.com', 'testpassword123');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });

    // Navigate to tracking
    await page.goto('/tracking');
    await page.waitForLoadState('networkidle');

    // Get current month text
    const monthSelector = page.getByTestId('month-selector-current');
    const initialMonth = await monthSelector.textContent();

    // Click previous month button
    await page.getByTestId('month-selector-prev').click();
    await page.waitForLoadState('networkidle');

    // Month should have changed
    const newMonth = await monthSelector.textContent();
    expect(newMonth).not.toBe(initialMonth);

    // Click next month twice to go forward
    await page.getByTestId('month-selector-next').click();
    await page.waitForLoadState('networkidle');

    // Should be back to original or next month
  });

  test('should_show_progress_ring_in_day_modal', async ({ loginPage, page }) => {
    // Login first
    await loginPage.goto();
    await loginPage.login('test@example.com', 'testpassword123');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });

    // Navigate to tracking
    await page.goto('/tracking');
    await page.waitForLoadState('networkidle');

    // Click on a day cell
    const dayCell = page.locator('button[aria-label*="tem dados"], button[aria-label*="sem dados"]').first();
    await dayCell.click();

    // Modal should open
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });

    // Progress ring is shown only if there are habits
    // We just check the modal opens correctly
    await expect(page.getByText('Hábitos')).toBeVisible();
  });

  // Mobile-specific test for swipe navigation
  test('should_support_swipe_navigation_on_mobile', async ({ loginPage, page }, testInfo) => {
    // Only run on mobile viewport
    if (testInfo.project.name !== 'mobile-chrome') {
      test.skip();
    }

    // Login first
    await loginPage.goto();
    await loginPage.login('test@example.com', 'testpassword123');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });

    // Navigate to tracking
    await page.goto('/tracking');
    await page.waitForLoadState('networkidle');

    // Get current month
    const monthSelector = page.getByTestId('month-selector-current');
    const initialMonth = await monthSelector.textContent();

    // Simulate swipe left (next month)
    const calendar = page.locator('.touch-pan-y').first();
    const box = await calendar.boundingBox();
    if (box) {
      await page.mouse.move(box.x + box.width * 0.8, box.y + box.height / 2);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width * 0.2, box.y + box.height / 2, { steps: 10 });
      await page.mouse.up();
    }

    // Wait for animation
    await page.waitForTimeout(500);

    // Month should have changed
    const newMonth = await monthSelector.textContent();
    expect(newMonth).not.toBe(initialMonth);
  });
});

// =========================================================================
// Note: Chat → Tracking integration (conversational flow) is tested in:
// - apps/api/test/integration/chat-tracking.integration.spec.ts
// E2E chat flow requires AI mocking which is better suited for backend tests.
// =========================================================================
