/**
 * Upload Router
 * Handles file uploads to S3 for CRM Sync Mapper
 */

import { z } from "zod";
import { publicProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { storagePut } from "./storage";

export const uploadRouter = router({
  /**
   * Get upload URL for streaming large files
   * Returns metadata needed for client to stream upload directly
   */
  getStreamingUploadUrl: publicProcedure
    .input(
      z.object({
        fileName: z.string(),
        fileType: z.enum(["original", "enriched"]),
        rowCount: z.number(),
        columnCount: z.number(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "You must be logged in to upload files",
        });
      }

      const timestamp = Date.now();
      const sanitizedName = input.fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
      const s3Key = `crm-sync/${ctx.user.id}/${timestamp}-${sanitizedName}`;

      return {
        success: true,
        s3Key,
        uploadId: `${ctx.user.id}-${timestamp}`,
        metadata: {
          fileName: input.fileName,
          fileType: input.fileType,
          rowCount: input.rowCount,
          columnCount: input.columnCount,
        },
      };
    }),

  /**
   * Upload CSV file to S3 (for small files only - use streaming for large files)
   * WARNING: This loads entire CSV into memory
   */
  uploadCSV: publicProcedure
    .input(
      z.object({
        fileName: z.string(),
        csvContent: z.string(),
        fileType: z.enum(["original", "enriched"]),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "You must be logged in to upload files",
        });
      }

      try {
        const timestamp = Date.now();
        const sanitizedName = input.fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
        const s3Key = `crm-sync/${ctx.user.id}/${timestamp}-${sanitizedName}`;

        // Upload to S3
        const result = await storagePut(s3Key, input.csvContent, "text/csv");

        return {
          success: true,
          s3Key: result.key,
          s3Url: result.url,
        };
      } catch (error) {
        console.error("Error uploading file:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Failed to upload file",
        });
      }
    }),
});
