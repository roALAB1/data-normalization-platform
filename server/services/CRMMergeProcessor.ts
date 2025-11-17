/**
 * CRM Merge Processor
 * Server-side batch processing for CRM file merging with enrichment data
 * 
 * TWO-PHASE ARCHITECTURE (v3.36.0):
 * Phase 1: Consolidate all enriched files into single master enriched file
 * Phase 2: Match master enriched file with original CRM file
 * 
 * Benefits:
 * - Single source of truth for enriched data
 * - Intelligent deduplication across enriched files
 * - Conflict resolution (newest/most complete data wins)
 * - Simpler matching (one operation instead of multiple)
 * - Better match rates and data quality
 */

import Papa from 'papaparse';
import { Readable } from 'stream';
import type { 
  CRMMergeJobData, 
  CRMMergeProgress, 
  CRMMergeResult,
  FileMetadata,
  InputMapping,
  ColumnConfig 
} from '../../shared/crmMergeTypes';
import type { ArrayHandlingStrategy } from '../../client/src/lib/arrayParser';
import { EnrichmentConsolidator, type ParsedCSV, type ConsolidationConfig } from './EnrichmentConsolidator';

/**
 * Match result for a single row
 */
interface MatchResult {
  originalRowIndex: number;
  enrichedRowIndex: number;
  matchedOn: string[];
  confidence: number;
}

/**
 * CRM Merge Processor
 * Handles server-side merging of original CSV with enriched data files
 */
export class CRMMergeProcessor {
  private jobData: CRMMergeJobData;
  private progressCallback?: (progress: CRMMergeProgress) => void;
  private startTime: number = 0;

  constructor(jobData: CRMMergeJobData, progressCallback?: (progress: CRMMergeProgress) => void) {
    this.jobData = jobData;
    this.progressCallback = progressCallback;
  }

  /**
   * Main processing method - TWO-PHASE APPROACH
   */
  async process(): Promise<CRMMergeResult> {
    this.startTime = Date.now();

    try {
      // ========================================
      // PHASE 1: CONSOLIDATE ENRICHED FILES
      // ========================================
      this.reportProgress({
        stage: 'parsing',
        rowsProcessed: 0,
        totalRows: this.jobData.originalFile.rowCount,
        percentage: 0,
        message: 'Phase 1: Parsing and consolidating enriched files...'
      });

      const originalData = await this.downloadAndParse(this.jobData.originalFile);
      const enrichedDataSets = await Promise.all(
        this.jobData.enrichedFiles.map(file => this.downloadAndParse(file))
      );

      console.log(`[CRMMergeProcessor] Phase 1: Consolidating ${enrichedDataSets.length} enriched files...`);
      
      const consolidationResult = await this.consolidateEnrichedFiles(enrichedDataSets);
      const masterEnrichedData = consolidationResult.masterFile.rows;

      console.log(`[CRMMergeProcessor] Phase 1 complete:`);
      console.log(`  - Input files: ${enrichedDataSets.length}`);
      console.log(`  - Total input rows: ${consolidationResult.stats.totalInputRows}`);
      console.log(`  - Unique identifiers: ${consolidationResult.stats.uniqueIdentifiers}`);
      console.log(`  - Duplicates resolved: ${consolidationResult.stats.duplicatesFound}`);
      console.log(`  - Master enriched rows: ${masterEnrichedData.length}`);

      // ========================================
      // PHASE 2: MATCH WITH ORIGINAL FILE
      // ========================================
      this.reportProgress({
        stage: 'matching',
        rowsProcessed: 0,
        totalRows: originalData.length,
        percentage: 20,
        message: 'Phase 2: Matching with original CRM file...'
      });

      const matchResults = this.matchWithMasterFile(originalData, masterEnrichedData);
      
      console.log(`[CRMMergeProcessor] Phase 2 complete:`);
      console.log(`  - Original rows: ${originalData.length}`);
      console.log(`  - Total matches: ${matchResults.length}`);
      
      // Calculate match rate
      const uniqueOriginalMatches = new Set(matchResults.map(m => m.originalRowIndex)).size;
      const matchRate = ((uniqueOriginalMatches / originalData.length) * 100).toFixed(1);
      console.log(`  - Match rate: ${uniqueOriginalMatches}/${originalData.length} (${matchRate}%)`);
      
      if (matchResults.length === 0) {
        console.error('[CRMMergeProcessor] WARNING: NO MATCHES FOUND! Check identifier mapping.');
      }

      // Stage 3: Merge data
      this.reportProgress({
        stage: 'merging',
        rowsProcessed: 0,
        totalRows: originalData.length,
        percentage: 60,
        message: 'Merging data with conflict resolution...'
      });

      const mergedData = this.mergeDataWithMaster(originalData, masterEnrichedData, matchResults);

      // Stage 4: Apply column selection
      this.reportProgress({
        stage: 'writing',
        rowsProcessed: 0,
        totalRows: mergedData.length,
        percentage: 80,
        message: 'Applying column selection...'
      });

      const finalData = this.applyColumnSelection(mergedData);

      // Stage 5: Generate CSV
      this.reportProgress({
        stage: 'writing',
        rowsProcessed: mergedData.length,
        totalRows: mergedData.length,
        percentage: 90,
        message: 'Generating output CSV...'
      });

      const outputCSV = this.generateCSV(finalData);

      // Complete
      const duration = ((Date.now() - this.startTime) / 1000).toFixed(1);
      this.reportProgress({
        stage: 'complete',
        rowsProcessed: mergedData.length,
        totalRows: mergedData.length,
        percentage: 100,
        message: `Complete! Processed ${mergedData.length.toLocaleString()} rows in ${duration}s`
      });

      return {
        success: true,
        outputFileKey: 'temp-key', // TODO: Upload to S3
        outputFileUrl: outputCSV, // Return CSV content for testing (in production, upload to S3 and return URL)
        outputRowCount: finalData.length,
        matchStats: {
          totalOriginalRows: originalData.length,
          totalEnrichedRows: consolidationResult.stats.totalInputRows,
          matchedRows: uniqueOriginalMatches,
          unmatchedRows: originalData.length - uniqueOriginalMatches
        },
        processingTimeMs: Date.now() - this.startTime
      };

    } catch (error) {
      console.error('[CRMMergeProcessor] Error:', error);
      throw error;
    }
  }

  /**
   * PHASE 1: Consolidate all enriched files into single master file
   */
  private async consolidateEnrichedFiles(enrichedDataSets: Record<string, any>[][]): Promise<{
    masterFile: ParsedCSV;
    stats: any;
  }> {
    // Convert enriched data sets to ParsedCSV format
    const parsedFiles: ParsedCSV[] = enrichedDataSets.map((dataSet, index) => {
      const enrichedFile = this.jobData.enrichedFiles[index];
      
      // Get headers from first row
      const headers = dataSet.length > 0 ? Object.keys(dataSet[0]) : [];
      
      return {
        headers,
        rows: dataSet
      };
    });

    // Determine identifier column from first selected identifier
    const identifierColumn = this.jobData.selectedIdentifiers[0];

    // Configure consolidation
    const config: ConsolidationConfig = {
      identifierColumn,
      deduplicationStrategy: 'most_complete', // Use most complete data by default
      normalizeIdentifier: true, // Normalize for better matching
      columnStrategies: new Map() // Could add per-column strategies from UI in future
    };

    // Consolidate
    const consolidator = new EnrichmentConsolidator(config);
    return await consolidator.consolidate(parsedFiles);
  }

  /**
   * PHASE 2: Match original file with master enriched file
   */
  private matchWithMasterFile(
    originalData: Record<string, any>[],
    masterEnrichedData: Record<string, any>[]
  ): MatchResult[] {
    console.log('[CRMMergeProcessor] Building hash index for master enriched file...');
    const startTime = Date.now();
    const matches: MatchResult[] = [];
    const { selectedIdentifiers, inputMappings, arrayStrategies } = this.jobData;

    // Build mapping lookup: originalColumn -> enrichedColumn
    const mappingLookup = new Map<string, string>();
    for (const mapping of inputMappings) {
      // For master file, we just need the enriched column name
      // (no file ID needed since there's only one master file)
      mappingLookup.set(mapping.originalColumn, mapping.enrichedColumn);
    }

    // Build hash index for master enriched file (O(n) instead of O(n²))
    // Key: normalized identifier value -> array of { rowIndex, matchedIdentifier }
    const enrichedIndex = new Map<string, Array<{ rowIndex: number; identifier: string }>>();
    
    masterEnrichedData.forEach((enrichedRow, enrichedIndex_idx) => {
      // For each identifier, index this row
      for (const identifier of selectedIdentifiers) {
        const enrichedColumn = mappingLookup.get(identifier);
        if (!enrichedColumn) continue;

        const enrichedValue = this.normalizeValue(enrichedRow[enrichedColumn]);
        const strategy = arrayStrategies[enrichedColumn] || 'first';
        const enrichedCompareValue = this.extractArrayValue(enrichedValue, strategy);

        if (enrichedCompareValue) {
          if (!enrichedIndex.has(enrichedCompareValue)) {
            enrichedIndex.set(enrichedCompareValue, []);
          }
          enrichedIndex.get(enrichedCompareValue)!.push({
            rowIndex: enrichedIndex_idx,
            identifier
          });
        }
      }
    });

    console.log(`[CRMMergeProcessor] Hash index built with ${enrichedIndex.size} unique keys`);
    console.log(`[CRMMergeProcessor] Matching ${originalData.length} original rows...`);

    // Match each original row using hash lookup (O(1) per lookup)
    originalData.forEach((originalRow, originalIndex) => {
      const matchedIdentifiers = new Set<string>();
      const matchedEnrichedRows = new Set<number>();

      // Check each selected identifier
      for (const identifier of selectedIdentifiers) {
        const originalValue = this.normalizeValue(originalRow[identifier]);
        
        if (originalValue) {
          // Hash lookup instead of nested loop!
          const matches_for_value = enrichedIndex.get(originalValue);
          if (matches_for_value) {
            for (const match of matches_for_value) {
              matchedIdentifiers.add(match.identifier);
              matchedEnrichedRows.add(match.rowIndex);
            }
          }
        }
      }

      // Record matches for each enriched row that matched
      for (const enrichedRowIndex of matchedEnrichedRows) {
        matches.push({
          originalRowIndex: originalIndex,
          enrichedRowIndex,
          matchedOn: Array.from(matchedIdentifiers),
          confidence: matchedIdentifiers.size / selectedIdentifiers.length
        });
      }

      // Report progress every 1000 rows
      if (originalIndex % 1000 === 0) {
        const progress = (originalIndex / originalData.length) * 40 + 20; // 20-60%
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        this.reportProgress({
          stage: 'matching',
          rowsProcessed: originalIndex,
          totalRows: originalData.length,
          percentage: progress,
          message: `Matching rows... ${originalIndex.toLocaleString()}/${originalData.length.toLocaleString()} (${elapsed}s elapsed)`
        });
      }
    });

    const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`[CRMMergeProcessor] Matching complete in ${totalTime}s. Found ${matches.length} matches.`);
    return matches;
  }

  /**
   * Merge original data with master enriched data using match results
   */
  private mergeDataWithMaster(
    originalData: Record<string, any>[],
    masterEnrichedData: Record<string, any>[],
    matchResults: MatchResult[]
  ): Record<string, any>[] {
    console.log(`[CRMMergeProcessor] Starting merge with ${matchResults.length} match results`);
    const { resolutionConfig } = this.jobData;
    const mergedData: Record<string, any>[] = [];

    // Group matches by original row index
    const matchesByOriginalRow = new Map<number, MatchResult[]>();
    for (const match of matchResults) {
      if (!matchesByOriginalRow.has(match.originalRowIndex)) {
        matchesByOriginalRow.set(match.originalRowIndex, []);
      }
      matchesByOriginalRow.get(match.originalRowIndex)!.push(match);
    }
    
    console.log(`[CRMMergeProcessor] Grouped matches: ${matchesByOriginalRow.size} original rows have matches`);
    
    // Log first match for debugging
    if (matchResults.length > 0) {
      const firstMatch = matchResults[0];
      console.log('[CRMMergeProcessor] First match example:', firstMatch);
      const enrichedRow = masterEnrichedData[firstMatch.enrichedRowIndex];
      console.log('[CRMMergeProcessor] First enriched row columns:', Object.keys(enrichedRow));
      console.log('[CRMMergeProcessor] First enriched row sample:', enrichedRow);
    }

    // Process each original row
    originalData.forEach((originalRow, index) => {
      const mergedRow: Record<string, any> = { ...originalRow };
      const matches = matchesByOriginalRow.get(index) || [];

      if (index === 0) {
        console.log(`[CRMMergeProcessor] Processing first row:`, originalRow);
        console.log(`[CRMMergeProcessor] First row has ${matches.length} matches`);
      }

      // Merge enriched data from all matches
      for (const match of matches) {
        const enrichedRow = masterEnrichedData[match.enrichedRowIndex];
        
        if (index === 0) {
          console.log(`[CRMMergeProcessor] Merging enriched row:`, enrichedRow);
        }

        // Copy all enriched columns to merged row
        for (const [key, value] of Object.entries(enrichedRow)) {
          // Apply conflict resolution strategy
          if (resolutionConfig.defaultStrategy === 'keep_original' && mergedRow[key]) {
            // Keep original value
            continue;
          } else if (resolutionConfig.defaultStrategy === 'use_enriched') {
            // Replace with enriched value
            mergedRow[key] = value;
          } else if (resolutionConfig.defaultStrategy === 'create_alternate') {
            // Create alternate column if conflict
            if (mergedRow[key] && mergedRow[key] !== value) {
              mergedRow[`${key}_enriched`] = value;
            } else {
              mergedRow[key] = value;
            }
          }
        }
      }

      mergedData.push(mergedRow);

      // Report progress every 1000 rows
      if (index % 1000 === 0) {
        const progress = (index / originalData.length) * 20 + 60; // 60-80%
        this.reportProgress({
          stage: 'merging',
          rowsProcessed: index,
          totalRows: originalData.length,
          percentage: progress,
          message: `Merging data... ${index.toLocaleString()}/${originalData.length.toLocaleString()}`
        });
      }
    });

    console.log(`[CRMMergeProcessor] Merge complete. Generated ${mergedData.length} rows`);
    if (mergedData.length > 0) {
      console.log(`[CRMMergeProcessor] First merged row columns:`, Object.keys(mergedData[0]));
      console.log(`[CRMMergeProcessor] First merged row sample:`, mergedData[0]);
    }

    return mergedData;
  }

  /**
   * Apply column selection to final data
   */
  private applyColumnSelection(mergedData: Record<string, any>[]): Record<string, any>[] {
    const { columnConfigs } = this.jobData;
    
    if (!columnConfigs || columnConfigs.length === 0) {
      console.log('[CRMMergeProcessor] No column selection - returning all columns');
      return mergedData;
    }

    // Filter to only selected columns
    const selectedColumns = columnConfigs.filter(c => c.selected).map(c => c.name);
    console.log(`[CRMMergeProcessor] Applying column selection: ${selectedColumns.length} columns`);
    
    return mergedData.map(row => {
      const filteredRow: Record<string, any> = {};
      for (const column of selectedColumns) {
        filteredRow[column] = row[column] || '';
      }
      return filteredRow;
    });
  }

  /**
   * Generate CSV string from data
   */
  private generateCSV(data: Record<string, any>[]): string {
    if (data.length === 0) {
      return '';
    }

    const headers = Object.keys(data[0]);
    return Papa.unparse({
      fields: headers,
      data: data
    });
  }

  /**
   * Download and parse CSV file from S3
   */
  private async downloadAndParse(fileMetadata: FileMetadata): Promise<Record<string, any>[]> {
    console.log(`[CRMMergeProcessor] Downloading file: ${fileMetadata.name} (${fileMetadata.s3Key})`);
    
    let csvContent: string;
    
    // Support both local file paths (for testing) and HTTP URLs (for production)
    if (fileMetadata.s3Url.startsWith('http://') || fileMetadata.s3Url.startsWith('https://')) {
      // Production: Download from S3 presigned URL
      const response = await fetch(fileMetadata.s3Url);
      csvContent = await response.text();
    } else {
      // Testing: Read from local file system
      const fs = await import('fs');
      csvContent = fs.readFileSync(fileMetadata.s3Url, 'utf-8');
    }
    
    const parsed = Papa.parse(csvContent, {
      header: true,
      skipEmptyLines: 'greedy',
      dynamicTyping: false
    });

    console.log(`[CRMMergeProcessor] Parsed ${parsed.data.length} rows from ${fileMetadata.name}`);
    return parsed.data as Record<string, any>[];
  }

  /**
   * Normalize value for comparison (lowercase, trim, remove special chars)
   */
  private normalizeValue(value: any): string {
    if (!value) return '';
    return String(value)
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9@.+-]/g, '');
  }

  /**
   * Extract value from array based on strategy
   */
  private extractArrayValue(value: string, strategy: ArrayHandlingStrategy): string {
    if (!value) return '';
    
    // Check if value is an array (comma-separated or JSON array)
    const isArray = value.includes(',') || (value.startsWith('[') && value.endsWith(']'));
    
    if (!isArray) {
      return this.normalizeValue(value);
    }

    // Parse array
    let values: string[];
    if (value.startsWith('[')) {
      // JSON array
      try {
        values = JSON.parse(value);
      } catch {
        values = [value];
      }
    } else {
      // Comma-separated
      values = value.split(',').map(v => v.trim());
    }

    // Apply strategy
    switch (strategy) {
      case 'first':
        return this.normalizeValue(values[0]);
      case 'all':
        return values.map(v => this.normalizeValue(v)).join(',');
      case 'best':
      case 'deduplicated':
        // For matching, just use first value
        return this.normalizeValue(values[0]);
      default:
        return this.normalizeValue(values[0]);
    }
  }

  /**
   * Report progress to callback
   */
  private reportProgress(progress: CRMMergeProgress): void {
    if (this.progressCallback) {
      this.progressCallback(progress);
    }
  }
}
