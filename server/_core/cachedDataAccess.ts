import {
  cacheGetOrSet,
  cacheDelete,
  cacheDeletePattern,
  generateCacheKey,
  CACHE_CONFIG,
} from './cache';
import { getDb } from '../db';
import type { User, Job } from '../../drizzle/schema';

/**
 * Cached Data Access Layer
 * 
 * Provides cached access to frequently accessed data with automatic
 * cache invalidation on updates.
 * 
 * Cache Strategy:
 * - Users: 1 hour TTL (infrequent changes)
 * - Jobs: 5 minute TTL (frequent updates)
 * - Job Results: 10 minute TTL (static after completion)
 */

/**
 * Get user by ID with caching
 * 
 * @param userId - User ID
 * @returns User object or null
 */
export async function getCachedUser(userId: number): Promise<User | null> {
  const key = generateCacheKey(CACHE_CONFIG.users.keyPrefix, userId);

  return await cacheGetOrSet(
    key,
    CACHE_CONFIG.users.ttl,
    async () => {
      const db = await getDb();
      const user = await db.query.users.findFirst({
        where: (users, { eq }) => eq(users.id, userId),
      });
      return user || null;
    }
  );
}

/**
 * Get user by open ID with caching
 * 
 * @param openId - User open ID
 * @returns User object or null
 */
export async function getCachedUserByOpenId(openId: string): Promise<User | null> {
  const key = generateCacheKey(CACHE_CONFIG.users.keyPrefix, `openid:${openId}`);

  return await cacheGetOrSet(
    key,
    CACHE_CONFIG.users.ttl,
    async () => {
      const db = await getDb();
      const user = await db.query.users.findFirst({
        where: (users, { eq }) => eq(users.openId, openId),
      });
      return user || null;
    }
  );
}

/**
 * Invalidate user cache
 * 
 * Call this after updating user data
 * 
 * @param userId - User ID
 */
export async function invalidateUserCache(userId: number): Promise<void> {
  const key = generateCacheKey(CACHE_CONFIG.users.keyPrefix, userId);
  await cacheDelete(key);
}

/**
 * Invalidate all user caches
 * 
 * Use with caution - clears all user cache entries
 */
export async function invalidateAllUserCache(): Promise<number> {
  const pattern = `${CACHE_CONFIG.users.keyPrefix}*`;
  return await cacheDeletePattern(pattern);
}

/**
 * Get job by ID with caching
 * 
 * @param jobId - Job ID
 * @returns Job object or null
 */
export async function getCachedJob(jobId: number): Promise<Job | null> {
  const key = generateCacheKey(CACHE_CONFIG.jobs.keyPrefix, jobId);

  return await cacheGetOrSet(
    key,
    CACHE_CONFIG.jobs.ttl,
    async () => {
      const db = await getDb();
      const job = await db.query.jobs.findFirst({
        where: (jobs, { eq }) => eq(jobs.id, jobId),
      });
      return job || null;
    }
  );
}

/**
 * Get jobs by user ID with caching
 * 
 * @param userId - User ID
 * @param limit - Maximum number of jobs to return
 * @returns Array of jobs
 */
export async function getCachedJobsByUser(
  userId: number,
  limit: number = 50
): Promise<Job[]> {
  const key = generateCacheKey(
    CACHE_CONFIG.jobs.keyPrefix,
    `user:${userId}:limit:${limit}`
  );

  return await cacheGetOrSet(
    key,
    CACHE_CONFIG.jobs.ttl,
    async () => {
      const db = await getDb();
      const jobs = await db.query.jobs.findMany({
        where: (jobs, { eq }) => eq(jobs.userId, userId),
        orderBy: (jobs, { desc }) => [desc(jobs.createdAt)],
        limit,
      });
      return jobs;
    }
  );
}

/**
 * Invalidate job cache
 * 
 * Call this after updating job data
 * 
 * @param jobId - Job ID
 */
export async function invalidateJobCache(jobId: number): Promise<void> {
  const key = generateCacheKey(CACHE_CONFIG.jobs.keyPrefix, jobId);
  await cacheDelete(key);
}

/**
 * Invalidate user's job list cache
 * 
 * Call this after creating/deleting jobs for a user
 * 
 * @param userId - User ID
 */
export async function invalidateUserJobsCache(userId: number): Promise<number> {
  const pattern = `${CACHE_CONFIG.jobs.keyPrefix}user:${userId}:*`;
  return await cacheDeletePattern(pattern);
}

/**
 * Invalidate all job caches
 * 
 * Use with caution - clears all job cache entries
 */
export async function invalidateAllJobCache(): Promise<number> {
  const pattern = `${CACHE_CONFIG.jobs.keyPrefix}*`;
  return await cacheDeletePattern(pattern);
}

/**
 * Get job result with caching
 * 
 * Job results are immutable after completion, so they can be cached longer
 * 
 * @param jobId - Job ID
 * @returns Job result data or null
 */
export async function getCachedJobResult(jobId: number): Promise<any | null> {
  const key = generateCacheKey(CACHE_CONFIG.jobResults.keyPrefix, jobId);

  return await cacheGetOrSet(
    key,
    CACHE_CONFIG.jobResults.ttl,
    async () => {
      const db = await getDb();
      const job = await db.query.jobs.findFirst({
        where: (jobs, { eq }) => eq(jobs.id, jobId),
      });

      if (!job || job.status !== 'completed') {
        return null;
      }

      return {
        jobId: job.id,
        status: job.status,
        result: job.result,
        completedAt: job.completedAt,
      };
    }
  );
}

/**
 * Invalidate job result cache
 * 
 * Call this if job result is updated (rare case)
 * 
 * @param jobId - Job ID
 */
export async function invalidateJobResultCache(jobId: number): Promise<void> {
  const key = generateCacheKey(CACHE_CONFIG.jobResults.keyPrefix, jobId);
  await cacheDelete(key);
}

/**
 * Cache warming on application startup
 * 
 * Pre-loads frequently accessed data into cache
 */
export async function warmCache(): Promise<void> {
  console.log('[Cache] Warming cache...');

  try {
    const db = await getDb();

    // Warm user cache - cache recent active users
    const recentUsers = await db.query.users.findMany({
      orderBy: (users, { desc }) => [desc(users.updatedAt)],
      limit: 100,
    });

    for (const user of recentUsers) {
      const key = generateCacheKey(CACHE_CONFIG.users.keyPrefix, user.id);
      await cacheGetOrSet(key, CACHE_CONFIG.users.ttl, async () => user);
    }

    console.log(`[Cache] Warmed ${recentUsers.length} users`);

    // Warm job cache - cache recent jobs
    const recentJobs = await db.query.jobs.findMany({
      orderBy: (jobs, { desc }) => [desc(jobs.createdAt)],
      limit: 200,
    });

    for (const job of recentJobs) {
      const key = generateCacheKey(CACHE_CONFIG.jobs.keyPrefix, job.id);
      await cacheGetOrSet(key, CACHE_CONFIG.jobs.ttl, async () => job);
    }

    console.log(`[Cache] Warmed ${recentJobs.length} jobs`);
    console.log('[Cache] Cache warming complete');
  } catch (error) {
    console.error('[Cache] Error warming cache:', error);
  }
}
