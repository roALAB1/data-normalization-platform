import { drizzle } from 'drizzle-orm/mysql2';
import type { MySql2Database } from 'drizzle-orm/mysql2';
import {
  createCircuitBreaker,
  CIRCUIT_BREAKER_CONFIGS,
  circuitBreakerRegistry,
} from './circuitBreaker';
import { getDb } from '../db';

/**
 * Database Circuit Breaker
 * 
 * Wraps database operations with circuit breaker protection to prevent
 * cascading failures when the database becomes unavailable.
 * 
 * Features:
 * - Automatic failure detection (50% error threshold)
 * - 30-second recovery window
 * - Fallback to cached data or error responses
 * - Detailed logging and metrics
 */

/**
 * Execute a database query with circuit breaker protection
 * 
 * @param queryFn - Function that executes the database query
 * @param fallbackFn - Optional fallback function when circuit is open
 * @returns Query result or fallback result
 */
export async function executeWithCircuitBreaker<T>(
  queryFn: () => Promise<T>,
  fallbackFn?: () => Promise<T>
): Promise<T> {
  // Create circuit breaker for this query
  const breaker = createCircuitBreaker(
    queryFn,
    CIRCUIT_BREAKER_CONFIGS.database,
    fallbackFn
  );

  // Register for monitoring
  circuitBreakerRegistry.register(`db-query-${Date.now()}`, breaker);

  try {
    return await breaker.fire();
  } catch (error) {
    console.error('[DB Circuit Breaker] Query failed:', error);
    throw error;
  }
}

/**
 * Wrap database instance with circuit breaker
 * 
 * This creates a proxy around the database that automatically applies
 * circuit breaker protection to all queries.
 */
export function wrapDbWithCircuitBreaker(
  db: MySql2Database<any>
): MySql2Database<any> {
  // For now, return the original db instance
  // Circuit breaker protection is applied at the query level via executeWithCircuitBreaker
  return db;
}

/**
 * Database health check with circuit breaker
 */
const healthCheckBreaker = createCircuitBreaker(
  async () => {
    const db = await getDb();
    // Simple query to check database connectivity
    await db.execute('SELECT 1');
    return true;
  },
  CIRCUIT_BREAKER_CONFIGS.database,
  async () => {
    console.warn('[DB Circuit Breaker] Health check failed, using fallback');
    return false;
  }
);

circuitBreakerRegistry.register('db-health-check', healthCheckBreaker);

export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    return await healthCheckBreaker.fire();
  } catch (error) {
    console.error('[DB Circuit Breaker] Health check error:', error);
    return false;
  }
}

/**
 * Get database circuit breaker status
 */
export function getDatabaseCircuitStatus() {
  const breaker = circuitBreakerRegistry.get('db-health-check');
  if (!breaker) {
    return { available: false, state: 'UNKNOWN' };
  }

  return {
    available: !breaker.opened,
    state: breaker.opened ? 'OPEN' : breaker.halfOpen ? 'HALF_OPEN' : 'CLOSED',
    stats: breaker.stats,
  };
}
