import { test, expect } from '../fixtures/auth.fixture';
import { FinancePage, LoginPage } from '../pages';
import type { Page } from '@playwright/test';

/**
 * E2E Tests for Finance Debts Page
 *
 * These tests verify the debts management experience including:
 * - Navigation to debts page via tab
 * - Empty state when no debts exist
 * - CRUD operations (create, read, update, delete)
 * - Negotiate pending debt functionality
 * - Pay installment functionality
 * - Status filter (all, active, paid_off)
 * - Summary updates after operations
 * - Progress tracking for negotiated debts
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

async function loginAndNavigateToDebts(
  loginPage: LoginPage,
  page: Page
): Promise<FinancePage> {
  await loginPage.goto();
  await loginPage.login('test@example.com', 'testpassword123');
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });

  const financePage = new FinancePage(page);
  await financePage.gotoDebts();
  await financePage.waitForDebtsPageLoad();

  return financePage;
}

// =========================================================================
// Navigation Tests
// =========================================================================
test.describe('Debts Navigation', () => {
  test('should_navigate_to_debts_page_via_tab', async ({ loginPage, page }) => {
    // Login and go to finance
    await loginPage.goto();
    await loginPage.login('test@example.com', 'testpassword123');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });

    const financePage = new FinancePage(page);
    await financePage.goto();
    await financePage.waitForPageLoad();

    // Click debts tab
    await financePage.navigateToTab('debts');

    // Should be on debts page
    await expect(page).toHaveURL(/\/finance\/debts/);
  });

  test('should_highlight_debts_tab_when_on_debts_page', async ({ loginPage, page }) => {
    const financePage = await loginAndNavigateToDebts(loginPage, page);

    // Debts tab should be highlighted
    await expect(financePage.debtsTab).toHaveAttribute('aria-current', 'page');
  });

  test('should_display_debts_page_title', async ({ loginPage, page }) => {
    await loginAndNavigateToDebts(loginPage, page);

    // Should display the page title
    await expect(page.getByRole('heading', { name: 'Dívidas' })).toBeVisible();
  });
});

// =========================================================================
// Page State Tests
// =========================================================================
test.describe('Debts Page States', () => {
  test('should_show_debts_page_or_empty_state', async ({ loginPage, page }) => {
    const financePage = await loginAndNavigateToDebts(loginPage, page);

    // Should show either debts page content or empty state
    const isPageVisible = await financePage.isDebtsPageVisible();
    const isEmptyVisible = await financePage.isDebtsEmptyStateVisible();

    // One should be visible
    expect(isPageVisible || isEmptyVisible).toBe(true);
  });

  test('should_display_add_debt_button', async ({ loginPage, page }) => {
    const financePage = await loginAndNavigateToDebts(loginPage, page);

    // Add debt button should be visible
    await expect(financePage.addDebtButton).toBeVisible();
  });

  test('should_display_status_filter', async ({ loginPage, page }) => {
    const financePage = await loginAndNavigateToDebts(loginPage, page);

    // Status filter should be visible
    await expect(financePage.debtStatusFilter).toBeVisible();
    await expect(financePage.debtFilterAll).toBeVisible();
    await expect(financePage.debtFilterActive).toBeVisible();
    await expect(financePage.debtFilterPaidOff).toBeVisible();
  });

  test('should_display_debt_summary_when_debts_exist', async ({ loginPage, page }) => {
    const financePage = await loginAndNavigateToDebts(loginPage, page);

    // If there are debts, summary should be visible
    const hasDebts = await financePage.debtList.isVisible();

    if (hasDebts) {
      await expect(financePage.debtSummary).toBeVisible();
    }
  });
});

// =========================================================================
// Create Negotiated Debt Tests
// =========================================================================
test.describe('Create Negotiated Debt', () => {
  test('should_open_create_debt_modal', async ({ loginPage, page }) => {
    const financePage = await loginAndNavigateToDebts(loginPage, page);

    // Click add debt button
    await financePage.addDebtButton.click();

    // Modal should be visible
    await expect(financePage.createDebtModal).toBeVisible();
    await expect(page.getByText('Nova Dívida')).toBeVisible();
  });

  test('should_close_modal_on_cancel', async ({ loginPage, page }) => {
    const financePage = await loginAndNavigateToDebts(loginPage, page);

    // Open modal
    await financePage.openCreateDebtModal();

    // Cancel
    await financePage.cancelDebtForm();

    // Modal should be closed
    await expect(financePage.createDebtModal).not.toBeVisible();
  });

  test('should_show_validation_errors_for_empty_form', async ({ loginPage, page }) => {
    const financePage = await loginAndNavigateToDebts(loginPage, page);

    // Open modal
    await financePage.openCreateDebtModal();

    // Submit empty form
    await financePage.submitDebtForm();

    // Should show validation error
    await expect(page.getByText('Nome é obrigatório')).toBeVisible();
  });

  test('should_create_negotiated_debt_successfully', async ({ loginPage, page }) => {
    const financePage = await loginAndNavigateToDebts(loginPage, page);

    const testDebtName = `Financiamento ${Date.now()}`;

    // Create negotiated debt
    await financePage.createNegotiatedDebt({
      name: testDebtName,
      creditor: 'Banco Test',
      totalAmount: '48000',
      totalInstallments: '48',
      installmentAmount: '1200',
      dueDay: '15',
    });

    // Modal should close
    await expect(financePage.createDebtModal).not.toBeVisible();

    // Success toast should appear
    await expect(page.getByText('Dívida criada com sucesso')).toBeVisible();

    // Debt should appear in the negotiated section
    await expect(financePage.getDebtCard(testDebtName)).toBeVisible();
    await expect(financePage.negotiatedDebtsSection).toBeVisible();
  });

  test('should_show_progress_bar_for_negotiated_debt', async ({ loginPage, page }) => {
    const financePage = await loginAndNavigateToDebts(loginPage, page);

    const testDebtName = `Progress Test ${Date.now()}`;

    // Create negotiated debt
    await financePage.createNegotiatedDebt({
      name: testDebtName,
      totalAmount: '12000',
      totalInstallments: '12',
      installmentAmount: '1100',
      dueDay: '10',
    });

    // Wait for debt to appear
    await expect(financePage.getDebtCard(testDebtName)).toBeVisible();

    // Progress should show 0% (no installments paid yet)
    const progressText = await financePage.getDebtProgressPercent(testDebtName);
    expect(progressText).toContain('0%');
  });
});

// =========================================================================
// Create Pending Debt Tests
// =========================================================================
test.describe('Create Pending Debt', () => {
  test('should_create_pending_debt_successfully', async ({ loginPage, page }) => {
    const financePage = await loginAndNavigateToDebts(loginPage, page);

    const testDebtName = `Dívida Pendente ${Date.now()}`;

    // Create pending debt
    await financePage.createPendingDebt({
      name: testDebtName,
      creditor: 'Credor Test',
      totalAmount: '5000',
      notes: 'Aguardando negociação',
    });

    // Modal should close
    await expect(financePage.createDebtModal).not.toBeVisible();

    // Success toast should appear
    await expect(page.getByText('Dívida criada com sucesso')).toBeVisible();

    // Debt should appear in the pending section
    await expect(financePage.getDebtCard(testDebtName)).toBeVisible();
    await expect(financePage.pendingDebtsSection).toBeVisible();
  });

  test('should_show_pending_negotiation_badge', async ({ loginPage, page }) => {
    const financePage = await loginAndNavigateToDebts(loginPage, page);

    const testDebtName = `Pending Badge ${Date.now()}`;

    // Create pending debt
    await financePage.createPendingDebt({
      name: testDebtName,
      totalAmount: '3000',
    });

    // Wait for debt to appear
    await expect(financePage.getDebtCard(testDebtName)).toBeVisible();

    // Should show pending negotiation badge
    const card = financePage.getDebtCard(testDebtName);
    await expect(card.getByText('Pendente de Negociação')).toBeVisible();
  });
});

// =========================================================================
// Edit Debt Tests
// =========================================================================
test.describe('Edit Debt', () => {
  test('should_open_edit_debt_modal', async ({ loginPage, page }) => {
    const financePage = await loginAndNavigateToDebts(loginPage, page);

    // First create a debt to edit
    const testDebtName = `Edit Test ${Date.now()}`;
    await financePage.createNegotiatedDebt({
      name: testDebtName,
      totalAmount: '6000',
      totalInstallments: '6',
      installmentAmount: '1100',
    });

    // Wait for debt to appear
    await expect(financePage.getDebtCard(testDebtName)).toBeVisible();

    // Open edit modal
    await financePage.openEditDebtModal(testDebtName);

    // Edit modal should be visible
    await expect(financePage.editDebtModal).toBeVisible();
    await expect(page.getByText('Editar Dívida')).toBeVisible();
  });

  test('should_prefill_form_with_debt_data', async ({ loginPage, page }) => {
    const financePage = await loginAndNavigateToDebts(loginPage, page);

    // First create a debt to edit
    const testDebtName = `Prefill Test ${Date.now()}`;
    await financePage.createNegotiatedDebt({
      name: testDebtName,
      creditor: 'Banco Prefill',
      totalAmount: '10000',
      totalInstallments: '10',
      installmentAmount: '1100',
    });

    // Wait for debt to appear
    await expect(financePage.getDebtCard(testDebtName)).toBeVisible();

    // Open edit modal
    await financePage.openEditDebtModal(testDebtName);

    // Form should be prefilled
    await expect(financePage.debtFormName).toHaveValue(testDebtName);
    await expect(financePage.debtFormTotalAmount).toHaveValue('10000');
  });

  test('should_update_debt_successfully', async ({ loginPage, page }) => {
    const financePage = await loginAndNavigateToDebts(loginPage, page);

    // First create a debt to edit
    const originalName = `Original Debt ${Date.now()}`;
    const updatedName = `Updated Debt ${Date.now()}`;

    await financePage.createNegotiatedDebt({
      name: originalName,
      totalAmount: '5000',
      totalInstallments: '5',
      installmentAmount: '1100',
    });

    // Wait for debt to appear
    await expect(financePage.getDebtCard(originalName)).toBeVisible();

    // Open edit modal
    await financePage.openEditDebtModal(originalName);

    // Update the name
    await financePage.debtFormName.clear();
    await financePage.debtFormName.fill(updatedName);
    await financePage.submitDebtForm();

    // Modal should close
    await expect(financePage.editDebtModal).not.toBeVisible();

    // Success toast should appear
    await expect(page.getByText('Dívida atualizada com sucesso')).toBeVisible();

    // Updated debt should appear in the list
    await expect(financePage.getDebtCard(updatedName)).toBeVisible();
    await expect(financePage.getDebtCard(originalName)).not.toBeVisible();
  });
});

// =========================================================================
// Delete Debt Tests
// =========================================================================
test.describe('Delete Debt', () => {
  test('should_open_delete_confirmation_dialog', async ({ loginPage, page }) => {
    const financePage = await loginAndNavigateToDebts(loginPage, page);

    // First create a debt to delete
    const testDebtName = `Delete Test ${Date.now()}`;
    await financePage.createPendingDebt({
      name: testDebtName,
      totalAmount: '2000',
    });

    // Wait for debt to appear
    await expect(financePage.getDebtCard(testDebtName)).toBeVisible();

    // Open delete dialog
    await financePage.openDeleteDebtDialog(testDebtName);

    // Delete dialog should be visible
    await expect(financePage.deleteDebtDialog).toBeVisible();
    await expect(page.getByText('Excluir Dívida')).toBeVisible();
    await expect(page.getByText(/Esta ação não pode ser desfeita/)).toBeVisible();
  });

  test('should_cancel_delete_without_removing_debt', async ({ loginPage, page }) => {
    const financePage = await loginAndNavigateToDebts(loginPage, page);

    // First create a debt
    const testDebtName = `Cancel Delete ${Date.now()}`;
    await financePage.createPendingDebt({
      name: testDebtName,
      totalAmount: '1500',
    });

    // Wait for debt to appear
    await expect(financePage.getDebtCard(testDebtName)).toBeVisible();

    // Open delete dialog
    await financePage.openDeleteDebtDialog(testDebtName);

    // Cancel delete
    await financePage.cancelDeleteDebt();

    // Dialog should close
    await expect(financePage.deleteDebtDialog).not.toBeVisible();

    // Debt should still be visible
    await expect(financePage.getDebtCard(testDebtName)).toBeVisible();
  });

  test('should_delete_debt_successfully', async ({ loginPage, page }) => {
    const financePage = await loginAndNavigateToDebts(loginPage, page);

    // First create a debt to delete
    const testDebtName = `Delete Me ${Date.now()}`;
    await financePage.createPendingDebt({
      name: testDebtName,
      totalAmount: '1000',
    });

    // Wait for debt to appear
    await expect(financePage.getDebtCard(testDebtName)).toBeVisible();

    // Open delete dialog
    await financePage.openDeleteDebtDialog(testDebtName);

    // Confirm delete
    await financePage.confirmDeleteDebt();

    // Dialog should close
    await expect(financePage.deleteDebtDialog).not.toBeVisible();

    // Success toast should appear
    await expect(page.getByText('Dívida excluída com sucesso')).toBeVisible();

    // Debt should be removed from the list
    await expect(financePage.getDebtCard(testDebtName)).not.toBeVisible();
  });
});

// =========================================================================
// Negotiate Debt Tests
// =========================================================================
test.describe('Negotiate Debt', () => {
  test('should_show_negotiate_action_for_pending_debt', async ({ loginPage, page }) => {
    const financePage = await loginAndNavigateToDebts(loginPage, page);

    // Create pending debt
    const testDebtName = `Negotiate Action ${Date.now()}`;
    await financePage.createPendingDebt({
      name: testDebtName,
      totalAmount: '8000',
    });

    // Wait for debt to appear
    await expect(financePage.getDebtCard(testDebtName)).toBeVisible();

    // Open actions menu
    const card = financePage.getDebtCard(testDebtName);
    await card.getByTestId('debt-actions-trigger').click();

    // Negotiate action should be visible
    await expect(card.getByTestId('debt-negotiate-action')).toBeVisible();
  });

  test('should_open_negotiate_modal', async ({ loginPage, page }) => {
    const financePage = await loginAndNavigateToDebts(loginPage, page);

    // Create pending debt
    const testDebtName = `Negotiate Modal ${Date.now()}`;
    await financePage.createPendingDebt({
      name: testDebtName,
      totalAmount: '6000',
    });

    // Wait for debt to appear
    await expect(financePage.getDebtCard(testDebtName)).toBeVisible();

    // Open negotiate modal
    await financePage.openNegotiateDebtModal(testDebtName);

    // Modal should be visible
    await expect(financePage.negotiateDebtModal).toBeVisible();
    await expect(page.getByText('Negociar Dívida')).toBeVisible();
  });

  test('should_negotiate_pending_debt_successfully', async ({ loginPage, page }) => {
    const financePage = await loginAndNavigateToDebts(loginPage, page);

    // Create pending debt
    const testDebtName = `Negotiate Success ${Date.now()}`;
    await financePage.createPendingDebt({
      name: testDebtName,
      totalAmount: '12000',
    });

    // Wait for debt to appear in pending section
    await expect(financePage.getDebtCard(testDebtName)).toBeVisible();

    // Negotiate the debt
    await financePage.negotiateDebt(testDebtName, {
      totalInstallments: '12',
      installmentAmount: '1100',
      dueDay: '20',
    });

    // Modal should close
    await expect(financePage.negotiateDebtModal).not.toBeVisible();

    // Success toast should appear
    await expect(page.getByText('Dívida negociada com sucesso')).toBeVisible();

    // Debt should now show progress bar (is negotiated)
    await page.waitForTimeout(500);
    const progressText = await financePage.getDebtProgressPercent(testDebtName);
    expect(progressText).toBeTruthy();
  });

  test('should_move_debt_to_negotiated_section_after_negotiation', async ({ loginPage, page }) => {
    const financePage = await loginAndNavigateToDebts(loginPage, page);

    // Create pending debt
    const testDebtName = `Move Section ${Date.now()}`;
    await financePage.createPendingDebt({
      name: testDebtName,
      totalAmount: '4000',
    });

    // Should be in pending section
    await expect(financePage.pendingDebtsSection.getByText(testDebtName)).toBeVisible();

    // Negotiate the debt
    await financePage.negotiateDebt(testDebtName, {
      totalInstallments: '4',
      installmentAmount: '1100',
    });

    await page.waitForTimeout(500);

    // Should now be in negotiated section
    await expect(financePage.negotiatedDebtsSection.getByText(testDebtName)).toBeVisible();
  });
});

// =========================================================================
// Pay Installment Tests
// =========================================================================
test.describe('Pay Installment', () => {
  test('should_show_pay_installment_action_for_negotiated_debt', async ({ loginPage, page }) => {
    const financePage = await loginAndNavigateToDebts(loginPage, page);

    // Create negotiated debt
    const testDebtName = `Pay Action ${Date.now()}`;
    await financePage.createNegotiatedDebt({
      name: testDebtName,
      totalAmount: '3000',
      totalInstallments: '3',
      installmentAmount: '1100',
    });

    // Wait for debt to appear
    await expect(financePage.getDebtCard(testDebtName)).toBeVisible();

    // Open actions menu
    const card = financePage.getDebtCard(testDebtName);
    await card.getByTestId('debt-actions-trigger').click();

    // Pay installment action should be visible
    await expect(card.getByTestId('debt-pay-installment-action')).toBeVisible();
  });

  test('should_open_pay_installment_dialog', async ({ loginPage, page }) => {
    const financePage = await loginAndNavigateToDebts(loginPage, page);

    // Create negotiated debt
    const testDebtName = `Pay Dialog ${Date.now()}`;
    await financePage.createNegotiatedDebt({
      name: testDebtName,
      totalAmount: '2000',
      totalInstallments: '2',
      installmentAmount: '1100',
    });

    // Wait for debt to appear
    await expect(financePage.getDebtCard(testDebtName)).toBeVisible();

    // Open pay installment dialog
    await financePage.openPayInstallmentDialog(testDebtName);

    // Dialog should be visible
    await expect(financePage.payInstallmentDialog).toBeVisible();
    await expect(page.getByText('Pagar Parcela')).toBeVisible();
  });

  test('should_pay_installment_successfully', async ({ loginPage, page }) => {
    const financePage = await loginAndNavigateToDebts(loginPage, page);

    // Create negotiated debt
    const testDebtName = `Pay Success ${Date.now()}`;
    await financePage.createNegotiatedDebt({
      name: testDebtName,
      totalAmount: '4000',
      totalInstallments: '4',
      installmentAmount: '1100',
    });

    // Wait for debt to appear
    await expect(financePage.getDebtCard(testDebtName)).toBeVisible();

    // Initial progress should be 0%
    let progressText = await financePage.getDebtProgressPercent(testDebtName);
    expect(progressText).toContain('0%');

    // Pay installment
    await financePage.payDebtInstallment(testDebtName);

    // Dialog should close
    await expect(financePage.payInstallmentDialog).not.toBeVisible();

    // Success toast should appear
    await expect(page.getByText('Parcela paga com sucesso')).toBeVisible();

    // Progress should now be 25% (1/4)
    await page.waitForTimeout(500);
    progressText = await financePage.getDebtProgressPercent(testDebtName);
    expect(progressText).toContain('25%');
  });

  test('should_mark_debt_as_paid_off_when_last_installment_paid', async ({ loginPage, page }) => {
    const financePage = await loginAndNavigateToDebts(loginPage, page);

    // Create negotiated debt with 2 installments
    const testDebtName = `Paid Off ${Date.now()}`;
    await financePage.createNegotiatedDebt({
      name: testDebtName,
      totalAmount: '2000',
      totalInstallments: '2',
      installmentAmount: '1100',
    });

    // Wait for debt to appear
    await expect(financePage.getDebtCard(testDebtName)).toBeVisible();

    // Pay first installment
    await financePage.payDebtInstallment(testDebtName);
    await expect(page.getByText('Parcela paga com sucesso')).toBeVisible();
    await page.waitForTimeout(500);

    // Pay second (last) installment
    await financePage.payDebtInstallment(testDebtName);
    await expect(page.getByText('Dívida quitada')).toBeVisible();

    // Debt should show paid off status
    const card = financePage.getDebtCard(testDebtName);
    await expect(card.getByText('Quitado')).toBeVisible();

    // Card should have reduced opacity
    await expect(card).toHaveClass(/opacity-75/);
  });

  test('should_update_progress_after_paying_multiple_installments', async ({ loginPage, page }) => {
    const financePage = await loginAndNavigateToDebts(loginPage, page);

    // Create negotiated debt with 4 installments
    const testDebtName = `Multi Pay ${Date.now()}`;
    await financePage.createNegotiatedDebt({
      name: testDebtName,
      totalAmount: '4000',
      totalInstallments: '4',
      installmentAmount: '1100',
    });

    // Wait for debt to appear
    await expect(financePage.getDebtCard(testDebtName)).toBeVisible();

    // Pay first installment - should be 25%
    await financePage.payDebtInstallment(testDebtName);
    await page.waitForTimeout(500);
    let progressText = await financePage.getDebtProgressPercent(testDebtName);
    expect(progressText).toContain('25%');

    // Pay second installment - should be 50%
    await financePage.payDebtInstallment(testDebtName);
    await page.waitForTimeout(500);
    progressText = await financePage.getDebtProgressPercent(testDebtName);
    expect(progressText).toContain('50%');

    // Installments count should show 2/4
    const installmentsText = await financePage.getDebtInstallmentsProgress(testDebtName);
    expect(installmentsText).toContain('2/4');
  });
});

// =========================================================================
// Status Filter Tests
// =========================================================================
test.describe('Status Filter', () => {
  test('should_filter_debts_by_active_status', async ({ loginPage, page }) => {
    const financePage = await loginAndNavigateToDebts(loginPage, page);

    // Create an active debt
    const activeDebtName = `Active ${Date.now()}`;
    await financePage.createNegotiatedDebt({
      name: activeDebtName,
      totalAmount: '2000',
      totalInstallments: '4',
      installmentAmount: '550',
    });
    await expect(financePage.getDebtCard(activeDebtName)).toBeVisible();

    // Create another debt and pay it off
    const paidDebtName = `Paid Off Filter ${Date.now()}`;
    await financePage.createNegotiatedDebt({
      name: paidDebtName,
      totalAmount: '1000',
      totalInstallments: '1',
      installmentAmount: '1100',
    });
    await expect(financePage.getDebtCard(paidDebtName)).toBeVisible();

    // Pay the single installment to mark as paid off
    await financePage.payDebtInstallment(paidDebtName);
    await page.waitForTimeout(500);

    // Filter by active
    await financePage.filterDebtsByStatus('active');
    await page.waitForTimeout(500);

    // Only active debt should be visible
    await expect(financePage.getDebtCard(activeDebtName)).toBeVisible();
    await expect(financePage.getDebtCard(paidDebtName)).not.toBeVisible();
  });

  test('should_filter_debts_by_paid_off_status', async ({ loginPage, page }) => {
    const financePage = await loginAndNavigateToDebts(loginPage, page);

    // Create an active debt
    const activeDebtName = `Active Filter ${Date.now()}`;
    await financePage.createNegotiatedDebt({
      name: activeDebtName,
      totalAmount: '4000',
      totalInstallments: '4',
      installmentAmount: '1100',
    });
    await expect(financePage.getDebtCard(activeDebtName)).toBeVisible();

    // Create another debt and pay it off
    const paidDebtName = `Paid Filter ${Date.now()}`;
    await financePage.createNegotiatedDebt({
      name: paidDebtName,
      totalAmount: '1000',
      totalInstallments: '1',
      installmentAmount: '1100',
    });
    await expect(financePage.getDebtCard(paidDebtName)).toBeVisible();

    // Pay the single installment to mark as paid off
    await financePage.payDebtInstallment(paidDebtName);
    await page.waitForTimeout(500);

    // Filter by paid off
    await financePage.filterDebtsByStatus('paid_off');
    await page.waitForTimeout(500);

    // Only paid off debt should be visible
    await expect(financePage.getDebtCard(paidDebtName)).toBeVisible();
    await expect(financePage.getDebtCard(activeDebtName)).not.toBeVisible();
  });

  test('should_show_all_debts_when_all_filter_selected', async ({ loginPage, page }) => {
    const financePage = await loginAndNavigateToDebts(loginPage, page);

    // Create two debts
    const debtName1 = `All Filter 1 ${Date.now()}`;
    const debtName2 = `All Filter 2 ${Date.now()}`;

    await financePage.createNegotiatedDebt({
      name: debtName1,
      totalAmount: '2000',
      totalInstallments: '2',
      installmentAmount: '1100',
    });
    await financePage.createNegotiatedDebt({
      name: debtName2,
      totalAmount: '1000',
      totalInstallments: '1',
      installmentAmount: '1100',
    });

    // Pay off second debt
    await financePage.payDebtInstallment(debtName2);
    await page.waitForTimeout(500);

    // Filter by active first
    await financePage.filterDebtsByStatus('active');
    await page.waitForTimeout(500);

    // Then filter by all
    await financePage.filterDebtsByStatus('all');
    await page.waitForTimeout(500);

    // Both debts should be visible
    await expect(financePage.getDebtCard(debtName1)).toBeVisible();
    await expect(financePage.getDebtCard(debtName2)).toBeVisible();
  });
});

// =========================================================================
// Summary Update Tests
// =========================================================================
test.describe('Summary Updates', () => {
  test('should_update_summary_after_creating_debt', async ({ loginPage, page }) => {
    const financePage = await loginAndNavigateToDebts(loginPage, page);

    // Create debt
    const testDebtName = `Summary Test ${Date.now()}`;
    await financePage.createNegotiatedDebt({
      name: testDebtName,
      totalAmount: '10000',
      totalInstallments: '10',
      installmentAmount: '1100',
    });

    // Wait for debt to appear
    await expect(financePage.getDebtCard(testDebtName)).toBeVisible();

    // Summary should be visible and show values
    await expect(financePage.debtSummary).toBeVisible();

    // Get summary values (they should include the new debt)
    const totalValue = await financePage.getDebtSummaryTotal();
    const monthlyValue = await financePage.getDebtSummaryMonthly();

    expect(totalValue).toBeTruthy();
    expect(monthlyValue).toBeTruthy();
  });

  test('should_update_summary_after_paying_installment', async ({ loginPage, page }) => {
    const financePage = await loginAndNavigateToDebts(loginPage, page);

    // Create debt
    const testDebtName = `Summary Paid ${Date.now()}`;
    await financePage.createNegotiatedDebt({
      name: testDebtName,
      totalAmount: '4000',
      totalInstallments: '4',
      installmentAmount: '1100',
    });

    // Wait for debt to appear
    await expect(financePage.getDebtCard(testDebtName)).toBeVisible();

    // Pay installment
    await financePage.payDebtInstallment(testDebtName);
    await page.waitForTimeout(500);

    // Get summary values (should show paid amount)
    const paidValue = await financePage.getDebtSummaryPaid();
    expect(paidValue).toBeTruthy();
  });
});

// =========================================================================
// Full Workflow Test
// =========================================================================
test.describe('Full Debt Workflow', () => {
  test('should_complete_full_debt_lifecycle', async ({ loginPage, page }) => {
    const financePage = await loginAndNavigateToDebts(loginPage, page);

    // 1. Create pending debt
    const testDebtName = `Lifecycle ${Date.now()}`;
    await financePage.createPendingDebt({
      name: testDebtName,
      creditor: 'Banco Lifecycle',
      totalAmount: '3000',
      notes: 'Test lifecycle',
    });

    // Verify in pending section
    await expect(financePage.pendingDebtsSection).toBeVisible();
    await expect(financePage.pendingDebtsSection.getByText(testDebtName)).toBeVisible();

    // 2. Negotiate the debt
    await financePage.negotiateDebt(testDebtName, {
      totalInstallments: '3',
      installmentAmount: '1100',
      dueDay: '15',
    });

    // Verify moved to negotiated section
    await page.waitForTimeout(500);
    await expect(financePage.negotiatedDebtsSection.getByText(testDebtName)).toBeVisible();

    // 3. Pay all installments
    for (let i = 0; i < 3; i++) {
      await financePage.payDebtInstallment(testDebtName);
      await page.waitForTimeout(500);
    }

    // 4. Verify paid off status
    const card = financePage.getDebtCard(testDebtName);
    await expect(card.getByText('Quitado')).toBeVisible();
    await expect(card).toHaveClass(/opacity-75/);

    // 5. Verify in paid_off filter
    await financePage.filterDebtsByStatus('paid_off');
    await page.waitForTimeout(500);
    await expect(financePage.getDebtCard(testDebtName)).toBeVisible();
  });
});
