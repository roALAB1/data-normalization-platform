// @ts-nocheck
import { Worker, Job } from 'bullmq';
import { NormalizationJobData } from './JobQueue';
import { updateJobStatus, updateJobProgressSimple } from '../jobDb';
import { storageGet, storagePut } from '../storage';
import { IntelligentBatchProcessor } from '../services/IntelligentBatchProcessor';
import { StreamingIntelligentProcessor } from '../services/StreamingIntelligentProcessor';
import { NameEnhanced } from '../../shared/normalization/names';
import { PhoneEnhanced } from '../../shared/normalization/phones';
import { EmailEnhanced } from '../../shared/normalization/emails';
import { AddressFormatter } from '../../shared/normalization/addresses';
import Papa from 'papaparse';

// Threshold for switching to streaming processing (50k rows)
const STREAMING_THRESHOLD = 50000;

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

      // Get input file URL
      const { url: inputFileUrl } = await storageGet(inputFileKey);

      // Count rows to determine processing strategy
      const rowCountResponse = await fetch(inputFileUrl);
      const sampleContent = await rowCountResponse.text();
      const rowCount = sampleContent.split('\n').length - 1; // Subtract header

      console.log(`[BatchWorker] Job ${jobId} has ${rowCount} rows`);

      let outputCsv: string | undefined;
      let outputFileKey: string | undefined;
      let stats: { totalRows: number; validRows: number; invalidRows: number };

      if (type === 'intelligent') {
        if (rowCount >= STREAMING_THRESHOLD) {
          // Use streaming processor for large files (>= 50k rows)
          console.log(`[BatchWorker] Using streaming processor for ${rowCount} rows`);
          const processor = new StreamingIntelligentProcessor();
          outputFileKey = `jobs/${userId}/${Date.now()}-output.csv`;
          
          const result = await processor.processStreaming(
            inputFileUrl,
            outputFileKey,
            (progress) => {
              job.updateProgress(progress);
              updateJobProgressSimple(jobId, progress.processedRows, progress.validRows, progress.invalidRows);
            }
          );
          
          stats = {
            totalRows: result.stats.totalRows,
            validRows: result.stats.validRows,
            invalidRows: result.stats.invalidRows,
          };
          // outputCsv is undefined - file already written to S3
        } else {
          // Use in-memory processor for small files (< 50k rows)
          console.log(`[BatchWorker] Using in-memory processor for ${rowCount} rows`);
          const processor = new IntelligentBatchProcessor();
          const result = await processor.process(
            sampleContent,
            job.data.columnMappings,
            (progress) => {
              job.updateProgress(progress);
              updateJobProgressSimple(jobId, progress.processedRows, progress.validRows, progress.invalidRows);
            }
          );
          outputCsv = result.csv;
          stats = result.stats;
        }
      } else {
        // Use single-type processor (always in-memory for single-type)
        const result = await this.processSingleType(sampleContent, type, config, (progress) => {
          job.updateProgress(progress);
          updateJobProgressSimple(jobId, progress.processedRows, progress.validRows, progress.invalidRows);
        });
        outputCsv = result.csv;
        stats = result.stats;
      }

      // Upload output file to S3 (if not already uploaded by streaming processor)
      let finalOutputFileKey: string;
      let outputFileUrl: string;
      
      if (outputCsv) {
        // In-memory processing - need to upload
        finalOutputFileKey = `jobs/${userId}/${Date.now()}-output.csv`;
        const uploadResult = await storagePut(
          finalOutputFileKey,
          outputCsv,
          'text/csv'
        );
        outputFileUrl = uploadResult.url;
      } else if (outputFileKey) {
        // Streaming processing - file already uploaded
        finalOutputFileKey = outputFileKey;
        const { url } = await storageGet(outputFileKey);
        outputFileUrl = url;
      } else {
        throw new Error('No output file generated');
      }

      // Update job with results
      await updateJobStatus(
        jobId,
        'completed',
        undefined,
        new Date(),
        stats.totalRows,
        stats.validRows,
        stats.invalidRows,
        finalOutputFileKey,
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
                const phone = new PhoneEnhanced(inputValue, { defaultCountry: config?.defaultCountry || 'US' });
                normalizedValue = phone.format('international');
                isValid = phone.result.isValid;
                break;

              case 'email':
                const email = new EmailEnhanced(inputValue);
                normalizedValue = email.normalized;
                isValid = email.isValid;
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

// Export singleton instance
export const batchWorker = BatchWorker.getInstance();
