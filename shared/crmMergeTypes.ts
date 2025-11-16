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
export interface CRMMergeResult {
  success: boolean;
  outputFileKey: string;
  outputFileUrl: string;
  outputRowCount: number;
  matchStats: {
    totalOriginalRows: number;
    totalEnrichedRows: number;
    matchedRows: number;
    unmatchedRows: number;
  };
  processingTimeMs: number;
  error?: string;
}
