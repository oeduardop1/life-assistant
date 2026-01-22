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
}
