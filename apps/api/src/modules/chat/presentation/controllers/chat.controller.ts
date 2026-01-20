import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  Sse,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { Observable } from 'rxjs';
import { ChatService, type MessageEvent } from '../../application/services/chat.service';
import { CurrentUser, SseCurrentUser, Public, SkipTransform } from '../../../../common/decorators';
import { SseAuthGuard } from '../../../../common/guards';
import {
  CreateConversationDto,
  SendMessageDto,
  ConversationResponseDto,
  ConversationListResponseDto,
  MessageListResponseDto,
  MessageResponseDto,
  SendMessageResponseDto,
} from '../dtos';

/**
 * Chat controller - REST + SSE endpoints for chat functionality
 *
 * @see docs/milestones/phase-1-counselor.md M1.2 for implementation details
 */
@ApiTags('chat')
@Controller('chat')
@ApiBearerAuth()
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  /**
   * List all conversations for the authenticated user
   */
  @Get('conversations')
  @ApiOperation({ summary: 'List all conversations' })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiQuery({ name: 'offset', required: false, type: Number, example: 0 })
  @ApiResponse({
    status: 200,
    description: 'List of conversations',
    type: ConversationListResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  async listConversations(
    @CurrentUser('id') userId: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string
  ): Promise<ConversationListResponseDto> {
    const options: { limit?: number; offset?: number } = {};
    if (limit) options.limit = parseInt(limit, 10);
    if (offset) options.offset = parseInt(offset, 10);

    const result = await this.chatService.listConversations(userId, options);

    return {
      conversations: result.conversations.map((c) => this.mapConversation(c)),
      total: result.total,
    };
  }

  /**
   * Create a new conversation
   */
  @Post('conversations')
  @ApiOperation({ summary: 'Create a new conversation' })
  @ApiResponse({
    status: 201,
    description: 'Conversation created successfully',
    type: ConversationResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  async createConversation(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateConversationDto
  ): Promise<ConversationResponseDto> {
    const conversation = await this.chatService.createConversation(userId, dto);
    return this.mapConversation(conversation);
  }

  /**
   * Get a specific conversation
   */
  @Get('conversations/:id')
  @ApiOperation({ summary: 'Get conversation details' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: 200,
    description: 'Conversation details',
    type: ConversationResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  @ApiResponse({ status: 404, description: 'Conversation not found' })
  async getConversation(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) conversationId: string
  ): Promise<ConversationResponseDto> {
    const conversation = await this.chatService.getConversation(
      userId,
      conversationId
    );
    return this.mapConversation(conversation);
  }

  /**
   * Delete (soft delete) a conversation
   */
  @Delete('conversations/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a conversation (soft delete)' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 204, description: 'Conversation deleted' })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  @ApiResponse({ status: 404, description: 'Conversation not found' })
  async deleteConversation(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) conversationId: string
  ): Promise<void> {
    await this.chatService.deleteConversation(userId, conversationId);
  }

  /**
   * Get messages for a conversation
   */
  @Get('conversations/:id/messages')
  @ApiOperation({ summary: 'Get messages for a conversation' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 50 })
  @ApiQuery({ name: 'offset', required: false, type: Number, example: 0 })
  @ApiResponse({
    status: 200,
    description: 'List of messages',
    type: MessageListResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  @ApiResponse({ status: 404, description: 'Conversation not found' })
  async getMessages(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) conversationId: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string
  ): Promise<MessageListResponseDto> {
    const options: { limit?: number; offset?: number } = {};
    if (limit) options.limit = parseInt(limit, 10);
    if (offset) options.offset = parseInt(offset, 10);

    const result = await this.chatService.getMessages(userId, conversationId, options);

    return {
      messages: result.messages.map((m) => this.mapMessage(m)),
      total: result.total,
    };
  }

  /**
   * Send a message to a conversation
   */
  @Post('conversations/:id/messages')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Send a message' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: 202,
    description: 'Message accepted, connect to SSE for response',
    type: SendMessageResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  @ApiResponse({ status: 404, description: 'Conversation not found' })
  async sendMessage(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) conversationId: string,
    @Body() dto: SendMessageDto
  ): Promise<SendMessageResponseDto> {
    const userMessage = await this.chatService.sendMessage(
      userId,
      conversationId,
      dto
    );

    // Generate title for new conversations (on first message)
    await this.chatService.generateTitle(userId, conversationId);

    return {
      userMessage: this.mapMessage(userMessage),
      streamUrl: `/api/chat/conversations/${conversationId}/stream`,
    };
  }

  /**
   * Stream LLM response via Server-Sent Events
   *
   * Note: This endpoint is marked as @Public() because EventSource doesn't
   * support custom headers. Authentication is done via query param token
   * using @UseGuards(SseAuthGuard) which validates the token and attaches
   * the user to the request for @SseCurrentUser() to extract.
   */
  @Sse('conversations/:id/stream')
  @Public()
  @SkipTransform()
  @UseGuards(SseAuthGuard)
  @ApiOperation({ summary: 'Stream LLM response via SSE' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: 200,
    description: 'SSE stream of response chunks',
  })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  @ApiResponse({ status: 404, description: 'Conversation not found' })
  stream(
    @SseCurrentUser() userId: string,
    @Param('id', ParseUUIDPipe) conversationId: string
  ): Observable<MessageEvent> {
    return this.chatService.streamResponse(userId, conversationId);
  }

  // ==========================================================================
  // Confirmation Endpoints (ADR-015: Low Friction Tracking)
  // ==========================================================================

  /**
   * Confirm a pending tool execution
   *
   * When a tool requires confirmation (e.g., record_metric), this endpoint
   * executes the tool and returns the result via SSE stream.
   *
   * @see ADR-015 for Low Friction Tracking Philosophy
   */
  @Sse('conversations/:id/confirm/:confirmationId')
  @Public()
  @SkipTransform()
  @UseGuards(SseAuthGuard)
  @ApiOperation({ summary: 'Confirm pending tool execution' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid', description: 'Conversation ID' })
  @ApiParam({ name: 'confirmationId', type: 'string', description: 'Confirmation ID' })
  @ApiResponse({
    status: 200,
    description: 'SSE stream with tool execution result',
  })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  @ApiResponse({ status: 404, description: 'Confirmation not found or expired' })
  async confirmToolExecution(
    @SseCurrentUser() userId: string,
    @Param('id', ParseUUIDPipe) conversationId: string,
    @Param('confirmationId') confirmationId: string
  ): Promise<Observable<MessageEvent>> {
    return this.chatService.confirmToolExecution(userId, conversationId, confirmationId);
  }

  /**
   * Reject a pending tool execution
   *
   * When a tool requires confirmation but the user rejects it,
   * this endpoint cancels the tool execution.
   */
  @Post('conversations/:id/reject/:confirmationId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reject pending tool execution' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid', description: 'Conversation ID' })
  @ApiParam({ name: 'confirmationId', type: 'string', description: 'Confirmation ID' })
  @ApiResponse({
    status: 200,
    description: 'Tool execution rejected',
  })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  @ApiResponse({ status: 404, description: 'Confirmation not found or expired' })
  async rejectToolExecution(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) conversationId: string,
    @Param('confirmationId') confirmationId: string,
    @Body('reason') reason?: string
  ): Promise<{ success: boolean; message: string }> {
    return this.chatService.rejectToolExecution(
      userId,
      conversationId,
      confirmationId,
      reason
    );
  }

  /**
   * Get pending confirmation for a conversation
   */
  @Get('conversations/:id/pending-confirmation')
  @ApiOperation({ summary: 'Get pending confirmation for conversation' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: 200,
    description: 'Pending confirmation details or null',
  })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  async getPendingConfirmation(
    @CurrentUser('id') _userId: string,
    @Param('id', ParseUUIDPipe) conversationId: string
  ): Promise<{ confirmation: unknown }> {
    const confirmation =
      await this.chatService.getPendingConfirmation(conversationId);
    return { confirmation };
  }

  /**
   * Map Conversation entity to response DTO
   */
  private mapConversation(conversation: {
    id: string;
    userId: string;
    title: string | null;
    type: string;
    metadata: unknown;
    createdAt: Date;
    updatedAt: Date;
  }): ConversationResponseDto {
    const result: ConversationResponseDto = {
      id: conversation.id,
      userId: conversation.userId,
      type: conversation.type as 'general' | 'counselor',
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
    };

    if (conversation.title) {
      result.title = conversation.title;
    }

    if (conversation.metadata) {
      result.metadata = conversation.metadata as Record<string, unknown>;
    }

    return result;
  }

  /**
   * Map Message entity to response DTO
   */
  private mapMessage(message: {
    id: string;
    conversationId: string;
    role: string;
    content: string;
    metadata: unknown;
    createdAt: Date;
  }): MessageResponseDto {
    const result: MessageResponseDto = {
      id: message.id,
      conversationId: message.conversationId,
      role: message.role as 'user' | 'assistant' | 'system',
      content: message.content,
      createdAt: message.createdAt,
    };

    if (message.metadata) {
      result.metadata = message.metadata as Record<string, unknown>;
    }

    return result;
  }
}
