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
 * Reads full header row to ensure accurate column names, then samples 100 rows for row count
 */
async function extractMinimalMetadata(
  file: File,
  onProgress?: (percent: number) => void
): Promise<{ rowCount: number; columns: string[] }> {
  return new Promise((resolve, reject) => {
    // First pass: Read only the header row to get accurate column names
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (!text) {
        reject(new Error('Failed to read file'));
        return;
      }
      
      // Parse just the first line to get headers
      const firstLineEnd = text.indexOf('\n');
      const headerLine = firstLineEnd > 0 ? text.substring(0, firstLineEnd) : text;
      
      // Parse header line to extract column names
      Papa.parse(headerLine, {
        header: false,
        skipEmptyLines: true,
        complete: (headerResults) => {
          const columns = headerResults.data[0] as string[];
          
          // Second pass: Parse sample rows for row count estimation
          Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            preview: 100, // Only parse first 100 rows for estimation
            complete: (results) => {
              const sampleRowCount = results.data.length;
              
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
        },
        error: (error) => {
          reject(new Error(`Failed to parse CSV header: ${error.message}`));
        },
      });
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    
    // Read first 10KB to get header (should be more than enough)
    const headerBlob = file.slice(0, 10240);
    reader.readAsText(headerBlob);
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
    
    // Set timeout to 5 minutes for large files
    xhr.timeout = 5 * 60 * 1000; // 5 minutes
    
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
        // Try to parse error response body
        let errorMessage = `Upload failed: ${xhr.statusText}`;
        try {
          const errorResponse = JSON.parse(xhr.responseText);
          if (errorResponse.error) {
            errorMessage = errorResponse.error;
          }
        } catch {
          // Use default error message
        }
        reject(new Error(errorMessage));
      }
    });
    
    xhr.addEventListener("error", () => {
      reject(new Error("Network error during upload. Please check your connection and try again."));
    });
    
    xhr.addEventListener("abort", () => {
      reject(new Error("Upload aborted by user"));
    });
    
    xhr.addEventListener("timeout", () => {
      reject(new Error("Upload timed out after 5 minutes. Please try a smaller file or check your connection."));
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
  s3Url: string,
  maxRows: number = 1000
): Promise<Record<string, any>[]> {
  try {
    // Download file content directly from S3 URL
    const response = await fetch(s3Url);
    
    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.statusText}`);
    }
    
    const content = await response.text();
    
    // Parse CSV and extract sample rows
    return new Promise((resolve, reject) => {
      Papa.parse(content, {
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
  } catch (error) {
    throw new Error(`Failed to load sample data: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
