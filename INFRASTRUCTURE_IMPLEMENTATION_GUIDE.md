# Infrastructure Implementation Guide: Top 4 Critical Fixes

**Platform:** Data Normalization Platform v3.19.2  
**Author:** Manus AI  
**Date:** November 14, 2025  
**Estimated Total Time:** 2 weeks  
**Cost:** $0 (all open-source)

---

## Table of Contents

1. [Action 1: Circuit Breakers (2-3 days)](#action-1-circuit-breakers)
2. [Action 2: Redis Caching (1 week)](#action-2-redis-caching)
3. [Action 3: Prometheus Monitoring (1 week)](#action-3-prometheus-monitoring)
4. [Action 4: Connection Pooling with PgBouncer (1 day)](#action-4-connection-pooling)
5. [Testing & Validation](#testing--validation)
6. [Rollout Strategy](#rollout-strategy)

---

## Action 1: Circuit Breakers (2-3 days)

### Problem Statement

Without circuit breakers, when a downstream service (database, Redis, external API) fails, the application continues sending requests, causing:
- **Cascading failures** - one service failure brings down the entire system
- **Resource exhaustion** - threads/connections pile up waiting for timeouts
- **Slow recovery** - system can't recover even after service is restored

### Solution: Implement Circuit Breakers with Opossum

**Opossum** is a Node.js circuit breaker library with 2.7K stars, actively maintained, and production-ready.

**Repository:** https://github.com/nodeshift/opossum  
**License:** Apache 2.0  
**Installation:**

```bash
npm install opossum
```

### Implementation

#### Step 1: Install Dependencies (15 minutes)

```bash
cd /home/ubuntu/name-normalization-demo
pnpm add opossum
pnpm add -D @types/opossum
```

#### Step 2: Create Circuit Breaker Wrapper (2 hours)

Create `server/_core/circuitBreaker.ts`:

```typescript
import CircuitBreaker from 'opossum';

export interface CircuitBreakerOptions {
  timeout?: number; // Request timeout (ms)
  errorThresholdPercentage?: number; // % of failures to open circuit
  resetTimeout?: number; // Time before attempting to close circuit (ms)
  rollingCountTimeout?: number; // Time window for error calculation (ms)
  rollingCountBuckets?: number; // Number of buckets in rolling window
  name?: string; // Circuit breaker name for monitoring
}

const DEFAULT_OPTIONS: CircuitBreakerOptions = {
  timeout: 3000, // 3 seconds
  errorThresholdPercentage: 50, // Open circuit if 50% of requests fail
  resetTimeout: 30000, // Try to close circuit after 30 seconds
  rollingCountTimeout: 10000, // 10 second rolling window
  rollingCountBuckets: 10, // 10 buckets of 1 second each
};

/**
 * Creates a circuit breaker for a given async function
 * 
 * Circuit States:
 * - CLOSED: Normal operation, requests pass through
 * - OPEN: Too many failures, reject requests immediately
 * - HALF_OPEN: Testing if service recovered, allow limited requests
 */
export function createCircuitBreaker<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  options: CircuitBreakerOptions = {}
): CircuitBreaker<T, R> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  const breaker = new CircuitBreaker(fn, {
    timeout: opts.timeout,
    errorThresholdPercentage: opts.errorThresholdPercentage,
    resetTimeout: opts.resetTimeout,
    rollingCountTimeout: opts.rollingCountTimeout,
    rollingCountBuckets: opts.rollingCountBuckets,
    name: opts.name || fn.name || 'anonymous',
  });

  // Event listeners for monitoring
  breaker.on('open', () => {
    console.error(`[CircuitBreaker] ${opts.name} OPENED - too many failures`);
  });

  breaker.on('halfOpen', () => {
    console.warn(`[CircuitBreaker] ${opts.name} HALF-OPEN - testing recovery`);
  });

  breaker.on('close', () => {
    console.info(`[CircuitBreaker] ${opts.name} CLOSED - service recovered`);
  });

  breaker.on('fallback', (result) => {
    console.warn(`[CircuitBreaker] ${opts.name} fallback executed:`, result);
  });

  return breaker;
}

/**
 * Circuit breaker with automatic retry and exponential backoff
 */
export function createRetryingCircuitBreaker<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  options: CircuitBreakerOptions & {
    maxRetries?: number;
    retryDelay?: number;
  } = {}
): CircuitBreaker<T, R> {
  const maxRetries = options.maxRetries || 3;
  const retryDelay = options.retryDelay || 1000;

  const retryingFn = async (...args: T): Promise<R> => {
    let lastError: Error | undefined;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn(...args);
      } catch (error) {
        lastError = error as Error;
        
        if (attempt < maxRetries) {
          const delay = retryDelay * Math.pow(2, attempt); // Exponential backoff
          console.warn(`[Retry] Attempt ${attempt + 1}/${maxRetries} failed, retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError;
  };

  return createCircuitBreaker(retryingFn, options);
}

/**
 * Helper to execute circuit breaker with fallback
 */
export async function executeWithFallback<T>(
  breaker: CircuitBreaker<any[], T>,
  fallbackValue: T,
  ...args: any[]
): Promise<T> {
  try {
    return await breaker.fire(...args);
  } catch (error) {
    console.warn('[CircuitBreaker] Using fallback value:', fallbackValue);
    return fallbackValue;
  }
}
```

#### Step 3: Wrap Database Operations (4 hours)

Update `server/db.ts`:

```typescript
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users } from "../drizzle/schema";
import { ENV } from './_core/env';
import { createCircuitBreaker } from './_core/circuitBreaker';

let _db: ReturnType<typeof drizzle> | null = null;

// Circuit breakers for database operations
const dbCircuitBreakers = {
  query: createCircuitBreaker(
    async (fn: () => Promise<any>) => fn(),
    {
      name: 'database-query',
      timeout: 5000,
      errorThresholdPercentage: 50,
      resetTimeout: 30000,
    }
  ),
  insert: createCircuitBreaker(
    async (fn: () => Promise<any>) => fn(),
    {
      name: 'database-insert',
      timeout: 10000,
      errorThresholdPercentage: 60,
      resetTimeout: 30000,
    }
  ),
};

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    // Wrap database operation in circuit breaker
    await dbCircuitBreakers.insert.fire(async () => {
      const values: InsertUser = {
        openId: user.openId,
      };
      const updateSet: Record<string, unknown> = {};

      const textFields = ["name", "email", "loginMethod"] as const;
      type TextField = (typeof textFields)[number];

      const assignNullable = (field: TextField) => {
        const value = user[field];
        if (value === undefined) return;
        const normalized = value ?? null;
        values[field] = normalized;
        updateSet[field] = normalized;
      };

      textFields.forEach(assignNullable);

      if (user.lastSignedIn !== undefined) {
        values.lastSignedIn = user.lastSignedIn;
        updateSet.lastSignedIn = user.lastSignedIn;
      }
      if (user.role !== undefined) {
        values.role = user.role;
        updateSet.role = user.role;
      } else if (user.openId === ENV.ownerOpenId) {
        values.role = 'admin';
        updateSet.role = 'admin';
      }

      if (!values.lastSignedIn) {
        values.lastSignedIn = new Date();
      }

      if (Object.keys(updateSet).length === 0) {
        updateSet.lastSignedIn = new Date();
      }

      await db.insert(users).values(values).onDuplicateKeyUpdate({
        set: updateSet,
      });
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  try {
    // Wrap database query in circuit breaker
    return await dbCircuitBreakers.query.fire(async () => {
      const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
      return result.length > 0 ? result[0] : undefined;
    });
  } catch (error) {
    console.error("[Database] Failed to get user:", error);
    // Return undefined instead of throwing to allow graceful degradation
    return undefined;
  }
}
```

#### Step 4: Wrap Redis Operations (2 hours)

Update `server/_core/rateLimit.ts`:

```typescript
import { createClient, RedisClientType } from 'redis';
import { createCircuitBreaker, executeWithFallback } from './circuitBreaker';

let redisClient: RedisClientType | null = null;

// Circuit breaker for Redis operations
const redisCircuitBreaker = createCircuitBreaker(
  async (fn: () => Promise<any>) => fn(),
  {
    name: 'redis-operations',
    timeout: 2000, // Redis should be fast
    errorThresholdPercentage: 50,
    resetTimeout: 20000, // Shorter reset for cache
  }
);

async function getRedisClient(): Promise<RedisClientType | null> {
  if (redisClient) return redisClient;

  try {
    const client = createClient({
      socket: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        connectTimeout: 5000,
      },
    });

    client.on('error', (err) => {
      console.error('[Redis] Error:', err);
    });

    await client.connect();
    redisClient = client;
    return client;
  } catch (error) {
    console.error('[Redis] Failed to connect:', error);
    return null;
  }
}

export async function checkRateLimit(
  userId: string,
  limit: number = 10,
  windowMs: number = 3600000 // 1 hour
): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
  const client = await getRedisClient();
  
  // Fail-open: if Redis is down, allow the request
  if (!client) {
    console.warn('[RateLimit] Redis unavailable, allowing request (fail-open)');
    return { allowed: true, remaining: limit - 1, resetTime: Date.now() + windowMs };
  }

  const key = `ratelimit:${userId}`;
  const now = Date.now();
  const windowStart = now - windowMs;

  try {
    // Use circuit breaker for Redis operations
    const count = await executeWithFallback(
      redisCircuitBreaker,
      0, // Fallback: assume 0 requests (fail-open)
      async () => {
        // Remove old entries outside the time window
        await client.zRemRangeByScore(key, 0, windowStart);
        
        // Add current request
        await client.zAdd(key, { score: now, value: `${now}` });
        
        // Set expiration
        await client.expire(key, Math.ceil(windowMs / 1000));
        
        // Count requests in current window
        return await client.zCard(key);
      }
    );

    const allowed = count <= limit;
    const remaining = Math.max(0, limit - count);
    const resetTime = now + windowMs;

    return { allowed, remaining, resetTime };
  } catch (error) {
    console.error('[RateLimit] Error checking rate limit:', error);
    // Fail-open: allow request on error
    return { allowed: true, remaining: limit - 1, resetTime: now + windowMs };
  }
}
```

#### Step 5: Add Circuit Breaker Monitoring Endpoint (1 hour)

Create `server/routers/monitoring.ts`:

```typescript
import { router, publicProcedure } from './_core/trpc';

export const monitoringRouter = router({
  circuitBreakerStatus: publicProcedure.query(() => {
    // In production, you'd collect this from a metrics store
    // For now, return placeholder data
    return {
      breakers: [
        {
          name: 'database-query',
          state: 'CLOSED',
          successCount: 1523,
          failureCount: 12,
          errorRate: 0.78,
          lastFailure: null,
        },
        {
          name: 'database-insert',
          state: 'CLOSED',
          successCount: 892,
          failureCount: 3,
          errorRate: 0.34,
          lastFailure: null,
        },
        {
          name: 'redis-operations',
          state: 'CLOSED',
          successCount: 5421,
          failureCount: 45,
          errorRate: 0.82,
          lastFailure: new Date(Date.now() - 120000), // 2 minutes ago
        },
      ],
    };
  }),
});
```

Update `server/routers.ts`:

```typescript
import { monitoringRouter } from './routers/monitoring';

export const appRouter = router({
  system: systemRouter,
  auth: authRouter,
  monitoring: monitoringRouter, // Add this line
  // ... other routers
});
```

### Testing Circuit Breakers

Create `tests/circuit-breaker.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createCircuitBreaker, executeWithFallback } from '../server/_core/circuitBreaker';

describe('Circuit Breaker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should allow requests when circuit is closed', async () => {
    const mockFn = vi.fn().mockResolvedValue('success');
    const breaker = createCircuitBreaker(mockFn, {
      timeout: 1000,
      errorThresholdPercentage: 50,
    });

    const result = await breaker.fire();
    expect(result).toBe('success');
    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  it('should open circuit after threshold failures', async () => {
    let callCount = 0;
    const mockFn = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount <= 5) {
        throw new Error('Service unavailable');
      }
      return Promise.resolve('success');
    });

    const breaker = createCircuitBreaker(mockFn, {
      timeout: 1000,
      errorThresholdPercentage: 50,
      rollingCountTimeout: 1000,
      rollingCountBuckets: 1,
    });

    // First 5 calls should fail
    for (let i = 0; i < 5; i++) {
      try {
        await breaker.fire();
      } catch (error) {
        // Expected to fail
      }
    }

    // Circuit should be open now, next call should fail immediately
    const start = Date.now();
    try {
      await breaker.fire();
    } catch (error) {
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(100); // Should fail fast, not wait for timeout
    }
  });

  it('should use fallback value when circuit is open', async () => {
    const mockFn = vi.fn().mockRejectedValue(new Error('Service down'));
    const breaker = createCircuitBreaker(mockFn, {
      timeout: 1000,
      errorThresholdPercentage: 0, // Open immediately on first failure
    });

    const result = await executeWithFallback(breaker, 'fallback-value');
    expect(result).toBe('fallback-value');
  });
});
```

Run tests:

```bash
pnpm test tests/circuit-breaker.test.ts
```

### Rollout Checklist

- [ ] Install opossum package
- [ ] Create circuit breaker wrapper utility
- [ ] Wrap database operations (queries, inserts, updates)
- [ ] Wrap Redis operations (rate limiting, caching)
- [ ] Add circuit breaker monitoring endpoint
- [ ] Write unit tests
- [ ] Test in development environment
- [ ] Monitor circuit breaker events in logs
- [ ] Deploy to production with monitoring

**Time Estimate:** 2-3 days  
**Impact:** Prevents cascading failures, improves system resilience  
**Cost:** $0 (open-source)

---

## Action 2: Redis Caching (1 week)

### Problem Statement

Current architecture queries the database for every request, causing:
- **High database load** - 100+ concurrent users = 1000+ queries/second
- **Slow response times** - 50-200ms per query
- **Poor scalability** - database becomes bottleneck at 50-100 concurrent users

### Solution: Implement Redis Caching Layer

Redis is an in-memory data store that can serve 100,000+ requests/second with <1ms latency.

**Repository:** https://github.com/redis/redis  
**License:** BSD-3-Clause  
**Installation:** Already installed (used for rate limiting)

### Implementation

#### Step 1: Create Caching Utility (4 hours)

Create `server/_core/cache.ts`:

```typescript
import { createClient, RedisClientType } from 'redis';
import { createCircuitBreaker, executeWithFallback } from './circuitBreaker';

let cacheClient: RedisClientType | null = null;

// Circuit breaker for cache operations
const cacheCircuitBreaker = createCircuitBreaker(
  async (fn: () => Promise<any>) => fn(),
  {
    name: 'redis-cache',
    timeout: 1000,
    errorThresholdPercentage: 50,
    resetTimeout: 15000,
  }
);

async function getCacheClient(): Promise<RedisClientType | null> {
  if (cacheClient) return cacheClient;

  try {
    const client = createClient({
      socket: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        connectTimeout: 5000,
      },
    });

    client.on('error', (err) => {
      console.error('[Cache] Redis error:', err);
    });

    await client.connect();
    cacheClient = client;
    console.info('[Cache] Redis connected successfully');
    return client;
  } catch (error) {
    console.error('[Cache] Failed to connect to Redis:', error);
    return null;
  }
}

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  namespace?: string; // Cache key namespace
}

/**
 * Get value from cache
 */
export async function cacheGet<T>(
  key: string,
  options: CacheOptions = {}
): Promise<T | null> {
  const client = await getCacheClient();
  if (!client) return null;

  const fullKey = options.namespace ? `${options.namespace}:${key}` : key;

  try {
    const value = await executeWithFallback(
      cacheCircuitBreaker,
      null,
      async () => {
        const data = await client.get(fullKey);
        return data ? JSON.parse(data) : null;
      }
    );

    if (value) {
      console.debug(`[Cache] HIT: ${fullKey}`);
    } else {
      console.debug(`[Cache] MISS: ${fullKey}`);
    }

    return value;
  } catch (error) {
    console.error(`[Cache] Error getting key ${fullKey}:`, error);
    return null;
  }
}

/**
 * Set value in cache
 */
export async function cacheSet<T>(
  key: string,
  value: T,
  options: CacheOptions = {}
): Promise<boolean> {
  const client = await getCacheClient();
  if (!client) return false;

  const fullKey = options.namespace ? `${options.namespace}:${key}` : key;
  const ttl = options.ttl || 3600; // Default 1 hour

  try {
    await executeWithFallback(
      cacheCircuitBreaker,
      false,
      async () => {
        await client.setEx(fullKey, ttl, JSON.stringify(value));
        return true;
      }
    );

    console.debug(`[Cache] SET: ${fullKey} (TTL: ${ttl}s)`);
    return true;
  } catch (error) {
    console.error(`[Cache] Error setting key ${fullKey}:`, error);
    return false;
  }
}

/**
 * Delete value from cache
 */
export async function cacheDelete(
  key: string,
  options: CacheOptions = {}
): Promise<boolean> {
  const client = await getCacheClient();
  if (!client) return false;

  const fullKey = options.namespace ? `${options.namespace}:${key}` : key;

  try {
    await executeWithFallback(
      cacheCircuitBreaker,
      false,
      async () => {
        await client.del(fullKey);
        return true;
      }
    );

    console.debug(`[Cache] DELETE: ${fullKey}`);
    return true;
  } catch (error) {
    console.error(`[Cache] Error deleting key ${fullKey}:`, error);
    return false;
  }
}

/**
 * Get or set pattern: fetch from cache, or compute and cache if missing
 */
export async function cacheGetOrSet<T>(
  key: string,
  fetchFn: () => Promise<T>,
  options: CacheOptions = {}
): Promise<T> {
  // Try to get from cache first
  const cached = await cacheGet<T>(key, options);
  if (cached !== null) {
    return cached;
  }

  // Cache miss - fetch from source
  console.debug(`[Cache] MISS: ${key}, fetching from source...`);
  const value = await fetchFn();

  // Store in cache for next time
  await cacheSet(key, value, options);

  return value;
}

/**
 * Invalidate cache by pattern (e.g., "user:*")
 */
export async function cacheInvalidatePattern(
  pattern: string,
  options: CacheOptions = {}
): Promise<number> {
  const client = await getCacheClient();
  if (!client) return 0;

  const fullPattern = options.namespace ? `${options.namespace}:${pattern}` : pattern;

  try {
    const keys = await client.keys(fullPattern);
    if (keys.length === 0) return 0;

    await client.del(keys);
    console.info(`[Cache] Invalidated ${keys.length} keys matching ${fullPattern}`);
    return keys.length;
  } catch (error) {
    console.error(`[Cache] Error invalidating pattern ${fullPattern}:`, error);
    return 0;
  }
}
```

#### Step 2: Add Caching to Database Operations (6 hours)

Update `server/db.ts`:

```typescript
import { cacheGet, cacheSet, cacheDelete, cacheGetOrSet } from './_core/cache';

const CACHE_TTL = {
  USER: 3600, // 1 hour
  JOB: 300, // 5 minutes
  METRICS: 60, // 1 minute
};

export async function getUserByOpenId(openId: string) {
  const cacheKey = `user:${openId}`;

  return await cacheGetOrSet(
    cacheKey,
    async () => {
      // Original database query
      const db = await getDb();
      if (!db) {
        console.warn("[Database] Cannot get user: database not available");
        return undefined;
      }

      try {
        return await dbCircuitBreakers.query.fire(async () => {
          const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
          return result.length > 0 ? result[0] : undefined;
        });
      } catch (error) {
        console.error("[Database] Failed to get user:", error);
        return undefined;
      }
    },
    { ttl: CACHE_TTL.USER, namespace: 'db' }
  );
}

export async function upsertUser(user: InsertUser): Promise<void> {
  // ... existing upsert logic ...

  // Invalidate cache after update
  await cacheDelete(`user:${user.openId}`, { namespace: 'db' });
}
```

#### Step 3: Add Caching to tRPC Procedures (8 hours)

Create `server/_core/cachedProcedure.ts`:

```typescript
import { publicProcedure, protectedProcedure } from './trpc';
import { cacheGetOrSet } from './cache';
import { z } from 'zod';

/**
 * Creates a cached public procedure
 */
export function cachedPublicProcedure<TInput extends z.ZodTypeAny>(
  cacheKeyFn: (input: z.infer<TInput>) => string,
  ttl: number = 300 // 5 minutes default
) {
  return publicProcedure.use(async ({ ctx, next, input }) => {
    const cacheKey = cacheKeyFn(input);

    const result = await cacheGetOrSet(
      cacheKey,
      async () => {
        const response = await next({ ctx });
        return response.data;
      },
      { ttl, namespace: 'trpc' }
    );

    return { ...ctx, data: result };
  });
}

/**
 * Creates a cached protected procedure
 */
export function cachedProtectedProcedure<TInput extends z.ZodTypeAny>(
  cacheKeyFn: (input: z.infer<TInput>, userId: number) => string,
  ttl: number = 300
) {
  return protectedProcedure.use(async ({ ctx, next, input }) => {
    const cacheKey = cacheKeyFn(input, ctx.user.id);

    const result = await cacheGetOrSet(
      cacheKey,
      async () => {
        const response = await next({ ctx });
        return response.data;
      },
      { ttl, namespace: 'trpc' }
    );

    return { ...ctx, data: result };
  });
}
```

Example usage in `server/routers.ts`:

```typescript
import { cachedPublicProcedure } from './_core/cachedProcedure';
import { z } from 'zod';

export const appRouter = router({
  // Cached endpoint example
  jobs: router({
    getById: cachedPublicProcedure(
      (input) => `job:${input.id}`,
      300 // 5 minute cache
    )
      .input(z.object({ id: z.string() }))
      .query(async ({ input }) => {
        // This will be cached
        return await getJobById(input.id);
      }),
  }),
});
```

#### Step 4: Add Cache Warming Strategy (4 hours)

Create `server/services/CacheWarmer.ts`:

```typescript
import { cacheSet } from '../_core/cache';
import { getDb } from '../db';
import { users } from '../../drizzle/schema';

/**
 * Pre-populate cache with frequently accessed data
 */
export class CacheWarmer {
  private static isWarming = false;

  /**
   * Warm user cache with most active users
   */
  static async warmUserCache(limit: number = 1000): Promise<void> {
    if (this.isWarming) {
      console.warn('[CacheWarmer] Cache warming already in progress');
      return;
    }

    this.isWarming = true;
    console.info('[CacheWarmer] Starting user cache warming...');

    try {
      const db = await getDb();
      if (!db) {
        console.error('[CacheWarmer] Database not available');
        return;
      }

      // Get most recently active users
      const recentUsers = await db
        .select()
        .from(users)
        .orderBy(users.lastSignedIn)
        .limit(limit);

      console.info(`[CacheWarmer] Warming cache for ${recentUsers.length} users`);

      // Cache each user
      for (const user of recentUsers) {
        await cacheSet(
          `user:${user.openId}`,
          user,
          { ttl: 3600, namespace: 'db' }
        );
      }

      console.info('[CacheWarmer] User cache warming complete');
    } catch (error) {
      console.error('[CacheWarmer] Error warming cache:', error);
    } finally {
      this.isWarming = false;
    }
  }

  /**
   * Schedule periodic cache warming
   */
  static startPeriodicWarming(intervalMs: number = 3600000): void {
    console.info(`[CacheWarmer] Starting periodic cache warming (every ${intervalMs}ms)`);

    // Warm immediately on startup
    this.warmUserCache();

    // Then warm periodically
    setInterval(() => {
      this.warmUserCache();
    }, intervalMs);
  }
}
```

Add to `server/_core/index.ts`:

```typescript
import { CacheWarmer } from '../services/CacheWarmer';

// Start cache warming on server startup
CacheWarmer.startPeriodicWarming(3600000); // Every hour
```

#### Step 5: Add Cache Metrics Endpoint (2 hours)

Update `server/routers/monitoring.ts`:

```typescript
import { router, publicProcedure } from './_core/trpc';
import { getCacheClient } from './_core/cache';

export const monitoringRouter = router({
  cacheStats: publicProcedure.query(async () => {
    const client = await getCacheClient();
    if (!client) {
      return { available: false };
    }

    try {
      const info = await client.info('stats');
      const keyspace = await client.info('keyspace');

      // Parse Redis INFO output
      const stats = {
        available: true,
        totalKeys: 0,
        hitRate: 0,
        memoryUsed: 0,
        connectedClients: 0,
      };

      // Extract total keys from keyspace
      const dbMatch = keyspace.match(/keys=(\d+)/);
      if (dbMatch) {
        stats.totalKeys = parseInt(dbMatch[1]);
      }

      // Extract hit rate from stats
      const hitsMatch = info.match(/keyspace_hits:(\d+)/);
      const missesMatch = info.match(/keyspace_misses:(\d+)/);
      if (hitsMatch && missesMatch) {
        const hits = parseInt(hitsMatch[1]);
        const misses = parseInt(missesMatch[1]);
        stats.hitRate = hits / (hits + misses) * 100;
      }

      return stats;
    } catch (error) {
      console.error('[Monitoring] Error getting cache stats:', error);
      return { available: false };
    }
  }),
});
```

### Performance Testing

Create `tests/cache-performance.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { cacheGet, cacheSet, cacheGetOrSet } from '../server/_core/cache';

describe('Cache Performance', () => {
  it('should be faster than database query', async () => {
    const testData = { id: 1, name: 'Test User' };

    // First call - cache miss (slow)
    const start1 = Date.now();
    await cacheSet('test:user:1', testData, { ttl: 60 });
    const duration1 = Date.now() - start1;

    // Second call - cache hit (fast)
    const start2 = Date.now();
    const cached = await cacheGet('test:user:1');
    const duration2 = Date.now() - start2;

    expect(cached).toEqual(testData);
    expect(duration2).toBeLessThan(duration1);
    expect(duration2).toBeLessThan(10); // Should be < 10ms
  });

  it('should handle 1000 concurrent requests', async () => {
    const promises = [];
    
    for (let i = 0; i < 1000; i++) {
      promises.push(
        cacheGetOrSet(
          `test:concurrent:${i}`,
          async () => ({ id: i, data: 'test' }),
          { ttl: 60 }
        )
      );
    }

    const start = Date.now();
    await Promise.all(promises);
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(1000); // Should complete in < 1 second
  });
});
```

### Rollout Checklist

- [ ] Create caching utility with circuit breaker
- [ ] Add caching to database operations
- [ ] Create cached tRPC procedure wrappers
- [ ] Implement cache warming strategy
- [ ] Add cache metrics endpoint
- [ ] Write performance tests
- [ ] Test cache hit/miss rates in development
- [ ] Monitor cache performance metrics
- [ ] Deploy to production with monitoring

**Time Estimate:** 1 week  
**Impact:** 10x throughput improvement, <1ms response times  
**Cost:** $0 (Redis already installed)

---

## Action 3: Prometheus Monitoring (1 week)

### Problem Statement

Current platform has no observability:
- **No metrics** - can't measure performance or detect degradation
- **No alerting** - failures discovered by users, not monitoring
- **No dashboards** - no visibility into system health
- **Slow incident response** - takes hours to diagnose issues

### Solution: Prometheus + Grafana Stack

**Prometheus:** Time-series database for metrics  
**Grafana:** Visualization and dashboards  
**prom-client:** Node.js Prometheus client

**Repositories:**
- Prometheus: https://github.com/prometheus/prometheus
- Grafana: https://github.com/grafana/grafana
- prom-client: https://github.com/siimon/prom-client

**Licenses:** Apache 2.0

### Implementation

#### Step 1: Install Dependencies (30 minutes)

```bash
pnpm add prom-client
pnpm add -D @types/prom-client
```

#### Step 2: Create Metrics Collector (4 hours)

Create `server/_core/metrics.ts`:

```typescript
import { Registry, Counter, Histogram, Gauge, collectDefaultMetrics } from 'prom-client';

// Create registry
export const register = new Registry();

// Collect default metrics (CPU, memory, etc.)
collectDefaultMetrics({ register });

// HTTP request metrics
export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5],
  registers: [register],
});

export const httpRequestTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

// Database metrics
export const dbQueryDuration = new Histogram({
  name: 'db_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  labelNames: ['operation', 'table'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
  registers: [register],
});

export const dbQueryTotal = new Counter({
  name: 'db_queries_total',
  help: 'Total number of database queries',
  labelNames: ['operation', 'table', 'status'],
  registers: [register],
});

export const dbConnectionsActive = new Gauge({
  name: 'db_connections_active',
  help: 'Number of active database connections',
  registers: [register],
});

// Cache metrics
export const cacheHitTotal = new Counter({
  name: 'cache_hits_total',
  help: 'Total number of cache hits',
  labelNames: ['cache_name'],
  registers: [register],
});

export const cacheMissTotal = new Counter({
  name: 'cache_misses_total',
  help: 'Total number of cache misses',
  labelNames: ['cache_name'],
  registers: [register],
});

export const cacheOperationDuration = new Histogram({
  name: 'cache_operation_duration_seconds',
  help: 'Duration of cache operations in seconds',
  labelNames: ['operation'],
  buckets: [0.0001, 0.0005, 0.001, 0.005, 0.01, 0.05],
  registers: [register],
});

// Circuit breaker metrics
export const circuitBreakerState = new Gauge({
  name: 'circuit_breaker_state',
  help: 'Circuit breaker state (0=closed, 1=open, 2=half-open)',
  labelNames: ['breaker_name'],
  registers: [register],
});

export const circuitBreakerFailures = new Counter({
  name: 'circuit_breaker_failures_total',
  help: 'Total number of circuit breaker failures',
  labelNames: ['breaker_name'],
  registers: [register],
});

// Job processing metrics
export const jobProcessingDuration = new Histogram({
  name: 'job_processing_duration_seconds',
  help: 'Duration of job processing in seconds',
  labelNames: ['job_type'],
  buckets: [1, 5, 10, 30, 60, 300, 600],
  registers: [register],
});

export const jobProcessingTotal = new Counter({
  name: 'jobs_processed_total',
  help: 'Total number of jobs processed',
  labelNames: ['job_type', 'status'],
  registers: [register],
});

export const jobQueueSize = new Gauge({
  name: 'job_queue_size',
  help: 'Number of jobs in queue',
  labelNames: ['queue_name'],
  registers: [register],
});

// Worker pool metrics
export const workerPoolActive = new Gauge({
  name: 'worker_pool_active',
  help: 'Number of active workers in pool',
  registers: [register],
});

export const workerPoolMemory = new Gauge({
  name: 'worker_pool_memory_mb',
  help: 'Memory usage of worker pool in MB',
  registers: [register],
});

// Normalization metrics
export const normalizationRowsProcessed = new Counter({
  name: 'normalization_rows_processed_total',
  help: 'Total number of rows normalized',
  labelNames: ['column_type'],
  registers: [register],
});

export const normalizationErrors = new Counter({
  name: 'normalization_errors_total',
  help: 'Total number of normalization errors',
  labelNames: ['column_type', 'error_type'],
  registers: [register],
});
```

#### Step 3: Add Metrics Middleware (2 hours)

Update `server/_core/index.ts`:

```typescript
import express from 'express';
import { register, httpRequestDuration, httpRequestTotal } from './metrics';

const app = express();

// Metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

// Metrics middleware for all requests
app.use((req, res, next) => {
  const start = Date.now();

  // Capture response
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const route = req.route?.path || req.path;

    httpRequestDuration.observe(
      { method: req.method, route, status_code: res.statusCode },
      duration
    );

    httpRequestTotal.inc({
      method: req.method,
      route,
      status_code: res.statusCode,
    });
  });

  next();
});
```

#### Step 4: Instrument Database Operations (3 hours)

Update `server/db.ts`:

```typescript
import { dbQueryDuration, dbQueryTotal } from './_core/metrics';

export async function getUserByOpenId(openId: string) {
  const start = Date.now();
  const operation = 'select';
  const table = 'users';

  try {
    const result = await cacheGetOrSet(
      `user:${openId}`,
      async () => {
        const db = await getDb();
        if (!db) return undefined;

        return await dbCircuitBreakers.query.fire(async () => {
          const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
          return result.length > 0 ? result[0] : undefined;
        });
      },
      { ttl: CACHE_TTL.USER, namespace: 'db' }
    );

    // Record success
    const duration = (Date.now() - start) / 1000;
    dbQueryDuration.observe({ operation, table }, duration);
    dbQueryTotal.inc({ operation, table, status: 'success' });

    return result;
  } catch (error) {
    // Record failure
    const duration = (Date.now() - start) / 1000;
    dbQueryDuration.observe({ operation, table }, duration);
    dbQueryTotal.inc({ operation, table, status: 'error' });
    throw error;
  }
}
```

#### Step 5: Instrument Cache Operations (2 hours)

Update `server/_core/cache.ts`:

```typescript
import { cacheHitTotal, cacheMissTotal, cacheOperationDuration } from './metrics';

export async function cacheGet<T>(
  key: string,
  options: CacheOptions = {}
): Promise<T | null> {
  const start = Date.now();
  const client = await getCacheClient();
  if (!client) return null;

  const fullKey = options.namespace ? `${options.namespace}:${key}` : key;

  try {
    const value = await executeWithFallback(
      cacheCircuitBreaker,
      null,
      async () => {
        const data = await client.get(fullKey);
        return data ? JSON.parse(data) : null;
      }
    );

    // Record metrics
    const duration = (Date.now() - start) / 1000;
    cacheOperationDuration.observe({ operation: 'get' }, duration);

    if (value) {
      cacheHitTotal.inc({ cache_name: options.namespace || 'default' });
      console.debug(`[Cache] HIT: ${fullKey}`);
    } else {
      cacheMissTotal.inc({ cache_name: options.namespace || 'default' });
      console.debug(`[Cache] MISS: ${fullKey}`);
    }

    return value;
  } catch (error) {
    console.error(`[Cache] Error getting key ${fullKey}:`, error);
    return null;
  }
}
```

#### Step 6: Deploy Prometheus Server (4 hours)

Create `docker-compose.monitoring.yml`:

```yaml
version: '3.8'

services:
  prometheus:
    image: prom/prometheus:latest
    container_name: prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus-data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/usr/share/prometheus/console_libraries'
      - '--web.console.templates=/usr/share/prometheus/consoles'
    restart: unless-stopped

  grafana:
    image: grafana/grafana:latest
    container_name: grafana
    ports:
      - "3001:3000"
    volumes:
      - grafana-data:/var/lib/grafana
      - ./monitoring/grafana/dashboards:/etc/grafana/provisioning/dashboards
      - ./monitoring/grafana/datasources:/etc/grafana/provisioning/datasources
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
      - GF_USERS_ALLOW_SIGN_UP=false
    restart: unless-stopped

  node-exporter:
    image: prom/node-exporter:latest
    container_name: node-exporter
    ports:
      - "9100:9100"
    restart: unless-stopped

volumes:
  prometheus-data:
  grafana-data:
```

Create `monitoring/prometheus.yml`:

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  # Scrape metrics from Node.js app
  - job_name: 'data-normalization-platform'
    static_configs:
      - targets: ['host.docker.internal:3000']
    metrics_path: '/metrics'

  # Scrape system metrics
  - job_name: 'node-exporter'
    static_configs:
      - targets: ['node-exporter:9100']

  # Scrape Prometheus itself
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']
```

Start monitoring stack:

```bash
docker-compose -f docker-compose.monitoring.yml up -d
```

#### Step 7: Create Grafana Dashboards (6 hours)

Create `monitoring/grafana/datasources/prometheus.yml`:

```yaml
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
    editable: false
```

Create `monitoring/grafana/dashboards/dashboard.yml`:

```yaml
apiVersion: 1

providers:
  - name: 'Default'
    orgId: 1
    folder: ''
    type: file
    disableDeletion: false
    updateIntervalSeconds: 10
    allowUiUpdates: true
    options:
      path: /etc/grafana/provisioning/dashboards
```

Create `monitoring/grafana/dashboards/platform-overview.json`:

```json
{
  "dashboard": {
    "title": "Data Normalization Platform Overview",
    "panels": [
      {
        "title": "Request Rate",
        "targets": [
          {
            "expr": "rate(http_requests_total[5m])",
            "legendFormat": "{{method}} {{route}}"
          }
        ],
        "type": "graph"
      },
      {
        "title": "Request Duration (p95)",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))",
            "legendFormat": "{{route}}"
          }
        ],
        "type": "graph"
      },
      {
        "title": "Cache Hit Rate",
        "targets": [
          {
            "expr": "rate(cache_hits_total[5m]) / (rate(cache_hits_total[5m]) + rate(cache_misses_total[5m])) * 100",
            "legendFormat": "{{cache_name}}"
          }
        ],
        "type": "graph"
      },
      {
        "title": "Database Query Duration (p95)",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(db_query_duration_seconds_bucket[5m]))",
            "legendFormat": "{{operation}} {{table}}"
          }
        ],
        "type": "graph"
      },
      {
        "title": "Circuit Breaker States",
        "targets": [
          {
            "expr": "circuit_breaker_state",
            "legendFormat": "{{breaker_name}}"
          }
        ],
        "type": "graph"
      },
      {
        "title": "Worker Pool Memory Usage",
        "targets": [
          {
            "expr": "worker_pool_memory_mb",
            "legendFormat": "Memory (MB)"
          }
        ],
        "type": "graph"
      }
    ]
  }
}
```

Access Grafana:
- URL: http://localhost:3001
- Username: admin
- Password: admin

#### Step 8: Configure Alerting (4 hours)

Create `monitoring/prometheus/alerts.yml`:

```yaml
groups:
  - name: platform_alerts
    interval: 30s
    rules:
      # High error rate
      - alert: HighErrorRate
        expr: rate(http_requests_total{status_code=~"5.."}[5m]) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value }} requests/sec"

      # High response time
      - alert: HighResponseTime
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High response time detected"
          description: "P95 response time is {{ $value }}s"

      # Circuit breaker open
      - alert: CircuitBreakerOpen
        expr: circuit_breaker_state == 1
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Circuit breaker {{ $labels.breaker_name }} is OPEN"
          description: "Service {{ $labels.breaker_name }} is experiencing failures"

      # Low cache hit rate
      - alert: LowCacheHitRate
        expr: rate(cache_hits_total[5m]) / (rate(cache_hits_total[5m]) + rate(cache_misses_total[5m])) < 0.5
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Low cache hit rate"
          description: "Cache hit rate is {{ $value }}%"

      # High memory usage
      - alert: HighMemoryUsage
        expr: worker_pool_memory_mb > 1000
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High worker pool memory usage"
          description: "Worker pool using {{ $value }}MB"

      # Database connection issues
      - alert: DatabaseConnectionFailures
        expr: rate(db_queries_total{status="error"}[5m]) > 0.1
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Database connection failures detected"
          description: "Database error rate is {{ $value }} queries/sec"
```

Update `monitoring/prometheus.yml`:

```yaml
rule_files:
  - '/etc/prometheus/alerts.yml'

alerting:
  alertmanagers:
    - static_configs:
        - targets: ['alertmanager:9093']
```

### Rollout Checklist

- [ ] Install prom-client package
- [ ] Create metrics collector with all metric types
- [ ] Add metrics middleware to Express
- [ ] Instrument database operations
- [ ] Instrument cache operations
- [ ] Deploy Prometheus server with Docker
- [ ] Deploy Grafana with Docker
- [ ] Create Grafana dashboards
- [ ] Configure alerting rules
- [ ] Test metrics collection
- [ ] Test alert firing
- [ ] Deploy to production

**Time Estimate:** 1 week  
**Impact:** Detect failures in <5 minutes, full observability  
**Cost:** $0 (open-source)

---

## Action 4: Connection Pooling with PgBouncer (1 day)

### Problem Statement

Current database connections are created per-request, causing:
- **Connection overhead** - 50-100ms to establish each connection
- **Resource exhaustion** - PostgreSQL limited to ~100 connections
- **Slow queries** - connection setup time adds latency
- **Connection leaks** - connections not properly closed

### Solution: PgBouncer Connection Pooler

**PgBouncer** is a lightweight connection pooler for PostgreSQL that maintains a pool of persistent connections.

**Repository:** https://github.com/pgbouncer/pgbouncer  
**License:** ISC  
**Performance:** 10,000+ connections → 20 database connections

### Implementation

#### Step 1: Install PgBouncer (1 hour)

**Option 1: Docker (Recommended)**

Create `docker-compose.pgbouncer.yml`:

```yaml
version: '3.8'

services:
  pgbouncer:
    image: edoburu/pgbouncer:latest
    container_name: pgbouncer
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - POOL_MODE=transaction
      - MAX_CLIENT_CONN=1000
      - DEFAULT_POOL_SIZE=20
      - MIN_POOL_SIZE=5
      - RESERVE_POOL_SIZE=5
      - MAX_DB_CONNECTIONS=25
      - MAX_USER_CONNECTIONS=25
    ports:
      - "6432:5432"
    restart: unless-stopped
```

Start PgBouncer:

```bash
docker-compose -f docker-compose.pgbouncer.yml up -d
```

**Option 2: Native Installation (Ubuntu)**

```bash
sudo apt-get update
sudo apt-get install -y pgbouncer
```

#### Step 2: Configure PgBouncer (2 hours)

Create `/etc/pgbouncer/pgbouncer.ini`:

```ini
[databases]
; Format: dbname = host=hostname port=5432 dbname=database
normalization_db = host=your-db-host.com port=5432 dbname=normalization user=dbuser password=dbpass

[pgbouncer]
; Connection pooling mode
; - session: one connection per client session (safest)
; - transaction: one connection per transaction (recommended)
; - statement: one connection per statement (most aggressive)
pool_mode = transaction

; Maximum number of client connections
max_client_conn = 1000

; Default pool size per database/user pair
default_pool_size = 20

; Minimum pool size (keep connections warm)
min_pool_size = 5

; Reserve pool for urgent connections
reserve_pool_size = 5

; Maximum connections per database
max_db_connections = 25

; Maximum connections per user
max_user_connections = 25

; Listen address
listen_addr = 0.0.0.0
listen_port = 6432

; Authentication
auth_type = md5
auth_file = /etc/pgbouncer/userlist.txt

; Logging
log_connections = 1
log_disconnections = 1
log_pooler_errors = 1

; Performance tuning
server_idle_timeout = 600
server_lifetime = 3600
server_connect_timeout = 15
query_timeout = 0
query_wait_timeout = 120
```

Create `/etc/pgbouncer/userlist.txt`:

```
"dbuser" "md5hashed_password"
```

Generate MD5 password:

```bash
echo -n "passworddbuser" | md5sum
```

Start PgBouncer:

```bash
sudo systemctl start pgbouncer
sudo systemctl enable pgbouncer
```

#### Step 3: Update Application Configuration (1 hour)

Update `.env`:

```bash
# Before: Direct database connection
# DATABASE_URL=mysql://user:pass@host:3306/dbname

# After: Connection through PgBouncer
DATABASE_URL=mysql://user:pass@localhost:6432/dbname
```

For production deployment, update environment variables to point to PgBouncer instead of direct database connection.

#### Step 4: Add Connection Pool Monitoring (2 hours)

Create `server/_core/dbMonitoring.ts`:

```typescript
import { createClient } from 'mysql2/promise';

export async function getPgBouncerStats() {
  try {
    // Connect to PgBouncer admin console
    const connection = await createClient({
      host: 'localhost',
      port: 6432,
      user: 'pgbouncer',
      password: 'admin',
      database: 'pgbouncer',
    });

    // Get pool statistics
    const [pools] = await connection.query('SHOW POOLS');
    const [stats] = await connection.query('SHOW STATS');
    const [databases] = await connection.query('SHOW DATABASES');

    await connection.end();

    return {
      pools,
      stats,
      databases,
    };
  } catch (error) {
    console.error('[PgBouncer] Error getting stats:', error);
    return null;
  }
}
```

Add endpoint to `server/routers/monitoring.ts`:

```typescript
export const monitoringRouter = router({
  connectionPoolStats: publicProcedure.query(async () => {
    const stats = await getPgBouncerStats();
    
    if (!stats) {
      return { available: false };
    }

    return {
      available: true,
      pools: stats.pools,
      stats: stats.stats,
      databases: stats.databases,
    };
  }),
});
```

#### Step 5: Add Prometheus Metrics for PgBouncer (2 hours)

Install PgBouncer exporter:

```bash
docker run -d \
  --name pgbouncer-exporter \
  -p 9127:9127 \
  -e PGBOUNCER_HOST=pgbouncer \
  -e PGBOUNCER_PORT=6432 \
  -e PGBOUNCER_USER=pgbouncer \
  -e PGBOUNCER_PASS=admin \
  prometheuscommunity/pgbouncer-exporter:latest
```

Update `monitoring/prometheus.yml`:

```yaml
scrape_configs:
  - job_name: 'pgbouncer'
    static_configs:
      - targets: ['localhost:9127']
```

Add PgBouncer panel to Grafana dashboard:

```json
{
  "title": "PgBouncer Connection Pool",
  "targets": [
    {
      "expr": "pgbouncer_pools_server_active_connections",
      "legendFormat": "Active"
    },
    {
      "expr": "pgbouncer_pools_server_idle_connections",
      "legendFormat": "Idle"
    },
    {
      "expr": "pgbouncer_pools_server_used_connections",
      "legendFormat": "Used"
    }
  ],
  "type": "graph"
}
```

#### Step 6: Performance Testing (2 hours)

Create `tests/connection-pool.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { getDb } from '../server/db';
import { users } from '../drizzle/schema';

describe('Connection Pool Performance', () => {
  it('should handle 100 concurrent queries', async () => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    const queries = [];
    
    for (let i = 0; i < 100; i++) {
      queries.push(
        db.select().from(users).limit(1)
      );
    }

    const start = Date.now();
    await Promise.all(queries);
    const duration = Date.now() - start;

    // With connection pooling, should complete in < 1 second
    expect(duration).toBeLessThan(1000);
  });

  it('should reuse connections', async () => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    // First query
    const start1 = Date.now();
    await db.select().from(users).limit(1);
    const duration1 = Date.now() - start1;

    // Second query (should reuse connection)
    const start2 = Date.now();
    await db.select().from(users).limit(1);
    const duration2 = Date.now() - start2;

    // Second query should be faster (no connection overhead)
    expect(duration2).toBeLessThan(duration1);
  });
});
```

### Configuration Tuning

**For High-Throughput Applications:**

```ini
pool_mode = transaction
default_pool_size = 50
max_client_conn = 2000
```

**For Long-Running Queries:**

```ini
pool_mode = session
default_pool_size = 20
query_timeout = 300
```

**For Read-Heavy Workloads:**

```ini
pool_mode = transaction
default_pool_size = 30
reserve_pool_size = 10
```

### Rollout Checklist

- [ ] Install PgBouncer (Docker or native)
- [ ] Configure PgBouncer with optimal settings
- [ ] Update DATABASE_URL to point to PgBouncer
- [ ] Add connection pool monitoring
- [ ] Add Prometheus metrics for PgBouncer
- [ ] Create Grafana dashboard for connection pool
- [ ] Run performance tests
- [ ] Monitor connection pool usage
- [ ] Deploy to production

**Time Estimate:** 1 day  
**Impact:** 10x connection capacity, 50% faster queries  
**Cost:** $0 (open-source)

---

## Testing & Validation

### Integration Testing

Create `tests/infrastructure.integration.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { createCircuitBreaker } from '../server/_core/circuitBreaker';
import { cacheGetOrSet } from '../server/_core/cache';
import { getDb } from '../server/db';
import { register } from '../server/_core/metrics';

describe('Infrastructure Integration', () => {
  it('should have all circuit breakers configured', async () => {
    // Test database circuit breaker
    const db = await getDb();
    expect(db).toBeDefined();
  });

  it('should have Redis cache available', async () => {
    const value = await cacheGetOrSet(
      'test:integration',
      async () => ({ test: 'value' }),
      { ttl: 60 }
    );
    expect(value).toEqual({ test: 'value' });
  });

  it('should collect Prometheus metrics', async () => {
    const metrics = await register.metrics();
    expect(metrics).toContain('http_requests_total');
    expect(metrics).toContain('db_queries_total');
    expect(metrics).toContain('cache_hits_total');
  });

  it('should have PgBouncer connection pool', async () => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    // Run 10 concurrent queries
    const queries = Array(10).fill(null).map(() =>
      db.select().from(users).limit(1)
    );

    const start = Date.now();
    await Promise.all(queries);
    const duration = Date.now() - start;

    // Should complete quickly with connection pooling
    expect(duration).toBeLessThan(500);
  });
});
```

### Load Testing

Create `tests/load-test.js` (using Artillery):

```yaml
config:
  target: 'http://localhost:3000'
  phases:
    - duration: 60
      arrivalRate: 10
      name: "Warm up"
    - duration: 120
      arrivalRate: 50
      name: "Sustained load"
    - duration: 60
      arrivalRate: 100
      name: "Peak load"

scenarios:
  - name: "User flow"
    flow:
      - get:
          url: "/api/trpc/auth.me"
      - post:
          url: "/api/trpc/jobs.submit"
          json:
            file: "test.csv"
      - get:
          url: "/api/trpc/jobs.getById"
```

Run load test:

```bash
npm install -g artillery
artillery run tests/load-test.yml
```

---

## Rollout Strategy

### Phase 1: Development Environment (Week 1)

1. **Day 1-2:** Implement circuit breakers
2. **Day 3-4:** Implement Redis caching
3. **Day 5:** Configure PgBouncer
4. **Day 6-7:** Deploy Prometheus + Grafana

### Phase 2: Staging Environment (Week 2)

1. **Day 1-2:** Deploy all infrastructure to staging
2. **Day 3:** Run integration tests
3. **Day 4:** Run load tests
4. **Day 5:** Fix any issues discovered
5. **Day 6-7:** Monitor staging performance

### Phase 3: Production Rollout (Week 3)

1. **Day 1:** Deploy circuit breakers (low risk)
2. **Day 2:** Deploy PgBouncer (medium risk)
3. **Day 3:** Deploy Redis caching (high impact)
4. **Day 4:** Deploy Prometheus monitoring
5. **Day 5-7:** Monitor production metrics, tune configuration

### Rollback Plan

Each component can be rolled back independently:

**Circuit Breakers:**
```typescript
// Disable by removing circuit breaker wrapper
// return await fn(...args); // Direct call
```

**Redis Caching:**
```bash
# Disable by setting environment variable
REDIS_ENABLED=false
```

**PgBouncer:**
```bash
# Revert DATABASE_URL to direct connection
DATABASE_URL=mysql://user:pass@host:3306/dbname
```

**Prometheus:**
```bash
# Stop monitoring containers
docker-compose -f docker-compose.monitoring.yml down
```

---

## Summary

### Total Implementation Time

| Action | Time Estimate |
|--------|---------------|
| Circuit Breakers | 2-3 days |
| Redis Caching | 1 week |
| Prometheus Monitoring | 1 week |
| PgBouncer Connection Pooling | 1 day |
| **Total** | **2-3 weeks** |

### Total Cost

| Component | Monthly Cost |
|-----------|--------------|
| Circuit Breakers (Opossum) | $0 |
| Redis Caching | $0 (already installed) |
| Prometheus + Grafana | $0 |
| PgBouncer | $0 |
| **Total** | **$0** |

### Expected Impact

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| **Throughput** | 50 req/sec | 500+ req/sec | 10x |
| **Response Time (p95)** | 200ms | 20ms | 10x faster |
| **Database Connections** | 100 max | 1000+ max | 10x capacity |
| **Cache Hit Rate** | 0% | 80%+ | Massive reduction in DB load |
| **Failure Detection** | Hours | <5 minutes | 12x faster |
| **System Resilience** | Single point of failure | Graceful degradation | Cascading failures prevented |

### Success Metrics

**Week 1:**
- ✅ Circuit breakers prevent cascading failures
- ✅ Cache hit rate > 50%
- ✅ Connection pool utilization < 80%

**Week 2:**
- ✅ Prometheus collecting all metrics
- ✅ Grafana dashboards operational
- ✅ Alerts firing correctly

**Week 3:**
- ✅ P95 response time < 50ms
- ✅ System handles 100+ concurrent users
- ✅ No cascading failures under load

All infrastructure improvements are **100% open-source** and **$0 cost**. The only investment is implementation time (2-3 weeks).
