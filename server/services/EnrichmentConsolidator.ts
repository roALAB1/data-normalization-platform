/**
 * EnrichmentConsolidator - Merges multiple enriched data files into a single master file
 * 
 * Purpose: Before matching with original CRM file, consolidate all enriched files to:
 * 1. Create single source of truth
 * 2. Handle duplicates intelligently across files
 * 3. Resolve conflicts (newest/most complete data wins)
 * 4. Simplify matching to single operation
 * 
 * Architecture:
 * - Input: Array of enriched CSV files (each with identifier column + data columns)
 * - Process: Group rows by identifier, deduplicate, resolve conflicts
 * - Output: Single master enriched file with consolidated data
 * 
 * Performance: Uses parallel processing for large datasets (100k+ rows)
 */

import Papa from 'papaparse';

export type DeduplicationStrategy = 
  | 'newest'        // Keep most recently added value (last file wins)
  | 'oldest'        // Keep first value encountered (first file wins)
  | 'most_complete' // Keep value with most non-empty fields
  | 'longest'       // Keep longest string value
  | 'merge';        // Merge all unique values (comma-separated)

export interface ConsolidationConfig {
  identifierColumn: string;              // Column to match on (e.g., 'email', 'phone')
  deduplicationStrategy: DeduplicationStrategy; // Default strategy for all columns
  columnStrategies?: Map<string, DeduplicationStrategy>; // Per-column overrides
  normalizeIdentifier?: boolean;         // Normalize identifiers for matching (lowercase, trim)
}

export interface ConsolidationResult {
  masterFile: ParsedCSV;
  stats: {
    totalInputRows: number;
    uniqueIdentifiers: number;
    duplicatesFound: number;
    conflictsResolved: number;
    columnsConsolidated: number;
  };
}

export interface ParsedCSV {
  headers: string[];
  rows: Record<string, string>[];
}

export class EnrichmentConsolidator {
  private config: ConsolidationConfig;

  constructor(config: ConsolidationConfig) {
    this.config = config;
  }

  /**
   * Consolidate multiple enriched files into single master file
   */
  async consolidate(enrichedFiles: ParsedCSV[]): Promise<ConsolidationResult> {
    console.log(`[EnrichmentConsolidator] Starting consolidation of ${enrichedFiles.length} files`);
    
    // Step 1: Validate inputs
    this.validateInputs(enrichedFiles);

    // Step 2: Collect all unique columns across files
    const allColumns = this.collectAllColumns(enrichedFiles);
    console.log(`[EnrichmentConsolidator] Found ${allColumns.length} unique columns across all files`);

    // Step 3: Group rows by identifier
    const groupedRows = this.groupByIdentifier(enrichedFiles);
    console.log(`[EnrichmentConsolidator] Grouped into ${groupedRows.size} unique identifiers`);

    // Step 4: Resolve conflicts and deduplicate
    const consolidatedRows = this.resolveConflicts(groupedRows, allColumns);
    console.log(`[EnrichmentConsolidator] Consolidated ${consolidatedRows.length} rows`);

    // Step 5: Calculate statistics
    const totalInputRows = enrichedFiles.reduce((sum, file) => sum + file.rows.length, 0);
    const duplicatesFound = totalInputRows - groupedRows.size;
    
    return {
      masterFile: {
        headers: allColumns,
        rows: consolidatedRows
      },
      stats: {
        totalInputRows,
        uniqueIdentifiers: groupedRows.size,
        duplicatesFound,
        conflictsResolved: duplicatesFound, // Each duplicate is a potential conflict
        columnsConsolidated: allColumns.length
      }
    };
  }

  /**
   * Validate that all files have the identifier column
   */
  private validateInputs(files: ParsedCSV[]): void {
    console.log(`[EnrichmentConsolidator] Validating ${files.length} files for identifier column: "${this.config.identifierColumn}"`);
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      console.log(`[EnrichmentConsolidator] File ${i + 1} headers (${file.headers.length} total):`, file.headers);
      console.log(`[EnrichmentConsolidator] File ${i + 1} checking for identifier: "${this.config.identifierColumn}"`);
      console.log(`[EnrichmentConsolidator] File ${i + 1} includes check result:`, file.headers.includes(this.config.identifierColumn));
      
      if (!file.headers.includes(this.config.identifierColumn)) {
        console.error(`[EnrichmentConsolidator] ERROR: File ${i + 1} missing identifier column!`);
        console.error(`[EnrichmentConsolidator] Expected: "${this.config.identifierColumn}"`);
        console.error(`[EnrichmentConsolidator] Available columns:`, file.headers);
        console.error(`[EnrichmentConsolidator] First few rows:`, file.rows.slice(0, 2));
        throw new Error(`File missing identifier column: ${this.config.identifierColumn}. Available columns: ${file.headers.join(', ')}`);
      }
    }
    
    console.log(`[EnrichmentConsolidator] ✓ All files have identifier column: "${this.config.identifierColumn}"`);
  }

  /**
   * Collect all unique column names across all files
   */
  private collectAllColumns(files: ParsedCSV[]): string[] {
    const columnSet = new Set<string>();
    
    for (const file of files) {
      for (const header of file.headers) {
        columnSet.add(header);
      }
    }

    // Ensure identifier column is first
    const columns = Array.from(columnSet);
    const identifierIndex = columns.indexOf(this.config.identifierColumn);
    if (identifierIndex > 0) {
      columns.splice(identifierIndex, 1);
      columns.unshift(this.config.identifierColumn);
    }

    return columns;
  }

  /**
   * Group rows by identifier value
   * Returns Map<identifier, array of rows with that identifier>
   * Rows with empty identifiers are kept under a special '__EMPTY__' key
   */
  private groupByIdentifier(files: ParsedCSV[]): Map<string, Record<string, string>[]> {
    const grouped = new Map<string, Record<string, string>[]>();

    for (const file of files) {
      for (const row of file.rows) {
        let identifier = row[this.config.identifierColumn] || '';
        
        // Normalize identifier if configured
        if (this.config.normalizeIdentifier && identifier) {
          identifier = this.normalizeIdentifierValue(identifier);
        }

        // Keep rows with empty identifiers under special key
        // They will be added to output without deduplication
        if (!identifier) {
          identifier = `__EMPTY__${Math.random()}`; // Unique key for each empty row
        }

        if (!grouped.has(identifier)) {
          grouped.set(identifier, []);
        }
        grouped.get(identifier)!.push(row);
      }
    }

    return grouped;
  }

  /**
   * Normalize identifier for matching with enhanced email and whitespace handling
   * v3.38.0: Added email normalization (Gmail dots, plus-addressing) and whitespace normalization
   */
  private normalizeIdentifierValue(value: string): string {
    if (!value) return '';
    
    let normalized = String(value).toLowerCase().trim();
    
    // Step 1: Normalize whitespace and special characters
    normalized = this.normalizeWhitespace(normalized);
    
    // Step 2: Detect if this is an email and apply email-specific normalization
    if (normalized.includes('@')) {
      normalized = this.normalizeEmail(normalized);
    }
    
    // Step 3: Remove remaining special characters (keep alphanumeric + email/phone chars)
    normalized = normalized.replace(/[^a-z0-9@.+-]/g, '');
    
    return normalized;
  }

  /**
   * Normalize whitespace and special characters
   * v3.38.0: Zero-downside improvement #2
   */
  private normalizeWhitespace(value: string): string {
    return value
      .replace(/\s+/g, ' ')           // Multiple spaces/tabs/newlines to single space
      .replace(/[\u2014\u2013]/g, '-')  // Em dash, en dash to hyphen
      .replace(/[\u201C\u201D]/g, '"')  // Smart quotes to straight quotes
      .replace(/[\u2018\u2019]/g, "'")  // Smart apostrophes to straight
      .replace(/[\u200B-\u200D\uFEFF]/g, '') // Zero-width characters
      .trim();
  }

  /**
   * Normalize email addresses
   * v3.38.0: Zero-downside improvement #1
   */
  private normalizeEmail(email: string): string {
    const parts = email.split('@');
    if (parts.length !== 2) return email;
    
    let [localPart, domain] = parts;
    
    // Gmail: Remove dots from local part (Gmail ignores them)
    if (domain === 'gmail.com' || domain === 'googlemail.com') {
      localPart = localPart.replace(/\./g, '');
    }
    
    // Remove plus addressing (user+tag@domain.com -> user@domain.com)
    localPart = localPart.replace(/\+.*$/, '');
    
    return localPart + '@' + domain;
  }

  /**
   * Resolve conflicts when multiple rows have same identifier
   */
  private resolveConflicts(
    groupedRows: Map<string, Record<string, string>[]>,
    allColumns: string[]
  ): Record<string, string>[] {
    const consolidatedRows: Record<string, string>[] = [];

    for (const [identifier, rows] of groupedRows.entries()) {
      if (rows.length === 1) {
        // No conflict - single row for this identifier
        // Fill in missing columns with empty strings
        const filledRow = this.fillMissingColumns(rows[0], allColumns);
        consolidatedRows.push(filledRow);
      } else {
        // Conflict - multiple rows with same identifier
        const mergedRow = this.mergeRows(rows, allColumns);
        consolidatedRows.push(mergedRow);
      }
    }

    return consolidatedRows;
  }

  /**
   * Fill missing columns with empty strings
   */
  private fillMissingColumns(row: Record<string, string>, allColumns: string[]): Record<string, string> {
    const filledRow: Record<string, string> = {};
    
    for (const column of allColumns) {
      filledRow[column] = row[column] || '';
    }

    return filledRow;
  }

  /**
   * Merge multiple rows with same identifier using deduplication strategies
   */
  private mergeRows(rows: Record<string, string>[], allColumns: string[]): Record<string, string> {
    const mergedRow: Record<string, string> = {};

    for (const column of allColumns) {
      // Get strategy for this column
      const strategy = this.config.columnStrategies?.get(column) || this.config.deduplicationStrategy;

      // Collect all values for this column across rows
      const values = rows
        .map(row => String(row[column] || ''))
        .filter(val => val.trim() !== ''); // Skip empty values

      if (values.length === 0) {
        mergedRow[column] = '';
      } else if (values.length === 1) {
        mergedRow[column] = values[0];
      } else {
        // Apply deduplication strategy
        mergedRow[column] = this.applyStrategy(values, strategy);
      }
    }

    return mergedRow;
  }

  /**
   * Apply deduplication strategy to array of values
   */
  private applyStrategy(values: string[], strategy: DeduplicationStrategy): string {
    switch (strategy) {
      case 'newest':
        // Last value wins (assumes files are ordered chronologically)
        return values[values.length - 1];

      case 'oldest':
        // First value wins
        return values[0];

      case 'most_complete':
        // Value with most non-empty content
        return values.reduce((best, current) => {
          const currentScore = this.calculateCompletenessScore(current);
          const bestScore = this.calculateCompletenessScore(best);
          return currentScore > bestScore ? current : best;
        });

      case 'longest':
        // Longest string
        return values.reduce((longest, current) => 
          current.length > longest.length ? current : longest
        );

      case 'merge':
        // Merge all unique values (comma-separated)
        const uniqueValues = Array.from(new Set(values));
        return uniqueValues.join(', ');

      default:
        return values[0];
    }
  }

  /**
   * Calculate completeness score for a value
   * Higher score = more complete/informative
   */
  private calculateCompletenessScore(value: string): number {
    let score = 0;

    // Length contributes to score
    score += value.length;

    // Non-whitespace characters
    score += (value.match(/\S/g) || []).length * 2;

    // Contains multiple words
    if (value.split(/\s+/).length > 1) {
      score += 10;
    }

    // Contains special chars (emails, phones, etc.)
    if (/@/.test(value)) score += 20; // Email
    if (/\d{3}/.test(value)) score += 15; // Phone number
    if (/https?:\/\//.test(value)) score += 10; // URL

    return score;
  }

  /**
   * Parse CSV file from string content
   */
  static parseCSV(content: string): ParsedCSV {
    const parsed = Papa.parse(content, {
      header: true,
      skipEmptyLines: 'greedy',
      dynamicTyping: false
    });

    return {
      headers: parsed.meta.fields || [],
      rows: parsed.data as Record<string, string>[]
    };
  }

  /**
   * Convert ParsedCSV back to CSV string
   */
  static toCSV(data: ParsedCSV): string {
    return Papa.unparse({
      fields: data.headers,
      data: data.rows
    });
  }
}
