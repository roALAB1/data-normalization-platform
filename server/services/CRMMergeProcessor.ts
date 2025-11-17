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
import { S3UploadService } from './S3UploadService';

/**
 * Match result for a single row with quality scoring
 */
interface MatchResult {
  originalRowIndex: number;
  enrichedRowIndex: number;
  matchedOn: string[]; // Which identifiers matched
  confidence: number; // Overall confidence score (0-1)
  qualityScore: number; // Quality score based on data completeness (0-100)
  matchQuality: 'high' | 'medium' | 'low'; // Classification
  reasoning: string[]; // Human-readable reasons for match
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

      // Stage 6: Upload to S3
      this.reportProgress({
        stage: 'writing',
        rowsProcessed: mergedData.length,
        totalRows: mergedData.length,
        percentage: 95,
        message: 'Uploading output file to S3...'
      });

      const uploadResult = await S3UploadService.uploadOutputFile(
        outputCSV,
        this.jobData.jobId,
        this.jobData.userId,
        (progress) => {
          // Report upload progress
          const uploadPercentage = 95 + (progress.percentage * 0.05); // 95-100%
          this.reportProgress({
            stage: 'writing',
            rowsProcessed: mergedData.length,
            totalRows: mergedData.length,
            percentage: uploadPercentage,
            message: `Uploading... ${progress.percentage.toFixed(0)}%`
          });
        }
      );

      console.log(`[CRMMergeProcessor] Output uploaded to S3: ${uploadResult.key}`);
      console.log(`[CRMMergeProcessor] Download URL expires in ${uploadResult.expiresIn / 3600} hours`);

      // Complete
      const duration = ((Date.now() - this.startTime) / 1000).toFixed(1);
      this.reportProgress({
        stage: 'complete',
        rowsProcessed: mergedData.length,
        totalRows: mergedData.length,
        percentage: 100,
        message: `Complete! Processed ${mergedData.length.toLocaleString()} rows in ${duration}s`
      });

      // Calculate detailed match statistics
      const matchStats = this.calculateMatchStatistics(
        originalData,
        consolidationResult.stats.totalInputRows,
        matchResults,
        mergedData
      );

      return {
        success: true,
        outputFileKey: uploadResult.key,
        outputFileUrl: uploadResult.url,
        outputRowCount: finalData.length,
        matchStats,
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
    // Determine identifier column from first selected identifier
    const identifierColumn = this.jobData.selectedIdentifiers[0];
    
    console.log(`[CRMMergeProcessor] Looking for identifier column: "${identifierColumn}"`);
    console.log(`[CRMMergeProcessor] Input mappings:`, this.jobData.inputMappings);
    
    // Convert enriched data sets to ParsedCSV format
    const parsedFiles: ParsedCSV[] = enrichedDataSets.map((dataSet, index) => {
      const enrichedFile = this.jobData.enrichedFiles[index];
      
      // CRITICAL FIX: Use stored column names from FileMetadata instead of extracting from parsed data
      // This ensures column names match what was detected during upload, even if Papa.parse
      // returns different keys (e.g., due to special characters, quotes, etc.)
      let headers = enrichedFile.columns.length > 0 
        ? enrichedFile.columns 
        : (dataSet.length > 0 ? Object.keys(dataSet[0]) : []);
      
      console.log(`[CRMMergeProcessor] Enriched file ${index + 1} original headers:`, headers);
      
      // CRITICAL FIX v3.39.2: Create virtual identifier columns for matching
      // Problem: Enriched files have columns like BUSINESS_EMAIL, but we need to match on "Email"
      // Solution: Add virtual identifier columns (e.g., "Email") that copy values from enriched columns
      // This allows matching to work while keeping original enriched column names intact
      
      const fileMappings = this.jobData.inputMappings.filter(m => m.enrichedFileId === enrichedFile.id);
      
      if (fileMappings.length > 0) {
        console.log(`[CRMMergeProcessor] Found ${fileMappings.length} input mappings for file ${index + 1}`);
        
        // Create mapping lookup: originalColumn -> enrichedColumn
        const mappingLookup = new Map<string, string>();
        fileMappings.forEach(m => {
          mappingLookup.set(m.originalColumn, m.enrichedColumn);
          console.log(`[CRMMergeProcessor]   ${m.originalColumn} <- ${m.enrichedColumn}`);
        });
        
        // Add virtual identifier columns to headers
        const virtualColumns = Array.from(mappingLookup.keys());
        headers = [...headers, ...virtualColumns];
        
        // Add virtual identifier columns to data rows
        dataSet = dataSet.map(row => {
          const newRow = { ...row };
          for (const [originalColumn, enrichedColumn] of mappingLookup.entries()) {
            // Copy value from enriched column to virtual identifier column
            newRow[originalColumn] = row[enrichedColumn] || '';
          }
          return newRow;
        });
        
        console.log(`[CRMMergeProcessor] Added ${virtualColumns.length} virtual identifier columns:`, virtualColumns);
        console.log(`[CRMMergeProcessor] File ${index + 1} headers after adding virtual columns:`, headers.slice(0, 10), '...');
      }
      
      return {
        headers,
        rows: dataSet
      };
    });

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
    // This is used to find which enriched column corresponds to each original identifier
    const mappingLookup = new Map<string, string>();
    for (const mapping of inputMappings) {
      mappingLookup.set(mapping.originalColumn, mapping.enrichedColumn);
    }
    
    console.log('[CRMMergeProcessor] Mapping lookup for matching:', Array.from(mappingLookup.entries()));

    // Build hash index for master enriched file (O(n) instead of O(n²))
    // Key: normalized identifier value -> array of { rowIndex, matchedIdentifier }
    const enrichedIndex = new Map<string, Array<{ rowIndex: number; identifier: string }>>();
    
    masterEnrichedData.forEach((enrichedRow, enrichedIndex_idx) => {
      // For each identifier, index this row
      for (const identifier of selectedIdentifiers) {
        // Try to find mapped enriched column, otherwise use identifier as-is
        const enrichedColumn = mappingLookup.get(identifier) || identifier;
        
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
        const enrichedRow = masterEnrichedData[enrichedRowIndex];
        const confidence = matchedIdentifiers.size / selectedIdentifiers.length;
        
        // Calculate quality score based on data completeness
        const qualityScore = this.calculateQualityScore(originalRow, enrichedRow);
        
        // Classify match quality
        const matchQuality = this.classifyMatchQuality(confidence, qualityScore);
        
        // Generate reasoning
        const reasoning = this.generateMatchReasoning(
          Array.from(matchedIdentifiers),
          confidence,
          qualityScore
        );
        
        matches.push({
          originalRowIndex: originalIndex,
          enrichedRowIndex,
          matchedOn: Array.from(matchedIdentifiers),
          confidence,
          qualityScore,
          matchQuality,
          reasoning
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
    console.log(`[CRMMergeProcessor] ========== COLUMN SELECTION DEBUG ==========`);
    console.log(`[CRMMergeProcessor] Total column configs: ${columnConfigs.length}`);
    console.log(`[CRMMergeProcessor] Selected columns (${selectedColumns.length}):`, selectedColumns);
    
    if (mergedData.length > 0) {
      const availableColumns = Object.keys(mergedData[0]);
      console.log(`[CRMMergeProcessor] Available columns in merged data (${availableColumns.length}):`, availableColumns);
      
      // Check which selected columns are missing from merged data
      const missingColumns = selectedColumns.filter(col => !availableColumns.includes(col));
      if (missingColumns.length > 0) {
        console.error(`[CRMMergeProcessor] ⚠️ WARNING: ${missingColumns.length} selected columns are MISSING from merged data:`, missingColumns);
      }
      
      // Check first row data for enriched columns
      const firstRow = mergedData[0];
      const enrichedColumns = selectedColumns.filter(col => 
        !this.jobData.originalFile.columns.includes(col)
      );
      console.log(`[CRMMergeProcessor] Enriched columns in selection (${enrichedColumns.length}):`, enrichedColumns);
      console.log(`[CRMMergeProcessor] First row enriched data sample:`);
      enrichedColumns.slice(0, 5).forEach(col => {
        console.log(`  ${col}: ${JSON.stringify(firstRow[col])}`);
      });
    }
    
    return mergedData.map((row, index) => {
      const filteredRow: Record<string, any> = {};
      for (const column of selectedColumns) {
        filteredRow[column] = row[column] !== undefined ? row[column] : '';
      }
      
      // Debug first row
      if (index === 0) {
        console.log(`[CRMMergeProcessor] First filtered row columns:`, Object.keys(filteredRow));
        const enrichedCols = selectedColumns.filter(col => 
          !this.jobData.originalFile.columns.includes(col)
        );
        console.log(`[CRMMergeProcessor] First filtered row enriched values:`);
        enrichedCols.slice(0, 5).forEach(col => {
          console.log(`  ${col}: ${JSON.stringify(filteredRow[col])}`);
        });
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

  /**
   * Calculate quality score based on data completeness
   * Score 0-100: Higher = more complete/valuable data
   */
  private calculateQualityScore(
    originalRow: Record<string, any>,
    enrichedRow: Record<string, any>
  ): number {
    let score = 0;
    let maxScore = 0;

    // Check each enriched column for data quality
    for (const [key, value] of Object.entries(enrichedRow)) {
      maxScore += 10;

      if (!value || String(value).trim() === '') {
        // Empty field: 0 points
        continue;
      }

      const strValue = String(value);
      
      // Length contributes to score (up to 3 points)
      score += Math.min(3, strValue.length / 10);

      // Non-whitespace characters (up to 2 points)
      const nonWhitespace = (strValue.match(/\S/g) || []).length;
      score += Math.min(2, nonWhitespace / 5);

      // Multiple words (1 point)
      if (strValue.split(/\s+/).length > 1) {
        score += 1;
      }

      // Special value types (bonus points)
      if (/@/.test(strValue)) score += 2; // Email
      if (/\d{3}/.test(strValue)) score += 2; // Phone
      if (/https?:\/\//.test(strValue)) score += 1; // URL
    }

    // Normalize to 0-100
    return maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
  }

  /**
   * Classify match quality based on confidence and data quality
   */
  private classifyMatchQuality(
    confidence: number,
    qualityScore: number
  ): 'high' | 'medium' | 'low' {
    // Combined score: 70% confidence, 30% quality
    const combinedScore = (confidence * 0.7) + (qualityScore / 100 * 0.3);

    if (combinedScore >= 0.8) return 'high';
    if (combinedScore >= 0.5) return 'medium';
    return 'low';
  }

  /**
   * Generate human-readable reasoning for match
   */
  private generateMatchReasoning(
    matchedIdentifiers: string[],
    confidence: number,
    qualityScore: number
  ): string[] {
    const reasons: string[] = [];

    // Identifier matches
    if (matchedIdentifiers.length > 0) {
      reasons.push(`Matched on ${matchedIdentifiers.length} identifier(s): ${matchedIdentifiers.join(', ')}`);
    }

    // Confidence level
    const confidencePercent = Math.round(confidence * 100);
    if (confidence === 1) {
      reasons.push(`Perfect match: All identifiers matched (${confidencePercent}%)`);
    } else if (confidence >= 0.5) {
      reasons.push(`Partial match: ${confidencePercent}% of identifiers matched`);
    } else {
      reasons.push(`Weak match: Only ${confidencePercent}% of identifiers matched`);
    }

    // Data quality
    if (qualityScore >= 80) {
      reasons.push(`High quality enriched data (${qualityScore}/100)`);
    } else if (qualityScore >= 50) {
      reasons.push(`Moderate quality enriched data (${qualityScore}/100)`);
    } else {
      reasons.push(`Low quality enriched data (${qualityScore}/100) - may have missing fields`);
    }

    return reasons;
  }

  /**
   * Calculate detailed match statistics
   * v3.38.0: Zero-downside improvement #3 - Enhanced statistics reporting
   */
  private calculateMatchStatistics(
    originalData: Record<string, any>[],
    totalEnrichedRows: number,
    matchResults: MatchResult[],
    mergedData: Record<string, any>[]
  ): import('../../shared/crmMergeTypes').MatchStats {
    const uniqueOriginalMatches = new Set(matchResults.map(m => m.originalRowIndex)).size;
    const matchRate = (uniqueOriginalMatches / originalData.length) * 100;

    // Count matches by identifier
    const matchesByIdentifier: { [key: string]: { count: number; totalQuality: number } } = {};
    
    matchResults.forEach(match => {
      match.matchedOn.forEach(identifier => {
        if (!matchesByIdentifier[identifier]) {
          matchesByIdentifier[identifier] = { count: 0, totalQuality: 0 };
        }
        matchesByIdentifier[identifier].count++;
        matchesByIdentifier[identifier].totalQuality += match.qualityScore;
      });
    });

    // Calculate percentages and averages
    const matchesByIdentifierStats: { [key: string]: import('../../shared/crmMergeTypes').MatchStatsByIdentifier } = {};
    Object.entries(matchesByIdentifier).forEach(([identifier, stats]) => {
      matchesByIdentifierStats[identifier] = {
        count: stats.count,
        percentage: (stats.count / matchResults.length) * 100,
        avgQualityScore: stats.totalQuality / stats.count
      };
    });

    // Quality distribution
    const qualityDistribution = {
      high: 0,
      medium: 0,
      low: 0
    };
    
    matchResults.forEach(match => {
      if (match.qualityScore >= 80) qualityDistribution.high++;
      else if (match.qualityScore >= 50) qualityDistribution.medium++;
      else qualityDistribution.low++;
    });

    // Data completeness (analyze merged data)
    const dataCompleteness: import('../../shared/crmMergeTypes').DataCompleteness = {};
    
    if (mergedData.length > 0) {
      const allColumns = Object.keys(mergedData[0]);
      
      // Calculate completeness for each column
      const completenessMap = new Map<string, { populated: number; total: number }>();
      
      allColumns.forEach(column => {
        const populatedCount = mergedData.filter(row => {
          const value = row[column];
          return value !== null && value !== undefined && String(value).trim() !== '';
        }).length;
        
        completenessMap.set(column, {
          populated: populatedCount,
          total: mergedData.length
        });
      });
      
      // Sort by completeness percentage and take top 10
      const sortedColumns = Array.from(completenessMap.entries())
        .sort((a, b) => (b[1].populated / b[1].total) - (a[1].populated / a[1].total))
        .slice(0, 10);
      
      sortedColumns.forEach(([column, stats]) => {
        dataCompleteness[column] = {
          populatedCount: stats.populated,
          percentage: (stats.populated / stats.total) * 100
        };
      });
    }

    return {
      totalOriginalRows: originalData.length,
      totalEnrichedRows,
      matchedRows: uniqueOriginalMatches,
      unmatchedRows: originalData.length - uniqueOriginalMatches,
      matchRate,
      matchesByIdentifier: matchesByIdentifierStats,
      qualityDistribution,
      dataCompleteness
    };
  }
}
