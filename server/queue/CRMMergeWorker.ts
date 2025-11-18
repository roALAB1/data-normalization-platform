/**
 * CRM Merge Worker
 * Processes CRM merge jobs from the queue
 */

import { Worker, Job } from 'bullmq';
import type { CRMMergeJobData, CRMMergeProgress } from '../../shared/crmMergeTypes';
import { updateCRMMergeJobStatus, updateCRMMergeJobProgressSimple } from '../jobDb';
import { CRMMergeProcessor } from '../services/CRMMergeProcessor';

/**
 * Redis connection configuration
 */
const redisConnection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  maxRetriesPerRequest: null,
};

/**
 * CRM Merge Worker
 * Processes CRM file merging jobs from the queue
 */
export class CRMMergeWorker {
  private worker: Worker<CRMMergeJobData>;
  private static instance: CRMMergeWorker;

  private constructor() {
    console.log('[CRMMergeWorker] Initializing CRM merge worker...');
    this.worker = new Worker<CRMMergeJobData>(
      'crm-merge-jobs',
      async (job: Job<CRMMergeJobData>) => {
        return await this.processJob(job);
      },
      {
        connection: redisConnection,
        concurrency: parseInt(process.env.WORKER_CONCURRENCY || '2'), // Process 2 jobs concurrently
        lockDuration: 600000, // 10 minutes lock duration (jobs can take up to 10 min)
        stalledInterval: 300000, // Check for stalled jobs every 5 minutes
        limiter: {
          max: 5, // Max 5 merge jobs
          duration: 1000, // per second
        },
      }
    );

    this.setupEventListeners();
    console.log('[CRMMergeWorker] CRM merge worker initialized successfully');
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): CRMMergeWorker {
    if (!CRMMergeWorker.instance) {
      CRMMergeWorker.instance = new CRMMergeWorker();
    }
    return CRMMergeWorker.instance;
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners() {
    this.worker.on('completed', (job) => {
      console.log(`[CRMMergeWorker] Job ${job.data.jobId} completed`);
    });

    this.worker.on('failed', (job, err) => {
      console.error(`[CRMMergeWorker] Job ${job?.data.jobId} failed:`, err);
    });

    this.worker.on('error', (err) => {
      console.error('[CRMMergeWorker] Worker error:', err);
    });
  }

  /**
   * Process a single CRM merge job
   */
  private async processJob(job: Job<CRMMergeJobData>): Promise<void> {
    const { jobId } = job.data;

    try {
      console.log(`[CRMMergeWorker] Processing CRM merge job ${jobId}`);

      // Update status to processing
      await updateCRMMergeJobStatus(jobId, 'processing', new Date());

      // Create processor with progress callback
      const processor = new CRMMergeProcessor(job.data, (progress: CRMMergeProgress) => {
        // Update Bull job progress
        job.updateProgress({
          percentage: progress.percentage,
          stage: progress.stage,
          message: progress.message,
        });

        // Update database progress
        updateCRMMergeJobProgressSimple(
          jobId,
          progress.rowsProcessed,
          progress.rowsProcessed, // validRows (all rows are valid in merge)
          0 // invalidRows (no invalid rows in merge)
        );
      });

      // Process the merge
      const result = await processor.process();

      if (result.success) {
        // Update job with results
        await updateCRMMergeJobStatus(
          jobId,
          'completed',
          undefined,
          new Date(),
          result.outputRowCount,
          result.outputRowCount,
          0,
          result.outputFileKey,
          result.outputFileUrl
        );

        console.log(`[CRMMergeWorker] Job ${jobId} completed successfully`);
      } else {
        throw new Error(result.error || 'Unknown error during merge');
      }
    } catch (error) {
      console.error(`[CRMMergeWorker] Error processing job ${jobId}:`, error);

      // Update job status to failed
      await updateCRMMergeJobStatus(
        jobId,
        'failed',
        undefined,
        new Date(),
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        error instanceof Error ? error.message : 'Unknown error'
      );

      throw error; // Re-throw to trigger retry mechanism
    }
  }

  /**
   * Close worker
   */
  public async close() {
    await this.worker.close();
    console.log('[CRMMergeWorker] Worker closed');
  }
}

// Start worker if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('[CRMMergeWorker] Starting CRM merge worker...');
  const worker = CRMMergeWorker.getInstance();
  
  // Graceful shutdown
  process.on('SIGTERM', async () => {
    console.log('[CRMMergeWorker] SIGTERM received, closing worker...');
    await worker.close();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    console.log('[CRMMergeWorker] SIGINT received, closing worker...');
    await worker.close();
    process.exit(0);
  });
}

export const crmMergeWorker = CRMMergeWorker.getInstance();
