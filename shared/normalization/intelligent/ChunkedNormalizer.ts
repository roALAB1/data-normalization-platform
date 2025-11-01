/**
 * Chunked normalizer with Web Worker pool for parallel processing
 * Distributes chunks across multiple workers for maximum throughput
 */

import type { NormalizationStrategy } from './UnifiedNormalizationEngine';
import type { WorkerMessage, WorkerResponse } from '../../../client/src/workers/normalization.worker';

export interface ChunkedNormalizerConfig {
  workerPoolSize?: number;
  chunkSize?: number;
  maxConcurrentChunks?: number;
}

export interface ProcessingStats {
  totalChunks: number;
  processedChunks: number;
  totalRows: number;
  processedRows: number;
  failedChunks: number;
  startTime: number;
  chunksPerSecond: number;
}

export type ChunkProgressCallback = (stats: ProcessingStats) => void;

export class ChunkedNormalizer {
  private config: Required<ChunkedNormalizerConfig>;
  private workers: Worker[] = [];
  private stats: ProcessingStats;
  private isCancelled: boolean = false;

  constructor(config: ChunkedNormalizerConfig = {}) {
    this.config = {
      workerPoolSize: config.workerPoolSize || navigator.hardwareConcurrency || 4,
      chunkSize: config.chunkSize || 2000,
      maxConcurrentChunks: config.maxConcurrentChunks || 8,
    };

    this.stats = {
      totalChunks: 0,
      processedChunks: 0,
      totalRows: 0,
      processedRows: 0,
      failedChunks: 0,
      startTime: Date.now(),
      chunksPerSecond: 0,
    };
  }

  /**
   * Initialize worker pool
   */
  private async initializeWorkers(): Promise<void> {
    // Terminate existing workers
    this.terminateWorkers();

    // Create new workers
    for (let i = 0; i < this.config.workerPoolSize; i++) {
      try {
        const worker = new Worker(
          new URL('../../../client/src/workers/normalization.worker.ts', import.meta.url),
          { type: 'module' }
        );
        this.workers.push(worker);
      } catch (error) {
        console.error('Failed to create worker:', error);
      }
    }
  }

  /**
   * Process chunks in parallel
   */
  async processChunks(
    chunks: any[][],
    strategy: NormalizationStrategy,
    onProgress?: ChunkProgressCallback
  ): Promise<any[][]> {
    // Initialize stats
    this.stats = {
      totalChunks: chunks.length,
      processedChunks: 0,
      totalRows: chunks.reduce((sum, chunk) => sum + chunk.length, 0),
      processedRows: 0,
      failedChunks: 0,
      startTime: Date.now(),
      chunksPerSecond: 0,
    };

    this.isCancelled = false;

    // Initialize workers
    await this.initializeWorkers();

    if (this.workers.length === 0) {
      throw new Error('Failed to initialize workers');
    }

    // Process chunks with concurrency limit
    const results: any[][] = new Array(chunks.length);
    const concurrencyLimit = Math.min(
      this.config.maxConcurrentChunks,
      this.workers.length
    );

    let chunkIndex = 0;
    const activePromises = new Set<Promise<void>>();

    while (chunkIndex < chunks.length || activePromises.size > 0) {
      // Check if cancelled
      if (this.isCancelled) {
        throw new Error('Processing cancelled');
      }

      // Start new chunks while under concurrency limit
      while (chunkIndex < chunks.length && activePromises.size < concurrencyLimit) {
        const currentIndex = chunkIndex++;
        const chunk = chunks[currentIndex];

        const promise = this.processChunk(chunk, strategy, currentIndex)
          .then((result) => {
            results[currentIndex] = result;
            this.stats.processedChunks++;
            this.stats.processedRows += chunk.length;
            this.updateStats();

            if (onProgress) {
              onProgress(this.stats);
            }
          })
          .catch((error) => {
            console.error(`Failed to process chunk ${currentIndex}:`, error);
            this.stats.failedChunks++;
            results[currentIndex] = []; // Empty result for failed chunk
          })
          .finally(() => {
            activePromises.delete(promise);
          });

        activePromises.add(promise);
      }

      // Wait for at least one promise to complete
      if (activePromises.size > 0) {
        await Promise.race(activePromises);
      }
    }

    return results;
  }

  /**
   * Process a single chunk
   */
  private async processChunk(
    chunk: any[],
    strategy: NormalizationStrategy,
    chunkIndex: number
  ): Promise<any[]> {
    // Get available worker (round-robin)
    const worker = this.workers[chunkIndex % this.workers.length];

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Worker timeout'));
      }, 60000); // 60 second timeout

      const messageHandler = (event: MessageEvent<WorkerResponse>) => {
        const { type, payload } = event.data;

        if (payload?.chunkIndex !== chunkIndex) return;

        clearTimeout(timeout);
        worker.removeEventListener('message', messageHandler);
        worker.removeEventListener('error', errorHandler);

        if (type === 'complete' && payload.results) {
          resolve(payload.results);
        } else if (type === 'error') {
          reject(new Error(payload.error || 'Unknown worker error'));
        }
      };

      const errorHandler = (error: ErrorEvent) => {
        clearTimeout(timeout);
        worker.removeEventListener('message', messageHandler);
        worker.removeEventListener('error', errorHandler);
        reject(error);
      };

      worker.addEventListener('message', messageHandler);
      worker.addEventListener('error', errorHandler);

      // Send work to worker
      const message: WorkerMessage = {
        type: 'process',
        payload: {
          chunk,
          strategy,
          chunkIndex,
        },
      };

      worker.postMessage(message);
    });
  }

  /**
   * Update statistics
   */
  private updateStats(): void {
    const elapsedSeconds = (Date.now() - this.stats.startTime) / 1000;
    this.stats.chunksPerSecond = this.stats.processedChunks / elapsedSeconds;
  }

  /**
   * Cancel processing
   */
  cancel(): void {
    this.isCancelled = true;
    this.terminateWorkers();
  }

  /**
   * Terminate all workers
   */
  private terminateWorkers(): void {
    for (const worker of this.workers) {
      worker.terminate();
    }
    this.workers = [];
  }

  /**
   * Get current stats
   */
  getStats(): ProcessingStats {
    return { ...this.stats };
  }

  /**
   * Cleanup
   */
  destroy(): void {
    this.terminateWorkers();
  }
}
