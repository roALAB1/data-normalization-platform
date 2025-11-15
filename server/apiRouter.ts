import { Router, Request, Response } from "express";
import { getDb } from "./db";
import { apiKeys, users } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { createJob, getUserJobs, getJobById, cancelJob } from "./jobDb";
import { storagePut } from "./storage";
import crypto from "crypto";

const router = Router();

/**
 * Middleware to authenticate API requests using API keys
 */
async function authenticateApiKey(req: Request, res: Response, next: Function) {
  const apiKey = req.headers["x-api-key"] as string;
  
  if (!apiKey) {
    return res.status(401).json({
      error: "Unauthorized",
      message: "API key is required. Include it in the X-API-Key header.",
    });
  }

  try {
    const db = await getDb();
    if (!db) {
      return res.status(500).json({
        error: "Internal Server Error",
        message: "Database not available",
      });
    }

    // Hash the API key to compare with stored hash
    const hashedKey = crypto.createHash("sha256").update(apiKey).digest("hex");
    
    const [keyRecord] = await db
      .select()
      .from(apiKeys)
      .where(eq(apiKeys.key, hashedKey))
      .limit(1);

    if (!keyRecord) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "Invalid API key",
      });
    }

    // Check if key has expired
    if (keyRecord.expiresAt && new Date(keyRecord.expiresAt) < new Date()) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "API key has expired",
      });
    }

    // Update last used timestamp
    await db
      .update(apiKeys)
      .set({ lastUsed: new Date() })
      .where(eq(apiKeys.id, keyRecord.id));

    // Attach user info to request
    (req as any).userId = keyRecord.userId;
    (req as any).apiKeyPermissions = keyRecord.permissions || [];
    
    next();
  } catch (error) {
    console.error("[API] Authentication error:", error);
    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to authenticate API key",
    });
  }
}

/**
 * POST /api/v1/normalize/batch
 * Submit a new batch normalization job
 * 
 * Request body:
 * {
 *   "type": "name" | "phone" | "email" | "company" | "address",
 *   "data": "CSV content as string" | { "url": "https://..." },
 *   "fileName": "optional-filename.csv",
 *   "config": {
 *     "preserveAccents": boolean,
 *     "defaultCountry": "US"
 *   }
 * }
 * 
 * Response:
 * {
 *   "jobId": 123,
 *   "status": "pending",
 *   "totalRows": 1000,
 *   "message": "Job created successfully",
 *   "estimatedCompletionTime": "2024-01-01T12:00:00Z"
 * }
 */
router.post("/v1/normalize/batch", authenticateApiKey, async (req: Request, res: Response) => {
  try {
    const { type, data, fileName, config } = req.body;
    const userId = (req as any).userId;

    // Validate input
    if (!type || !["name", "phone", "email", "company", "address"].includes(type)) {
      return res.status(400).json({
        error: "Bad Request",
        message: "Invalid type. Must be one of: name, phone, email, company, address",
      });
    }

    if (!data) {
      return res.status(400).json({
        error: "Bad Request",
        message: "data field is required (CSV string or { url: '...' })",
      });
    }

    // Handle data input (either direct CSV string or URL)
    let fileContent: string;
    let actualFileName = fileName || `batch-${Date.now()}.csv`;

    if (typeof data === "string") {
      fileContent = data;
    } else if (data.url) {
      // Download from URL
      try {
        const response = await fetch(data.url);
        if (!response.ok) {
          throw new Error(`Failed to download file: ${response.statusText}`);
        }
        fileContent = await response.text();
      } catch (error) {
        return res.status(400).json({
          error: "Bad Request",
          message: `Failed to download file from URL: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }
    } else {
      return res.status(400).json({
        error: "Bad Request",
        message: "data must be a CSV string or { url: '...' }",
      });
    }

    // Upload to S3
    const inputFileKey = `jobs/${userId}/${Date.now()}-${actualFileName}`;
    const { url: inputFileUrl } = await storagePut(
      inputFileKey,
      fileContent,
      "text/csv"
    );

    // Count rows
    const lines = fileContent.split('\n').filter(l => l.trim());
    const totalRows = lines.length - 1; // Exclude header

    if (totalRows === 0) {
      return res.status(400).json({
        error: "Bad Request",
        message: "File is empty",
      });
    }

    if (totalRows > 1000000) {
      return res.status(400).json({
        error: "Bad Request",
        message: "File too large. Maximum 1,000,000 rows per job.",
      });
    }

    // Create job
    const jobId = await createJob({
      userId,
      type,
      totalRows,
      inputFileKey,
      inputFileUrl,
      config: config || {},
    });

    // Estimate completion time (1000 rows/sec average)
    const estimatedSeconds = Math.ceil(totalRows / 1000);
    const estimatedCompletionTime = new Date(Date.now() + estimatedSeconds * 1000);

    return res.status(201).json({
      jobId,
      status: "pending",
      totalRows,
      message: `Job created successfully. Processing ${totalRows} rows.`,
      estimatedCompletionTime: estimatedCompletionTime.toISOString(),
    });
  } catch (error) {
    console.error("[API] Error creating batch job:", error);
    return res.status(500).json({
      error: "Internal Server Error",
      message: error instanceof Error ? error.message : "Failed to create job",
    });
  }
});

/**
 * GET /api/v1/jobs/:id
 * Get job status and details
 * 
 * Response:
 * {
 *   "id": 123,
 *   "status": "completed",
 *   "type": "name",
 *   "totalRows": 1000,
 *   "processedRows": 1000,
 *   "validRows": 950,
 *   "invalidRows": 50,
 *   "outputFileUrl": "https://...",
 *   "createdAt": "2024-01-01T12:00:00Z",
 *   "completedAt": "2024-01-01T12:01:00Z"
 * }
 */
router.get("/v1/jobs/:id", authenticateApiKey, async (req: Request, res: Response) => {
  try {
    const jobId = parseInt(req.params.id);
    const userId = (req as any).userId;

    if (isNaN(jobId)) {
      return res.status(400).json({
        error: "Bad Request",
        message: "Invalid job ID",
      });
    }

    const job = await getJobById(jobId);

    if (!job) {
      return res.status(404).json({
        error: "Not Found",
        message: "Job not found",
      });
    }

    if (job.userId !== userId) {
      return res.status(403).json({
        error: "Forbidden",
        message: "You don't have access to this job",
      });
    }

    return res.json({
      id: job.id,
      status: job.status,
      type: job.type,
      totalRows: job.totalRows,
      processedRows: job.processedRows,
      validRows: job.validRows,
      invalidRows: job.invalidRows,
      outputFileUrl: job.outputFileUrl,
      errorMessage: job.errorMessage,
      createdAt: job.createdAt,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
    });
  } catch (error) {
    console.error("[API] Error fetching job:", error);
    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to fetch job",
    });
  }
});

/**
 * GET /api/v1/jobs
 * List all jobs for the authenticated user
 * 
 * Query params:
 * - limit: number (default: 50, max: 100)
 * - status: "pending" | "processing" | "completed" | "failed" | "cancelled"
 * 
 * Response:
 * {
 *   "jobs": [...],
 *   "total": 10
 * }
 */
router.get("/v1/jobs", authenticateApiKey, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const status = req.query.status as string;

    let jobs = await getUserJobs(userId, limit);

    // Filter by status if provided
    if (status && ["pending", "processing", "completed", "failed", "cancelled"].includes(status)) {
      jobs = jobs.filter(job => job.status === status);
    }

    return res.json({
      jobs: jobs.map(job => ({
        id: job.id,
        status: job.status,
        type: job.type,
        totalRows: job.totalRows,
        processedRows: job.processedRows,
        validRows: job.validRows,
        invalidRows: job.invalidRows,
        outputFileUrl: job.outputFileUrl,
        createdAt: job.createdAt,
        completedAt: job.completedAt,
      })),
      total: jobs.length,
    });
  } catch (error) {
    console.error("[API] Error listing jobs:", error);
    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to list jobs",
    });
  }
});

/**
 * DELETE /api/v1/jobs/:id
 * Cancel a pending or processing job
 * 
 * Response:
 * {
 *   "message": "Job cancelled successfully"
 * }
 */
router.delete("/v1/jobs/:id", authenticateApiKey, async (req: Request, res: Response) => {
  try {
    const jobId = parseInt(req.params.id);
    const userId = (req as any).userId;

    if (isNaN(jobId)) {
      return res.status(400).json({
        error: "Bad Request",
        message: "Invalid job ID",
      });
    }

    const job = await getJobById(jobId);

    if (!job) {
      return res.status(404).json({
        error: "Not Found",
        message: "Job not found",
      });
    }

    if (job.userId !== userId) {
      return res.status(403).json({
        error: "Forbidden",
        message: "You don't have access to this job",
      });
    }

    if (job.status === "completed" || job.status === "failed" || job.status === "cancelled") {
      return res.status(400).json({
        error: "Bad Request",
        message: `Cannot cancel job with status: ${job.status}`,
      });
    }

    await cancelJob(jobId);

    return res.json({
      message: "Job cancelled successfully",
    });
  } catch (error) {
    console.error("[API] Error cancelling job:", error);
    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to cancel job",
    });
  }
});

/**
 * POST /api/v1/keys
 * Generate a new API key (requires authentication via tRPC/session)
 * This endpoint should be called from the web UI after user logs in
 */
router.post("/v1/keys", async (req: Request, res: Response) => {
  // This endpoint would typically require session authentication
  // For now, it's a placeholder for the web UI to call
  return res.status(501).json({
    error: "Not Implemented",
    message: "API key generation should be done through the web UI",
  });
});

export default router;
