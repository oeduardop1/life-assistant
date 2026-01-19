import { test, expect } from '../fixtures/auth.fixture';
import { ChatPage } from '../pages';

/**
 * E2E Tests for Chat Module
 *
 * These tests verify the complete chat experience including:
 * - Creating conversations
 * - Sending messages
 * - Switching between conversations
 * - Empty states
 *
 * Prerequisites:
 * - Web app running (pnpm --filter web dev)
 * - API running (pnpm --filter api dev)
 * - Supabase CLI running (npx supabase start)
 * - LLM API key configured (for streaming tests)
 *
 * @see docs/milestones/phase-1-counselor.md M1.2 for chat module requirements
 */

// =========================================================================
// Chat Navigation Tests
// =========================================================================
test.describe('Chat Navigation', () => {
  test('should_redirect_unauthenticated_user_to_login', async ({ page }) => {
    // Clear any existing auth state
    await page.context().clearCookies();

    // Try to access chat directly
    await page.goto('/chat');

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/);
  });

  test('should_access_chat_when_authenticated', async ({ loginPage, page }) => {
    // Login first
    await loginPage.goto();
    await loginPage.login('test@example.com', 'testpassword123');

    // Wait for successful login
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });

    // Navigate to chat
    await page.goto('/chat');

    // Should be on chat page
    await expect(page).toHaveURL(/\/chat/);
  });
});

// =========================================================================
// Empty State Tests
// =========================================================================
test.describe('Chat Empty States', () => {
  test('should_show_empty_state_for_new_user', async ({ loginPage, page }) => {
    // Login first
    await loginPage.goto();
    await loginPage.login('test@example.com', 'testpassword123');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });

    // Navigate to chat
    await page.goto('/chat');
    await expect(page).toHaveURL(/\/chat/);

    const chatPage = new ChatPage(page);

    // Should show empty state (either no-conversations or no-selection)
    // Depending on whether user has conversations or not
    const noConversations = chatPage.emptyNoConversations;
    const noSelection = chatPage.emptyNoSelection;

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Check one of the empty states is visible
    const hasNoConversations = await noConversations.isVisible().catch(() => false);
    const hasNoSelection = await noSelection.isVisible().catch(() => false);

    expect(hasNoConversations || hasNoSelection).toBe(true);
  });
});

// =========================================================================
// Conversation Management Tests
// =========================================================================
test.describe('Conversation Management', () => {
  test('should_create_new_conversation', async ({ loginPage, page }) => {
    // Login first
    await loginPage.goto();
    await loginPage.login('test@example.com', 'testpassword123');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });

    // Navigate to chat
    await page.goto('/chat');
    await expect(page).toHaveURL(/\/chat/);

    const chatPage = new ChatPage(page);

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Click new conversation button
    await chatPage.newConversationButton.click();

    // Wait for conversation to be created
    await page.waitForTimeout(1000); // Give time for API call

    // Should now have a conversation selected (message area should be visible)
    // or input should be available
    await expect(chatPage.messageInput).toBeVisible({ timeout: 10000 });
  });

  test('should_show_message_input_when_conversation_selected', async ({ loginPage, page }) => {
    // Login first
    await loginPage.goto();
    await loginPage.login('test@example.com', 'testpassword123');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });

    // Navigate to chat
    await page.goto('/chat');
    await expect(page).toHaveURL(/\/chat/);

    const chatPage = new ChatPage(page);

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Create a new conversation if needed
    const conversations = await chatPage.getAllConversations().count();
    if (conversations === 0) {
      await chatPage.newConversationButton.click();
      await page.waitForTimeout(1000);
    } else {
      // Select the first conversation
      const firstConversation = chatPage.getAllConversations().first();
      await firstConversation.click();
    }

    // Message input should be visible
    await expect(chatPage.messageInput).toBeVisible({ timeout: 10000 });
    await expect(chatPage.sendButton).toBeVisible();
  });

  test('should_switch_between_conversations', async ({ loginPage, page }) => {
    // Login first
    await loginPage.goto();
    await loginPage.login('test@example.com', 'testpassword123');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });

    // Navigate to chat
    await page.goto('/chat');
    await expect(page).toHaveURL(/\/chat/);

    const chatPage = new ChatPage(page);

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Create first conversation
    await chatPage.newConversationButton.click();
    await page.waitForTimeout(1000);

    // Create second conversation
    await chatPage.newConversationButton.click();
    await page.waitForTimeout(1000);

    // Should have at least 2 conversations
    const conversations = await chatPage.getAllConversations().count();
    expect(conversations).toBeGreaterThanOrEqual(2);

    // Click on first conversation
    const firstConversation = chatPage.getAllConversations().first();
    await firstConversation.click();

    // Message input should be visible
    await expect(chatPage.messageInput).toBeVisible();
  });
});

// =========================================================================
// Message Sending Tests
// =========================================================================
test.describe('Message Sending', () => {
  test('should_type_message_in_input', async ({ loginPage, page }) => {
    // Login first
    await loginPage.goto();
    await loginPage.login('test@example.com', 'testpassword123');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });

    // Navigate to chat
    await page.goto('/chat');
    await expect(page).toHaveURL(/\/chat/);

    const chatPage = new ChatPage(page);

    // Wait for page to load and create conversation if needed
    await page.waitForLoadState('networkidle');
    const conversations = await chatPage.getAllConversations().count();
    if (conversations === 0) {
      await chatPage.newConversationButton.click();
      await page.waitForTimeout(1000);
    } else {
      const firstConversation = chatPage.getAllConversations().first();
      await firstConversation.click();
    }

    // Type a message
    await chatPage.typeMessage('Hello, this is a test message');

    // Verify the input has the message
    await expect(chatPage.messageInput).toHaveValue('Hello, this is a test message');
  });

  test('should_enable_send_button_when_message_typed', async ({ loginPage, page }) => {
    // Login first
    await loginPage.goto();
    await loginPage.login('test@example.com', 'testpassword123');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });

    // Navigate to chat
    await page.goto('/chat');
    await expect(page).toHaveURL(/\/chat/);

    const chatPage = new ChatPage(page);

    // Wait for page to load and create conversation if needed
    await page.waitForLoadState('networkidle');
    const conversations = await chatPage.getAllConversations().count();
    if (conversations === 0) {
      await chatPage.newConversationButton.click();
      await page.waitForTimeout(1000);
    } else {
      const firstConversation = chatPage.getAllConversations().first();
      await firstConversation.click();
    }

    // Send button should be disabled initially
    await expect(chatPage.sendButton).toBeDisabled();

    // Type a message
    await chatPage.typeMessage('Hello');

    // Send button should be enabled
    await expect(chatPage.sendButton).toBeEnabled();
  });

  // Note: This test requires a working LLM API
  // It will be skipped if the LLM API is not available
  test.skip('should_send_message_and_receive_streaming_response', async ({ loginPage, page }) => {
    // Login first
    await loginPage.goto();
    await loginPage.login('test@example.com', 'testpassword123');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });

    // Navigate to chat
    await page.goto('/chat');
    await expect(page).toHaveURL(/\/chat/);

    const chatPage = new ChatPage(page);

    // Wait for page to load and create conversation if needed
    await page.waitForLoadState('networkidle');
    const conversations = await chatPage.getAllConversations().count();
    if (conversations === 0) {
      await chatPage.newConversationButton.click();
      await page.waitForTimeout(1000);
    } else {
      const firstConversation = chatPage.getAllConversations().first();
      await firstConversation.click();
    }

    // Send a message
    await chatPage.sendMessage('Hello, how are you?');

    // Wait for streaming to start
    await chatPage.waitForStreamingStart();

    // Wait for streaming to complete
    await chatPage.waitForStreamingComplete();

    // Should have at least 2 messages (user + assistant)
    const messages = await chatPage.getAllMessages().count();
    expect(messages).toBeGreaterThanOrEqual(2);

    // Should have user message
    const userMessages = await chatPage.getUserMessages().count();
    expect(userMessages).toBeGreaterThanOrEqual(1);

    // Should have assistant message
    const assistantMessages = await chatPage.getAssistantMessages().count();
    expect(assistantMessages).toBeGreaterThanOrEqual(1);
  });
});

// =========================================================================
// UI Interaction Tests
// =========================================================================
test.describe('UI Interactions', () => {
  test('should_clear_input_after_sending', async ({ loginPage, page }) => {
    // This test can only verify the UI behavior after clicking send
    // The actual message sending depends on the API

    // Login first
    await loginPage.goto();
    await loginPage.login('test@example.com', 'testpassword123');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });

    // Navigate to chat
    await page.goto('/chat');
    await expect(page).toHaveURL(/\/chat/);

    const chatPage = new ChatPage(page);

    // Wait for page to load and create conversation if needed
    await page.waitForLoadState('networkidle');
    const conversations = await chatPage.getAllConversations().count();
    if (conversations === 0) {
      await chatPage.newConversationButton.click();
      await page.waitForTimeout(1000);
    } else {
      const firstConversation = chatPage.getAllConversations().first();
      await firstConversation.click();
    }

    // Type and send a message
    await chatPage.typeMessage('Test message');
    await chatPage.sendButton.click();

    // Input should be cleared after sending (may take a moment)
    await expect(chatPage.messageInput).toHaveValue('', { timeout: 5000 });
  });
});
