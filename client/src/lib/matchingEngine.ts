/**
 * Matching Engine for CRM Sync Mapper
 * Intelligently matches enriched data rows back to original CRM rows
 */

export interface MatchResult {
  originalRowIndex: number;
  enrichedRowIndex: number;
  confidence: number; // 0-100
  identifier: string; // value used for matching
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
 * Auto-detect the best identifier column from the data
 * Priority: Email > Phone > ID > Name+ZIP
 */
export function autoDetectIdentifier(
  originalData: Record<string, any>[],
  enrichedData: Record<string, any>[]
): string | null {
  if (originalData.length === 0 || enrichedData.length === 0) {
    return null;
  }

  const originalColumns = Object.keys(originalData[0]);
  const enrichedColumns = Object.keys(enrichedData[0]);
  
  // Find common columns
  const commonColumns = originalColumns.filter(col => 
    enrichedColumns.includes(col)
  );

  if (commonColumns.length === 0) {
    return null;
  }

  // Priority 1: Email (highest priority - unique, reliable)
  const emailCol = commonColumns.find(col => 
    /email/i.test(col) && hasUniqueValues(originalData, col) && hasUniqueValues(enrichedData, col)
  );
  if (emailCol) return emailCol;

  // Priority 2: Phone
  const phoneCol = commonColumns.find(col => 
    /phone/i.test(col) && hasUniqueValues(originalData, col) && hasUniqueValues(enrichedData, col)
  );
  if (phoneCol) return phoneCol;

  // Priority 3: ID/Customer ID
  const idCol = commonColumns.find(col => 
    /^id$|customer.*id|contact.*id/i.test(col) && hasUniqueValues(originalData, col)
  );
  if (idCol) return idCol;

  // Priority 4: First common column with unique values
  const uniqueCol = commonColumns.find(col => 
    hasUniqueValues(originalData, col) && hasUniqueValues(enrichedData, col)
  );
  if (uniqueCol) return uniqueCol;

  // Fallback: First common column
  return commonColumns[0];
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
 * Match enriched rows to original rows using the identifier column
 */
export function matchRows(
  originalData: Record<string, any>[],
  enrichedData: Record<string, any>[],
  identifierColumn: string
): MatchResult[] {
  const matches: MatchResult[] = [];
  const enrichedMap = new Map<string, number[]>(); // key -> array of indices (for duplicates)

  // Build lookup map from enriched data
  enrichedData.forEach((row, index) => {
    const key = normalizeIdentifier(row[identifierColumn]);
    if (key) {
      if (!enrichedMap.has(key)) {
        enrichedMap.set(key, []);
      }
      enrichedMap.get(key)!.push(index);
    }
  });

  // Match original rows to enriched rows
  originalData.forEach((row, originalIndex) => {
    const key = normalizeIdentifier(row[identifierColumn]);
    if (key && enrichedMap.has(key)) {
      const enrichedIndices = enrichedMap.get(key)!;
      
      // Use first match (handle duplicates by taking first occurrence)
      matches.push({
        originalRowIndex: originalIndex,
        enrichedRowIndex: enrichedIndices[0],
        confidence: 100,
        identifier: key
      });
    }
  });

  return matches;
}

/**
 * Calculate match statistics
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
 * Get available identifier columns (common columns between original and enriched)
 */
export function getAvailableIdentifiers(
  originalData: Record<string, any>[],
  enrichedData: Record<string, any>[]
): string[] {
  if (originalData.length === 0 || enrichedData.length === 0) {
    return [];
  }

  const originalColumns = Object.keys(originalData[0]);
  const enrichedColumns = Object.keys(enrichedData[0]);
  
  return originalColumns.filter(col => enrichedColumns.includes(col));
}

/**
 * Calculate match quality score for an identifier column
 * Higher score = better identifier
 */
export function calculateIdentifierQuality(
  originalData: Record<string, any>[],
  enrichedData: Record<string, any>[],
  column: string
): number {
  let score = 0;

  // Check uniqueness in original data (40 points)
  const originalValues = originalData.map(row => row[column]).filter(Boolean);
  const originalUniqueness = originalValues.length > 0 
    ? new Set(originalValues).size / originalValues.length 
    : 0;
  score += originalUniqueness * 40;

  // Check uniqueness in enriched data (40 points)
  const enrichedValues = enrichedData.map(row => row[column]).filter(Boolean);
  const enrichedUniqueness = enrichedValues.length > 0 
    ? new Set(enrichedValues).size / enrichedValues.length 
    : 0;
  score += enrichedUniqueness * 40;

  // Bonus for common identifier types (20 points)
  if (/email/i.test(column)) score += 20;
  else if (/phone/i.test(column)) score += 15;
  else if (/^id$|customer.*id/i.test(column)) score += 18;

  return Math.round(score);
}
