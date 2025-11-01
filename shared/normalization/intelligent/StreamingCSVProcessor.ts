/**
 * Enterprise-scale CSV processor using PapaParse streaming
 * Handles 100k+ rows efficiently with chunked processing
 */

import Papa from 'papaparse';

export interface StreamingConfig {
  chunkSize: number; // Rows per chunk (1000-5000 recommended)
  skipEmptyLines: boolean;
  dynamicTyping: boolean;
  header: boolean;
}

export interface StreamingStats {
  totalRows: number;
  processedRows: number;
  chunksProcessed: number;
  startTime: number;
  rowsPerSecond: number;
  estimatedTimeRemaining: number; // milliseconds
  memoryUsage?: number; // MB
}

export interface StreamChunk {
  data: any[];
  chunkIndex: number;
  isLastChunk: boolean;
}

export type StreamProgressCallback = (stats: StreamingStats) => void;
export type StreamChunkCallback = (chunk: StreamChunk) => Promise<void>;
export type StreamCompleteCallback = (stats: StreamingStats) => void;
export type StreamErrorCallback = (error: Error) => void;

export class StreamingCSVProcessor {
  private config: StreamingConfig;
  private stats: StreamingStats;
  private isPaused: boolean = false;
  private isCancelled: boolean = false;
  private parser: Papa.Parser | null = null;

  constructor(config: Partial<StreamingConfig> = {}) {
    this.config = {
      chunkSize: config.chunkSize || 2000,
      skipEmptyLines: config.skipEmptyLines ?? true,
      dynamicTyping: config.dynamicTyping ?? false,
      header: config.header ?? true,
    };

    this.stats = {
      totalRows: 0,
      processedRows: 0,
      chunksProcessed: 0,
      startTime: Date.now(),
      rowsPerSecond: 0,
      estimatedTimeRemaining: 0,
    };
  }

  /**
   * Stream process a CSV file
   */
  async processFile(
    file: File,
    onChunk: StreamChunkCallback,
    onProgress?: StreamProgressCallback,
    onComplete?: StreamCompleteCallback,
    onError?: StreamErrorCallback
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      this.stats.startTime = Date.now();
      this.stats.processedRows = 0;
      this.stats.chunksProcessed = 0;
      this.isPaused = false;
      this.isCancelled = false;

      let chunkIndex = 0;
      let buffer: any[] = [];

      this.parser = Papa.parse(file, {
        ...this.config,
        chunk: async (results, parser) => {
          // Handle pause
          if (this.isPaused) {
            parser.pause();
            return;
          }

          // Handle cancellation
          if (this.isCancelled) {
            parser.abort();
            reject(new Error('Processing cancelled'));
            return;
          }

          // Add rows to buffer
          buffer.push(...results.data);

          // Process when buffer reaches chunk size
          if (buffer.length >= this.config.chunkSize) {
            parser.pause(); // Pause while processing

            const chunk = buffer.splice(0, this.config.chunkSize);
            
            try {
              await onChunk({
                data: chunk,
                chunkIndex: chunkIndex++,
                isLastChunk: false,
              });

              this.stats.processedRows += chunk.length;
              this.stats.chunksProcessed++;
              this.updateStats();

              if (onProgress) {
                onProgress(this.stats);
              }

              parser.resume(); // Resume streaming
            } catch (error) {
              parser.abort();
              if (onError) {
                onError(error as Error);
              }
              reject(error);
            }
          }
        },
        complete: async () => {
          try {
            // Process remaining buffer
            if (buffer.length > 0) {
              await onChunk({
                data: buffer,
                chunkIndex: chunkIndex++,
                isLastChunk: true,
              });

              this.stats.processedRows += buffer.length;
              this.stats.chunksProcessed++;
              this.updateStats();
            }

            if (onProgress) {
              onProgress(this.stats);
            }

            if (onComplete) {
              onComplete(this.stats);
            }

            resolve();
          } catch (error) {
            if (onError) {
              onError(error as Error);
            }
            reject(error);
          }
        },
        error: (error) => {
          if (onError) {
            onError(new Error(error.message));
          }
          reject(new Error(error.message));
        },
      });
    });
  }

  /**
   * Pause streaming
   */
  pause(): void {
    this.isPaused = true;
    if (this.parser) {
      this.parser.pause();
    }
  }

  /**
   * Resume streaming
   */
  resume(): void {
    this.isPaused = false;
    if (this.parser) {
      this.parser.resume();
    }
  }

  /**
   * Cancel streaming
   */
  cancel(): void {
    this.isCancelled = true;
    if (this.parser) {
      this.parser.abort();
    }
  }

  /**
   * Get current stats
   */
  getStats(): StreamingStats {
    return { ...this.stats };
  }

  /**
   * Update statistics
   */
  private updateStats(): void {
    const elapsedSeconds = (Date.now() - this.stats.startTime) / 1000;
    this.stats.rowsPerSecond = this.stats.processedRows / elapsedSeconds;

    // Estimate remaining time
    if (this.stats.totalRows > 0) {
      const remainingRows = this.stats.totalRows - this.stats.processedRows;
      this.stats.estimatedTimeRemaining = (remainingRows / this.stats.rowsPerSecond) * 1000;
    }

    // Estimate memory usage (rough approximation)
    if (performance && (performance as any).memory) {
      this.stats.memoryUsage = (performance as any).memory.usedJSHeapSize / 1024 / 1024;
    }
  }

  /**
   * Set total rows (if known in advance)
   */
  setTotalRows(total: number): void {
    this.stats.totalRows = total;
  }
}
