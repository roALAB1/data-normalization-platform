// @ts-nocheck
import { z } from "zod";
import { protectedProcedure, router } from "./_core/trpc";
import { createJob, getUserJobs, getJobById, cancelJob, getJobResults } from "./jobDb";
import { storagePut } from "./storage";
import { TRPCError } from "@trpc/server";
import { rateLimitMiddleware, RateLimits } from "./_core/rateLimit";

export const jobRouter = router({
  /**
   * Create a new normalization job
   */
  create: protectedProcedure
    .input(
      z.object({
        type: z.enum(["name", "phone", "email", "company", "address"]),
        fileContent: z.string(), // CSV content
        fileName: z.string(),
        config: z.object({
          preserveAccents: z.boolean().optional(),
          defaultCountry: z.string().optional(),
        }).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Rate limiting: 10 jobs per hour
      const rateLimit = await rateLimitMiddleware(ctx.user.id, RateLimits.JOB_CREATE);

      // Upload input file to S3
      const inputFileKey = `jobs/${ctx.user.id}/${Date.now()}-${input.fileName}`;
      const { url: inputFileUrl } = await storagePut(
        inputFileKey,
        input.fileContent,
        "text/csv"
      );

      // Count rows
      const lines = input.fileContent.split('\n').filter(l => l.trim());
      const totalRows = lines.length - 1; // Exclude header if present

      if (totalRows === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "File is empty",
        });
      }

      if (totalRows > 1000000) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "File too large. Maximum 1,000,000 rows.",
        });
      }

      // Create job record
      const jobId = await createJob({
        userId: ctx.user.id,
        type: input.type,
        totalRows,
        inputFileKey,
        inputFileUrl,
        config: input.config || {},
      });

      return {
        jobId,
        totalRows,
        message: `Job created successfully. Processing ${totalRows} rows.`,
        // Include rate limit info in response
        rateLimit: {
          limit: rateLimit.limit,
          remaining: rateLimit.remaining,
          reset: rateLimit.reset,
        },
      };
    }),

  /**
   * Get all jobs for current user
   */
  list: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(50),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const jobs = await getUserJobs(ctx.user.id, input?.limit || 50);
      return jobs;
    }),

  /**
   * Get job details by ID
   */
  get: protectedProcedure
    .input(z.object({ jobId: z.number() }))
    .query(async ({ ctx, input }) => {
      const job = await getJobById(input.jobId);
      
      if (!job) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Job not found",
        });
      }

      if (job.userId !== ctx.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have access to this job",
        });
      }

      return job;
    }),

  /**
   * Get job results with pagination
   */
  getResults: protectedProcedure
    .input(
      z.object({
        jobId: z.number(),
        offset: z.number().min(0).default(0),
        limit: z.number().min(1).max(1000).default(100),
      })
    )
    .query(async ({ ctx, input }) => {
      const job = await getJobById(input.jobId);
      
      if (!job) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Job not found",
        });
      }

      if (job.userId !== ctx.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have access to this job",
        });
      }

      const results = await getJobResults(input.jobId, input.offset, input.limit);
      return results;
    }),

  /**
   * Cancel a pending job
   */
  cancel: protectedProcedure
    .input(z.object({ jobId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const job = await getJobById(input.jobId);
      
      if (!job) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Job not found",
        });
      }

      if (job.userId !== ctx.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have access to this job",
        });
      }

      if (job.status !== "pending") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Only pending jobs can be cancelled",
        });
      }

      await cancelJob(input.jobId);
      
      return {
        success: true,
        message: "Job cancelled successfully",
      };
    }),

  /**
   * Submit intelligent batch job (multi-column normalization)
   */
  submitBatch: protectedProcedure
    .input(
      z.object({
        fileContent: z.string(),
        fileName: z.string(),
        columnMappings: z.record(z.string()).optional(), // Mapping of column names to types
        config: z.object({
          preserveAccents: z.boolean().optional(),
          defaultCountry: z.string().optional(),
        }).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { jobQueue } = await import('./queue/JobQueue');
      
      // Upload input file to S3
      const inputFileKey = `jobs/${ctx.user.id}/${Date.now()}-${input.fileName}`;
      const { url: inputFileUrl } = await storagePut(
        inputFileKey,
        input.fileContent,
        "text/csv"
      );

      // Count rows
      const lines = input.fileContent.split('\n').filter(l => l.trim());
      const totalRows = lines.length - 1;

      if (totalRows === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "File is empty",
        });
      }

      if (totalRows > 1000000) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "File too large. Maximum 1,000,000 rows.",
        });
      }

      // Create job record
      const jobId = await createJob({
        userId: ctx.user.id,
        type: "intelligent" as any,
        totalRows,
        inputFileKey,
        inputFileUrl,
        config: input.config || {},
      });

      // Add to queue
      await jobQueue.addJob({
        jobId,
        userId: ctx.user.id,
        type: "intelligent",
        inputFileKey,
        inputFileUrl,
        columnMappings: input.columnMappings,
        config: input.config,
      });

      return {
        jobId,
        totalRows,
        message: `Intelligent batch job created. Processing ${totalRows} rows.`,
      };
    }),

  /**
   * Get job statistics
   */
  getStats: protectedProcedure
    .query(async ({ ctx }) => {
      const { db } = await import('./db');
      const { jobs } = await import('../drizzle/schema');
      const { eq, count, sql } = await import('drizzle-orm');

      const [totalJobs] = await db
        .select({ count: count() })
        .from(jobs)
        .where(eq(jobs.userId, ctx.user.id));

      const [completedJobs] = await db
        .select({ count: count() })
        .from(jobs)
        .where(sql`${jobs.userId} = ${ctx.user.id} AND ${jobs.status} = 'completed'`);

      const [failedJobs] = await db
        .select({ count: count() })
        .from(jobs)
        .where(sql`${jobs.userId} = ${ctx.user.id} AND ${jobs.status} = 'failed'`);

      const [processingJobs] = await db
        .select({ count: count() })
        .from(jobs)
        .where(sql`${jobs.userId} = ${ctx.user.id} AND ${jobs.status} = 'processing'`);

      const successRate = totalJobs.count > 0
        ? Math.round((completedJobs.count / totalJobs.count) * 100)
        : 0;

      return {
        total: totalJobs.count,
        completed: completedJobs.count,
        failed: failedJobs.count,
        processing: processingJobs.count,
        successRate,
      };
    }),

  /**
   * Retry a failed job
   */
  retry: protectedProcedure
    .input(z.object({ jobId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const job = await getJobById(input.jobId);
      
      if (!job) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Job not found",
        });
      }

      if (job.userId !== ctx.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have access to this job",
        });
      }

      if (job.status !== "failed") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Only failed jobs can be retried",
        });
      }

      const { jobQueue } = await import('./queue/JobQueue');
      await jobQueue.retryJob(input.jobId);
      
      return {
        success: true,
        message: "Job queued for retry",
      };
    }),

  /**
   * Subscribe to job status updates (WebSocket)
   */
  onJobUpdate: protectedProcedure
    .input(z.object({ jobId: z.number() }))
    .subscription(async ({ ctx, input }) => {
      const { observable } = await import('@trpc/server/observable');
      
      return observable<any>((emit) => {
        // Poll job status every 2 seconds
        const interval = setInterval(async () => {
          try {
            const job = await getJobById(input.jobId);
            
            if (!job) {
              emit.error(new TRPCError({
                code: "NOT_FOUND",
                message: "Job not found",
              }));
              return;
            }

            if (job.userId !== ctx.user.id) {
              emit.error(new TRPCError({
                code: "FORBIDDEN",
                message: "Access denied",
              }));
              return;
            }

            emit.next(job);

            // Stop polling if job is completed or failed
            if (job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled') {
              clearInterval(interval);
              emit.complete();
            }
          } catch (error) {
            emit.error(error);
          }
        }, 2000);

        // Cleanup on unsubscribe
        return () => {
          clearInterval(interval);
        };
      });
    }),
});
