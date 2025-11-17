/**
 * CRM Merge Job Types
 * Defines data structures for server-side CRM merge batch processing
 */

import type { ArrayHandlingStrategy } from "../client/src/lib/arrayParser";

/**
 * Input mapping for column matching
 */
export interface InputMapping {
  originalColumn: string;
  enrichedColumn: string;
  enrichedFileId: string;
}

/**
 * Conflict resolution configuration
 */
export interface ResolutionConfig {
  defaultStrategy: "keep_original" | "use_enriched" | "create_alternate";
  columnStrategies: Record<string, "keep_original" | "use_enriched" | "create_alternate">;
  alternateFieldSuffix: string;
}

/**
 * Column configuration for output
 */
export interface ColumnConfig {
  name: string;
  source: "original" | "enriched";
  enrichedFileId?: string;
  selected: boolean;
  position: number;
}

/**
 * File metadata for processing
 */
export interface FileMetadata {
  id: string;
  name: string;
  type: "original" | "enriched";
  s3Key: string;
  s3Url: string;
  rowCount: number;
  columns: string[];
}

/**
 * CRM Merge Job Input Data
 */
export interface CRMMergeJobData {
  jobId: number;
  userId: number;
  
  // File information
  originalFile: FileMetadata;
  enrichedFiles: FileMetadata[];
  
  // Matching configuration
  selectedIdentifiers: string[];
  inputMappings: InputMapping[];
  arrayStrategies: Record<string, ArrayHandlingStrategy>; // Map serialized as object
  
  // Conflict resolution
  resolutionConfig: ResolutionConfig;
  
  // Column selection
  columnConfigs: ColumnConfig[];
  orderingMode: "append" | "insert_related" | "custom";
}

/**
 * CRM Merge Job Progress Data
 */
export interface CRMMergeProgress {
  stage: "uploading" | "parsing" | "matching" | "merging" | "writing" | "complete";
  rowsProcessed: number;
  totalRows: number;
  percentage: number;
  message: string;
  eta?: number; // Estimated seconds remaining
}

/**
 * CRM Merge Job Result
 */
/**
 * Match statistics by identifier
 * v3.38.0: Added detailed match breakdown
 */
export interface MatchStatsByIdentifier {
  count: number;
  percentage: number;
  avgQualityScore: number;
}

/**
 * Quality distribution of matches
 * v3.38.0: Added quality scoring
 */
export interface QualityDistribution {
  high: number;    // 80-100%
  medium: number;  // 50-80%
  low: number;     // <50%
}

/**
 * Data completeness metrics
 * v3.38.0: Added field-level completeness tracking
 */
export interface DataCompleteness {
  [field: string]: {
    populatedCount: number;
    percentage: number;
  };
}

/**
 * Enhanced match statistics
 * v3.38.0: Added detailed match breakdown, quality distribution, and data completeness
 */
export interface MatchStats {
  totalOriginalRows: number;
  totalEnrichedRows: number;
  matchedRows: number;
  unmatchedRows: number;
  matchRate: number; // percentage
  
  // v3.38.0: Detailed match breakdown
  matchesByIdentifier?: {
    [identifier: string]: MatchStatsByIdentifier;
  };
  
  // v3.38.0: Quality distribution
  qualityDistribution?: QualityDistribution;
  
  // v3.38.0: Data completeness (top 10 fields)
  dataCompleteness?: DataCompleteness;
}

export interface CRMMergeResult {
  success: boolean;
  outputFileKey: string;
  outputFileUrl: string;
  outputRowCount: number;
  matchStats: MatchStats;
  processingTimeMs: number;
  error?: string;
}
