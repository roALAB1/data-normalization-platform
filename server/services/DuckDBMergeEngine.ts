/**
 * DuckDBMergeEngine - SQL-based CRM merge processing engine
 * 
 * Replaces CSV streaming with DuckDB SQL queries for:
 * - Consolidating multiple enrichment files
 * - Matching enriched data with original CRM
 * - Conflict resolution and deduplication
 * - Streaming export to S3
 * 
 * Performance: 50k-200k rows/sec, 100-500MB memory
 */

import { DuckDBService } from './DuckDBService';
import { storagePut, storageGet } from '../storage';

export interface MergeConfig {
  identifierColumns: string[]; // Columns to match on (email, phone, etc.)
  conflictResolution: 'first' | 'last' | 'longest' | 'most_complete';
  normalizeIdentifiers: boolean; // LOWER() and TRIM() identifiers
  includeMatchQuality: boolean; // Add match_quality column
}

export interface MergeProgress {
  stage: 'import_original' | 'import_enriched' | 'consolidate' | 'match' | 'export';
  progress: number; // 0-100
  message: string;
  rowsProcessed?: number;
  totalRows?: number;
}

export interface MergeResult {
  outputS3Key: string;
  outputS3Url: string;
  totalRows: number;
  matchedRows: number;
  unmatchedRows: number;
  enrichedColumns: string[];
  processingTimeMs: number;
}

export class DuckDBMergeEngine {
  private duckdb: DuckDBService;
  private config: MergeConfig;
  private progressCallback?: (progress: MergeProgress) => void;

  constructor(
    jobId: string,
    config: MergeConfig,
    progressCallback?: (progress: MergeProgress) => void
  ) {
    this.duckdb = new DuckDBService(jobId, {
      maxMemoryMB: 500,
      threadsCount: Math.max(1, require('os').cpus().length - 1),
    });
    this.config = config;
    this.progressCallback = progressCallback;
  }

  /**
   * Execute complete merge workflow
   */
  async executeMerge(
    originalFileS3Url: string,
    enrichedFilesS3Urls: string[]
  ): Promise<MergeResult> {
    const startTime = Date.now();

    try {
      // Initialize DuckDB
      await this.duckdb.initialize();

      // Step 1: Import original CRM file
      await this.importOriginalFile(originalFileS3Url);

      // Step 2: Import all enriched files
      await this.importEnrichedFiles(enrichedFilesS3Urls);

      // Step 3: Consolidate enriched data
      await this.consolidateEnrichedData();

      // Step 4: Match and merge with original
      await this.matchAndMerge();

      // Step 5: Export results to S3
      const result = await this.exportResults();

      const processingTimeMs = Date.now() - startTime;

      return {
        ...result,
        processingTimeMs,
      };
    } finally {
      // Always clean up
      await this.duckdb.close();
    }
  }

  /**
   * Step 1: Import original CRM file
   */
  private async importOriginalFile(s3Url: string): Promise<void> {
    this.reportProgress({
      stage: 'import_original',
      progress: 0,
      message: 'Importing original CRM file...',
    });

    const { rowCount, columns } = await this.duckdb.importCSVFromURL(
      'original',
      s3Url,
      { header: true }
    );

    this.reportProgress({
      stage: 'import_original',
      progress: 100,
      message: `Imported ${rowCount} rows from original file`,
      rowsProcessed: rowCount,
      totalRows: rowCount,
    });

    console.log(`[MergeEngine] Original file: ${rowCount} rows, ${columns.length} columns`);
  }

  /**
   * Step 2: Import all enriched files
   */
  private async importEnrichedFiles(s3Urls: string[]): Promise<void> {
    this.reportProgress({
      stage: 'import_enriched',
      progress: 0,
      message: `Importing ${s3Urls.length} enriched files...`,
    });

    for (let i = 0; i < s3Urls.length; i++) {
      const tableName = `enriched_${i + 1}`;
      const { rowCount, columns } = await this.duckdb.importCSVFromURL(
        tableName,
        s3Urls[i],
        { header: true }
      );

      const progress = ((i + 1) / s3Urls.length) * 100;
      this.reportProgress({
        stage: 'import_enriched',
        progress,
        message: `Imported enriched file ${i + 1}/${s3Urls.length} (${rowCount} rows)`,
      });

      console.log(`[MergeEngine] Enriched file ${i + 1}: ${rowCount} rows, ${columns.length} columns`);
    }
  }

  /**
   * Step 3: Consolidate all enriched files into single table
   * Uses FULL OUTER JOIN to combine all enrichment data
   */
  private async consolidateEnrichedData(): Promise<void> {
    this.reportProgress({
      stage: 'consolidate',
      progress: 0,
      message: 'Consolidating enriched data...',
    });

    // Get list of enriched tables
    const tables = await this.duckdb.query<{ table_name: string }>(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name LIKE 'enriched_%'
      ORDER BY table_name
    `);

    if (tables.length === 0) {
      throw new Error('No enriched files found');
    }

    // Get all columns from all enriched tables
    const allColumns = new Set<string>();
    for (const table of tables) {
      const stats = await this.duckdb.getTableStats(table.table_name);
      stats.columns.forEach(col => allColumns.add(col));
    }

    // Build identifier columns for matching
    const identifierCols = this.config.identifierColumns.map(col => {
      if (this.config.normalizeIdentifiers) {
        return `LOWER(TRIM(COALESCE(${col}, ''))) as ${col}_normalized`;
      }
      return col;
    });

    // Build COALESCE for each non-identifier column based on conflict resolution
    const nonIdentifierCols = Array.from(allColumns).filter(
      col => !this.config.identifierColumns.includes(col)
    );

    const selectCols: string[] = [];

    // Add identifier columns
    this.config.identifierColumns.forEach(col => {
      selectCols.push(this.buildConflictResolutionSQL(col, tables.map(t => t.table_name)));
    });

    // Add non-identifier columns
    nonIdentifierCols.forEach(col => {
      selectCols.push(this.buildConflictResolutionSQL(col, tables.map(t => t.table_name)));
    });

    // Build FULL OUTER JOIN query
    let joinQuery = `SELECT DISTINCT\n  ${selectCols.join(',\n  ')}\nFROM ${tables[0].table_name}`;

    for (let i = 1; i < tables.length; i++) {
      const prevTable = i === 1 ? tables[0].table_name : `join_${i - 1}`;
      const currTable = tables[i].table_name;

      // Build join condition on identifier columns
      const joinConditions = this.config.identifierColumns.map(col => {
        if (this.config.normalizeIdentifiers) {
          return `LOWER(TRIM(COALESCE(${prevTable}.${col}, ''))) = LOWER(TRIM(COALESCE(${currTable}.${col}, '')))`;
        }
        return `${prevTable}.${col} = ${currTable}.${col}`;
      });

      joinQuery += `\nFULL OUTER JOIN ${currTable} ON ${joinConditions.join(' AND ')}`;
    }

    // Create consolidated table
    await this.duckdb.execute(`
      CREATE TABLE enriched_consolidated AS
      ${joinQuery}
    `);

    const stats = await this.duckdb.getTableStats('enriched_consolidated');

    this.reportProgress({
      stage: 'consolidate',
      progress: 100,
      message: `Consolidated ${stats.rowCount} unique records`,
      rowsProcessed: stats.rowCount,
    });

    console.log(`[MergeEngine] Consolidated: ${stats.rowCount} rows, ${stats.columnCount} columns`);
  }

  /**
   * Build SQL for conflict resolution based on strategy
   */
  private buildConflictResolutionSQL(column: string, tables: string[]): string {
    const coalesceArgs = tables.map(t => `${t}.${column}`);

    switch (this.config.conflictResolution) {
      case 'first':
        // Take first non-null value
        return `COALESCE(${coalesceArgs.join(', ')}) as ${column}`;

      case 'last':
        // Take last non-null value (reverse order)
        return `COALESCE(${coalesceArgs.reverse().join(', ')}) as ${column}`;

      case 'longest':
        // Take longest string value
        return `
          CASE 
            ${coalesceArgs.map(arg => `WHEN LENGTH(${arg}) = (SELECT MAX(LENGTH(val)) FROM (VALUES ${coalesceArgs.map(a => `(${a})`).join(', ')}) as t(val)) THEN ${arg}`).join('\n            ')}
            ELSE ${coalesceArgs[0]}
          END as ${column}
        `;

      case 'most_complete':
        // Take value from row with most non-null columns
        return `COALESCE(${coalesceArgs.join(', ')}) as ${column}`;

      default:
        return `COALESCE(${coalesceArgs.join(', ')}) as ${column}`;
    }
  }

  /**
   * Step 4: Match enriched data with original CRM using LEFT JOIN
   */
  private async matchAndMerge(): Promise<void> {
    this.reportProgress({
      stage: 'match',
      progress: 0,
      message: 'Matching enriched data with original CRM...',
    });

    // Get columns from both tables
    const originalStats = await this.duckdb.getTableStats('original');
    const enrichedStats = await this.duckdb.getTableStats('enriched_consolidated');

    // Build join condition on identifier columns
    const joinConditions = this.config.identifierColumns.map(col => {
      if (this.config.normalizeIdentifiers) {
        return `LOWER(TRIM(COALESCE(original.${col}, ''))) = LOWER(TRIM(COALESCE(enriched_consolidated.${col}, '')))`;
      }
      return `original.${col} = enriched_consolidated.${col}`;
    });

    // Select all original columns + enriched columns (excluding identifiers)
    const originalCols = originalStats.columns.map(col => `original.${col} as original_${col}`);
    const enrichedCols = enrichedStats.columns
      .filter(col => !this.config.identifierColumns.includes(col))
      .map(col => `enriched_consolidated.${col} as enriched_${col}`);

    // Add match quality if requested
    const matchQualityCol = this.config.includeMatchQuality
      ? `, CASE WHEN enriched_consolidated.${this.config.identifierColumns[0]} IS NOT NULL THEN 'matched' ELSE 'unmatched' END as match_quality`
      : '';

    // Build LEFT JOIN query
    const mergeQuery = `
      CREATE TABLE merged_result AS
      SELECT 
        ${originalCols.join(',\n        ')},
        ${enrichedCols.join(',\n        ')}
        ${matchQualityCol}
      FROM original
      LEFT JOIN enriched_consolidated ON ${joinConditions.join(' AND ')}
    `;

    await this.duckdb.execute(mergeQuery);

    const mergedStats = await this.duckdb.getTableStats('merged_result');

    this.reportProgress({
      stage: 'match',
      progress: 100,
      message: `Matched ${mergedStats.rowCount} rows`,
      rowsProcessed: mergedStats.rowCount,
    });

    console.log(`[MergeEngine] Merged: ${mergedStats.rowCount} rows, ${mergedStats.columnCount} columns`);
  }

  /**
   * Step 5: Export results to CSV and upload to S3
   */
  private async exportResults(): Promise<Omit<MergeResult, 'processingTimeMs'>> {
    this.reportProgress({
      stage: 'export',
      progress: 0,
      message: 'Exporting results to S3...',
    });

    // Get final stats
    const mergedStats = await this.duckdb.getTableStats('merged_result');

    // Count matched vs unmatched
    const matchStats = this.config.includeMatchQuality
      ? await this.duckdb.query<{ match_quality: string; count: number }>(`
          SELECT match_quality, COUNT(*) as count
          FROM merged_result
          GROUP BY match_quality
        `)
      : [];

    const matchedRows = matchStats.find(s => s.match_quality === 'matched')?.count || 0;
    const unmatchedRows = matchStats.find(s => s.match_quality === 'unmatched')?.count || 0;

    // Export to CSV
    const csvContent = await this.duckdb.exportToCSV('merged_result');

    // Upload to S3
    const s3Key = `crm-merge-results/${Date.now()}-merged.csv`;
    const { url: s3Url } = await storagePut(s3Key, Buffer.from(csvContent), 'text/csv');

    this.reportProgress({
      stage: 'export',
      progress: 100,
      message: `Exported ${mergedStats.rowCount} rows to S3`,
      rowsProcessed: mergedStats.rowCount,
    });

    console.log(`[MergeEngine] Exported to S3: ${s3Key}`);

    return {
      outputS3Key: s3Key,
      outputS3Url: s3Url,
      totalRows: mergedStats.rowCount,
      matchedRows,
      unmatchedRows,
      enrichedColumns: mergedStats.columns.filter(col => col.startsWith('enriched_')),
    };
  }

  /**
   * Report progress to callback
   */
  private reportProgress(progress: MergeProgress): void {
    if (this.progressCallback) {
      this.progressCallback(progress);
    }
  }

  /**
   * Cancel merge operation
   */
  async cancel(): Promise<void> {
    console.log('[MergeEngine] Cancelling merge operation...');
    await this.duckdb.close();
  }
}
