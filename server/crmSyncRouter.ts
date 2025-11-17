/**
 * CRM Sync Router
 * tRPC endpoints for CRM file merging with enrichment data
 */

import { z } from "zod";
import { publicProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "./db";
import { jobs as jobsTable } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { JobQueue } from "./queue/JobQueue";
import type { CRMMergeJobData, InputMapping, ColumnConfig, ResolutionConfig, FileMetadata } from "../shared/crmMergeTypes";
import type { ArrayHandlingStrategy } from "../client/src/lib/arrayParser";

// Zod schemas for validation
const FileMetadataSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(["original", "enriched"]),
  s3Key: z.string(),
  s3Url: z.string(),
  rowCount: z.number(),
  columns: z.array(z.string()),
});

const InputMappingSchema = z.object({
  originalColumn: z.string(),
  enrichedColumn: z.string(),
  enrichedFileId: z.string(),
});

const ColumnConfigSchema = z.object({
  name: z.string(),
  source: z.enum(["original", "enriched"]),
  enrichedFileId: z.string().optional(),
  selected: z.boolean(),
  position: z.number(),
});

const ResolutionConfigSchema = z.object({
  defaultStrategy: z.enum(["keep_original", "use_enriched", "create_alternate"]),
  columnStrategies: z.record(z.string(), z.enum(["keep_original", "use_enriched", "create_alternate"])),
  alternateFieldSuffix: z.string(),
});

export const crmSyncRouter = router({
  /**
   * Submit a CRM merge job
   */
  submitMergeJob: publicProcedure
    .input(
      z.object({
        originalFile: FileMetadataSchema,
        enrichedFiles: z.array(FileMetadataSchema),
        selectedIdentifiers: z.array(z.string()),
        inputMappings: z.array(InputMappingSchema),
        arrayStrategies: z.record(z.string(), z.enum(["first", "all", "best", "deduplicated"])),
        resolutionConfig: ResolutionConfigSchema,
        columnConfigs: z.array(ColumnConfigSchema),
        orderingMode: z.enum(["append", "insert_related", "custom"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Use authenticated user or fallback to owner for development
      let userId = ctx.user?.id;
      
      if (!userId) {
        // Fallback: Get owner user ID from database
        const db = await getDb();
        if (db && process.env.OWNER_OPEN_ID) {
          const { users } = await import("../drizzle/schema.js");
          const ownerResult = await db.select().from(users).where(eq(users.openId, process.env.OWNER_OPEN_ID)).limit(1);
          if (ownerResult.length > 0) {
            userId = ownerResult[0].id;
          }
        }
        
        // If still no user, throw error
        if (!userId) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "You must be logged in to submit a CRM merge job",
          });
        }
      }

      try {
        const db = await getDb();
        if (!db) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Database not available",
          });
        }

        // Create job record in database
        const result = await db
          .insert(jobsTable)
          .values({
            userId,
            type: "intelligent", // Reuse intelligent type for now
            status: "pending",
            inputFileKey: input.originalFile.s3Key,
            inputFileUrl: input.originalFile.s3Url,
            totalRows: input.originalFile.rowCount,
            processedRows: 0,
            validRows: 0,
            invalidRows: 0,
            config: {
              crmMerge: true,
              enrichedFiles: input.enrichedFiles.length,
              selectedIdentifiers: input.selectedIdentifiers,
            },
          });

        const jobId = Number(result[0].insertId);

        // Fetch the created job
        const [job] = await db.select().from(jobsTable).where(eq(jobsTable.id, jobId)).limit(1);

        // Prepare job data
        const jobData: CRMMergeJobData = {
          jobId: job.id,
          userId: ctx.user.id,
          originalFile: input.originalFile,
          enrichedFiles: input.enrichedFiles,
          selectedIdentifiers: input.selectedIdentifiers,
          inputMappings: input.inputMappings,
          arrayStrategies: input.arrayStrategies as Record<string, ArrayHandlingStrategy>,
          resolutionConfig: input.resolutionConfig,
          columnConfigs: input.columnConfigs,
          orderingMode: input.orderingMode,
        };

        // Add job to queue
        const jobQueue = JobQueue.getInstance();
        await jobQueue.addCRMMergeJob(jobData);

        return {
          success: true,
          jobId: job.id,
          message: "CRM merge job submitted successfully",
        };
      } catch (error) {
        console.error("[crmSyncRouter] Failed to submit merge job:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Failed to submit merge job",
        });
      }
    }),

  /**
   * Get job status
   */
  getJobStatus: publicProcedure
    .input(z.object({ jobId: z.number() }))
    .query(async ({ ctx, input }) => {
      // Use authenticated user or fallback to owner for development
      let userId = ctx.user?.id;
      
      if (!userId) {
        // Fallback: Get owner user ID from database
        const db = await getDb();
        if (db && process.env.OWNER_OPEN_ID) {
          const { users } = await import("../drizzle/schema.js");
          const ownerResult = await db.select().from(users).where(eq(users.openId, process.env.OWNER_OPEN_ID)).limit(1);
          if (ownerResult.length > 0) {
            userId = ownerResult[0].id;
          }
        }
        
        // If still no user, throw error
        if (!userId) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "You must be logged in to view job status",
          });
        }
      }

      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });
      }

      const result = await db.select().from(jobsTable).where(eq(jobsTable.id, input.jobId)).limit(1);
      const job = result[0];

      if (!job) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Job not found",
        });
      }

      if (job.userId !== userId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to view this job",
        });
      }

      // Generate presigned download URL if output file exists
      let outputFileUrl = job.outputFileUrl;
      if (job.status === 'completed' && job.outputFileKey) {
        try {
          const { storageGet } = await import('./storage.js');
          const result = await storageGet(job.outputFileKey);
          outputFileUrl = result.url;
          console.log(`[getJobStatus] Generated presigned URL for job ${job.id}`);
        } catch (error) {
          console.error(`[getJobStatus] Failed to generate presigned URL:`, error);
          // Fall back to stored URL
        }
      }

      return {
        id: job.id,
        type: job.type,
        status: job.status,
        totalRows: job.totalRows,
        processedRows: job.processedRows,
        validRows: job.validRows,
        invalidRows: job.invalidRows,
        outputFileUrl,
        error: job.errorMessage,
        createdAt: job.createdAt,
        startedAt: job.startedAt,
        completedAt: job.completedAt,
      };
    }),

  /**
   * Upload file to S3 and get metadata
   */
  uploadFile: publicProcedure
    .input(
      z.object({
        fileName: z.string(),
        fileSize: z.number(),
        fileType: z.enum(["original", "enriched"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Use authenticated user or fallback to owner for development
      let userId = ctx.user?.id;
      
      if (!userId) {
        // Fallback: Get owner user ID from database
        const db = await getDb();
        if (db && process.env.OWNER_OPEN_ID) {
          const { users } = await import("../drizzle/schema.js");
          const ownerResult = await db.select().from(users).where(eq(users.openId, process.env.OWNER_OPEN_ID)).limit(1);
          if (ownerResult.length > 0) {
            userId = ownerResult[0].id;
          }
        }
        
        // If still no user, throw error
        if (!userId) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "You must be logged in to upload files",
          });
        }
      }

      // Generate S3 key
      const timestamp = Date.now();
      const s3Key = `crm-sync/${userId}/${timestamp}/${input.fileName}`;

      // TODO: Generate presigned upload URL
      // For now, return placeholder
      const uploadUrl = `https://s3.amazonaws.com/bucket/${s3Key}?presigned=true`;

      return {
        success: true,
        s3Key,
        uploadUrl,
        message: "Upload URL generated successfully",
      };
    }),
});
