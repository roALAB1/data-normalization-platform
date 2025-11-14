// @ts-nocheck
/**
 * UnifiedNormalizationEngine - Route data to appropriate normalizers
 * 
 * Executes normalization plans across multiple columns simultaneously.
 * Routes to: NameEnhanced, PhoneEnhanced, EmailEnhanced, AddressFormatter
 * 
 * Features:
 * - Multi-column processing
 * - Progress tracking
 * - Error handling
 * - Caching
 * - Quality metrics
 */

import type { DataType } from './DataTypeDetector';
import { NameEnhanced } from '../names';
import { PhoneEnhanced } from '../phones';
import { EmailEnhanced } from '../emails';
import { AddressFormatter } from '../addresses';

export interface NormalizationColumn {
  index: number;
  name: string;
  type: DataType;
  options?: Record<string, any>;
}

export interface NormalizationPlan {
  columns: NormalizationColumn[];
}

export interface NormalizationResult {
  originalRow: string[];
  normalizedRow: string[];
  errors: Map<number, string>; // column index -> error message
  metadata: Map<number, any>; // column index -> normalization metadata
}

export interface BatchNormalizationResult {
  results: NormalizationResult[];
  summary: {
    totalRows: number;
    successfulRows: number;
    errorRows: number;
    columnStats: Map<number, {
      total: number;
      successful: number;
      errors: number;
    }>;
  };
}

export type ProgressCallback = (progress: {
  current: number;
  total: number;
  percentage: number;
  currentColumn?: string;
}) => void;

export class UnifiedNormalizationEngine {
  private cache: Map<string, any> = new Map();
  private cacheEnabled: boolean = true;

  /**
   * Enable or disable caching
   */
  setCacheEnabled(enabled: boolean): void {
    this.cacheEnabled = enabled;
    if (!enabled) {
      this.cache.clear();
    }
  }

  /**
   * Clear the cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Generate cache key for a value and normalization type
   */
  private getCacheKey(value: string, type: DataType, options?: Record<string, any>): string {
    return `${type}:${value}:${JSON.stringify(options || {})}`;
  }

  /**
   * Normalize a single value based on its data type
   */
  private normalizeValue(
    value: string,
    type: DataType,
    options?: Record<string, any>
  ): { normalized: string; metadata?: any; error?: string } {
    if (!value || value.trim() === '') {
      return { normalized: value };
    }

    // Check cache
    if (this.cacheEnabled) {
      const cacheKey = this.getCacheKey(value, type, options);
      const cached = this.cache.get(cacheKey);
      if (cached) {
        return cached;
      }
    }

    let result: { normalized: string; metadata?: any; error?: string };

    try {
      switch (type) {
        case 'name':
        case 'first_name':
        case 'last_name': {
          const parsed = NameEnhanced.parse(value);
          if (parsed.isValid) {
            result = {
              normalized: parsed.formatted.full,
              metadata: {
                first: parsed.first,
                middle: parsed.middle,
                last: parsed.last,
                suffix: parsed.suffix
              }
            };
          } else {
            result = { normalized: value, error: 'Invalid name format' };
          }
          break;
        }

        case 'phone': {
          const parsed = PhoneEnhanced.parse(value, options?.defaultCountry || 'US');
          if (parsed.isValid) {
            result = {
              normalized: parsed.formats.e164 || value,
              metadata: {
                country: parsed.country,
                type: parsed.type,
                formats: parsed.formats
              }
            };
          } else {
            result = { normalized: value, error: 'Invalid phone number' };
          }
          break;
        }

        case 'email': {
          const normalized = EmailEnhanced.normalize(value);
          const isValid = EmailEnhanced.validate(value);
          if (isValid) {
            result = {
              normalized: normalized.normalized,
              metadata: {
                provider: normalized.provider,
                plusTag: normalized.plusTag
              }
            };
          } else {
            result = { normalized: value, error: 'Invalid email address' };
          }
          break;
        }

        case 'address': {
          const normalized = AddressFormatter.normalize(value, options);
          result = {
            normalized,
            metadata: { original: value }
          };
          break;
        }

        default:
          result = { normalized: value };
      }
    } catch (error) {
      result = {
        normalized: value,
        error: error instanceof Error ? error.message : 'Normalization error'
      };
    }

    // Cache result
    if (this.cacheEnabled) {
      const cacheKey = this.getCacheKey(value, type, options);
      this.cache.set(cacheKey, result);
    }

    return result;
  }

  /**
   * Normalize a single row based on the plan
   */
  normalizeRow(row: string[], plan: NormalizationPlan): NormalizationResult {
    const normalizedRow = [...row];
    const errors = new Map<number, string>();
    const metadata = new Map<number, any>();

    for (const column of plan.columns) {
      const value = row[column.index];
      if (value === undefined || value === null) continue;

      const result = this.normalizeValue(value, column.type, column.options);
      normalizedRow[column.index] = result.normalized;

      if (result.error) {
        errors.set(column.index, result.error);
      }

      if (result.metadata) {
        metadata.set(column.index, result.metadata);
      }
    }

    return {
      originalRow: row,
      normalizedRow,
      errors,
      metadata
    };
  }

  /**
   * Normalize multiple rows (batch processing)
   */
  normalizeBatch(
    rows: string[][],
    plan: NormalizationPlan,
    onProgress?: ProgressCallback
  ): BatchNormalizationResult {
    const results: NormalizationResult[] = [];
    const columnStats = new Map<number, { total: number; successful: number; errors: number }>();

    // Initialize column stats
    for (const column of plan.columns) {
      columnStats.set(column.index, { total: 0, successful: 0, errors: 0 });
    }

    // Process each row
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const result = this.normalizeRow(row, plan);
      results.push(result);

      // Update column stats
      for (const column of plan.columns) {
        const stats = columnStats.get(column.index)!;
        stats.total++;

        if (result.errors.has(column.index)) {
          stats.errors++;
        } else {
          stats.successful++;
        }
      }

      // Progress callback
      if (onProgress && (i % 100 === 0 || i === rows.length - 1)) {
        onProgress({
          current: i + 1,
          total: rows.length,
          percentage: Math.round(((i + 1) / rows.length) * 100)
        });
      }
    }

    // Calculate summary
    const successfulRows = results.filter(r => r.errors.size === 0).length;
    const errorRows = results.length - successfulRows;

    return {
      results,
      summary: {
        totalRows: rows.length,
        successfulRows,
        errorRows,
        columnStats
      }
    };
  }

  /**
   * Normalize batch with chunking for large datasets
   */
  async normalizeBatchChunked(
    rows: string[][],
    plan: NormalizationPlan,
    chunkSize: number = 1000,
    onProgress?: ProgressCallback
  ): Promise<BatchNormalizationResult> {
    const allResults: NormalizationResult[] = [];
    const columnStats = new Map<number, { total: number; successful: number; errors: number }>();

    // Initialize column stats
    for (const column of plan.columns) {
      columnStats.set(column.index, { total: 0, successful: 0, errors: 0 });
    }

    // Process in chunks
    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = rows.slice(i, Math.min(i + chunkSize, rows.length));
      
      // Process chunk
      const chunkResult = this.normalizeBatch(chunk, plan);
      allResults.push(...chunkResult.results);

      // Merge stats
      for (const [colIndex, stats] of chunkResult.summary.columnStats) {
        const totalStats = columnStats.get(colIndex)!;
        totalStats.total += stats.total;
        totalStats.successful += stats.successful;
        totalStats.errors += stats.errors;
      }

      // Progress callback
      if (onProgress) {
        onProgress({
          current: Math.min(i + chunkSize, rows.length),
          total: rows.length,
          percentage: Math.round((Math.min(i + chunkSize, rows.length) / rows.length) * 100)
        });
      }

      // Yield to event loop
      await new Promise(resolve => setTimeout(resolve, 0));
    }

    // Calculate summary
    const successfulRows = allResults.filter(r => r.errors.size === 0).length;
    const errorRows = allResults.length - successfulRows;

    return {
      results: allResults,
      summary: {
        totalRows: rows.length,
        successfulRows,
        errorRows,
        columnStats
      }
    };
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; enabled: boolean } {
    return {
      size: this.cache.size,
      enabled: this.cacheEnabled
    };
  }
}
