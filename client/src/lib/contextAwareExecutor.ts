// @ts-nocheck
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
import { parseLocation } from './locationParser';
import type { ColumnSchema } from './schemaAnalyzer';
import type { NormalizationPlan } from './normalizationPlan';

/**
 * Process a single row with context awareness
 * 
 * @param row - The input row data
 * @param schema - The column schema
 * @param plan - The normalization plan
 * @param outputColumns - Optional list of columns to include in output. If provided, all other columns are removed.
 */
export function processRowWithContext(
  row: any,
  schema: ColumnSchema[],
  plan: NormalizationPlan,
  outputColumns?: string[]
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
      
      // v3.10.0: Remove "Name" column from output (only output First Name + Last Name)
      delete normalized[colName];
      
      // v3.10.0: Always output First Name and Last Name when processing a name column
      if (name.isValid) {
        normalized['First Name'] = name.firstName || '';
        normalized['Last Name'] = name.lastName || '';
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
    
    // v3.14.1: Handle full names in First Name column
    // If First Name contains 2+ words, split it using NameEnhanced
    if (colSchema.type === 'first-name') {
      // Clean the value first (remove bullets, special chars, etc.)
      let cleaned = value.trim();
      cleaned = cleaned.replace(/^[•●▪▫‣?!]+\s*/g, ''); // Remove bullets
      cleaned = cleaned.replace(/^(Dr\.?|Prof\.?|Mr\.?|Mrs\.?|Ms\.?|Miss\.?|Reverend)\s+/i, ''); // Remove titles
      cleaned = cleaned.replace(/^\([^)]+\)\s*/g, ''); // Remove parenthetical prefixes
      cleaned = cleaned.replace(/[,"]+$/g, ''); // Remove trailing commas/quotes
      cleaned = cleaned.replace(/^["]+/g, ''); // Remove leading quotes
      cleaned = cleaned.replace(/\s+/g, ' ').trim(); // Normalize whitespace
      
      const words = cleaned.split(/\s+/).filter(w => w.length > 1 || /^[A-Z]$/.test(w));
      
      if (words.length >= 2) {
        // This is a full name - use NameEnhanced to split it properly
        const name = new NameEnhanced(cleaned);
        if (name.isValid && name.firstName && name.lastName) {
          normalized[colName] = name.firstName;
          // Also populate Last Name if it exists in the schema
          const lastNameCol = schema.find(s => s.type === 'last-name');
          if (lastNameCol) {
            normalized[lastNameCol.name] = name.lastName;
          }
          return;
        }
      }
    }
    
    // v3.13.4: Handle location splitting
    // Check if this is a location column (type is 'address' and name contains 'location')
    const isLocationColumn = colSchema.type === 'address' && /location/i.test(colName);
    
    if (isLocationColumn) {
      const parsed = parseLocation(value);
      
      // Remove original Location column
      delete normalized[colName];
      
      // Add Personal City and Personal State columns
      if (parsed.city) {
        normalized['Personal City'] = parsed.city;
      }
      if (parsed.state) {
        normalized['Personal State'] = parsed.state;
      }
      
      return;
    }
    
    normalized[colName] = normalizeValue(colSchema.type, value);
  });
  
  // Phase 4: Filter output columns if specified
  // Only include columns that are in outputColumns list
  if (outputColumns && outputColumns.length > 0) {
    const outputSet = new Set(outputColumns);
    const filtered: Record<string, any> = {};
    
    // Include only columns in the output list
    outputColumns.forEach(col => {
      if (col in normalized) {
        filtered[col] = normalized[col];
      }
    });
    
    return filtered;
  }
  
  return normalized;
}
