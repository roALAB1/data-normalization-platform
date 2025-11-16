/**
 * Conflict Resolution Engine for CRM Sync Mapper
 * Handles conflicts when original and enriched data have different values for the same field
 */

import type { MatchResult } from "./matchingEngine";

export interface Conflict {
  rowIndex: number;
  column: string;
  originalValue: any;
  enrichedValue: any;
  enrichedFileId: string;
  enrichedFileName: string;
}

export type ResolutionStrategy =
  | "keep_original" // Ignore enriched value
  | "use_enriched" // Overwrite with enriched value (was "replace")
  | "create_alternate"; // Add as Column_Alt

export interface ResolutionConfig {
  defaultStrategy: ResolutionStrategy;
  columnStrategies: Record<string, ResolutionStrategy>; // Per-column overrides
  alternateFieldSuffix: string; // "_Alt" or "_Secondary"
}

export interface ConflictSummary {
  totalConflicts: number;
  conflictsByColumn: Record<string, number>;
  conflictsByFile: Record<string, number>;
}

/**
 * Detect conflicts between original and enriched data
 */
export function detectConflicts(
  originalData: Record<string, any>[],
  enrichedData: Record<string, any>[],
  matches: MatchResult[],
  enrichedFileId: string,
  enrichedFileName: string
): Conflict[] {
  const conflicts: Conflict[] = [];

  matches.forEach((match) => {
    const originalRow = originalData[match.originalRowIndex];
    const enrichedRow = enrichedData[match.enrichedRowIndex];

    // Check each column for conflicts
    Object.keys(enrichedRow).forEach((column) => {
      if (column in originalRow) {
        const originalValue = normalizeValue(originalRow[column]);
        const enrichedValue = normalizeValue(enrichedRow[column]);

        // Conflict exists if both values exist and are different
        if (originalValue && enrichedValue && originalValue !== enrichedValue) {
          conflicts.push({
            rowIndex: match.originalRowIndex,
            column,
            originalValue: originalRow[column],
            enrichedValue: enrichedRow[column],
            enrichedFileId,
            enrichedFileName,
          });
        }
      }
    });
  });

  return conflicts;
}

/**
 * Normalize value for comparison
 */
function normalizeValue(value: any): string {
  if (value === null || value === undefined) return "";

  return String(value)
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

/**
 * Calculate conflict summary statistics
 */
export function calculateConflictSummary(conflicts: Conflict[]): ConflictSummary {
  const conflictsByColumn: Record<string, number> = {};
  const conflictsByFile: Record<string, number> = {};

  conflicts.forEach((conflict) => {
    // Count by column
    if (!conflictsByColumn[conflict.column]) {
      conflictsByColumn[conflict.column] = 0;
    }
    conflictsByColumn[conflict.column]++;

    // Count by file
    if (!conflictsByFile[conflict.enrichedFileName]) {
      conflictsByFile[conflict.enrichedFileName] = 0;
    }
    conflictsByFile[conflict.enrichedFileName]++;
  });

  return {
    totalConflicts: conflicts.length,
    conflictsByColumn,
    conflictsByFile,
  };
}

/**
 * Get unique columns that have conflicts
 */
export function getConflictColumns(conflicts: Conflict[]): string[] {
  const columns = new Set(conflicts.map((c) => c.column));
  return Array.from(columns).sort();
}

/**
 * Resolve conflicts and merge enriched data into original data
 */
export function resolveConflicts(
  originalData: Record<string, any>[],
  enrichedData: Record<string, any>[],
  matches: MatchResult[],
  conflicts: Conflict[],
  config: ResolutionConfig,
  enrichedFileId: string
): Record<string, any>[] {
  // Deep clone original data
  const resolvedData = JSON.parse(JSON.stringify(originalData));

  // Create conflict lookup for fast access
  const conflictMap = new Map<string, Conflict>();
  conflicts
    .filter((c) => c.enrichedFileId === enrichedFileId)
    .forEach((conflict) => {
      const key = `${conflict.rowIndex}-${conflict.column}`;
      conflictMap.set(key, conflict);
    });

  // Apply enriched data with conflict resolution
  matches.forEach((match) => {
    const originalRow = resolvedData[match.originalRowIndex];
    const enrichedRow = enrichedData[match.enrichedRowIndex];

    Object.keys(enrichedRow).forEach((column) => {
      const conflictKey = `${match.originalRowIndex}-${column}`;
      const conflict = conflictMap.get(conflictKey);

      if (conflict) {
        // Conflict exists - apply resolution strategy
        const strategy = config.columnStrategies[column] || config.defaultStrategy;
        applyResolutionStrategy(originalRow, column, enrichedRow[column], strategy, config);
      } else if (!(column in originalRow) || !originalRow[column]) {
        // No conflict - just add the enriched value
        originalRow[column] = enrichedRow[column];
      }
    });
  });

  return resolvedData;
}

/**
 * Apply resolution strategy to a single field
 */
function applyResolutionStrategy(
  row: Record<string, any>,
  column: string,
  enrichedValue: any,
  strategy: ResolutionStrategy,
  config: ResolutionConfig
): void {
  switch (strategy) {
    case "keep_original":
      // Do nothing - keep original value
      break;

    case "use_enriched":
      // Overwrite with enriched value
      row[column] = enrichedValue;
      break;

    case "create_alternate":
      // Create alternate field
      const altColumn = `${column}${config.alternateFieldSuffix}`;
      row[altColumn] = enrichedValue;
      break;
  }
}

/**
 * Merge multiple values into a single field (comma-separated)
 */
export function mergeMultipleValues(values: any[]): string {
  const uniqueValues = Array.from(new Set(values.filter((v) => v !== null && v !== undefined && v !== "")));
  return uniqueValues.join(", ");
}

/**
 * Get conflicts for a specific column
 */
export function getConflictsForColumn(conflicts: Conflict[], column: string): Conflict[] {
  return conflicts.filter((c) => c.column === column);
}

/**
 * Get conflicts for a specific file
 */
export function getConflictsForFile(conflicts: Conflict[], fileId: string): Conflict[] {
  return conflicts.filter((c) => c.enrichedFileId === fileId);
}

/**
 * Export conflicts to CSV format
 */
export function exportConflictsToCSV(conflicts: Conflict[]): string {
  if (conflicts.length === 0) return "";

  const headers = ["Row #", "Column", "Original Value", "Enriched Value", "Source File"];
  const rows = conflicts.map((c) => [
    c.rowIndex + 1,
    c.column,
    c.originalValue,
    c.enrichedValue,
    c.enrichedFileName,
  ]);

  return [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n");
}
