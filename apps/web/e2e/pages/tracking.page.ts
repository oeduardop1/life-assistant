import type { Page, Locator } from '@playwright/test';

/**
 * Page Object for Tracking page
 *
 * Provides methods to interact with the tracking/metrics interface
 *
 * @see docs/milestones/phase-2-tracker.md M2.1 for Tracking implementation
 */
export class TrackingPage {
  readonly page: Page;

  // Header
  readonly title: Locator;
  readonly newRecordButton: Locator;

  // Metric cards
  readonly metricCardsGrid: Locator;

  // History
  readonly historySection: Locator;
  readonly historyFilter: Locator;
  readonly loadMoreButton: Locator;

  // Form modal
  readonly formModal: Locator;
  readonly typeSelect: Locator;
  readonly valueInput: Locator;
  readonly saveButton: Locator;
  readonly cancelButton: Locator;

  // Empty state
  readonly emptyState: Locator;
  readonly emptyStateChatLink: Locator;
  readonly emptyStateManualButton: Locator;

  // Delete confirmation
  readonly deleteDialog: Locator;

  constructor(page: Page) {
    this.page = page;

    // Header
    this.title = page.getByRole('heading', { name: 'Tracking' });
    this.newRecordButton = page.getByRole('button', { name: /Novo Registro/iu });

    // Metric cards
    this.metricCardsGrid = page.locator('[class*="grid"]').first();

    // History
    this.historySection = page.getByText('Historico').locator('..');
    // The filter combobox is in the history card header, next to "Historico" text
    this.historyFilter = page.getByText('Historico').locator('..').locator('..').getByRole('combobox');
    this.loadMoreButton = page.getByRole('button', { name: /Carregar mais/i });

    // Form modal
    this.formModal = page.locator('[role="dialog"]').filter({ hasText: 'Registrar Metrica' });
    this.typeSelect = page.locator('[role="combobox"]').filter({ hasText: /Peso|Tipo/iu }).first();
    this.valueInput = page.getByRole('spinbutton', { name: /Valor/iu });
    this.saveButton = page.getByRole('button', { name: /Salvar/iu });
    this.cancelButton = page.getByRole('button', { name: /Cancelar/iu });

    // Empty state
    this.emptyState = page.getByText('Comece a registrar suas metricas');
    this.emptyStateChatLink = page.getByRole('link', { name: /Registrar via Chat/iu });
    this.emptyStateManualButton = page.getByRole('button', { name: /Registrar Manualmente/iu });

    // Delete confirmation
    this.deleteDialog = page.locator('[role="alertdialog"]').filter({ hasText: 'Remover registro' });
  }

  /**
   * Navigate to the tracking page
   */
  async goto() {
    await this.page.goto('/tracking');
  }

  /**
   * Wait for page to load
   */
  async waitForPageLoad() {
    await this.page.waitForLoadState('networkidle');
    await this.title.waitFor({ timeout: 10000 });
  }

  /**
   * Check if empty state is visible
   */
  async isEmptyStateVisible(): Promise<boolean> {
    return this.emptyState.isVisible();
  }

  /**
   * Open the manual track form
   */
  async openForm() {
    // Check if we're in empty state or main view
    const emptyStateVisible = await this.isEmptyStateVisible();

    if (emptyStateVisible) {
      await this.emptyStateManualButton.click();
    } else {
      await this.newRecordButton.click();
    }

    await this.formModal.waitFor({ timeout: 5000 });
  }

  /**
   * Fill and submit a tracking entry
   */
  async addEntry(data: { type?: string; value: number }) {
    await this.openForm();

    // Select type if provided
    if (data.type) {
      // Click the type combobox
      await this.formModal.locator('[role="combobox"]').first().click();
      // Select the option
      await this.page.getByRole('option', { name: new RegExp(data.type, 'i') }).click();
    }

    // Fill value
    await this.valueInput.clear();
    await this.valueInput.fill(String(data.value));

    // Submit
    await this.saveButton.click();

    // Wait for modal to close (web-first assertion - auto-retries)
    await this.formModal.waitFor({ state: 'hidden', timeout: 10000 });
  }

  /**
   * Get all metric card values
   */
  async getMetricCardValue(type: string): Promise<string | null> {
    const card = this.page.locator('article, [class*="card"]')
      .filter({ hasText: new RegExp(type, 'i') })
      .first();

    if (await card.isVisible()) {
      const valueElement = card.locator('[class*="font-semibold"], [class*="text-lg"]').first();
      return valueElement.textContent();
    }
    return null;
  }

  /**
   * Get all history entries
   */
  getAllHistoryEntries(): Locator {
    return this.page.locator('[class*="rounded-lg"][class*="border"]')
      .filter({ has: this.page.locator('[class*="rounded-full"]') });
  }

  /**
   * Get history entry count (visible entries only)
   */
  async getHistoryEntryCount(): Promise<number> {
    const entries = this.getAllHistoryEntries();
    return entries.count();
  }

  /**
   * Get total entries count from the history header (includes all, not just visible)
   * Parses "22 registros" from the CardDescription under "Historico"
   */
  async getTotalEntriesCount(): Promise<number> {
    // Find the CardDescription within the history section (near "Historico" heading)
    const historyCard = this.page.locator('text=Historico').locator('..');
    const countText = await historyCard.locator('text=/\\d+ registros$/').textContent();
    if (!countText) return 0;
    const match = countText.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  }

  /**
   * Delete a history entry by index
   */
  async deleteEntry(index: number = 0) {
    const entries = this.getAllHistoryEntries();
    const entry = entries.nth(index);

    // Click menu button
    await entry.getByRole('button').filter({ has: this.page.locator('svg') }).click();

    // Click delete option
    await this.page.getByRole('menuitem', { name: /Remover/iu }).click();

    // Confirm deletion
    await this.deleteDialog.getByRole('button', { name: /Remover/iu }).click();

    // Wait for dialog to close (web-first assertion)
    await this.deleteDialog.waitFor({ state: 'hidden', timeout: 10000 });
  }

  /**
   * Filter history by type
   */
  async filterByType(type: string) {
    // Click the filter dropdown
    await this.historyFilter.click();

    // Select the type
    await this.page.getByRole('option', { name: new RegExp(type, 'i') }).click();

    // Wait for filter to apply
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Navigate to chat for conversational tracking
   */
  async goToChat() {
    await this.emptyStateChatLink.click();
    await this.page.waitForURL(/\/chat/);
  }
}
