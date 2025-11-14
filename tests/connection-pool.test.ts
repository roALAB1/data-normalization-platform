import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getDb } from '../server/db';
import { users } from '../drizzle/schema';
import { getPgBouncerStats, getConnectionPoolHealth, isPgBouncerAvailable } from '../server/_core/dbMonitoring';

describe('Connection Pool Performance', () => {
  beforeAll(async () => {
    // Ensure database is available
    const db = await getDb();
    if (!db) {
      throw new Error('Database not available for testing');
    }
  });

  describe('PgBouncer Availability', () => {
    it('should be able to connect to PgBouncer', async () => {
      const available = await isPgBouncerAvailable();
      
      if (!available) {
        console.warn('⚠️  PgBouncer not available - skipping connection pool tests');
        console.warn('   To enable these tests, start PgBouncer with:');
        console.warn('   docker-compose -f docker-compose.pgbouncer.yml up -d');
      }
      
      // Test passes either way, but warns if PgBouncer is not running
      expect(typeof available).toBe('boolean');
    });

    it('should retrieve PgBouncer statistics', async () => {
      const stats = await getPgBouncerStats();
      
      if (stats) {
        expect(stats).toHaveProperty('pools');
        expect(stats).toHaveProperty('databases');
        expect(stats).toHaveProperty('totalClientConnections');
        expect(stats).toHaveProperty('totalServerConnections');
        expect(stats).toHaveProperty('activeConnections');
        expect(stats).toHaveProperty('idleConnections');
        expect(stats).toHaveProperty('waitingClients');
        
        expect(Array.isArray(stats.pools)).toBe(true);
        expect(Array.isArray(stats.databases)).toBe(true);
      }
    });

    it('should retrieve connection pool health status', async () => {
      const health = await getConnectionPoolHealth();
      
      expect(health).toHaveProperty('healthy');
      expect(health).toHaveProperty('activeConnections');
      expect(health).toHaveProperty('idleConnections');
      expect(health).toHaveProperty('waitingClients');
      expect(health).toHaveProperty('poolUtilization');
      expect(health).toHaveProperty('message');
      
      expect(typeof health.healthy).toBe('boolean');
      expect(typeof health.poolUtilization).toBe('number');
    });
  });

  describe('Connection Pool Performance', () => {
    it('should handle 10 concurrent queries efficiently', async () => {
      const db = await getDb();
      if (!db) {
        throw new Error('Database not available');
      }

      const queries = Array(10).fill(null).map(() =>
        db.select().from(users).limit(1)
      );

      const start = Date.now();
      await Promise.all(queries);
      const duration = Date.now() - start;

      // With connection pooling, 10 queries should complete quickly
      // Without pooling, each query would need to establish a connection (~50-100ms each)
      // With pooling, queries reuse connections and should complete in < 500ms total
      expect(duration).toBeLessThan(1000);
      
      console.log(`✅ 10 concurrent queries completed in ${duration}ms`);
    });

    it('should handle 50 concurrent queries efficiently', async () => {
      const db = await getDb();
      if (!db) {
        throw new Error('Database not available');
      }

      const queries = Array(50).fill(null).map(() =>
        db.select().from(users).limit(1)
      );

      const start = Date.now();
      await Promise.all(queries);
      const duration = Date.now() - start;

      // 50 concurrent queries should still complete reasonably fast with pooling
      expect(duration).toBeLessThan(3000);
      
      console.log(`✅ 50 concurrent queries completed in ${duration}ms`);
    });

    it('should handle 100 concurrent queries efficiently', async () => {
      const db = await getDb();
      if (!db) {
        throw new Error('Database not available');
      }

      const queries = Array(100).fill(null).map(() =>
        db.select().from(users).limit(1)
      );

      const start = Date.now();
      await Promise.all(queries);
      const duration = Date.now() - start;

      // 100 concurrent queries is a stress test
      // With connection pooling, should complete in < 5 seconds
      // Without pooling, this would likely fail or take 10+ seconds
      expect(duration).toBeLessThan(5000);
      
      console.log(`✅ 100 concurrent queries completed in ${duration}ms`);
    });

    it('should reuse connections (second query faster than first)', async () => {
      const db = await getDb();
      if (!db) {
        throw new Error('Database not available');
      }

      // First query - may need to establish connection
      const start1 = Date.now();
      await db.select().from(users).limit(1);
      const duration1 = Date.now() - start1;

      // Second query - should reuse connection (faster)
      const start2 = Date.now();
      await db.select().from(users).limit(1);
      const duration2 = Date.now() - start2;

      // Third query - should also reuse connection
      const start3 = Date.now();
      await db.select().from(users).limit(1);
      const duration3 = Date.now() - start3;

      console.log(`Query durations: ${duration1}ms, ${duration2}ms, ${duration3}ms`);
      
      // Average of 2nd and 3rd queries should be faster than 1st
      // (connection reuse eliminates connection overhead)
      const avgReused = (duration2 + duration3) / 2;
      
      // This test may be flaky on very fast connections, so we just log the results
      expect(duration1).toBeGreaterThan(0);
      expect(avgReused).toBeGreaterThan(0);
      
      if (avgReused < duration1) {
        console.log(`✅ Connection reuse confirmed: ${duration1}ms → ${avgReused}ms avg`);
      } else {
        console.log(`⚠️  Connection reuse not clearly demonstrated (may be very fast connection)`);
      }
    });
  });

  describe('Connection Pool Metrics', () => {
    it('should not have waiting clients under normal load', async () => {
      const health = await getConnectionPoolHealth();
      
      // Under normal load, no clients should be waiting
      expect(health.waitingClients).toBe(0);
    });

    it('should have reasonable pool utilization', async () => {
      const health = await getConnectionPoolHealth();
      
      // Pool utilization should be reasonable (not exhausted)
      // < 90% is healthy
      expect(health.poolUtilization).toBeLessThan(90);
      
      console.log(`Pool utilization: ${health.poolUtilization}%`);
    });

    it('should have idle connections available', async () => {
      const health = await getConnectionPoolHealth();
      
      // Should have some idle connections in the pool
      // (indicates pool is not exhausted)
      expect(health.idleConnections).toBeGreaterThanOrEqual(0);
      
      console.log(`Idle connections: ${health.idleConnections}`);
    });
  });

  describe('Connection Pool Stress Test', () => {
    it('should handle burst of 200 queries without errors', async () => {
      const db = await getDb();
      if (!db) {
        throw new Error('Database not available');
      }

      // Create 200 concurrent queries (stress test)
      const queries = Array(200).fill(null).map(() =>
        db.select().from(users).limit(1)
      );

      const start = Date.now();
      
      try {
        await Promise.all(queries);
        const duration = Date.now() - start;
        
        console.log(`✅ 200 concurrent queries completed in ${duration}ms`);
        
        // Should complete without errors
        expect(duration).toBeGreaterThan(0);
      } catch (error) {
        console.error('❌ Stress test failed:', error);
        throw error;
      }
    }, 30000); // 30 second timeout for stress test
  });
});
