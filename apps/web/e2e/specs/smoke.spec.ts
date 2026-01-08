import { test, expect } from '@playwright/test';

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

  test('should_toggle_sidebar_successfully', async ({ page }) => {
    await page.goto('/dashboard');

    // Wait for page to load
    await expect(page.getByTestId('dashboard-title')).toBeVisible();

    // Sidebar should be visible initially
    const sidebar = page.getByTestId('sidebar');
    await expect(sidebar).toBeVisible();

    // Toggle sidebar
    const sidebarToggle = page.getByTestId('sidebar-toggle');
    await expect(sidebarToggle).toBeVisible();
    await sidebarToggle.click();

    // Wait for animation
    await page.waitForTimeout(300);

    // Sidebar should be hidden
    await expect(sidebar).not.toBeVisible();

    // Toggle again
    await sidebarToggle.click();
    await page.waitForTimeout(300);

    // Sidebar should be visible again
    await expect(sidebar).toBeVisible();
  });
});
