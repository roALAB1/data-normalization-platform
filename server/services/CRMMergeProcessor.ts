/**
 * CRM Merge Processor
 * Server-side batch processing for CRM file merging with enrichment data
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

/**
 * Match result for a single row
 */
interface MatchResult {
  originalRowIndex: number;
  enrichedRowIndex: number;
  enrichedFileId: string;
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
   * Main processing method
   */
  async process(): Promise<CRMMergeResult> {
    this.startTime = Date.now();

    try {
      // Stage 1: Parse files
      this.reportProgress({
        stage: 'parsing',
        rowsProcessed: 0,
        totalRows: this.jobData.originalFile.rowCount,
        percentage: 0,
        message: 'Parsing CSV files...'
      });

      const originalData = await this.downloadAndParse(this.jobData.originalFile);
      const enrichedDataSets = await Promise.all(
        this.jobData.enrichedFiles.map(file => this.downloadAndParse(file))
      );

      // Stage 2: Match rows
      this.reportProgress({
        stage: 'matching',
        rowsProcessed: 0,
        totalRows: originalData.length,
        percentage: 10,
        message: 'Matching rows with enriched data...'
      });

      const matchResults = this.matchRows(originalData, enrichedDataSets);

      // Stage 3: Merge data
      this.reportProgress({
        stage: 'merging',
        rowsProcessed: 0,
        totalRows: originalData.length,
        percentage: 50,
        message: 'Merging data with conflict resolution...'
      });

      const mergedData = this.mergeData(originalData, enrichedDataSets, matchResults);

      // Stage 4: Apply column selection
      const finalData = this.applyColumnSelection(mergedData);

      // Stage 5: Generate output CSV
      this.reportProgress({
        stage: 'writing',
        rowsProcessed: finalData.length,
        totalRows: finalData.length,
        percentage: 90,
        message: 'Generating output CSV...'
      });

      const outputCsv = this.generateCSV(finalData);

      // Stage 6: Upload to S3 (placeholder - will implement with storage service)
      const outputFileKey = `crm-merge/${this.jobData.userId}/${this.jobData.jobId}/output.csv`;
      const outputFileUrl = await this.uploadToS3(outputFileKey, outputCsv);

      // Complete
      this.reportProgress({
        stage: 'complete',
        rowsProcessed: finalData.length,
        totalRows: finalData.length,
        percentage: 100,
        message: 'Processing complete!'
      });

      const processingTimeMs = Date.now() - this.startTime;

      return {
        success: true,
        outputFileKey,
        outputFileUrl,
        outputRowCount: finalData.length,
        matchStats: {
          totalOriginalRows: originalData.length,
          totalEnrichedRows: enrichedDataSets.reduce((sum, data) => sum + data.length, 0),
          matchedRows: matchResults.length,
          unmatchedRows: originalData.length - new Set(matchResults.map(m => m.originalRowIndex)).size
        },
        processingTimeMs
      };

    } catch (error) {
      console.error('[CRMMergeProcessor] Processing failed:', error);
      return {
        success: false,
        outputFileKey: '',
        outputFileUrl: '',
        outputRowCount: 0,
        matchStats: {
          totalOriginalRows: 0,
          totalEnrichedRows: 0,
          matchedRows: 0,
          unmatchedRows: 0
        },
        processingTimeMs: Date.now() - this.startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Download file from S3 and parse CSV
   */
  private async downloadAndParse(file: FileMetadata): Promise<Record<string, any>[]> {
    // TODO: Download from S3 using storage service
    // For now, return empty array as placeholder
    console.log(`[CRMMergeProcessor] Downloading and parsing ${file.name} from ${file.s3Url}`);
    
    // Fetch file from S3 URL
    const response = await fetch(file.s3Url);
    if (!response.ok) {
      throw new Error(`Failed to download file ${file.name}: ${response.statusText}`);
    }

    const csvText = await response.text();

    // Parse CSV with PapaParse
    return new Promise((resolve, reject) => {
      Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.errors.length > 0) {
            reject(new Error(`CSV parsing error: ${results.errors[0].message}`));
          } else {
            resolve(results.data as Record<string, any>[]);
          }
        },
        error: (error) => {
          reject(error);
        }
      });
    });
  }

  /**
   * Match rows between original and enriched datasets
   */
  private matchRows(
    originalData: Record<string, any>[],
    enrichedDataSets: Record<string, any>[][],
    ): MatchResult[] {
    const matches: MatchResult[] = [];
    const { selectedIdentifiers, inputMappings, arrayStrategies } = this.jobData;

    // Build mapping lookup: originalColumn -> { enrichedColumn, fileId }
    const mappingLookup = new Map<string, { enrichedColumn: string; fileId: string }[]>();
    for (const mapping of inputMappings) {
      if (!mappingLookup.has(mapping.originalColumn)) {
        mappingLookup.set(mapping.originalColumn, []);
      }
      mappingLookup.get(mapping.originalColumn)!.push({
        enrichedColumn: mapping.enrichedColumn,
        fileId: mapping.enrichedFileId
      });
    }

    // Process each enriched file
    enrichedDataSets.forEach((enrichedData, fileIndex) => {
      const enrichedFile = this.jobData.enrichedFiles[fileIndex];

      // Match each original row
      originalData.forEach((originalRow, originalIndex) => {
        enrichedData.forEach((enrichedRow, enrichedIndex) => {
          const matchedIdentifiers: string[] = [];

          // Check each selected identifier
          for (const identifier of selectedIdentifiers) {
            const originalValue = this.normalizeValue(originalRow[identifier]);
            
            // Get mapped enriched columns for this identifier
            const mappings = mappingLookup.get(identifier) || [];
            const relevantMappings = mappings.filter(m => m.fileId === enrichedFile.id);

            for (const mapping of relevantMappings) {
              const enrichedValue = this.normalizeValue(enrichedRow[mapping.enrichedColumn]);

              // Handle array values
              const strategy = arrayStrategies[mapping.enrichedColumn] || 'first';
              const enrichedCompareValue = this.extractArrayValue(enrichedValue, strategy);

              if (originalValue && enrichedCompareValue && originalValue === enrichedCompareValue) {
                matchedIdentifiers.push(identifier);
                break; // Found match for this identifier
              }
            }
          }

          // If any identifiers matched, record the match
          if (matchedIdentifiers.length > 0) {
            matches.push({
              originalRowIndex: originalIndex,
              enrichedRowIndex: enrichedIndex,
              enrichedFileId: enrichedFile.id,
              matchedOn: matchedIdentifiers,
              confidence: matchedIdentifiers.length / selectedIdentifiers.length
            });
          }
        });

        // Report progress every 1000 rows
        if (originalIndex % 1000 === 0) {
          const progress = (originalIndex / originalData.length) * 40 + 10; // 10-50%
          this.reportProgress({
            stage: 'matching',
            rowsProcessed: originalIndex,
            totalRows: originalData.length,
            percentage: progress,
            message: `Matching rows... ${originalIndex}/${originalData.length}`
          });
        }
      });
    });

    return matches;
  }

  /**
   * Merge original data with enriched data using match results
   */
  private mergeData(
    originalData: Record<string, any>[],
    enrichedDataSets: Record<string, any>[][],
    matchResults: MatchResult[]
  ): Record<string, any>[] {
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

    // Process each original row
    originalData.forEach((originalRow, index) => {
      const mergedRow: Record<string, any> = { ...originalRow };
      const matches = matchesByOriginalRow.get(index) || [];

      // Apply enriched data from matches
      for (const match of matches) {
        const enrichedFileIndex = this.jobData.enrichedFiles.findIndex(f => f.id === match.enrichedFileId);
        if (enrichedFileIndex === -1) continue;

        const enrichedRow = enrichedDataSets[enrichedFileIndex][match.enrichedRowIndex];

        // Merge each enriched column
        for (const [enrichedCol, enrichedValue] of Object.entries(enrichedRow)) {
          // Skip if column exists in original (conflict resolution)
          if (originalRow.hasOwnProperty(enrichedCol)) {
            const strategy = resolutionConfig.columnStrategies[enrichedCol] || resolutionConfig.defaultStrategy;

            if (strategy === 'keep_original') {
              // Keep original value, do nothing
            } else if (strategy === 'use_enriched') {
              mergedRow[enrichedCol] = enrichedValue;
            } else if (strategy === 'create_alternate') {
              mergedRow[`${enrichedCol}${resolutionConfig.alternateFieldSuffix}`] = enrichedValue;
            }
          } else {
            // No conflict, add enriched column
            mergedRow[enrichedCol] = enrichedValue;
          }
        }
      }

      mergedData.push(mergedRow);

      // Report progress every 1000 rows
      if (index % 1000 === 0) {
        const progress = (index / originalData.length) * 40 + 50; // 50-90%
        this.reportProgress({
          stage: 'merging',
          rowsProcessed: index,
          totalRows: originalData.length,
          percentage: progress,
          message: `Merging data... ${index}/${originalData.length}`
        });
      }
    });

    return mergedData;
  }

  /**
   * Apply column selection and ordering
   */
  private applyColumnSelection(mergedData: Record<string, any>[]): Record<string, any>[] {
    const { columnConfigs } = this.jobData;

    // Filter and reorder columns based on config
    const selectedColumns = columnConfigs
      .filter(config => config.selected)
      .sort((a, b) => a.position - b.position)
      .map(config => config.name);

    return mergedData.map(row => {
      const filteredRow: Record<string, any> = {};
      for (const col of selectedColumns) {
        filteredRow[col] = row[col] || '';
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

    const columns = Object.keys(data[0]);
    const rows = data.map(row => columns.map(col => {
      const value = row[col] || '';
      // Escape quotes and wrap in quotes if contains comma, quote, or newline
      if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    }));

    const csvLines = [
      columns.join(','),
      ...rows.map(row => row.join(','))
    ];

    return csvLines.join('\n');
  }

  /**
   * Upload CSV to S3
   */
  private async uploadToS3(key: string, csvContent: string): Promise<string> {
    // TODO: Implement S3 upload using storage service
    // For now, return placeholder URL
    console.log(`[CRMMergeProcessor] Uploading to S3: ${key}`);
    
    // This will be implemented with the storage service
    // const url = await storageService.upload(key, csvContent);
    
    return `https://s3.amazonaws.com/bucket/${key}`;
  }

  /**
   * Normalize value for comparison
   */
  private normalizeValue(value: any): string {
    if (value === null || value === undefined) return '';
    return String(value).trim().toLowerCase();
  }

  /**
   * Extract value from array based on strategy
   */
  private extractArrayValue(value: string, strategy: ArrayHandlingStrategy): string {
    if (!value || !value.includes(',')) {
      return value;
    }

    const parts = value.split(',').map(p => p.trim());

    switch (strategy) {
      case 'first':
        return parts[0];
      case 'all':
        return parts.join(' ');
      case 'best':
        // Use longest as "best" heuristic
        return parts.reduce((longest, current) => 
          current.length > longest.length ? current : longest, parts[0]);
      case 'deduplicated':
        return Array.from(new Set(parts)).join(' ');
      default:
        return parts[0];
    }
  }

  /**
   * Report progress to callback
   */
  private reportProgress(progress: CRMMergeProgress) {
    if (this.progressCallback) {
      // Calculate ETA if we have processed some rows
      if (progress.rowsProcessed > 0 && progress.totalRows > 0) {
        const elapsedMs = Date.now() - this.startTime;
        const rowsPerMs = progress.rowsProcessed / elapsedMs;
        const remainingRows = progress.totalRows - progress.rowsProcessed;
        progress.eta = Math.ceil(remainingRows / rowsPerMs / 1000); // Convert to seconds
      }

      this.progressCallback(progress);
    }
  }
}
