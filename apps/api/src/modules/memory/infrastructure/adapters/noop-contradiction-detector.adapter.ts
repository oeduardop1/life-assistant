import { Injectable } from '@nestjs/common';
import type {
  ContradictionDetectorPort,
  ContradictionCheckResult,
  ContradictionContext,
  ExistingItemForCheck,
  BatchContradictionResult,
} from '../../domain/ports/contradiction-detector.port';

/**
 * NoOp implementation of ContradictionDetectorPort.
 *
 * Contradiction detection is now handled by the Python AI service.
 * This adapter satisfies the DI token so ContradictionResolutionService
 * can still be injected without errors, but always returns "no contradiction".
 */
@Injectable()
export class NoOpContradictionDetectorAdapter implements ContradictionDetectorPort {
  checkContradiction(
    _newContent: string,
    _existingContent: string,
    _context: ContradictionContext
  ): Promise<ContradictionCheckResult> {
    return Promise.resolve({
      isContradiction: false,
      confidence: 0,
      explanation: 'Contradiction detection delegated to Python AI service',
    });
  }

  batchCheckContradictions(
    _newContent: string,
    existingItems: ExistingItemForCheck[],
    _context: ContradictionContext
  ): Promise<BatchContradictionResult[]> {
    return Promise.resolve(
      existingItems.map((item) => ({
        itemId: item.id,
        result: {
          isContradiction: false,
          confidence: 0,
          explanation: 'Contradiction detection delegated to Python AI service',
        },
      }))
    );
  }
}
