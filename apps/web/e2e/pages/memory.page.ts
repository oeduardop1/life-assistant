import type { Page, Locator } from '@playwright/test';

/**
 * Page Object for Memory page
 *
 * Provides methods to interact with the memory/knowledge items interface
 */
export class MemoryPage {
  readonly page: Page;

  // Overview
  readonly overviewSection: Locator;
  readonly statsSection: Locator;

  // Knowledge items list
  readonly itemsList: Locator;
  readonly filterBar: Locator;
  readonly searchInput: Locator;
  readonly searchButton: Locator;
  readonly typeFilter: Locator;
  readonly areaFilter: Locator;
  readonly sourceFilter: Locator;
  readonly confidenceFilter: Locator;
  readonly clearFiltersButton: Locator;

  // Actions
  readonly addButton: Locator;
  readonly exportButton: Locator;

  // Modals
  readonly addModal: Locator;
  readonly editModal: Locator;
  readonly deleteDialog: Locator;

  // Empty state
  readonly emptyState: Locator;

  constructor(page: Page) {
    this.page = page;

    // Overview
    this.overviewSection = page.locator('[data-testid="memory-overview"]');
    this.statsSection = page.locator('[data-testid="memory-stats"]');

    // Knowledge items list
    this.itemsList = page.locator('[data-testid="knowledge-items-list"]');
    this.filterBar = page.locator('[data-testid="memory-filter-bar"]');
    this.searchInput = page.getByPlaceholder('Buscar conhecimentos...');
    this.searchButton = page.getByRole('button', { name: 'Buscar' });
    this.typeFilter = page.locator('[data-testid="filter-type"]');
    this.areaFilter = page.locator('[data-testid="filter-area"]');
    this.sourceFilter = page.locator('[data-testid="filter-source"]');
    this.confidenceFilter = page.locator('[data-testid="filter-confidence"]');
    this.clearFiltersButton = page.getByRole('button', { name: 'Limpar' });

    // Actions
    this.addButton = page.getByRole('button', { name: /Adicionar/ });
    this.exportButton = page.getByRole('button', { name: /Exportar/ });

    // Modals
    this.addModal = page.locator('[role="dialog"]').filter({ hasText: 'Adicionar Conhecimento' });
    this.editModal = page.locator('[role="dialog"]').filter({ hasText: 'Editar Conhecimento' });
    this.deleteDialog = page.locator('[role="alertdialog"]');

    // Empty state
    this.emptyState = page.getByText('Nenhum conhecimento encontrado');
  }

  /**
   * Navigate to the memory page
   */
  async goto() {
    await this.page.goto('/memory');
  }

  /**
   * Get all knowledge item cards
   */
  getAllItems(): Locator {
    return this.page.locator('[data-testid^="knowledge-item-"]');
  }

  /**
   * Get a knowledge item by ID
   */
  getItem(itemId: string): Locator {
    return this.page.getByTestId(`knowledge-item-${itemId}`);
  }

  /**
   * Search for knowledge items
   */
  async search(query: string) {
    await this.searchInput.fill(query);
    await this.searchButton.click();
  }

  /**
   * Clear search
   */
  async clearSearch() {
    await this.searchInput.clear();
    await this.searchButton.click();
  }

  /**
   * Select filter by type
   */
  async filterByType(type: string) {
    await this.page.getByRole('combobox').filter({ hasText: /Todos os tipos/ }).click();
    await this.page.getByRole('option', { name: type }).click();
  }

  /**
   * Select filter by area
   */
  async filterByArea(area: string) {
    await this.page.getByRole('combobox').filter({ hasText: /Todas as áreas/ }).click();
    await this.page.getByRole('option', { name: area }).click();
  }

  /**
   * Open add item modal
   */
  async openAddModal() {
    await this.addButton.click();
  }

  /**
   * Fill and submit the add item form
   */
  async addItem(data: {
    type: string;
    area?: string;
    title?: string;
    content: string;
    tags?: string;
  }) {
    await this.openAddModal();

    // Select type
    await this.addModal.getByRole('combobox').first().click();
    await this.page.getByRole('option', { name: data.type }).click();

    // Select area if provided
    if (data.area) {
      await this.addModal.getByRole('combobox').nth(1).click();
      await this.page.getByRole('option', { name: data.area }).click();
    }

    // Fill title if provided
    if (data.title) {
      await this.addModal.getByLabel('Título').fill(data.title);
    }

    // Fill content
    await this.addModal.getByLabel('Conteúdo').fill(data.content);

    // Fill tags if provided
    if (data.tags) {
      await this.addModal.getByLabel('Tags').fill(data.tags);
    }

    // Submit
    await this.addModal.getByRole('button', { name: 'Adicionar' }).click();
  }

  /**
   * Open context menu for an item
   */
  async openItemMenu(itemLocator: Locator) {
    await itemLocator.hover();
    await itemLocator.getByRole('button').filter({ has: this.page.locator('svg') }).click();
  }

  /**
   * Edit an item
   */
  async editItem(itemLocator: Locator, data: { title?: string; content?: string; tags?: string }) {
    await this.openItemMenu(itemLocator);
    await this.page.getByRole('menuitem', { name: 'Editar' }).click();

    if (data.title !== undefined) {
      await this.editModal.getByLabel('Título').fill(data.title);
    }

    if (data.content !== undefined) {
      await this.editModal.getByLabel('Conteúdo').fill(data.content);
    }

    if (data.tags !== undefined) {
      await this.editModal.getByLabel('Tags').fill(data.tags);
    }

    await this.editModal.getByRole('button', { name: 'Salvar' }).click();
  }

  /**
   * Confirm an item (previously "Validate")
   */
  async confirmItem(itemLocator: Locator) {
    await this.openItemMenu(itemLocator);
    await this.page.getByRole('menuitem', { name: 'Confirmar' }).click();
  }

  /**
   * Delete an item
   */
  async deleteItem(itemLocator: Locator) {
    await this.openItemMenu(itemLocator);
    await this.page.getByRole('menuitem', { name: 'Excluir' }).click();
    await this.deleteDialog.getByRole('button', { name: 'Excluir' }).click();
  }

  /**
   * Export memory
   */
  async exportMemory() {
    await this.exportButton.click();
  }

  /**
   * Wait for items to load
   */
  async waitForItemsToLoad() {
    await this.page.waitForLoadState('networkidle');
    // Wait for either items or empty state
    await Promise.race([
      this.getAllItems().first().waitFor({ timeout: 10000 }).catch(() => {}),
      this.emptyState.waitFor({ timeout: 10000 }).catch(() => {}),
    ]);
  }
}
