import { test, expect } from '../fixtures/auth.fixture';

test.describe('Smoke Tests', () => {
  test('should_load_homepage_successfully', async ({ page }) => {
    await page.goto('/');

    // Check title
    await expect(page.getByTestId('landing-title')).toBeVisible();
    await expect(page.getByTestId('landing-title')).toHaveText('Life Assistant AI');

    // Check description
    await expect(page.getByTestId('landing-description')).toBeVisible();

    // Check CTA button
    await expect(page.getByTestId('cta-dashboard')).toBeVisible();
  });

  test('should_toggle_theme_successfully', async ({ page }) => {
    await page.goto('/');

    // Get theme toggle button
    const themeToggle = page.getByTestId('theme-toggle');
    await expect(themeToggle).toBeVisible();

    // Get initial theme
    const html = page.locator('html');
    const initialClass = await html.getAttribute('class');

    // Toggle theme
    await themeToggle.click();

    // Wait for theme to change
    await page.waitForTimeout(300);

    // Check theme changed
    const newClass = await html.getAttribute('class');
    expect(initialClass).not.toBe(newClass);

    // Should have either 'dark' or not have 'dark'
    if (initialClass?.includes('dark')) {
      expect(newClass).not.toContain('dark');
    } else {
      expect(newClass).toContain('dark');
    }
  });

  // Skip mobile-chrome: sidebar behavior is different on mobile (auto-closes on navigation)
  test('should_toggle_sidebar_successfully', async ({ loginPage, page }, testInfo) => {
    // Skip on mobile viewports - sidebar auto-closes on mobile and has different toggle behavior
    if (testInfo.project.name === 'mobile-chrome') {
      test.skip();
    }
    // Login first to access dashboard
    await loginPage.goto();
    await loginPage.login('test@example.com', 'testpassword123');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });

    // Wait for page to load
    await expect(page.getByTestId('dashboard-title')).toBeVisible({ timeout: 5000 });

    // Sidebar should be visible initially
    const sidebar = page.getByTestId('sidebar');
    await expect(sidebar).toBeVisible();

    // On desktop, sidebar starts expanded (sidebarOpen: true by default)
    // We check the sidebar class to verify the toggle effect
    // Initially expanded - should have w-64 class
    await expect(sidebar).toContainClass('w-64');

    // Toggle sidebar to collapse
    const sidebarToggle = page.getByTestId('sidebar-toggle');
    await expect(sidebarToggle).toBeVisible();
    await sidebarToggle.click();

    // Wait for animation
    await page.waitForTimeout(300);

    // Sidebar should be collapsed (md:w-16 class, no w-64)
    await expect(sidebar).toContainClass('md:w-16');

    // Toggle again to expand
    await sidebarToggle.click();
    await page.waitForTimeout(300);

    // Sidebar should be expanded again (w-64 class)
    await expect(sidebar).toContainClass('w-64');
  });
});
