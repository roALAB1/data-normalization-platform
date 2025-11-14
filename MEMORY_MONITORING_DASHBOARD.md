# Memory Monitoring Dashboard

## Overview

The Memory Monitoring Dashboard provides real-time visualization of worker pool performance metrics during CSV normalization processing. It helps monitor system health, identify performance bottlenecks, and debug processing issues.

**Access:** Navigate to `/monitoring` or click the "Monitoring" button in the main header.

---

## Features

### 1. System Health Indicator

Displays overall worker pool status with color-coded badges:

- **HEALTHY** (Green) - Workers active, memory usage normal, low retry rate
- **IDLE** (Blue) - No active processing
- **WARNING** (Yellow) - High memory usage or excessive retries
- **UNKNOWN** (Gray) - Unable to determine status

**Health Criteria:**
- Active workers > 0
- Average memory per worker < 500 MB
- Total retries < 10

---

### 2. Real-Time Metrics Cards

Four key metrics displayed at the top of the dashboard:

#### Active Workers
- Number of Web Workers currently processing chunks
- Updates every 2 seconds when auto-refresh enabled

#### Total Memory
- Combined memory usage across all active workers (MB)
- Includes RSS (Resident Set Size)

#### Chunks Processed
- Total number of chunks processed since workers started
- Each chunk typically contains 1,000-2,000 rows

#### Total Retries
- Number of chunk retries due to transient failures
- High retry count may indicate system issues

---

### 3. Active Workers Over Time Chart

**Type:** Line chart  
**Update Frequency:** Every 5 seconds  
**Time Range:** Configurable (5min, 15min, 30min, 1hr)

Shows the number of active workers processing chunks over time. Useful for:
- Identifying worker pool scaling patterns
- Detecting worker crashes or recycling events
- Monitoring parallel processing efficiency

**Expected Pattern:**
- Ramps up quickly when processing starts
- Stays constant during active processing
- Drops to zero when processing completes

---

### 4. Memory Usage Over Time Chart

**Type:** Area chart  
**Update Frequency:** Every 5 seconds  
**Time Range:** Configurable (5min, 15min, 30min, 1hr)

Displays total memory consumption (MB) across all workers. Useful for:
- Detecting memory leaks
- Monitoring memory growth patterns
- Verifying worker recycling effectiveness

**Expected Pattern:**
- Gradual increase as workers process chunks
- Periodic drops when workers are recycled (after 100 chunks)
- Should not exceed 500 MB per worker

**Warning Signs:**
- Continuous upward trend without drops (memory leak)
- Sudden spikes (inefficient chunk processing)
- Exceeding 500 MB per worker (may trigger recycling)

---

### 5. Worker Recycling Events Table

**Tab:** Recycling Events  
**Update Frequency:** Every 5 seconds  
**Limit:** Last 20 events

Displays recent worker recycling activity with details:

| Column | Description |
|--------|-------------|
| Time | When the worker was recycled |
| Worker ID | Unique identifier (first 8 characters) |
| Reason | Why the worker was recycled |
| Chunks | Number of chunks processed before recycling |
| Memory (MB) | Memory usage at time of recycling |

**Recycling Reasons:**
- `max_chunks` - Worker processed 100 chunks (normal)
- `memory_limit` - Worker exceeded 500 MB memory (normal)
- `error` - Worker crashed or encountered fatal error (investigate)
- `manual` - Manually triggered recycling (rare)

**Normal Pattern:**
- Most recyclings should be `max_chunks` after exactly 100 chunks
- Occasional `memory_limit` recyclings are acceptable
- Frequent `error` recyclings indicate bugs

---

### 6. Chunk Retry Events Table

**Tab:** Retry Events  
**Update Frequency:** Every 5 seconds  
**Limit:** Last 20 events

Displays recent chunk processing retries with details:

| Column | Description |
|--------|-------------|
| Time | When the retry occurred |
| Chunk ID | Identifier of the chunk being retried |
| Attempt | Retry attempt number (1-3) |
| Error | Error message that triggered retry |
| Delay | Delay before retry (exponential backoff) |

**Retry Logic:**
- **Max Retries:** 3 attempts per chunk
- **Backoff:** 1s → 2s → 4s → 8s (exponential)
- **Max Delay:** 30 seconds

**Normal Pattern:**
- Occasional retries (< 1% of chunks) due to transient errors
- Retry attempts should succeed on 2nd or 3rd attempt
- Delays should follow exponential backoff pattern

**Warning Signs:**
- High retry rate (> 5% of chunks)
- Many chunks reaching 3rd attempt
- Same error message repeating frequently

---

## Controls

### Auto-Refresh Toggle

**Location:** Top-right header  
**States:** ON (blue) / OFF (gray)

When enabled:
- Current metrics refresh every 2 seconds
- Historical charts refresh every 5 seconds
- Event tables refresh every 5 seconds

When disabled:
- All data remains static
- Manual refresh button still works

**Use Cases:**
- Enable during active processing to monitor in real-time
- Disable to freeze data for analysis or screenshots

---

### Time Range Selector

**Location:** Top-right header  
**Options:** 5 minutes, 15 minutes, 30 minutes, 1 hour

Controls the time window displayed in charts:
- **5 minutes** - High-resolution view for debugging
- **15 minutes** - Medium-term processing monitoring
- **30 minutes** - Long-running job overview
- **1 hour** - Full historical view (max retention)

**Note:** Metrics older than 1 hour are automatically cleaned up.

---

### Manual Refresh Button

**Location:** Top-right header (refresh icon)

Immediately fetches latest metrics without waiting for auto-refresh interval.

**Use Cases:**
- Quick status check when auto-refresh is disabled
- Force update after suspected data staleness

---

## API Endpoints

The dashboard uses the following tRPC endpoints:

### `metrics.getCurrentMetrics`
Returns current system snapshot:
```typescript
{
  timestamp: number;
  activeWorkers: number;
  totalMemoryMB: number;
  avgMemoryPerWorkerMB: number;
  totalChunksProcessed: number;
  totalRetries: number;
  totalRecyclings: number;
}
```

### `metrics.getMetricsHistory`
Returns time-series data for charts:
```typescript
{
  durationMs: number; // 1 min to 1 hour
}
// Returns: SystemMetricsSnapshot[]
```

### `metrics.getRecyclingEvents`
Returns recent worker recycling events:
```typescript
{
  limit: number; // 1-100, default 50
}
// Returns: WorkerRecyclingEvent[]
```

### `metrics.getRetryEvents`
Returns recent chunk retry events:
```typescript
{
  limit: number; // 1-100, default 50
}
// Returns: ChunkRetryEvent[]
```

---

## Metrics Collection

Metrics are collected by the `MemoryMetricsCollector` service:

**Storage:** In-memory with 1-hour retention  
**Cleanup:** Automatic every 5 minutes  
**Overhead:** Minimal (< 1% performance impact)

**Data Collected:**
- Worker memory usage (RSS, heap used, heap total, external)
- Worker recycling events (timestamp, reason, chunks processed)
- Chunk retry events (timestamp, attempt number, error, delay)
- System snapshots (active workers, total memory, chunks processed)

---

## Troubleshooting

### Dashboard shows "No data available"

**Cause:** No active processing or metrics collection not started  
**Solution:** Process a CSV file to generate metrics

### Charts not updating

**Cause:** Auto-refresh disabled or browser tab inactive  
**Solution:** Enable auto-refresh or click manual refresh button

### High retry rate (> 5%)

**Possible Causes:**
- Network issues (if using remote APIs)
- Memory pressure on client machine
- Bugs in normalization code

**Investigation:**
1. Check retry events table for error messages
2. Look for patterns in chunk IDs (specific data causing issues?)
3. Monitor memory usage chart for spikes

### Frequent worker recycling

**Possible Causes:**
- Memory leaks in worker code
- Large chunks exceeding memory limits
- Inefficient normalization logic

**Investigation:**
1. Check recycling events table for reasons
2. Monitor memory usage chart for growth patterns
3. Reduce chunk size if memory limit recyclings are common

### Workers stuck at 0

**Possible Causes:**
- No active processing
- Workers crashed during initialization
- Browser Web Worker API disabled

**Investigation:**
1. Check browser console for worker errors
2. Verify Web Workers are supported (modern browsers only)
3. Try processing a small CSV file to trigger workers

---

## Performance Optimization

### Recommended Settings

**For Large Files (100k+ rows):**
- Worker Pool Size: 4-8 (match CPU cores)
- Chunk Size: 2,000 rows
- Max Concurrent Chunks: 8
- Auto-Refresh: ON
- Time Range: 30 minutes or 1 hour

**For Small Files (< 10k rows):**
- Worker Pool Size: 2-4
- Chunk Size: 1,000 rows
- Max Concurrent Chunks: 4
- Auto-Refresh: ON
- Time Range: 5 or 15 minutes

### Memory Limits

**Per Worker:**
- Target: < 200 MB
- Warning: 300-500 MB
- Recycle: > 500 MB

**Total System:**
- 4 workers × 500 MB = 2 GB max
- Add 500 MB for browser overhead
- Recommended: 4 GB+ RAM for smooth operation

---

## Future Enhancements

Planned features for future versions:

1. **Export Metrics** - Download metrics as CSV/JSON
2. **Alerts** - Configurable alerts for high memory, retry rate
3. **Historical Comparison** - Compare current vs previous runs
4. **Worker Details** - Per-worker memory breakdown
5. **Custom Time Ranges** - User-defined time windows
6. **Metric Persistence** - Store metrics in database for long-term analysis

---

## Version History

| Version | Changes |
|---------|---------|
| v3.19.0 | Initial release with real-time monitoring dashboard |

---

## Related Documentation

- [VERSION_HISTORY.md](./VERSION_HISTORY.md) - Full version history
- [INFRASTRUCTURE_FIXES_v3.17.0.md](./INFRASTRUCTURE_FIXES_v3.17.0.md) - Error recovery and memory leak fixes
- [README.md](./README.md) - Project overview and setup
