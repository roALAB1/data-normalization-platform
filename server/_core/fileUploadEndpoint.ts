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
  const startTime = Date.now();
  console.log('[FileUpload] Starting file upload...');
  
  try {
    // Parse multipart form data
    const form = formidable({
      maxFileSize: 2 * 1024 * 1024 * 1024, // 2GB max
      keepExtensions: true,
    });
    
    console.log('[FileUpload] Parsing multipart form data...');

    const [fields, files] = await form.parse(req);
    console.log('[FileUpload] Form parsed successfully');

    // Get uploaded file
    const fileArray = files.file;
    if (!fileArray || fileArray.length === 0) {
      res.status(400).json({ error: "No file uploaded" });
      return;
    }

    const file = fileArray[0];
    const fileType = fields.type?.[0] || "original";
    
    console.log(`[FileUpload] File details:`, {
      name: file.originalFilename,
      size: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
      type: fileType,
      mimetype: file.mimetype
    });

    // Generate S3 key
    const timestamp = Date.now();
    const sanitizedName = file.originalFilename?.replace(/[^a-zA-Z0-9.-]/g, "_") || "file.csv";
    const s3Key = `crm-sync/${timestamp}-${sanitizedName}`;

    // Read file from disk
    console.log('[FileUpload] Reading file from disk...');
    const fileBuffer = await fs.readFile(file.filepath);
    console.log(`[FileUpload] File read complete: ${(fileBuffer.length / 1024 / 1024).toFixed(2)} MB`);

    // Upload to S3
    console.log(`[FileUpload] Uploading to S3: ${s3Key}`);
    const uploadStart = Date.now();
    const result = await storagePut(s3Key, fileBuffer, file.mimetype || "text/csv");
    const uploadDuration = ((Date.now() - uploadStart) / 1000).toFixed(2);
    console.log(`[FileUpload] S3 upload complete in ${uploadDuration}s: ${result.url}`);

    // Clean up temp file
    console.log('[FileUpload] Cleaning up temp file...');
    await fs.unlink(file.filepath).catch(() => {});
    
    const totalDuration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`[FileUpload] Upload complete in ${totalDuration}s total`);

    // Return result
    res.json({
      success: true,
      key: result.key,
      url: result.url,
      size: file.size,
      name: sanitizedName,
    });
  } catch (error) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.error(`[FileUpload] ERROR after ${duration}s:`, error);
    console.error('[FileUpload] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    
    res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to upload file",
    });
  }
}
