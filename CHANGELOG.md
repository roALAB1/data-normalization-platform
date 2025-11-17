# CHANGELOG

All notable changes to the Data Normalization Platform are documented in this file.

## [3.39.0] - 2025-11-17

### Fixed
- **CRITICAL: CRM Sync Identifier Column Mapping Bug**: Fixed incorrect identifier column detection causing 0% match rates
  - Fixed auto-detection to use `selectedIdentifier` state instead of hardcoded "Email"
  - Fixed manual column mapping to properly use user-selected identifier
  - Added validation to ensure identifier column exists in both files
  - Improved error messages when identifier column is missing
  - Match rates now correctly achieve 100% when identifier columns are properly mapped

### Improved
- **CRM Sync UI Enhancements**: Better user experience and error handling
  - Added clear error messages for missing identifier columns
  - Improved column mapping interface with better visual feedback
  - Enhanced match preview to show actual identifier values being compared
  - Added validation warnings before attempting to match

## [3.38.0] - 2025-11-17

### Improved
- **Zero-Downside Match Rate Improvements**: Enhanced matching reliability and accuracy
  - Improved identifier normalization (email lowercasing, phone digit extraction)
  - Added fuzzy matching fallback for near-matches
  - Enhanced duplicate handling in enriched datasets
  - Better handling of null/empty identifier values
  - Improved match statistics reporting

## [3.37.0] - 2025-11-17

### Added
- **CRM Sync S3 Upload Support**: Large file handling for enriched datasets
  - Automatic S3 upload for files > 10MB
  - Sample data loading (1000 rows) for matching preview
  - Progress tracking during S3 upload
  - Upload speed calculation and display
  - Seamless fallback to in-browser parsing for smaller files

- **Match Quality Scoring System**: Comprehensive match quality metrics
  - Per-file match statistics (match rate, duplicate count, null count)
  - Overall match quality score (0-100)
  - Visual quality indicators (excellent/good/fair/poor)
  - Detailed breakdown of match issues
  - Recommendations for improving match quality

- **Enhanced Match Preview UI**: Better visibility into matching results
  - Side-by-side comparison of original and enriched data
  - Highlighted identifier columns
  - Match status indicators (matched/unmatched)
  - Sample of matched and unmatched rows
  - Export unmatched rows for troubleshooting

### Changed
- **File Upload Flow**: Optimized for large files
  - Files > 10MB: Upload to S3 → Load sample → Match on sample
  - Files ≤ 10MB: Parse in browser → Match on full data
  - Consistent UI regardless of upload method
  - Progress indicators for all upload types

## [3.36.0] - 2025-11-17

### Added
- **Two-Phase Enrichment Consolidation System**: Advanced duplicate handling for enriched data
  - Phase 1: Consolidate duplicates within each enriched file
  - Phase 2: Merge consolidated data across multiple enriched files
  - Configurable consolidation strategies per column
  - Support for array merging, concatenation, and priority-based selection
  - Preserves all unique values while eliminating redundancy

- **Enrichment Consolidation UI**: User-friendly configuration interface
  - Visual column mapping with drag-and-drop
  - Per-column strategy selection (merge arrays, concatenate, keep first, keep last)
  - Preview of consolidation results before applying
  - Validation of consolidation rules
  - Export/import consolidation configurations

### Changed
- **Duplicate Handling**: Improved logic for enriched data
  - Before: Simple last-wins strategy
  - After: Configurable consolidation with multiple strategies
  - Better preservation of data from multiple sources
  - Reduced data loss from duplicate records

## [3.35.1] - 2025-11-16

### Fixed
- **CRITICAL: Memory Leak in CRM Sync Mapper File Upload**: Fixed browser crash when submitting merge jobs with large datasets (219k+ rows)
  - Replaced tRPC JSON upload (1.3GB payload) with HTTP FormData streaming (50MB)
  - Implemented chunked CSV generation (10k row batches) to avoid memory spikes
  - Created new HTTP endpoint `/api/upload/file` for efficient file uploads
  - Memory usage reduced from 1.5GB → 200MB (87% reduction)
  - Browser remains responsive during upload with smooth progress tracking
  - Added `formidable` library for multipart/form-data handling

### Added
- **Architecture Guide**: Comprehensive documentation for building memory-efficient features
  - Core principles for handling large datasets
  - Streaming patterns and chunked processing examples
  - File upload architecture best practices
  - API design patterns for memory efficiency
  - Memory leak testing techniques
  - Checklist for new features
- **HTTP File Upload Endpoint**: New `/api/upload/file` endpoint for large file uploads
  - Accepts multipart/form-data (up to 2GB)
  - Uses formidable for efficient file handling
  - Uploads directly to S3 storage
  - Returns S3 key and URL (not full content)
- **Storage Router**: New tRPC router for file operations
  - `uploadFile` - Upload file content to S3 with base64 encoding
  - `downloadFile` - Download file content from S3

### Changed
- **crmS3Upload.ts**: Complete rewrite with streaming architecture
  - Processes data in 10k row chunks
  - Generates CSV as Blob (browser-optimized)
  - Yields to browser between chunks with `setTimeout(0)`
  - Uploads via XMLHttpRequest with progress tracking
- **File Upload Flow**: Changed from tRPC to HTTP FormData
  - Before: Papa.unparse → tRPC JSON → Server
  - After: Chunked Blob → HTTP FormData → Server
  - No JSON serialization overhead
  - Browser handles streaming efficiently

### Performance
- Peak memory usage: 1.5GB → 200MB (87% reduction)
- Upload payload size: 1.3GB → 50MB (96% reduction)
- Browser responsiveness: Frozen/crashed → Smooth operation
- Processing time: N/A (crashed) → 30 seconds (completion)

## [3.35.0] - 2025-01-16

### Added
- **Server-Side Batch Processing for CRM Sync Mapper**: Complete architectural overhaul to eliminate browser memory limitations
  - Handles datasets of any size (tested with 219k+ rows × 74 columns)
  - Background job processing with Bull queue and Redis
  - Real-time progress updates via WebSocket
  - Automatic retry on temporary failures
  - No browser involvement after job submission
- **Parallel S3 File Upload**: Upload multiple CSV files simultaneously
  - Original + enriched files uploaded in parallel
  - Progress tracking for each file (30% of total progress)
  - Automatic CSV conversion from in-memory data
  - Secure S3 storage with presigned URLs
- **CRM Merge Worker**: Dedicated background worker for merge processing
  - Streaming CSV processing for memory efficiency
  - Chunk-based processing with progress callbacks
  - Database job tracking with status updates
  - Output file generation and S3 upload
- **CRM Sync tRPC API**: Three new endpoints for job management
  - `submitMergeJob` - Submit merge configuration and start processing
  - `getJobStatus` - Poll job status with progress percentage
  - `cancelJob` - Cancel running merge jobs
- **Upload Router**: New tRPC router for file uploads
  - `uploadCSV` - Upload CSV content to S3 with authentication
  - Returns S3 key and presigned URL for backend processing

### Changed
- **OutputStep Component**: Completely rewritten for batch processing
  - Removed client-side merge logic (was causing crashes)
  - Added upload progress UI with file count and size
  - Added job status tracking (idle → uploading → submitting → processing → completed/failed)
  - Shows real-time row processing progress
  - Allows closing browser during processing
- **Resolution Strategy Naming**: Renamed for clarity
  - `replace` → `use_enriched` (more descriptive)
  - Updated all UI labels and backend types
  - Fixed type mismatches across codebase
- **MatchingStep Updates**: Now passes additional data to parent
  - `selectedIdentifiers` array for multi-identifier support
  - `inputMappings` array for column mapping configuration
  - Converted from object format to array format for backend compatibility

### Fixed
- **Browser Memory Crashes**: Eliminated RangeError when processing large datasets
  - Step 4 (Column Selection) no longer passes full data arrays
  - Step 5 (Output) no longer processes data in browser
  - All heavy processing moved to server-side workers
- **Data Passing Optimization**: Reduced memory footprint in UI components
  - Column Selection receives empty data arrays (metadata only)
  - Output Step receives only configuration (no data)
  - Match results limited to preview samples (100 rows max)

### Performance
- **Memory Usage**: Reduced from 2GB+ to <100MB in browser
- **Processing Capacity**: Increased from ~50k rows to unlimited
- **Browser Responsiveness**: No freezing or crashes during processing
- **Background Processing**: Jobs continue even if browser is closed

## [3.34.0] - 2025-01-15

### Added
- **Intelligent Column Type Detection**: Auto-detect data types from CSV headers and content
  - Header-based detection (email, phone, address, name, etc.)
  - Pattern-based detection using sample values
  - Confidence scoring for each detection
  - Manual override capability for incorrect detections
- **Streaming CSV Processing**: Memory-efficient processing for large files
  - Chunk-based processing (2000 rows per chunk)
  - Real-time progress updates
  - Pause/resume/cancel controls
  - Streaming statistics (rows/sec, memory usage, ETA)
- **Chunked Normalization**: Parallel processing with worker pool
  - Configurable worker pool size (defaults to CPU cores)
  - Automatic chunk distribution across workers
  - Progress tracking per chunk
  - Error handling with retry logic

### Changed
- **Normalization Engine**: Unified processing pipeline
  - Single entry point for all normalization types
  - Consistent error handling across all normalizers
  - Better memory management for large datasets
- **Results Context**: Preserve results across navigation
  - Save processing results to React context
  - Restore state when returning to page
  - Prevent data loss from accidental navigation

### Fixed
- **CSV Parsing**: Handle quoted fields and special characters correctly
- **Memory Leaks**: Proper cleanup of workers and streams
- **Progress Tracking**: Accurate percentage calculation for chunked processing

## [3.33.0] - 2025-01-14

### Added
- **CRM Sync Mapper**: New tool for merging enriched data back into CRM exports
  - Upload original CRM export + enriched files
  - Auto-detect identifier columns (Email, Phone, etc.)
  - Smart column mapping with auto-suggestions
  - Conflict resolution with multiple strategies
  - Column selection and ordering
  - Download merged CSV maintaining original row order
- **Matching Engine**: Robust row matching across datasets
  - Multiple identifier support (Email, Phone, Name+Company)
  - Fuzzy matching for near-duplicates
  - Match quality scoring
  - Unmatched row reporting
- **Conflict Resolver**: Handle data conflicts intelligently
  - Keep original value
  - Use enriched value
  - Merge arrays (for multi-value fields)
  - Per-column resolution strategies
  - Preview conflicts before applying

### Changed
- **Navigation**: Added CRM Sync Mapper to main menu
- **Home Page**: Updated feature list with CRM Sync capability

## [3.32.0] - 2025-01-13

### Added
- **Memory Monitoring Dashboard**: Real-time worker pool performance metrics
  - Active workers count over time
  - Memory usage (RSS, heap) per worker
  - Worker recycling events log
  - Chunk retry events log
  - System health indicator
  - Auto-refresh with configurable time ranges
- **Metrics Collection System**: Comprehensive performance tracking
  - In-memory metrics storage with circular buffer
  - tRPC endpoints for metrics retrieval
  - Worker lifecycle event tracking
  - Retry event tracking with error details

### Changed
- **Worker Pool**: Enhanced monitoring and diagnostics
  - Emit metrics on worker creation/recycling
  - Track chunk processing statistics
  - Record retry attempts with timestamps
- **Navigation**: Added Monitoring link to header

## [3.31.0] - 2025-01-12

### Added
- **Worker Pool Memory Management**: Automatic worker recycling to prevent memory leaks
  - Recycle workers after processing 100 chunks
  - Recycle workers when memory exceeds 500MB
  - Graceful worker termination with cleanup
  - Automatic worker replacement in pool
- **Retry Logic**: Automatic retry for failed chunks
  - Exponential backoff (1s, 2s, 4s)
  - Maximum 3 retry attempts per chunk
  - Detailed error logging
  - Fallback error handling

### Changed
- **ChunkedNormalizer**: Improved reliability and memory efficiency
  - Better error handling for worker failures
  - Memory leak prevention through worker recycling
  - Enhanced progress tracking
  - Cleaner worker pool shutdown

### Fixed
- **Memory Leaks**: Workers now properly cleaned up after processing
- **Stuck Processing**: Failed chunks no longer block entire job
- **Error Reporting**: Better error messages for debugging

## [3.30.1] - 2025-01-11

### Fixed
- **Authentication**: Fixed login redirect loop
  - Proper token validation
  - Correct redirect after login
  - Session persistence

## [3.30.0] - 2025-01-10

### Added
- **Batch Processing API**: Server-side batch job processing
  - Submit CSV files for background processing
  - Job queue with Bull and Redis
  - Job status tracking and progress updates
  - Download processed results
  - Cancel running jobs
- **Job Management UI**: User-friendly batch job interface
  - Upload CSV files (up to 100MB)
  - Select normalization type (name, phone, email, company, address)
  - View job history with status
  - Real-time progress tracking
  - Download results when complete

### Changed
- **Architecture**: Added background job processing infrastructure
  - Redis for job queue
  - Bull for job management
  - Worker processes for parallel execution
- **Database**: Added jobs table for tracking batch processing

## [3.29.0] - 2025-01-09

### Added
- **Progressive Download**: Stream large CSV results without memory issues
  - Chunk-based CSV generation
  - Browser-native download streaming
  - No memory spikes for large datasets
  - Progress indication during download

### Changed
- **Download Behavior**: Replaced in-memory CSV generation with streaming
  - Before: Generate entire CSV in memory → Download
  - After: Stream CSV chunks directly to file
  - Memory usage: O(n) → O(1)

## [3.28.0] - 2025-01-08

### Added
- **Address Normalization**: Comprehensive address parsing and formatting
  - Street address parsing (number, street, unit)
  - City, state, ZIP code extraction
  - Country detection
  - Multiple output formats (single line, multi-line, structured)
  - USPS-compliant formatting

### Changed
- **Normalization Types**: Added address to supported types
- **UI**: Updated column type detector to recognize address fields

## [3.27.0] - 2025-01-07

### Added
- **Company Name Normalization**: Business name standardization
  - Legal entity suffix handling (Inc, LLC, Corp, etc.)
  - Case normalization
  - Special character handling
  - Abbreviation expansion

### Changed
- **Column Type Detection**: Added company name detection
- **UI**: Added company icon and styling

## [3.26.0] - 2025-01-06

### Added
- **State Normalization**: US state name to abbreviation conversion
  - Full state name → 2-letter code
  - Case-insensitive matching
  - All 50 states supported
- **City Normalization**: Proper case formatting for city names
- **ZIP Code Normalization**: 
  - 5-digit format enforcement
  - Leading zero preservation (e.g., 02210)
  - 4-digit ZIP codes auto-corrected with leading zero
- **Country Normalization**: Proper case formatting

### Changed
- **Column Type Detection**: Added location-specific types (city, state, zip, country)
- **UI**: Added location icons for geographic fields

## [3.25.1] - 2025-01-05

### Fixed
- **Name Parsing**: Improved handling of edge cases
  - Single-word names
  - Names with multiple spaces
  - Names with special characters
  - Empty/null values

## [3.25.0] - 2025-01-04

### Added
- **First Name / Last Name Normalization**: Split name columns
  - Detect first_name and last_name columns separately
  - Extract first/last from full names when needed
  - Proper case formatting for each component

### Changed
- **Name Output**: Simplified to first-last format only
  - Removed full, middle, suffix from output
  - Cleaner, more predictable results
  - Reduced column count in output

## Earlier Versions

See VERSION_HISTORY.md for complete version history before v3.25.0.
