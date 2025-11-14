// @ts-nocheck
import { Worker, Job } from 'bullmq';
import { NormalizationJobData } from './JobQueue';
import { updateJobStatus, updateJobProgressSimple } from '../jobDb';
import { storageGet, storagePut } from '../storage';
import { IntelligentBatchProcessor } from '../services/IntelligentBatchProcessor';
import { NameEnhanced } from '../../shared/normalization/names/NameEnhanced';
import { PhoneEnhanced } from '../../shared/normalization/phones/PhoneEnhanced';
import { EmailEnhanced } from '../../shared/normalization/emails/EmailEnhanced';
import { AddressFormatter } from '../../shared/normalization/addresses/AddressFormatter';
import Papa from 'papaparse';

/**
 * Redis connection configuration
 */
const redisConnection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  maxRetriesPerRequest: null,
};

/**
 * Batch Worker
 * Processes normalization jobs from the queue
 */
export class BatchWorker {
  private worker: Worker<NormalizationJobData>;
  private static instance: BatchWorker;

  private constructor() {
    this.worker = new Worker<NormalizationJobData>(
      'normalization-jobs',
      async (job: Job<NormalizationJobData>) => {
        return await this.processJob(job);
      },
      {
        connection: redisConnection,
        concurrency: parseInt(process.env.WORKER_CONCURRENCY || '2'), // Process 2 jobs concurrently
        limiter: {
          max: 10, // Max 10 jobs
          duration: 1000, // per second
        },
      }
    );

    this.setupEventListeners();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): BatchWorker {
    if (!BatchWorker.instance) {
      BatchWorker.instance = new BatchWorker();
    }
    return BatchWorker.instance;
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners() {
    this.worker.on('completed', (job) => {
      console.log(`[BatchWorker] Job ${job.data.jobId} completed`);
    });

    this.worker.on('failed', (job, err) => {
      console.error(`[BatchWorker] Job ${job?.data.jobId} failed:`, err);
    });

    this.worker.on('error', (err) => {
      console.error('[BatchWorker] Worker error:', err);
    });
  }

  /**
   * Process a single job
   */
  private async processJob(job: Job<NormalizationJobData>): Promise<void> {
    const { jobId, userId, type, inputFileKey, config } = job.data;

    try {
      console.log(`[BatchWorker] Processing job ${jobId} (type: ${type})`);

      // Update status to processing
      await updateJobStatus(jobId, 'processing', new Date());

      // Download input file from S3
      const { url: inputFileUrl } = await storageGet(inputFileKey);
      const response = await fetch(inputFileUrl);
      const csvContent = await response.text();

      let outputCsv: string;
      let stats: { totalRows: number; validRows: number; invalidRows: number };

      if (type === 'intelligent') {
        // Use intelligent processor for multi-column normalization
        const processor = new IntelligentBatchProcessor();
        const result = await processor.process(
          csvContent,
          job.data.columnMappings,
          (progress) => {
            // Update job progress
            job.updateProgress(progress);
            updateJobProgressSimple(jobId, progress.processedRows, progress.validRows, progress.invalidRows);
          }
        );
        outputCsv = result.csv;
        stats = result.stats;
      } else {
        // Use single-type processor
        const result = await this.processSingleType(csvContent, type, config, (progress) => {
          job.updateProgress(progress);
          updateJobProgress(jobId, progress.processedRows, progress.validRows, progress.invalidRows);
        });
        outputCsv = result.csv;
        stats = result.stats;
      }

      // Upload output file to S3
      const outputFileKey = `jobs/${userId}/${Date.now()}-output.csv`;
      const { url: outputFileUrl } = await storagePut(
        outputFileKey,
        outputCsv,
        'text/csv'
      );

      // Update job with results
      await updateJobStatus(
        jobId,
        'completed',
        undefined,
        new Date(),
        stats.totalRows,
        stats.validRows,
        stats.invalidRows,
        outputFileKey,
        outputFileUrl
      );

      console.log(`[BatchWorker] Job ${jobId} completed successfully`);
    } catch (error) {
      console.error(`[BatchWorker] Error processing job ${jobId}:`, error);

      // Update job status to failed
      await updateJobStatus(
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
   * Process CSV with single normalization type
   */
  private async processSingleType(
    csvContent: string,
    type: string,
    config: any,
    onProgress: (progress: { processedRows: number; validRows: number; invalidRows: number }) => void
  ): Promise<{ csv: string; stats: { totalRows: number; validRows: number; invalidRows: number } }> {
    return new Promise((resolve, reject) => {
      const results: any[] = [];
      let processedRows = 0;
      let validRows = 0;
      let invalidRows = 0;

      Papa.parse(csvContent, {
        header: true,
        skipEmptyLines: true,
        step: (row: any) => {
          try {
            const inputValue = row.data[Object.keys(row.data)[0]]; // First column
            let normalizedValue: any;
            let isValid = false;

            switch (type) {
              case 'name':
                const name = new NameEnhanced(inputValue, { preserveAccents: config?.preserveAccents });
                normalizedValue = name.format('f l');
                isValid = name.isValid();
                break;

              case 'phone':
                const phone = new PhoneEnhanced(inputValue, config?.defaultCountry || 'US');
                normalizedValue = phone.format('international');
                isValid = phone.isValid();
                break;

              case 'email':
                const email = new EmailEnhanced(inputValue);
                normalizedValue = email.normalized;
                isValid = email.isValid();
                break;

              case 'address':
                const address = AddressFormatter.format(inputValue);
                normalizedValue = address;
                isValid = true; // Address formatter doesn't have validation
                break;

              default:
                normalizedValue = inputValue;
                isValid = false;
            }

            results.push({
              input: inputValue,
              output: normalizedValue,
              isValid,
            });

            processedRows++;
            if (isValid) validRows++;
            else invalidRows++;

            // Report progress every 100 rows
            if (processedRows % 100 === 0) {
              onProgress({ processedRows, validRows, invalidRows });
            }
          } catch (error) {
            console.error('Error processing row:', error);
            invalidRows++;
          }
        },
        complete: () => {
          // Final progress update
          onProgress({ processedRows, validRows, invalidRows });

          // Generate output CSV
          const outputCsv = Papa.unparse(results);

          resolve({
            csv: outputCsv,
            stats: {
              totalRows: processedRows,
              validRows,
              invalidRows,
            },
          });
        },
        error: (error: any) => {
          reject(error);
        },
      });
    });
  }

  /**
   * Close worker
   */
  public async close() {
    await this.worker.close();
    console.log('[BatchWorker] Worker closed');
  }
}

// Start worker if this file is run directly
if (require.main === module) {
  console.log('[BatchWorker] Starting batch worker...');
  const worker = BatchWorker.getInstance();
  
  // Graceful shutdown
  process.on('SIGTERM', async () => {
    console.log('[BatchWorker] SIGTERM received, closing worker...');
    await worker.close();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    console.log('[BatchWorker] SIGINT received, closing worker...');
    await worker.close();
    process.exit(0);
  });
}

export const batchWorker = BatchWorker.getInstance();
