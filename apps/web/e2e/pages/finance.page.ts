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
}
