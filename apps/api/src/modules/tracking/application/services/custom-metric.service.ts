import { Injectable, Inject, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import type { CustomMetricDefinition, LifeArea, SubArea } from '@life-assistant/database';
import {
  CustomMetricRepositoryPort,
  CUSTOM_METRIC_REPOSITORY,
} from '../../domain/ports/custom-metric.repository.port';

/**
 * Parameters for creating a custom metric definition
 */
export interface CreateCustomMetricParams {
  name: string;
  description?: string | undefined;
  icon?: string | undefined;
  color?: string | undefined;
  unit: string;
  minValue?: number | undefined;
  maxValue?: number | undefined;
  area?: LifeArea | undefined;
  subArea?: SubArea | undefined;
}

/**
 * Parameters for updating a custom metric definition
 */
export interface UpdateCustomMetricParams {
  name?: string | undefined;
  description?: string | undefined;
  icon?: string | undefined;
  color?: string | undefined;
  unit?: string | undefined;
  minValue?: number | null | undefined;
  maxValue?: number | null | undefined;
  area?: LifeArea | undefined;
  subArea?: SubArea | null | undefined;
  isActive?: boolean | undefined;
}

/**
 * Service for managing custom metric definitions
 *
 * @see docs/specs/domains/tracking.md §4.2 for Custom Metrics spec
 */
@Injectable()
export class CustomMetricService {
  private readonly logger = new Logger(CustomMetricService.name);

  constructor(
    @Inject(CUSTOM_METRIC_REPOSITORY)
    private readonly customMetricRepository: CustomMetricRepositoryPort
  ) {}

  /**
   * Create a new custom metric definition
   */
  async create(userId: string, params: CreateCustomMetricParams): Promise<CustomMetricDefinition> {
    this.logger.log(`Creating custom metric "${params.name}" for user ${userId}`);

    // Check for duplicate name (case-insensitive)
    const existing = await this.customMetricRepository.findByName(userId, params.name);
    if (existing) {
      throw new ConflictException(`Já existe uma métrica com o nome "${params.name}"`);
    }

    // Validate minValue <= maxValue if both provided
    if (
      params.minValue !== undefined &&
      params.maxValue !== undefined &&
      params.minValue > params.maxValue
    ) {
      throw new ConflictException('Valor mínimo não pode ser maior que o valor máximo');
    }

    return this.customMetricRepository.create(userId, {
      name: params.name,
      description: params.description,
      icon: params.icon ?? '📊',
      color: params.color,
      unit: params.unit,
      minValue: params.minValue !== undefined ? String(params.minValue) : undefined,
      maxValue: params.maxValue !== undefined ? String(params.maxValue) : undefined,
      area: params.area ?? 'learning',
      subArea: params.subArea,
    });
  }

  /**
   * Get all custom metric definitions for a user (active only by default)
   */
  async findAll(userId: string, includeInactive = false): Promise<CustomMetricDefinition[]> {
    return this.customMetricRepository.findByUserId(userId, {
      isActive: includeInactive ? undefined : true,
    });
  }

  /**
   * Get a custom metric definition by ID
   */
  async findById(userId: string, metricId: string): Promise<CustomMetricDefinition | null> {
    return this.customMetricRepository.findById(userId, metricId);
  }

  /**
   * Get a custom metric definition by name
   */
  async findByName(userId: string, name: string): Promise<CustomMetricDefinition | null> {
    return this.customMetricRepository.findByName(userId, name);
  }

  /**
   * Update a custom metric definition
   */
  async update(
    userId: string,
    metricId: string,
    params: UpdateCustomMetricParams
  ): Promise<CustomMetricDefinition | null> {
    // If renaming, check for duplicate
    if (params.name) {
      const existing = await this.customMetricRepository.findByName(userId, params.name);
      if (existing && existing.id !== metricId) {
        throw new ConflictException(`Já existe uma métrica com o nome "${params.name}"`);
      }
    }

    // Get current metric to check min/max validation
    const currentMetric = await this.customMetricRepository.findById(userId, metricId);
    if (!currentMetric) {
      return null;
    }

    // Calculate effective min/max values
    const effectiveMinValue =
      params.minValue !== undefined
        ? params.minValue
        : currentMetric.minValue !== null
          ? parseFloat(currentMetric.minValue)
          : undefined;
    const effectiveMaxValue =
      params.maxValue !== undefined
        ? params.maxValue
        : currentMetric.maxValue !== null
          ? parseFloat(currentMetric.maxValue)
          : undefined;

    // Validate minValue <= maxValue
    if (
      effectiveMinValue !== undefined &&
      effectiveMinValue !== null &&
      effectiveMaxValue !== undefined &&
      effectiveMaxValue !== null &&
      effectiveMinValue > effectiveMaxValue
    ) {
      throw new ConflictException('Valor mínimo não pode ser maior que o valor máximo');
    }

    // Build update data, filtering undefined values
    const updateData: Record<string, unknown> = {};
    if (params.name !== undefined) updateData.name = params.name;
    if (params.description !== undefined) updateData.description = params.description;
    if (params.icon !== undefined) updateData.icon = params.icon;
    if (params.color !== undefined) updateData.color = params.color;
    if (params.unit !== undefined) updateData.unit = params.unit;
    if (params.minValue !== undefined) {
      updateData.minValue = params.minValue !== null ? String(params.minValue) : null;
    }
    if (params.maxValue !== undefined) {
      updateData.maxValue = params.maxValue !== null ? String(params.maxValue) : null;
    }
    if (params.area !== undefined) updateData.area = params.area;
    if (params.subArea !== undefined) updateData.subArea = params.subArea;
    if (params.isActive !== undefined) updateData.isActive = params.isActive;

    return this.customMetricRepository.update(userId, metricId, updateData);
  }

  /**
   * Soft delete a custom metric definition
   */
  async delete(userId: string, metricId: string): Promise<boolean> {
    return this.customMetricRepository.delete(userId, metricId);
  }

  /**
   * Validate a value against custom metric definition constraints
   * Returns true if valid, throws an error if invalid
   */
  async validateValue(userId: string, metricId: string, value: number): Promise<boolean> {
    const metric = await this.customMetricRepository.findById(userId, metricId);

    if (!metric) {
      throw new NotFoundException('Métrica personalizada não encontrada');
    }

    if (metric.minValue !== null) {
      const minValue = parseFloat(metric.minValue);
      if (value < minValue) {
        throw new ConflictException(
          `Valor ${String(value)} é menor que o mínimo permitido (${String(minValue)}) para a métrica "${metric.name}"`
        );
      }
    }

    if (metric.maxValue !== null) {
      const maxValue = parseFloat(metric.maxValue);
      if (value > maxValue) {
        throw new ConflictException(
          `Valor ${String(value)} é maior que o máximo permitido (${String(maxValue)}) para a métrica "${metric.name}"`
        );
      }
    }

    return true;
  }
}
