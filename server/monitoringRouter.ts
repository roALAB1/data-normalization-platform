import { publicProcedure, router } from './_core/trpc';
import { 
  getConnectionPoolHealth, 
  isConnectionPoolAvailable 
} from './_core/dbMonitoring';
import { getConnectionPoolMetricsText } from './_core/connectionPoolMetrics';

/**
 * Monitoring Router
 * 
 * Provides endpoints for monitoring connection pool health and statistics.
 * Note: PgBouncer support has been removed as it was not configured.
 */
export const monitoringRouter = router({
  /**
   * Check if connection pool is available and responding
   */
  connectionPoolAvailable: publicProcedure.query(async () => {
    const available = await isConnectionPoolAvailable();
    return {
      available,
      message: available 
        ? 'Connection pool is healthy' 
        : 'Connection pool is not available',
    };
  }),

  /**
   * Get connection pool statistics
   * 
   * Note: PgBouncer monitoring has been removed. Returns basic status.
   */
  connectionPoolStats: publicProcedure.query(async () => {
    return {
      available: true,
      message: 'PgBouncer monitoring removed - using database connection pool',
      stats: {
        poolSize: 20,
        note: 'Detailed metrics unavailable (PgBouncer removed)',
      },
    };
  }),

  /**
   * Get connection pool health status
   */
  connectionPoolHealth: publicProcedure.query(async () => {
    const health = await getConnectionPoolHealth();
    return health;
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
});
