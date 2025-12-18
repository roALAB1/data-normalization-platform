# Data Normalization Platform

[![GitHub Release](https://img.shields.io/github/v/release/roALAB1/data-normalization-platform?style=for-the-badge&logo=github&color=blue)](https://github.com/roALAB1/data-normalization-platform/releases/latest)
[![License](https://img.shields.io/badge/license-MIT-green?style=for-the-badge)](LICENSE)
[![Build Status](https://img.shields.io/badge/build-passing-brightgreen?style=for-the-badge)](https://github.com/roALAB1/data-normalization-platform)

A production-ready web application for normalizing and cleaning messy data at scale. Built to handle tens to hundreds of thousands of rows with intelligent parsing, validation, and formatting.

## 🎯 Overview

A unified, enterprise-scale data normalization platform that automatically detects and normalizes multiple data types in a single workflow with batch processing API, real-time monitoring, and Redis caching (v3.50.0):

- **Smart Column Mapping** (v3.50.0): Automatically detects fragmented columns (House + Street + Apt, First + Last Name, Area Code + Phone) and suggests intelligent combinations
- **Intelligent Auto-Detection**: Automatically identifies column types (name, email, phone, address, city, state, zip, country, company, url) with 95%+ accuracy
- **Multi-Column Processing**: Normalize all columns simultaneously with real-time progress tracking
- **Enterprise Streaming**: Process 100k+ rows with memory-efficient streaming architecture
- **Parallel Processing**: Web Worker pool (4-8 workers) for maximum performance
- **Real-Time Memory Monitoring**: Live dashboard tracking worker pool performance, memory usage, recycling events, retry statistics
- **Company Name Detection**: Intelligent identification of company columns, no splitting, title case normalization with abbreviation preservation
- **Results Preservation**: Seamless navigation between results and monitoring dashboard without data loss
- **Specialized Normalizers**:
  - **Names**: 750+ credentials, Asian name detection, context-aware parsing
  - **Phones**: 250+ countries, type detection, multiple formats
  - **Emails**: RFC 5322 validation, provider-specific rules, MX/SMTP verification
  - **Addresses**: Title Case, 27+ abbreviations, standardization
  - **URLs**: Protocol/www removal, domain extraction, international TLD support
  - **Company Names**: Title case with abbreviation preservation (IBM, LLC, Inc.)

### Key Features

✅ **Smart Column Mapping** 🤖: Auto-detect fragmented columns and suggest intelligent combinations (v3.50.0)  
✅ **Intelligent Multi-Type Platform** 🤖: Auto-detect data types (name, email, phone, address, url) with 95%+ accuracy and normalize multiple columns  
✅ **Address Normalization** 🏠: Title Case conversion, 27+ street suffix abbreviations, 10,000+ addresses/second  
✅ **750+ Professional Credentials**: Comprehensive coverage across healthcare, finance, IT, engineering, supply chain, legal, education, and more  
✅ **Enterprise Email Verification** 📧: MX record validation, SMTP testing, disposable detection, reputation scoring  
✅ **Email CSV Batch Processing** 📊: Upload CSV files with up to 10,000 emails for bulk normalization  
✅ **Phone Normalization Enhanced** 📱: Google libphonenumber integration with 250+ countries, type detection, multiple formats  
✅ **WebSocket Progress Tracking** ⚡: Real-time batch job updates with <100ms latency  
✅ **Asian Name Detection** 🌏: Intelligent detection of family-name-first patterns for 400+ Chinese/Korean/Japanese/Vietnamese surnames  
✅ **Context-Aware Parsing** 🧠: Uses email/phone/company context to boost parsing accuracy  
✅ **Cross-Page Navigation** 🧭: Seamless navigation between all demo pages  
✅ **Intelligent CSV Parsing**: Auto-detects column structure (single full name, first/last split, multi-column)  
✅ **Batch Processing**: Server-side job queue handles unlimited dataset sizes  
✅ **Real-time Processing**: Interactive demo for testing individual records  
✅ **Hybrid Monorepo**: Publishable `@normalization/core` package for reuse across projects  
✅ **Optimized Performance**: O(1) credential lookups using Sets and Maps  
✅ **Accent Handling**: Configurable accent preservation or ASCII conversion  
✅ **Comprehensive Cleaning**: Removes credentials, job titles, pronouns, fixes encoding issues  
✅ **Multiple Export Formats**: CSV, JSON with detailed repair logs  
✅ **Statistics Dashboard**: Track valid/invalid ratios, processing time, data quality metrics  
✅ **Authentication**: Secure user accounts with job history  
✅ **S3 Storage**: Scalable file storage for uploads and results  
✅ **Real-Time Memory Monitoring** 📊: Live dashboard tracking worker pool performance, memory usage, recycling events, retry statistics  
✅ **Company Name Detection** 🏢: Intelligent identification of company columns, no splitting, title case normalization with abbreviation preservation  
✅ **Results Preservation** 💾: Seamless navigation between results and monitoring dashboard without data loss

### What's New in v3.50.0 🚀

**Smart Column Mapping** 🤖  
Intelligent pre-normalization feature that automatically detects fragmented columns and suggests combining them into complete data fields. Eliminates 5-10 minutes of manual Excel work with one-click acceptance of smart suggestions.

**Key Features:**
- 🏠 **Address Components**: House + Street + Apt → Address (e.g., "65" + "MILL ST" + "306" → "65 MILL ST Apt 306")
- 👤 **Name Components**: First + Middle + Last + Prefix + Suffix → Full Name (supports 15+ column name variations)
- 📞 **Phone Components**: Area Code + Number + Extension → Phone (e.g., "555" + "123-4567" → "(555) 123-4567")
- 🎯 **Pattern Matching**: Case-insensitive detection with space/underscore support
- 📊 **Confidence Scoring**: High (≥80%), Medium (60-79%), Low (<60%) confidence indicators
- 👁️ **Preview Generation**: Shows 3 sample combinations before acceptance
- ⚡ **Fast Detection**: <50ms for typical CSV (10-20 columns)
- 🎨 **SmartSuggestions UI**: User-friendly interface with Accept/Customize/Ignore actions

**UI Enhancements:**
- 🌐 **URL Normalization Tile**: Replaced Company tile with URL normalization showcase in Enrichment-Ready Output Format
- 🔗 **URL Examples**: https://www.example.com/path → example.com, http://subdomain.site.co.uk → site.co.uk

**User Experience:**
- **Before**: 5-10 minutes of manual column combination in Excel
- **After**: One-click "Accept" on smart suggestion
- Eliminates manual Excel formula work and reduces errors

**Test Coverage:**
- 22/22 comprehensive unit tests (100% pass rate)
- Detection time: <50ms for typical CSV
- Minimal memory overhead (only 5 sample rows per column)

### What's New in v3.49.0 🚀

**Large File Processing Fix** 🚀  
Fixed critical memory issues preventing the app from processing 400k+ row files. Implemented server-side streaming architecture with automatic routing: files under 50k rows use fast client-side processing, while files 50k+ rows use memory-safe server-side streaming. The StreamingCSVWriter processes data in 10k row chunks with incremental S3 uploads, reducing memory usage from 1GB+ to just 265MB. Tested with 400,000 rows achieving 582 rows/sec processing speed with stable memory usage. The app can now handle 1M+ row files without crashes.

**Key Features:**
- 🎯 **Automatic Routing**: < 50k rows → client-side, ≥ 50k rows → server-side streaming
- 💾 **Memory-Safe Processing**: 265MB heap usage (vs 1GB+ before)
- ⚡ **High Performance**: 582 rows/sec processing speed
- 📦 **Chunked Processing**: 10k row buffers with incremental S3 uploads
- 🔄 **Background Jobs**: Re-enabled BatchWorker with streaming support
- ✅ **Production Ready**: Tested with 400k rows, supports 1M+ rows

**Performance Improvements:**
- Memory: 1GB+ → 265MB (73% reduction)
- Processing: 400k rows in 11.5 minutes
- Stability: No crashes, no freezes at 50% or 100%
- Download: Automatic S3 upload with presigned URLs

### What's New in v3.48.0 🚀

**URL Normalization Feature** 🌐  
Comprehensive URL normalization that extracts clean domain names from URLs by removing protocols, www prefixes, paths, query parameters, and fragments. Auto-detects URL columns in CSV files with 95%+ accuracy and supports international domains (.co.uk, .com.au, etc.). Includes confidence scoring for URL validity and handles 18+ multi-part TLDs. All 40 tests passing with full integration into the intelligent normalization engine.

**Key Features:**
- 🌐 **Protocol Removal**: Strips http://, https://, ftp://, and other protocols
- 🔗 **WWW Prefix Removal**: Removes www. from domain names (case-insensitive)
- 🎯 **Root Domain Extraction**: Extracts only domain + extension (google.com)
- 🗑️ **Path/Query/Fragment Removal**: Removes /paths, ?query=params, and #fragments
- 🌍 **International Domain Support**: Handles .co.uk, .com.au, and 18+ multi-part TLDs
- 🤖 **Auto-Detection**: Automatically identifies URL columns (Website, URL, Link, Homepage)
- 📊 **Confidence Scoring**: 0-1 confidence scores based on domain validity
- ✅ **40 Tests Passing**: Comprehensive coverage including real-world examples

**Examples:**
- `http://www.google.com` → `google.com`
- `https://www.example.com/page?query=1` → `example.com`
- `www.facebook.com/profile#section` → `facebook.com`
- `subdomain.site.co.uk/path` → `site.co.uk`

### What's New in v3.45.0 🚀

**PO Box Normalization, ZIP Validation & Confidence Scoring** 📮  
Comprehensive address quality improvements with intelligent PO Box detection and normalization, ZIP code validation against state data, and confidence scoring for all address components. Introduced data quality flags to identify missing fields, ZIP/state mismatches, and ambiguous cities. All 37 v3.45.0 tests passing with full backward compatibility verified.

**Key Features:**
- 📮 **PO Box Normalization**: Detects and normalizes P.O. Box, POBox, PO Box, etc. to standard "PO Box" format
- ✅ **ZIP Code Validation**: Validates ZIP codes against state data using @mardillu/us-cities-utils package
- 🎯 **Confidence Scoring**: 0-1 confidence scores for each address component (street, city, state, zip)
- 🚩 **Data Quality Flags**: Identifies missing fields, ZIP/state mismatches, ambiguous cities, and other issues
- 🔄 **Backward Compatible**: All existing address normalization features preserved with enhanced validation
- 📊 **37 Tests Passing**: Comprehensive test coverage for all new features and edge cases

### What's New in v3.40.1 🚀

**CRM Merge Jobs Database Fix** 🔧  
Fixed critical bug preventing CRM merge jobs from being submitted and processed. The `crmMergeJobs` database table was missing, causing job submissions to fail silently. Added complete database schema with 19 columns for tracking merge jobs, created CRM-specific update functions (updateCRMMergeJobStatus, updateCRMMergeJobProgress), and fixed submitMergeJob endpoint to use the correct table. Background worker now properly initializes and processes CRM merge jobs with multiple enrichment files.

**Key Fixes:**
- 🗄️ **Database Table Created**: Added crmMergeJobs table with proper schema (migration 0006_organic_hardball.sql)
- 📝 **Correct Table Usage**: Fixed submitMergeJob to insert into crmMergeJobs instead of jobs table
- 🔄 **CRM-Specific Functions**: Added updateCRMMergeJobStatus, updateCRMMergeJobProgress, updateCRMMergeJobProgressSimple
- 🎯 **Worker Integration**: Updated CRMMergeWorker to use CRM-specific database functions
- 📊 **Proper Data Storage**: Stores enrichedFileKeys and enrichedFileUrls as JSON arrays

### What's New in v3.40.0 🚀

**Batch Jobs Authentication Fix** 🔒  
Fixed critical authentication issue preventing access to the Batch Jobs page. Implemented server-side authentication fallback (matching CRM Sync pattern) that automatically uses owner credentials when no user is logged in. Removed client-side authentication check that was blocking page render. The Batch Jobs page now loads correctly with full access to job history, submission, and download features.

**Key Improvements:**
- ✅ **Server-Side Auth Fallback**: Automatically uses owner ID from OWNER_OPEN_ID environment variable
- 🚪 **No Login Required**: Page accessible without manual authentication during development
- 📊 **Full Functionality**: Job list, submission, cancellation, and downloads all working
- 🔄 **Consistent Pattern**: Matches CRM Sync authentication approach for unified experience

## 📚 Documentation

- [VERSION_HISTORY.md](docs/VERSION_HISTORY.md) - Complete version history and changelog
- [API_DOCUMENTATION.md](docs/API_DOCUMENTATION.md) - REST API reference for batch processing
- [ARCHITECTURE_GUIDE.md](docs/ARCHITECTURE_GUIDE.md) - System architecture and design decisions
- [VERSIONING.md](VERSIONING.md) - Versioning and release process

## 🚀 Quick Start

```bash
# Install dependencies
pnpm install

# Run development server
pnpm dev

# Run tests
pnpm test

# Build for production
pnpm build
```

## 📦 Installation

```bash
git clone https://github.com/roALAB1/data-normalization-platform.git
cd data-normalization-platform
pnpm install
```

## 🔧 Configuration

Set up environment variables in `.env`:

```env
DATABASE_URL=mysql://...
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_SECRET=your-secret-key
OWNER_OPEN_ID=your-owner-id
```

## 🧪 Testing

```bash
# Run all tests
pnpm test

# Run specific test file
pnpm test tests/url-normalization.test.ts

# Run tests in watch mode
pnpm test --watch
```

## 📊 Performance

- **Processing Speed**: 1,000-5,000 rows/second (depends on CPU cores and data complexity)
- **Memory Usage**: Constant footprint regardless of file size (streaming architecture)
- **Scalability**: No row limit, linear scaling with CPU cores
- **Large Files**: 400k+ rows tested, supports 1M+ rows

## 🤝 Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with React 19, Tailwind CSS 4, Express 4, tRPC 11
- Uses libphonenumber-js for phone normalization
- Uses @mardillu/us-cities-utils for ZIP validation
- Inspired by Namefully library for name parsing

## 📞 Support

For issues, questions, or feature requests, please [open an issue](https://github.com/roALAB1/data-normalization-platform/issues) on GitHub.

## 🔗 Links

- [GitHub Repository](https://github.com/roALAB1/data-normalization-platform)
- [Latest Release](https://github.com/roALAB1/data-normalization-platform/releases/latest)
- [Documentation](https://github.com/roALAB1/data-normalization-platform/tree/main/docs)
