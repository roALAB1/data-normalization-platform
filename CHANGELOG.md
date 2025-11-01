# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [3.2.2] - 2025-11-01

### Changed
- **3-Column Name Output**: Name processing now always outputs Full Name + First Name + Last Name
- Simplified deduplication logic - no longer skips redundant columns
- Works with any input format (Name only, First+Last only, or all three)
- Maximum flexibility for users who need different name formats

### Fixed
- Fixed issue where messy First/Last columns would overwrite clean split names
- Removed complex deduplication logic in favor of simpler 3-column approach

## [3.2.0] - 2025-11-01

### Added
- **Column Transformations Summary**: Option C implementation with expandable accordion
- Shows input→output mappings with color-coded badges (split, normalized, unchanged)
- Detailed descriptions for each transformation type
- Professional visual indicators for data quality

### Changed
- **Phone Number Output**: Now outputs digits-only format (no parentheses, spaces, hyphens)
- Updated PhoneEnhanced to use `digitsOnly` format for clean database storage
- Example: `(415) 555-1234` → `14155551234`

## [3.1.0] - 2025-11-01

### Added
- **Flexible Name Input/Output**: Accepts both full name OR first+last name columns
- NameSplitter utility for intelligent full name splitting
- Enhanced DataTypeDetector to recognize first_name/last_name columns
- Always outputs separate First Name and Last Name columns for consistency

### Changed
- Updated IntelligentBatchProcessor to handle both name input formats
- UI now communicates "Accepts full name OR first+last name columns"

## [3.0.3] - 2025-11-01

### Fixed
- **Responsive Layout**: Fixed text wrapping issues on half-screen browser windows
- Examples now stack vertically on small screens with proper truncation
- Added ellipsis for long text to prevent overflow
- Improved mobile and split-screen experience

## [3.0.2] - 2025-11-01

### Added
- **Visual Examples**: Added before/after transformation examples to all feature cards
- Names: "Dr. John Smith, PhD → John Smith"
- Emails: "John.Smith@GMAIL.COM → johnsmith@gmail.com"
- Phone Numbers: "(415) 555-1234 → +1 415-555-1234"
- Addresses: "123 MAIN STREET → 123 Main St"

### Changed
- Enhanced feature cards with concrete examples for better user understanding

## [3.0.1] - 2025-11-01

### Changed
- **Improved Feature Descriptions**: Made all capability descriptions more specific
- Names: "Strips 750+ credentials, honorifics, prefixes, suffixes" instead of vague "professional credentials"
- Names: "Nationality and ethnicity name order nuance detection" instead of just "Asian name order"
- All features now have concrete, informative descriptions

## [3.0.0] - 2025-11-01

### Added
- **Robust Server-Side Batch Processing System**
- JobQueue service with BullMQ for reliable job management
- BatchWorker for background processing with progress tracking
- IntelligentBatchProcessor with auto-detection and multi-column normalization
- Enhanced database schema (scheduledJobs, apiKeys tables)
- New API endpoints: submitBatch, getStats, retry, onJobUpdate (WebSocket)
- JobDashboardEnhanced UI with statistics cards and real-time updates
- Performance: 1,000-5,000 rows/sec with constant memory footprint
- Production-ready for power users with automated workflows

### Dependencies
- bull@4.12.0 (job queue)
- ioredis@5.3.2 (Redis client)

## [2.3.0] - 2025-11-01

### Added
- **Hero Section Feature Showcase**: Comprehensive landing page with detailed capabilities
- Large headline: "Enterprise-Scale Data Normalization"
- Feature grid showing Names, Emails, Phone Numbers, Addresses with bullet points
- Company Names banner with "Coming Soon" badge
- Professional, informative landing experience

## [2.2.0] - 2025-11-01

### Changed
- **Simplified Single-Page Platform**: Removed redundant individual demo pages
- Home route (/) now goes directly to Intelligent Normalization
- Simplified navigation to just "Batch Jobs"
- Cleaner, more focused user experience
- All capabilities accessible through one unified interface

## [2.1.0] - 2025-10-31

### Added
- **Enterprise-Scale CSV Streaming**
- StreamingCSVProcessor: PapaParse-based streaming for 100k+ row CSV files
- ChunkedNormalizer: Parallel processing with Web Worker pool (2-4 workers based on CPU cores)
- ProgressiveDownloader: Memory-efficient CSV download without storing all results in memory
- WorkerPoolManager: Generic Web Worker pool manager for efficient parallel processing
- Real-time Progress Tracking: Rows/sec, ETA, memory usage display during processing
- Pause/Resume/Cancel: Full control over long-running normalization jobs
- No Row Limit: Removed 10,000 row limit from Intelligent Normalization page
- Memory Management: Streaming architecture prevents browser memory issues with large datasets

### Changed
- Updated Intelligent Normalization UI with enterprise-scale messaging
- Improved progress indicators with detailed statistics
- Enhanced user experience for large dataset processing

### Technical Details
- Chunk size: 2,000 rows per chunk (configurable)
- Worker pool: Uses `navigator.hardwareConcurrency` (typically 4-8 workers)
- Memory efficient: Processes and discards chunks instead of storing everything
- Performance: 1,000-5,000 rows/second depending on CPU and data complexity

### Dependencies
- googleapis@164.1.0 (for future Google Sheets integration)
- airtable@0.12.2 (for future Airtable integration)

---

## Version History Summary

- **v3.2.2** - 3-column name output (Full Name + First + Last)
- **v3.2.0** - Column transformations summary + digits-only phone format
- **v3.1.0** - Flexible name input/output
- **v3.0.3** - Responsive layout fixes
- **v3.0.2** - Visual examples in feature cards
- **v3.0.1** - Improved feature descriptions
- **v3.0.0** - Robust server-side batch processing
- **v2.3.0** - Hero section feature showcase
- **v2.2.0** - Simplified single-page platform
- **v2.1.0** - Enterprise-scale CSV streaming
- **v1.4.1** - Navigation improvements
- **v1.4.0** - Enterprise email verification
- **v1.3.1** - Email CSV batch processing
- **v1.3.0** - Email normalization with validator.js
- **v1.2.0** - Phone normalization with libphonenumber
- **v1.1.0** - WebSocket tracking + Asian names + Context-aware parsing
- **v1.0.0** - 750+ credentials + Hybrid monorepo
- **v0.2.0** - Server-side processing
- **v0.1.0** - Initial web release
- **v0.0.1** - Python prototype

---

For detailed information about each release, see the [GitHub Releases](https://github.com/roALAB1/data-normalization-platform/releases) page.
