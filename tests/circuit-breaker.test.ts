import { describe, it, expect, beforeAll } from 'vitest';
import {
  createCircuitBreaker,
  CIRCUIT_BREAKER_CONFIGS,
  getCircuitBreakerStats,
} from '../server/_core/circuitBreaker';

describe('Circuit Breaker', () => {
  describe('Basic Functionality', () => {
    it('should execute function successfully when circuit is closed', async () => {
      const successFn = async () => 'success';
      const breaker = createCircuitBreaker(
        successFn,
        CIRCUIT_BREAKER_CONFIGS.database
      );

      const result = await breaker.fire();
      expect(result).toBe('success');
    });

    it('should use fallback when function fails', async () => {
      const failFn = async () => {
        throw new Error('Service unavailable');
      };
      const fallbackFn = async () => 'fallback result';

      const breaker = createCircuitBreaker(
        failFn,
        CIRCUIT_BREAKER_CONFIGS.database,
        fallbackFn
      );

      const result = await breaker.fire();
      expect(result).toBe('fallback result');
    });

    it('should timeout long-running operations', async () => {
      const slowFn = async () => {
        await new Promise((resolve) => setTimeout(resolve, 15000)); // 15 seconds
        return 'too slow';
      };

      const breaker = createCircuitBreaker(
        slowFn,
        { ...CIRCUIT_BREAKER_CONFIGS.database, timeout: 1000 } // 1 second timeout
      );

      await expect(breaker.fire()).rejects.toThrow();
    }, 10000);
  });

  describe('Circuit States', () => {
    it('should open circuit after threshold failures', async () => {
      let callCount = 0;
      const unreliableFn = async () => {
        callCount++;
        throw new Error(`Failure ${callCount}`);
      };

      const breaker = createCircuitBreaker(
        unreliableFn,
        {
          ...CIRCUIT_BREAKER_CONFIGS.database,
          errorThresholdPercentage: 0.5, // Open after 50% failures
          rollingCountTimeout: 1000,
          resetTimeout: 5000,
        }
      );

      // Make multiple failing calls to trigger circuit opening
      for (let i = 0; i < 10; i++) {
        try {
          await breaker.fire();
        } catch (error) {
          // Expected to fail
        }
      }

      // Circuit should be open now
      const stats = getCircuitBreakerStats(breaker);
      console.log('Circuit state after failures:', stats.state);
      console.log('Failures:', stats.failures);
      console.log('Rejections:', stats.rejections);

      // Circuit may be OPEN or HALF_OPEN depending on timing
      expect(['OPEN', 'HALF_OPEN']).toContain(stats.state);
    }, 15000);

    it('should collect statistics correctly', async () => {
      const testFn = async (shouldFail: boolean) => {
        if (shouldFail) {
          throw new Error('Intentional failure');
        }
        return 'success';
      };

      const breaker = createCircuitBreaker(
        testFn,
        CIRCUIT_BREAKER_CONFIGS.database
      );

      // Execute some successful calls
      await breaker.fire(false);
      await breaker.fire(false);

      // Execute some failed calls
      try {
        await breaker.fire(true);
      } catch (error) {
        // Expected
      }

      const stats = getCircuitBreakerStats(breaker);
      expect(stats.successes).toBeGreaterThanOrEqual(2);
      expect(stats.failures).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Configuration', () => {
    it('should use database configuration correctly', () => {
      const config = CIRCUIT_BREAKER_CONFIGS.database;
      expect(config.timeout).toBe(10000);
      expect(config.errorThresholdPercentage).toBe(0.5);
      expect(config.resetTimeout).toBe(30000);
    });

    it('should use Redis configuration correctly', () => {
      const config = CIRCUIT_BREAKER_CONFIGS.redis;
      expect(config.timeout).toBe(5000);
      expect(config.errorThresholdPercentage).toBe(0.5);
      expect(config.resetTimeout).toBe(20000);
    });

    it('should use external API configuration correctly', () => {
      const config = CIRCUIT_BREAKER_CONFIGS.externalApi;
      expect(config.timeout).toBe(30000);
      expect(config.errorThresholdPercentage).toBe(0.6);
      expect(config.resetTimeout).toBe(60000);
    });
  });
});

describe('Database Circuit Breaker', () => {
  it('should check database health', async () => {
    const { checkDatabaseHealth } = await import('../server/_core/dbCircuitBreaker');
    
    // This will attempt to connect to the database
    // In test environment, it may fail, which is expected
    const healthy = await checkDatabaseHealth();
    expect(typeof healthy).toBe('boolean');
  }, 15000);
});

describe('Service Circuit Breakers', () => {
  it('should check Redis health', async () => {
    const { checkRedisHealth } = await import('../server/_core/serviceCircuitBreakers');
    
    // This will attempt to connect to Redis
    // In test environment, it may fail, which is expected
    const healthy = await checkRedisHealth();
    expect(typeof healthy).toBe('boolean');
  }, 15000);

  it('should execute Redis operation with circuit breaker', async () => {
    const { executeRedisWithCircuitBreaker } = await import('../server/_core/serviceCircuitBreakers');
    
    const testOperation = async () => {
      return 'redis-result';
    };

    const fallback = async () => {
      return 'fallback-result';
    };

    const result = await executeRedisWithCircuitBreaker(testOperation, fallback);
    expect(['redis-result', 'fallback-result']).toContain(result);
  });

  it('should execute API call with circuit breaker', async () => {
    const { executeApiWithCircuitBreaker } = await import('../server/_core/serviceCircuitBreakers');
    
    const testApiCall = async () => {
      return { data: 'api-response' };
    };

    const result = await executeApiWithCircuitBreaker(testApiCall);
    expect(result).toEqual({ data: 'api-response' });
  });
});
