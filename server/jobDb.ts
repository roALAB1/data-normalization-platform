import { eq, desc, and } from "drizzle-orm";
import { jobs, jobResults, InsertJob, InsertJobResult, Job } from "../drizzle/schema";
import { getDb } from "./db";

/**
 * Create a new normalization job
 */
export async function createJob(job: InsertJob): Promise<number> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const result = await db.insert(jobs).values(job);
  return Number(result[0].insertId);
}

/**
 * Get job by ID
 */
export async function getJobById(jobId: number): Promise<Job | undefined> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const result = await db.select().from(jobs).where(eq(jobs.id, jobId)).limit(1);
  return result[0];
}

/**
 * Get all jobs for a user
 */
export async function getUserJobs(userId: number, limit: number = 50): Promise<Job[]> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  return await db
    .select()
    .from(jobs)
    .where(eq(jobs.userId, userId))
    .orderBy(desc(jobs.createdAt))
    .limit(limit);
}

/**
 * Update job status and progress
 */
export async function updateJobProgress(
  jobId: number,
  updates: {
    status?: Job["status"];
    processedRows?: number;
    validRows?: number;
    invalidRows?: number;
    errorMessage?: string;
    startedAt?: Date;
    completedAt?: Date;
    outputFileKey?: string;
    outputFileUrl?: string;
  }
): Promise<void> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  await db.update(jobs).set(updates).where(eq(jobs.id, jobId));
}

/**
 * Add a job result row
 */
export async function addJobResult(result: InsertJobResult): Promise<void> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  await db.insert(jobResults).values(result);
}

/**
 * Add multiple job results in batch
 */
export async function addJobResultsBatch(results: InsertJobResult[]): Promise<void> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  if (results.length === 0) return;

  // Insert in chunks of 1000 to avoid query size limits
  const chunkSize = 1000;
  for (let i = 0; i < results.length; i += chunkSize) {
    const chunk = results.slice(i, i + chunkSize);
    await db.insert(jobResults).values(chunk);
  }
}

/**
 * Get job results with pagination
 */
export async function getJobResults(
  jobId: number,
  offset: number = 0,
  limit: number = 100
): Promise<InsertJobResult[]> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  return await db
    .select()
    .from(jobResults)
    .where(eq(jobResults.jobId, jobId))
    .limit(limit)
    .offset(offset);
}

/**
 * Cancel a job
 */
export async function cancelJob(jobId: number): Promise<void> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  await db
    .update(jobs)
    .set({ status: "cancelled", completedAt: new Date() })
    .where(and(eq(jobs.id, jobId), eq(jobs.status, "pending")));
}

/**
 * Get pending jobs for processing
 */
export async function getPendingJobs(limit: number = 10): Promise<Job[]> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  return await db
    .select()
    .from(jobs)
    .where(eq(jobs.status, "pending"))
    .orderBy(jobs.createdAt)
    .limit(limit);
}
