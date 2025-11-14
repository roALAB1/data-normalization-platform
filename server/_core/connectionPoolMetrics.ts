import { Gauge, Counter, Histogram, Registry } from 'prom-client';
import { getPgBouncerStats, getConnectionPoolHealth } from './dbMonitoring';

// Create a separate registry for connection pool metrics
export const connectionPoolRegistry = new Registry();

/**
 * Connection Pool Gauges
 * These track the current state of the connection pool
 */
export const connectionPoolActiveGauge = new Gauge({
  name: 'connection_pool_active_connections',
  help: 'Number of active server connections in the pool',
  registers: [connectionPoolRegistry],
});

export const connectionPoolIdleGauge = new Gauge({
  name: 'connection_pool_idle_connections',
  help: 'Number of idle server connections in the pool',
  registers: [connectionPoolRegistry],
});

export const connectionPoolWaitingGauge = new Gauge({
  name: 'connection_pool_waiting_clients',
  help: 'Number of clients waiting for a connection',
  registers: [connectionPoolRegistry],
});

export const connectionPoolUtilizationGauge = new Gauge({
  name: 'connection_pool_utilization_percent',
  help: 'Percentage of connection pool being utilized',
  registers: [connectionPoolRegistry],
});

export const connectionPoolClientConnectionsGauge = new Gauge({
  name: 'connection_pool_client_connections_total',
  help: 'Total number of client connections',
  registers: [connectionPoolRegistry],
});

export const connectionPoolServerConnectionsGauge = new Gauge({
  name: 'connection_pool_server_connections_total',
  help: 'Total number of server connections',
  registers: [connectionPoolRegistry],
});

/**
 * Connection Pool Counters
 * These track cumulative events over time
 */
export const connectionPoolQueriesTotal = new Counter({
  name: 'connection_pool_queries_total',
  help: 'Total number of queries processed through the pool',
  labelNames: ['status'],
  registers: [connectionPoolRegistry],
});

export const connectionPoolErrorsTotal = new Counter({
  name: 'connection_pool_errors_total',
  help: 'Total number of connection pool errors',
  labelNames: ['error_type'],
  registers: [connectionPoolRegistry],
});

/**
 * Connection Pool Histograms
 * These track distributions of values over time
 */
export const connectionPoolWaitTimeHistogram = new Histogram({
  name: 'connection_pool_wait_time_seconds',
  help: 'Time clients spend waiting for a connection',
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5],
  registers: [connectionPoolRegistry],
});

export const connectionPoolQueryDurationHistogram = new Histogram({
  name: 'connection_pool_query_duration_seconds',
  help: 'Duration of queries through the connection pool',
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5, 10],
  registers: [connectionPoolRegistry],
});

/**
 * Update connection pool metrics from PgBouncer stats
 * 
 * This should be called periodically (e.g., every 15 seconds) to keep metrics up-to-date
 */
export async function updateConnectionPoolMetrics(): Promise<void> {
  try {
    const stats = await getPgBouncerStats();
    
    if (!stats) {
      console.warn('[Metrics] PgBouncer stats unavailable, skipping metric update');
      return;
    }

    // Update gauges
    connectionPoolActiveGauge.set(stats.activeConnections);
    connectionPoolIdleGauge.set(stats.idleConnections);
    connectionPoolWaitingGauge.set(stats.waitingClients);
    connectionPoolClientConnectionsGauge.set(stats.totalClientConnections);
    connectionPoolServerConnectionsGauge.set(stats.totalServerConnections);

    // Calculate pool utilization
    const poolSize = parseInt(process.env.DEFAULT_POOL_SIZE || '20');
    const utilization = (stats.activeConnections / poolSize) * 100;
    connectionPoolUtilizationGauge.set(utilization);

    // Record wait times from pool stats
    stats.pools.forEach(pool => {
      if (pool.maxwait > 0) {
        connectionPoolWaitTimeHistogram.observe(pool.maxwait);
      }
    });

  } catch (error) {
    console.error('[Metrics] Error updating connection pool metrics:', error);
    connectionPoolErrorsTotal.inc({ error_type: 'metric_update_failed' });
  }
}

/**
 * Start periodic metric collection
 * 
 * @param intervalMs - How often to collect metrics (default: 15 seconds)
 */
export function startConnectionPoolMetricsCollection(intervalMs: number = 15000): NodeJS.Timeout {
  console.info(`[Metrics] Starting connection pool metrics collection (every ${intervalMs}ms)`);
  
  // Update immediately on start
  updateConnectionPoolMetrics();
  
  // Then update periodically
  return setInterval(() => {
    updateConnectionPoolMetrics();
  }, intervalMs);
}

/**
 * Record a database query for metrics
 * 
 * @param duration - Query duration in milliseconds
 * @param success - Whether the query succeeded
 */
export function recordDatabaseQuery(duration: number, success: boolean): void {
  const durationSeconds = duration / 1000;
  
  connectionPoolQueryDurationHistogram.observe(durationSeconds);
  connectionPoolQueriesTotal.inc({ status: success ? 'success' : 'error' });
  
  if (!success) {
    connectionPoolErrorsTotal.inc({ error_type: 'query_failed' });
  }
}

/**
 * Get connection pool metrics in Prometheus format
 */
export async function getConnectionPoolMetricsText(): Promise<string> {
  // Update metrics before returning
  await updateConnectionPoolMetrics();
  
  return connectionPoolRegistry.metrics();
}
