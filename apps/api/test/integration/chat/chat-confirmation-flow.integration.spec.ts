/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import 'reflect-metadata';
import { describe, it, expect, beforeAll, afterAll, vi, beforeEach } from 'vitest';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  createParamDecorator,
  SetMetadata,
  NotFoundException,
} from '@nestjs/common';
import type { INestApplication, ExecutionContext } from '@nestjs/common';
import { APP_GUARD, Reflector } from '@nestjs/core';
import request from 'supertest';
import { SignJWT, jwtVerify } from 'jose';
import type { Request } from 'express';
import { UnauthorizedException } from '@nestjs/common';
import type { ToolCall } from '@life-assistant/ai';

const jwtSecret = 'super-secret-jwt-token-with-at-least-32-characters-for-testing';

// Create inline decorators
const IS_PUBLIC_KEY = 'isPublic';
const _Public = () => SetMetadata(IS_PUBLIC_KEY, true);

const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<Request>();
    const user = (request as Request & { user?: { id: string } }).user;
    return data ? user?.[data as keyof typeof user] : user;
  },
);

// =============================================================================
// In-Memory Mock Stores
// =============================================================================

// Mock Redis store for confirmations
const confirmationStore = new Map<string, StoredConfirmation>();

// Mock database store for messages
const messageStore: MockMessage[] = [];

// Mock database store for conversations
const conversationStore: MockConversation[] = [
  {
    id: 'conv-test-1',
    userId: 'user-123',
    type: 'general',
    title: 'Test Conversation',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

// Mock tracking entries store
const trackingStore: MockTrackingEntry[] = [];

// =============================================================================
// Interfaces
// =============================================================================

interface StoredConfirmation {
  confirmationId: string;
  conversationId: string;
  userId: string;
  toolCall: ToolCall;
  toolName: string;
  message: string;
  iteration: number;
  createdAt: string;
  expiresAt: string;
}

interface MockMessage {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

interface MockConversation {
  id: string;
  userId: string;
  type: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

interface MockTrackingEntry {
  id: string;
  userId: string;
  type: string;
  value: string;
  unit: string;
  entryDate: string;
  source: string;
  createdAt: string;
}

// =============================================================================
// Mock LLM behavior - configured per test
// =============================================================================

let mockLLMConfig: {
  shouldAskForConfirmation: boolean;
  toolCall: ToolCall | null;
  responseContent: string;
} = {
  shouldAskForConfirmation: false,
  toolCall: null,
  responseContent: 'OK, I will help you with that.',
};

function resetMockLLM() {
  mockLLMConfig = {
    shouldAskForConfirmation: false,
    toolCall: null,
    responseContent: 'OK, I will help you with that.',
  };
}

function setLLMToAskForConfirmation(toolCall: ToolCall, message: string) {
  mockLLMConfig.shouldAskForConfirmation = true;
  mockLLMConfig.toolCall = toolCall;
  mockLLMConfig.responseContent = message;
}

// =============================================================================
// Helper functions for confirmation
// =============================================================================

function generateConfirmationId(): string {
  return `conf_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

function storeConfirmation(
  userId: string,
  conversationId: string,
  toolCall: ToolCall,
  message: string
): StoredConfirmation {
  const confirmationId = generateConfirmationId();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 5 * 60 * 1000); // 5 minutes TTL

  const confirmation: StoredConfirmation = {
    confirmationId,
    conversationId,
    userId,
    toolCall,
    toolName: toolCall.name,
    message,
    iteration: 1,
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
  };

  const key = `${conversationId}:${confirmationId}`;
  confirmationStore.set(key, confirmation);

  return confirmation;
}

function getConfirmation(conversationId: string, confirmationId: string): StoredConfirmation | null {
  const key = `${conversationId}:${confirmationId}`;
  return confirmationStore.get(key) ?? null;
}

function deleteConfirmation(conversationId: string, confirmationId: string): boolean {
  const key = `${conversationId}:${confirmationId}`;
  return confirmationStore.delete(key);
}

function getLatestConfirmation(conversationId: string): StoredConfirmation | null {
  const confirmations: StoredConfirmation[] = [];
  confirmationStore.forEach((conf, key) => {
    if (key.startsWith(`${conversationId}:`)) {
      confirmations.push(conf);
    }
  });

  if (confirmations.length === 0) return null;

  confirmations.sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return confirmations[0] ?? null;
}

// =============================================================================
// Test Controllers - Simulates the real chat/tracking flow
// =============================================================================

@Controller('chat')
class TestChatController {
  /**
   * Send a message - simulates LLM processing synchronously
   * In real app, this triggers async SSE stream. For testing, we process synchronously.
   */
  @Post('conversations/:id/messages')
  @HttpCode(HttpStatus.CREATED)
  sendMessage(
    @CurrentUser('id') userId: string,
    @Param('id') conversationId: string,
    @Body() body: { content: string }
  ) {
    // Verify conversation exists and belongs to user
    const conversation = conversationStore.find(
      c => c.id === conversationId && c.userId === userId
    );
    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    // Save user message
    const userMessage: MockMessage = {
      id: `msg-${Date.now()}`,
      conversationId,
      role: 'user',
      content: body.content,
      createdAt: new Date().toISOString(),
    };
    messageStore.push(userMessage);

    // Simulate LLM processing (synchronous for testing)
    if (mockLLMConfig.shouldAskForConfirmation && mockLLMConfig.toolCall) {
      // Store confirmation
      const confirmation = storeConfirmation(
        userId,
        conversationId,
        mockLLMConfig.toolCall,
        mockLLMConfig.responseContent
      );

      // Save assistant message asking for confirmation
      messageStore.push({
        id: `msg-${Date.now() + 1}`,
        conversationId,
        role: 'assistant',
        content: mockLLMConfig.responseContent,
        metadata: {
          pendingConfirmation: {
            confirmationId: confirmation.confirmationId,
            toolName: mockLLMConfig.toolCall.name,
            toolArgs: mockLLMConfig.toolCall.arguments,
          },
        },
        createdAt: new Date().toISOString(),
      });

      return {
        userMessage,
        assistantMessage: {
          content: mockLLMConfig.responseContent,
          awaitingConfirmation: true,
          confirmationId: confirmation.confirmationId,
        },
      };
    }

    // Normal response (no confirmation needed)
    messageStore.push({
      id: `msg-${Date.now() + 1}`,
      conversationId,
      role: 'assistant',
      content: mockLLMConfig.responseContent,
      createdAt: new Date().toISOString(),
    });

    return {
      userMessage,
      assistantMessage: {
        content: mockLLMConfig.responseContent,
        awaitingConfirmation: false,
      },
    };
  }

  /**
   * Get pending confirmation for conversation
   */
  @Get('conversations/:id/confirmation')
  getPendingConfirmation(
    @CurrentUser('id') userId: string,
    @Param('id') conversationId: string
  ) {
    // Verify conversation belongs to user
    const conversation = conversationStore.find(
      c => c.id === conversationId && c.userId === userId
    );
    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    const confirmation = getLatestConfirmation(conversationId);

    if (!confirmation) {
      return { pending: false };
    }

    return {
      pending: true,
      confirmationId: confirmation.confirmationId,
      toolName: confirmation.toolName,
      message: confirmation.message,
      expiresAt: confirmation.expiresAt,
    };
  }

  /**
   * Confirm tool execution
   */
  @Post('conversations/:id/confirm')
  @HttpCode(HttpStatus.OK)
  confirmToolExecution(
    @CurrentUser('id') userId: string,
    @Param('id') conversationId: string,
    @Body() body: { confirmationId: string }
  ) {
    // Verify conversation belongs to user
    const conversation = conversationStore.find(
      c => c.id === conversationId && c.userId === userId
    );
    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    const confirmation = getConfirmation(conversationId, body.confirmationId);

    if (!confirmation) {
      return {
        success: false,
        message: 'A confirmação expirou ou não foi encontrada.',
      };
    }

    // Verify the confirmation belongs to the correct user
    if (confirmation.userId !== userId) {
      return {
        success: false,
        message: 'A confirmação expirou ou não foi encontrada.',
      };
    }

    // Execute the tool (record metric)
    const toolCall = confirmation.toolCall;
    if (toolCall.name === 'record_metric') {
      const args = toolCall.arguments as {
        type: string;
        value: number;
        unit?: string;
        date?: string;
      };

      // Record the metric
      const entry: MockTrackingEntry = {
        id: `entry-${Date.now()}`,
        userId,
        type: args.type,
        value: String(args.value),
        unit: args.unit ?? 'kg',
        entryDate: args.date ?? new Date().toISOString().split('T')[0],
        source: 'chat',
        createdAt: new Date().toISOString(),
      };
      trackingStore.push(entry);

      // Delete confirmation
      deleteConfirmation(conversationId, body.confirmationId);

      // Save success message
      const successMessage = `Registrado com sucesso! ${args.type}: ${args.value} ${args.unit ?? ''}`;
      messageStore.push({
        id: `msg-${Date.now()}`,
        conversationId,
        role: 'assistant',
        content: successMessage,
        metadata: {
          toolExecution: {
            toolName: toolCall.name,
            success: true,
          },
        },
        createdAt: new Date().toISOString(),
      });

      return {
        success: true,
        message: successMessage,
        entry,
      };
    }

    return {
      success: false,
      message: 'Unknown tool',
    };
  }

  /**
   * Reject tool execution
   */
  @Post('conversations/:id/reject')
  @HttpCode(HttpStatus.OK)
  rejectToolExecution(
    @CurrentUser('id') userId: string,
    @Param('id') conversationId: string,
    @Body() body: { confirmationId: string; reason?: string }
  ) {
    // Verify conversation belongs to user
    const conversation = conversationStore.find(
      c => c.id === conversationId && c.userId === userId
    );
    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    const confirmation = getConfirmation(conversationId, body.confirmationId);

    if (!confirmation) {
      return {
        success: false,
        message: 'A confirmação expirou ou não foi encontrada.',
      };
    }

    // Verify the confirmation belongs to the correct user
    if (confirmation.userId !== userId) {
      return {
        success: false,
        message: 'A confirmação expirou ou não foi encontrada.',
      };
    }

    // Delete confirmation without executing
    deleteConfirmation(conversationId, body.confirmationId);

    // Save rejection message
    const rejectionMessage = body.reason
      ? `Entendi, não vou registrar. ${body.reason}`
      : 'Tudo bem, não vou registrar essa informação.';

    messageStore.push({
      id: `msg-${Date.now()}`,
      conversationId,
      role: 'assistant',
      content: rejectionMessage,
      metadata: {
        rejectedConfirmation: {
          confirmationId: body.confirmationId,
          reason: body.reason,
        },
      },
      createdAt: new Date().toISOString(),
    });

    return {
      success: true,
      message: rejectionMessage,
    };
  }

  /**
   * Get messages for a conversation
   */
  @Get('conversations/:id/messages')
  getMessages(
    @CurrentUser('id') userId: string,
    @Param('id') conversationId: string
  ) {
    const conversation = conversationStore.find(
      c => c.id === conversationId && c.userId === userId
    );
    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    const messages = messageStore.filter(m => m.conversationId === conversationId);

    return {
      messages,
      total: messages.length,
    };
  }
}

@Controller('tracking')
class TestTrackingController {
  @Get()
  listEntries(@CurrentUser('id') userId: string) {
    const entries = trackingStore.filter(e => e.userId === userId);
    return { entries, total: entries.length };
  }
}

// =============================================================================
// Auth Guard
// =============================================================================

const createTestAuthGuard = (reflector: Reflector) => {
  const secretKey = new TextEncoder().encode(jwtSecret);

  return {
    canActivate: async (context: ExecutionContext): Promise<boolean> => {
      const isPublic = reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);

      if (isPublic) return true;

      const request = context.switchToHttp().getRequest<Request>();
      const authHeader = request.headers.authorization;

      if (!authHeader?.startsWith('Bearer ')) {
        throw new UnauthorizedException('Missing authorization token');
      }

      const token = authHeader.slice(7);

      try {
        const { payload } = await jwtVerify(token, secretKey, {
          algorithms: ['HS256'],
        });

        if (!payload.sub) {
          throw new UnauthorizedException('Invalid token: missing subject');
        }

        (request as Request & { user: { id: string } }).user = {
          id: payload.sub,
        };

        return true;
      } catch (error) {
        if (error instanceof UnauthorizedException) throw error;
        throw new UnauthorizedException('Invalid or expired token');
      }
    },
  };
};

// =============================================================================
// Test Suite
// =============================================================================

describe('Chat Confirmation Flow (Integration)', () => {
  let app: INestApplication;

  async function createToken(payload: Record<string, unknown>, expiresIn = '1h') {
    const secret = new TextEncoder().encode(jwtSecret);
    return new SignJWT(payload)
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime(expiresIn)
      .setIssuedAt()
      .sign(secret);
  }

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [TestChatController, TestTrackingController],
      providers: [
        {
          provide: APP_GUARD,
          useFactory: (reflector: Reflector) => createTestAuthGuard(reflector),
          inject: [Reflector],
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    resetMockLLM();

    // Clear stores
    confirmationStore.clear();
    messageStore.length = 0;
    trackingStore.length = 0;
  });

  // ===========================================================================
  // Test: User message → AI asks → User confirms → Metric recorded
  // ===========================================================================

  describe('Chat → IA asks → "Sim" → Metric recorded', () => {
    it('should_record_metric_after_user_confirms', async () => {
      const token = await createToken({ sub: 'user-123' });
      const conversationId = 'conv-test-1';

      // Configure LLM to ask for confirmation
      const toolCall: ToolCall = {
        id: 'call-1',
        name: 'record_metric',
        arguments: {
          type: 'weight',
          value: 75.5,
          unit: 'kg',
          date: '2024-01-20',
        },
      };

      setLLMToAskForConfirmation(
        toolCall,
        'Vou registrar seu peso como 75.5 kg em 2024-01-20. Confirma?'
      );

      // Step 1: User sends message about weight
      const messageResponse = await request(app.getHttpServer())
        .post(`/api/chat/conversations/${conversationId}/messages`)
        .set('Authorization', `Bearer ${token}`)
        .send({ content: 'Meu peso hoje é 75.5 kg' })
        .expect(201);

      expect(messageResponse.body.userMessage.content).toBe('Meu peso hoje é 75.5 kg');
      expect(messageResponse.body.assistantMessage.awaitingConfirmation).toBe(true);

      const confirmationId = messageResponse.body.assistantMessage.confirmationId;

      // Step 2: Verify confirmation is pending
      const confirmationCheckResponse = await request(app.getHttpServer())
        .get(`/api/chat/conversations/${conversationId}/confirmation`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(confirmationCheckResponse.body.pending).toBe(true);
      expect(confirmationCheckResponse.body.toolName).toBe('record_metric');

      // Step 3: Verify no tracking entries yet
      const trackingBeforeResponse = await request(app.getHttpServer())
        .get('/api/tracking')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(trackingBeforeResponse.body.entries).toHaveLength(0);

      // Step 4: User confirms
      const confirmResponse = await request(app.getHttpServer())
        .post(`/api/chat/conversations/${conversationId}/confirm`)
        .set('Authorization', `Bearer ${token}`)
        .send({ confirmationId })
        .expect(200);

      expect(confirmResponse.body.success).toBe(true);
      expect(confirmResponse.body.message).toContain('Registrado com sucesso');

      // Step 5: Verify metric is now recorded
      const trackingAfterResponse = await request(app.getHttpServer())
        .get('/api/tracking')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(trackingAfterResponse.body.entries).toHaveLength(1);
      expect(trackingAfterResponse.body.entries[0]).toMatchObject({
        type: 'weight',
        value: '75.5',
        unit: 'kg',
        source: 'chat',
      });

      // Step 6: Verify confirmation is cleared
      const confirmationAfterResponse = await request(app.getHttpServer())
        .get(`/api/chat/conversations/${conversationId}/confirmation`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(confirmationAfterResponse.body.pending).toBe(false);
    });

    it('should_save_confirmation_message_in_conversation_history', async () => {
      const token = await createToken({ sub: 'user-123' });
      const conversationId = 'conv-test-1';

      const toolCall: ToolCall = {
        id: 'call-2',
        name: 'record_metric',
        arguments: {
          type: 'water',
          value: 500,
          unit: 'ml',
          date: '2024-01-20',
        },
      };

      setLLMToAskForConfirmation(
        toolCall,
        'Registrar 500ml de água para hoje?'
      );

      // Send message
      const messageResponse = await request(app.getHttpServer())
        .post(`/api/chat/conversations/${conversationId}/messages`)
        .set('Authorization', `Bearer ${token}`)
        .send({ content: 'Tomei 500ml de água' })
        .expect(201);

      // Confirm
      await request(app.getHttpServer())
        .post(`/api/chat/conversations/${conversationId}/confirm`)
        .set('Authorization', `Bearer ${token}`)
        .send({ confirmationId: messageResponse.body.assistantMessage.confirmationId })
        .expect(200);

      // Check messages include both confirmation request and success
      const messagesResponse = await request(app.getHttpServer())
        .get(`/api/chat/conversations/${conversationId}/messages`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const messages = messagesResponse.body.messages;
      const assistantMessages = messages.filter((m: MockMessage) => m.role === 'assistant');

      // Should have confirmation question and success message
      expect(assistantMessages.length).toBeGreaterThanOrEqual(2);

      // First assistant message asks for confirmation
      const confirmationQuestion = assistantMessages.find((m: MockMessage) =>
        m.metadata?.pendingConfirmation
      );
      expect(confirmationQuestion).toBeDefined();

      // Second assistant message confirms success
      const successMessage = assistantMessages.find((m: MockMessage) =>
        m.metadata?.toolExecution?.success === true
      );
      expect(successMessage).toBeDefined();
    });
  });

  // ===========================================================================
  // Test: User message → AI asks → User rejects → Metric NOT recorded
  // ===========================================================================

  describe('Chat → IA asks → "Não" → Metric NOT recorded', () => {
    it('should_not_record_metric_when_user_rejects', async () => {
      const token = await createToken({ sub: 'user-123' });
      const conversationId = 'conv-test-1';

      const toolCall: ToolCall = {
        id: 'call-3',
        name: 'record_metric',
        arguments: {
          type: 'weight',
          value: 80,
          unit: 'kg',
          date: '2024-01-20',
        },
      };

      setLLMToAskForConfirmation(
        toolCall,
        'Vou registrar 80 kg. Confirma?'
      );

      // Send message
      const messageResponse = await request(app.getHttpServer())
        .post(`/api/chat/conversations/${conversationId}/messages`)
        .set('Authorization', `Bearer ${token}`)
        .send({ content: 'Meu peso é 80 kg' })
        .expect(201);

      const confirmationId = messageResponse.body.assistantMessage.confirmationId;

      // User rejects
      const rejectResponse = await request(app.getHttpServer())
        .post(`/api/chat/conversations/${conversationId}/reject`)
        .set('Authorization', `Bearer ${token}`)
        .send({ confirmationId })
        .expect(200);

      expect(rejectResponse.body.success).toBe(true);
      expect(rejectResponse.body.message).toBe('Tudo bem, não vou registrar essa informação.');

      // Verify NO metric was recorded
      const trackingResponse = await request(app.getHttpServer())
        .get('/api/tracking')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(trackingResponse.body.entries).toHaveLength(0);

      // Verify confirmation is cleared
      const confirmationAfterResponse = await request(app.getHttpServer())
        .get(`/api/chat/conversations/${conversationId}/confirmation`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(confirmationAfterResponse.body.pending).toBe(false);
    });

    it('should_save_rejection_reason_when_provided', async () => {
      const token = await createToken({ sub: 'user-123' });
      const conversationId = 'conv-test-1';

      const toolCall: ToolCall = {
        id: 'call-4',
        name: 'record_metric',
        arguments: {
          type: 'weight',
          value: 90,
          unit: 'kg',
          date: '2024-01-20',
        },
      };

      setLLMToAskForConfirmation(toolCall, 'Registrar 90 kg?');

      const messageResponse = await request(app.getHttpServer())
        .post(`/api/chat/conversations/${conversationId}/messages`)
        .set('Authorization', `Bearer ${token}`)
        .send({ content: 'Peso 90 kg' })
        .expect(201);

      // Reject with reason
      const rejectResponse = await request(app.getHttpServer())
        .post(`/api/chat/conversations/${conversationId}/reject`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          confirmationId: messageResponse.body.assistantMessage.confirmationId,
          reason: 'O valor estava errado, é 85 kg',
        })
        .expect(200);

      expect(rejectResponse.body.message).toContain('O valor estava errado');

      // Check messages for rejection with reason
      const messagesResponse = await request(app.getHttpServer())
        .get(`/api/chat/conversations/${conversationId}/messages`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const rejectionMessage = messagesResponse.body.messages.find((m: MockMessage) =>
        m.metadata?.rejectedConfirmation
      );

      expect(rejectionMessage).toBeDefined();
      expect(rejectionMessage.metadata.rejectedConfirmation.reason).toBe('O valor estava errado, é 85 kg');
    });
  });

  // ===========================================================================
  // Test: Correction flow - user corrects → AI asks again → User confirms
  // ===========================================================================

  describe('Chat → Correction → Re-ask → Confirm', () => {
    it('should_allow_correction_and_re_confirmation', async () => {
      const token = await createToken({ sub: 'user-123' });
      const conversationId = 'conv-test-1';

      // First attempt with wrong value
      const toolCall1: ToolCall = {
        id: 'call-5',
        name: 'record_metric',
        arguments: {
          type: 'weight',
          value: 90,
          unit: 'kg',
          date: '2024-01-20',
        },
      };

      setLLMToAskForConfirmation(toolCall1, 'Registrar 90 kg?');

      const firstMessage = await request(app.getHttpServer())
        .post(`/api/chat/conversations/${conversationId}/messages`)
        .set('Authorization', `Bearer ${token}`)
        .send({ content: 'Peso 90 kg' })
        .expect(201);

      const firstConfirmationId = firstMessage.body.assistantMessage.confirmationId;

      // User rejects with correction
      await request(app.getHttpServer())
        .post(`/api/chat/conversations/${conversationId}/reject`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          confirmationId: firstConfirmationId,
          reason: 'Na verdade é 85 kg',
        })
        .expect(200);

      // Second attempt with corrected value
      const toolCall2: ToolCall = {
        id: 'call-6',
        name: 'record_metric',
        arguments: {
          type: 'weight',
          value: 85,
          unit: 'kg',
          date: '2024-01-20',
        },
      };

      setLLMToAskForConfirmation(toolCall2, 'Entendi! Registrar 85 kg então?');

      const secondMessage = await request(app.getHttpServer())
        .post(`/api/chat/conversations/${conversationId}/messages`)
        .set('Authorization', `Bearer ${token}`)
        .send({ content: 'Na verdade é 85 kg' })
        .expect(201);

      const secondConfirmationId = secondMessage.body.assistantMessage.confirmationId;

      expect(secondConfirmationId).not.toBe(firstConfirmationId);

      // User confirms the correction
      await request(app.getHttpServer())
        .post(`/api/chat/conversations/${conversationId}/confirm`)
        .set('Authorization', `Bearer ${token}`)
        .send({ confirmationId: secondConfirmationId })
        .expect(200);

      // Verify only the corrected value was recorded
      const trackingResponse = await request(app.getHttpServer())
        .get('/api/tracking')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(trackingResponse.body.entries).toHaveLength(1);
      expect(trackingResponse.body.entries[0].value).toBe('85');
    });
  });

  // ===========================================================================
  // Test: Confirmation expiration
  // ===========================================================================

  describe('Confirmation Expiration', () => {
    it('should_return_error_when_confirming_expired_confirmation', async () => {
      const token = await createToken({ sub: 'user-123' });
      const conversationId = 'conv-test-1';

      // Try to confirm with non-existent/expired confirmation ID
      const confirmResponse = await request(app.getHttpServer())
        .post(`/api/chat/conversations/${conversationId}/confirm`)
        .set('Authorization', `Bearer ${token}`)
        .send({ confirmationId: 'conf_expired_12345' })
        .expect(200);

      expect(confirmResponse.body.success).toBe(false);
      expect(confirmResponse.body.message).toContain('expirou ou não foi encontrada');
    });

    it('should_return_error_when_rejecting_expired_confirmation', async () => {
      const token = await createToken({ sub: 'user-123' });
      const conversationId = 'conv-test-1';

      const rejectResponse = await request(app.getHttpServer())
        .post(`/api/chat/conversations/${conversationId}/reject`)
        .set('Authorization', `Bearer ${token}`)
        .send({ confirmationId: 'conf_expired_12345' })
        .expect(200);

      expect(rejectResponse.body.success).toBe(false);
      expect(rejectResponse.body.message).toContain('expirou ou não foi encontrada');
    });
  });

  // ===========================================================================
  // Test: Normal response without confirmation
  // ===========================================================================

  describe('Normal Response (No Confirmation Needed)', () => {
    it('should_respond_normally_when_no_confirmation_needed', async () => {
      const token = await createToken({ sub: 'user-123' });
      const conversationId = 'conv-test-1';

      // Reset to normal response (no confirmation)
      resetMockLLM();
      mockLLMConfig.responseContent = 'Olá! Como posso ajudar você hoje?';

      const response = await request(app.getHttpServer())
        .post(`/api/chat/conversations/${conversationId}/messages`)
        .set('Authorization', `Bearer ${token}`)
        .send({ content: 'Olá!' })
        .expect(201);

      expect(response.body.assistantMessage.awaitingConfirmation).toBe(false);

      // No confirmation should be pending
      const confirmationResponse = await request(app.getHttpServer())
        .get(`/api/chat/conversations/${conversationId}/confirmation`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(confirmationResponse.body.pending).toBe(false);
    });
  });

  // ===========================================================================
  // Test: Multi-tenant isolation
  // ===========================================================================

  describe('Multi-tenant Isolation', () => {
    it('should_not_allow_user_to_confirm_another_users_confirmation', async () => {
      const tokenUser1 = await createToken({ sub: 'user-123' });
      const tokenUser2 = await createToken({ sub: 'user-456' });
      const conversationId = 'conv-test-1'; // This conversation belongs to user-123

      const toolCall: ToolCall = {
        id: 'call-7',
        name: 'record_metric',
        arguments: { type: 'weight', value: 75, unit: 'kg', date: '2024-01-20' },
      };

      setLLMToAskForConfirmation(toolCall, 'Registrar 75 kg?');

      // User 1 creates confirmation
      const messageResponse = await request(app.getHttpServer())
        .post(`/api/chat/conversations/${conversationId}/messages`)
        .set('Authorization', `Bearer ${tokenUser1}`)
        .send({ content: 'Peso 75 kg' })
        .expect(201);

      const confirmationId = messageResponse.body.assistantMessage.confirmationId;

      // User 2 tries to confirm User 1's confirmation
      // This should fail because the conversation belongs to User 1
      await request(app.getHttpServer())
        .post(`/api/chat/conversations/${conversationId}/confirm`)
        .set('Authorization', `Bearer ${tokenUser2}`)
        .send({ confirmationId })
        .expect(404); // Conversation not found for user 2
    });

    it('should_not_allow_user_to_view_another_users_conversation', async () => {
      const tokenUser2 = await createToken({ sub: 'user-456' });
      const conversationId = 'conv-test-1'; // This conversation belongs to user-123

      // User 2 tries to view User 1's conversation
      await request(app.getHttpServer())
        .get(`/api/chat/conversations/${conversationId}/messages`)
        .set('Authorization', `Bearer ${tokenUser2}`)
        .expect(404);
    });
  });
});
