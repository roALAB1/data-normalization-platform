# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [3.6.0] - 2025-11-01

### Added
- **Location Normalization**: New `LocationNormalizer` module that converts "City, State, Country" format to "City, ST" format
  - Converts full state names to 2-letter abbreviations (e.g., "California" → "CA")
  - Removes country names (United States, USA, etc.)
  - Auto-detection for location columns
- **Separate Name Column Types**: Added distinct handling for different name column types
  - `first-name`: Extracts and returns first name only
  - `last-name`: Extracts and returns last name only
  - `name`: Returns full normalized name
- **Development Tools**: Added `dev:clean` script to package.json for easy cache clearing
- **Troubleshooting Documentation**: Created `DEV_TROUBLESHOOTING.md` guide for common development issues

### Fixed
- **Phone Number Format**: Changed from digits-only to E.164 format (with + prefix) to match enrichment tool requirements
  - Example: `14155551234` → `+14155551234`
- **React Duplicate Key Warnings**: Fixed all duplicate key warnings in IntelligentNormalization component
  - Column mappings list
  - Table headers
  - Table body cells
- **Worker Caching Issues**: Implemented aggressive cache-busting for worker files
  - Timestamp-based worker URL loading
  - Forces fresh code on every page load
- **Name Column Output**: Fixed worker to properly output formatted names instead of literal "first-last" string

### Changed
- **Column Type Detection**: Enhanced detection to distinguish between full name, first name, and last name columns
- **Worker Version**: Updated to v3.6.0-FINAL with all normalization improvements

### Documentation
- Created `ENRICHMENT_IMPLEMENTATION_STATUS.md` showing compliance with enrichment tool requirements
- Created `RELEASE_NOTES_v3.6.0.md` with detailed feature descriptions
- Created `RELEASE_NOTES_v3.5.3.md` documenting cache-busting fix
- Updated `todo.md` to track all v3.6.0 enhancements

## [2.1.0] - 2025-10-31

### Added - Enterprise-Scale CSV Streaming
- **StreamingCSVProcessor**: PapaParse-based streaming for 100k+ row CSV files
- **ChunkedNormalizer**: Parallel processing with Web Worker pool (2-4 workers based on CPU cores)
- **ProgressiveDownloader**: Memory-efficient CSV download without storing all results in memory
- **WorkerPoolManager**: Generic Web Worker pool manager for efficient parallel processing
- **Real-time Progress Tracking**: Rows/sec, ETA, memory usage display during processing
- **Pause/Resume/Cancel**: Full control over long-running normalization jobs
- **No Row Limit**: Removed 10,000 row limit from Intelligent Normalization page
- **Memory Management**: Streaming architecture prevents browser memory issues with large datasets

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

## [1.4.1] - 2025-10-30

### Fixed
- Removed non-functional "Old Version" button from Phone Demo page
- Fixed navigation flow - users can now navigate directly between all pages

### Added
- Cross-page navigation on all demo pages (Home, Phone Demo, Email Demo, Batch Jobs)
- Consistent header navigation components across all pages

### Changed
- Updated navigation buttons to use small size for compact display
- Improved user experience with seamless navigation flow

## [1.4.0] - 2025-10-30

### Added
- **Enterprise Email Verification System** using @devmehq/email-validator-js
  - MX record validation (DNS lookup for mail exchange servers)
  - SMTP connection testing (verify server reachability)
  - Mailbox verification (RCPT TO command)
  - Disposable email detection (temporary/throwaway services)
  - Free provider detection (Gmail, Yahoo vs corporate)
  - Role-based email detection (admin@, info@, support@)
  - Catch-all domain detection (domains accepting all emails)
  - Email reputation scoring (0-100 based on all checks)
- Server-side API endpoints for email verification
  - `/api/emails/verify` - Single email verification
  - `/api/emails/verify-batch` - Batch verification (up to 100 emails)
  - `/api/emails/check-disposable` - Quick disposable check
- EmailVerification class with comprehensive checks
- Batch verification with concurrency control (10 concurrent checks)
- Timeout handling and retry logic for SMTP servers

### Changed
- Enhanced email verification infrastructure with enterprise-grade features
- Improved error handling for email verification API

## [1.3.1] - 2025-10-29

### Added
- CSV batch processing for email normalization
  - Upload CSV files with up to 10,000 emails
  - Parse CSV with automatic header detection
  - Display results table with original vs normalized emails
  - Provider breakdown statistics
  - Download normalized CSV with all metadata
  - Progress indicator for large files
  - Invalid email handling with error messages

### Changed
- Email Demo page now supports both Single and Batch modes
- Enhanced statistics display with provider breakdown

## [1.3.0] - 2025-10-29

### Added
- **Email Normalization** using validator.js (23.7k stars, 8-10M weekly downloads)
  - RFC 5322 compliant email validation
  - Provider detection (Gmail, Outlook, Yahoo, iCloud, ProtonMail, AOL, Fastmail, Zoho)
  - Plus tag extraction and removal (+spam, +newsletter)
  - Dot removal (Gmail-specific: john.doe@gmail.com → johndoe@gmail.com)
  - Case normalization
  - Provider-specific normalization rules
- EmailEnhanced class in shared/normalization/emails
- Email Demo page with interactive UI
- 8 example emails from different providers
- Comprehensive documentation with tabs (Validation, Normalization, Providers)
- Email normalization implementation documentation

### Changed
- Updated HomeEnhanced with Email Demo navigation link
- Enhanced shared normalization library structure

## [1.2.0] - 2025-10-28

### Added
- **Phone Normalization Enhanced** using Google libphonenumber
  - 250+ country support with validation
  - Type detection (Mobile, Landline, Toll-free, VoIP, Premium Rate, Shared Cost, Personal Number, Pager, UAN, Voicemail)
  - Multiple format outputs (International, National, E.164, RFC3966)
  - As-you-type formatting with real-time preview
  - Extension detection
  - Carrier detection
  - Invalid pattern filtering
- PhoneEnhanced class in shared/normalization/phones
- PhoneDemoEnhanced page with interactive UI
- 10 example phone numbers from different countries
- Country selector with 15 popular countries
- Comprehensive documentation with features section
- Phone normalization implementation documentation

### Changed
- Updated navigation to use PhoneDemoEnhanced as default
- Enhanced phone parsing with libphonenumber integration

## [1.1.0] - 2025-10-25

### Added
- **WebSocket Progress Tracking** for real-time batch job updates
  - <100ms latency (vs 5-second polling)
  - Connection status indicator
  - Automatic reconnection
  - Live badge in job dashboard
- **Asian Name Order Detection** with 400+ surname library
  - Chinese, Korean, Japanese, Vietnamese surnames
  - >95% accuracy with <3ms overhead
  - Intelligent family-name-first pattern detection
- **Context-Aware Parsing** using email/phone/company data
  - Email domain analysis for cultural patterns
  - Phone country code detection
  - Company name context
  - Weighted voting for confidence scores

### Changed
- Replaced polling with WebSocket for job progress updates
- Enhanced name parsing accuracy with context analysis
- Improved performance with surname-based detection

## [1.0.0] - 2025-10-20

### Added
- **750+ Professional Credentials** across all industries
  - Healthcare: 150+ credentials
  - Finance: 80+ credentials
  - IT/Tech: 200+ credentials
  - Engineering: 100+ credentials
  - Supply Chain: 50+ credentials
  - Legal: 40+ credentials
  - Education: 60+ credentials
- Hybrid monorepo architecture with publishable packages
- @normalization/core npm package
- Modular library organization by domain
- Comprehensive test coverage
- Documentation for all normalizers

### Fixed
- Hyphenated names parsing ("Meng-Ling Erik Kuo")
- Generational suffixes detection (III, Jr., Sr.)
- Pronouns removal ((she/her), (he/him), (they/them))
- Supply chain credentials recognition (CSCP, CPIM, CTSC)
- Multiple parentheses handling
- Vite HMR WebSocket configuration
- Deployment path mappings

### Changed
- Refactored credential lookups to use Sets/Maps for O(1) performance
- Optimized name parsing algorithm
- Enhanced error handling and validation
- Improved CSV parsing with auto-detection

## [0.2.0] - 2025-01-28

### Added
- Server-side batch processing with job queue system
- Database-backed job storage and history
- S3 file storage for uploads and results
- Phone number normalizer with international support
- Intelligent CSV parser with column detection
- Real-time progress tracking for batch jobs
- Job dashboard for monitoring processing status
- Authentication and user management

### Fixed
- Critical regex error with special characters in name parsing
- CSV parsing now correctly handles multi-column formats
- Names with credentials no longer marked as invalid
- Proper escaping of regex special characters

### Changed
- Upgraded from static frontend to full-stack application
- Batch processing moved to server-side for scalability
- Now supports unlimited dataset sizes (previously limited to 10K rows)

## [0.1.0] - 2025-01-27

### Added
- Initial release with name normalization
- Interactive demo interface
- Browser-based batch processing (up to 10K rows)
- Accent preservation option
- Multiple format outputs (full, short, initials, custom)
- Repair log with visual diffs
- CSV and JSON export
- Statistics dashboard
- Dark mode support
- Comprehensive configuration (100+ credentials, 80+ prefixes)
- Test coverage with example names

### Features
- Credential removal (PhD, MD, MBA, CPA, etc.)
- Job title filtering (CEO, Director, Manager, etc.)
- Nickname extraction from quotes/parentheses
- Last name prefix detection (van, de, von, etc.)
- Multi-person detection ("John and Jane")
- Encoding issue repair (Fran?ois → François)
- Configurable accent handling

## [0.0.1] - 2025-01-26

### Added
- Project initialization
- Basic name parsing logic
- Python script foundation

---

## Version History Summary

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

## Release Notes

### Version 1.4.0 - Enterprise Email Verification

This update adds enterprise-grade email verification capabilities using industry-standard libraries. Key features include:

**Comprehensive Verification**: MX record validation, SMTP connection testing, and mailbox verification ensure emails are not just valid in format, but actually deliverable.

**Security & Quality**: Disposable email detection, free provider detection, role-based email detection, and catch-all domain detection help maintain data quality and prevent fraud.

**Performance**: Batch verification with concurrency control processes up to 100 emails simultaneously with timeout handling and retry logic for reliability.

**Reputation Scoring**: 0-100 scoring system combines all verification signals to provide a single quality metric for each email address.

### Version 1.3.0 - Email Normalization

This update introduces email normalization using validator.js (23.7k stars, 8-10M weekly downloads). Provider-specific normalization rules handle Gmail's dot-ignoring behavior, plus tag removal, and case normalization. The Email Demo page provides an interactive interface with CSV batch processing support for up to 10,000 emails.

### Version 1.2.0 - Phone Normalization Enhanced

This update replaces the basic phone normalizer with Google's libphonenumber library, providing enterprise-grade phone number parsing and validation for 250+ countries. Features include type detection (Mobile, Landline, Toll-free, VoIP), multiple format outputs, as-you-type formatting, and comprehensive validation.

### Version 1.1.0 - Real-time Tracking & Cultural Intelligence

This major update introduces WebSocket-based real-time progress tracking (<100ms latency), Asian name order detection with 400+ surname library, and context-aware parsing that uses email domains and phone country codes to improve accuracy.

### Version 1.0.0 - Production Ready

The first production release provides a solid foundation with 750+ professional credentials, hybrid monorepo architecture, and publishable npm packages. Built after extensive iteration and testing, this version handles real-world messy data that other solutions struggle with.

### Version 0.2.0 - Server-Side Processing

This major update transforms the application from a browser-only tool to a full-stack platform capable of handling enterprise-scale datasets. Key improvements include:

**Scalability**: Process millions of rows without browser limitations. The server-side job queue handles datasets of any size with chunked processing and progress tracking.

**Reliability**: Jobs persist in the database. Users can close their browser and return later to download results. Failed jobs can be retried automatically.

**Performance**: Parallel processing and optimized algorithms deliver 10x faster processing for large datasets compared to browser-based approach.

**User Experience**: Real-time progress updates, job history, and downloadable results provide a professional workflow for data teams.

---

## Roadmap

### v1.5.0 (Planned)
- Premium email verification API integration (ZeroBounce, NeverBounce)
- ESP scrubbing against Gmail, Outlook, Yahoo APIs
- Return Path reputation data integration
- Advanced email verification caching
- Email verification history and analytics

### v1.6.0 (Planned)
- Company normalizer with legal suffix handling
- Address normalizer with USPS standardization
- API rate limiting and usage tracking
- Webhook notifications for job completion

### v2.0.0 (Planned)
- Machine learning-based name parsing
- Duplicate detection across datasets
- Data quality scoring and recommendations
- Export to popular CRM formats
- Bulk API for programmatic access
- Enterprise features (SSO, audit logs, team management)
- Advanced analytics and reporting
- Custom normalizer builder
- Multi-language support

---

For detailed information about each release, see the [GitHub Releases](https://github.com/roALAB1/data-normalization-platform/releases) page.
