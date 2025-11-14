/**
 * Rate limiting middleware for tRPC endpoints
 * Prevents abuse by limiting requests per user per time window
 */

import { TRPCError } from "@trpc/server";
import { Redis } from "ioredis";
import { ENV } from "./env";

// Redis client for rate limiting
const redis = new Redis({
  host: ENV.redisHost,
  port: ENV.redisPort,
  maxRetriesPerRequest: 3,
  retryStrategy: (times) => {
    if (times > 3) return null;
    return Math.min(times * 1000, 3000);
  },
});

redis.on("error", (error) => {
  console.error("[RateLimit] Redis error:", error);
});

export interface RateLimitConfig {
  /**
   * Maximum number of requests allowed in the time window
   */
  maxRequests: number;

  /**
   * Time window in seconds
   */
  windowSeconds: number;

  /**
   * Optional custom key prefix
   */
  keyPrefix?: string;
}

/**
 * Check if user has exceeded rate limit
 * Uses Redis with sliding window algorithm
 * 
 * @param userId - User ID to check
 * @param config - Rate limit configuration
 * @returns true if rate limit exceeded, false otherwise
 */
export async function checkRateLimit(
  userId: string,
  config: RateLimitConfig
): Promise<{
  allowed: boolean;
  remaining: number;
  resetAt: Date;
}> {
  const keyPrefix = config.keyPrefix || "ratelimit";
  const key = `${keyPrefix}:${userId}`;
  const now = Date.now();
  const windowMs = config.windowSeconds * 1000;
  const windowStart = now - windowMs;

  try {
    // Use Redis sorted set with timestamps as scores
    // Remove old entries outside the window
    await redis.zremrangebyscore(key, 0, windowStart);

    // Count current requests in window
    const currentCount = await redis.zcard(key);

    if (currentCount >= config.maxRequests) {
      // Rate limit exceeded
      const oldestEntry = await redis.zrange(key, 0, 0, "WITHSCORES");
      const resetAt = oldestEntry.length > 0
        ? new Date(parseInt(oldestEntry[1]) + windowMs)
        : new Date(now + windowMs);

      return {
        allowed: false,
        remaining: 0,
        resetAt,
      };
    }

    // Add current request
    await redis.zadd(key, now, `${now}-${Math.random()}`);

    // Set expiration on key
    await redis.expire(key, config.windowSeconds);

    return {
      allowed: true,
      remaining: config.maxRequests - currentCount - 1,
      resetAt: new Date(now + windowMs),
    };
  } catch (error) {
    // If Redis fails, allow the request (fail open)
    console.error("[RateLimit] Error checking rate limit:", error);
    return {
      allowed: true,
      remaining: config.maxRequests,
      resetAt: new Date(now + windowMs),
    };
  }
}

/**
 * Rate limit middleware for tRPC procedures
 * Throws TRPCError if rate limit exceeded
 */
export async function rateLimitMiddleware(
  userId: string,
  config: RateLimitConfig
): Promise<void> {
  const result = await checkRateLimit(userId, config);

  if (!result.allowed) {
    const resetIn = Math.ceil((result.resetAt.getTime() - Date.now()) / 1000);
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: `Rate limit exceeded. Try again in ${resetIn} seconds.`,
    });
  }
}

/**
 * Predefined rate limit configurations
 */
export const RateLimits = {
  /**
   * Job creation: 10 jobs per hour
   */
  JOB_CREATE: {
    maxRequests: 10,
    windowSeconds: 3600, // 1 hour
    keyPrefix: "ratelimit:job:create",
  } as RateLimitConfig,

  /**
   * Job listing: 100 requests per minute
   */
  JOB_LIST: {
    maxRequests: 100,
    windowSeconds: 60,
    keyPrefix: "ratelimit:job:list",
  } as RateLimitConfig,

  /**
   * Report submission: 5 reports per hour
   */
  REPORT_CREATE: {
    maxRequests: 5,
    windowSeconds: 3600,
    keyPrefix: "ratelimit:report:create",
  } as RateLimitConfig,
} as const;

/**
 * Cleanup function to close Redis connection
 */
export async function closeRateLimitRedis(): Promise<void> {
  await redis.quit();
}
