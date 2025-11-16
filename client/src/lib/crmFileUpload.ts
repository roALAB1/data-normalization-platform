/**
 * CRM File Upload Utility
 * Uploads raw CSV files to S3 using direct HTTP endpoint (bypasses tRPC)
 */

import Papa from "papaparse";

export interface UploadedFileMetadata {
  id: string;
  name: string;
  type: "original" | "enriched";
  rowCount: number;
  columns: string[];
  s3Key: string;
  s3Url: string;
  uploadedAt: Date;
}

/**
 * Upload CSV file to S3 using direct HTTP endpoint
 * This avoids tRPC JSON serialization and memory issues
 */
export async function uploadCSVToS3(
  file: File,
  type: "original" | "enriched",
  onProgress?: (percent: number) => void
): Promise<UploadedFileMetadata> {
  // Step 1: Extract minimal metadata (only first 100 rows)
  const metadata = await extractMinimalMetadata(file, onProgress);
  
  // Step 2: Upload raw file via HTTP endpoint
  const { s3Key, s3Url } = await uploadViaHTTP(file, type, onProgress);
  
  return {
    id: `${Date.now()}-${Math.random()}`,
    name: file.name,
    type,
    rowCount: metadata.rowCount,
    columns: metadata.columns,
    s3Key,
    s3Url,
    uploadedAt: new Date(),
  };
}

/**
 * Extract minimal metadata (columns + row count estimate)
 * Only parses first 100 rows to avoid memory issues
 */
async function extractMinimalMetadata(
  file: File,
  onProgress?: (percent: number) => void
): Promise<{ rowCount: number; columns: string[] }> {
  return new Promise((resolve, reject) => {
    let columns: string[] = [];
    let sampleRowCount = 0;
    
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      preview: 100, // Only parse first 100 rows
      complete: (results) => {
        if (results.meta.fields) {
          columns = results.meta.fields;
        }
        sampleRowCount = results.data.length;
        
        // Estimate total rows based on file size
        // Rough estimate: file size / average row size
        const avgRowSize = file.size / sampleRowCount;
        const estimatedRows = Math.floor(file.size / avgRowSize);
        
        if (onProgress) onProgress(10);
        
        resolve({
          rowCount: estimatedRows,
          columns,
        });
      },
      error: (error) => {
        reject(new Error(`Failed to parse CSV: ${error.message}`));
      },
    });
  });
}

/**
 * Upload file via HTTP endpoint using FormData
 * Browser handles this efficiently without loading entire file into memory
 */
async function uploadViaHTTP(
  file: File,
  type: "original" | "enriched",
  onProgress?: (percent: number) => void
): Promise<{ s3Key: string; s3Url: string }> {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", type);
    
    const xhr = new XMLHttpRequest();
    
    // Track upload progress
    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable && onProgress) {
        const percent = 10 + (e.loaded / e.total) * 90; // 10-100%
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
 * Load sample data from S3 file (first N rows only)
 * Used for preview and matching configuration
 */
export async function loadSampleData(
  s3Key: string,
  maxRows: number = 100
): Promise<Record<string, any>[]> {
  // Download file content via tRPC
  const response = await fetch(`/api/trpc/storage.downloadFile?input=${encodeURIComponent(JSON.stringify({ key: s3Key }))}`);
  
  if (!response.ok) {
    throw new Error(`Failed to load sample data: ${response.statusText}`);
  }
  
  const result = await response.json();
  
  if (!result.result?.data?.success) {
    throw new Error("Failed to load sample data");
  }
  
  return new Promise((resolve, reject) => {
    Papa.parse(result.result.data.content, {
      header: true,
      skipEmptyLines: true,
      preview: maxRows,
      complete: (results) => {
        resolve(results.data as Record<string, any>[]);
      },
      error: (error) => {
        reject(new Error(`Failed to parse sample data: ${error.message}`));
      },
    });
  });
}
