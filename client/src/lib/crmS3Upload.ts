/**
 * S3 Upload Utility for CRM Sync Mapper
 * Handles uploading CSV files to S3 with streaming to avoid memory overload
 */

import Papa from "papaparse";
import type { UploadedFile } from "@/types/crmSync";

export interface S3FileMetadata {
  id: string;
  name: string;
  type: "original" | "enriched";
  s3Key: string;
  s3Url: string;
  rowCount: number;
  columns: string[];
}

/**
 * Convert file data to CSV and upload to S3 using streaming
 * Processes data in chunks to avoid memory overload
 */
async function uploadFileToS3Streaming(
  file: UploadedFile,
  onProgress?: (percent: number) => void
): Promise<S3FileMetadata> {
  const CHUNK_SIZE = 10000; // Process 10k rows at a time
  const totalRows = file.data.length;
  
  // Generate CSV in chunks and upload via Blob
  const csvChunks: string[] = [];
  
  // Add header row
  csvChunks.push(file.columns.join(",") + "\n");
  
  // Process data in chunks
  for (let i = 0; i < totalRows; i += CHUNK_SIZE) {
    const chunkData = file.data.slice(i, Math.min(i + CHUNK_SIZE, totalRows));
    
    // Convert chunk to CSV (without header)
    const csvChunk = Papa.unparse(chunkData, {
      header: false,
      columns: file.columns,
    });
    
    csvChunks.push(csvChunk + "\n");
    
    // Report progress (0-70% for CSV generation)
    if (onProgress) {
      const progress = ((i + chunkData.length) / totalRows) * 70;
      onProgress(progress);
    }
    
    // Allow browser to breathe
    await new Promise(resolve => setTimeout(resolve, 0));
  }
  
  // Create Blob from chunks (browser handles this efficiently)
  const csvBlob = new Blob(csvChunks, { type: "text/csv" });
  
  if (onProgress) onProgress(75);
  
  // Upload blob via HTTP endpoint
  const { s3Key, s3Url } = await uploadBlobToS3(csvBlob, file.name, file.type, onProgress);
  
  return {
    id: file.id,
    name: file.name,
    type: file.type,
    s3Key,
    s3Url,
    rowCount: file.rowCount,
    columns: file.columns,
  };
}

/**
 * Upload Blob to S3 via HTTP endpoint
 */
async function uploadBlobToS3(
  blob: Blob,
  fileName: string,
  fileType: "original" | "enriched",
  onProgress?: (percent: number) => void
): Promise<{ s3Key: string; s3Url: string }> {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append("file", blob, fileName);
    formData.append("type", fileType);
    
    const xhr = new XMLHttpRequest();
    
    // Track upload progress
    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable && onProgress) {
        const percent = 75 + (e.loaded / e.total) * 25; // 75-100%
        onProgress(percent);
      }
    });
    
    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response = JSON.parse(xhr.responseText);
          if (response.success) {
            resolve({
              s3Key: response.key,
              s3Url: response.url,
            });
          } else {
            reject(new Error(response.error || "Upload failed"));
          }
        } catch (error) {
          reject(new Error("Invalid response from server"));
        }
      } else {
        reject(new Error(`Upload failed: ${xhr.statusText}`));
      }
    });
    
    xhr.addEventListener("error", () => {
      reject(new Error("Network error during upload"));
    });
    
    xhr.addEventListener("abort", () => {
      reject(new Error("Upload aborted"));
    });
    
    xhr.open("POST", "/api/upload/file");
    xhr.send(formData);
  });
}

/**
 * Upload multiple files to S3 sequentially with streaming
 */
export async function uploadFilesToS3Parallel(
  files: UploadedFile[],
  uploadMutation: any, // Not used in streaming approach
  onProgress?: (uploaded: number, total: number) => void
): Promise<S3FileMetadata[]> {
  const totalFiles = files.length;
  const results: S3FileMetadata[] = [];
  
  // Upload files sequentially to avoid overwhelming browser
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    
    const result = await uploadFileToS3Streaming(file, (percent) => {
      // Report file-level progress
      const fileProgress = percent / 100;
      const overallProgress = i + fileProgress;
      onProgress?.(overallProgress, totalFiles);
    });
    
    results.push(result);
    onProgress?.(i + 1, totalFiles);
  }
  
  return results;
}

/**
 * Sequential upload helper (for use in React components)
 */
export async function uploadFilesSequentially(
  files: UploadedFile[],
  uploadMutation: any,
  onProgress?: (uploaded: number, total: number) => void
): Promise<S3FileMetadata[]> {
  return uploadFilesToS3Parallel(files, uploadMutation, onProgress);
}

/**
 * Estimate upload size for progress display
 */
export function estimateUploadSize(
  originalFile: UploadedFile,
  enrichedFiles: UploadedFile[]
): number {
  const estimateFileSize = (file: UploadedFile) => {
    // Rough estimate: average 100 bytes per cell
    const cellCount = file.rowCount * file.columns.length;
    return cellCount * 100;
  };

  let totalSize = estimateFileSize(originalFile);
  enrichedFiles.forEach((file) => {
    totalSize += estimateFileSize(file);
  });

  return totalSize;
}

/**
 * Format bytes to human-readable string
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
}
