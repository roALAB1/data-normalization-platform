import {
  createCircuitBreaker,
  CIRCUIT_BREAKER_CONFIGS,
  circuitBreakerRegistry,
} from './circuitBreaker';

/**
 * Service Circuit Breakers
 * 
 * Provides circuit breaker protection for external services:
 * - Redis operations
 * - External API calls
 * - Third-party integrations
 */

/**
 * Redis Circuit Breaker
 * 
 * Protects Redis operations with automatic fallback when Redis is unavailable.
 * This is especially important for rate limiting and caching.
 */

/**
 * Execute Redis operation with circuit breaker protection
 * 
 * @param operation - Redis operation to execute
 * @param fallback - Fallback value when circuit is open
 * @returns Operation result or fallback
 */
export async function executeRedisWithCircuitBreaker<T>(
  operation: () => Promise<T>,
  fallback?: () => Promise<T>
): Promise<T> {
  const breaker = createCircuitBreaker(
    operation,
    CIRCUIT_BREAKER_CONFIGS.redis,
    fallback
  );

  circuitBreakerRegistry.register(`redis-${Date.now()}`, breaker);

  try {
    return await breaker.fire();
  } catch (error) {
    console.error('[Redis Circuit Breaker] Operation failed:', error);
    throw error;
  }
}

/**
 * Redis health check with circuit breaker
 */
const redisHealthCheckBreaker = createCircuitBreaker(
  async () => {
    // Import Redis from ioredis
    const { Redis } = await import('ioredis');
    const { ENV } = await import('./env');
    
    const redis = new Redis({
      host: ENV.redisHost,
      port: ENV.redisPort,
      maxRetriesPerRequest: 1,
      connectTimeout: 5000,
    });

    try {
      // Ping Redis to check connectivity
      await redis.ping();
      await redis.quit();
      return true;
    } catch (error) {
      await redis.quit();
      throw error;
    }
  },
  CIRCUIT_BREAKER_CONFIGS.redis,
  async () => {
    console.warn('[Redis Circuit Breaker] Health check failed, using fallback');
    return false;
  }
);

circuitBreakerRegistry.register('redis-health-check', redisHealthCheckBreaker);

export async function checkRedisHealth(): Promise<boolean> {
  try {
    return await redisHealthCheckBreaker.fire();
  } catch (error) {
    console.error('[Redis Circuit Breaker] Health check error:', error);
    return false;
  }
}

/**
 * External API Circuit Breaker
 * 
 * Protects external API calls with longer timeouts and more tolerant thresholds.
 */

/**
 * Execute external API call with circuit breaker protection
 * 
 * @param apiCall - API call function
 * @param fallback - Fallback function when circuit is open
 * @returns API response or fallback
 */
export async function executeApiWithCircuitBreaker<T>(
  apiCall: () => Promise<T>,
  fallback?: () => Promise<T>
): Promise<T> {
  const breaker = createCircuitBreaker(
    apiCall,
    CIRCUIT_BREAKER_CONFIGS.externalApi,
    fallback
  );

  circuitBreakerRegistry.register(`api-${Date.now()}`, breaker);

  try {
    return await breaker.fire();
  } catch (error) {
    console.error('[API Circuit Breaker] Call failed:', error);
    throw error;
  }
}

/**
 * HTTP fetch with circuit breaker protection
 * 
 * Wraps fetch() with automatic retry and fallback logic.
 * 
 * @param url - URL to fetch
 * @param options - Fetch options
 * @param fallback - Fallback response when circuit is open
 * @returns Fetch response or fallback
 */
export async function fetchWithCircuitBreaker(
  url: string,
  options?: RequestInit,
  fallback?: () => Promise<Response>
): Promise<Response> {
  return executeApiWithCircuitBreaker(
    async () => {
      const response = await fetch(url, options);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return response;
    },
    fallback
  );
}

/**
 * Get service circuit breaker statuses
 */
export function getServiceCircuitStatuses() {
  const redisBreaker = circuitBreakerRegistry.get('redis-health-check');
  
  return {
    redis: {
      available: redisBreaker ? !redisBreaker.opened : false,
      state: redisBreaker
        ? redisBreaker.opened
          ? 'OPEN'
          : redisBreaker.halfOpen
          ? 'HALF_OPEN'
          : 'CLOSED'
        : 'UNKNOWN',
      stats: redisBreaker?.stats,
    },
  };
}
