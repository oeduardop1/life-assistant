/* eslint-disable react-hooks/rules-of-hooks */
// Note: This file uses Playwright's fixture pattern with 'use' callback,
// which is not a React hook despite the similar naming convention.

import { test as base, type Page } from '@playwright/test';
import {
  LoginPage,
  SignupPage,
  ForgotPasswordPage,
  ResetPasswordPage,
  DashboardPage,
  OnboardingPage,
} from '../pages';

/**
 * Onboarding test user credentials
 * Must match the values in global-setup.ts
 */
export const ONBOARDING_USER = {
  email: 'onboarding@example.com',
  password: 'testpassword123',
};

/**
 * Custom fixtures for authentication testing
 */
type AuthFixtures = {
  loginPage: LoginPage;
  signupPage: SignupPage;
  forgotPasswordPage: ForgotPasswordPage;
  resetPasswordPage: ResetPasswordPage;
  dashboardPage: DashboardPage;
  onboardingPage: OnboardingPage;
  authenticatedPage: Page;
  // Onboarding user fixtures (user with pending onboarding)
  onboardingUserPage: Page;
  onboardingUserLoginPage: LoginPage;
};

/**
 * Extended test with auth fixtures
 */
export const test = base.extend<AuthFixtures>({
  /**
   * Login page object fixture
   */
  loginPage: async ({ page }, use) => {
    const loginPage = new LoginPage(page);
    await use(loginPage);
  },

  /**
   * Signup page object fixture
   */
  signupPage: async ({ page }, use) => {
    const signupPage = new SignupPage(page);
    await use(signupPage);
  },

  /**
   * Forgot password page object fixture
   */
  forgotPasswordPage: async ({ page }, use) => {
    const forgotPasswordPage = new ForgotPasswordPage(page);
    await use(forgotPasswordPage);
  },

  /**
   * Reset password page object fixture
   */
  resetPasswordPage: async ({ page }, use) => {
    const resetPasswordPage = new ResetPasswordPage(page);
    await use(resetPasswordPage);
  },

  /**
   * Dashboard page object fixture
   */
  dashboardPage: async ({ page }, use) => {
    const dashboardPage = new DashboardPage(page);
    await use(dashboardPage);
  },

  /**
   * Onboarding page object fixture
   */
  onboardingPage: async ({ page }, use) => {
    const onboardingPage = new OnboardingPage(page);
    await use(onboardingPage);
  },

  /**
   * Authenticated page fixture
   * Uses saved storage state for authentication
   * Falls back to fresh page if auth state doesn't exist
   */
  authenticatedPage: async ({ browser }, use) => {
    const fs = await import('fs');
    const authStatePath = 'e2e/.auth/user.json';

    let context;
    if (fs.existsSync(authStatePath)) {
      // Use saved auth state
      context = await browser.newContext({
        storageState: authStatePath,
      });
    } else {
      // Create new context without auth state
      context = await browser.newContext();
    }

    const page = await context.newPage();
    await use(page);
    await context.close();
  },

  /**
   * Onboarding user page fixture
   * Uses saved storage state for the onboarding user (pending onboarding)
   * Falls back to fresh page if auth state doesn't exist
   */
  onboardingUserPage: async ({ browser }, use) => {
    const fs = await import('fs');
    const authStatePath = 'e2e/.auth/onboarding-user.json';

    let context;
    if (fs.existsSync(authStatePath)) {
      // Use saved auth state
      context = await browser.newContext({
        storageState: authStatePath,
      });
    } else {
      // Create new context without auth state
      context = await browser.newContext();
    }

    const page = await context.newPage();
    await use(page);
    await context.close();
  },

  /**
   * Login page fixture for onboarding user
   * Creates a fresh page for the onboarding user to login
   */
  onboardingUserLoginPage: async ({ page }, use) => {
    const loginPage = new LoginPage(page);
    await use(loginPage);
  },
});

export { expect } from '@playwright/test';
