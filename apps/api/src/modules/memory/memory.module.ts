import { Module } from '@nestjs/common';
import { MemoryController } from './presentation/controllers/memory.controller';
import { UserMemoryService } from './application/services/user-memory.service';
import { KnowledgeItemsService } from './application/services/knowledge-items.service';
import { MemoryToolExecutorService } from './application/services/memory-tool-executor.service';
import { UserMemoryRepository } from './infrastructure/repositories/user-memory.repository';
import { KnowledgeItemRepository } from './infrastructure/repositories/knowledge-item.repository';
import {
  USER_MEMORY_REPOSITORY,
  KNOWLEDGE_ITEM_REPOSITORY,
} from './domain/ports';

/**
 * MemoryModule - User memory and knowledge management
 *
 * Features:
 * - User memory (compact context for system prompt)
 * - Knowledge items (granular facts, preferences, insights)
 * - Tool executor for search_knowledge and add_knowledge
 *
 * @see MILESTONES.md M1.3 for implementation details
 * @see DATA_MODEL.md §4.5 for entities
 * @see ADR-012 for Tool Use + Memory Consolidation architecture
 */
@Module({
  controllers: [MemoryController],
  providers: [
    // Application Services
    UserMemoryService,
    KnowledgeItemsService,
    MemoryToolExecutorService,

    // Repository implementations (injected via symbols for DI)
    UserMemoryRepository,
    KnowledgeItemRepository,

    // Bind interfaces to implementations
    {
      provide: USER_MEMORY_REPOSITORY,
      useExisting: UserMemoryRepository,
    },
    {
      provide: KNOWLEDGE_ITEM_REPOSITORY,
      useExisting: KnowledgeItemRepository,
    },
  ],
  exports: [
    UserMemoryService,
    KnowledgeItemsService,
    MemoryToolExecutorService,
  ],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class MemoryModule {}
