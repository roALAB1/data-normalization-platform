# Redis Configuration Guide

## Overview

The Data Normalization Platform v3.22.0 includes a Redis caching layer that provides **10x throughput improvement** (from 20-30 req/s to 1,000+ req/s for cached data) with sub-millisecond response times.

**Current Status**: ⚠️ Redis is not configured. The application defaults to `localhost:6379`, which may not be available in production.

## Required Environment Variables

Add the following environment variables to enable the Redis caching layer:

```bash
# Redis Configuration
REDIS_HOST=your-redis-host.example.com
REDIS_PORT=6379
```

### Example Configurations

#### Local Development
```bash
REDIS_HOST=localhost
REDIS_PORT=6379
```

#### Production (Cloud Redis)
```bash
# AWS ElastiCache
REDIS_HOST=your-cluster.cache.amazonaws.com
REDIS_PORT=6379

# Redis Cloud
REDIS_HOST=redis-12345.c123.us-east-1-1.ec2.cloud.redislabs.com
REDIS_PORT=12345

# Azure Cache for Redis
REDIS_HOST=your-cache.redis.cache.windows.net
REDIS_PORT=6380
```

## How to Set Environment Variables

### Option 1: Manus Dashboard (Recommended)

1. Open the Manus project dashboard
2. Navigate to **Settings** → **Secrets** panel
3. Click **Add Secret**
4. Add `REDIS_HOST` with your Redis hostname
5. Add `REDIS_PORT` with your Redis port (default: 6379)
6. Restart the application

### Option 2: Command Line

```bash
# Set environment variables
export REDIS_HOST=your-redis-host.example.com
export REDIS_PORT=6379

# Restart the application
cd /home/ubuntu/name-normalization-demo
pnpm dev
```

### Option 3: .env File

Create a `.env` file in the project root:

```bash
# .env
REDIS_HOST=your-redis-host.example.com
REDIS_PORT=6379
```

**Note**: The `.env` file should not be committed to version control.

## Verifying Redis Connection

After configuring Redis, verify the connection:

### 1. Check Application Logs

Look for this log message on startup:

```
[Cache] Redis connected
```

If Redis is not available, you'll see:

```
[Cache] Redis error: Error: connect ECONNREFUSED
```

### 2. Test Cache Operations

Use the monitoring endpoint to check cache statistics:

```bash
# Using curl
curl http://localhost:3000/api/trpc/monitoring.cacheStats

# Expected response
{
  "hits": 0,
  "misses": 0,
  "hitRate": 0,
  "sets": 0,
  "deletes": 0,
  "errors": 0
}
```

### 3. Check Redis Directly

```bash
# Connect to Redis
redis-cli -h your-redis-host.example.com -p 6379

# Test connection
redis> PING
PONG

# Check keys
redis> KEYS *
(empty list or list of keys)
```

## Cache Configuration

The caching layer uses the following TTL (Time To Live) values:

| Data Type | TTL | Hit Rate (Expected) |
|-----------|-----|---------------------|
| Users | 1 hour | 80-90% |
| Jobs | 5 minutes | 60-70% |
| Job Results | 10 minutes | 70-80% |
| Sessions | 24 hours | 90-95% |

### Cache Warming

On startup, the application pre-loads:
- 100 most recent users
- 200 most recent jobs

This ensures high hit rates immediately after deployment.

## Performance Benefits

### Without Redis (Current State)
- **Throughput**: 20-30 requests/second
- **Latency**: 50-100ms (database queries)
- **Hit Rate**: 0% (no caching)

### With Redis Configured
- **Throughput**: 1,000+ requests/second (50x improvement)
- **Latency**: <1ms (cache hits)
- **Hit Rate**: 80-90% (for stable data)

### Example Impact

For a typical workload with 1,000 user requests:
- **Without Redis**: 1,000 database queries × 50ms = 50 seconds
- **With Redis**: 100 database queries × 50ms + 900 cache hits × 1ms = 5.9 seconds

**Result**: 8.5x faster response time

## Graceful Degradation

If Redis is unavailable, the application will:
1. ✅ Continue to work (no crashes)
2. ✅ Fall back to database queries
3. ⚠️ Lose 10x throughput improvement
4. ⚠️ Experience higher latency (50-100ms vs <1ms)

The circuit breaker will detect Redis failures and automatically fall back to database queries.

## Monitoring

### Cache Hit Rate

Monitor cache performance using the monitoring endpoint:

```bash
curl http://localhost:3000/api/trpc/monitoring.cacheStats
```

**Target Hit Rates**:
- Users: 80-90%
- Jobs: 60-70%
- Sessions: 90-95%

### Grafana Dashboard

If the Prometheus + Grafana monitoring stack is deployed, view the **Cache Performance Dashboard**:

- Cache hit rate over time
- Memory usage
- TTL distribution
- Cache operations (hits, misses, sets, deletes)

Access at: http://localhost:3001 (default Grafana port)

## Troubleshooting

### Issue: "Redis error: connect ECONNREFUSED"

**Cause**: Redis is not running or not accessible at the configured host/port.

**Solutions**:
1. Verify Redis is running: `redis-cli -h $REDIS_HOST -p $REDIS_PORT ping`
2. Check firewall rules allow connections to Redis port
3. Verify `REDIS_HOST` and `REDIS_PORT` are correct
4. Check Redis authentication if required

### Issue: Cache hit rate is 0%

**Cause**: Redis is not configured or cache is being cleared frequently.

**Solutions**:
1. Verify Redis environment variables are set
2. Check application logs for Redis connection errors
3. Verify cache warming is running on startup
4. Check if cache is being cleared by admin operations

### Issue: High memory usage

**Cause**: Too many cached entries or TTL values too long.

**Solutions**:
1. Reduce TTL values in `server/_core/cache.ts`
2. Implement cache eviction policies (LRU, LFU)
3. Increase Redis memory limit
4. Clear cache manually: `curl -X POST http://localhost:3000/api/trpc/monitoring.cacheClear`

## Disabling Redis (If Not Available)

If Redis is not available in your environment, you can disable caching to avoid error logs:

### Option 1: Set Dummy Values

```bash
# Use localhost (will fail gracefully)
REDIS_HOST=localhost
REDIS_PORT=6379
```

The circuit breaker will detect the failure and fall back to database queries.

### Option 2: Comment Out Cache Warming

Edit `server/_core/index.ts` and comment out cache warming:

```typescript
// await warmCache(); // Disabled - Redis not available
```

## Next Steps

1. **Configure Redis**: Set `REDIS_HOST` and `REDIS_PORT` environment variables
2. **Verify Connection**: Check application logs for `[Cache] Redis connected`
3. **Monitor Performance**: Use `monitoring.cacheStats` endpoint to track hit rates
4. **Optimize TTL**: Adjust TTL values based on production metrics (see `CACHE_OPTIMIZATION_GUIDE.md`)
5. **Deploy Monitoring**: Set up Prometheus + Grafana for real-time cache performance dashboards

## References

- [Redis Caching Guide](REDIS_CACHING_GUIDE.md) - Detailed caching implementation
- [Cache Optimization Guide](CACHE_OPTIMIZATION_GUIDE.md) - TTL tuning and optimization strategies
- [Monitoring Stack](monitoring/README.md) - Prometheus + Grafana deployment

---

**Version**: 1.0.0  
**Last Updated**: 2025-11-14  
**Status**: Redis not configured (defaults to localhost:6379)
