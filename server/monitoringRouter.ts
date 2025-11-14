import { publicProcedure, router } from './_core/trpc';
import { z } from 'zod';
import { 
  getPgBouncerStats, 
  getConnectionPoolHealth as getPgBouncerHealth, 
  isPgBouncerAvailable 
} from './_core/dbMonitoring';
import { getConnectionPoolMetricsText } from './_core/connectionPoolMetrics';
import { checkPoolHealth, getPoolStats } from './_core/connectionPool';
import { circuitBreakerRegistry, getCircuitBreakerStats } from './_core/circuitBreaker';
import { checkDatabaseHealth, getDatabaseCircuitStatus } from './_core/dbCircuitBreaker';
import { checkRedisHealth, getServiceCircuitStatuses } from './_core/serviceCircuitBreakers';
import { cacheStats, cacheClear, cacheDeletePattern } from './_core/cache';

/**
 * Monitoring Router
 * 
 * Provides endpoints for monitoring PgBouncer connection pool health and statistics
 */
export const monitoringRouter = router({
  /**
   * Check if PgBouncer is available and responding
   */
  pgbouncerAvailable: publicProcedure.query(async () => {
    const available = await isPgBouncerAvailable();
    return {
      available,
      message: available 
        ? 'PgBouncer is running and responding' 
        : 'PgBouncer is not available',
    };
  }),

  /**
   * Get comprehensive PgBouncer statistics
   * 
   * Returns detailed pool and database statistics including:
   * - Active/idle/waiting connections
   * - Pool utilization
   * - Database connection info
   */
  connectionPoolStats: publicProcedure.query(async () => {
    const stats = await getPgBouncerStats();
    
    if (!stats) {
      return {
        available: false,
        message: 'PgBouncer statistics unavailable',
      };
    }

    return {
      available: true,
      stats: {
        totalClientConnections: stats.totalClientConnections,
        totalServerConnections: stats.totalServerConnections,
        activeConnections: stats.activeConnections,
        idleConnections: stats.idleConnections,
        waitingClients: stats.waitingClients,
        pools: stats.pools.map(pool => ({
          database: pool.database,
          user: pool.user,
          clientActive: pool.cl_active,
          clientWaiting: pool.cl_waiting,
          serverActive: pool.sv_active,
          serverIdle: pool.sv_idle,
          poolMode: pool.pool_mode,
          maxWait: pool.maxwait,
        })),
        databases: stats.databases.map(db => ({
          name: db.name,
          host: db.host,
          port: db.port,
          poolSize: db.pool_size,
          reservePool: db.reserve_pool,
          poolMode: db.pool_mode,
          maxConnections: db.max_connections,
          currentConnections: db.current_connections,
        })),
      },
    };
  }),

  /**
   * Get connection pool health status
   * 
   * Returns simplified health check with:
   * - Overall health status (healthy/unhealthy)
   * - Key metrics (active, idle, waiting)
   * - Pool utilization percentage
   * - Health message
   * 
   * Now uses application-level connection pool (MySQL2)
   */
  connectionPoolHealth: publicProcedure.query(async () => {
    // Try application-level pool first
    const appPoolHealth = await checkPoolHealth();
    if (appPoolHealth.stats) {
      return {
        healthy: appPoolHealth.healthy,
        activeConnections: appPoolHealth.stats.activeConnections,
        idleConnections: appPoolHealth.stats.idleConnections,
        waitingClients: appPoolHealth.stats.queuedRequests,
        poolUtilization: (appPoolHealth.stats.activeConnections / (appPoolHealth.stats.config.connectionLimit || 20)) * 100,
        message: appPoolHealth.message,
        poolType: 'application' as const,
      };
    }

    // Fallback to PgBouncer if available
    const pgBouncerHealth = await getPgBouncerHealth();
    return {
      ...pgBouncerHealth,
      poolType: 'pgbouncer' as const,
    };
  }),

  /**
   * Get Prometheus metrics for connection pool
   * 
   * Returns metrics in Prometheus text format for scraping
   */
  connectionPoolMetrics: publicProcedure.query(async () => {
    const metrics = await getConnectionPoolMetricsText();
    return {
      metrics,
      contentType: 'text/plain; version=0.0.4',
    };
  }),

  /**
   * Get all circuit breaker statuses
   * 
   * Returns state and statistics for all registered circuit breakers
   */
  circuitBreakerStats: publicProcedure.query(async () => {
    const allStats = circuitBreakerRegistry.getAllStats();
    return {
      breakers: allStats,
      count: allStats.length,
    };
  }),

  /**
   * Get circuit breaker health status
   * 
   * Returns health status for database and service circuit breakers
   */
  circuitBreakerHealth: publicProcedure.query(async () => {
    const [dbHealthy, redisHealthy] = await Promise.all([
      checkDatabaseHealth(),
      checkRedisHealth(),
    ]);

    const dbStatus = getDatabaseCircuitStatus();
    const serviceStatuses = getServiceCircuitStatuses();

    return {
      database: {
        healthy: dbHealthy,
        ...dbStatus,
      },
      redis: {
        healthy: redisHealthy,
        ...serviceStatuses.redis,
      },
      overall: dbHealthy && redisHealthy,
    };
  }),

  /**
   * Get cache statistics
   * 
   * Returns cache hit rate, hits, misses, and other metrics
   */
  cacheStats: publicProcedure.query(async () => {
    const stats = cacheStats.getStats();
    return {
      ...stats,
      hitRateFormatted: `${stats.hitRate.toFixed(2)}%`,
    };
  }),

  /**
   * Clear all cache (admin only)
   * 
   * Clears all cached data - use with caution
   */
  cacheClear: publicProcedure.mutation(async () => {
    await cacheClear();
    cacheStats.reset();
    return {
      success: true,
      message: 'Cache cleared successfully',
    };
  }),

  /**
   * Clear cache by pattern
   * 
   * Clears cache entries matching a pattern (e.g., "user:*")
   */
  cacheClearPattern: publicProcedure
    .input(z.object({
      pattern: z.string(),
    }))
    .mutation(async ({ input }) => {
      const deleted = await cacheDeletePattern(input.pattern);
      return {
        success: true,
        deleted,
        message: `Cleared ${deleted} cache entries matching pattern: ${input.pattern}`,
      };
    }),
});
