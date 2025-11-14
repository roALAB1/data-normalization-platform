# Redis Fail-Open Analysis: Security & Performance Implications

## Current Situation

**Status:** Redis connection failing → Rate limiting fails open (allows all requests)

**Affected Feature:** Rate limiting middleware (v3.17.0)
- Job creation: Configured for 10 jobs/hour per user
- **Actual behavior:** Unlimited job submissions allowed

---

## Security Implications

### 🔴 HIGH RISK: Abuse & Resource Exhaustion

1. **No Rate Limiting Protection**
   - Users can submit unlimited batch jobs
   - No throttling on API endpoints
   - Vulnerable to abuse and DoS attacks

2. **Resource Exhaustion Risks**
   - Worker pool can be overwhelmed
   - Database connections exhausted
   - S3 storage costs unbounded
   - CPU/Memory saturation from unlimited jobs

3. **Cost Implications**
   - Unlimited S3 uploads (storage costs)
   - Unlimited database writes
   - Compute resource abuse

### 🟡 MEDIUM RISK: Fair Usage

1. **No User Fairness**
   - Single user can monopolize system resources
   - No queue management
   - Other users may experience degraded performance

---

## Performance Implications

### 🔴 HIGH IMPACT: System Overload

1. **Worker Pool Saturation**
   - 100+ concurrent jobs possible
   - Memory leaks accelerated (even with recycling)
   - Browser tab crashes from too many workers

2. **Database Connection Pool**
   - Connection exhaustion likely
   - Slow queries from contention
   - Potential deadlocks

3. **Network Bandwidth**
   - Unlimited CSV uploads
   - S3 bandwidth costs
   - Download bandwidth for results

### 🟡 MEDIUM IMPACT: Cascading Failures

1. **Job Queue Buildup**
   - BullMQ queue grows unbounded
   - Redis (when available) overwhelmed
   - Job processing delays

2. **Memory Pressure**
   - Multiple large CSV files in memory
   - Worker pool memory leaks compound
   - Potential OOM kills

---

## Mitigation Options

### Option 1: Start Redis Locally (RECOMMENDED - 2 minutes)

**Quickest and most effective solution**

```bash
# Install Redis (if not installed)
sudo apt-get update && sudo apt-get install -y redis-server

# Start Redis
sudo systemctl start redis-server

# Verify
redis-cli ping  # Should return "PONG"

# Restart dev server
pnpm run dev
```

**Pros:**
- ✅ Full rate limiting protection
- ✅ Matches production behavior
- ✅ Tests Redis integration
- ✅ No code changes needed

**Cons:**
- ❌ Requires Redis installation
- ❌ Another service to manage

---

### Option 2: In-Memory Rate Limiting Fallback (10 minutes)

**Add memory-based rate limiting when Redis unavailable**

```typescript
// server/_core/rateLimit.ts
const inMemoryStore = new Map<string, { count: number; resetAt: number }>();

export async function checkRateLimit(
  userId: string,
  config: RateLimitConfig
): Promise<{ allowed: boolean; remaining: number; resetAt: Date }> {
  try {
    // Try Redis first (existing code)
    const result = await redisRateLimit(userId, config);
    return result;
  } catch (error) {
    // Fallback to in-memory
    return inMemoryRateLimit(userId, config);
  }
}

function inMemoryRateLimit(userId: string, config: RateLimitConfig) {
  const key = `${config.keyPrefix}:${userId}`;
  const now = Date.now();
  const entry = inMemoryStore.get(key);

  if (!entry || entry.resetAt < now) {
    // New window
    inMemoryStore.set(key, {
      count: 1,
      resetAt: now + config.windowSeconds * 1000,
    });
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetAt: new Date(now + config.windowSeconds * 1000),
    };
  }

  if (entry.count >= config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: new Date(entry.resetAt),
    };
  }

  entry.count++;
  return {
    allowed: true,
    remaining: config.maxRequests - entry.count,
    resetAt: new Date(entry.resetAt),
  };
}
```

**Pros:**
- ✅ No external dependencies
- ✅ Works immediately
- ✅ Better than no rate limiting

**Cons:**
- ❌ Not distributed (won't work across multiple servers)
- ❌ Lost on server restart
- ❌ Memory usage grows with users

---

### Option 3: Disable Fail-Open (5 minutes)

**Make rate limiting fail-closed instead**

```typescript
// server/_core/rateLimit.ts
export async function checkRateLimit(...) {
  try {
    // Existing Redis code
  } catch (error) {
    // FAIL CLOSED instead of open
    console.error("[RateLimit] Redis unavailable, blocking request");
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Rate limiting service unavailable",
    });
  }
}
```

**Pros:**
- ✅ Secure (no abuse possible)
- ✅ Forces Redis setup

**Cons:**
- ❌ Breaks development workflow
- ❌ Poor developer experience
- ❌ Doesn't match production (which has Redis)

---

### Option 4: Development-Only Bypass (3 minutes)

**Disable rate limiting in development**

```typescript
// server/_core/rateLimit.ts
export async function rateLimitMiddleware(
  userId: string,
  config: RateLimitConfig
): Promise<void> {
  // Skip in development
  if (process.env.NODE_ENV === 'development') {
    console.log('[RateLimit] Skipped (development mode)');
    return;
  }

  const result = await checkRateLimit(userId, config);
  // ... rest of code
}
```

**Pros:**
- ✅ Fast development workflow
- ✅ No Redis needed locally

**Cons:**
- ❌ Can't test rate limiting locally
- ❌ Dev/prod parity broken
- ❌ Bugs only found in production

---

## Recommendation

### For Development: **Option 1 (Start Redis)**

**Why:**
- Takes 2 minutes
- Full feature parity with production
- Can test rate limiting behavior
- No code changes or technical debt

**Commands:**
```bash
# Ubuntu/Debian
sudo apt-get update && sudo apt-get install -y redis-server
sudo systemctl start redis-server
redis-cli ping

# macOS
brew install redis
brew services start redis
redis-cli ping

# Docker (alternative)
docker run -d -p 6379:6379 redis:alpine
```

### For Production: **Already Handled**

Production environments typically have Redis available, so fail-open is appropriate:
- Prevents service outage if Redis temporarily fails
- Graceful degradation
- Logs errors for monitoring/alerting

---

## Testing Rate Limiting

Once Redis is running, test with:

```bash
# Test job creation rate limit (should block after 10)
for i in {1..12}; do
  curl -X POST http://localhost:3000/api/trpc/jobs.create \
    -H "Content-Type: application/json" \
    -d '{"type":"name","fileContent":"name\nJohn Doe","fileName":"test.csv"}' \
    -b "session_cookie=YOUR_SESSION"
  echo "Request $i"
  sleep 1
done
```

Expected: First 10 succeed, 11th and 12th return `TOO_MANY_REQUESTS`

---

## Monitoring

Add monitoring for Redis connection status:

```typescript
// server/_core/rateLimit.ts
redis.on('connect', () => {
  console.log('[RateLimit] ✅ Redis connected - Rate limiting active');
});

redis.on('error', (error) => {
  console.error('[RateLimit] ⚠️  Redis error - Failing open:', error.message);
});

redis.on('close', () => {
  console.warn('[RateLimit] ⚠️  Redis disconnected - Rate limiting disabled');
});
```

---

## Summary

| Option | Time | Security | Dev Experience | Production Ready |
|--------|------|----------|----------------|------------------|
| **1. Start Redis** | 2 min | ✅ High | ✅ Good | ✅ Yes |
| 2. In-Memory Fallback | 10 min | 🟡 Medium | ✅ Good | ❌ No (single server) |
| 3. Fail Closed | 5 min | ✅ High | ❌ Poor | ❌ No |
| 4. Dev Bypass | 3 min | ❌ None | ✅ Good | ❌ No |

**Recommended:** Option 1 (Start Redis locally)
