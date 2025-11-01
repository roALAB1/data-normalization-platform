# Server-Side Batch Processing System

## Overview

The batch processing system provides robust, server-side normalization for large CSV files (up to 1M rows) with intelligent column type detection, background processing, and comprehensive job management.

## Architecture

### Components

1. **JobQueue** (`server/queue/JobQueue.ts`)
   - BullMQ-based queue manager
   - Redis-backed job storage
   - Automatic retry with exponential backoff
   - Job lifecycle management

2. **BatchWorker** (`server/queue/BatchWorker.ts`)
   - Background worker process
   - Concurrent job processing (configurable)
   - Progress tracking and reporting
   - Error handling and recovery

3. **IntelligentBatchProcessor** (`server/services/IntelligentBatchProcessor.ts`)
   - Automatic column type detection
   - Multi-column normalization
   - Confidence-based type assignment
   - Streaming CSV processing

4. **Enhanced Job Dashboard** (`client/src/pages/JobDashboardEnhanced.tsx`)
   - Job submission interface
   - Real-time status updates
   - Statistics and analytics
   - Download results

## Features

### Intelligent Processing

- **Auto-Detection**: Automatically identifies column types (name, email, phone, address)
- **Multi-Column**: Normalizes all columns in a single pass
- **Confidence Scoring**: Uses confidence thresholds to ensure accuracy
- **Column Name Hints**: Leverages column names for better detection

### Queue System

- **Background Processing**: Jobs run asynchronously without blocking
- **Retry Mechanism**: Failed jobs automatically retry up to 3 times
- **Concurrency Control**: Process multiple jobs simultaneously
- **Rate Limiting**: Prevents system overload

### Job Management

- **Status Tracking**: pending → processing → completed/failed
- **Progress Updates**: Real-time row count and percentage
- **Error Reporting**: Detailed error messages for failed jobs
- **Result Storage**: S3-backed file storage for inputs and outputs

## API Endpoints

### Submit Batch Job

```typescript
trpc.jobs.submitBatch.mutate({
  fileContent: string,  // CSV content
  fileName: string,     // Original filename
  config: {
    preserveAccents?: boolean,
    defaultCountry?: string,
  }
})
```

**Returns:**
```typescript
{
  jobId: number,
  totalRows: number,
  message: string
}
```

### Get Job Statistics

```typescript
trpc.jobs.getStats.useQuery()
```

**Returns:**
```typescript
{
  total: number,
  completed: number,
  failed: number,
  processing: number,
  successRate: number  // percentage
}
```

### List Jobs

```typescript
trpc.jobs.list.useQuery({ limit: 50 })
```

**Returns:** Array of job objects with full details

### Retry Failed Job

```typescript
trpc.jobs.retry.mutate({ jobId: number })
```

### Cancel Pending Job

```typescript
trpc.jobs.cancel.mutate({ jobId: number })
```

### Real-Time Updates (WebSocket)

```typescript
trpc.jobs.onJobUpdate.useSubscription({ jobId: number })
```

Polls job status every 2 seconds and emits updates until completion.

## Database Schema

### Jobs Table

| Column | Type | Description |
|--------|------|-------------|
| id | int | Primary key |
| userId | int | User who created the job |
| type | enum | Job type (intelligent, name, phone, email, address) |
| status | enum | Current status (pending, processing, completed, failed, cancelled) |
| totalRows | int | Total rows in input file |
| processedRows | int | Rows processed so far |
| validRows | int | Rows that passed validation |
| invalidRows | int | Rows that failed validation |
| inputFileKey | varchar | S3 key for input file |
| outputFileKey | varchar | S3 key for output file |
| config | json | Job configuration |
| errorMessage | text | Error details if failed |
| startedAt | timestamp | When processing started |
| completedAt | timestamp | When processing finished |
| createdAt | timestamp | When job was created |

### Scheduled Jobs Table

| Column | Type | Description |
|--------|------|-------------|
| id | int | Primary key |
| userId | int | User who created the schedule |
| name | varchar | User-friendly name |
| type | enum | Job type |
| cronExpression | varchar | Cron schedule (e.g., "0 9 * * 1") |
| config | json | Job configuration |
| enabled | boolean | Whether schedule is active |
| lastRun | timestamp | Last execution time |
| nextRun | timestamp | Next scheduled execution |

### API Keys Table

| Column | Type | Description |
|--------|------|-------------|
| id | int | Primary key |
| userId | int | Key owner |
| key | varchar | API key (hashed) |
| name | varchar | User-friendly name |
| permissions | json | Allowed operations |
| expiresAt | timestamp | Optional expiration |

## Configuration

### Environment Variables

```bash
# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379

# Worker Configuration
WORKER_CONCURRENCY=2  # Number of concurrent jobs

# Job Limits
MAX_FILE_SIZE=1000000  # Maximum rows per file
```

### Queue Options

```typescript
{
  attempts: 3,  // Retry failed jobs 3 times
  backoff: {
    type: 'exponential',
    delay: 5000,  // Start with 5 second delay
  },
  removeOnComplete: {
    age: 24 * 3600,  // Keep completed jobs for 24 hours
    count: 1000,
  },
  removeOnFail: {
    age: 7 * 24 * 3600,  // Keep failed jobs for 7 days
  },
}
```

## Usage Examples

### Submit a Batch Job

```typescript
const file = document.getElementById('fileInput').files[0];
const content = await file.text();

const result = await trpc.jobs.submitBatch.mutate({
  fileContent: content,
  fileName: file.name,
  config: {
    preserveAccents: false,
    defaultCountry: 'US',
  },
});

console.log(`Job ${result.jobId} created for ${result.totalRows} rows`);
```

### Monitor Job Progress

```typescript
const subscription = trpc.jobs.onJobUpdate.useSubscription(
  { jobId: 123 },
  {
    onData: (job) => {
      console.log(`Progress: ${job.processedRows}/${job.totalRows}`);
      if (job.status === 'completed') {
        console.log('Job completed!', job.outputFileUrl);
      }
    },
  }
);
```

### Download Results

```typescript
const job = await trpc.jobs.get.query({ jobId: 123 });

if (job.status === 'completed' && job.outputFileUrl) {
  window.location.href = job.outputFileUrl;
}
```

## Performance

### Benchmarks

- **Processing Speed**: 1,000-5,000 rows/second
- **Memory Usage**: Constant (streaming architecture)
- **Concurrency**: 2-4 jobs simultaneously (configurable)
- **Max File Size**: 1,000,000 rows

### Optimization Tips

1. **Increase Worker Concurrency**: Set `WORKER_CONCURRENCY=4` for faster processing
2. **Use Batch Submission**: Submit multiple files as separate jobs for parallel processing
3. **Monitor Queue Stats**: Use `jobQueue.getStats()` to track performance
4. **Clean Up Old Jobs**: Run `jobQueue.cleanup()` periodically

## Troubleshooting

### Job Stuck in Pending

- Check if worker process is running
- Verify Redis connection
- Check worker logs for errors

### Job Failed with Error

- Check `errorMessage` field in job record
- Review worker logs for stack traces
- Verify input file format (must be valid CSV)

### Slow Processing

- Increase `WORKER_CONCURRENCY`
- Check Redis performance
- Verify S3 upload/download speeds

## Future Enhancements

### Planned Features

- [ ] Scheduled jobs (cron-based recurring normalization)
- [ ] Email verification (MX/SMTP checks)
- [ ] Deduplication engine (cross-file duplicate detection)
- [ ] Data quality reports (detailed analytics)
- [ ] API key management (programmatic access)
- [ ] Webhook notifications (job completion alerts)

### Advanced Features

- [ ] Multi-file batch processing
- [ ] Custom normalization rules
- [ ] Data enrichment from external APIs
- [ ] Export to multiple formats (JSON, Excel, Parquet)
- [ ] Integration with data warehouses (Snowflake, BigQuery)

## Support

For issues or questions about the batch processing system, please refer to:

- Main documentation: `/docs/README.md`
- API documentation: `/docs/API.md`
- Architecture guide: `/docs/STREAMING_ARCHITECTURE.md`
