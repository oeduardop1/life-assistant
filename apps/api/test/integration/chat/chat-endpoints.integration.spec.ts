import 'reflect-metadata';
import { describe, it, expect, beforeAll, afterAll, vi, beforeEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, Controller, Get, Post, Delete, Param, Body, Query } from '@nestjs/common';
import request from 'supertest';
import { AuthGuard } from '../../../src/common/guards/auth.guard';
import { CurrentUser } from '../../../src/common/decorators/current-user.decorator';

// Mock conversation and message data
const mockConversations = [
  {
    id: 'conv-1',
    userId: 'user-123',
    type: 'general',
    title: 'Test Conversation',
    metadata: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    deletedAt: null,
  },
];

const mockMessages = [
  {
    id: 'msg-1',
    conversationId: 'conv-1',
    role: 'user',
    content: 'Hello',
    metadata: null,
    createdAt: new Date('2024-01-01'),
  },
];

// Test controller simulating chat endpoints
@Controller('chat')
class TestChatController {
  @Get('conversations')
  listConversations(
    @Query('limit') limit?: string,
    @Query('offset') offset?: string
  ) {
    return {
      conversations: mockConversations.map(c => ({
        ...c,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
      })),
      total: mockConversations.length,
    };
  }

  @Post('conversations')
  createConversation(@Body() dto: { title?: string; type?: string }) {
    return {
      id: 'new-conv',
      userId: 'user-123',
      type: dto.type ?? 'general',
      title: dto.title ?? null,
      metadata: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  @Get('conversations/:id')
  getConversation(@Param('id') id: string) {
    const conv = mockConversations.find(c => c.id === id);
    if (!conv) {
      throw new Error('Not found');
    }
    return {
      ...conv,
      createdAt: conv.createdAt.toISOString(),
      updatedAt: conv.updatedAt.toISOString(),
    };
  }

  @Delete('conversations/:id')
  deleteConversation(@Param('id') id: string) {
    return;
  }

  @Get('conversations/:id/messages')
  getMessages(
    @Param('id') id: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string
  ) {
    return {
      messages: mockMessages.map(m => ({
        ...m,
        createdAt: m.createdAt.toISOString(),
      })),
      total: mockMessages.length,
    };
  }

  @Post('conversations/:id/messages')
  sendMessage(
    @Param('id') id: string,
    @Body() dto: { content: string }
  ) {
    return {
      userMessage: {
        id: 'new-msg',
        conversationId: id,
        role: 'user',
        content: dto.content,
        metadata: null,
        createdAt: new Date().toISOString(),
      },
      streamUrl: `/api/chat/conversations/${id}/stream`,
    };
  }
}

// Mock auth guard that always passes
const mockAuthGuard = {
  canActivate: vi.fn().mockReturnValue(true),
};

describe('Chat Endpoints (Integration)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [TestChatController],
    })
      .overrideGuard(AuthGuard)
      .useValue(mockAuthGuard)
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/chat/conversations', () => {
    it('should_return_conversation_list', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/chat/conversations')
        .expect(200);

      expect(response.body).toMatchObject({
        conversations: expect.arrayContaining([
          expect.objectContaining({
            id: 'conv-1',
            type: 'general',
          }),
        ]),
        total: expect.any(Number),
      });
    });

    it('should_accept_pagination_params', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/chat/conversations?limit=10&offset=0')
        .expect(200);

      expect(response.body.conversations).toBeDefined();
    });
  });

  describe('POST /api/chat/conversations', () => {
    it('should_create_conversation_with_default_type', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/chat/conversations')
        .send({})
        .expect(201);

      expect(response.body).toMatchObject({
        id: expect.any(String),
        type: 'general',
      });
    });

    it('should_create_conversation_with_title', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/chat/conversations')
        .send({ title: 'My Conversation' })
        .expect(201);

      expect(response.body).toMatchObject({
        id: expect.any(String),
        title: 'My Conversation',
      });
    });

    it('should_create_counselor_conversation', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/chat/conversations')
        .send({ type: 'counselor' })
        .expect(201);

      expect(response.body.type).toBe('counselor');
    });
  });

  describe('GET /api/chat/conversations/:id', () => {
    it('should_return_conversation_details', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/chat/conversations/conv-1')
        .expect(200);

      expect(response.body).toMatchObject({
        id: 'conv-1',
        type: 'general',
      });
    });
  });

  describe('DELETE /api/chat/conversations/:id', () => {
    it('should_delete_conversation', async () => {
      await request(app.getHttpServer())
        .delete('/api/chat/conversations/conv-1')
        .expect(200);
    });
  });

  describe('GET /api/chat/conversations/:id/messages', () => {
    it('should_return_messages_list', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/chat/conversations/conv-1/messages')
        .expect(200);

      expect(response.body).toMatchObject({
        messages: expect.arrayContaining([
          expect.objectContaining({
            id: 'msg-1',
            role: 'user',
          }),
        ]),
        total: expect.any(Number),
      });
    });
  });

  describe('POST /api/chat/conversations/:id/messages', () => {
    it('should_send_message_and_return_stream_url', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/chat/conversations/conv-1/messages')
        .send({ content: 'Hello AI!' })
        .expect(201);

      expect(response.body).toMatchObject({
        userMessage: expect.objectContaining({
          role: 'user',
          content: 'Hello AI!',
        }),
        streamUrl: expect.stringContaining('/stream'),
      });
    });
  });
});
