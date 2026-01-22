import { test, expect } from '../fixtures/auth.fixture';
import { FinancePage, LoginPage } from '../pages';
import type { Page } from '@playwright/test';

/**
 * E2E Tests for Finance Incomes Page
 *
 * These tests verify the incomes management experience including:
 * - Navigation to incomes page via tab
 * - Empty state when no incomes exist
 * - CRUD operations (create, read, update, delete)
 * - Summary updates after operations
 * - Month navigation filtering
 *
 * Prerequisites:
 * - Web app running (pnpm --filter web dev)
 * - API running (pnpm --filter api dev)
 * - Supabase CLI running (npx supabase start)
 *
 * @see docs/milestones/phase-2-tracker.md M2.2 for Finance implementation
 */

// =========================================================================
// Helper Functions
// =========================================================================

async function loginAndNavigateToIncomes(
  loginPage: LoginPage,
  page: Page
): Promise<FinancePage> {
  await loginPage.goto();
  await loginPage.login('test@example.com', 'testpassword123');
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });

  const financePage = new FinancePage(page);
  await financePage.gotoIncomes();
  await financePage.waitForIncomesPageLoad();

  return financePage;
}

// =========================================================================
// Navigation Tests
// =========================================================================
test.describe('Incomes Navigation', () => {
  test('should_navigate_to_incomes_page_via_tab', async ({ loginPage, page }) => {
    // Login and go to finance
    await loginPage.goto();
    await loginPage.login('test@example.com', 'testpassword123');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });

    const financePage = new FinancePage(page);
    await financePage.goto();
    await financePage.waitForPageLoad();

    // Click incomes tab
    await financePage.navigateToTab('incomes');

    // Should be on incomes page
    await expect(page).toHaveURL(/\/finance\/incomes/);
  });

  test('should_highlight_incomes_tab_when_on_incomes_page', async ({ loginPage, page }) => {
    const financePage = await loginAndNavigateToIncomes(loginPage, page);

    // Incomes tab should be highlighted
    await expect(financePage.incomesTab).toHaveAttribute('aria-current', 'page');
  });

  test('should_display_incomes_page_title', async ({ loginPage, page }) => {
    await loginAndNavigateToIncomes(loginPage, page);

    // Should display the page title
    await expect(page.getByRole('heading', { name: 'Rendas' })).toBeVisible();
  });
});

// =========================================================================
// Page State Tests
// =========================================================================
test.describe('Incomes Page States', () => {
  test('should_show_incomes_page_or_empty_state', async ({ loginPage, page }) => {
    const financePage = await loginAndNavigateToIncomes(loginPage, page);

    // Should show either incomes page content or empty state
    const isPageVisible = await financePage.isIncomesPageVisible();
    const isEmptyVisible = await financePage.isIncomesEmptyStateVisible();

    // One should be visible
    expect(isPageVisible || isEmptyVisible).toBe(true);
  });

  test('should_display_add_income_button', async ({ loginPage, page }) => {
    const financePage = await loginAndNavigateToIncomes(loginPage, page);

    // Add income button should be visible
    await expect(financePage.addIncomeButton).toBeVisible();
  });

  test('should_display_income_summary_when_incomes_exist', async ({ loginPage, page }) => {
    const financePage = await loginAndNavigateToIncomes(loginPage, page);

    // If there are incomes, summary should be visible
    const hasIncomes = await financePage.incomeList.isVisible();

    if (hasIncomes) {
      await expect(financePage.incomeSummary).toBeVisible();
    }
  });
});

// =========================================================================
// Create Income Tests
// =========================================================================
test.describe('Create Income', () => {
  test('should_open_create_income_modal', async ({ loginPage, page }) => {
    const financePage = await loginAndNavigateToIncomes(loginPage, page);

    // Click add income button
    await financePage.addIncomeButton.click();

    // Modal should be visible
    await expect(financePage.createIncomeModal).toBeVisible();
    await expect(page.getByText('Nova Renda')).toBeVisible();
  });

  test('should_close_modal_on_cancel', async ({ loginPage, page }) => {
    const financePage = await loginAndNavigateToIncomes(loginPage, page);

    // Open modal
    await financePage.openCreateIncomeModal();

    // Cancel
    await financePage.cancelIncomeForm();

    // Modal should be closed
    await expect(financePage.createIncomeModal).not.toBeVisible();
  });

  test('should_show_validation_errors_for_empty_form', async ({ loginPage, page }) => {
    const financePage = await loginAndNavigateToIncomes(loginPage, page);

    // Open modal
    await financePage.openCreateIncomeModal();

    // Submit empty form
    await financePage.submitIncomeForm();

    // Should show validation error
    await expect(page.getByText('Nome é obrigatório')).toBeVisible();
  });

  test('should_create_income_successfully', async ({ loginPage, page }) => {
    const financePage = await loginAndNavigateToIncomes(loginPage, page);

    const testIncomeName = `Test Income ${Date.now()}`;

    // Create income
    await financePage.createIncome({
      name: testIncomeName,
      type: 'Salário',
      frequency: 'Mensal',
      expectedAmount: '5000',
    });

    // Modal should close
    await expect(financePage.createIncomeModal).not.toBeVisible();

    // Success toast should appear
    await expect(page.getByText('Renda criada com sucesso')).toBeVisible();

    // Income should appear in the list
    await expect(financePage.getIncomeCard(testIncomeName)).toBeVisible();
  });
});

// =========================================================================
// Edit Income Tests
// =========================================================================
test.describe('Edit Income', () => {
  test('should_open_edit_income_modal', async ({ loginPage, page }) => {
    const financePage = await loginAndNavigateToIncomes(loginPage, page);

    // First create an income to edit
    const testIncomeName = `Edit Test ${Date.now()}`;
    await financePage.createIncome({
      name: testIncomeName,
      expectedAmount: '3000',
    });

    // Wait for income to appear
    await expect(financePage.getIncomeCard(testIncomeName)).toBeVisible();

    // Open edit modal
    await financePage.openEditIncomeModal(testIncomeName);

    // Edit modal should be visible
    await expect(financePage.editIncomeModal).toBeVisible();
    await expect(page.getByText('Editar Renda')).toBeVisible();
  });

  test('should_prefill_form_with_income_data', async ({ loginPage, page }) => {
    const financePage = await loginAndNavigateToIncomes(loginPage, page);

    // First create an income to edit
    const testIncomeName = `Prefill Test ${Date.now()}`;
    await financePage.createIncome({
      name: testIncomeName,
      expectedAmount: '4500',
    });

    // Wait for income to appear
    await expect(financePage.getIncomeCard(testIncomeName)).toBeVisible();

    // Open edit modal
    await financePage.openEditIncomeModal(testIncomeName);

    // Form should be prefilled
    await expect(financePage.incomeFormName).toHaveValue(testIncomeName);
    await expect(financePage.incomeFormExpectedAmount).toHaveValue('4500');
  });

  test('should_update_income_successfully', async ({ loginPage, page }) => {
    const financePage = await loginAndNavigateToIncomes(loginPage, page);

    // First create an income to edit
    const originalName = `Original Name ${Date.now()}`;
    const updatedName = `Updated Name ${Date.now()}`;

    await financePage.createIncome({
      name: originalName,
      expectedAmount: '2000',
    });

    // Wait for income to appear
    await expect(financePage.getIncomeCard(originalName)).toBeVisible();

    // Open edit modal
    await financePage.openEditIncomeModal(originalName);

    // Update the name
    await financePage.incomeFormName.clear();
    await financePage.incomeFormName.fill(updatedName);
    await financePage.submitIncomeForm();

    // Modal should close
    await expect(financePage.editIncomeModal).not.toBeVisible();

    // Success toast should appear
    await expect(page.getByText('Renda atualizada com sucesso')).toBeVisible();

    // Updated income should appear in the list
    await expect(financePage.getIncomeCard(updatedName)).toBeVisible();
    await expect(financePage.getIncomeCard(originalName)).not.toBeVisible();
  });
});

// =========================================================================
// Delete Income Tests
// =========================================================================
test.describe('Delete Income', () => {
  test('should_open_delete_confirmation_dialog', async ({ loginPage, page }) => {
    const financePage = await loginAndNavigateToIncomes(loginPage, page);

    // First create an income to delete
    const testIncomeName = `Delete Test ${Date.now()}`;
    await financePage.createIncome({
      name: testIncomeName,
      expectedAmount: '1500',
    });

    // Wait for income to appear
    await expect(financePage.getIncomeCard(testIncomeName)).toBeVisible();

    // Open delete dialog
    await financePage.openDeleteIncomeDialog(testIncomeName);

    // Delete dialog should be visible
    await expect(financePage.deleteIncomeDialog).toBeVisible();
    await expect(page.getByText('Excluir Renda')).toBeVisible();
    await expect(page.getByText(/Esta ação não pode ser desfeita/)).toBeVisible();
  });

  test('should_cancel_delete_without_removing_income', async ({ loginPage, page }) => {
    const financePage = await loginAndNavigateToIncomes(loginPage, page);

    // First create an income
    const testIncomeName = `Cancel Delete ${Date.now()}`;
    await financePage.createIncome({
      name: testIncomeName,
      expectedAmount: '1000',
    });

    // Wait for income to appear
    await expect(financePage.getIncomeCard(testIncomeName)).toBeVisible();

    // Open delete dialog
    await financePage.openDeleteIncomeDialog(testIncomeName);

    // Cancel delete
    await financePage.cancelDeleteIncome();

    // Dialog should close
    await expect(financePage.deleteIncomeDialog).not.toBeVisible();

    // Income should still be visible
    await expect(financePage.getIncomeCard(testIncomeName)).toBeVisible();
  });

  test('should_delete_income_successfully', async ({ loginPage, page }) => {
    const financePage = await loginAndNavigateToIncomes(loginPage, page);

    // First create an income to delete
    const testIncomeName = `Delete Me ${Date.now()}`;
    await financePage.createIncome({
      name: testIncomeName,
      expectedAmount: '500',
    });

    // Wait for income to appear
    await expect(financePage.getIncomeCard(testIncomeName)).toBeVisible();

    // Open delete dialog
    await financePage.openDeleteIncomeDialog(testIncomeName);

    // Confirm delete
    await financePage.confirmDeleteIncome();

    // Dialog should close
    await expect(financePage.deleteIncomeDialog).not.toBeVisible();

    // Success toast should appear
    await expect(page.getByText('Renda excluída com sucesso')).toBeVisible();

    // Income should be removed from the list
    await expect(financePage.getIncomeCard(testIncomeName)).not.toBeVisible();
  });
});

// =========================================================================
// Summary Update Tests
// =========================================================================
test.describe('Summary Updates', () => {
  test('should_update_summary_after_creating_income', async ({ loginPage, page }) => {
    const financePage = await loginAndNavigateToIncomes(loginPage, page);

    // Create income
    const testIncomeName = `Summary Test ${Date.now()}`;
    await financePage.createIncome({
      name: testIncomeName,
      expectedAmount: '10000',
      actualAmount: '10000',
    });

    // Wait for income to appear
    await expect(financePage.getIncomeCard(testIncomeName)).toBeVisible();

    // Summary should be visible and show values
    await expect(financePage.incomeSummary).toBeVisible();

    // Get summary values (they should include the new income)
    const expectedValue = await financePage.getSummaryExpected();
    const actualValue = await financePage.getSummaryActual();

    expect(expectedValue).toBeTruthy();
    expect(actualValue).toBeTruthy();
  });
});

// =========================================================================
// Month Navigation Tests
// =========================================================================
test.describe('Month Navigation for Incomes', () => {
  test('should_filter_incomes_by_month', async ({ loginPage, page }) => {
    const financePage = await loginAndNavigateToIncomes(loginPage, page);

    // Create income in current month
    const testIncomeName = `Month Test ${Date.now()}`;
    await financePage.createIncome({
      name: testIncomeName,
      expectedAmount: '3000',
    });

    // Wait for income to appear
    await expect(financePage.getIncomeCard(testIncomeName)).toBeVisible();

    // Navigate to previous month
    await financePage.goToPreviousMonth();
    await page.waitForTimeout(500);

    // Income should not be visible (it's in the current month)
    await expect(financePage.getIncomeCard(testIncomeName)).not.toBeVisible();

    // Navigate back to current month (next month from previous)
    await financePage.goToNextMonth();
    await page.waitForTimeout(500);

    // Income should be visible again
    await expect(financePage.getIncomeCard(testIncomeName)).toBeVisible();
  });
});
