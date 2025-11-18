/**
 * Streaming CSV Reader
 * Memory-efficient CSV processing using PapaParse streaming mode
 * 
 * Key Features:
 * - Processes CSV files in chunks without loading entire file into memory
 * - Supports both HTTP URLs (S3 presigned URLs) and local file paths
 * - Configurable chunk size for memory control
 * - Progress callbacks for real-time updates
 * - Error handling and recovery
 * 
 * Memory Usage:
 * - Only keeps current chunk in memory (default: 10,000 rows)
 * - Releases memory after each chunk is processed
 * - Suitable for files with millions of rows
 */

import Papa from 'papaparse';
import { Readable } from 'stream';
import * as fs from 'fs';
import * as https from 'https';
import * as http from 'http';

export interface StreamingCSVOptions {
  chunkSize?: number; // Number of rows to process at a time (default: 10000)
  skipEmptyLines?: boolean | 'greedy'; // Skip empty lines (default: 'greedy')
  dynamicTyping?: boolean; // Auto-convert numbers/booleans (default: false)
  header?: boolean; // First row is header (default: true)
}

export interface ChunkCallback {
  (rows: Record<string, any>[], chunkIndex: number): Promise<void> | void;
}

export interface ProgressCallback {
  (bytesRead: number, totalBytes?: number): void;
}

export interface StreamingCSVResult {
  totalRows: number;
  headers: string[];
  errors: any[];
}

/**
 * Streaming CSV Reader
 * Processes CSV files in chunks without loading entire file into memory
 */
export class StreamingCSVReader {
  private options: Required<StreamingCSVOptions>;
  
  constructor(options: StreamingCSVOptions = {}) {
    this.options = {
      chunkSize: options.chunkSize || 10000,
      skipEmptyLines: options.skipEmptyLines !== undefined ? options.skipEmptyLines : 'greedy',
      dynamicTyping: options.dynamicTyping || false,
      header: options.header !== undefined ? options.header : true,
    };
  }

  /**
   * Stream CSV from URL or file path
   * Processes data in chunks using callback
   */
  async stream(
    urlOrPath: string,
    onChunk: ChunkCallback,
    onProgress?: ProgressCallback
  ): Promise<StreamingCSVResult> {
    const isUrl = urlOrPath.startsWith('http://') || urlOrPath.startsWith('https://');
    
    if (isUrl) {
      return this.streamFromUrl(urlOrPath, onChunk, onProgress);
    } else {
      return this.streamFromFile(urlOrPath, onChunk, onProgress);
    }
  }

  /**
   * Stream CSV from HTTP/HTTPS URL (e.g., S3 presigned URL)
   */
  private async streamFromUrl(
    url: string,
    onChunk: ChunkCallback,
    onProgress?: ProgressCallback
  ): Promise<StreamingCSVResult> {
    return new Promise((resolve, reject) => {
      const protocol = url.startsWith('https://') ? https : http;
      
      protocol.get(url, (response) => {
        if (response.statusCode !== 200) {
          reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
          return;
        }

        const totalBytes = parseInt(response.headers['content-length'] || '0', 10);
        let bytesRead = 0;

        // Track progress
        response.on('data', (chunk) => {
          bytesRead += chunk.length;
          if (onProgress) {
            onProgress(bytesRead, totalBytes);
          }
        });

        this.parseStream(response, onChunk)
          .then(resolve)
          .catch(reject);
      }).on('error', reject);
    });
  }

  /**
   * Stream CSV from local file path
   */
  private async streamFromFile(
    filePath: string,
    onChunk: ChunkCallback,
    onProgress?: ProgressCallback
  ): Promise<StreamingCSVResult> {
    const stats = fs.statSync(filePath);
    const totalBytes = stats.size;
    let bytesRead = 0;

    const fileStream = fs.createReadStream(filePath);
    
    // Track progress
    fileStream.on('data', (chunk) => {
      bytesRead += chunk.length;
      if (onProgress) {
        onProgress(bytesRead, totalBytes);
      }
    });

    return this.parseStream(fileStream, onChunk);
  }

  /**
   * Parse stream using PapaParse streaming mode
   */
  private async parseStream(
    stream: NodeJS.ReadableStream,
    onChunk: ChunkCallback
  ): Promise<StreamingCSVResult> {
    return new Promise((resolve, reject) => {
      let totalRows = 0;
      let chunkIndex = 0;
      let currentChunk: Record<string, any>[] = [];
      let headers: string[] = [];
      const errors: any[] = [];
      let processingPromise: Promise<void> = Promise.resolve();

      Papa.parse(stream, {
        header: this.options.header,
        skipEmptyLines: this.options.skipEmptyLines,
        dynamicTyping: this.options.dynamicTyping,
        
        // Process rows as they arrive
        step: (results, parser) => {
          // Store headers from first row
          if (headers.length === 0 && results.meta.fields) {
            headers = results.meta.fields;
          }

          if (results.errors.length > 0) {
            errors.push(...results.errors);
          }

          if (results.data) {
            currentChunk.push(results.data as Record<string, any>);
            totalRows++;

            // When chunk is full, process it
            if (currentChunk.length >= this.options.chunkSize) {
              const chunkToProcess = currentChunk;
              const currentChunkIndex = chunkIndex++;
              currentChunk = [];

              // Pause parsing while processing chunk
              parser.pause();

              // Chain promises to ensure sequential processing
              processingPromise = processingPromise
                .then(() => onChunk(chunkToProcess, currentChunkIndex))
                .then(() => {
                  // Release memory
                  chunkToProcess.length = 0;
                  // Resume parsing
                  parser.resume();
                })
                .catch((error) => {
                  console.error(`[StreamingCSVReader] Error processing chunk ${currentChunkIndex}:`, error);
                  parser.abort();
                  reject(error);
                });
            }
          }
        },

        // When parsing is complete
        complete: () => {
          // Process remaining rows in final chunk
          if (currentChunk.length > 0) {
            const finalChunk = currentChunk;
            const finalChunkIndex = chunkIndex++;
            
            processingPromise
              .then(() => onChunk(finalChunk, finalChunkIndex))
              .then(() => {
                finalChunk.length = 0;
                resolve({
                  totalRows,
                  headers,
                  errors
                });
              })
              .catch(reject);
          } else {
            // No final chunk, wait for existing processing to complete
            processingPromise
              .then(() => {
                resolve({
                  totalRows,
                  headers,
                  errors
                });
              })
              .catch(reject);
          }
        },

        // Handle parsing errors
        error: (error) => {
          reject(error);
        }
      });
    });
  }

  /**
   * Convenience method: Read entire file into memory in chunks
   * Useful when you need all data but want to process it in manageable pieces
   */
  async readInChunks(
    urlOrPath: string,
    onProgress?: ProgressCallback
  ): Promise<{
    rows: Record<string, any>[];
    headers: string[];
    errors: any[];
  }> {
    const allRows: Record<string, any>[] = [];
    
    const result = await this.stream(
      urlOrPath,
      async (chunk) => {
        allRows.push(...chunk);
      },
      onProgress
    );

    return {
      rows: allRows,
      headers: result.headers,
      errors: result.errors
    };
  }
}

/**
 * Convenience function for streaming CSV files
 */
export async function streamCSV(
  urlOrPath: string,
  onChunk: ChunkCallback,
  options?: StreamingCSVOptions,
  onProgress?: ProgressCallback
): Promise<StreamingCSVResult> {
  const reader = new StreamingCSVReader(options);
  return reader.stream(urlOrPath, onChunk, onProgress);
}
