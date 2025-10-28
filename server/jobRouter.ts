import { z } from "zod";
import { protectedProcedure, router } from "./_core/trpc";
import { createJob, getUserJobs, getJobById, cancelJob, getJobResults } from "./jobDb";
import { storagePut } from "./storage";
import { TRPCError } from "@trpc/server";

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
});
