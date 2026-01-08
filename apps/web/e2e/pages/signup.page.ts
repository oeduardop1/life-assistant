import { type Page, type Locator } from '@playwright/test';

/**
 * Page Object for the Signup page
 * Provides methods to interact with signup form elements
 */
export class SignupPage {
  readonly page: Page;
  readonly nameInput: Locator;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly confirmPasswordInput: Locator;
  readonly submitButton: Locator;
  readonly loginLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.nameInput = page.getByTestId('signup-name');
    this.emailInput = page.getByTestId('signup-email');
    this.passwordInput = page.getByTestId('signup-password');
    this.confirmPasswordInput = page.getByTestId('signup-confirm-password');
    this.submitButton = page.getByTestId('signup-submit');
    this.loginLink = page.getByTestId('login-link');
  }

  /**
   * Navigate to the signup page
   */
  async goto() {
    await this.page.goto('/signup');
  }

  /**
   * Fill signup form and submit
   */
  async signup(name: string, email: string, password: string, confirmPassword?: string) {
    await this.nameInput.fill(name);
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.confirmPasswordInput.fill(confirmPassword ?? password);
    await this.submitButton.click();
  }

  /**
   * Fill only the name field
   */
  async fillName(name: string) {
    await this.nameInput.fill(name);
  }

  /**
   * Fill only the email field
   */
  async fillEmail(email: string) {
    await this.emailInput.fill(email);
  }

  /**
   * Fill only the password fields
   */
  async fillPasswords(password: string, confirmPassword?: string) {
    await this.passwordInput.fill(password);
    await this.confirmPasswordInput.fill(confirmPassword ?? password);
  }

  /**
   * Click the submit button
   */
  async submit() {
    await this.submitButton.click();
  }

  /**
   * Navigate to login page
   */
  async goToLogin() {
    await this.loginLink.click();
  }

  /**
   * Check if submit button is disabled
   */
  async isSubmitDisabled(): Promise<boolean> {
    return await this.submitButton.isDisabled();
  }
}
