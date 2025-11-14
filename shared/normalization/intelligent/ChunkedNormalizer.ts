// @ts-nocheck
/**
 * Chunked normalizer with Web Worker pool for parallel processing
 * Distributes chunks across multiple workers for maximum throughput
 */

import type { NormalizationStrategy } from './UnifiedNormalizationEngine';
import type { WorkerMessage, WorkerResponse } from '../../../client/src/workers/normalization.worker';

// Helper to generate unique worker IDs
function generateWorkerId(): string {
  return `worker-${Date.now()}-${Math.random().toString(36).substring(7)}`;
}

// Helper to report metrics to server (fire and forget)
function reportMetrics(endpoint: string, data: any): void {
  if (typeof window === 'undefined') return;
  try {
    fetch(`/api/trpc/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).catch(() => {}); // Ignore errors
  } catch (e) {
    // Ignore metrics errors
  }
}

export interface ChunkedNormalizerConfig {
  workerPoolSize?: number;
  chunkSize?: number;
  maxConcurrentChunks?: number;
  maxRetries?: number;
  retryDelayMs?: number;
  maxWorkerMemoryMB?: number;
  workerRecycleAfterChunks?: number;
}

export interface ProcessingStats {
  totalChunks: number;
  processedChunks: number;
  totalRows: number;
  processedRows: number;
  failedChunks: number;
  retriedChunks: number;
  startTime: number;
  chunksPerSecond: number;
}

export type ChunkProgressCallback = (stats: ProcessingStats) => void;

export class ChunkedNormalizer {
  private config: Required<ChunkedNormalizerConfig>;
  private workers: Worker[] = [];
  private workerChunkCounts: Map<Worker, number> = new Map();
  private workerIds: Map<Worker, string> = new Map();
  private stats: ProcessingStats;
  private isCancelled: boolean = false;
  private metricsInterval: number | null = null;

  constructor(config: ChunkedNormalizerConfig = {}) {
    this.config = {
      workerPoolSize: config.workerPoolSize || navigator.hardwareConcurrency || 4,
      chunkSize: config.chunkSize || 2000,
      maxConcurrentChunks: config.maxConcurrentChunks || 8,
      maxRetries: config.maxRetries || 3,
      retryDelayMs: config.retryDelayMs || 1000,
      maxWorkerMemoryMB: config.maxWorkerMemoryMB || 500,
      workerRecycleAfterChunks: config.workerRecycleAfterChunks || 100,
    };

    this.stats = {
      totalChunks: 0,
      processedChunks: 0,
      totalRows: 0,
      processedRows: 0,
      failedChunks: 0,
      retriedChunks: 0,
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
        const workerId = generateWorkerId();
        this.workers.push(worker);
        this.workerChunkCounts.set(worker, 0);
        this.workerIds.set(worker, workerId);
        console.log(`[Worker ${i}] Initialized with ID: ${workerId}`);
      } catch (error) {
        console.error('Failed to create worker:', error);
      }
    }
  }

  /**
   * Process chunks in parallel
   * 
   * @param chunks - Array of data chunks to process
   * @param strategy - Normalization strategy
   * @param onProgress - Progress callback
   * @param outputColumns - Optional list of columns to include in output
   */
  async processChunks(
    chunks: any[][],
    strategy: NormalizationStrategy,
    onProgress?: ChunkProgressCallback,
    outputColumns?: string[]
  ): Promise<any[][]> {
    // Initialize stats
    this.stats = {
      totalChunks: chunks.length,
      processedChunks: 0,
      totalRows: chunks.reduce((sum, chunk) => sum + chunk.length, 0),
      processedRows: 0,
      failedChunks: 0,
      retriedChunks: 0,
      startTime: Date.now(),
      chunksPerSecond: 0,
    };

    this.isCancelled = false;

    // Initialize workers
    await this.initializeWorkers();
    
    // Start periodic metrics snapshot (every 5 seconds)
    this.startMetricsReporting();

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

        const promise = this.processChunkWithRetry(chunk, strategy, currentIndex, outputColumns)
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
            console.error(`Failed to process chunk ${currentIndex} after ${this.config.maxRetries} retries:`, error);
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

    // Stop metrics reporting
    this.stopMetricsReporting();
    
    // Send final snapshot
    reportMetrics('metrics.takeSnapshot', {});
    
    return results;
  }
  
  /**
   * Start periodic metrics reporting
   */
  private startMetricsReporting(): void {
    // Report active workers count every 5 seconds
    this.metricsInterval = window.setInterval(() => {
      reportMetrics('metrics.takeSnapshot', {});
    }, 5000);
  }
  
  /**
   * Stop periodic metrics reporting
   */
  private stopMetricsReporting(): void {
    if (this.metricsInterval !== null) {
      clearInterval(this.metricsInterval);
      this.metricsInterval = null;
    }
  }

  /**
   * Get or recycle worker for processing
   */
  private async getWorker(chunkIndex: number): Promise<Worker> {
    const workerIndex = chunkIndex % this.workers.length;
    let worker = this.workers[workerIndex];
    const chunkCount = this.workerChunkCounts.get(worker) || 0;

    // Recycle worker if it has processed too many chunks
    if (chunkCount >= this.config.workerRecycleAfterChunks) {
      const oldWorkerId = this.workerIds.get(worker) || 'unknown';
      console.log(`[Worker ${workerIndex}] Recycling after ${chunkCount} chunks`);
      
      // Report recycling event
      reportMetrics('metrics.reportRecycling', {
        workerId: oldWorkerId,
        reason: 'max_chunks',
        chunksProcessed: chunkCount,
        memoryUsedMB: 0, // Not available in browser
      });
      
      worker.terminate();
      
      // Create new worker
      const newWorker = new Worker(
        new URL('../../../client/src/workers/normalization.worker.ts', import.meta.url),
        { type: 'module' }
      );
      const newWorkerId = generateWorkerId();
      this.workers[workerIndex] = newWorker;
      this.workerChunkCounts.set(newWorker, 0);
      this.workerIds.set(newWorker, newWorkerId);
      console.log(`[Worker ${workerIndex}] Recycled with new ID: ${newWorkerId}`);
      worker = newWorker;
    }

    return worker;
  }

  /**
   * Process a single chunk
   */
  private async processChunk(
    chunk: any[],
    strategy: NormalizationStrategy,
    chunkIndex: number,
    outputColumns?: string[]
  ): Promise<any[]> {
    // Get available worker (with recycling)
    const worker = await this.getWorker(chunkIndex);

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
          outputColumns,
        },
      };

      worker.postMessage(message);
    }).finally(() => {
      // Increment chunk count for this worker
      const count = this.workerChunkCounts.get(worker) || 0;
      this.workerChunkCounts.set(worker, count + 1);
    });
  }

  /**
   * Process a chunk with automatic retry on failure
   * Uses exponential backoff: 1s, 2s, 4s, 8s, max 30s
   */
  private async processChunkWithRetry(
    chunk: any[],
    strategy: NormalizationStrategy,
    chunkIndex: number,
    outputColumns?: string[],
    attempt: number = 0
  ): Promise<any[]> {
    try {
      return await this.processChunk(chunk, strategy, chunkIndex, outputColumns);
    } catch (error) {
      if (attempt >= this.config.maxRetries) {
        // Max retries reached, throw error
        throw error;
      }

      // Calculate exponential backoff delay (1s, 2s, 4s, 8s, max 30s)
      const delay = Math.min(
        this.config.retryDelayMs * Math.pow(2, attempt),
        30000
      );

      console.warn(
        `Chunk ${chunkIndex} failed (attempt ${attempt + 1}/${this.config.maxRetries}), ` +
        `retrying in ${delay}ms...`,
        error
      );

      this.stats.retriedChunks++;
      
      // Report retry event
      reportMetrics('metrics.reportRetry', {
        chunkId: chunkIndex,
        attemptNumber: attempt + 1,
        error: error instanceof Error ? error.message : String(error),
        delayMs: delay,
      });

      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, delay));

      // Retry with incremented attempt counter
      return this.processChunkWithRetry(
        chunk,
        strategy,
        chunkIndex,
        outputColumns,
        attempt + 1
      );
    }
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
    this.stopMetricsReporting();
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
    this.workerChunkCounts.clear();
    this.workerIds.clear();
    console.log('[Workers] All workers terminated and cleaned up');
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
    this.stopMetricsReporting();
    this.terminateWorkers();
  }
}
