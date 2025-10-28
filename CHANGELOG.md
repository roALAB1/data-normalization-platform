# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- GitHub repository setup with comprehensive documentation
- CI/CD workflows for automated testing and deployment
- Issue and pull request templates
- Contributing guidelines

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

## Release Notes

### Version 0.2.0 - Server-Side Processing

This major update transforms the application from a browser-only tool to a full-stack platform capable of handling enterprise-scale datasets. Key improvements include:

**Scalability**: Process millions of rows without browser limitations. The server-side job queue handles datasets of any size with chunked processing and progress tracking.

**Reliability**: Jobs persist in the database. Users can close their browser and return later to download results. Failed jobs can be retried automatically.

**Performance**: Parallel processing and optimized algorithms deliver 10x faster processing for large datasets compared to browser-based approach.

**User Experience**: Real-time progress updates, job history, and downloadable results provide a professional workflow for data teams.

### Version 0.1.0 - Initial Release

The first public release provides a solid foundation for name normalization with an intuitive interface and comprehensive data cleaning capabilities. Built after extensive iteration with AI assistants and inspired by the Namefully library, this tool handles real-world messy data that other solutions struggle with.

---

## Migration Guides

### Migrating from 0.1.0 to 0.2.0

**Breaking Changes**:
- Batch processing API changed from client-side to server-side
- Authentication now required for batch jobs
- CSV upload endpoint moved to `/api/jobs/upload`

**New Requirements**:
- PostgreSQL database
- S3-compatible storage
- Environment variables for OAuth

**Migration Steps**:
1. Set up database and run migrations: `pnpm db:push`
2. Configure S3 storage in `.env`
3. Update any API integrations to use new tRPC endpoints
4. Existing CSV files can be re-uploaded through new interface

---

## Roadmap

### v0.3.0 (Planned)
- Email normalizer with disposable domain detection
- Company normalizer with legal suffix handling
- Address normalizer with USPS standardization
- API rate limiting and usage tracking
- Webhook notifications for job completion

### v0.4.0 (Planned)
- Machine learning-based name parsing
- Duplicate detection across datasets
- Data quality scoring and recommendations
- Export to popular CRM formats
- Bulk API for programmatic access

### v1.0.0 (Planned)
- Production-ready with SLA guarantees
- Enterprise features (SSO, audit logs, team management)
- Advanced analytics and reporting
- Custom normalizer builder
- Multi-language support

---

For detailed information about each release, see the [GitHub Releases](https://github.com/YOUR_USERNAME/data-normalization-platform/releases) page.
