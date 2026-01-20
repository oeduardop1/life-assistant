import { test, expect } from '../fixtures/auth.fixture';
import { MemoryPage } from '../pages';

/**
 * E2E Tests for Memory Module
 *
 * These tests verify the memory view experience including:
 * - Viewing memory overview
 * - Filtering knowledge items
 * - CRUD operations on knowledge items
 * - Export functionality
 *
 * Prerequisites:
 * - Web app running (pnpm --filter web dev)
 * - API running (pnpm --filter api dev)
 * - Supabase CLI running (npx supabase start)
 *
 * @see docs/milestones/phase-1-counselor.md M1.6 for Memory View requirements
 */

// =========================================================================
// Memory Navigation Tests
// =========================================================================
test.describe('Memory Navigation', () => {
  test('should_redirect_unauthenticated_user_to_login', async ({ page }) => {
    // Clear any existing auth state
    await page.context().clearCookies();

    // Try to access memory directly
    await page.goto('/memory');

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/);
  });

  test('should_access_memory_when_authenticated', async ({ loginPage, page }) => {
    // Login first
    await loginPage.goto();
    await loginPage.login('test@example.com', 'testpassword123');

    // Wait for successful login
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });

    // Navigate to memory
    await page.goto('/memory');

    // Should be on memory page
    await expect(page).toHaveURL(/\/memory/);
  });

  test('should_navigate_to_memory_from_sidebar', async ({ loginPage, page }) => {
    // Login first
    await loginPage.goto();
    await loginPage.login('test@example.com', 'testpassword123');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });

    // Click memory link in sidebar
    await page.getByTestId('sidebar-link-memória').click();

    // Should be on memory page
    await expect(page).toHaveURL(/\/memory/);
  });
});

// =========================================================================
// Memory Page Load Tests
// =========================================================================
test.describe('Memory Page Load', () => {
  test('should_load_memory_page_with_overview', async ({ loginPage, page }) => {
    // Login first
    await loginPage.goto();
    await loginPage.login('test@example.com', 'testpassword123');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });

    // Navigate to memory
    const memoryPage = new MemoryPage(page);
    await memoryPage.goto();

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Page should have the main elements
    // Use first() since 'Conhecimentos' appears in both sidebar and page title
    await expect(page.getByText('Conhecimentos').first()).toBeVisible();
    await expect(memoryPage.addButton).toBeVisible();
    await expect(memoryPage.exportButton).toBeVisible();
  });

  test('should_show_filter_bar', async ({ loginPage, page }) => {
    // Login first
    await loginPage.goto();
    await loginPage.login('test@example.com', 'testpassword123');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });

    // Navigate to memory
    const memoryPage = new MemoryPage(page);
    await memoryPage.goto();

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Should show search input (auto-search with debounce, no button)
    await expect(memoryPage.searchInput).toBeVisible();
  });
});

// =========================================================================
// Filter Tests
// =========================================================================
test.describe('Knowledge Items Filtering', () => {
  test('should_search_items', async ({ loginPage, page }) => {
    // Login first
    await loginPage.goto();
    await loginPage.login('test@example.com', 'testpassword123');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });

    // Navigate to memory
    const memoryPage = new MemoryPage(page);
    await memoryPage.goto();
    await memoryPage.waitForItemsToLoad();

    // Search for something
    await memoryPage.search('test query');

    // Wait for search to complete
    await page.waitForLoadState('networkidle');

    // Verify search was executed (URL should have search param or results changed)
    // The actual results depend on the data
    await expect(memoryPage.searchInput).toHaveValue('test query');
  });

  test('should_clear_filters', async ({ loginPage, page }) => {
    // Login first
    await loginPage.goto();
    await loginPage.login('test@example.com', 'testpassword123');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });

    // Navigate to memory
    const memoryPage = new MemoryPage(page);
    await memoryPage.goto();
    await memoryPage.waitForItemsToLoad();

    // Apply a search
    await memoryPage.search('test');

    // Clear should be visible now
    await expect(memoryPage.clearFiltersButton).toBeVisible();

    // Click clear
    await memoryPage.clearFiltersButton.click();

    // Search input should be cleared
    await expect(memoryPage.searchInput).toHaveValue('');
  });
});

// =========================================================================
// Add Item Tests
// =========================================================================
test.describe('Add Knowledge Item', () => {
  test('should_open_add_modal', async ({ loginPage, page }) => {
    // Login first
    await loginPage.goto();
    await loginPage.login('test@example.com', 'testpassword123');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });

    // Navigate to memory
    const memoryPage = new MemoryPage(page);
    await memoryPage.goto();
    await memoryPage.waitForItemsToLoad();

    // Click add button
    await memoryPage.openAddModal();

    // Modal should be visible
    await expect(memoryPage.addModal).toBeVisible();
    await expect(memoryPage.addModal.getByText('Adicionar Conhecimento')).toBeVisible();
  });

  test('should_close_add_modal_on_cancel', async ({ loginPage, page }) => {
    // Login first
    await loginPage.goto();
    await loginPage.login('test@example.com', 'testpassword123');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });

    // Navigate to memory
    const memoryPage = new MemoryPage(page);
    await memoryPage.goto();
    await memoryPage.waitForItemsToLoad();

    // Open and close modal
    await memoryPage.openAddModal();
    await expect(memoryPage.addModal).toBeVisible();

    await memoryPage.addModal.getByRole('button', { name: 'Cancelar' }).click();
    await expect(memoryPage.addModal).not.toBeVisible();
  });

  test('should_require_content_field', async ({ loginPage, page }) => {
    // Login first
    await loginPage.goto();
    await loginPage.login('test@example.com', 'testpassword123');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });

    // Navigate to memory
    const memoryPage = new MemoryPage(page);
    await memoryPage.goto();
    await memoryPage.waitForItemsToLoad();

    // Open modal and try to submit without content
    await memoryPage.openAddModal();
    await memoryPage.addModal.getByRole('button', { name: 'Adicionar' }).click();

    // Should show validation error
    await expect(memoryPage.addModal.getByText('Conteúdo é obrigatório')).toBeVisible();
  });

  // This test creates actual data - skipped by default
  test.skip('should_create_item_successfully', async ({ loginPage, page }) => {
    // Login first
    await loginPage.goto();
    await loginPage.login('test@example.com', 'testpassword123');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });

    // Navigate to memory
    const memoryPage = new MemoryPage(page);
    await memoryPage.goto();
    await memoryPage.waitForItemsToLoad();

    // Add a new item
    await memoryPage.addItem({
      type: 'Fato',
      area: 'Saúde',
      title: 'Test Fact',
      content: 'This is a test fact created by E2E test',
      tags: 'test, e2e',
    });

    // Wait for toast
    await expect(page.getByText('Conhecimento adicionado')).toBeVisible({ timeout: 5000 });

    // Modal should close
    await expect(memoryPage.addModal).not.toBeVisible();
  });
});

// =========================================================================
// Export Tests
// =========================================================================
test.describe('Export Memory', () => {
  test('should_have_export_button', async ({ loginPage, page }) => {
    // Login first
    await loginPage.goto();
    await loginPage.login('test@example.com', 'testpassword123');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });

    // Navigate to memory
    const memoryPage = new MemoryPage(page);
    await memoryPage.goto();
    await memoryPage.waitForItemsToLoad();

    // Export button should be visible
    await expect(memoryPage.exportButton).toBeVisible();
    await expect(memoryPage.exportButton).toBeEnabled();
  });
});

// =========================================================================
// UI Interaction Tests
// =========================================================================
test.describe('UI Interactions', () => {
  test('should_show_empty_state_when_no_results', async ({ loginPage, page }) => {
    // Login first
    await loginPage.goto();
    await loginPage.login('test@example.com', 'testpassword123');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });

    // Navigate to memory
    const memoryPage = new MemoryPage(page);
    await memoryPage.goto();
    await memoryPage.waitForItemsToLoad();

    // Search for something that definitely won't exist
    await memoryPage.search('xyznonexistentquery123456789');
    await page.waitForLoadState('networkidle');

    // Should show empty state
    await expect(memoryPage.emptyState).toBeVisible({ timeout: 5000 });
  });
});
