import { Redis } from 'ioredis';
import { ENV } from './env';
import { executeRedisWithCircuitBreaker } from './serviceCircuitBreakers';

/**
 * Redis Cache Layer
 * 
 * Implements cache-aside pattern with automatic TTL management,
 * cache warming, and invalidation strategies.
 * 
 * Features:
 * - Cache-aside pattern (lazy loading)
 * - Configurable TTL per data type
 * - Automatic serialization/deserialization
 * - Circuit breaker protection
 * - Cache hit rate tracking
 */

/**
 * Cache configuration
 */
export const CACHE_CONFIG = {
  /** User data cache - 1 hour TTL */
  users: {
    ttl: 3600, // 1 hour in seconds
    keyPrefix: 'user:',
  },
  /** Job data cache - 5 minute TTL */
  jobs: {
    ttl: 300, // 5 minutes in seconds
    keyPrefix: 'job:',
  },
  /** Job results cache - 10 minute TTL */
  jobResults: {
    ttl: 600, // 10 minutes in seconds
    keyPrefix: 'job:result:',
  },
  /** Session cache - 24 hour TTL */
  sessions: {
    ttl: 86400, // 24 hours in seconds
    keyPrefix: 'session:',
  },
} as const;

/**
 * Cache statistics
 */
interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  errors: number;
}

class CacheStatsTracker {
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    errors: 0,
  };

  recordHit() {
    this.stats.hits++;
  }

  recordMiss() {
    this.stats.misses++;
  }

  recordSet() {
    this.stats.sets++;
  }

  recordDelete() {
    this.stats.deletes++;
  }

  recordError() {
    this.stats.errors++;
  }

  getStats(): CacheStats & { hitRate: number } {
    const total = this.stats.hits + this.stats.misses;
    const hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0;
    return {
      ...this.stats,
      hitRate,
    };
  }

  reset() {
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      errors: 0,
    };
  }
}

export const cacheStats = new CacheStatsTracker();

/**
 * Redis client singleton
 */
let redisClient: Redis | null = null;

export function getRedisClient(): Redis {
  if (!redisClient) {
    redisClient = new Redis({
      host: ENV.redisHost,
      port: ENV.redisPort,
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      lazyConnect: false,
    });

    redisClient.on('error', (error) => {
      console.error('[Cache] Redis error:', error);
      cacheStats.recordError();
    });

    redisClient.on('connect', () => {
      console.log('[Cache] Redis connected');
    });
  }

  return redisClient;
}

/**
 * Cache key generator
 */
export function generateCacheKey(prefix: string, id: string | number): string {
  return `${prefix}${id}`;
}

/**
 * Cache-aside pattern: Get or Set
 * 
 * Tries to get value from cache first. If not found (cache miss),
 * executes the fallback function to get the value, stores it in cache,
 * and returns it.
 * 
 * @param key - Cache key
 * @param ttl - Time to live in seconds
 * @param fallback - Function to execute on cache miss
 * @returns Cached or freshly fetched value
 */
export async function cacheGetOrSet<T>(
  key: string,
  ttl: number,
  fallback: () => Promise<T>
): Promise<T> {
  const redis = getRedisClient();

  try {
    // Try to get from cache
    const cached = await executeRedisWithCircuitBreaker(
      async () => redis.get(key),
      async () => null // Fallback: cache miss
    );

    if (cached) {
      cacheStats.recordHit();
      console.log(`[Cache] HIT: ${key}`);
      return JSON.parse(cached) as T;
    }

    // Cache miss - execute fallback
    cacheStats.recordMiss();
    console.log(`[Cache] MISS: ${key}`);
    const value = await fallback();

    // Store in cache
    await executeRedisWithCircuitBreaker(
      async () => {
        await redis.setex(key, ttl, JSON.stringify(value));
        cacheStats.recordSet();
        console.log(`[Cache] SET: ${key} (TTL: ${ttl}s)`);
      },
      async () => {
        // Fallback: skip caching if Redis fails
        console.warn(`[Cache] Failed to set: ${key}`);
      }
    );

    return value;
  } catch (error) {
    console.error(`[Cache] Error for key ${key}:`, error);
    cacheStats.recordError();
    // On error, execute fallback without caching
    return await fallback();
  }
}

/**
 * Get value from cache
 * 
 * @param key - Cache key
 * @returns Cached value or null if not found
 */
export async function cacheGet<T>(key: string): Promise<T | null> {
  const redis = getRedisClient();

  try {
    const cached = await executeRedisWithCircuitBreaker(
      async () => redis.get(key),
      async () => null
    );

    if (cached) {
      cacheStats.recordHit();
      return JSON.parse(cached) as T;
    }

    cacheStats.recordMiss();
    return null;
  } catch (error) {
    console.error(`[Cache] Error getting key ${key}:`, error);
    cacheStats.recordError();
    return null;
  }
}

/**
 * Set value in cache
 * 
 * @param key - Cache key
 * @param value - Value to cache
 * @param ttl - Time to live in seconds
 */
export async function cacheSet<T>(
  key: string,
  value: T,
  ttl: number
): Promise<void> {
  const redis = getRedisClient();

  try {
    await executeRedisWithCircuitBreaker(
      async () => {
        await redis.setex(key, ttl, JSON.stringify(value));
        cacheStats.recordSet();
      },
      async () => {
        console.warn(`[Cache] Failed to set: ${key}`);
      }
    );
  } catch (error) {
    console.error(`[Cache] Error setting key ${key}:`, error);
    cacheStats.recordError();
  }
}

/**
 * Delete value from cache (invalidation)
 * 
 * @param key - Cache key
 */
export async function cacheDelete(key: string): Promise<void> {
  const redis = getRedisClient();

  try {
    await executeRedisWithCircuitBreaker(
      async () => {
        await redis.del(key);
        cacheStats.recordDelete();
        console.log(`[Cache] DELETE: ${key}`);
      },
      async () => {
        console.warn(`[Cache] Failed to delete: ${key}`);
      }
    );
  } catch (error) {
    console.error(`[Cache] Error deleting key ${key}:`, error);
    cacheStats.recordError();
  }
}

/**
 * Delete multiple keys by pattern (bulk invalidation)
 * 
 * @param pattern - Key pattern (e.g., "user:*")
 */
export async function cacheDeletePattern(pattern: string): Promise<number> {
  const redis = getRedisClient();

  try {
    return await executeRedisWithCircuitBreaker(
      async () => {
        const keys = await redis.keys(pattern);
        if (keys.length === 0) return 0;

        const deleted = await redis.del(...keys);
        cacheStats.recordDelete();
        console.log(`[Cache] DELETE PATTERN: ${pattern} (${deleted} keys)`);
        return deleted;
      },
      async () => {
        console.warn(`[Cache] Failed to delete pattern: ${pattern}`);
        return 0;
      }
    );
  } catch (error) {
    console.error(`[Cache] Error deleting pattern ${pattern}:`, error);
    cacheStats.recordError();
    return 0;
  }
}

/**
 * Clear all cache (use with caution)
 */
export async function cacheClear(): Promise<void> {
  const redis = getRedisClient();

  try {
    await executeRedisWithCircuitBreaker(
      async () => {
        await redis.flushdb();
        console.log('[Cache] CLEARED ALL');
      },
      async () => {
        console.warn('[Cache] Failed to clear all');
      }
    );
  } catch (error) {
    console.error('[Cache] Error clearing cache:', error);
    cacheStats.recordError();
  }
}

/**
 * Check if key exists in cache
 * 
 * @param key - Cache key
 * @returns True if key exists
 */
export async function cacheExists(key: string): Promise<boolean> {
  const redis = getRedisClient();

  try {
    const exists = await executeRedisWithCircuitBreaker(
      async () => redis.exists(key),
      async () => 0
    );

    return exists === 1;
  } catch (error) {
    console.error(`[Cache] Error checking existence of key ${key}:`, error);
    cacheStats.recordError();
    return false;
  }
}

/**
 * Get cache TTL for a key
 * 
 * @param key - Cache key
 * @returns TTL in seconds, -1 if no expiry, -2 if key doesn't exist
 */
export async function cacheTTL(key: string): Promise<number> {
  const redis = getRedisClient();

  try {
    return await executeRedisWithCircuitBreaker(
      async () => redis.ttl(key),
      async () => -2
    );
  } catch (error) {
    console.error(`[Cache] Error getting TTL for key ${key}:`, error);
    cacheStats.recordError();
    return -2;
  }
}

/**
 * Close Redis connection
 */
export async function closeCacheConnection(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    console.log('[Cache] Redis connection closed');
  }
}
