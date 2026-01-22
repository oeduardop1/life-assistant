import { test, expect } from '../fixtures/auth.fixture';
import { FinancePage, LoginPage } from '../pages';
import type { Page } from '@playwright/test';

/**
 * E2E Tests for Finance Investments Page
 *
 * These tests verify the investments management experience including:
 * - Navigation to investments page via tab
 * - Empty state when no investments exist
 * - CRUD operations (create, read, update, delete)
 * - Update value functionality
 * - Progress tracking for investments with goals
 * - Summary updates after operations
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

async function loginAndNavigateToInvestments(
  loginPage: LoginPage,
  page: Page
): Promise<FinancePage> {
  await loginPage.goto();
  await loginPage.login('test@example.com', 'testpassword123');
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });

  const financePage = new FinancePage(page);
  await financePage.gotoInvestments();
  await financePage.waitForInvestmentsPageLoad();

  return financePage;
}

// =========================================================================
// Navigation Tests
// =========================================================================
test.describe('Investments Navigation', () => {
  test('should_navigate_to_investments_page_via_tab', async ({ loginPage, page }) => {
    // Login and go to finance
    await loginPage.goto();
    await loginPage.login('test@example.com', 'testpassword123');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });

    const financePage = new FinancePage(page);
    await financePage.goto();
    await financePage.waitForPageLoad();

    // Click investments tab
    await financePage.navigateToTab('investments');

    // Should be on investments page
    await expect(page).toHaveURL(/\/finance\/investments/);
  });

  test('should_highlight_investments_tab_when_on_investments_page', async ({ loginPage, page }) => {
    const financePage = await loginAndNavigateToInvestments(loginPage, page);

    // Investments tab should be highlighted
    await expect(financePage.investmentsTab).toHaveAttribute('aria-current', 'page');
  });

  test('should_display_investments_page_title', async ({ loginPage, page }) => {
    await loginAndNavigateToInvestments(loginPage, page);

    // Should display the page title
    await expect(page.getByRole('heading', { name: 'Investimentos' })).toBeVisible();
  });
});

// =========================================================================
// Page State Tests
// =========================================================================
test.describe('Investments Page States', () => {
  test('should_show_investments_page_or_empty_state', async ({ loginPage, page }) => {
    const financePage = await loginAndNavigateToInvestments(loginPage, page);

    // Should show either investments page content or empty state
    const isPageVisible = await financePage.isInvestmentsPageVisible();
    const isEmptyVisible = await financePage.isInvestmentsEmptyStateVisible();

    // One should be visible
    expect(isPageVisible || isEmptyVisible).toBe(true);
  });

  test('should_display_add_investment_button', async ({ loginPage, page }) => {
    const financePage = await loginAndNavigateToInvestments(loginPage, page);

    // Add investment button should be visible
    await expect(financePage.addInvestmentButton).toBeVisible();
  });

  test('should_display_investment_summary_when_investments_exist', async ({ loginPage, page }) => {
    const financePage = await loginAndNavigateToInvestments(loginPage, page);

    // If there are investments, summary should be visible
    const hasInvestments = await financePage.investmentList.isVisible();

    if (hasInvestments) {
      await expect(financePage.investmentSummary).toBeVisible();
    }
  });
});

// =========================================================================
// Create Investment Tests
// =========================================================================
test.describe('Create Investment', () => {
  test('should_open_create_investment_modal', async ({ loginPage, page }) => {
    const financePage = await loginAndNavigateToInvestments(loginPage, page);

    // Click add investment button
    await financePage.addInvestmentButton.click();

    // Modal should be visible
    await expect(financePage.createInvestmentModal).toBeVisible();
    await expect(page.getByText('Novo Investimento')).toBeVisible();
  });

  test('should_close_modal_on_cancel', async ({ loginPage, page }) => {
    const financePage = await loginAndNavigateToInvestments(loginPage, page);

    // Open modal
    await financePage.openCreateInvestmentModal();

    // Cancel
    await financePage.cancelInvestmentForm();

    // Modal should be closed
    await expect(financePage.createInvestmentModal).not.toBeVisible();
  });

  test('should_show_validation_errors_for_empty_form', async ({ loginPage, page }) => {
    const financePage = await loginAndNavigateToInvestments(loginPage, page);

    // Open modal
    await financePage.openCreateInvestmentModal();

    // Submit empty form
    await financePage.submitInvestmentForm();

    // Should show validation error
    await expect(page.getByText('Nome é obrigatório')).toBeVisible();
  });

  test('should_create_investment_with_goal_successfully', async ({ loginPage, page }) => {
    const financePage = await loginAndNavigateToInvestments(loginPage, page);

    const testInvestmentName = `Reserva Emergência ${Date.now()}`;

    // Create investment with goal
    await financePage.createInvestment({
      name: testInvestmentName,
      type: 'Reserva de Emergência',
      currentAmount: '15000',
      goalAmount: '30000',
      monthlyContribution: '1000',
    });

    // Modal should close
    await expect(financePage.createInvestmentModal).not.toBeVisible();

    // Success toast should appear
    await expect(page.getByText('Investimento criado com sucesso')).toBeVisible();

    // Investment should appear in the list
    await expect(financePage.getInvestmentCard(testInvestmentName)).toBeVisible();
  });

  test('should_create_investment_without_goal_successfully', async ({ loginPage, page }) => {
    const financePage = await loginAndNavigateToInvestments(loginPage, page);

    const testInvestmentName = `Investimento Simples ${Date.now()}`;

    // Create investment without goal
    await financePage.createInvestment({
      name: testInvestmentName,
      type: 'Personalizado',
      currentAmount: '5000',
    });

    // Modal should close
    await expect(financePage.createInvestmentModal).not.toBeVisible();

    // Success toast should appear
    await expect(page.getByText('Investimento criado com sucesso')).toBeVisible();

    // Investment should appear in the list
    await expect(financePage.getInvestmentCard(testInvestmentName)).toBeVisible();
  });

  test('should_show_progress_bar_for_investment_with_goal', async ({ loginPage, page }) => {
    const financePage = await loginAndNavigateToInvestments(loginPage, page);

    const testInvestmentName = `Progress Test ${Date.now()}`;

    // Create investment with goal
    await financePage.createInvestment({
      name: testInvestmentName,
      type: 'Aposentadoria',
      currentAmount: '10000',
      goalAmount: '40000',
      monthlyContribution: '500',
    });

    // Wait for investment to appear
    await expect(financePage.getInvestmentCard(testInvestmentName)).toBeVisible();

    // Progress should show 25% (10000/40000)
    const card = financePage.getInvestmentCard(testInvestmentName);
    await expect(card.getByTestId('investment-progress-bar')).toBeVisible();
    const progressText = await financePage.getInvestmentProgressPercent(testInvestmentName);
    expect(progressText).toContain('25%');
  });
});

// =========================================================================
// Edit Investment Tests
// =========================================================================
test.describe('Edit Investment', () => {
  test('should_open_edit_investment_modal', async ({ loginPage, page }) => {
    const financePage = await loginAndNavigateToInvestments(loginPage, page);

    // First create an investment to edit
    const testInvestmentName = `Edit Test ${Date.now()}`;
    await financePage.createInvestment({
      name: testInvestmentName,
      type: 'Curto Prazo',
      currentAmount: '5000',
    });

    // Wait for investment to appear
    await expect(financePage.getInvestmentCard(testInvestmentName)).toBeVisible();

    // Open edit modal
    await financePage.openEditInvestmentModal(testInvestmentName);

    // Edit modal should be visible
    await expect(financePage.editInvestmentModal).toBeVisible();
    await expect(page.getByText('Editar Investimento')).toBeVisible();
  });

  test('should_prefill_form_with_investment_data', async ({ loginPage, page }) => {
    const financePage = await loginAndNavigateToInvestments(loginPage, page);

    // First create an investment to edit
    const testInvestmentName = `Prefill Test ${Date.now()}`;
    await financePage.createInvestment({
      name: testInvestmentName,
      type: 'Educação',
      currentAmount: '8000',
      goalAmount: '20000',
    });

    // Wait for investment to appear
    await expect(financePage.getInvestmentCard(testInvestmentName)).toBeVisible();

    // Open edit modal
    await financePage.openEditInvestmentModal(testInvestmentName);

    // Form should be prefilled
    await expect(financePage.investmentFormName).toHaveValue(testInvestmentName);
    await expect(financePage.investmentFormCurrentAmount).toHaveValue('8000');
    await expect(financePage.investmentFormGoalAmount).toHaveValue('20000');
  });

  test('should_update_investment_successfully', async ({ loginPage, page }) => {
    const financePage = await loginAndNavigateToInvestments(loginPage, page);

    // First create an investment to edit
    const originalName = `Original Investment ${Date.now()}`;
    const updatedName = `Updated Investment ${Date.now()}`;

    await financePage.createInvestment({
      name: originalName,
      type: 'Longo Prazo',
      currentAmount: '10000',
    });

    // Wait for investment to appear
    await expect(financePage.getInvestmentCard(originalName)).toBeVisible();

    // Open edit modal
    await financePage.openEditInvestmentModal(originalName);

    // Update the name
    await financePage.investmentFormName.clear();
    await financePage.investmentFormName.fill(updatedName);
    await financePage.submitInvestmentForm();

    // Modal should close
    await expect(financePage.editInvestmentModal).not.toBeVisible();

    // Success toast should appear
    await expect(page.getByText('Investimento atualizado com sucesso')).toBeVisible();

    // Updated investment should appear in the list
    await expect(financePage.getInvestmentCard(updatedName)).toBeVisible();
    await expect(financePage.getInvestmentCard(originalName)).not.toBeVisible();
  });
});

// =========================================================================
// Update Value Tests
// =========================================================================
test.describe('Update Investment Value', () => {
  test('should_open_update_value_modal', async ({ loginPage, page }) => {
    const financePage = await loginAndNavigateToInvestments(loginPage, page);

    // First create an investment
    const testInvestmentName = `Update Value Test ${Date.now()}`;
    await financePage.createInvestment({
      name: testInvestmentName,
      type: 'Reserva de Emergência',
      currentAmount: '10000',
      goalAmount: '30000',
    });

    // Wait for investment to appear
    await expect(financePage.getInvestmentCard(testInvestmentName)).toBeVisible();

    // Open update value modal
    await financePage.openUpdateValueModal(testInvestmentName);

    // Modal should be visible
    await expect(financePage.updateValueModal).toBeVisible();
    await expect(page.getByText('Atualizar Valor')).toBeVisible();
  });

  test('should_update_investment_value_successfully', async ({ loginPage, page }) => {
    const financePage = await loginAndNavigateToInvestments(loginPage, page);

    // First create an investment
    const testInvestmentName = `Value Update ${Date.now()}`;
    await financePage.createInvestment({
      name: testInvestmentName,
      type: 'Aposentadoria',
      currentAmount: '10000',
      goalAmount: '50000',
    });

    // Wait for investment to appear
    await expect(financePage.getInvestmentCard(testInvestmentName)).toBeVisible();

    // Initial progress should be 20% (10000/50000)
    let progressText = await financePage.getInvestmentProgressPercent(testInvestmentName);
    expect(progressText).toContain('20%');

    // Update value to 25000
    await financePage.updateInvestmentValue(testInvestmentName, '25000');

    // Modal should close
    await expect(financePage.updateValueModal).not.toBeVisible();

    // Success toast should appear
    await expect(page.getByText('Valor atualizado com sucesso')).toBeVisible();

    // Progress should now be 50% (25000/50000)
    await page.waitForTimeout(500);
    progressText = await financePage.getInvestmentProgressPercent(testInvestmentName);
    expect(progressText).toContain('50%');
  });

  test('should_cancel_update_value_without_changes', async ({ loginPage, page }) => {
    const financePage = await loginAndNavigateToInvestments(loginPage, page);

    // First create an investment
    const testInvestmentName = `Cancel Update ${Date.now()}`;
    await financePage.createInvestment({
      name: testInvestmentName,
      type: 'Curto Prazo',
      currentAmount: '5000',
    });

    // Wait for investment to appear
    await expect(financePage.getInvestmentCard(testInvestmentName)).toBeVisible();

    // Open update value modal
    await financePage.openUpdateValueModal(testInvestmentName);

    // Fill new value but cancel
    await financePage.fillUpdateValueForm('10000');
    await financePage.cancelUpdateValueForm();

    // Modal should close
    await expect(financePage.updateValueModal).not.toBeVisible();

    // Value should remain unchanged
    const currentAmount = await financePage.getInvestmentCurrentAmount(testInvestmentName);
    expect(currentAmount).toContain('R$ 5.000,00');
  });
});

// =========================================================================
// Delete Investment Tests
// =========================================================================
test.describe('Delete Investment', () => {
  test('should_open_delete_confirmation_dialog', async ({ loginPage, page }) => {
    const financePage = await loginAndNavigateToInvestments(loginPage, page);

    // First create an investment to delete
    const testInvestmentName = `Delete Test ${Date.now()}`;
    await financePage.createInvestment({
      name: testInvestmentName,
      type: 'Personalizado',
      currentAmount: '2000',
    });

    // Wait for investment to appear
    await expect(financePage.getInvestmentCard(testInvestmentName)).toBeVisible();

    // Open delete dialog
    await financePage.openDeleteInvestmentDialog(testInvestmentName);

    // Delete dialog should be visible
    await expect(financePage.deleteInvestmentDialog).toBeVisible();
    await expect(page.getByText('Excluir Investimento')).toBeVisible();
    await expect(page.getByText(/Esta ação não pode ser desfeita/)).toBeVisible();
  });

  test('should_cancel_delete_without_removing_investment', async ({ loginPage, page }) => {
    const financePage = await loginAndNavigateToInvestments(loginPage, page);

    // First create an investment
    const testInvestmentName = `Cancel Delete ${Date.now()}`;
    await financePage.createInvestment({
      name: testInvestmentName,
      type: 'Educação',
      currentAmount: '3000',
    });

    // Wait for investment to appear
    await expect(financePage.getInvestmentCard(testInvestmentName)).toBeVisible();

    // Open delete dialog
    await financePage.openDeleteInvestmentDialog(testInvestmentName);

    // Cancel delete
    await financePage.cancelDeleteInvestment();

    // Dialog should close
    await expect(financePage.deleteInvestmentDialog).not.toBeVisible();

    // Investment should still be visible
    await expect(financePage.getInvestmentCard(testInvestmentName)).toBeVisible();
  });

  test('should_delete_investment_successfully', async ({ loginPage, page }) => {
    const financePage = await loginAndNavigateToInvestments(loginPage, page);

    // First create an investment to delete
    const testInvestmentName = `Delete Me ${Date.now()}`;
    await financePage.createInvestment({
      name: testInvestmentName,
      type: 'Longo Prazo',
      currentAmount: '1000',
    });

    // Wait for investment to appear
    await expect(financePage.getInvestmentCard(testInvestmentName)).toBeVisible();

    // Open delete dialog
    await financePage.openDeleteInvestmentDialog(testInvestmentName);

    // Confirm delete
    await financePage.confirmDeleteInvestment();

    // Dialog should close
    await expect(financePage.deleteInvestmentDialog).not.toBeVisible();

    // Success toast should appear
    await expect(page.getByText('Investimento excluído com sucesso')).toBeVisible();

    // Investment should be removed from the list
    await expect(financePage.getInvestmentCard(testInvestmentName)).not.toBeVisible();
  });
});

// =========================================================================
// Summary Update Tests
// =========================================================================
test.describe('Summary Updates', () => {
  test('should_update_summary_after_creating_investment', async ({ loginPage, page }) => {
    const financePage = await loginAndNavigateToInvestments(loginPage, page);

    // Create investment
    const testInvestmentName = `Summary Test ${Date.now()}`;
    await financePage.createInvestment({
      name: testInvestmentName,
      type: 'Reserva de Emergência',
      currentAmount: '10000',
      goalAmount: '30000',
      monthlyContribution: '500',
    });

    // Wait for investment to appear
    await expect(financePage.getInvestmentCard(testInvestmentName)).toBeVisible();

    // Summary should be visible and show values
    await expect(financePage.investmentSummary).toBeVisible();

    // Get summary values (they should include the new investment)
    const totalInvested = await financePage.getInvestmentSummaryTotalInvested();
    const totalGoal = await financePage.getInvestmentSummaryTotalGoal();
    const monthlyContribution = await financePage.getInvestmentSummaryMonthlyContribution();

    expect(totalInvested).toBeTruthy();
    expect(totalGoal).toBeTruthy();
    expect(monthlyContribution).toBeTruthy();
  });

  test('should_update_summary_after_updating_value', async ({ loginPage, page }) => {
    const financePage = await loginAndNavigateToInvestments(loginPage, page);

    // Create investment
    const testInvestmentName = `Summary Update ${Date.now()}`;
    await financePage.createInvestment({
      name: testInvestmentName,
      type: 'Aposentadoria',
      currentAmount: '10000',
      goalAmount: '100000',
    });

    // Wait for investment to appear
    await expect(financePage.getInvestmentCard(testInvestmentName)).toBeVisible();

    // Update value
    await financePage.updateInvestmentValue(testInvestmentName, '20000');
    await page.waitForTimeout(500);

    // Get summary total invested (should reflect updated value)
    const totalInvested = await financePage.getInvestmentSummaryTotalInvested();
    expect(totalInvested).toBeTruthy();
  });
});

// =========================================================================
// Full Workflow Test
// =========================================================================
test.describe('Full Investment Workflow', () => {
  test('should_complete_full_investment_lifecycle', async ({ loginPage, page }) => {
    const financePage = await loginAndNavigateToInvestments(loginPage, page);

    // 1. Create investment with goal
    const testInvestmentName = `Lifecycle ${Date.now()}`;
    await financePage.createInvestment({
      name: testInvestmentName,
      type: 'Reserva de Emergência',
      currentAmount: '5000',
      goalAmount: '20000',
      monthlyContribution: '1000',
    });

    // Verify created
    await expect(financePage.getInvestmentCard(testInvestmentName)).toBeVisible();

    // Initial progress should be 25% (5000/20000)
    let progressText = await financePage.getInvestmentProgressPercent(testInvestmentName);
    expect(progressText).toContain('25%');

    // 2. Update value to simulate growth
    await financePage.updateInvestmentValue(testInvestmentName, '10000');
    await page.waitForTimeout(500);

    // Progress should now be 50% (10000/20000)
    progressText = await financePage.getInvestmentProgressPercent(testInvestmentName);
    expect(progressText).toContain('50%');

    // 3. Edit investment to increase goal
    await financePage.openEditInvestmentModal(testInvestmentName);
    await financePage.investmentFormGoalAmount.clear();
    await financePage.investmentFormGoalAmount.fill('40000');
    await financePage.submitInvestmentForm();
    await page.waitForTimeout(500);

    // Progress should now be 25% (10000/40000)
    progressText = await financePage.getInvestmentProgressPercent(testInvestmentName);
    expect(progressText).toContain('25%');

    // 4. Delete investment
    await financePage.openDeleteInvestmentDialog(testInvestmentName);
    await financePage.confirmDeleteInvestment();

    // Verify deleted
    await expect(financePage.getInvestmentCard(testInvestmentName)).not.toBeVisible();
  });

  test('should_handle_investment_reaching_goal', async ({ loginPage, page }) => {
    const financePage = await loginAndNavigateToInvestments(loginPage, page);

    // Create investment close to goal
    const testInvestmentName = `Goal Reached ${Date.now()}`;
    await financePage.createInvestment({
      name: testInvestmentName,
      type: 'Curto Prazo',
      currentAmount: '9000',
      goalAmount: '10000',
    });

    // Wait for investment to appear
    await expect(financePage.getInvestmentCard(testInvestmentName)).toBeVisible();

    // Progress should be 90%
    let progressText = await financePage.getInvestmentProgressPercent(testInvestmentName);
    expect(progressText).toContain('90%');

    // Update value to reach goal
    await financePage.updateInvestmentValue(testInvestmentName, '10000');
    await page.waitForTimeout(500);

    // Progress should now be 100%
    progressText = await financePage.getInvestmentProgressPercent(testInvestmentName);
    expect(progressText).toContain('100%');

    // Remaining amount should not be visible (goal reached)
    const card = financePage.getInvestmentCard(testInvestmentName);
    await expect(card.getByTestId('investment-remaining')).not.toBeVisible();
  });
});
