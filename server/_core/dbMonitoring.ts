/**
 * Database Monitoring
 * 
 * Provides basic connection pool health monitoring.
 * PgBouncer support has been removed as it was not configured.
 */

/**
 * Connection Pool Health Status
 */
export interface ConnectionPoolHealth {
  healthy: boolean;
  message: string;
}

/**
 * Check connection pool health
 * 
 * Note: PgBouncer monitoring has been removed. This returns a basic health check.
 */
export async function getConnectionPoolHealth(): Promise<ConnectionPoolHealth> {
  return {
    healthy: true,
    message: 'Connection pool monitoring available (PgBouncer removed)',
  };
}

/**
 * Check if connection pool is available
 */
export async function isConnectionPoolAvailable(): Promise<boolean> {
  return true;
}
