import CircuitBreaker from 'opossum';

/**
 * Circuit Breaker Configuration
 * 
 * Prevents cascading failures by automatically opening circuits when services fail.
 * 
 * Key Concepts:
 * - CLOSED: Normal operation, requests pass through
 * - OPEN: Too many failures, requests fail immediately
 * - HALF_OPEN: Testing if service recovered, limited requests allowed
 */

export interface CircuitBreakerConfig {
  /** Timeout in milliseconds before considering request failed */
  timeout: number;
  /** Error threshold percentage (0-1) before opening circuit */
  errorThresholdPercentage: number;
  /** Time window in milliseconds for calculating error rate */
  rollingCountTimeout: number;
  /** Number of buckets for rolling window */
  rollingCountBuckets: number;
  /** Time in milliseconds to wait before attempting recovery */
  resetTimeout: number;
  /** Name of the circuit breaker for logging */
  name: string;
}

/**
 * Default circuit breaker configurations for different service types
 */
export const CIRCUIT_BREAKER_CONFIGS = {
  /** Database operations - critical, fast timeout */
  database: {
    timeout: 10000, // 10 seconds
    errorThresholdPercentage: 0.5, // Open after 50% failures
    rollingCountTimeout: 10000, // 10 second window
    rollingCountBuckets: 10, // 10 buckets of 1 second each
    resetTimeout: 30000, // Try recovery after 30 seconds
    name: 'database',
  } as CircuitBreakerConfig,

  /** Redis operations - fast, can tolerate failures */
  redis: {
    timeout: 5000, // 5 seconds
    errorThresholdPercentage: 0.5, // Open after 50% failures
    rollingCountTimeout: 10000, // 10 second window
    rollingCountBuckets: 10,
    resetTimeout: 20000, // Try recovery after 20 seconds
    name: 'redis',
  } as CircuitBreakerConfig,

  /** External API calls - slower, more tolerant */
  externalApi: {
    timeout: 30000, // 30 seconds
    errorThresholdPercentage: 0.6, // Open after 60% failures
    rollingCountTimeout: 60000, // 1 minute window
    rollingCountBuckets: 10,
    resetTimeout: 60000, // Try recovery after 1 minute
    name: 'external-api',
  } as CircuitBreakerConfig,
};

/**
 * Circuit breaker state tracking
 */
export interface CircuitBreakerStats {
  name: string;
  state: 'OPEN' | 'CLOSED' | 'HALF_OPEN';
  failures: number;
  successes: number;
  rejections: number;
  timeouts: number;
  fallbacks: number;
  latencyMean: number;
  latencyMedian: number;
}

/**
 * Create a circuit breaker for a given async function
 * 
 * @param fn - Async function to wrap with circuit breaker
 * @param config - Circuit breaker configuration
 * @param fallback - Optional fallback function when circuit is open
 * @returns Circuit breaker instance
 */
export function createCircuitBreaker<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  config: CircuitBreakerConfig,
  fallback?: (...args: Parameters<T>) => Promise<ReturnType<T>> | ReturnType<T>
): CircuitBreaker<any[], any> {
  const breaker = new CircuitBreaker(fn, {
    timeout: config.timeout,
    errorThresholdPercentage: config.errorThresholdPercentage,
    resetTimeout: config.resetTimeout,
    rollingCountTimeout: config.rollingCountTimeout,
    rollingCountBuckets: config.rollingCountBuckets,
    name: config.name,
  });

  // Add fallback if provided
  if (fallback) {
    breaker.fallback(fallback);
  }

  // Log circuit breaker state changes
  breaker.on('open', () => {
    console.error(`[Circuit Breaker] ${config.name} OPENED - too many failures`);
  });

  breaker.on('halfOpen', () => {
    console.warn(`[Circuit Breaker] ${config.name} HALF-OPEN - testing recovery`);
  });

  breaker.on('close', () => {
    console.log(`[Circuit Breaker] ${config.name} CLOSED - service recovered`);
  });

  breaker.on('fallback', (result) => {
    console.warn(`[Circuit Breaker] ${config.name} fallback triggered`);
  });

  return breaker;
}

/**
 * Get circuit breaker statistics
 */
export function getCircuitBreakerStats(
  breaker: CircuitBreaker<any, any>
): CircuitBreakerStats {
  const stats = breaker.stats;
  const state = breaker.opened
    ? 'OPEN'
    : breaker.halfOpen
    ? 'HALF_OPEN'
    : 'CLOSED';

  return {
    name: breaker.name,
    state,
    failures: stats.failures,
    successes: stats.successes,
    rejections: stats.rejects,
    timeouts: stats.timeouts,
    fallbacks: stats.fallbacks,
    latencyMean: stats.latencyMean,
    latencyMedian: stats.percentiles[50] || 0,
  };
}

/**
 * Global circuit breaker registry
 */
class CircuitBreakerRegistry {
  private breakers = new Map<string, CircuitBreaker<any, any>>();

  register(name: string, breaker: CircuitBreaker<any, any>) {
    this.breakers.set(name, breaker);
  }

  get(name: string): CircuitBreaker<any, any> | undefined {
    return this.breakers.get(name);
  }

  getAll(): CircuitBreaker<any, any>[] {
    return Array.from(this.breakers.values());
  }

  getAllStats(): CircuitBreakerStats[] {
    return this.getAll().map(getCircuitBreakerStats);
  }
}

export const circuitBreakerRegistry = new CircuitBreakerRegistry();
