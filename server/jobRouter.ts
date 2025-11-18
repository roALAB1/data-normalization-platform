// @ts-nocheck
import { z } from "zod";
import { publicProcedure, router } from "./_core/trpc";
import { createJob, getUserJobs, getJobById, cancelJob, getJobResults } from "./jobDb";
import { storagePut } from "./storage";
import { TRPCError } from "@trpc/server";
import { rateLimitMiddleware, RateLimits } from "./_core/rateLimit";

// Helper function to get user ID with owner fallback
async function getUserIdWithFallback(ctx: any): Promise<number> {
  let userId = ctx.user?.id;
  
  if (!userId) {
    // Fallback: Get owner user ID from database
    const { getDb } = await import("./db.js");
    const db = await getDb();
    if (db && process.env.OWNER_OPEN_ID) {
      const { users } = await import("../drizzle/schema.js");
      const { eq } = await import("drizzle-orm");
      const ownerResult = await db.select().from(users).where(eq(users.openId, process.env.OWNER_OPEN_ID)).limit(1);
      if (ownerResult.length > 0) {
        userId = ownerResult[0].id;
      }
    }
    
    // If still no user, throw error
    if (!userId) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "You must be logged in to access batch jobs",
      });
    }
  }
  
  return userId;
}

export const jobRouter = router({
  /**
   * Create a new normalization job
   */
  create: publicProcedure
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
      const userId = await getUserIdWithFallback(ctx);
      
      // Rate limiting: 10 jobs per hour
      const rateLimit = await rateLimitMiddleware(userId, RateLimits.JOB_CREATE);

      // Upload input file to S3
      const inputFileKey = `jobs/${userId}/${Date.now()}-${input.fileName}`;
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
        userId: userId,
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
  list: publicProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(50),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const userId = await getUserIdWithFallback(ctx);
      const jobs = await getUserJobs(userId, input?.limit || 50);
      return jobs;
    }),

  /**
   * Get job details by ID
   */
  get: publicProcedure
    .input(z.object({ jobId: z.number() }))
    .query(async ({ ctx, input }) => {
      const userId = await getUserIdWithFallback(ctx);
      const job = await getJobById(input.jobId);
      
      if (!job) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Job not found",
        });
      }

      if (job.userId !== userId) {
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
  getResults: publicProcedure
    .input(
      z.object({
        jobId: z.number(),
        offset: z.number().min(0).default(0),
        limit: z.number().min(1).max(1000).default(100),
      })
    )
    .query(async ({ ctx, input }) => {
      const userId = await getUserIdWithFallback(ctx);
      const job = await getJobById(input.jobId);
      
      if (!job) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Job not found",
        });
      }

      if (job.userId !== userId) {
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
  cancel: publicProcedure
    .input(z.object({ jobId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const userId = await getUserIdWithFallback(ctx);
      const job = await getJobById(input.jobId);
      
      if (!job) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Job not found",
        });
      }

      if (job.userId !== userId) {
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
  submitBatch: publicProcedure
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
      const userId = await getUserIdWithFallback(ctx);
      const { jobQueue } = await import('./queue/JobQueue');
      
      // Upload input file to S3
      const inputFileKey = `jobs/${userId}/${Date.now()}-${input.fileName}`;
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
        userId: userId,
        type: "intelligent" as any,
        totalRows,
        inputFileKey,
        inputFileUrl,
        config: input.config || {},
      });

      // Add to queue
      await jobQueue.addJob({
        jobId,
        userId: userId,
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
  getStats: publicProcedure
    .query(async ({ ctx }) => {
      const userId = await getUserIdWithFallback(ctx);
      const { db } = await import('./db');
      const { jobs } = await import('../drizzle/schema');
      const { eq, count, sql } = await import('drizzle-orm');

      const [totalJobs] = await db
        .select({ count: count() })
        .from(jobs)
        .where(eq(jobs.userId, userId));

      const [completedJobs] = await db
        .select({ count: count() })
        .from(jobs)
        .where(sql`${jobs.userId} = ${userId} AND ${jobs.status} = 'completed'`);

      const [failedJobs] = await db
        .select({ count: count() })
        .from(jobs)
        .where(sql`${jobs.userId} = ${userId} AND ${jobs.status} = 'failed'`);

      const [processingJobs] = await db
        .select({ count: count() })
        .from(jobs)
        .where(sql`${jobs.userId} = ${userId} AND ${jobs.status} = 'processing'`);

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
  retry: publicProcedure
    .input(z.object({ jobId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const userId = await getUserIdWithFallback(ctx);
      const job = await getJobById(input.jobId);
      
      if (!job) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Job not found",
        });
      }

      if (job.userId !== userId) {
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
  onJobUpdate: publicProcedure
    .input(z.object({ jobId: z.number() }))
    .subscription(async ({ ctx, input }) => {
      const userId = await getUserIdWithFallback(ctx);
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

            if (job.userId !== userId) {
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
