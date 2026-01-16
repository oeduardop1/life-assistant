import { type Page, type Locator } from '@playwright/test';

/**
 * Page Object for the Onboarding pages
 * Provides methods to interact with the 4-step onboarding wizard
 *
 * @see docs/specs/system.md §3.1 for onboarding flow requirements
 */
export class OnboardingPage {
  readonly page: Page;

  // Stepper elements
  readonly stepper: Locator;

  // Profile step elements
  readonly nameInput: Locator;
  readonly timezoneSelect: Locator;

  // Areas step elements
  readonly areaCards: Locator;

  // Common buttons
  readonly continueButton: Locator;
  readonly skipButton: Locator;

  constructor(page: Page) {
    this.page = page;

    // Stepper
    this.stepper = page.locator('nav[aria-label="Progresso do onboarding"]');

    // Profile step
    this.nameInput = page.locator('input[name="name"]');
    this.timezoneSelect = page.locator('.react-timezone-select');

    // Areas step - cards are buttons
    this.areaCards = page.locator('[class*="rounded-lg"][class*="border-2"]').filter({ hasText: /.+/ });

    // Common buttons
    this.continueButton = page.getByRole('button', { name: /continuar|comecar|proximo/i });
    this.skipButton = page.getByRole('button', { name: /pular|configurar depois/i });
  }

  /**
   * Navigate to onboarding start
   */
  async goto() {
    await this.page.goto('/onboarding');
  }

  /**
   * Navigate to a specific step
   */
  async gotoStep(step: 'profile' | 'areas' | 'telegram' | 'tutorial') {
    await this.page.goto(`/onboarding/${step}`);
  }

  /**
   * Fill profile step (step 1)
   */
  async fillProfile(name: string, timezone?: string) {
    await this.nameInput.fill(name);

    if (timezone) {
      await this.timezoneSelect.click();
      await this.page.getByText(timezone, { exact: false }).first().click();
    }
  }

  /**
   * Submit current step
   */
  async submitStep() {
    await this.continueButton.click();
  }

  /**
   * Skip current optional step
   */
  async skipCurrentStep() {
    await this.skipButton.click();
  }

  /**
   * Select life areas (step 2)
   * @param areaLabels Array of area labels to select (e.g., ['Saúde', 'Finanças', 'Carreira'])
   */
  async selectAreas(areaLabels: string[]) {
    for (const label of areaLabels) {
      // Use a more specific locator to find the exact label text within the button
      // The label is in a span with font-medium class
      const areaCard = this.page.locator('button').filter({
        has: this.page.locator('span.font-medium', { hasText: new RegExp(`^${label}$`) }),
      });
      await areaCard.click();
    }
  }

  /**
   * Get the count of selected areas
   */
  async getSelectedAreasCount(): Promise<number> {
    const selectedCards = this.page.locator('[class*="border-primary"][class*="bg-primary"]');
    return await selectedCards.count();
  }

  /**
   * Check if stepper shows step as completed
   */
  async isStepCompleted(stepIndex: number): Promise<boolean> {
    const steps = this.stepper.locator('li');
    const step = steps.nth(stepIndex);
    // Check if the step has a checkmark icon (completed state)
    const checkIcon = step.locator('svg');
    return (await checkIcon.getAttribute('class'))?.includes('text-primary-foreground') ?? false;
  }

  /**
   * Get current step from URL
   */
  getCurrentStep(): string {
    const url = this.page.url();
    const match = url.match(/\/onboarding\/(\w+)/);
    return match ? match[1] : 'profile';
  }

  /**
   * Wait for redirect to dashboard
   */
  async waitForDashboard(timeout = 10000) {
    await this.page.waitForURL('**/dashboard', { timeout });
  }

  /**
   * Complete the tutorial carousel
   */
  async completeTutorial() {
    // Navigate through all slides
    const nextButton = this.page.getByRole('button', { name: /proximo/i });
    const finishButton = this.page.getByRole('button', { name: /comecar a usar/i });

    // Click through slides until we reach the last one
    while (await nextButton.isVisible()) {
      await nextButton.click();
      await this.page.waitForTimeout(100);
    }

    // Click finish button
    if (await finishButton.isVisible()) {
      await finishButton.click();
    }
  }

  /**
   * Check if validation error is displayed
   */
  async hasValidationError(): Promise<boolean> {
    const errorMessage = this.page.locator('[class*="text-destructive"]');
    return await errorMessage.isVisible();
  }

  /**
   * Get validation error message
   */
  async getValidationErrorMessage(): Promise<string | null> {
    const errorMessage = this.page.locator('[class*="text-destructive"]');
    if (await errorMessage.isVisible()) {
      return await errorMessage.textContent();
    }
    return null;
  }
}
