/**
 * Shared types for CRM Sync Mapper
 * Centralized type definitions to avoid duplication and ensure consistency
 */

export interface UploadedFile {
  id: string;
  name: string;
  type: "original" | "enriched";
  rowCount: number;
  columns: string[];
  
  // Hybrid approach: support both legacy and optimized modes
  // Legacy mode (< 10MB files): data contains all rows
  // Optimized mode (> 10MB files): data contains sample (1000 rows), s3Key points to full file
  data?: Record<string, any>[];
  
  // Optimized mode: S3 reference for full dataset
  s3Key?: string;
  s3Url?: string;
  
  matchFields?: string[];
  uploadedAt?: Date;
}
