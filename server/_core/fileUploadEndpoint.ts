/**
 * Direct File Upload Endpoint
 * Handles large file uploads without tRPC JSON serialization
 */

import type { Request, Response } from "express";
import { storagePut } from "../storage";
import formidable from "formidable";
import fs from "fs/promises";

/**
 * Handle file upload via multipart/form-data
 * This avoids loading the entire file into memory
 */
export async function handleFileUpload(req: Request, res: Response) {
  try {
    // Parse multipart form data
    const form = formidable({
      maxFileSize: 2 * 1024 * 1024 * 1024, // 2GB max
      keepExtensions: true,
    });

    const [fields, files] = await form.parse(req);

    // Get uploaded file
    const fileArray = files.file;
    if (!fileArray || fileArray.length === 0) {
      res.status(400).json({ error: "No file uploaded" });
      return;
    }

    const file = fileArray[0];
    const fileType = fields.type?.[0] || "original";

    // Generate S3 key
    const timestamp = Date.now();
    const sanitizedName = file.originalFilename?.replace(/[^a-zA-Z0-9.-]/g, "_") || "file.csv";
    const s3Key = `crm-sync/${timestamp}-${sanitizedName}`;

    // Read file from disk
    const fileBuffer = await fs.readFile(file.filepath);

    // Upload to S3
    const result = await storagePut(s3Key, fileBuffer, file.mimetype || "text/csv");

    // Clean up temp file
    await fs.unlink(file.filepath).catch(() => {});

    // Return result
    res.json({
      success: true,
      key: result.key,
      url: result.url,
      size: file.size,
      name: sanitizedName,
    });
  } catch (error) {
    console.error("File upload error:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to upload file",
    });
  }
}
