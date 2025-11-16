/**
 * Matching Engine for CRM Sync Mapper
 * Intelligently matches enriched data rows back to original CRM rows
 * Supports multi-value arrays in enriched data columns
 */

import { parseArrayValue, findMatchInArray, getColumnType } from './arrayParser';

export interface MatchResult {
  originalRowIndex: number;
  enrichedRowIndex: number;
  confidence: number; // 0-100
  identifier: string; // value used for matching
  matchedBy?: string; // which identifier column was used (for multi-identifier matching)
  arrayIndex?: number; // which array index matched (for array values)
  matchedArrayValue?: string; // formatted string showing which array value matched (e.g., "Email[2]: john@company.com")
}

export interface MatchInstance {
  enrichedColumn: string; // which enriched column matched
  originalColumn: string; // which original column was used
  matchedValue: string; // the actual value that matched
  arrayIndex?: number; // if from array, which index
}

export interface EnhancedMatchStats {
  totalOriginalRows: number;
  totalEnrichedRows: number;
  uniqueRowsMatched: number; // NEW: unique original rows matched (deduplicated)
  totalMatchInstances: number; // NEW: total match instances (includes duplicates)
  unmatchedCount: number;
  matchRate: number; // percentage based on unique rows
  duplicateMatches: number;
  identifierColumn: string;
  matchInstancesByIdentifier?: Map<string, number>; // NEW: breakdown by identifier type
  matchInstancesByColumn?: Map<string, number>; // NEW: breakdown by enriched column
  averageInstancesPerRow?: number; // NEW: average match instances per matched row
}

export interface MatchStats {
  totalOriginalRows: number;
  totalEnrichedRows: number;
  matchedCount: number;
  unmatchedCount: number;
  matchRate: number; // percentage
  duplicateMatches: number;
  identifierColumn: string;
}

export interface UnmatchedRow {
  rowIndex: number;
  data: Record<string, any>;
  reason: string;
}

/**
 * Auto-detect the best identifier column from the original data
 * Priority: Email > Phone > ID > Name+ZIP
 */
export function autoDetectIdentifier(
  originalData: Record<string, any>[],
  enrichedData: Record<string, any>[]
): string | null {
  if (originalData.length === 0) {
    return null;
  }

  const originalColumns = Object.keys(originalData[0]);

  // Priority 1: Email (highest priority - unique, reliable)
  const emailCol = originalColumns.find(col => 
    /email/i.test(col) && hasUniqueValues(originalData, col)
  );
  if (emailCol) return emailCol;

  // Priority 2: Phone
  const phoneCol = originalColumns.find(col => 
    /phone/i.test(col) && hasUniqueValues(originalData, col)
  );
  if (phoneCol) return phoneCol;

  // Priority 3: ID/Customer ID
  const idCol = originalColumns.find(col => 
    /^id$|customer.*id|contact.*id/i.test(col) && hasUniqueValues(originalData, col)
  );
  if (idCol) return idCol;

  // Priority 4: First column with unique values
  const uniqueCol = originalColumns.find(col => 
    hasUniqueValues(originalData, col)
  );
  if (uniqueCol) return uniqueCol;

  // Fallback: First column
  return originalColumns[0];
}

/**
 * Check if a column has mostly unique values (>80% unique)
 */
function hasUniqueValues(data: Record<string, any>[], column: string): boolean {
  const values = data.map(row => row[column]).filter(v => v !== null && v !== undefined && v !== '');
  if (values.length === 0) return false;
  
  const uniqueCount = new Set(values).size;
  return uniqueCount / values.length > 0.8;
}

/**
 * Normalize identifier value for matching
 */
function normalizeIdentifier(value: any): string {
  if (value === null || value === undefined) return '';
  
  return String(value)
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s@.-]/g, ''); // Keep alphanumeric, @, ., -, and spaces
}

/**
 * Match enriched rows to original rows using multiple identifier columns with fallback
 * Returns both matches and detailed instance tracking
 */
export function matchRows(
  originalData: Record<string, any>[],
  enrichedData: Record<string, any>[],
  identifierColumns: string | string[], // Support both single and multiple identifiers
  columnMappings?: Record<string, string> // enriched column -> original column
): MatchResult[] {
  const matches: MatchResult[] = [];
  const identifierArray = Array.isArray(identifierColumns) ? identifierColumns : [identifierColumns];
  const matchedOriginalIndices = new Set<number>(); // Track which original rows have been matched

  // Try each identifier in priority order
  for (const identifierColumn of identifierArray) {
    const enrichedMap = new Map<string, number[]>(); // key -> array of indices (for duplicates)

    // Build lookup map from enriched data
    // If column mappings exist, use the mapped enriched column name
    const enrichedIdentifierColumn = columnMappings 
      ? Object.keys(columnMappings).find(enrichedCol => columnMappings[enrichedCol] === identifierColumn) || identifierColumn
      : identifierColumn;

    // Build lookup map from enriched data, tracking array indices
    const enrichedArrayInfo = new Map<number, { rawValue: string, parseResult: any }>();
    
    enrichedData.forEach((row, index) => {
      const rawValue = row[enrichedIdentifierColumn];
      
      // Parse array values (handles quoted CSV, JSON arrays, single values)
      const parseResult = parseArrayValue(rawValue);
      const columnType = getColumnType(enrichedIdentifierColumn);
      
      // Store array info for later reference
      enrichedArrayInfo.set(index, { rawValue, parseResult });
      
      // Add each array value to the map
      parseResult.values.forEach((value, arrayIndex) => {
        const key = normalizeIdentifier(value);
        if (key) {
          if (!enrichedMap.has(key)) {
            enrichedMap.set(key, []);
          }
          enrichedMap.get(key)!.push(index);
        }
      });
    });

    // Match original rows to enriched rows (skip already matched rows)
    originalData.forEach((row, originalIndex) => {
      // Skip if this row was already matched by a higher-priority identifier
      if (matchedOriginalIndices.has(originalIndex)) return;

      const originalValue = row[identifierColumn];
      const key = normalizeIdentifier(originalValue);
      
      if (key && enrichedMap.has(key)) {
        const enrichedIndices = enrichedMap.get(key)!;
        const enrichedIndex = enrichedIndices[0];
        
        // Find which array value matched
        let matchedArrayValue: string | undefined;
        const arrayInfo = enrichedArrayInfo.get(enrichedIndex);
        if (arrayInfo && arrayInfo.parseResult.values.length > 1) {
          // Find which value in the array matched
          const matchedValue = arrayInfo.parseResult.values.find((v: string) => 
            normalizeIdentifier(v) === key
          );
          if (matchedValue) {
            const arrayIndex = arrayInfo.parseResult.values.indexOf(matchedValue);
            matchedArrayValue = `${enrichedIdentifierColumn}[${arrayIndex}]: ${matchedValue.substring(0, 40)}`;
          }
        }
        
        // Use first match (handle duplicates by taking first occurrence)
        matches.push({
          originalRowIndex: originalIndex,
          enrichedRowIndex: enrichedIndex,
          confidence: 100,
          identifier: key,
          matchedBy: identifierColumn, // Track which identifier was used
          matchedArrayValue // Track which array value matched
        });
        matchedOriginalIndices.add(originalIndex);
      }
    });
  }

  return matches;
}

/**
 * Calculate detailed match instances for cross-column duplicate detection
 * Scans ALL enriched columns to find where the same value appears
 */
export function calculateMatchInstances(
  originalData: Record<string, any>[],
  enrichedData: Record<string, any>[],
  matches: MatchResult[],
  columnMappings?: Record<string, string>
): Map<number, MatchInstance[]> {
  const instanceMap = new Map<number, MatchInstance[]>();

  matches.forEach(match => {
    const instances: MatchInstance[] = [];
    const originalRow = originalData[match.originalRowIndex];
    const enrichedRow = enrichedData[match.enrichedRowIndex];

    // Scan all enriched columns to find matches
    Object.keys(enrichedRow).forEach(enrichedColumn => {
      const enrichedValue = enrichedRow[enrichedColumn];
      if (!enrichedValue) return;

      // Parse array values
      const parseResult = parseArrayValue(enrichedValue);

      // Check if any value in this enriched column matches the original identifier
      parseResult.values.forEach((value, arrayIndex) => {
        const normalizedEnriched = normalizeIdentifier(value);
        
        // Check against all original columns
        Object.keys(originalRow).forEach(originalColumn => {
          const originalValue = originalRow[originalColumn];
          if (!originalValue) return;

          const normalizedOriginal = normalizeIdentifier(originalValue);
          
          if (normalizedEnriched === normalizedOriginal) {
            instances.push({
              enrichedColumn,
              originalColumn,
              matchedValue: value,
              arrayIndex: parseResult.values.length > 1 ? arrayIndex : undefined
            });
          }
        });
      });
    });

    if (instances.length > 0) {
      instanceMap.set(match.originalRowIndex, instances);
    }
  });

  return instanceMap;
}

/**
 * Calculate match statistics (legacy - for backward compatibility)
 */
export function calculateMatchStats(
  originalData: Record<string, any>[],
  enrichedData: Record<string, any>[],
  matches: MatchResult[],
  identifierColumn: string
): MatchStats {
  // Detect duplicate matches
  const matchedEnrichedIndices = new Set(matches.map(m => m.enrichedRowIndex));
  const duplicateMatches = enrichedData.length - matchedEnrichedIndices.size;

  return {
    totalOriginalRows: originalData.length,
    totalEnrichedRows: enrichedData.length,
    matchedCount: matches.length,
    unmatchedCount: originalData.length - matches.length,
    matchRate: originalData.length > 0 ? (matches.length / originalData.length) * 100 : 0,
    duplicateMatches,
    identifierColumn
  };
}

/**
 * Calculate enhanced match statistics with unique row tracking and instance details
 */
export function calculateEnhancedMatchStats(
  originalData: Record<string, any>[],
  enrichedData: Record<string, any>[],
  matches: MatchResult[],
  matchInstances: Map<number, MatchInstance[]>,
  identifierColumn: string
): EnhancedMatchStats {
  // Count unique original rows matched (deduplicated)
  const uniqueOriginalIndices = new Set(matches.map(m => m.originalRowIndex));
  const uniqueRowsMatched = uniqueOriginalIndices.size;

  // Count total match instances (includes cross-column duplicates)
  let totalMatchInstances = 0;
  matchInstances.forEach(instances => {
    totalMatchInstances += instances.length;
  });

  // Breakdown by identifier type (email, phone, name)
  const matchInstancesByIdentifier = new Map<string, number>();
  matchInstances.forEach(instances => {
    instances.forEach(instance => {
      const identifierType = getIdentifierType(instance.enrichedColumn);
      matchInstancesByIdentifier.set(
        identifierType,
        (matchInstancesByIdentifier.get(identifierType) || 0) + 1
      );
    });
  });

  // Breakdown by enriched column
  const matchInstancesByColumn = new Map<string, number>();
  matchInstances.forEach(instances => {
    instances.forEach(instance => {
      matchInstancesByColumn.set(
        instance.enrichedColumn,
        (matchInstancesByColumn.get(instance.enrichedColumn) || 0) + 1
      );
    });
  });

  // Calculate average instances per matched row
  const averageInstancesPerRow = uniqueRowsMatched > 0 
    ? totalMatchInstances / uniqueRowsMatched 
    : 0;

  // Detect duplicate matches in enriched data
  const matchedEnrichedIndices = new Set(matches.map(m => m.enrichedRowIndex));
  const duplicateMatches = enrichedData.length - matchedEnrichedIndices.size;

  return {
    totalOriginalRows: originalData.length,
    totalEnrichedRows: enrichedData.length,
    uniqueRowsMatched, // NEW: Deduplicated count
    totalMatchInstances, // NEW: Total instances (includes duplicates)
    unmatchedCount: originalData.length - uniqueRowsMatched,
    matchRate: originalData.length > 0 ? (uniqueRowsMatched / originalData.length) * 100 : 0,
    duplicateMatches,
    identifierColumn,
    matchInstancesByIdentifier,
    matchInstancesByColumn,
    averageInstancesPerRow
  };
}

/**
 * Determine identifier type from column name
 */
function getIdentifierType(columnName: string): string {
  const lower = columnName.toLowerCase();
  if (lower.includes('email')) return 'Email';
  if (lower.includes('phone') || lower.includes('mobile') || lower.includes('direct')) return 'Phone';
  if (lower.includes('first') && lower.includes('name')) return 'First Name';
  if (lower.includes('last') && lower.includes('name')) return 'Last Name';
  if (lower.includes('name')) return 'Name';
  return 'Other';
}

/**
 * Get unmatched rows from original data
 */
export function getUnmatchedRows(
  originalData: Record<string, any>[],
  matches: MatchResult[],
  identifierColumn: string
): UnmatchedRow[] {
  const matchedIndices = new Set(matches.map(m => m.originalRowIndex));
  const unmatched: UnmatchedRow[] = [];

  originalData.forEach((row, index) => {
    if (!matchedIndices.has(index)) {
      const identifierValue = row[identifierColumn];
      const reason = !identifierValue || identifierValue === ''
        ? `Missing ${identifierColumn}`
        : `No match found for ${identifierColumn}: ${identifierValue}`;
      
      unmatched.push({
        rowIndex: index,
        data: row,
        reason
      });
    }
  });

  return unmatched;
}

/**
 * Get available identifier columns from original file
 * Returns all columns from original file that could be used for matching
 */
export function getAvailableIdentifiers(
  originalData: Record<string, any>[],
  enrichedData: Record<string, any>[]
): string[] {
  if (originalData.length === 0) {
    return [];
  }

  // Return all columns from original file
  // User can choose any column to use as identifier for matching
  const originalColumns = Object.keys(originalData[0]);
  
  return originalColumns;
}

/**
 * Calculate match quality score for an identifier column
 * Higher score = better identifier
 * NOW SCANS ALL ROWS (not just sample)
 */
export function calculateIdentifierQuality(
  originalData: Record<string, any>[],
  enrichedData: Record<string, any>[],
  column: string
): number {
  // Calculate completeness percentage (0-100)
  // This is the ACTUAL quality metric users care about
  const totalRows = originalData.length;
  if (totalRows === 0) return 0;

  // Count non-empty values in the column
  const nonEmptyValues = originalData.filter(row => {
    const value = row[column];
    return value !== null && value !== undefined && value !== '';
  }).length;

  // Calculate percentage: (non-empty / total) * 100
  const completeness = (nonEmptyValues / totalRows) * 100;

  return Math.round(completeness);
}
