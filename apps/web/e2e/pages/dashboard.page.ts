import { type Page, type Locator } from '@playwright/test';

/**
 * Page Object for the Dashboard page
 * Provides methods to interact with dashboard elements
 */
export class DashboardPage {
  readonly page: Page;
  readonly header: Locator;
  readonly sidebar: Locator;
  readonly logoutButton: Locator;
  readonly sidebarToggle: Locator;
  readonly themeToggle: Locator;

  constructor(page: Page) {
    this.page = page;
    this.header = page.getByTestId('header');
    this.sidebar = page.getByTestId('sidebar');
    this.logoutButton = page.getByTestId('logout-button');
    this.sidebarToggle = page.getByTestId('sidebar-toggle');
    this.themeToggle = page.getByTestId('theme-toggle');
  }

  /**
   * Navigate to the dashboard page
   */
  async goto() {
    await this.page.goto('/dashboard');
  }

  /**
   * Click logout button
   */
  async logout() {
    await this.logoutButton.click();
  }

  /**
   * Toggle sidebar visibility
   */
  async toggleSidebar() {
    await this.sidebarToggle.click();
  }

  /**
   * Toggle theme
   */
  async toggleTheme() {
    await this.themeToggle.click();
  }

  /**
   * Check if sidebar is visible
   */
  async isSidebarVisible(): Promise<boolean> {
    return await this.sidebar.isVisible();
  }

  /**
   * Check if logout button is visible
   */
  async isLogoutButtonVisible(): Promise<boolean> {
    return await this.logoutButton.isVisible();
  }

  /**
   * Check if we're on the dashboard page
   */
  async isOnDashboard(): Promise<boolean> {
    return this.page.url().includes('/dashboard');
  }

  /**
   * Wait for dashboard to load
   */
  async waitForLoad() {
    await this.header.waitFor({ state: 'visible' });
  }
}
