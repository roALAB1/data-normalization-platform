/**
 * DuckDB CRM Merge Worker
 * 
 * Processes CRM merge jobs using DuckDB for SQL-based processing.
 * Replaces CSV streaming with in-database operations for better performance.
 */

import { Worker, Job } from 'bullmq';
import type { CRMMergeJobData, CRMMergeProgress } from '../../shared/crmMergeTypes';
import { updateCRMMergeJobStatus, updateCRMMergeJobProgressSimple } from '../jobDb';
import { DuckDBMergeEngine, type MergeConfig, type MergeProgress } from '../services/DuckDBMergeEngine';

/**
 * Redis connection configuration
 */
const redisConnection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  maxRetriesPerRequest: null,
};

/**
 * DuckDB CRM Merge Worker
 * Processes CRM file merging jobs using DuckDB SQL engine
 */
export class DuckDBCRMMergeWorker {
  private worker: Worker<CRMMergeJobData>;
  private static instance: DuckDBCRMMergeWorker;
  private activeEngines: Map<string, DuckDBMergeEngine> = new Map();

  private constructor() {
    console.log('[DuckDBCRMMergeWorker] Initializing DuckDB CRM merge worker...');
    this.worker = new Worker<CRMMergeJobData>(
      'crm-merge-jobs-duckdb',
      async (job: Job<CRMMergeJobData>) => {
        return await this.processJob(job);
      },
      {
        connection: redisConnection,
        concurrency: parseInt(process.env.WORKER_CONCURRENCY || '3'), // DuckDB can handle more concurrency
        lockDuration: 1800000, // 30 minutes lock duration (large files may take longer)
        stalledInterval: 300000, // Check for stalled jobs every 5 minutes
        limiter: {
          max: 10, // Max 10 merge jobs (DuckDB is more efficient)
          duration: 1000, // per second
        },
      }
    );

    this.setupEventListeners();
    console.log('[DuckDBCRMMergeWorker] DuckDB CRM merge worker initialized successfully');
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): DuckDBCRMMergeWorker {
    if (!DuckDBCRMMergeWorker.instance) {
      DuckDBCRMMergeWorker.instance = new DuckDBCRMMergeWorker();
    }
    return DuckDBCRMMergeWorker.instance;
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners() {
    this.worker.on('completed', (job) => {
      console.log(`[DuckDBCRMMergeWorker] Job ${job.data.jobId} completed`);
      this.activeEngines.delete(job.data.jobId.toString());
    });

    this.worker.on('failed', (job, err) => {
      console.error(`[DuckDBCRMMergeWorker] Job ${job?.data.jobId} failed:`, err);
      if (job) {
        this.activeEngines.delete(job.data.jobId.toString());
      }
    });

    this.worker.on('error', (err) => {
      console.error('[DuckDBCRMMergeWorker] Worker error:', err);
    });
  }

  /**
   * Process a single CRM merge job using DuckDB
   */
  private async processJob(job: Job<CRMMergeJobData>): Promise<void> {
    const { jobId, originalFile, enrichedFiles, selectedIdentifiers, resolutionConfig } = job.data;

    try {
      console.log(`[DuckDBCRMMergeWorker] Processing CRM merge job ${jobId}`);
      console.log(`[DuckDBCRMMergeWorker] Original file: ${originalFile.s3Key}`);
      console.log(`[DuckDBCRMMergeWorker] Enriched files: ${enrichedFiles.length}`);

      // Update status to processing
      await updateCRMMergeJobStatus(jobId, 'processing', new Date());

      // Build merge configuration
      const mergeConfig: MergeConfig = {
        identifierColumns: selectedIdentifiers || ['email'],
        conflictResolution: (resolutionConfig?.defaultStrategy as any) || 'first',
        normalizeIdentifiers: true,
        includeMatchQuality: true,
      };

      // Create DuckDB merge engine with progress callback
      const engine = new DuckDBMergeEngine(
        jobId.toString(),
        mergeConfig,
        (progress: MergeProgress) => {
          // Convert DuckDB progress to CRM merge progress
          const crmProgress: CRMMergeProgress = {
            percentage: progress.progress,
            stage: this.mapDuckDBStageToJobStage(progress.stage),
            message: progress.message,
            rowsProcessed: progress.rowsProcessed,
            totalRows: progress.totalRows,
          };

          // Update Bull job progress
          job.updateProgress(crmProgress);

          // Update database progress (using rowsProcessed as processedRows)
          if (progress.rowsProcessed !== undefined) {
            updateCRMMergeJobProgressSimple(
              jobId,
              progress.rowsProcessed,
              0, // validRows - will be updated at completion
              0  // invalidRows - will be updated at completion
            ).catch(err => {
              console.error(`[DuckDBCRMMergeWorker] Failed to update progress for job ${jobId}:`, err);
            });
          }
        }
      );

      // Store active engine for cancellation
      this.activeEngines.set(jobId.toString(), engine);

      // Get S3 URLs for all files
      const originalS3Url = originalFile.s3Url || originalFile.s3Key;
      const enrichedS3Urls = enrichedFiles.map(f => f.s3Url || f.s3Key);

      // Execute merge workflow
      const result = await engine.executeMerge(originalS3Url, enrichedS3Urls);

      // Update job status to completed
      await updateCRMMergeJobStatus(
        jobId,
        'completed',
        undefined, // startedAt
        new Date(), // completedAt
        result.totalRows, // totalRows
        result.matchedRows, // validRows
        result.unmatchedRows, // invalidRows
        result.outputS3Key, // outputFileKey
        result.outputS3Url, // outputFileUrl
        undefined // errorMessage
      );

      console.log(`[DuckDBCRMMergeWorker] Job ${jobId} completed successfully`);
      console.log(`[DuckDBCRMMergeWorker] Processed ${result.totalRows} rows in ${result.processingTimeMs}ms`);
      console.log(`[DuckDBCRMMergeWorker] Match rate: ${((result.matchedRows / result.totalRows) * 100).toFixed(1)}%`);

      // Clean up
      this.activeEngines.delete(jobId.toString());
    } catch (error) {
      console.error(`[DuckDBCRMMergeWorker] Error processing job ${jobId}:`, error);

      // Update job status to failed
      await updateCRMMergeJobStatus(
        jobId,
        'failed',
        undefined, // startedAt
        new Date(), // completedAt
        undefined, // totalRows
        undefined, // validRows
        undefined, // invalidRows
        undefined, // outputFileKey
        undefined, // outputFileUrl
        error instanceof Error ? error.message : 'Unknown error' // errorMessage
      );

      // Clean up
      this.activeEngines.delete(jobId.toString());

      throw error;
    }
  }

  /**
   * Map DuckDB stage to CRM job stage
   */
  private mapDuckDBStageToJobStage(duckdbStage: string): "uploading" | "parsing" | "matching" | "merging" | "writing" | "complete" {
    const stageMap: Record<string, "uploading" | "parsing" | "matching" | "merging" | "writing" | "complete"> = {
      'import_original': 'parsing',
      'import_enriched': 'parsing',
      'consolidate': 'merging',
      'match': 'matching',
      'export': 'writing',
    };

    return stageMap[duckdbStage] || 'merging';
  }

  /**
   * Cancel a job
   */
  public async cancelJob(jobId: string): Promise<void> {
    const engine = this.activeEngines.get(jobId);
    if (engine) {
      console.log(`[DuckDBCRMMergeWorker] Cancelling job ${jobId}`);
      await engine.cancel();
      this.activeEngines.delete(jobId);
    }
  }

  /**
   * Close worker
   */
  public async close(): Promise<void> {
    console.log('[DuckDBCRMMergeWorker] Closing worker...');
    
    // Cancel all active jobs
    for (const [jobId, engine] of this.activeEngines.entries()) {
      console.log(`[DuckDBCRMMergeWorker] Cancelling active job ${jobId}`);
      await engine.cancel();
    }
    this.activeEngines.clear();

    await this.worker.close();
    console.log('[DuckDBCRMMergeWorker] Worker closed');
  }
}

// Initialize worker singleton
export const duckdbCRMMergeWorker = DuckDBCRMMergeWorker.getInstance();
