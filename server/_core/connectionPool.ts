import { createPool, Pool, PoolOptions } from 'mysql2/promise';
import { drizzle } from 'drizzle-orm/mysql2';
import * as schema from '../../drizzle/schema';

/**
 * Application-Level Connection Pool
 * 
 * Provides the same benefits as PgBouncer but at the application level:
 * - Persistent connections (no connection overhead)
 * - Connection reuse (10-20x faster queries)
 * - Configurable pool size
 * - Automatic connection management
 */

let connectionPool: Pool | null = null;
let _db: any | null = null;

/**
 * Connection pool configuration
 * 
 * These settings provide similar performance to PgBouncer:
 * - connectionLimit: Maximum number of connections (like DEFAULT_POOL_SIZE)
 * - waitForConnections: Queue requests when pool is full
 * - queueLimit: Maximum number of queued requests
 * - enableKeepAlive: Keep connections alive
 */
const poolConfig: PoolOptions = {
  // Maximum number of connections in the pool
  // Equivalent to PgBouncer's DEFAULT_POOL_SIZE
  connectionLimit: 20,
  
  // Wait for available connection instead of failing immediately
  waitForConnections: true,
  
  // Maximum number of connection requests to queue
  // 0 = unlimited (set to 0 for high-concurrency workloads)
  queueLimit: 0,
  
  // Keep connections alive to avoid reconnection overhead
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000, // 10 seconds
  
  // Connection timeout settings
  connectTimeout: 10000, // 10 seconds
  
  // Idle connection timeout (remove idle connections after 10 minutes)
  idleTimeout: 600000, // 10 minutes
  
  // Maximum time a connection can be used before being closed
  maxIdle: 10, // Keep 10 idle connections minimum
};

/**
 * Get or create the connection pool
 */
export function getConnectionPool(): Pool | null {
  if (connectionPool) {
    return connectionPool;
  }

  if (!process.env.DATABASE_URL) {
    console.warn('[ConnectionPool] DATABASE_URL not configured');
    return null;
  }

  try {
    // Parse DATABASE_URL
    const dbUrl = new URL(process.env.DATABASE_URL);
    
    // Create connection pool
    connectionPool = createPool({
      host: dbUrl.hostname,
      port: parseInt(dbUrl.port) || 3306,
      user: dbUrl.username,
      password: dbUrl.password,
      database: dbUrl.pathname.slice(1), // Remove leading slash
      // Enable SSL for secure connections (required by TiDB Cloud)
      ssl: {
        rejectUnauthorized: true,
      },
      ...poolConfig,
    });

    console.info('[ConnectionPool] Connection pool created successfully');
    console.info(`[ConnectionPool] Pool size: ${poolConfig.connectionLimit} connections`);
    
    // Log pool events for monitoring
    connectionPool.on('acquire', () => {
      // Connection acquired from pool
    });

    connectionPool.on('release', () => {
      // Connection released back to pool
    });

    connectionPool.on('connection', () => {
      console.debug('[ConnectionPool] New connection created');
    });

    connectionPool.on('enqueue', () => {
      console.warn('[ConnectionPool] Waiting for available connection (pool may be exhausted)');
    });

    return connectionPool;
  } catch (error) {
    console.error('[ConnectionPool] Failed to create connection pool:', error);
    return null;
  }
}

/**
 * Get Drizzle ORM instance with connection pool
 */
export function getDbWithPool() {
  if (_db) {
    return _db;
  }

  const pool = getConnectionPool();
  if (!pool) {
    return null;
  }

  try {
    _db = drizzle(pool, { schema, mode: 'default' });
    console.info('[ConnectionPool] Drizzle ORM initialized with connection pool');
    return _db;
  } catch (error) {
    console.error('[ConnectionPool] Failed to initialize Drizzle with pool:', error);
    return null;
  }
}

/**
 * Get connection pool statistics
 */
export function getPoolStats() {
  const pool = getConnectionPool();
  if (!pool) {
    return null;
  }

  // MySQL2 pool statistics
  const poolInfo = (pool as any).pool;
  
  return {
    totalConnections: poolInfo?._allConnections?.length || 0,
    activeConnections: poolInfo?._acquiringConnections?.length || 0,
    idleConnections: poolInfo?._freeConnections?.length || 0,
    queuedRequests: poolInfo?._connectionQueue?.length || 0,
    config: {
      connectionLimit: poolConfig.connectionLimit,
      queueLimit: poolConfig.queueLimit,
    },
  };
}

/**
 * Close the connection pool
 * 
 * Should be called when shutting down the application
 */
export async function closeConnectionPool(): Promise<void> {
  if (connectionPool) {
    await connectionPool.end();
    connectionPool = null;
    _db = null;
    console.info('[ConnectionPool] Connection pool closed');
  }
}

/**
 * Health check for connection pool
 */
export async function checkPoolHealth(): Promise<{
  healthy: boolean;
  stats: ReturnType<typeof getPoolStats>;
  message: string;
}> {
  const pool = getConnectionPool();
  
  if (!pool) {
    return {
      healthy: false,
      stats: null,
      message: 'Connection pool not initialized',
    };
  }

  const stats = getPoolStats();
  
  if (!stats) {
    return {
      healthy: false,
      stats: null,
      message: 'Unable to retrieve pool statistics',
    };
  }

  // Health criteria:
  // - Pool is not exhausted (has idle connections or queue is not full)
  // - Not too many queued requests
  const poolUtilization = (stats.activeConnections / (stats.config.connectionLimit || 20)) * 100;
  const healthy = poolUtilization < 90 && stats.queuedRequests < 50;

  let message = 'Connection pool healthy';
  if (poolUtilization >= 90) {
    message = `Warning: Pool utilization at ${poolUtilization.toFixed(1)}%`;
  }
  if (stats.queuedRequests > 0) {
    message = `Warning: ${stats.queuedRequests} requests queued`;
  }

  return {
    healthy,
    stats,
    message,
  };
}
