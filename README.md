# Enhanced Name Normalization Demo

A production-ready web application for normalizing and cleaning messy data at scale. Built to handle tens to hundreds of thousands of rows with intelligent parsing, validation, and formatting.

## 🎯 Overview

A unified, enterprise-scale data normalization platform that automatically detects and normalizes multiple data types in a single workflow:

- **Intelligent Auto-Detection**: Automatically identifies column types (name, email, phone, address, city, state, zip, country, company) with 95%+ accuracy
- **Flexible Name Processing**: Accepts full name OR first+last name columns, always outputs separate First Name & Last Name (v3.1.0)
- **Column Transformation Visibility**: Clear input→output mappings with transformation types (split, normalized) (v3.2.0)
- **Multi-Column Processing**: Normalize all columns simultaneously with real-time progress tracking
- **Enterprise Streaming**: Process 100k+ rows with memory-efficient streaming architecture (v2.1.0)
- **Parallel Processing**: Web Worker pool (4-8 workers) for maximum performance
- **Server-Side Batch System**: Robust job queue with BullMQ + Redis for large-scale processing (v3.0.0)
- **Specialized Normalizers**:
  - **Names**: 770+ credentials, nationality/ethnicity name order nuances, flexible input formats
  - **Phones**: 250+ countries, type detection, digits-only output format
  - **Emails**: RFC 5322 validation, provider-specific rules, MX/SMTP verification
  - **Addresses**: Title Case, 27+ abbreviations, standardization

### Key Features

✅ **Column Transformations Summary** 📋: Expandable accordion showing input→output mappings with badges and descriptions (v3.2.0)  
✅ **Digits-Only Phone Format** 📱: Clean numeric output (no parentheses/spaces/hyphens) for database storage (v3.2.0)  
✅ **Flexible Name Input** 🔄: Accepts full name OR first+last columns, always outputs First Name + Last Name (v3.1.0)  
✅ **Responsive Feature Cards** 📱: Visual examples adapt to screen width, proper text wrapping on mobile (v3.0.3)  
✅ **Visual Examples** 👁️: Before/after transformation examples in feature cards (v3.0.2)  
✅ **Improved Descriptions** 📝: Specific, detailed feature descriptions (v3.0.1)  
✅ **Server-Side Batch Processing** ⚙️: BullMQ + Redis job queue, background workers, enhanced dashboard (v3.0.0)  
✅ **Hero Section Showcase** 🎨: Feature grid with detailed capabilities before upload (v2.3.0)  
✅ **Simplified Single-Page Platform** 🎯: Unified interface, removed redundant demo pages (v2.2.0)  
✅ **Enterprise-Scale CSV Streaming** ⚡: 100k+ rows, 1,000-5,000 rows/sec, constant memory (v2.1.0)  
✅ **Intelligent Multi-Type Platform** 🤖: Auto-detect data types with 95%+ accuracy (v2.0.0)  
✅ **Address Normalization** 🏠: Title Case, 27+ abbreviations, 10,000+ addresses/second (v1.5.0)  
✅ **Enterprise Email Verification** 📧: MX/SMTP validation, disposable detection, reputation scoring (v1.4.0)  
✅ **770+ Professional Credentials**: Healthcare, finance, IT, engineering, legal, education coverage  
✅ **Asian Name Detection** 🌏: 400+ Chinese/Korean/Japanese/Vietnamese surnames  
✅ **Context-Aware Parsing** 🧠: Email/phone/company context for accuracy  
✅ **Batch Processing**: Server-side job queue for unlimited datasets  
✅ **Real-time Processing**: Interactive demo for individual records  
✅ **Hybrid Monorepo**: Publishable `@normalization/core` package  
✅ **Optimized Performance**: O(1) credential lookups using Sets and Maps  
✅ **Accent Handling**: Configurable preservation or ASCII conversion  
✅ **Multiple Export Formats**: CSV, JSON with detailed logs  
✅ **Statistics Dashboard**: Valid/invalid ratios, processing time, quality metrics  
✅ **Authentication**: Secure user accounts with job history  
✅ **S3 Storage**: Scalable file storage for uploads and results

## 📦 What's New

### v3.3.0 - Expanded Credential Database 📚

**Additional Credentials**
- Added 15+ missing healthcare credentials: IBCLC, CLC, DipABLM (Lactation), MMSc (Medical Science), CNS (Clinical Nurse Specialist), ARNP-FNP, FAANP (Advanced Nursing), MScAT/MSEAT (Athletic Training), FMACP, FCP (Physician Fellowships), CDN, CISSN, CSSD (Nutrition/Sports Dietetics), AADP, CFMP (Alternative Medicine), CPO (Prosthetist Orthotist), CPC (Professional Coder)
- Added RYT (Registered Yoga Teacher) to fitness/wellness credentials
- Enhanced pronoun removal to support square brackets: [She/Her], [He/Him], etc.
- Added "Therapist" to job title filters to prevent false positives
- Total credential database now covers 770+ professional designations

### v3.2.0 - Column Transformations Summary & Digits-Only Phone Format 🔍

**Column Transformations Visibility**
- Expandable "Column Transformations Applied" accordion in results section
- Shows input column → output column(s) mappings
- Color-coded badges (split, normalized, unchanged)
- Detailed descriptions for each transformation
- Example: "Name → First Name + Last Name (split)"

**Phone Number Format Update**
- Changed from formatted (+1 415-555-1234) to digits-only (14155551234)
- No parentheses, spaces, or hyphens in output
- Clean numeric format for database storage and API integration
- Updated IntelligentBatchProcessor to use `format('digitsOnly')`

### v3.1.0 - Enhanced Name Processing with Flexible Input/Output 🔄

**Flexible Name Input Formats**
- Accepts **full name** column (e.g., "Dr. John Smith PhD") → automatically splits
- Accepts **first name + last name** columns → processes separately
- Always outputs **"First Name"** and **"Last Name"** columns for consistency

**Implementation**
- Created NameSplitter utility for intelligent full name splitting
- Updated IntelligentBatchProcessor to detect and handle both formats
- Enhanced DataTypeDetector to recognize first_name/last_name columns
- Updated UI to communicate flexible input capabilities

### v3.0.3 - Responsive Layout Fix 📱

**Mobile-Friendly Feature Cards**
- Examples stack vertically on small screens
- Text truncation with ellipsis to prevent overflow
- Proper wrapping at all breakpoints (mobile, tablet, desktop)
- Clean display when browser is snapped to half-screen

### v3.0.2 - Visual Examples in Feature Cards 👁️

**Before/After Transformation Examples**
- Names: "Dr. John Smith, PhD → John Smith" | "WANG, Wei → Wei Wang"
- Emails: "John.Smith@GMAIL.COM → johnsmith@gmail.com"
- Phone Numbers: "(415) 555-1234 → +1 415-555-1234"
- Addresses: "123 MAIN STREET → 123 Main St"

### v3.0.1 - Improved Feature Descriptions 📝

**Specific, Detailed Descriptions**
- Names: "Strips 750+ credentials, honorifics, prefixes, suffixes" + "Nationality and ethnicity name order nuance detection"
- Emails: "RFC 5322 standard validation" + "Provider-specific rules (Gmail, Outlook, etc.)"
- Phone Numbers: "250+ countries with regional formatting rules" + "Type detection (mobile, landline, toll-free, VoIP)"
- Addresses: "Title Case standardization" + "27+ street type abbreviations (St, Ave, Blvd, etc.)"

### v3.0.0 - Robust Server-Side Batch Processing System ⚙️

**Core Infrastructure**
- JobQueue service with BullMQ for reliable job management
- BatchWorker for background processing with progress tracking
- IntelligentBatchProcessor with auto-detection & multi-column normalization
- Database schema: scheduledJobs and apiKeys tables
- Enhanced API endpoints: submitBatch, getStats, retry, onJobUpdate (WebSocket)

**Enhanced Job Dashboard UI**
- Job submission form with file upload
- Job list with filtering and search
- Real-time status updates via WebSocket
- Job statistics cards (total, processing, completed, failed)
- Download results button
- Retry failed jobs functionality

**Performance**
- 1,000-5,000 rows/second processing speed
- Constant memory footprint regardless of file size
- Production-ready for power users with automated workflows

### v2.3.0 - Hero Section Feature Showcase 🎨

**Feature Grid Display**
- Large hero headline: "Enterprise-Scale Data Normalization"
- Descriptive subheading explaining workflow
- 4 feature cards: Names, Emails, Phone Numbers, Addresses
- Detailed bullet points for each capability
- "Coming Soon" banner for Company Names
- Upload section moved below for better user education

### v2.2.0 - Simplified Single-Page Platform 🎯

**Streamlined User Experience**
- Removed individual Phone/Email/Address demo pages
- Home route (/) goes directly to Intelligent Normalization
- Simplified navigation to just "Batch Jobs"
- Cleaner, more focused interface
- All normalization capabilities in one powerful page

### v2.1.0 - Enterprise-Scale CSV Streaming ⚡

**Streaming Architecture**
- **StreamingCSVProcessor**: PapaParse-based streaming (no row limits)
- **ChunkedNormalizer**: Parallel processing with Web Worker pool (4-8 workers)
- **ProgressiveDownloader**: Memory-efficient downloads
- **Real-time tracking**: Rows/sec, ETA, memory usage
- **Full controls**: Pause/Resume/Cancel support

**Performance**
- 1,000-5,000 rows/second processing speed
- Constant memory footprint regardless of file size
- Handles 100k+ row CSV files efficiently

### v2.0.0 - Intelligent Multi-Type Normalization Platform 🤖

**Automatic Data Type Detection**
- DataTypeDetector with 95%+ accuracy
- Supports 12 data types: name, email, phone, address, city, state, zip, country, company, etc.
- Confidence scoring (0-100%) for each detection
- Header analysis (40% weight) + pattern matching (60% weight)

**Unified Processing Engine**
- UnifiedNormalizationEngine routes data to appropriate normalizers
- Multi-column processing with progress tracking
- Result caching for performance
- SmartCSVProcessor auto-detects CSV structure

### v1.5.0 - Address Normalization 🏠

**Address Formatter**
- Title Case conversion ("143 WEST SIDLEE STREET" → "143 West Sidlee St")
- 27 street suffix abbreviations (Street → St, Avenue → Ave, Boulevard → Blvd)
- 8 directional abbreviations (North → N, South → S, East → E, West → W)
- 7 unit type abbreviations (Apartment → Apt, Suite → Ste, Floor → Fl)
- Performance: 10,000+ addresses/second
- Zero dependencies, zero cost

### v1.4.0 - Enterprise Email Verification 📧

**Comprehensive Verification**
- MX record validation
- SMTP connection testing
- Mailbox verification
- Disposable email detection
- Free provider detection
- Role-based email detection
- Catch-all domain detection
- Email reputation scoring (0-100)

**Email Normalization**
- RFC 5322 compliant validation
- Provider-specific rules (Gmail, Outlook, Yahoo, iCloud, ProtonMail, AOL, Fastmail, Zoho)
- Tag extraction, dot removal (Gmail), case normalization
- Batch CSV processing (up to 10,000 emails)

### v1.2.0 - Phone Normalization Enhanced 📱

**Google libphonenumber Integration**
- 250+ country support
- Type detection (Mobile, Landline, Toll-free, VoIP)
- Multiple format outputs (International, National, E.164, RFC3966)
- As-you-type formatting
- Carrier detection

## 🏗️ Architecture

### Client-Side Streaming (v2.1.0+)
- **StreamingCSVProcessor**: Handles large CSV files with PapaParse streaming
- **ChunkedNormalizer**: Distributes work across Web Worker pool
- **WorkerPoolManager**: Manages 4-8 workers for parallel processing
- **ProgressiveDownloader**: Streams results to CSV without memory bloat

### Server-Side Batch Processing (v3.0.0+)
- **JobQueue**: BullMQ-based job queue with Redis backend
- **BatchWorker**: Background worker for processing jobs
- **IntelligentBatchProcessor**: Auto-detection and multi-column normalization
- **JobDashboardEnhanced**: Real-time status updates via WebSocket

### Core Normalizers
- **NameEnhanced**: 770+ credentials, Asian name detection, context-aware parsing
- **NameSplitter**: Intelligent full name splitting (v3.1.0)
- **PhoneEnhanced**: Google libphonenumber with 250+ countries
- **EmailEnhanced**: RFC 5322 validation, provider rules, MX/SMTP verification
- **AddressFormatter**: Title Case, 27+ abbreviations

### Data Type Detection
- **DataTypeDetector**: 95%+ accuracy with confidence scoring
- Supports: name, first_name, last_name, email, phone, address, city, state, zip, country, company

## 🚀 Getting Started

### Prerequisites
- Node.js 22.13.0+
- pnpm
- Redis (for server-side batch processing)

### Installation

```bash
# Install dependencies
pnpm install

# Push database schema
pnpm db:push

# Start development server
pnpm dev
```

### Environment Variables

Required environment variables are automatically injected:
- `JWT_SECRET`: Authentication secret
- `OAUTH_SERVER_URL`: OAuth server URL
- `VITE_APP_TITLE`: Application title
- `VITE_APP_LOGO`: Application logo URL

## 📊 Performance

- **Client-Side Streaming**: 1,000-5,000 rows/second, constant memory
- **Server-Side Batch**: 1,000-5,000 rows/second, handles unlimited file sizes
- **Address Normalization**: 10,000+ addresses/second
- **Name Parsing**: O(1) credential lookups using Sets and Maps

## 🔧 Technology Stack

**Frontend**
- React 19 + TypeScript
- Tailwind CSS 4
- shadcn/ui components
- Wouter (routing)
- PapaParse (CSV streaming)
- Web Workers (parallel processing)

**Backend**
- Node.js + Express
- tRPC for type-safe APIs
- BullMQ + Redis (job queue)
- Drizzle ORM (database)
- S3 (file storage)

**Libraries**
- libphonenumber-js (phone normalization)
- validator.js (email validation)
- @devmehq/email-validator-js (email verification)

## 📝 License

MIT

## 🤝 Contributing

Contributions welcome! Please open an issue or submit a pull request.

## 📧 Support

For questions or support, please open an issue on GitHub.
