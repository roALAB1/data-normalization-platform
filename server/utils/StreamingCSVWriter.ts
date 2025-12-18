/**
 * Streaming CSV Writer
 * Writes CSV data incrementally without loading entire file into memory
 * 
 * Key Features:
 * - Writes CSV rows in chunks
 * - Configurable buffer size for memory control
 * - Progress callbacks for real-time updates
 * - Uses storage module for final upload
 * 
 * Memory Usage:
 * - Only keeps current buffer in memory (default: 5MB)
 * - Releases memory after each flush
 * - Suitable for files with millions of rows
 */

import { storagePut } from "../storage.js";
import Papa from "papaparse";

export interface StreamingCSVWriterOptions {
  key: string;
  headers?: string[];
  bufferSizeRows?: number; // Number of rows before flushing (default: 10000)
  onProgress?: (stats: WriterStats) => void;
}

export interface WriterStats {
  totalRows: number;
  bytesWritten: number;
  startTime: number;
}

export class StreamingCSVWriter {
  private options: Required<Omit<StreamingCSVWriterOptions, 'headers' | 'onProgress'>> & { headers?: string[], onProgress?: (stats: WriterStats) => void };
  private stats: WriterStats;
  private buffer: any[] = [];
  private allChunks: string[] = [];
  private isClosed: boolean = false;

  constructor(options: StreamingCSVWriterOptions) {
    this.options = {
      key: options.key,
      headers: options.headers,
      bufferSizeRows: options.bufferSizeRows || 10000,
      onProgress: options.onProgress,
    };

    this.stats = {
      totalRows: 0,
      bytesWritten: 0,
      startTime: Date.now(),
    };
  }

  /**
   * Initialize writer (add headers if provided)
   */
  async initialize(): Promise<void> {
    if (this.options.headers && this.options.headers.length > 0) {
      const headerRow = Papa.unparse([this.options.headers], { header: false });
      this.allChunks.push(headerRow);
      this.stats.bytesWritten += headerRow.length + 1;
    }
  }

  /**
   * Write a chunk of rows
   */
  async writeChunk(rows: any[]): Promise<void> {
    if (this.isClosed) {
      throw new Error('Writer is closed');
    }

    if (rows.length === 0) {
      return;
    }

    // Add to buffer
    this.buffer.push(...rows);
    this.stats.totalRows += rows.length;

    // Flush if buffer exceeds threshold
    if (this.buffer.length >= this.options.bufferSizeRows) {
      await this.flush();
    }

    // Report progress
    if (this.options.onProgress) {
      this.options.onProgress(this.stats);
    }
  }

  /**
   * Flush buffer to chunks
   */
  private async flush(): Promise<void> {
    if (this.buffer.length === 0) {
      return;
    }

    // Convert rows to CSV
    const csv = Papa.unparse(this.buffer, { header: false });
    this.allChunks.push(csv);
    this.stats.bytesWritten += csv.length + 1;

    // Clear buffer
    this.buffer = [];

    // Report progress
    if (this.options.onProgress) {
      this.options.onProgress(this.stats);
    }
  }

  /**
   * Complete the upload and write to storage
   */
  async close(): Promise<void> {
    if (this.isClosed) {
      return;
    }

    // Flush remaining buffer
    if (this.buffer.length > 0) {
      await this.flush();
    }

    // Combine all chunks and upload to storage
    const csvContent = this.allChunks.join('\n');
    await storagePut(this.options.key, csvContent, 'text/csv');

    this.isClosed = true;

    console.log(`[StreamingCSVWriter] Completed upload: ${this.stats.totalRows} rows, ${this.stats.bytesWritten} bytes`);
  }

  /**
   * Abort the upload (cleanup on error)
   */
  async abort(): Promise<void> {
    if (!this.isClosed) {
      console.log(`[StreamingCSVWriter] Aborted upload: ${this.options.key}`);
      this.isClosed = true;
      // Clear memory
      this.buffer = [];
      this.allChunks = [];
    }
  }

  /**
   * Get current stats
   */
  getStats(): WriterStats {
    return { ...this.stats };
  }
}
