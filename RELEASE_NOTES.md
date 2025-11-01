# Release Notes - v3.2.2

## 3-Column Name Output

This release simplifies name processing with a flexible 3-column output format that works with any input structure.

### What's New

**Always 3 Clean Columns**
- Full Name (clean) - "Jennifer Berman"
- First Name (clean) - "Jennifer"
- Last Name (clean) - "Berman"

**Works With Any Input**
- Single "Name" column → splits and normalizes
- Separate "First Name" + "Last Name" columns → normalizes each
- All three columns present → uses best available data

**Simpler Logic**
- Removed complex deduplication logic
- More predictable output format
- Maximum flexibility for downstream use

### Example

**Input CSV:**
```
Name,First Name,Last Name,Company
"Jennifer R. Berman, MD",Jennifer R.,"Berman, MD",Acme Corp
```

**Output CSV:**
```
Full Name,First Name,Last Name,Company
Jennifer Berman,Jennifer,Berman,Acme Corp
```

### Benefits

- **Flexibility**: Users can choose full name OR first+last based on their needs
- **Consistency**: Always get the same 3 columns regardless of input format
- **Simplicity**: No complex deduplication rules to understand
- **Data Enrichment**: Single name column becomes three normalized columns

---

# Previous Releases

## v3.2.0 - Column Transformations & Phone Format

**Column Transformations Summary**
- Option C implementation with expandable accordion
- Shows input→output mappings after processing
- Color-coded badges (split, normalized, unchanged)
- Detailed descriptions for each transformation

**Digits-Only Phone Numbers**
- Phone output now contains only digits (no formatting)
- Example: `(415) 555-1234` → `14155551234`
- Clean format for database storage and API calls

## v3.1.0 - Flexible Name Processing

**Flexible Input Formats**
- Accepts full name column OR first+last name columns
- NameSplitter utility for intelligent splitting
- Always outputs First Name + Last Name columns

## v3.0.0 - Server-Side Batch Processing

**Robust Batch System**
- BullMQ job queue with Redis backend
- Background workers for large file processing
- WebSocket real-time progress updates
- Job history and retry functionality
- API endpoints for programmatic access

**Performance**
- 1,000-5,000 rows/second processing speed
- Constant memory footprint
- Handles 1M+ row files

## v2.3.0 - Hero Section

**Feature Showcase**
- Comprehensive landing page
- Detailed capability descriptions
- Visual examples for each data type
- Professional, informative design

## v2.2.0 - Platform Simplification

**Single-Page Focus**
- Removed redundant demo pages
- Unified interface for all normalization types
- Cleaner navigation
- Better user experience

## v2.1.0 - Enterprise Streaming

**100k+ Row Support**
- PapaParse streaming architecture
- Web Worker parallel processing
- Progressive CSV download
- Real-time progress tracking
- Pause/Resume/Cancel controls
- No row limits

---

## Upgrade Guide

### From v3.2.0 to v3.2.2

**Name Output Changes**
- Previous: 2 columns (First Name, Last Name)
- Now: 3 columns (Full Name, First Name, Last Name)

**Action Required**
- Update any downstream processes expecting 2 columns
- Full Name column is now available for display purposes
- First Name + Last Name still available for database storage

**Phone Format Changes**
- Already implemented in v3.2.0
- Phone numbers are digits-only (no formatting)
- No action required if upgrading from v3.2.0+

### From v2.x to v3.x

**Server-Side Batch Processing**
- New JobQueue system requires Redis
- Install Redis: `brew install redis` (Mac) or `sudo apt install redis` (Linux)
- Start Redis: `redis-server`

**Database Schema**
- New tables: `scheduledJobs`, `apiKeys`
- Run migrations: `pnpm db:push`

**Dependencies**
- Install new packages: `pnpm install`
- bull@4.12.0, ioredis@5.3.2, date-fns@3.0.0

---

## Technical Details

### Architecture

**Client-Side (Small Files)**
- StreamingCSVProcessor with PapaParse
- Web Workers for parallel processing
- ProgressiveDownloader for memory-efficient output
- Supports up to 500k rows comfortably

**Server-Side (Large Files)**
- BullMQ job queue with Redis
- Background workers
- S3 storage for input/output files
- Supports 1M+ rows

### Performance

**Processing Speed**
- 1,000-5,000 rows/second (depends on CPU and data complexity)
- Parallel processing with worker pools
- Constant memory footprint

**Memory Usage**
- Client: ~100-200MB for 100k rows
- Server: ~50-100MB per worker
- Streaming architecture prevents memory bloat

### Browser Compatibility

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

Requires Web Workers and ES2020 support.

---

## Known Issues

- TypeScript compilation warnings (tsconfig.node.json) - does not affect functionality
- Redis connection errors in logs - job queue will retry automatically
- Large files (1M+ rows) should use server-side batch processing for best performance

---

## Roadmap

### v3.3.0 (Planned)
- Company name normalization
- Legal suffix handling (Inc, LLC, Corp)
- Alias matching

### v3.4.0 (Planned)
- Scheduled recurring jobs
- API key management UI
- Webhook notifications

### v4.0.0 (Planned)
- Google Sheets integration
- Airtable integration
- Advanced deduplication
- Data quality scoring

---

## Support

For issues, questions, or feature requests:
- GitHub Issues: https://github.com/roALAB1/data-normalization-platform/issues
- Documentation: See README.md and docs/ folder
- Help: https://help.manus.im

---

## Contributors

Built with ❤️ by the Manus team.

Special thanks to all contributors and users providing feedback!
