import { Gauge, Counter, Histogram, Registry } from 'prom-client';

// Create a separate registry for connection pool metrics
export const connectionPoolRegistry = new Registry();

/**
 * Connection Pool Gauges
 * These track the current state of the connection pool
 */
export const connectionPoolActiveGauge = new Gauge({
  name: 'connection_pool_active_connections',
  help: 'Number of active connections in the pool',
  registers: [connectionPoolRegistry],
});

export const connectionPoolIdleGauge = new Gauge({
  name: 'connection_pool_idle_connections',
  help: 'Number of idle connections in the pool',
  registers: [connectionPoolRegistry],
});

export const connectionPoolWaitingGauge = new Gauge({
  name: 'connection_pool_waiting_clients',
  help: 'Number of requests waiting for a connection',
  registers: [connectionPoolRegistry],
});

export const connectionPoolUtilizationGauge = new Gauge({
  name: 'connection_pool_utilization_percent',
  help: 'Percentage of connection pool being utilized',
  registers: [connectionPoolRegistry],
});

/**
 * Connection Pool Counters
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
 */
export const connectionPoolQueryDurationHistogram = new Histogram({
  name: 'connection_pool_query_duration_seconds',
  help: 'Duration of queries through the connection pool',
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5, 10],
  registers: [connectionPoolRegistry],
});

/**
 * Update connection pool metrics
 * 
 * Note: PgBouncer monitoring has been removed. Metrics are now stub values.
 */
export async function updateConnectionPoolMetrics(): Promise<void> {
  // Stub implementation - metrics collection removed with PgBouncer
  connectionPoolActiveGauge.set(0);
  connectionPoolIdleGauge.set(0);
  connectionPoolWaitingGauge.set(0);
  connectionPoolUtilizationGauge.set(0);
}

/**
 * Start periodic metric collection
 * 
 * Note: This is now a no-op since PgBouncer monitoring was removed
 */
export function startConnectionPoolMetricsCollection(intervalMs: number = 15000): NodeJS.Timeout {
  console.info(`[Metrics] Connection pool metrics collection disabled (PgBouncer removed)`);
  
  // Return a dummy interval that does nothing
  return setInterval(() => {
    // No-op
  }, intervalMs);
}

/**
 * Record a database query for metrics
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
  await updateConnectionPoolMetrics();
  return connectionPoolRegistry.metrics();
}
