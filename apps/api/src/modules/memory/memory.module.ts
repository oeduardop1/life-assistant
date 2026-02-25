import { Module } from '@nestjs/common';
import { MemoryController } from './presentation/controllers/memory.controller';
import { UserMemoryService } from './application/services/user-memory.service';
import { KnowledgeItemsService } from './application/services/knowledge-items.service';
import { ContradictionResolutionService } from './application/services/contradiction-resolution.service';
import { UserMemoryRepository } from './infrastructure/repositories/user-memory.repository';
import { KnowledgeItemRepository } from './infrastructure/repositories/knowledge-item.repository';
import { NoOpContradictionDetectorAdapter } from './infrastructure/adapters/noop-contradiction-detector.adapter';
import {
  USER_MEMORY_REPOSITORY,
  KNOWLEDGE_ITEM_REPOSITORY,
  CONTRADICTION_DETECTOR,
} from './domain/ports';

/**
 * MemoryModule - User memory and knowledge management
 *
 * Features:
 * - User memory (compact context for system prompt)
 * - Knowledge items (granular facts, preferences, insights)
 *
 * Note: Contradiction detection is now handled by the Python AI service.
 * The NoOp adapter satisfies the DI token for ContradictionResolutionService.
 *
 * @see docs/milestones/phase-1-counselor.md M1.3 for implementation details
 * @see ADR-012 for Tool Use + Memory Consolidation architecture
 */
@Module({
  controllers: [MemoryController],
  providers: [
    // Application Services
    UserMemoryService,
    KnowledgeItemsService,
    ContradictionResolutionService,

    // Repository implementations (injected via symbols for DI)
    UserMemoryRepository,
    KnowledgeItemRepository,

    // Adapter implementations
    NoOpContradictionDetectorAdapter,

    // Bind interfaces to implementations
    {
      provide: USER_MEMORY_REPOSITORY,
      useExisting: UserMemoryRepository,
    },
    {
      provide: KNOWLEDGE_ITEM_REPOSITORY,
      useExisting: KnowledgeItemRepository,
    },
    {
      provide: CONTRADICTION_DETECTOR,
      useExisting: NoOpContradictionDetectorAdapter,
    },
  ],
  exports: [
    UserMemoryService,
    KnowledgeItemsService,
    ContradictionResolutionService,
  ],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class MemoryModule {}
