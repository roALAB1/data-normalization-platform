import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  cacheGet,
  cacheSet,
  cacheDelete,
  cacheGetOrSet,
  cacheExists,
  cacheTTL,
  cacheStats,
  generateCacheKey,
  CACHE_CONFIG,
} from '../server/_core/cache';

describe('Redis Cache Layer', () => {
  beforeAll(async () => {
    // Reset stats before tests
    cacheStats.reset();
  });

  afterAll(async () => {
    // Clean up test keys
    await cacheDelete('test:key');
    await cacheDelete('test:user:123');
  });

  it('should set and get a value', async () => {
    const key = 'test:key';
    const value = { name: 'John Doe', age: 30 };

    await cacheSet(key, value, 60);
    const cached = await cacheGet(key);

    expect(cached).toEqual(value);
  });

  it('should return null for non-existent key', async () => {
    const cached = await cacheGet('test:nonexistent');
    expect(cached).toBeNull();
  });

  it('should delete a key', async () => {
    const key = 'test:delete';
    await cacheSet(key, { data: 'test' }, 60);

    await cacheDelete(key);
    const cached = await cacheGet(key);

    expect(cached).toBeNull();
  });

  it('should check if key exists', async () => {
    const key = 'test:exists';
    await cacheSet(key, { data: 'test' }, 60);

    const exists = await cacheExists(key);
    expect(exists).toBe(true);

    await cacheDelete(key);
    const notExists = await cacheExists(key);
    expect(notExists).toBe(false);
  });

  it('should get TTL for a key', async () => {
    const key = 'test:ttl';
    await cacheSet(key, { data: 'test' }, 120);

    const ttl = await cacheTTL(key);
    expect(ttl).toBeGreaterThan(0);
    expect(ttl).toBeLessThanOrEqual(120);

    await cacheDelete(key);
  });

  it('should use cache-aside pattern (cache miss)', async () => {
    const key = 'test:cache-aside-miss';
    let fallbackCalled = false;

    const value = await cacheGetOrSet(key, 60, async () => {
      fallbackCalled = true;
      return { data: 'from-fallback' };
    });

    expect(fallbackCalled).toBe(true);
    expect(value).toEqual({ data: 'from-fallback' });

    // Verify it's now cached
    const cached = await cacheGet(key);
    expect(cached).toEqual({ data: 'from-fallback' });

    await cacheDelete(key);
  });

  it('should use cache-aside pattern (cache hit)', async () => {
    const key = 'test:cache-aside-hit';

    // Pre-populate cache
    await cacheSet(key, { data: 'from-cache' }, 60);

    let fallbackCalled = false;
    const value = await cacheGetOrSet(key, 60, async () => {
      fallbackCalled = true;
      return { data: 'from-fallback' };
    });

    expect(fallbackCalled).toBe(false);
    expect(value).toEqual({ data: 'from-cache' });

    await cacheDelete(key);
  });

  it('should generate cache keys correctly', () => {
    const userKey = generateCacheKey(CACHE_CONFIG.users.keyPrefix, 123);
    expect(userKey).toBe('user:123');

    const jobKey = generateCacheKey(CACHE_CONFIG.jobs.keyPrefix, 456);
    expect(jobKey).toBe('job:456');
  });

  it('should track cache statistics', async () => {
    cacheStats.reset();

    // Cache miss - first call
    await cacheGetOrSet('test:stats-1', 60, async () => ({ data: 'test1' }));

    // Cache hit - second call to same key
    await cacheGetOrSet('test:stats-1', 60, async () => ({ data: 'test1' }));

    // Cache miss - different key
    await cacheGetOrSet('test:stats-2', 60, async () => ({ data: 'test2' }));

    const stats = cacheStats.getStats();
    // Should have at least 1 hit and 2 misses
    expect(stats.hits + stats.misses).toBeGreaterThanOrEqual(3);
    expect(stats.sets).toBeGreaterThanOrEqual(2);

    await cacheDelete('test:stats-1');
    await cacheDelete('test:stats-2');
  });

  it('should handle cache hit rate calculation', async () => {
    cacheStats.reset();

    // 1 miss
    await cacheGetOrSet('test:hitrate-1', 60, async () => ({ data: 'test' }));

    // 3 hits
    await cacheGetOrSet('test:hitrate-1', 60, async () => ({ data: 'test' }));
    await cacheGetOrSet('test:hitrate-1', 60, async () => ({ data: 'test' }));
    await cacheGetOrSet('test:hitrate-1', 60, async () => ({ data: 'test' }));

    const stats = cacheStats.getStats();
    expect(stats.hitRate).toBeGreaterThan(50); // 3 hits out of 4 total = 75%

    await cacheDelete('test:hitrate-1');
  });

  it('should handle concurrent cache operations', async () => {
    const key = 'test:concurrent';
    const promises = [];

    // 10 concurrent cache operations
    for (let i = 0; i < 10; i++) {
      promises.push(
        cacheGetOrSet(key, 60, async () => {
          // Simulate async operation
          await new Promise(resolve => setTimeout(resolve, 10));
          return { data: 'concurrent', index: i };
        })
      );
    }

    const results = await Promise.all(promises);

    // All should return the same cached value (first one to complete)
    expect(results.length).toBe(10);
    expect(results[0]).toHaveProperty('data');

    await cacheDelete(key);
  });
});
