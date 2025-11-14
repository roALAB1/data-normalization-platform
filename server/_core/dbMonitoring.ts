import { createConnection } from 'mysql2/promise';

/**
 * PgBouncer Statistics Interface
 */
export interface PgBouncerPoolStats {
  database: string;
  user: string;
  cl_active: number; // Active client connections
  cl_waiting: number; // Client connections waiting for a server connection
  sv_active: number; // Active server connections
  sv_idle: number; // Idle server connections
  sv_used: number; // Server connections that have been idle more than server_check_delay
  sv_tested: number; // Server connections currently being tested
  sv_login: number; // Server connections currently logging in
  maxwait: number; // How long the first client in queue has waited (seconds)
  maxwait_us: number; // Microsecond part of the maximum waiting time
  pool_mode: string; // Pooling mode (session, transaction, statement)
}

export interface PgBouncerDatabaseStats {
  name: string;
  host: string;
  port: number;
  database: string;
  force_user: string | null;
  pool_size: number;
  reserve_pool: number;
  pool_mode: string;
  max_connections: number;
  current_connections: number;
  paused: number;
  disabled: number;
}

export interface PgBouncerStats {
  pools: PgBouncerPoolStats[];
  databases: PgBouncerDatabaseStats[];
  totalClientConnections: number;
  totalServerConnections: number;
  activeConnections: number;
  idleConnections: number;
  waitingClients: number;
}

/**
 * Get comprehensive PgBouncer statistics
 * 
 * Connects to PgBouncer's admin console to retrieve pool and database statistics.
 * This is useful for monitoring connection pool health and performance.
 */
export async function getPgBouncerStats(): Promise<PgBouncerStats | null> {
  let connection;
  
  try {
    // Connect to PgBouncer admin console
    // Note: This requires PgBouncer to be configured with admin access
    connection = await createConnection({
      host: process.env.PGBOUNCER_HOST || 'localhost',
      port: parseInt(process.env.PGBOUNCER_PORT || '6432'),
      user: process.env.PGBOUNCER_ADMIN_USER || 'pgbouncer',
      password: process.env.PGBOUNCER_ADMIN_PASSWORD || '',
      database: 'pgbouncer',
    });

    // Get pool statistics
    const [poolRows] = await connection.query('SHOW POOLS');
    const pools = poolRows as PgBouncerPoolStats[];

    // Get database statistics
    const [dbRows] = await connection.query('SHOW DATABASES');
    const databases = dbRows as PgBouncerDatabaseStats[];

    // Calculate aggregate statistics
    const totalClientConnections = pools.reduce((sum, pool) => sum + pool.cl_active + pool.cl_waiting, 0);
    const totalServerConnections = pools.reduce((sum, pool) => sum + pool.sv_active + pool.sv_idle + pool.sv_used, 0);
    const activeConnections = pools.reduce((sum, pool) => sum + pool.sv_active, 0);
    const idleConnections = pools.reduce((sum, pool) => sum + pool.sv_idle, 0);
    const waitingClients = pools.reduce((sum, pool) => sum + pool.cl_waiting, 0);

    return {
      pools,
      databases,
      totalClientConnections,
      totalServerConnections,
      activeConnections,
      idleConnections,
      waitingClients,
    };
  } catch (error) {
    console.error('[PgBouncer] Error getting statistics:', error);
    return null;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

/**
 * Get simplified connection pool health status
 */
export async function getConnectionPoolHealth(): Promise<{
  healthy: boolean;
  activeConnections: number;
  idleConnections: number;
  waitingClients: number;
  poolUtilization: number; // Percentage of pool being used
  message: string;
}> {
  const stats = await getPgBouncerStats();

  if (!stats) {
    return {
      healthy: false,
      activeConnections: 0,
      idleConnections: 0,
      waitingClients: 0,
      poolUtilization: 0,
      message: 'PgBouncer statistics unavailable',
    };
  }

  const poolSize = parseInt(process.env.DEFAULT_POOL_SIZE || '20');
  const poolUtilization = (stats.activeConnections / poolSize) * 100;

  // Health criteria:
  // - Pool utilization < 90% (not exhausted)
  // - No waiting clients (no connection starvation)
  const healthy = poolUtilization < 90 && stats.waitingClients === 0;

  let message = 'Connection pool healthy';
  if (poolUtilization >= 90) {
    message = 'Warning: Connection pool near capacity';
  }
  if (stats.waitingClients > 0) {
    message = `Warning: ${stats.waitingClients} clients waiting for connections`;
  }

  return {
    healthy,
    activeConnections: stats.activeConnections,
    idleConnections: stats.idleConnections,
    waitingClients: stats.waitingClients,
    poolUtilization: Math.round(poolUtilization * 100) / 100,
    message,
  };
}

/**
 * Check if PgBouncer is available and responding
 */
export async function isPgBouncerAvailable(): Promise<boolean> {
  try {
    const stats = await getPgBouncerStats();
    return stats !== null;
  } catch (error) {
    return false;
  }
}
