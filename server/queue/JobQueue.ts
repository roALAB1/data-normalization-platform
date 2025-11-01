import { Queue, QueueEvents, Worker } from 'bullmq';
import Redis from 'ioredis';
import { updateJobStatus, updateJobProgress } from '../jobDb';

/**
 * Redis connection configuration
 * Uses environment variables or defaults to localhost
 */
const redisConnection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  maxRetriesPerRequest: null, // Required for BullMQ
};

/**
 * Job data structure for normalization jobs
 */
export interface NormalizationJobData {
  jobId: number;
  userId: number;
  type: 'intelligent' | 'name' | 'phone' | 'email' | 'address';
  inputFileKey: string;
  inputFileUrl: string;
  config?: {
    preserveAccents?: boolean;
    defaultCountry?: string;
    [key: string]: any;
  };
}

/**
 * Job Queue Manager
 * Manages the BullMQ queue for batch normalization jobs
 */
export class JobQueue {
  private queue: Queue<NormalizationJobData>;
  private queueEvents: QueueEvents;
  private static instance: JobQueue;

  private constructor() {
    // Create the normalization jobs queue
    this.queue = new Queue<NormalizationJobData>('normalization-jobs', {
      connection: redisConnection,
      defaultJobOptions: {
        attempts: 3, // Retry failed jobs up to 3 times
        backoff: {
          type: 'exponential',
          delay: 5000, // Start with 5 second delay
        },
        removeOnComplete: {
          age: 24 * 3600, // Keep completed jobs for 24 hours
          count: 1000, // Keep last 1000 completed jobs
        },
        removeOnFail: {
          age: 7 * 24 * 3600, // Keep failed jobs for 7 days
        },
      },
    });

    // Queue events for monitoring
    this.queueEvents = new QueueEvents('normalization-jobs', {
      connection: redisConnection,
    });

    this.setupEventListeners();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): JobQueue {
    if (!JobQueue.instance) {
      JobQueue.instance = new JobQueue();
    }
    return JobQueue.instance;
  }

  /**
   * Setup event listeners for queue events
   */
  private setupEventListeners() {
    this.queueEvents.on('completed', async ({ jobId, returnvalue }) => {
      console.log(`[JobQueue] Job ${jobId} completed successfully`);
      // Additional completion handling if needed
    });

    this.queueEvents.on('failed', async ({ jobId, failedReason }) => {
      console.error(`[JobQueue] Job ${jobId} failed:`, failedReason);
      // Additional failure handling if needed
    });

    this.queueEvents.on('progress', async ({ jobId, data }) => {
      console.log(`[JobQueue] Job ${jobId} progress:`, data);
    });
  }

  /**
   * Add a new job to the queue
   * @param data Job data including jobId, userId, type, and file info
   * @returns Bull Job instance
   */
  public async addJob(data: NormalizationJobData) {
    try {
      const job = await this.queue.add(
        `job-${data.jobId}`,
        data,
        {
          jobId: `job-${data.jobId}`, // Use database job ID as Bull job ID
          priority: 1, // Default priority (lower number = higher priority)
        }
      );

      // Update database status to 'pending'
      await updateJobStatus(data.jobId, 'pending');

      console.log(`[JobQueue] Added job ${data.jobId} to queue`);
      return job;
    } catch (error) {
      console.error(`[JobQueue] Error adding job ${data.jobId}:`, error);
      throw error;
    }
  }

  /**
   * Get job status from queue
   * @param jobId Database job ID
   * @returns Job status and progress
   */
  public async getJobStatus(jobId: number) {
    try {
      const job = await this.queue.getJob(`job-${jobId}`);
      
      if (!job) {
        return null;
      }

      const state = await job.getState();
      const progress = job.progress;

      return {
        id: jobId,
        state,
        progress,
        attemptsMade: job.attemptsMade,
        processedOn: job.processedOn,
        finishedOn: job.finishedOn,
        failedReason: job.failedReason,
      };
    } catch (error) {
      console.error(`[JobQueue] Error getting job status ${jobId}:`, error);
      return null;
    }
  }

  /**
   * Cancel a pending or active job
   * @param jobId Database job ID
   */
  public async cancelJob(jobId: number) {
    try {
      const job = await this.queue.getJob(`job-${jobId}`);
      
      if (!job) {
        throw new Error(`Job ${jobId} not found in queue`);
      }

      await job.remove();
      await updateJobStatus(jobId, 'cancelled');

      console.log(`[JobQueue] Cancelled job ${jobId}`);
    } catch (error) {
      console.error(`[JobQueue] Error cancelling job ${jobId}:`, error);
      throw error;
    }
  }

  /**
   * Retry a failed job
   * @param jobId Database job ID
   */
  public async retryJob(jobId: number) {
    try {
      const job = await this.queue.getJob(`job-${jobId}`);
      
      if (!job) {
        throw new Error(`Job ${jobId} not found in queue`);
      }

      await job.retry();
      await updateJobStatus(jobId, 'pending');

      console.log(`[JobQueue] Retrying job ${jobId}`);
    } catch (error) {
      console.error(`[JobQueue] Error retrying job ${jobId}:`, error);
      throw error;
    }
  }

  /**
   * Get queue statistics
   */
  public async getStats() {
    try {
      const [waiting, active, completed, failed, delayed] = await Promise.all([
        this.queue.getWaitingCount(),
        this.queue.getActiveCount(),
        this.queue.getCompletedCount(),
        this.queue.getFailedCount(),
        this.queue.getDelayedCount(),
      ]);

      return {
        waiting,
        active,
        completed,
        failed,
        delayed,
        total: waiting + active + completed + failed + delayed,
      };
    } catch (error) {
      console.error('[JobQueue] Error getting queue stats:', error);
      throw error;
    }
  }

  /**
   * Clean up old jobs
   */
  public async cleanup() {
    try {
      await this.queue.clean(24 * 3600 * 1000, 1000, 'completed'); // Clean completed jobs older than 24h
      await this.queue.clean(7 * 24 * 3600 * 1000, 1000, 'failed'); // Clean failed jobs older than 7 days
      console.log('[JobQueue] Cleanup completed');
    } catch (error) {
      console.error('[JobQueue] Error during cleanup:', error);
    }
  }

  /**
   * Close queue connections
   */
  public async close() {
    await this.queue.close();
    await this.queueEvents.close();
    console.log('[JobQueue] Connections closed');
  }
}

// Export singleton instance
export const jobQueue = JobQueue.getInstance();
