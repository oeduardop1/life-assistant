import { type Page, type Locator } from '@playwright/test';

/**
 * Page Object for the Forgot Password page
 * Provides methods to interact with forgot password form elements
 */
export class ForgotPasswordPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly submitButton: Locator;
  readonly backToLoginLink: Locator;
  readonly successCard: Locator;
  readonly successBackToLoginButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.getByTestId('forgot-email');
    this.submitButton = page.getByTestId('forgot-submit');
    this.backToLoginLink = page.getByTestId('forgot-back-to-login');
    this.successCard = page.getByTestId('forgot-success');
    this.successBackToLoginButton = page.getByTestId('back-to-login');
  }

  /**
   * Navigate to the forgot password page
   */
  async goto() {
    await this.page.goto('/forgot-password');
  }

  /**
   * Fill email and submit forgot password request
   */
  async requestPasswordReset(email: string) {
    await this.emailInput.fill(email);
    await this.submitButton.click();
  }

  /**
   * Fill only the email field
   */
  async fillEmail(email: string) {
    await this.emailInput.fill(email);
  }

  /**
   * Click the submit button
   */
  async submit() {
    await this.submitButton.click();
  }

  /**
   * Navigate back to login from the form
   */
  async goBackToLogin() {
    await this.backToLoginLink.click();
  }

  /**
   * Navigate back to login from success screen
   */
  async goBackToLoginFromSuccess() {
    await this.successBackToLoginButton.click();
  }

  /**
   * Check if success message is displayed
   */
  async isSuccessDisplayed(): Promise<boolean> {
    return await this.successCard.isVisible();
  }

  /**
   * Check if submit button is disabled
   */
  async isSubmitDisabled(): Promise<boolean> {
    return await this.submitButton.isDisabled();
  }
}
