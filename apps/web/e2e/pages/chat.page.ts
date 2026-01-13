import type { Page, Locator } from '@playwright/test';

/**
 * Page Object for Chat page
 *
 * Provides methods to interact with the chat interface
 */
export class ChatPage {
  readonly page: Page;

  // Conversation list
  readonly newConversationButton: Locator;

  // Message area
  readonly messageArea: Locator;
  readonly messageInput: Locator;
  readonly sendButton: Locator;
  readonly streamingMessage: Locator;

  // Empty states
  readonly emptyNoConversations: Locator;
  readonly emptyNoSelection: Locator;
  readonly startConversationButton: Locator;

  constructor(page: Page) {
    this.page = page;

    // Conversation list
    this.newConversationButton = page.getByTestId('chat-new-conversation');

    // Message area
    this.messageArea = page.getByTestId('chat-message-area');
    this.messageInput = page.getByTestId('chat-message-input');
    this.sendButton = page.getByTestId('chat-send-button');
    this.streamingMessage = page.getByTestId('chat-streaming-message');

    // Empty states
    this.emptyNoConversations = page.getByTestId('chat-empty-no-conversations');
    this.emptyNoSelection = page.getByTestId('chat-empty-no-selection');
    this.startConversationButton = page.getByTestId('chat-start-conversation');
  }

  /**
   * Navigate to the chat page
   */
  async goto() {
    await this.page.goto('/chat');
  }

  /**
   * Create a new conversation
   */
  async createConversation() {
    await this.newConversationButton.click();
  }

  /**
   * Select a conversation by its ID
   */
  async selectConversation(conversationId: string) {
    await this.page.getByTestId(`chat-conversation-${conversationId}`).click();
  }

  /**
   * Get a conversation element by ID
   */
  getConversation(conversationId: string): Locator {
    return this.page.getByTestId(`chat-conversation-${conversationId}`);
  }

  /**
   * Get all conversation elements
   */
  getAllConversations(): Locator {
    return this.page.locator('[data-testid^="chat-conversation-"]');
  }

  /**
   * Type a message in the input field
   */
  async typeMessage(message: string) {
    await this.messageInput.fill(message);
  }

  /**
   * Send a message (type and click send)
   */
  async sendMessage(message: string) {
    await this.typeMessage(message);
    await this.sendButton.click();
  }

  /**
   * Get a message element by ID
   */
  getMessage(messageId: string): Locator {
    return this.page.getByTestId(`chat-message-${messageId}`);
  }

  /**
   * Get all message elements
   */
  getAllMessages(): Locator {
    return this.page.locator('[data-testid^="chat-message-"]');
  }

  /**
   * Get user messages only
   */
  getUserMessages(): Locator {
    return this.page.locator('[data-testid^="chat-message-"][data-role="user"]');
  }

  /**
   * Get assistant messages only
   */
  getAssistantMessages(): Locator {
    return this.page.locator('[data-testid^="chat-message-"][data-role="assistant"]');
  }

  /**
   * Wait for streaming to start
   */
  async waitForStreamingStart() {
    await this.streamingMessage.waitFor({ state: 'visible', timeout: 30000 });
  }

  /**
   * Wait for streaming to complete
   */
  async waitForStreamingComplete() {
    await this.streamingMessage.waitFor({ state: 'hidden', timeout: 60000 });
  }

  /**
   * Check if currently streaming
   */
  async isStreaming(): Promise<boolean> {
    return this.streamingMessage.isVisible();
  }
}
