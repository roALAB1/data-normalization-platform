/**
 * Storage Router
 * Handles direct file uploads to S3 storage
 */

import { publicProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { storagePut, storageGet } from "./storage";
import { z } from "zod";

export const storageRouter = router({
  /**
   * Upload file to S3 storage
   * Accepts raw file data and uploads to S3
   */
  uploadFile: publicProcedure
    .input(
      z.object({
        key: z.string(),
        content: z.string(), // Base64 encoded file content
        contentType: z.string().default("text/csv"),
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
        // Decode base64 content
        const buffer = Buffer.from(input.content, "base64");
        
        // Upload to S3
        const result = await storagePut(input.key, buffer, input.contentType);

        return {
          success: true,
          key: result.key,
          url: result.url,
        };
      } catch (error) {
        console.error("Error uploading file:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Failed to upload file",
        });
      }
    }),

  /**
   * Download file from S3 storage
   * Returns the file content as text
   */
  downloadFile: publicProcedure
    .input(
      z.object({
        key: z.string(),
      })
    )
    .query(async ({ input, ctx }) => {
      if (!ctx.user) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "You must be logged in to download files",
        });
      }

      try {
        // Get download URL from storage
        const result = await storageGet(input.key);

        // Fetch file content
        const response = await fetch(result.url);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch file: ${response.statusText}`);
        }

        const content = await response.text();

        return {
          success: true,
          content,
          url: result.url,
        };
      } catch (error) {
        console.error("Error downloading file:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Failed to download file",
        });
      }
    }),
});
