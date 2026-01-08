import { type Page, type Locator } from '@playwright/test';

/**
 * Page Object for the Reset Password page
 * Provides methods to interact with reset password form elements
 */
export class ResetPasswordPage {
  readonly page: Page;
  readonly passwordInput: Locator;
  readonly confirmPasswordInput: Locator;
  readonly submitButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.passwordInput = page.getByTestId('reset-password');
    this.confirmPasswordInput = page.getByTestId('reset-confirm');
    this.submitButton = page.getByTestId('reset-submit');
  }

  /**
   * Navigate to the reset password page
   */
  async goto() {
    await this.page.goto('/reset-password');
  }

  /**
   * Fill passwords and submit reset
   */
  async resetPassword(password: string, confirmPassword?: string) {
    await this.passwordInput.fill(password);
    await this.confirmPasswordInput.fill(confirmPassword ?? password);
    await this.submitButton.click();
  }

  /**
   * Fill only the password field
   */
  async fillPassword(password: string) {
    await this.passwordInput.fill(password);
  }

  /**
   * Fill only the confirm password field
   */
  async fillConfirmPassword(confirmPassword: string) {
    await this.confirmPasswordInput.fill(confirmPassword);
  }

  /**
   * Click the submit button
   */
  async submit() {
    await this.submitButton.click();
  }

  /**
   * Check if submit button is disabled
   */
  async isSubmitDisabled(): Promise<boolean> {
    return await this.submitButton.isDisabled();
  }
}
