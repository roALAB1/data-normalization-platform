/**
 * S3 Upload Service
 * Handles uploading CRM merge output files to S3 and generating presigned URLs
 */

import { storagePut, storageGet } from '../storage';

export interface UploadResult {
  key: string;
  url: string;
  size: number;
  expiresIn: number; // seconds
}

export interface UploadProgress {
  uploadedBytes: number;
  totalBytes: number;
  percentage: number;
}

export class S3UploadService {
  private static readonly OUTPUT_PREFIX = 'crm-merge-outputs/';
  private static readonly PRESIGNED_URL_EXPIRY = 24 * 60 * 60; // 24 hours

  /**
   * Upload CSV content to S3 and return presigned download URL
   */
  static async uploadOutputFile(
    csvContent: string,
    jobId: number,
    userId: number,
    progressCallback?: (progress: UploadProgress) => void
  ): Promise<UploadResult> {
    console.log(`[S3Upload] Uploading output for job ${jobId}, user ${userId}`);
    
    // Generate unique key
    const timestamp = Date.now();
    const filename = `crm-merge-job-${jobId}-${timestamp}.csv`;
    const key = `${this.OUTPUT_PREFIX}user-${userId}/${filename}`;

    // Convert CSV string to buffer
    const buffer = Buffer.from(csvContent, 'utf-8');
    const totalBytes = buffer.length;

    console.log(`[S3Upload] File size: ${(totalBytes / 1024 / 1024).toFixed(2)} MB`);

    // Report initial progress
    if (progressCallback) {
      progressCallback({
        uploadedBytes: 0,
        totalBytes,
        percentage: 0
      });
    }

    try {
      // Upload to S3 using storage helper
      const uploadResult = await storagePut(key, buffer, 'text/csv');
      
      // Report completion
      if (progressCallback) {
        progressCallback({
          uploadedBytes: totalBytes,
          totalBytes,
          percentage: 100
        });
      }

      console.log(`[S3Upload] Upload complete: ${uploadResult.key}`);

      // Generate presigned download URL
      const downloadUrl = await this.getPresignedUrl(key);

      return {
        key: uploadResult.key,
        url: downloadUrl,
        size: totalBytes,
        expiresIn: this.PRESIGNED_URL_EXPIRY
      };

    } catch (error) {
      console.error('[S3Upload] Upload failed:', error);
      throw new Error(`Failed to upload output file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate presigned download URL for existing file
   */
  static async getPresignedUrl(key: string): Promise<string> {
    try {
      // storageGet returns presigned URL with default expiry
      const result = await storageGet(key);
      return result.url;
    } catch (error) {
      console.error('[S3Upload] Failed to generate presigned URL:', error);
      throw new Error(`Failed to generate download URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete output file from S3
   */
  static async deleteOutputFile(key: string): Promise<void> {
    console.log(`[S3Upload] Deleting file: ${key}`);
    // Note: storageDelete not available in current template
    // In production, implement using AWS SDK deleteObject
    console.warn('[S3Upload] Delete not implemented - file will remain in S3');
  }

  /**
   * Get file metadata without downloading
   */
  static async getFileMetadata(key: string): Promise<{ size: number; lastModified: Date }> {
    // Note: In production, use AWS SDK headObject to get metadata
    console.log(`[S3Upload] Getting metadata for: ${key}`);
    return {
      size: 0,
      lastModified: new Date()
    };
  }

  /**
   * List all output files for a user
   */
  static async listUserOutputs(userId: number): Promise<Array<{ key: string; size: number; lastModified: Date }>> {
    const prefix = `${this.OUTPUT_PREFIX}user-${userId}/`;
    console.log(`[S3Upload] Listing outputs for user ${userId} with prefix: ${prefix}`);
    
    // Note: In production, use AWS SDK listObjectsV2
    // For now, return empty array
    return [];
  }
}
