import { test, expect } from '../fixtures/auth.fixture';
import { FinancePage } from '../pages';

/**
 * E2E Tests for Finance Module
 *
 * These tests verify the finance dashboard experience including:
 * - Navigation to finance via sidebar
 * - Month navigation with MonthSelector
 * - Tab navigation between finance sections
 * - Dashboard states (loading, empty, with data)
 *
 * Prerequisites:
 * - Web app running (pnpm --filter web dev)
 * - API running (pnpm --filter api dev)
 * - Supabase CLI running (npx supabase start)
 *
 * @see docs/milestones/phase-2-tracker.md M2.2 for Finance implementation
 */

// =========================================================================
// Finance Navigation Tests
// =========================================================================
test.describe('Finance Navigation', () => {
  test('should_redirect_unauthenticated_user_to_login', async ({ page }) => {
    // Clear any existing auth state
    await page.context().clearCookies();

    // Try to access finance directly
    await page.goto('/finance');

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/);
  });

  test('should_access_finance_when_authenticated', async ({ loginPage, page }) => {
    // Login first
    await loginPage.goto();
    await loginPage.login('test@example.com', 'testpassword123');

    // Wait for successful login
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });

    // Navigate to finance
    await page.goto('/finance');

    // Should be on finance page
    await expect(page).toHaveURL(/\/finance/);
    await expect(page.getByRole('heading', { name: 'Finanças' })).toBeVisible();
  });

  // Skip mobile-chrome: Sidebar is hidden on mobile viewport
  test('should_navigate_to_finance_from_sidebar', async ({ loginPage, page }, testInfo) => {
    if (testInfo.project.name === 'mobile-chrome') {
      test.skip();
    }

    // Login first
    await loginPage.goto();
    await loginPage.login('test@example.com', 'testpassword123');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });

    // Click finance link in sidebar
    await page.getByTestId('sidebar-link-finanças').click();

    // Should be on finance page
    await expect(page).toHaveURL(/\/finance/);
  });
});

// =========================================================================
// Month Navigation Tests
// =========================================================================
test.describe('Month Navigation', () => {
  test('should_display_current_month', async ({ loginPage, page }) => {
    // Login first
    await loginPage.goto();
    await loginPage.login('test@example.com', 'testpassword123');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });

    // Navigate to finance
    const financePage = new FinancePage(page);
    await financePage.goto();
    await financePage.waitForPageLoad();

    // Should display month selector with current month
    const monthText = await financePage.getCurrentMonthText();
    expect(monthText).toBeTruthy();
    // Should contain year and month name in Portuguese
    expect(monthText).toMatch(/\d{4}/); // Year
  });

  test('should_navigate_to_previous_month', async ({ loginPage, page }) => {
    // Login first
    await loginPage.goto();
    await loginPage.login('test@example.com', 'testpassword123');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });

    // Navigate to finance
    const financePage = new FinancePage(page);
    await financePage.goto();
    await financePage.waitForPageLoad();

    // Get initial month
    const initialMonth = await financePage.getCurrentMonthText();

    // Navigate to previous month
    await financePage.goToPreviousMonth();

    // Wait for month to change
    await page.waitForTimeout(500);

    // Month should have changed
    const newMonth = await financePage.getCurrentMonthText();
    expect(newMonth).not.toBe(initialMonth);
  });

  test('should_navigate_to_next_month', async ({ loginPage, page }) => {
    // Login first
    await loginPage.goto();
    await loginPage.login('test@example.com', 'testpassword123');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });

    // Navigate to finance
    const financePage = new FinancePage(page);
    await financePage.goto();
    await financePage.waitForPageLoad();

    // Go to previous month first
    await financePage.goToPreviousMonth();
    await page.waitForTimeout(500);

    // Get current month
    const beforeMonth = await financePage.getCurrentMonthText();

    // Navigate to next month
    await financePage.goToNextMonth();
    await page.waitForTimeout(500);

    // Month should have changed
    const afterMonth = await financePage.getCurrentMonthText();
    expect(afterMonth).not.toBe(beforeMonth);
  });
});

// =========================================================================
// Tab Navigation Tests
// =========================================================================
test.describe('Tab Navigation', () => {
  test('should_display_all_finance_tabs', async ({ loginPage, page }) => {
    // Login first
    await loginPage.goto();
    await loginPage.login('test@example.com', 'testpassword123');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });

    // Navigate to finance
    const financePage = new FinancePage(page);
    await financePage.goto();
    await financePage.waitForPageLoad();

    // Should display all tabs using specific testids
    await expect(financePage.navTabs).toBeVisible();
    await expect(financePage.overviewTab).toBeVisible();
    await expect(financePage.incomesTab).toBeVisible();
    await expect(financePage.billsTab).toBeVisible();
    await expect(financePage.expensesTab).toBeVisible();
    await expect(financePage.debtsTab).toBeVisible();
    await expect(financePage.investmentsTab).toBeVisible();
  });

  test('should_highlight_overview_tab_on_finance_root', async ({ loginPage, page }) => {
    // Login first
    await loginPage.goto();
    await loginPage.login('test@example.com', 'testpassword123');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });

    // Navigate to finance
    const financePage = new FinancePage(page);
    await financePage.goto();
    await financePage.waitForPageLoad();

    // Overview tab should be highlighted
    await expect(financePage.overviewTab).toHaveAttribute('aria-current', 'page');
  });

  test('should_have_correct_tab_links', async ({ loginPage, page }) => {
    // Login first
    await loginPage.goto();
    await loginPage.login('test@example.com', 'testpassword123');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });

    // Navigate to finance
    const financePage = new FinancePage(page);
    await financePage.goto();
    await financePage.waitForPageLoad();

    // Verify tabs have correct hrefs
    await expect(financePage.overviewTab).toHaveAttribute('href', '/finance');
    await expect(financePage.incomesTab).toHaveAttribute('href', '/finance/incomes');
    await expect(financePage.billsTab).toHaveAttribute('href', '/finance/bills');
    await expect(financePage.expensesTab).toHaveAttribute('href', '/finance/expenses');
    await expect(financePage.debtsTab).toHaveAttribute('href', '/finance/debts');
    await expect(financePage.investmentsTab).toHaveAttribute('href', '/finance/investments');
  });
});

// =========================================================================
// Dashboard State Tests
// =========================================================================
test.describe('Dashboard States', () => {
  test('should_show_dashboard_or_empty_state', async ({ loginPage, page }) => {
    // Login first
    await loginPage.goto();
    await loginPage.login('test@example.com', 'testpassword123');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });

    // Navigate to finance
    const financePage = new FinancePage(page);
    await financePage.goto();
    await financePage.waitForPageLoad();

    // Should show either dashboard or empty state
    const isDashboard = await financePage.isDashboardVisible();
    const isEmpty = await financePage.isEmptyStateVisible();

    // One of them should be visible
    expect(isDashboard || isEmpty).toBe(true);

    if (isDashboard) {
      // KPI cards grid should be visible
      await expect(financePage.kpiCardsGrid).toBeVisible();
    }
  });

  test('should_display_kpi_cards_when_data_exists', async ({ loginPage, page }) => {
    // Login first
    await loginPage.goto();
    await loginPage.login('test@example.com', 'testpassword123');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });

    // Navigate to finance
    const financePage = new FinancePage(page);
    await financePage.goto();
    await financePage.waitForPageLoad();

    // If dashboard is visible, check for KPI cards
    const isDashboard = await financePage.isDashboardVisible();

    if (isDashboard) {
      // Should have KPI cards
      await expect(financePage.kpiCardsGrid).toBeVisible();

      // Should have expected KPI labels
      await expect(page.getByText('Renda do Mês')).toBeVisible();
      await expect(page.getByText('Total Orçado')).toBeVisible();
      await expect(page.getByText('Total Gasto')).toBeVisible();
      await expect(page.getByText('Saldo')).toBeVisible();
    }
  });
});
