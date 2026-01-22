import type { Page, Locator } from '@playwright/test';

/**
 * Page Object for Finance page
 *
 * Provides methods to interact with the finance/dashboard interface
 *
 * @see docs/milestones/phase-2-tracker.md M2.2 for Finance implementation
 */
export class FinancePage {
  readonly page: Page;

  // Header
  readonly title: Locator;

  // Month selector
  readonly monthSelector: Locator;
  readonly prevMonthButton: Locator;
  readonly nextMonthButton: Locator;
  readonly currentMonthButton: Locator;

  // Navigation tabs
  readonly navTabs: Locator;
  readonly overviewTab: Locator;
  readonly incomesTab: Locator;
  readonly billsTab: Locator;
  readonly expensesTab: Locator;
  readonly debtsTab: Locator;
  readonly investmentsTab: Locator;

  // Dashboard
  readonly dashboard: Locator;
  readonly kpiCardsGrid: Locator;

  // Empty state
  readonly emptyState: Locator;

  // Error state
  readonly errorState: Locator;
  readonly retryButton: Locator;

  // Incomes page
  readonly incomesPage: Locator;
  readonly incomesEmptyState: Locator;
  readonly incomesErrorState: Locator;
  readonly addIncomeButton: Locator;
  readonly incomeSummary: Locator;
  readonly incomeList: Locator;

  // Income modals
  readonly createIncomeModal: Locator;
  readonly editIncomeModal: Locator;
  readonly deleteIncomeDialog: Locator;

  // Income form fields
  readonly incomeFormName: Locator;
  readonly incomeFormType: Locator;
  readonly incomeFormFrequency: Locator;
  readonly incomeFormExpectedAmount: Locator;
  readonly incomeFormActualAmount: Locator;
  readonly incomeFormIsRecurring: Locator;
  readonly incomeFormSubmit: Locator;
  readonly incomeFormCancel: Locator;

  // Bills page
  readonly billsPage: Locator;
  readonly billsEmptyState: Locator;
  readonly billsEmptyFiltered: Locator;
  readonly billsErrorState: Locator;
  readonly addBillButton: Locator;
  readonly billSummary: Locator;
  readonly billList: Locator;
  readonly billStatusFilter: Locator;
  readonly billFilterAll: Locator;
  readonly billFilterPending: Locator;
  readonly billFilterPaid: Locator;

  // Bill modals
  readonly createBillModal: Locator;
  readonly editBillModal: Locator;
  readonly deleteBillDialog: Locator;

  // Bill form fields
  readonly billFormName: Locator;
  readonly billFormCategory: Locator;
  readonly billFormAmount: Locator;
  readonly billFormDueDay: Locator;
  readonly billFormIsRecurring: Locator;
  readonly billFormSubmit: Locator;
  readonly billFormCancel: Locator;

  // Debts page
  readonly debtsPage: Locator;
  readonly debtsEmptyState: Locator;
  readonly debtsEmptyFiltered: Locator;
  readonly debtsErrorState: Locator;
  readonly addDebtButton: Locator;
  readonly debtSummary: Locator;
  readonly debtList: Locator;
  readonly debtStatusFilter: Locator;
  readonly debtFilterAll: Locator;
  readonly debtFilterActive: Locator;
  readonly debtFilterPaidOff: Locator;
  readonly negotiatedDebtsSection: Locator;
  readonly pendingDebtsSection: Locator;

  // Debt modals
  readonly createDebtModal: Locator;
  readonly editDebtModal: Locator;
  readonly deleteDebtDialog: Locator;
  readonly negotiateDebtModal: Locator;
  readonly payInstallmentDialog: Locator;

  // Debt form fields
  readonly debtFormName: Locator;
  readonly debtFormCreditor: Locator;
  readonly debtFormTotalAmount: Locator;
  readonly debtFormIsNegotiated: Locator;
  readonly debtFormTotalInstallments: Locator;
  readonly debtFormInstallmentAmount: Locator;
  readonly debtFormDueDay: Locator;
  readonly debtFormNotes: Locator;
  readonly debtFormSubmit: Locator;
  readonly debtFormCancel: Locator;

  // Negotiate form fields
  readonly negotiateFormTotalInstallments: Locator;
  readonly negotiateFormInstallmentAmount: Locator;
  readonly negotiateFormDueDay: Locator;
  readonly negotiateFormSubmit: Locator;
  readonly negotiateFormCancel: Locator;

  // Pay installment dialog
  readonly payInstallmentConfirm: Locator;
  readonly payInstallmentCancel: Locator;

  // Investments page
  readonly investmentsPage: Locator;
  readonly investmentsEmptyState: Locator;
  readonly investmentsErrorState: Locator;
  readonly addInvestmentButton: Locator;
  readonly investmentSummary: Locator;
  readonly investmentList: Locator;

  // Investment modals
  readonly createInvestmentModal: Locator;
  readonly editInvestmentModal: Locator;
  readonly deleteInvestmentDialog: Locator;
  readonly updateValueModal: Locator;

  // Investment form fields
  readonly investmentFormName: Locator;
  readonly investmentFormType: Locator;
  readonly investmentFormCurrentAmount: Locator;
  readonly investmentFormGoalAmount: Locator;
  readonly investmentFormMonthlyContribution: Locator;
  readonly investmentFormDeadline: Locator;
  readonly investmentFormSubmit: Locator;
  readonly investmentFormCancel: Locator;

  // Update value modal fields
  readonly updateValueInput: Locator;
  readonly updateValueSubmit: Locator;
  readonly updateValueCancel: Locator;

  constructor(page: Page) {
    this.page = page;

    // Header
    this.title = page.getByRole('heading', { name: 'Finanças' });

    // Month selector
    this.monthSelector = page.locator('[data-testid*="month-selector"]');
    this.prevMonthButton = page.getByTestId('month-selector-prev');
    this.nextMonthButton = page.getByTestId('month-selector-next');
    this.currentMonthButton = page.getByTestId('month-selector-current');

    // Navigation tabs
    this.navTabs = page.getByTestId('finance-nav-tabs');
    this.overviewTab = page.getByTestId('finance-tab-overview');
    this.incomesTab = page.getByTestId('finance-tab-incomes');
    this.billsTab = page.getByTestId('finance-tab-bills');
    this.expensesTab = page.getByTestId('finance-tab-expenses');
    this.debtsTab = page.getByTestId('finance-tab-debts');
    this.investmentsTab = page.getByTestId('finance-tab-investments');

    // Dashboard
    this.dashboard = page.getByTestId('finance-dashboard');
    this.kpiCardsGrid = page.getByTestId('finance-kpi-cards-grid');

    // Empty state
    this.emptyState = page.getByText('Nenhum dado financeiro');

    // Error state
    this.errorState = page.getByText('Erro ao carregar dados');
    this.retryButton = page.getByRole('button', { name: /Tentar novamente/i });

    // Incomes page
    this.incomesPage = page.getByTestId('incomes-page');
    this.incomesEmptyState = page.getByTestId('incomes-empty-state');
    this.incomesErrorState = page.getByTestId('incomes-error-state');
    this.addIncomeButton = page.getByTestId('add-income-button');
    this.incomeSummary = page.getByTestId('income-summary');
    this.incomeList = page.getByTestId('income-list');

    // Income modals
    this.createIncomeModal = page.getByTestId('create-income-modal');
    this.editIncomeModal = page.getByTestId('edit-income-modal');
    this.deleteIncomeDialog = page.getByTestId('delete-income-dialog');

    // Income form fields
    this.incomeFormName = page.getByTestId('income-form-name');
    this.incomeFormType = page.getByTestId('income-form-type');
    this.incomeFormFrequency = page.getByTestId('income-form-frequency');
    this.incomeFormExpectedAmount = page.getByTestId('income-form-expected-amount');
    this.incomeFormActualAmount = page.getByTestId('income-form-actual-amount');
    this.incomeFormIsRecurring = page.getByTestId('income-form-is-recurring');
    this.incomeFormSubmit = page.getByTestId('income-form-submit');
    this.incomeFormCancel = page.getByTestId('income-form-cancel');

    // Bills page
    this.billsPage = page.getByTestId('bills-page');
    this.billsEmptyState = page.getByTestId('bills-empty-state');
    this.billsEmptyFiltered = page.getByTestId('bills-empty-filtered');
    this.billsErrorState = page.getByTestId('bills-error-state');
    this.addBillButton = page.getByTestId('add-bill-button');
    this.billSummary = page.getByTestId('bill-summary');
    this.billList = page.getByTestId('bill-list');
    this.billStatusFilter = page.getByTestId('bill-status-filter');
    this.billFilterAll = page.getByTestId('bill-filter-all');
    this.billFilterPending = page.getByTestId('bill-filter-pending');
    this.billFilterPaid = page.getByTestId('bill-filter-paid');

    // Bill modals
    this.createBillModal = page.getByTestId('create-bill-modal');
    this.editBillModal = page.getByTestId('edit-bill-modal');
    this.deleteBillDialog = page.getByTestId('delete-bill-dialog');

    // Bill form fields
    this.billFormName = page.getByTestId('bill-form-name');
    this.billFormCategory = page.getByTestId('bill-form-category');
    this.billFormAmount = page.getByTestId('bill-form-amount');
    this.billFormDueDay = page.getByTestId('bill-form-due-day');
    this.billFormIsRecurring = page.getByTestId('bill-form-is-recurring');
    this.billFormSubmit = page.getByTestId('bill-form-submit');
    this.billFormCancel = page.getByTestId('bill-form-cancel');

    // Debts page
    this.debtsPage = page.getByTestId('debts-page');
    this.debtsEmptyState = page.getByTestId('debts-empty-state');
    this.debtsEmptyFiltered = page.getByTestId('debts-empty-filtered');
    this.debtsErrorState = page.getByTestId('debts-error-state');
    this.addDebtButton = page.getByTestId('add-debt-button');
    this.debtSummary = page.getByTestId('debt-summary');
    this.debtList = page.getByTestId('debt-list');
    this.debtStatusFilter = page.getByTestId('debt-status-filter');
    this.debtFilterAll = page.getByTestId('debt-filter-all');
    this.debtFilterActive = page.getByTestId('debt-filter-active');
    this.debtFilterPaidOff = page.getByTestId('debt-filter-paid-off');
    this.negotiatedDebtsSection = page.getByTestId('negotiated-debts-section');
    this.pendingDebtsSection = page.getByTestId('pending-debts-section');

    // Debt modals
    this.createDebtModal = page.getByTestId('create-debt-modal');
    this.editDebtModal = page.getByTestId('edit-debt-modal');
    this.deleteDebtDialog = page.getByTestId('delete-debt-dialog');
    this.negotiateDebtModal = page.getByTestId('negotiate-debt-modal');
    this.payInstallmentDialog = page.getByTestId('pay-installment-dialog');

    // Debt form fields
    this.debtFormName = page.getByTestId('debt-form-name');
    this.debtFormCreditor = page.getByTestId('debt-form-creditor');
    this.debtFormTotalAmount = page.getByTestId('debt-form-total-amount');
    this.debtFormIsNegotiated = page.getByTestId('debt-form-is-negotiated');
    this.debtFormTotalInstallments = page.getByTestId('debt-form-total-installments');
    this.debtFormInstallmentAmount = page.getByTestId('debt-form-installment-amount');
    this.debtFormDueDay = page.getByTestId('debt-form-due-day');
    this.debtFormNotes = page.getByTestId('debt-form-notes');
    this.debtFormSubmit = page.getByTestId('debt-form-submit');
    this.debtFormCancel = page.getByTestId('debt-form-cancel');

    // Negotiate form fields
    this.negotiateFormTotalInstallments = page.getByTestId('negotiate-form-total-installments');
    this.negotiateFormInstallmentAmount = page.getByTestId('negotiate-form-installment-amount');
    this.negotiateFormDueDay = page.getByTestId('negotiate-form-due-day');
    this.negotiateFormSubmit = page.getByTestId('negotiate-form-submit');
    this.negotiateFormCancel = page.getByTestId('negotiate-form-cancel');

    // Pay installment dialog
    this.payInstallmentConfirm = page.getByTestId('pay-installment-confirm');
    this.payInstallmentCancel = page.getByTestId('pay-installment-cancel');

    // Investments page
    this.investmentsPage = page.getByTestId('investments-page');
    this.investmentsEmptyState = page.getByTestId('investments-empty-state');
    this.investmentsErrorState = page.getByTestId('investments-error-state');
    this.addInvestmentButton = page.getByTestId('add-investment-button');
    this.investmentSummary = page.getByTestId('investment-summary');
    this.investmentList = page.getByTestId('investment-list');

    // Investment modals
    this.createInvestmentModal = page.getByTestId('create-investment-modal');
    this.editInvestmentModal = page.getByTestId('edit-investment-modal');
    this.deleteInvestmentDialog = page.getByTestId('delete-investment-dialog');
    this.updateValueModal = page.getByTestId('update-value-modal');

    // Investment form fields
    this.investmentFormName = page.getByTestId('investment-form-name');
    this.investmentFormType = page.getByTestId('investment-form-type');
    this.investmentFormCurrentAmount = page.getByTestId('investment-form-current-amount');
    this.investmentFormGoalAmount = page.getByTestId('investment-form-goal-amount');
    this.investmentFormMonthlyContribution = page.getByTestId('investment-form-monthly-contribution');
    this.investmentFormDeadline = page.getByTestId('investment-form-deadline');
    this.investmentFormSubmit = page.getByTestId('investment-form-submit');
    this.investmentFormCancel = page.getByTestId('investment-form-cancel');

    // Update value modal fields
    this.updateValueInput = page.getByTestId('update-value-input');
    this.updateValueSubmit = page.getByTestId('update-value-submit');
    this.updateValueCancel = page.getByTestId('update-value-cancel');
  }

  /**
   * Navigate to the finance page
   */
  async goto() {
    await this.page.goto('/finance');
  }

  /**
   * Wait for page to load (either dashboard, empty state, or error)
   */
  async waitForPageLoad() {
    await this.page.waitForLoadState('networkidle');
    // Wait for either dashboard, empty state, or error
    await Promise.race([
      this.dashboard.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {}),
      this.emptyState.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {}),
      this.errorState.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {}),
    ]);
  }

  /**
   * Check if dashboard is visible
   */
  async isDashboardVisible() {
    return this.dashboard.isVisible();
  }

  /**
   * Check if empty state is visible
   */
  async isEmptyStateVisible() {
    return this.emptyState.isVisible();
  }

  /**
   * Check if error state is visible
   */
  async isErrorStateVisible() {
    return this.errorState.isVisible();
  }

  /**
   * Navigate to previous month
   */
  async goToPreviousMonth() {
    await this.prevMonthButton.click();
  }

  /**
   * Navigate to next month
   */
  async goToNextMonth() {
    await this.nextMonthButton.click();
  }

  /**
   * Navigate to a specific tab
   */
  async navigateToTab(tab: 'overview' | 'incomes' | 'bills' | 'expenses' | 'debts' | 'investments') {
    const tabs = {
      overview: this.overviewTab,
      incomes: this.incomesTab,
      bills: this.billsTab,
      expenses: this.expensesTab,
      debts: this.debtsTab,
      investments: this.investmentsTab,
    };
    await tabs[tab].click();
  }

  /**
   * Get current month text
   */
  async getCurrentMonthText() {
    return this.currentMonthButton.textContent();
  }

  /**
   * Retry loading on error
   */
  async retry() {
    await this.retryButton.click();
  }

  // =========================================================================
  // Income Page Methods
  // =========================================================================

  /**
   * Navigate to incomes page
   */
  async gotoIncomes() {
    await this.page.goto('/finance/incomes');
  }

  /**
   * Wait for incomes page to load
   */
  async waitForIncomesPageLoad() {
    await this.page.waitForLoadState('networkidle');
    await Promise.race([
      this.incomesPage.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {}),
      this.incomesEmptyState.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {}),
      this.incomesErrorState.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {}),
    ]);
  }

  /**
   * Check if incomes page is visible
   */
  async isIncomesPageVisible() {
    return this.incomesPage.isVisible();
  }

  /**
   * Check if incomes empty state is visible
   */
  async isIncomesEmptyStateVisible() {
    return this.incomesEmptyState.isVisible();
  }

  /**
   * Open create income modal
   */
  async openCreateIncomeModal() {
    await this.addIncomeButton.click();
    await this.createIncomeModal.waitFor({ state: 'visible' });
  }

  /**
   * Fill income form
   */
  async fillIncomeForm(data: {
    name: string;
    type?: string;
    frequency?: string;
    expectedAmount: string;
    actualAmount?: string;
  }) {
    await this.incomeFormName.fill(data.name);

    if (data.type) {
      await this.incomeFormType.click();
      await this.page.getByRole('option', { name: data.type }).click();
    }

    if (data.frequency) {
      await this.incomeFormFrequency.click();
      await this.page.getByRole('option', { name: data.frequency }).click();
    }

    await this.incomeFormExpectedAmount.fill(data.expectedAmount);

    if (data.actualAmount) {
      await this.incomeFormActualAmount.fill(data.actualAmount);
    }
  }

  /**
   * Submit income form
   */
  async submitIncomeForm() {
    await this.incomeFormSubmit.click();
  }

  /**
   * Cancel income form
   */
  async cancelIncomeForm() {
    await this.incomeFormCancel.click();
  }

  /**
   * Create income via modal
   */
  async createIncome(data: {
    name: string;
    type?: string;
    frequency?: string;
    expectedAmount: string;
    actualAmount?: string;
  }) {
    await this.openCreateIncomeModal();
    await this.fillIncomeForm(data);
    await this.submitIncomeForm();
  }

  /**
   * Get income card by name
   */
  getIncomeCard(name: string) {
    return this.page.locator('[data-testid="income-card"]', { hasText: name });
  }

  /**
   * Open edit modal for income
   */
  async openEditIncomeModal(incomeName: string) {
    const card = this.getIncomeCard(incomeName);
    await card.getByTestId('income-actions-trigger').click();
    await card.getByTestId('income-edit-action').click();
    await this.editIncomeModal.waitFor({ state: 'visible' });
  }

  /**
   * Open delete dialog for income
   */
  async openDeleteIncomeDialog(incomeName: string) {
    const card = this.getIncomeCard(incomeName);
    await card.getByTestId('income-actions-trigger').click();
    await card.getByTestId('income-delete-action').click();
    await this.deleteIncomeDialog.waitFor({ state: 'visible' });
  }

  /**
   * Confirm delete income
   */
  async confirmDeleteIncome() {
    await this.page.getByTestId('delete-income-confirm').click();
  }

  /**
   * Cancel delete income
   */
  async cancelDeleteIncome() {
    await this.page.getByTestId('delete-income-cancel').click();
  }

  /**
   * Get summary expected value
   */
  async getSummaryExpected() {
    return this.page.getByTestId('income-summary-expected').textContent();
  }

  /**
   * Get summary actual value
   */
  async getSummaryActual() {
    return this.page.getByTestId('income-summary-actual').textContent();
  }

  // =========================================================================
  // Bill Page Methods
  // =========================================================================

  /**
   * Navigate to bills page
   */
  async gotoBills() {
    await this.page.goto('/finance/bills');
  }

  /**
   * Wait for bills page to load
   */
  async waitForBillsPageLoad() {
    await this.page.waitForLoadState('networkidle');
    await Promise.race([
      this.billsPage.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {}),
      this.billsEmptyState.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {}),
      this.billsEmptyFiltered.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {}),
      this.billsErrorState.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {}),
    ]);
  }

  /**
   * Check if bills page is visible
   */
  async isBillsPageVisible() {
    return this.billsPage.isVisible();
  }

  /**
   * Check if bills empty state is visible
   */
  async isBillsEmptyStateVisible() {
    return this.billsEmptyState.isVisible();
  }

  /**
   * Open create bill modal
   */
  async openCreateBillModal() {
    await this.addBillButton.click();
    await this.createBillModal.waitFor({ state: 'visible' });
  }

  /**
   * Fill bill form
   */
  async fillBillForm(data: {
    name: string;
    category?: string;
    amount: string;
    dueDay?: string;
  }) {
    await this.billFormName.fill(data.name);

    if (data.category) {
      await this.billFormCategory.click();
      await this.page.getByRole('option', { name: data.category }).click();
    }

    await this.billFormAmount.fill(data.amount);

    if (data.dueDay) {
      await this.billFormDueDay.clear();
      await this.billFormDueDay.fill(data.dueDay);
    }
  }

  /**
   * Submit bill form
   */
  async submitBillForm() {
    await this.billFormSubmit.click();
  }

  /**
   * Cancel bill form
   */
  async cancelBillForm() {
    await this.billFormCancel.click();
  }

  /**
   * Create bill via modal
   */
  async createBill(data: {
    name: string;
    category?: string;
    amount: string;
    dueDay?: string;
  }) {
    await this.openCreateBillModal();
    await this.fillBillForm(data);
    await this.submitBillForm();
  }

  /**
   * Get bill card by name
   */
  getBillCard(name: string) {
    return this.page.locator('[data-testid="bill-card"]', { hasText: name });
  }

  /**
   * Open edit modal for bill
   */
  async openEditBillModal(billName: string) {
    const card = this.getBillCard(billName);
    await card.getByTestId('bill-actions-trigger').click();
    await card.getByTestId('bill-edit-action').click();
    await this.editBillModal.waitFor({ state: 'visible' });
  }

  /**
   * Open delete dialog for bill
   */
  async openDeleteBillDialog(billName: string) {
    const card = this.getBillCard(billName);
    await card.getByTestId('bill-actions-trigger').click();
    await card.getByTestId('bill-delete-action').click();
    await this.deleteBillDialog.waitFor({ state: 'visible' });
  }

  /**
   * Toggle bill paid status via checkbox
   */
  async toggleBillPaidCheckbox(billName: string) {
    const card = this.getBillCard(billName);
    await card.getByTestId('bill-paid-checkbox').click();
  }

  /**
   * Toggle bill paid status via dropdown menu
   */
  async toggleBillPaidMenu(billName: string) {
    const card = this.getBillCard(billName);
    await card.getByTestId('bill-actions-trigger').click();
    await card.getByTestId('bill-toggle-paid-action').click();
  }

  /**
   * Confirm delete bill
   */
  async confirmDeleteBill() {
    await this.page.getByTestId('delete-bill-confirm').click();
  }

  /**
   * Cancel delete bill
   */
  async cancelDeleteBill() {
    await this.page.getByTestId('delete-bill-cancel').click();
  }

  /**
   * Filter bills by status
   */
  async filterBillsByStatus(status: 'all' | 'pending' | 'paid') {
    const filters = {
      all: this.billFilterAll,
      pending: this.billFilterPending,
      paid: this.billFilterPaid,
    };
    await filters[status].click();
  }

  /**
   * Get bill summary total value
   */
  async getBillSummaryTotal() {
    return this.page.getByTestId('bill-summary-total').textContent();
  }

  /**
   * Get bill summary paid value
   */
  async getBillSummaryPaid() {
    return this.page.getByTestId('bill-summary-paid').textContent();
  }

  /**
   * Get bill summary pending value
   */
  async getBillSummaryPending() {
    return this.page.getByTestId('bill-summary-pending').textContent();
  }

  // =========================================================================
  // Debt Page Methods
  // =========================================================================

  /**
   * Navigate to debts page
   */
  async gotoDebts() {
    await this.page.goto('/finance/debts');
  }

  /**
   * Wait for debts page to load
   */
  async waitForDebtsPageLoad() {
    await this.page.waitForLoadState('networkidle');
    await Promise.race([
      this.debtsPage.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {}),
      this.debtsEmptyState.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {}),
      this.debtsEmptyFiltered.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {}),
      this.debtsErrorState.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {}),
    ]);
  }

  /**
   * Check if debts page is visible
   */
  async isDebtsPageVisible() {
    return this.debtsPage.isVisible();
  }

  /**
   * Check if debts empty state is visible
   */
  async isDebtsEmptyStateVisible() {
    return this.debtsEmptyState.isVisible();
  }

  /**
   * Open create debt modal
   */
  async openCreateDebtModal() {
    await this.addDebtButton.click();
    await this.createDebtModal.waitFor({ state: 'visible' });
  }

  /**
   * Fill debt form for negotiated debt
   */
  async fillDebtFormNegotiated(data: {
    name: string;
    creditor?: string;
    totalAmount: string;
    totalInstallments: string;
    installmentAmount: string;
    dueDay?: string;
    notes?: string;
  }) {
    await this.debtFormName.fill(data.name);

    if (data.creditor) {
      await this.debtFormCreditor.fill(data.creditor);
    }

    await this.debtFormTotalAmount.fill(data.totalAmount);

    // Toggle isNegotiated to true if not already
    const isChecked = await this.debtFormIsNegotiated.isChecked();
    if (!isChecked) {
      await this.debtFormIsNegotiated.click();
    }

    await this.debtFormTotalInstallments.fill(data.totalInstallments);
    await this.debtFormInstallmentAmount.fill(data.installmentAmount);

    if (data.dueDay) {
      await this.debtFormDueDay.fill(data.dueDay);
    }

    if (data.notes) {
      await this.debtFormNotes.fill(data.notes);
    }
  }

  /**
   * Fill debt form for pending debt (not negotiated)
   */
  async fillDebtFormPending(data: {
    name: string;
    creditor?: string;
    totalAmount: string;
    notes?: string;
  }) {
    await this.debtFormName.fill(data.name);

    if (data.creditor) {
      await this.debtFormCreditor.fill(data.creditor);
    }

    await this.debtFormTotalAmount.fill(data.totalAmount);

    // Ensure isNegotiated is false
    const isChecked = await this.debtFormIsNegotiated.isChecked();
    if (isChecked) {
      await this.debtFormIsNegotiated.click();
    }

    if (data.notes) {
      await this.debtFormNotes.fill(data.notes);
    }
  }

  /**
   * Submit debt form
   */
  async submitDebtForm() {
    await this.debtFormSubmit.click();
  }

  /**
   * Cancel debt form
   */
  async cancelDebtForm() {
    await this.debtFormCancel.click();
  }

  /**
   * Create negotiated debt via modal
   */
  async createNegotiatedDebt(data: {
    name: string;
    creditor?: string;
    totalAmount: string;
    totalInstallments: string;
    installmentAmount: string;
    dueDay?: string;
    notes?: string;
  }) {
    await this.openCreateDebtModal();
    await this.fillDebtFormNegotiated(data);
    await this.submitDebtForm();
  }

  /**
   * Create pending debt via modal
   */
  async createPendingDebt(data: {
    name: string;
    creditor?: string;
    totalAmount: string;
    notes?: string;
  }) {
    await this.openCreateDebtModal();
    await this.fillDebtFormPending(data);
    await this.submitDebtForm();
  }

  /**
   * Get debt card by name
   */
  getDebtCard(name: string) {
    return this.page.locator('[data-testid="debt-card"]', { hasText: name });
  }

  /**
   * Open edit modal for debt
   */
  async openEditDebtModal(debtName: string) {
    const card = this.getDebtCard(debtName);
    await card.getByTestId('debt-actions-trigger').click();
    await card.getByTestId('debt-edit-action').click();
    await this.editDebtModal.waitFor({ state: 'visible' });
  }

  /**
   * Open delete dialog for debt
   */
  async openDeleteDebtDialog(debtName: string) {
    const card = this.getDebtCard(debtName);
    await card.getByTestId('debt-actions-trigger').click();
    await card.getByTestId('debt-delete-action').click();
    await this.deleteDebtDialog.waitFor({ state: 'visible' });
  }

  /**
   * Open negotiate modal for debt
   */
  async openNegotiateDebtModal(debtName: string) {
    const card = this.getDebtCard(debtName);
    await card.getByTestId('debt-actions-trigger').click();
    await card.getByTestId('debt-negotiate-action').click();
    await this.negotiateDebtModal.waitFor({ state: 'visible' });
  }

  /**
   * Open pay installment dialog for debt
   */
  async openPayInstallmentDialog(debtName: string) {
    const card = this.getDebtCard(debtName);
    await card.getByTestId('debt-actions-trigger').click();
    await card.getByTestId('debt-pay-installment-action').click();
    await this.payInstallmentDialog.waitFor({ state: 'visible' });
  }

  /**
   * Fill negotiate form
   */
  async fillNegotiateForm(data: {
    totalInstallments: string;
    installmentAmount: string;
    dueDay?: string;
  }) {
    await this.negotiateFormTotalInstallments.clear();
    await this.negotiateFormTotalInstallments.fill(data.totalInstallments);
    await this.negotiateFormInstallmentAmount.clear();
    await this.negotiateFormInstallmentAmount.fill(data.installmentAmount);

    if (data.dueDay) {
      await this.negotiateFormDueDay.clear();
      await this.negotiateFormDueDay.fill(data.dueDay);
    }
  }

  /**
   * Submit negotiate form
   */
  async submitNegotiateForm() {
    await this.negotiateFormSubmit.click();
  }

  /**
   * Cancel negotiate form
   */
  async cancelNegotiateForm() {
    await this.negotiateFormCancel.click();
  }

  /**
   * Negotiate a pending debt
   */
  async negotiateDebt(debtName: string, data: {
    totalInstallments: string;
    installmentAmount: string;
    dueDay?: string;
  }) {
    await this.openNegotiateDebtModal(debtName);
    await this.fillNegotiateForm(data);
    await this.submitNegotiateForm();
  }

  /**
   * Confirm pay installment
   */
  async confirmPayInstallment() {
    await this.payInstallmentConfirm.click();
  }

  /**
   * Cancel pay installment
   */
  async cancelPayInstallment() {
    await this.payInstallmentCancel.click();
  }

  /**
   * Pay installment for a debt
   */
  async payDebtInstallment(debtName: string) {
    await this.openPayInstallmentDialog(debtName);
    await this.confirmPayInstallment();
  }

  /**
   * Confirm delete debt
   */
  async confirmDeleteDebt() {
    await this.page.getByTestId('delete-debt-confirm').click();
  }

  /**
   * Cancel delete debt
   */
  async cancelDeleteDebt() {
    await this.page.getByTestId('delete-debt-cancel').click();
  }

  /**
   * Filter debts by status
   */
  async filterDebtsByStatus(status: 'all' | 'active' | 'paid_off') {
    const filters = {
      all: this.debtFilterAll,
      active: this.debtFilterActive,
      paid_off: this.debtFilterPaidOff,
    };
    await filters[status].click();
  }

  /**
   * Get debt summary total value
   */
  async getDebtSummaryTotal() {
    return this.page.getByTestId('debt-summary-total').textContent();
  }

  /**
   * Get debt summary monthly value
   */
  async getDebtSummaryMonthly() {
    return this.page.getByTestId('debt-summary-monthly').textContent();
  }

  /**
   * Get debt summary paid value
   */
  async getDebtSummaryPaid() {
    return this.page.getByTestId('debt-summary-paid').textContent();
  }

  /**
   * Get debt summary remaining value
   */
  async getDebtSummaryRemaining() {
    return this.page.getByTestId('debt-summary-remaining').textContent();
  }

  /**
   * Get progress percentage for a debt
   */
  async getDebtProgressPercent(debtName: string) {
    const card = this.getDebtCard(debtName);
    return card.getByTestId('debt-progress-percent').textContent();
  }

  /**
   * Get installments progress text for a debt
   */
  async getDebtInstallmentsProgress(debtName: string) {
    const card = this.getDebtCard(debtName);
    return card.getByTestId('debt-progress-installments').textContent();
  }

  // =========================================================================
  // Investment Page Methods
  // =========================================================================

  /**
   * Navigate to investments page
   */
  async gotoInvestments() {
    await this.page.goto('/finance/investments');
  }

  /**
   * Wait for investments page to load
   */
  async waitForInvestmentsPageLoad() {
    await this.page.waitForLoadState('networkidle');
    await Promise.race([
      this.investmentsPage.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {}),
      this.investmentsEmptyState.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {}),
      this.investmentsErrorState.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {}),
    ]);
  }

  /**
   * Check if investments page is visible
   */
  async isInvestmentsPageVisible() {
    return this.investmentsPage.isVisible();
  }

  /**
   * Check if investments empty state is visible
   */
  async isInvestmentsEmptyStateVisible() {
    return this.investmentsEmptyState.isVisible();
  }

  /**
   * Open create investment modal
   */
  async openCreateInvestmentModal() {
    await this.addInvestmentButton.click();
    await this.createInvestmentModal.waitFor({ state: 'visible' });
  }

  /**
   * Fill investment form
   */
  async fillInvestmentForm(data: {
    name: string;
    type?: string;
    currentAmount: string;
    goalAmount?: string;
    monthlyContribution?: string;
    deadline?: string;
  }) {
    await this.investmentFormName.fill(data.name);

    if (data.type) {
      await this.investmentFormType.click();
      await this.page.getByRole('option', { name: data.type }).click();
    }

    await this.investmentFormCurrentAmount.fill(data.currentAmount);

    if (data.goalAmount) {
      await this.investmentFormGoalAmount.fill(data.goalAmount);
    }

    if (data.monthlyContribution) {
      await this.investmentFormMonthlyContribution.fill(data.monthlyContribution);
    }

    if (data.deadline) {
      await this.investmentFormDeadline.fill(data.deadline);
    }
  }

  /**
   * Submit investment form
   */
  async submitInvestmentForm() {
    await this.investmentFormSubmit.click();
  }

  /**
   * Cancel investment form
   */
  async cancelInvestmentForm() {
    await this.investmentFormCancel.click();
  }

  /**
   * Create investment via modal
   */
  async createInvestment(data: {
    name: string;
    type?: string;
    currentAmount: string;
    goalAmount?: string;
    monthlyContribution?: string;
    deadline?: string;
  }) {
    await this.openCreateInvestmentModal();
    await this.fillInvestmentForm(data);
    await this.submitInvestmentForm();
  }

  /**
   * Get investment card by name
   */
  getInvestmentCard(name: string) {
    return this.page.locator('[data-testid="investment-card"]', { hasText: name });
  }

  /**
   * Open edit modal for investment
   */
  async openEditInvestmentModal(investmentName: string) {
    const card = this.getInvestmentCard(investmentName);
    await card.getByTestId('investment-actions-trigger').click();
    await card.getByTestId('investment-edit-action').click();
    await this.editInvestmentModal.waitFor({ state: 'visible' });
  }

  /**
   * Open delete dialog for investment
   */
  async openDeleteInvestmentDialog(investmentName: string) {
    const card = this.getInvestmentCard(investmentName);
    await card.getByTestId('investment-actions-trigger').click();
    await card.getByTestId('investment-delete-action').click();
    await this.deleteInvestmentDialog.waitFor({ state: 'visible' });
  }

  /**
   * Open update value modal for investment
   */
  async openUpdateValueModal(investmentName: string) {
    const card = this.getInvestmentCard(investmentName);
    await card.getByTestId('investment-actions-trigger').click();
    await card.getByTestId('investment-update-value-action').click();
    await this.updateValueModal.waitFor({ state: 'visible' });
  }

  /**
   * Fill update value form
   */
  async fillUpdateValueForm(newValue: string) {
    await this.updateValueInput.clear();
    await this.updateValueInput.fill(newValue);
  }

  /**
   * Submit update value form
   */
  async submitUpdateValueForm() {
    await this.updateValueSubmit.click();
  }

  /**
   * Cancel update value form
   */
  async cancelUpdateValueForm() {
    await this.updateValueCancel.click();
  }

  /**
   * Update investment value via modal
   */
  async updateInvestmentValue(investmentName: string, newValue: string) {
    await this.openUpdateValueModal(investmentName);
    await this.fillUpdateValueForm(newValue);
    await this.submitUpdateValueForm();
  }

  /**
   * Confirm delete investment
   */
  async confirmDeleteInvestment() {
    await this.page.getByTestId('delete-investment-confirm').click();
  }

  /**
   * Cancel delete investment
   */
  async cancelDeleteInvestment() {
    await this.page.getByTestId('delete-investment-cancel').click();
  }

  /**
   * Get investment summary total invested value
   */
  async getInvestmentSummaryTotalInvested() {
    return this.page.getByTestId('investment-summary-total-invested').textContent();
  }

  /**
   * Get investment summary total goal value
   */
  async getInvestmentSummaryTotalGoal() {
    return this.page.getByTestId('investment-summary-total-goal').textContent();
  }

  /**
   * Get investment summary monthly contribution value
   */
  async getInvestmentSummaryMonthlyContribution() {
    return this.page.getByTestId('investment-summary-monthly-contribution').textContent();
  }

  /**
   * Get investment summary average progress value
   */
  async getInvestmentSummaryAverageProgress() {
    return this.page.getByTestId('investment-summary-average-progress').textContent();
  }

  /**
   * Get progress percentage for an investment
   */
  async getInvestmentProgressPercent(investmentName: string) {
    const card = this.getInvestmentCard(investmentName);
    return card.getByTestId('investment-progress-percent').textContent();
  }

  /**
   * Get current amount text for an investment
   */
  async getInvestmentCurrentAmount(investmentName: string) {
    const card = this.getInvestmentCard(investmentName);
    return card.getByTestId('investment-current-amount').textContent();
  }
}
