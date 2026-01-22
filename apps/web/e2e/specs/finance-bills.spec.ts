import { test, expect } from '../fixtures/auth.fixture';
import { FinancePage, LoginPage } from '../pages';
import type { Page } from '@playwright/test';

/**
 * E2E Tests for Finance Bills Page
 *
 * These tests verify the bills management experience including:
 * - Navigation to bills page via tab
 * - Empty state when no bills exist
 * - CRUD operations (create, read, update, delete)
 * - Mark as paid/unpaid functionality
 * - Status filter (all, pending, paid)
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

async function loginAndNavigateToBills(
  loginPage: LoginPage,
  page: Page
): Promise<FinancePage> {
  await loginPage.goto();
  await loginPage.login('test@example.com', 'testpassword123');
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });

  const financePage = new FinancePage(page);
  await financePage.gotoBills();
  await financePage.waitForBillsPageLoad();

  return financePage;
}

// =========================================================================
// Navigation Tests
// =========================================================================
test.describe('Bills Navigation', () => {
  test('should_navigate_to_bills_page_via_tab', async ({ loginPage, page }) => {
    // Login and go to finance
    await loginPage.goto();
    await loginPage.login('test@example.com', 'testpassword123');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });

    const financePage = new FinancePage(page);
    await financePage.goto();
    await financePage.waitForPageLoad();

    // Click bills tab
    await financePage.navigateToTab('bills');

    // Should be on bills page
    await expect(page).toHaveURL(/\/finance\/bills/);
  });

  test('should_highlight_bills_tab_when_on_bills_page', async ({ loginPage, page }) => {
    const financePage = await loginAndNavigateToBills(loginPage, page);

    // Bills tab should be highlighted
    await expect(financePage.billsTab).toHaveAttribute('aria-current', 'page');
  });

  test('should_display_bills_page_title', async ({ loginPage, page }) => {
    await loginAndNavigateToBills(loginPage, page);

    // Should display the page title
    await expect(page.getByRole('heading', { name: 'Contas Fixas' })).toBeVisible();
  });
});

// =========================================================================
// Page State Tests
// =========================================================================
test.describe('Bills Page States', () => {
  test('should_show_bills_page_or_empty_state', async ({ loginPage, page }) => {
    const financePage = await loginAndNavigateToBills(loginPage, page);

    // Should show either bills page content or empty state
    const isPageVisible = await financePage.isBillsPageVisible();
    const isEmptyVisible = await financePage.isBillsEmptyStateVisible();

    // One should be visible
    expect(isPageVisible || isEmptyVisible).toBe(true);
  });

  test('should_display_add_bill_button', async ({ loginPage, page }) => {
    const financePage = await loginAndNavigateToBills(loginPage, page);

    // Add bill button should be visible
    await expect(financePage.addBillButton).toBeVisible();
  });

  test('should_display_status_filter', async ({ loginPage, page }) => {
    const financePage = await loginAndNavigateToBills(loginPage, page);

    // Status filter should be visible
    await expect(financePage.billStatusFilter).toBeVisible();
    await expect(financePage.billFilterAll).toBeVisible();
    await expect(financePage.billFilterPending).toBeVisible();
    await expect(financePage.billFilterPaid).toBeVisible();
  });

  test('should_display_bill_summary_when_bills_exist', async ({ loginPage, page }) => {
    const financePage = await loginAndNavigateToBills(loginPage, page);

    // If there are bills, summary should be visible
    const hasBills = await financePage.billList.isVisible();

    if (hasBills) {
      await expect(financePage.billSummary).toBeVisible();
    }
  });
});

// =========================================================================
// Create Bill Tests
// =========================================================================
test.describe('Create Bill', () => {
  test('should_open_create_bill_modal', async ({ loginPage, page }) => {
    const financePage = await loginAndNavigateToBills(loginPage, page);

    // Click add bill button
    await financePage.addBillButton.click();

    // Modal should be visible
    await expect(financePage.createBillModal).toBeVisible();
    await expect(page.getByText('Nova Conta')).toBeVisible();
  });

  test('should_close_modal_on_cancel', async ({ loginPage, page }) => {
    const financePage = await loginAndNavigateToBills(loginPage, page);

    // Open modal
    await financePage.openCreateBillModal();

    // Cancel
    await financePage.cancelBillForm();

    // Modal should be closed
    await expect(financePage.createBillModal).not.toBeVisible();
  });

  test('should_show_validation_errors_for_empty_form', async ({ loginPage, page }) => {
    const financePage = await loginAndNavigateToBills(loginPage, page);

    // Open modal
    await financePage.openCreateBillModal();

    // Submit empty form
    await financePage.submitBillForm();

    // Should show validation error
    await expect(page.getByText('Nome é obrigatório')).toBeVisible();
  });

  test('should_create_bill_successfully', async ({ loginPage, page }) => {
    const financePage = await loginAndNavigateToBills(loginPage, page);

    const testBillName = `Test Bill ${Date.now()}`;

    // Create bill
    await financePage.createBill({
      name: testBillName,
      category: 'Moradia',
      amount: '1500',
      dueDay: '10',
    });

    // Modal should close
    await expect(financePage.createBillModal).not.toBeVisible();

    // Success toast should appear
    await expect(page.getByText('Conta criada com sucesso')).toBeVisible();

    // Bill should appear in the list
    await expect(financePage.getBillCard(testBillName)).toBeVisible();
  });
});

// =========================================================================
// Edit Bill Tests
// =========================================================================
test.describe('Edit Bill', () => {
  test('should_open_edit_bill_modal', async ({ loginPage, page }) => {
    const financePage = await loginAndNavigateToBills(loginPage, page);

    // First create a bill to edit
    const testBillName = `Edit Test ${Date.now()}`;
    await financePage.createBill({
      name: testBillName,
      amount: '3000',
    });

    // Wait for bill to appear
    await expect(financePage.getBillCard(testBillName)).toBeVisible();

    // Open edit modal
    await financePage.openEditBillModal(testBillName);

    // Edit modal should be visible
    await expect(financePage.editBillModal).toBeVisible();
    await expect(page.getByText('Editar Conta')).toBeVisible();
  });

  test('should_prefill_form_with_bill_data', async ({ loginPage, page }) => {
    const financePage = await loginAndNavigateToBills(loginPage, page);

    // First create a bill to edit
    const testBillName = `Prefill Test ${Date.now()}`;
    await financePage.createBill({
      name: testBillName,
      amount: '4500',
      dueDay: '15',
    });

    // Wait for bill to appear
    await expect(financePage.getBillCard(testBillName)).toBeVisible();

    // Open edit modal
    await financePage.openEditBillModal(testBillName);

    // Form should be prefilled
    await expect(financePage.billFormName).toHaveValue(testBillName);
    await expect(financePage.billFormAmount).toHaveValue('4500');
    await expect(financePage.billFormDueDay).toHaveValue('15');
  });

  test('should_update_bill_successfully', async ({ loginPage, page }) => {
    const financePage = await loginAndNavigateToBills(loginPage, page);

    // First create a bill to edit
    const originalName = `Original Bill ${Date.now()}`;
    const updatedName = `Updated Bill ${Date.now()}`;

    await financePage.createBill({
      name: originalName,
      amount: '2000',
    });

    // Wait for bill to appear
    await expect(financePage.getBillCard(originalName)).toBeVisible();

    // Open edit modal
    await financePage.openEditBillModal(originalName);

    // Update the name
    await financePage.billFormName.clear();
    await financePage.billFormName.fill(updatedName);
    await financePage.submitBillForm();

    // Modal should close
    await expect(financePage.editBillModal).not.toBeVisible();

    // Success toast should appear
    await expect(page.getByText('Conta atualizada com sucesso')).toBeVisible();

    // Updated bill should appear in the list
    await expect(financePage.getBillCard(updatedName)).toBeVisible();
    await expect(financePage.getBillCard(originalName)).not.toBeVisible();
  });
});

// =========================================================================
// Delete Bill Tests
// =========================================================================
test.describe('Delete Bill', () => {
  test('should_open_delete_confirmation_dialog', async ({ loginPage, page }) => {
    const financePage = await loginAndNavigateToBills(loginPage, page);

    // First create a bill to delete
    const testBillName = `Delete Test ${Date.now()}`;
    await financePage.createBill({
      name: testBillName,
      amount: '1500',
    });

    // Wait for bill to appear
    await expect(financePage.getBillCard(testBillName)).toBeVisible();

    // Open delete dialog
    await financePage.openDeleteBillDialog(testBillName);

    // Delete dialog should be visible
    await expect(financePage.deleteBillDialog).toBeVisible();
    await expect(page.getByText('Excluir Conta')).toBeVisible();
    await expect(page.getByText(/Esta ação não pode ser desfeita/)).toBeVisible();
  });

  test('should_cancel_delete_without_removing_bill', async ({ loginPage, page }) => {
    const financePage = await loginAndNavigateToBills(loginPage, page);

    // First create a bill
    const testBillName = `Cancel Delete ${Date.now()}`;
    await financePage.createBill({
      name: testBillName,
      amount: '1000',
    });

    // Wait for bill to appear
    await expect(financePage.getBillCard(testBillName)).toBeVisible();

    // Open delete dialog
    await financePage.openDeleteBillDialog(testBillName);

    // Cancel delete
    await financePage.cancelDeleteBill();

    // Dialog should close
    await expect(financePage.deleteBillDialog).not.toBeVisible();

    // Bill should still be visible
    await expect(financePage.getBillCard(testBillName)).toBeVisible();
  });

  test('should_delete_bill_successfully', async ({ loginPage, page }) => {
    const financePage = await loginAndNavigateToBills(loginPage, page);

    // First create a bill to delete
    const testBillName = `Delete Me ${Date.now()}`;
    await financePage.createBill({
      name: testBillName,
      amount: '500',
    });

    // Wait for bill to appear
    await expect(financePage.getBillCard(testBillName)).toBeVisible();

    // Open delete dialog
    await financePage.openDeleteBillDialog(testBillName);

    // Confirm delete
    await financePage.confirmDeleteBill();

    // Dialog should close
    await expect(financePage.deleteBillDialog).not.toBeVisible();

    // Success toast should appear
    await expect(page.getByText('Conta excluída com sucesso')).toBeVisible();

    // Bill should be removed from the list
    await expect(financePage.getBillCard(testBillName)).not.toBeVisible();
  });
});

// =========================================================================
// Mark Paid/Unpaid Tests
// =========================================================================
test.describe('Mark Bill Paid/Unpaid', () => {
  test('should_mark_bill_as_paid_via_checkbox', async ({ loginPage, page }) => {
    const financePage = await loginAndNavigateToBills(loginPage, page);

    // First create a bill
    const testBillName = `Paid Checkbox ${Date.now()}`;
    await financePage.createBill({
      name: testBillName,
      amount: '750',
    });

    // Wait for bill to appear
    await expect(financePage.getBillCard(testBillName)).toBeVisible();

    // Toggle paid via checkbox
    await financePage.toggleBillPaidCheckbox(testBillName);

    // Success toast should appear
    await expect(page.getByText('Conta marcada como paga')).toBeVisible();

    // Bill card should show paid status (reduced opacity)
    const card = financePage.getBillCard(testBillName);
    await expect(card).toHaveClass(/opacity-75/);
  });

  test('should_mark_bill_as_unpaid_via_checkbox', async ({ loginPage, page }) => {
    const financePage = await loginAndNavigateToBills(loginPage, page);

    // First create a bill and mark it as paid
    const testBillName = `Unpaid Checkbox ${Date.now()}`;
    await financePage.createBill({
      name: testBillName,
      amount: '850',
    });

    // Wait for bill to appear and mark as paid
    await expect(financePage.getBillCard(testBillName)).toBeVisible();
    await financePage.toggleBillPaidCheckbox(testBillName);
    await expect(page.getByText('Conta marcada como paga')).toBeVisible();

    // Wait for paid state
    await page.waitForTimeout(500);

    // Toggle back to unpaid via checkbox
    await financePage.toggleBillPaidCheckbox(testBillName);

    // Success toast should appear
    await expect(page.getByText('Conta marcada como pendente')).toBeVisible();
  });

  test('should_mark_bill_as_paid_via_menu', async ({ loginPage, page }) => {
    const financePage = await loginAndNavigateToBills(loginPage, page);

    // First create a bill
    const testBillName = `Paid Menu ${Date.now()}`;
    await financePage.createBill({
      name: testBillName,
      amount: '600',
    });

    // Wait for bill to appear
    await expect(financePage.getBillCard(testBillName)).toBeVisible();

    // Toggle paid via menu
    await financePage.toggleBillPaidMenu(testBillName);

    // Success toast should appear
    await expect(page.getByText('Conta marcada como paga')).toBeVisible();
  });
});

// =========================================================================
// Status Filter Tests
// =========================================================================
test.describe('Status Filter', () => {
  test('should_filter_bills_by_pending_status', async ({ loginPage, page }) => {
    const financePage = await loginAndNavigateToBills(loginPage, page);

    // Create a pending bill and a paid bill
    const pendingBillName = `Pending ${Date.now()}`;
    const paidBillName = `Paid ${Date.now()}`;

    await financePage.createBill({
      name: pendingBillName,
      amount: '1000',
    });
    await expect(financePage.getBillCard(pendingBillName)).toBeVisible();

    await financePage.createBill({
      name: paidBillName,
      amount: '500',
    });
    await expect(financePage.getBillCard(paidBillName)).toBeVisible();

    // Mark one as paid
    await financePage.toggleBillPaidCheckbox(paidBillName);
    await page.waitForTimeout(500);

    // Filter by pending
    await financePage.filterBillsByStatus('pending');
    await page.waitForTimeout(500);

    // Only pending bill should be visible
    await expect(financePage.getBillCard(pendingBillName)).toBeVisible();
    await expect(financePage.getBillCard(paidBillName)).not.toBeVisible();
  });

  test('should_filter_bills_by_paid_status', async ({ loginPage, page }) => {
    const financePage = await loginAndNavigateToBills(loginPage, page);

    // Create a pending bill and a paid bill
    const pendingBillName = `Pending Filter ${Date.now()}`;
    const paidBillName = `Paid Filter ${Date.now()}`;

    await financePage.createBill({
      name: pendingBillName,
      amount: '1000',
    });
    await expect(financePage.getBillCard(pendingBillName)).toBeVisible();

    await financePage.createBill({
      name: paidBillName,
      amount: '500',
    });
    await expect(financePage.getBillCard(paidBillName)).toBeVisible();

    // Mark one as paid
    await financePage.toggleBillPaidCheckbox(paidBillName);
    await page.waitForTimeout(500);

    // Filter by paid
    await financePage.filterBillsByStatus('paid');
    await page.waitForTimeout(500);

    // Only paid bill should be visible
    await expect(financePage.getBillCard(paidBillName)).toBeVisible();
    await expect(financePage.getBillCard(pendingBillName)).not.toBeVisible();
  });

  test('should_show_all_bills_when_all_filter_selected', async ({ loginPage, page }) => {
    const financePage = await loginAndNavigateToBills(loginPage, page);

    // Create bills
    const billName1 = `All Filter 1 ${Date.now()}`;
    const billName2 = `All Filter 2 ${Date.now()}`;

    await financePage.createBill({
      name: billName1,
      amount: '1000',
    });
    await financePage.createBill({
      name: billName2,
      amount: '500',
    });

    // Mark one as paid
    await financePage.toggleBillPaidCheckbox(billName2);
    await page.waitForTimeout(500);

    // Filter by pending first
    await financePage.filterBillsByStatus('pending');
    await page.waitForTimeout(500);

    // Then filter by all
    await financePage.filterBillsByStatus('all');
    await page.waitForTimeout(500);

    // Both bills should be visible
    await expect(financePage.getBillCard(billName1)).toBeVisible();
    await expect(financePage.getBillCard(billName2)).toBeVisible();
  });
});

// =========================================================================
// Summary Update Tests
// =========================================================================
test.describe('Summary Updates', () => {
  test('should_update_summary_after_creating_bill', async ({ loginPage, page }) => {
    const financePage = await loginAndNavigateToBills(loginPage, page);

    // Create bill
    const testBillName = `Summary Test ${Date.now()}`;
    await financePage.createBill({
      name: testBillName,
      amount: '10000',
    });

    // Wait for bill to appear
    await expect(financePage.getBillCard(testBillName)).toBeVisible();

    // Summary should be visible and show values
    await expect(financePage.billSummary).toBeVisible();

    // Get summary values (they should include the new bill)
    const totalValue = await financePage.getBillSummaryTotal();
    const pendingValue = await financePage.getBillSummaryPending();

    expect(totalValue).toBeTruthy();
    expect(pendingValue).toBeTruthy();
  });

  test('should_update_summary_after_marking_paid', async ({ loginPage, page }) => {
    const financePage = await loginAndNavigateToBills(loginPage, page);

    // Create bill
    const testBillName = `Summary Paid ${Date.now()}`;
    await financePage.createBill({
      name: testBillName,
      amount: '5000',
    });

    // Wait for bill to appear
    await expect(financePage.getBillCard(testBillName)).toBeVisible();

    // Mark as paid
    await financePage.toggleBillPaidCheckbox(testBillName);
    await page.waitForTimeout(500);

    // Get summary values (should show paid amount)
    const paidValue = await financePage.getBillSummaryPaid();
    expect(paidValue).toBeTruthy();
  });
});

// =========================================================================
// Month Navigation Tests
// =========================================================================
test.describe('Month Navigation for Bills', () => {
  test('should_filter_bills_by_month', async ({ loginPage, page }) => {
    const financePage = await loginAndNavigateToBills(loginPage, page);

    // Create bill in current month
    const testBillName = `Month Test ${Date.now()}`;
    await financePage.createBill({
      name: testBillName,
      amount: '3000',
    });

    // Wait for bill to appear
    await expect(financePage.getBillCard(testBillName)).toBeVisible();

    // Navigate to previous month
    await financePage.goToPreviousMonth();
    await page.waitForTimeout(500);

    // Bill should not be visible (it's in the current month)
    await expect(financePage.getBillCard(testBillName)).not.toBeVisible();

    // Navigate back to current month (next month from previous)
    await financePage.goToNextMonth();
    await page.waitForTimeout(500);

    // Bill should be visible again
    await expect(financePage.getBillCard(testBillName)).toBeVisible();
  });
});
