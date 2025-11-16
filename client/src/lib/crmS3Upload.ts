/**
 * S3 Upload Utility for CRM Sync Mapper
 * Handles uploading CSV files to S3 before submitting merge jobs
 */

import Papa from "papaparse";
import { trpc } from "./trpc";

interface UploadedFile {
  id: string;
  name: string;
  type: "original" | "enriched";
  rowCount: number;
  columns: string[];
  data: Record<string, any>[];
}

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
 * Convert file data to CSV string
 */
function convertToCSV(file: UploadedFile): string {
  return Papa.unparse(file.data, {
    header: true,
    columns: file.columns,
  });
}

/**
 * Upload a single file to S3 using tRPC
 */
async function uploadFileToS3(
  file: UploadedFile,
  uploadMutation: ReturnType<typeof trpc.upload.uploadCSV.useMutation>
): Promise<S3FileMetadata> {
  // Convert to CSV
  const csvContent = convertToCSV(file);

  // Upload via tRPC
  const result = await uploadMutation.mutateAsync({
    fileName: file.name,
    csvContent,
    fileType: file.type,
  });

  return {
    id: file.id,
    name: file.name,
    type: file.type,
    s3Key: result.s3Key,
    s3Url: result.s3Url,
    rowCount: file.rowCount,
    columns: file.columns,
  };
}

/**
 * Upload multiple files to S3 in parallel
 * Note: This is a helper that should be called from a React component with access to tRPC hooks
 */
export async function uploadFilesToS3Parallel(
  files: UploadedFile[],
  uploadMutation: ReturnType<typeof trpc.upload.uploadCSV.useMutation>,
  onProgress?: (uploaded: number, total: number) => void
): Promise<S3FileMetadata[]> {
  const totalFiles = files.length;
  let uploadedCount = 0;

  // Create upload promises for all files
  const uploadPromises = files.map((file) =>
    uploadFileToS3(file, uploadMutation).then((result) => {
      uploadedCount++;
      onProgress?.(uploadedCount, totalFiles);
      return result;
    })
  );

  // Wait for all uploads to complete in parallel
  return await Promise.all(uploadPromises);
}

/**
 * Sequential upload helper (for use in React components)
 */
export async function uploadFilesSequentially(
  files: UploadedFile[],
  uploadMutation: ReturnType<typeof trpc.upload.uploadCSV.useMutation>,
  onProgress?: (uploaded: number, total: number) => void
): Promise<S3FileMetadata[]> {
  const results: S3FileMetadata[] = [];
  const totalFiles = files.length;

  for (let i = 0; i < files.length; i++) {
    const result = await uploadFileToS3(files[i], uploadMutation);
    results.push(result);
    onProgress?.(i + 1, totalFiles);
  }

  return results;
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
