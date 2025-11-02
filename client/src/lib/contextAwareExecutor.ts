/**
 * Context-Aware Executor
 * 
 * Executes normalization plan with context awareness:
 * - Normalizes primary columns first and caches results
 * - Derives component columns from cache (doesn't re-normalize)
 * - Normalizes independent columns separately
 * 
 * This prevents the overwriting issue where existing First/Last columns
 * overwrite the correctly normalized values from the Name column.
 */

import { NameEnhanced } from './NameEnhanced';
import { normalizeValue } from './normalizeValue';
import type { ColumnSchema } from './schemaAnalyzer';
import type { NormalizationPlan } from './normalizationPlan';

/**
 * Process a single row with context awareness
 */
export function processRowWithContext(
  row: any,
  schema: ColumnSchema[],
  plan: NormalizationPlan
): any {
  const normalized = { ...row };
  const cache = new Map<string, NameEnhanced>(); // Cache normalized results
  
  // Phase 1: Normalize primary columns first
  plan.primary.forEach(colName => {
    const value = row[colName];
    if (!value) return;
    
    const colSchema = schema.find(s => s.name === colName);
    if (!colSchema) return;
    
    if (colSchema.type === 'name') {
      // Normalize full name and cache the result
      const name = new NameEnhanced(value);
      cache.set(colName, name);
      
      if (name.isValid) {
        normalized[colName] = name.full;
      } else {
        normalized[colName] = value; // Keep original if invalid
      }
    } else {
      // Other types - normalize directly
      normalized[colName] = normalizeValue(colSchema.type, value);
    }
  });
  
  // Phase 2: Derive component columns from cache (DON'T re-normalize!)
  plan.derived.forEach(({ column, primary, extract }) => {
    const cached = cache.get(primary);
    
    if (cached && cached.isValid) {
      // Extract from cached result
      if (extract === 'firstName') {
        normalized[column] = cached.firstName || '';
      } else if (extract === 'lastName') {
        normalized[column] = cached.lastName || '';
      } else if (extract === 'full') {
        normalized[column] = cached.full;
      }
    } else {
      // Primary wasn't cached or invalid - normalize independently
      const value = row[column];
      if (value) {
        const colSchema = schema.find(s => s.name === column);
        if (colSchema) {
          normalized[column] = normalizeValue(colSchema.type, value);
        }
      }
    }
  });
  
  // Phase 3: Normalize independent columns
  plan.independent.forEach(colName => {
    const value = row[colName];
    if (!value) return;
    
    const colSchema = schema.find(s => s.name === colName);
    if (!colSchema || colSchema.type === 'unknown') {
      // Keep original value for unknown types
      normalized[colName] = value;
      return;
    }
    
    normalized[colName] = normalizeValue(colSchema.type, value);
  });
  
  return normalized;
}
