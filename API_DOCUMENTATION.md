# Data Normalization Platform - REST API Documentation

Version: v3.24.0

## Overview

The Data Normalization Platform provides a REST API for programmatic access to batch normalization services. This allows you to integrate data normalization into your CRM, data pipeline, or any other application.

## Base URL

```
Production: https://your-domain.manus.space/api
Development: http://localhost:3000/api
```

## Authentication

All API requests require an API key. Include your API key in the `X-API-Key` header:

```
X-API-Key: your_api_key_here
```

### Obtaining an API Key

1. Log in to the web interface
2. Navigate to Settings → API Keys
3. Click "Generate New API Key"
4. Copy and securely store your API key (it will only be shown once)

## Rate Limits

- **Job Creation**: 10 jobs per hour per user
- **Job Status Checks**: 100 requests per minute
- **Job Listing**: 50 requests per minute

## Endpoints

### 1. Submit Batch Normalization Job

Create a new batch normalization job.

**Endpoint**: `POST /v1/normalize/batch`

**Headers**:
```
Content-Type: application/json
X-API-Key: your_api_key_here
```

**Request Body**:
```json
{
  "type": "name",
  "data": "Name\nJohn Doe, MD\nJane Smith PhD\n...",
  "fileName": "customers.csv",
  "config": {
    "preserveAccents": false,
    "defaultCountry": "US"
  }
}
```

**Parameters**:
- `type` (required): One of `name`, `phone`, `email`, `company`, `address`
- `data` (required): Either:
  - CSV content as a string
  - Object with `url` field: `{ "url": "https://example.com/data.csv" }`
- `fileName` (optional): Name for the uploaded file
- `config` (optional): Normalization configuration
  - `preserveAccents` (boolean): Keep accented characters
  - `defaultCountry` (string): Default country code for phone numbers (e.g., "US")

**Response** (201 Created):
```json
{
  "jobId": 123,
  "status": "pending",
  "totalRows": 1000,
  "message": "Job created successfully. Processing 1000 rows.",
  "estimatedCompletionTime": "2024-01-01T12:01:00Z"
}
```

**Error Responses**:
- `400 Bad Request`: Invalid input parameters
- `401 Unauthorized`: Missing or invalid API key
- `429 Too Many Requests`: Rate limit exceeded

---

### 2. Get Job Status

Retrieve the current status and details of a job.

**Endpoint**: `GET /v1/jobs/:id`

**Headers**:
```
X-API-Key: your_api_key_here
```

**Response** (200 OK):
```json
{
  "id": 123,
  "status": "completed",
  "type": "name",
  "totalRows": 1000,
  "processedRows": 1000,
  "validRows": 950,
  "invalidRows": 50,
  "outputFileUrl": "https://s3.amazonaws.com/.../output.csv",
  "createdAt": "2024-01-01T12:00:00Z",
  "startedAt": "2024-01-01T12:00:05Z",
  "completedAt": "2024-01-01T12:01:00Z"
}
```

**Status Values**:
- `pending`: Job is queued and waiting to be processed
- `processing`: Job is currently being processed
- `completed`: Job finished successfully
- `failed`: Job encountered an error
- `cancelled`: Job was cancelled by user

**Error Responses**:
- `401 Unauthorized`: Missing or invalid API key
- `403 Forbidden`: You don't have access to this job
- `404 Not Found`: Job not found

---

### 3. List Jobs

List all jobs for the authenticated user.

**Endpoint**: `GET /v1/jobs`

**Headers**:
```
X-API-Key: your_api_key_here
```

**Query Parameters**:
- `limit` (optional): Number of jobs to return (default: 50, max: 100)
- `status` (optional): Filter by status (`pending`, `processing`, `completed`, `failed`, `cancelled`)

**Example**:
```
GET /v1/jobs?limit=20&status=completed
```

**Response** (200 OK):
```json
{
  "jobs": [
    {
      "id": 123,
      "status": "completed",
      "type": "name",
      "totalRows": 1000,
      "processedRows": 1000,
      "validRows": 950,
      "invalidRows": 50,
      "outputFileUrl": "https://s3.amazonaws.com/.../output.csv",
      "createdAt": "2024-01-01T12:00:00Z",
      "completedAt": "2024-01-01T12:01:00Z"
    }
  ],
  "total": 1
}
```

---

### 4. Cancel Job

Cancel a pending or processing job.

**Endpoint**: `DELETE /v1/jobs/:id`

**Headers**:
```
X-API-Key: your_api_key_here
```

**Response** (200 OK):
```json
{
  "message": "Job cancelled successfully"
}
```

**Error Responses**:
- `400 Bad Request`: Job cannot be cancelled (already completed/failed/cancelled)
- `401 Unauthorized`: Missing or invalid API key
- `403 Forbidden`: You don't have access to this job
- `404 Not Found`: Job not found

---

## Code Examples

### cURL

**Submit a job**:
```bash
curl -X POST https://your-domain.manus.space/api/v1/normalize/batch \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your_api_key_here" \
  -d '{
    "type": "name",
    "data": "Name\nJohn Doe, MD\nJane Smith PhD",
    "fileName": "customers.csv"
  }'
```

**Check job status**:
```bash
curl https://your-domain.manus.space/api/v1/jobs/123 \
  -H "X-API-Key: your_api_key_here"
```

**Download results**:
```bash
# Get job status to retrieve outputFileUrl
JOB_STATUS=$(curl -s https://your-domain.manus.space/api/v1/jobs/123 \
  -H "X-API-Key: your_api_key_here")

# Extract outputFileUrl and download
OUTPUT_URL=$(echo $JOB_STATUS | jq -r '.outputFileUrl')
curl -o results.csv "$OUTPUT_URL"
```

---

### Python

```python
import requests
import time

API_BASE_URL = "https://your-domain.manus.space/api"
API_KEY = "your_api_key_here"

headers = {
    "Content-Type": "application/json",
    "X-API-Key": API_KEY
}

# Submit a job
csv_data = """Name
John Doe, MD
Jane Smith PhD
Robert Johnson Jr."""

response = requests.post(
    f"{API_BASE_URL}/v1/normalize/batch",
    headers=headers,
    json={
        "type": "name",
        "data": csv_data,
        "fileName": "customers.csv",
        "config": {
            "preserveAccents": False
        }
    }
)

job = response.json()
job_id = job["jobId"]
print(f"Job created: {job_id}")

# Poll for completion
while True:
    response = requests.get(
        f"{API_BASE_URL}/v1/jobs/{job_id}",
        headers=headers
    )
    
    job_status = response.json()
    status = job_status["status"]
    
    print(f"Status: {status} - {job_status['processedRows']}/{job_status['totalRows']} rows")
    
    if status in ["completed", "failed", "cancelled"]:
        break
    
    time.sleep(5)  # Wait 5 seconds before checking again

# Download results
if job_status["status"] == "completed":
    output_url = job_status["outputFileUrl"]
    results = requests.get(output_url)
    
    with open("normalized_results.csv", "wb") as f:
        f.write(results.content)
    
    print(f"Results downloaded: {job_status['validRows']} valid, {job_status['invalidRows']} invalid")
```

---

### JavaScript/Node.js

```javascript
const axios = require('axios');
const fs = require('fs');

const API_BASE_URL = 'https://your-domain.manus.space/api';
const API_KEY = 'your_api_key_here';

const headers = {
  'Content-Type': 'application/json',
  'X-API-Key': API_KEY
};

async function normalizeData() {
  try {
    // Submit a job
    const csvData = `Name
John Doe, MD
Jane Smith PhD
Robert Johnson Jr.`;

    const createResponse = await axios.post(
      `${API_BASE_URL}/v1/normalize/batch`,
      {
        type: 'name',
        data: csvData,
        fileName: 'customers.csv',
        config: {
          preserveAccents: false
        }
      },
      { headers }
    );

    const jobId = createResponse.data.jobId;
    console.log(`Job created: ${jobId}`);

    // Poll for completion
    let jobStatus;
    while (true) {
      const statusResponse = await axios.get(
        `${API_BASE_URL}/v1/jobs/${jobId}`,
        { headers }
      );

      jobStatus = statusResponse.data;
      console.log(`Status: ${jobStatus.status} - ${jobStatus.processedRows}/${jobStatus.totalRows} rows`);

      if (['completed', 'failed', 'cancelled'].includes(jobStatus.status)) {
        break;
      }

      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
    }

    // Download results
    if (jobStatus.status === 'completed') {
      const resultsResponse = await axios.get(jobStatus.outputFileUrl);
      fs.writeFileSync('normalized_results.csv', resultsResponse.data);
      console.log(`Results downloaded: ${jobStatus.validRows} valid, ${jobStatus.invalidRows} invalid`);
    }
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

normalizeData();
```

---

## Performance

- **Throughput**: 1,000-5,000 rows/second
- **Maximum File Size**: 1,000,000 rows per job
- **Memory Efficient**: Constant memory usage regardless of file size
- **Concurrent Processing**: Multiple jobs can be processed simultaneously

## Best Practices

1. **Polling Interval**: Check job status every 5-10 seconds (not more frequently)
2. **Error Handling**: Always check for error responses and handle them gracefully
3. **Timeouts**: Set appropriate timeouts for large jobs (estimate: 1000 rows/sec)
4. **Webhooks** (Coming Soon): Register a webhook URL to receive notifications when jobs complete

## Webhook Support (Coming Soon)

Future releases will support webhook callbacks for job completion:

```json
{
  "type": "name",
  "data": "...",
  "webhookUrl": "https://your-app.com/webhook/normalization-complete",
  "webhookSecret": "your_webhook_secret"
}
```

## Support

For API support, issues, or feature requests:
- Email: support@manus.im
- Documentation: https://help.manus.im
- GitHub Issues: https://github.com/roALAB1/data-normalization-platform/issues

## Changelog

### v3.24.0 (Current)
- Initial REST API release
- Support for batch job submission
- Job status tracking and listing
- Job cancellation
- S3-backed file storage
- Rate limiting

### Upcoming Features
- Webhook support for job completion
- Batch job scheduling (cron-based)
- Advanced filtering and search
- Job result pagination
- Bulk job operations
