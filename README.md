# Data Normalization Platform

A production-ready web application for normalizing and cleaning messy data at scale. Built to handle tens to hundreds of thousands of rows with intelligent parsing, validation, and formatting.

## 🎯 Overview

A unified, enterprise-scale data normalization platform that automatically detects and normalizes multiple data types in a single workflow:

- **Intelligent Auto-Detection**: Automatically identifies column types (name, email, phone, address, city, state, zip, country, company) with 95%+ accuracy
- **Multi-Column Processing**: Normalize all columns simultaneously with real-time progress tracking
- **Enterprise Streaming**: Process 100k+ rows with memory-efficient streaming architecture (v2.1.0)
- **Parallel Processing**: Web Worker pool (4-8 workers) for maximum performance
- **Specialized Normalizers**:
  - **Names**: 750+ credentials, Asian name detection, context-aware parsing
  - **Phones**: 250+ countries, type detection, multiple formats
  - **Emails**: RFC 5322 validation, provider-specific rules, MX/SMTP verification
  - **Addresses**: Title Case, 27+ abbreviations, standardization

### Key Features

✅ **Intelligent Multi-Type Platform** 🤖: Auto-detect data types (name, email, phone, address) with 95%+ accuracy and normalize multiple columns (v2.0.0)  
✅ **Address Normalization** 🏠: Title Case conversion, 27+ street suffix abbreviations, 10,000+ addresses/second (v1.5.0)  
✅ **750+ Professional Credentials**: Comprehensive coverage across healthcare, finance, IT, engineering, supply chain, legal, education, and more  
✅ **Enterprise Email Verification** 📧: MX record validation, SMTP testing, disposable detection, reputation scoring (v1.4.0)  
✅ **Email CSV Batch Processing** 📊: Upload CSV files with up to 10,000 emails for bulk normalization (v1.3.1)  
✅ **Phone Normalization Enhanced** 📱: Google libphonenumber integration with 250+ countries, type detection, multiple formats (v1.2.0)  
✅ **WebSocket Progress Tracking** ⚡: Real-time batch job updates with <100ms latency (v1.1.0)  
✅ **Asian Name Detection** 🌏: Intelligent detection of family-name-first patterns for 400+ Chinese/Korean/Japanese/Vietnamese surnames (v1.1.0)  
✅ **Context-Aware Parsing** 🧠: Uses email/phone/company context to boost parsing accuracy (v1.1.0)  
✅ **Cross-Page Navigation** 🧭: Seamless navigation between all demo pages (v1.4.1)  
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

### What's New in v3.15.8 🚀

**Phone & ZIP Normalization Working** 📞  
Fixed critical phone normalization bug by replacing PhoneEnhanced with simple regex-based approach. Phone numbers now normalize to E.164 format: `(904) 786-0081` → `+19047860081`. ZIP codes preserve leading zeros: `8840` → `08840`. Added sample data display under column detection labels. Fixed CSV parsing for quoted fields. Production ready!

### What's New in v3.15.1 🚀

**CRITICAL BUG FIX: Column Filtering in Output CSV** 🔧  
Fixed critical bug where deleted columns were being re-added to output CSV. Users can now delete columns from their CSV and the output will ONLY contain the selected columns (not all original columns). Added Phase 4 column filtering to normalization pipeline. All 4 unit tests passing. Production ready!

### What's New in v3.13.5 🚀

**Hero Section + Ghost Numbers Fix** ✨  
Enhanced UI with enrichment features display and cleaner CSV output. Added hero section showing enrichment capabilities (Names, Emails, Phones, Addresses), enhanced transformation previews with sample data, post-normalization "Column Transformations Applied" section. Fixed ghost columns (_1, _2, _3) filtered from CSV output and results table. All 139 tests passing. Production ready!

### What's New in v3.13.4 🚀

**Critical Normalization Fixes** ✅  
Fixed three critical issues: (1) Middle initials now properly removed from First/Last names ("Jennifer R." → "Jennifer"), (2) Location columns split into Personal City + Personal State with state abbreviations ("Durham, North Carolina" → City: "Durham", State: "NC"), (3) Full Name column removal verified working. All 139 tests passing. Production ready!

### What's New in v3.9.1 🚀

**Bug Report System** 🐛  
Users can now report normalization issues directly from the results table. Complete system with API endpoints, database storage, and intuitive UI. Each result row has a "Report Issue" button that opens a dialog for submitting detailed bug reports with issue type, severity, expected output, and description.

### What's New in v2.2.0 🚀

**Simplified Single-Page Platform** 🎯  
Streamlined user experience with unified Data Normalization Platform page. Removed redundant individual demo pages - all normalization happens in one powerful interface.

### What's New in v2.1.0 🚀

**Enterprise-Scale CSV Streaming** ⚡  
Process 100k+ row CSV files with streaming architecture. StreamingCSVProcessor with PapaParse, ChunkedNormalizer with Web Worker pool (4-8 workers), ProgressiveDownloader for memory-efficient downloads, real-time progress tracking (rows/sec, ETA, memory), pause/resume/cancel controls. Performance: 1,000-5,000 rows/second with constant memory footprint.

### What's New in v2.0.0 🚀

**Intelligent Multi-Type Normalization Platform** 🤖  
Automatic data type detection with 95%+ accuracy using DataTypeDetector. Supports 12 data types (name, email, phone, address, city, state, zip, country, company, etc.) with confidence scoring. UnifiedNormalizationEngine routes data to appropriate normalizers with multi-column processing, progress tracking, and caching. SmartCSVProcessor auto-detects CSV structure and generates normalization strategies.

### What's New in v1.5.0 🚀

**Address Normalization** 🏠  
Simple format standardization with AddressFormatter class. Title Case conversion ("143 WEST SIDLEE STREET" → "143 West Sidlee St"), 27 street suffix abbreviations (Street → St, Avenue → Ave, Boulevard → Blvd), 8 directional abbreviations (North → N), 7 unit type abbreviations (Apartment → Apt). Performance: 10,000+ addresses/second, zero dependencies, zero cost. Includes Address Demo page with single/batch modes and CSV upload.

### What's New in v1.4.0 🚀

**Enterprise Email Verification** 📧  
Comprehensive email verification using @devmehq/email-validator-js with MX record validation, SMTP connection testing, mailbox verification, disposable email detection, free provider detection, role-based email detection, catch-all domain detection, and email reputation scoring (0-100).

**Email Normalization** 📊  
RFC 5322 compliant validation using validator.js (23.7k stars, 8-10M weekly downloads). Provider-specific normalization rules for Gmail, Outlook, Yahoo, iCloud, ProtonMail, AOL, Fastmail, Zoho. Plus tag extraction, dot removal (Gmail-specific), case normalization, and batch CSV processing (up to 10,000 emails).

**Navigation Improvements** 🧭  
Consistent cross-navigation between all pages (Home, Phone Demo, Email Demo, Batch Jobs). Users can navigate directly from any page to any other page without returning home first.

### What's New in v1.2.0 🚀

**Phone Normalization Enhanced** 📱  
Powered by Google's libphonenumber library with 250+ country support, type detection (Mobile, Landline, Toll-free, VoIP), multiple format outputs (International, National, E.164, RFC3966), as-you-type formatting, and carrier detection.

### What's New in v1.1.0 🚀

**WebSocket Progress Tracking** ⚡  
Real-time batch job updates with instant feedback (<100ms latency vs 5-second polling). Includes connection status indicator and automatic reconnection.

**Asian Name Order Detection** 🌏  
400+ surname library for Chinese, Korean, Japanese, and Vietnamese names. Intelligently detects family-name-first patterns with >95% accuracy and <3ms overhead.

**Context-Aware Parsing** 🧠  
Analyzes email domains, phone country codes, and company names to boost parsing accuracy. Uses weighted voting to detect cultural patterns and improve confidence scores.

### Recent Improvements (v1.0.0)

- **750+ Credentials**: Expanded from ~100 to 750+ professional credentials across all industries
- **Hybrid Monorepo**: Refactored into publishable `@normalization/core` package
- **Bug Fixes**: Fixed hyphenated names, generational suffixes, pronouns, multiple parentheses
- **Performance**: Optimized with Sets/Maps for O(1) credential lookups
- **Architecture**: Modular library organization by domain (names, phones, emails, companies, addresses)

## 🚀 Quick Start

### Prerequisites

- Node.js 22.x
- pnpm 9.x
- MySQL/PostgreSQL (for production)

### Installation

```bash
# Clone the repository
git clone https://github.com/roALAB1/data-normalization-platform.git
cd data-normalization-platform

# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Push database schema
pnpm db:push

# Start development server
pnpm dev
```

The application will be available at `http://localhost:3000`

## 📖 Usage

### Interactive Demo

**Name Normalization:**
1. Navigate to the home page
2. Choose **Single** mode to test individual names
3. Enter a name and click "Parse Name"
4. View parsed components, formatted outputs, and repair log

**Phone Normalization:**
1. Click "Phone Demo" in the header
2. Select default country
3. Enter a phone number and click "Parse Phone Number"
4. View international, national, E.164, and RFC3966 formats
5. Try as-you-type formatting

**Email Normalization:**
1. Click "Email Demo" in the header
2. Choose **Single** mode for individual emails
3. Enter an email and click "Normalize Email"
4. View original vs normalized email, provider detection, plus tag extraction
5. Switch to **Batch** mode to upload CSV files (up to 10,000 emails)

**Address Normalization:**
1. Click "Address Demo" in the header
2. Choose **Single** mode for individual addresses
3. Enter an address and click "Format Address"
4. View original vs formatted address with Title Case and abbreviations
5. Switch to **Batch** mode to upload CSV files (up to 10,000 addresses)

### Batch Processing (Browser-based, up to 10K rows)

1. Switch to **Batch** mode on any demo page
2. Paste data (one per line) or upload a CSV file
3. Click "Process Batch"
4. Download results as CSV with statistics

### Large-Scale Processing (Server-side, unlimited rows)

1. Click "Batch Jobs" in the header
2. Upload your CSV file (supports millions of rows)
3. Select normalization type (Name, Phone, Email, etc.)
4. Monitor progress in real-time with WebSocket updates
5. Download results when complete

## 🏗️ Architecture

### Tech Stack

**Frontend**:
- React 19 with TypeScript
- Tailwind CSS 4 + shadcn/ui
- Wouter (routing)
- tRPC (type-safe API)

**Backend**:
- Node.js with Express
- tRPC for API layer
- Drizzle ORM
- MySQL database
- Background job queue
- WebSocket for real-time updates

**Infrastructure**:
- S3-compatible storage
- OAuth authentication
- Real-time progress tracking
- Hybrid monorepo with pnpm workspaces + Turborepo

### Project Structure

```
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── pages/         # Page components
│   │   │   ├── HomeEnhanced.tsx       # Name normalization demo
│   │   │   ├── PhoneDemoEnhanced.tsx  # Phone normalization demo
│   │   │   ├── EmailDemo.tsx          # Email normalization demo
│   │   │   ├── AddressDemo.tsx        # Address normalization demo
│   │   │   └── JobDashboard.tsx       # Batch job dashboard
│   │   ├── components/    # Reusable UI components
│   │   └── hooks/         # Custom React hooks
├── server/                # Backend Node.js application
│   ├── routes/
│   │   └── emails.ts      # Email verification API endpoints
│   ├── routers.ts         # tRPC route definitions
│   ├── jobRouter.ts       # Batch job API
│   ├── jobProcessor.ts    # Background worker
│   └── jobDb.ts           # Database operations
├── drizzle/               # Database schema
│   └── schema.ts
├── shared/                # Shared types and platform-wide normalization library
│   └── normalization/     # Organized by domain
│       ├── names/         # Name normalization (750+ credentials, titles, prefixes, suffixes)
│       │   ├── NameEnhanced.ts        # Enhanced name parser
│       │   ├── credentials.ts         # 750+ professional credentials
│       │   ├── titles.ts              # Name titles and prefixes
│       │   └── suffixes.ts            # Generational suffixes
│       ├── phones/        # Phone normalization (250+ countries)
│       │   ├── PhoneEnhanced.ts       # Google libphonenumber integration
│       │   └── config.ts              # Country codes and formats
│       ├── emails/        # Email normalization
│       │   ├── EmailEnhanced.ts       # validator.js integration
│       │   └── EmailVerification.ts   # Enterprise verification
│       ├── addresses/     # Address normalization
│       │   └── AddressFormatter.ts    # Simple format standardization
│       ├── intelligent/   # Intelligent platform
│       │   ├── DataTypeDetector.ts    # Auto column type detection
│       │   ├── UnifiedNormalizationEngine.ts  # Multi-type routing
│       │   └── SmartCSVProcessor.ts   # CSV analysis
│       └── companies/     # Company normalization (coming soon)
├── packages/              # Publishable packages
│   └── normalization-core/ # @normalization/core npm package
└── docs/                  # Additional documentation
    ├── NAME_NORMALIZATION_IMPLEMENTATION.md
    ├── PHONE_NORMALIZATION_IMPLEMENTATION.md
    └── EMAIL_NORMALIZATION_IMPLEMENTATION.md
```

## 📦 Publishable Package

The normalization library is available as a standalone package:

```bash
# Install from the monorepo
pnpm add @normalization/core

# Use in your project
import { NameEnhanced } from '@normalization/core/names';
import { PhoneEnhanced } from '@normalization/core/phones';
import { EmailEnhanced } from '@normalization/core/emails';
import { AddressFormatter } from '@normalization/core/addresses';
import { DataTypeDetector, UnifiedNormalizationEngine } from '@normalization/core/intelligent';
```

**Package Features**:
- 750+ professional credentials
- 250+ country phone support
- RFC 5322 email validation
- CJS + ESM + TypeScript declarations
- O(1) lookup performance
- Modular imports by domain
- Zero dependencies (core functionality)

## 🔧 Configuration

### Environment Variables

Required environment variables (see `.env.example`):

```env
# Database
DATABASE_URL=mysql://user:password@localhost:3306/normalization

# S3 Storage
S3_ENDPOINT=https://s3.amazonaws.com
S3_BUCKET=your-bucket
S3_ACCESS_KEY=your-access-key
S3_SECRET_KEY=your-secret-key

# OAuth (if using authentication)
OAUTH_SERVER_URL=https://auth.example.com
JWT_SECRET=your-jwt-secret

# Application
VITE_APP_TITLE=Data Normalization Platform
VITE_APP_LOGO=/logo.png
```

### Customizing Normalizers

Edit configuration files in `shared/normalization/`:

- `names/credentials.ts`: Professional credentials by industry
- `names/titles.ts`: Name titles and prefixes
- `names/suffixes.ts`: Generational suffixes
- `phones/config.ts`: Country codes, formats, carrier patterns
- `emails/EmailEnhanced.ts`: Email provider rules

## 📊 Normalizer Details

### Name Normalizer

**Handles**:
- **Credentials**: 750+ professional credentials across all industries
  - Healthcare: MD, DO, RN, NP, PA, DDS, PharmD, etc. (150+)
  - Finance: CPA, CFA, CFP, ChFC, CLU, etc. (80+)
  - IT/Tech: CISSP, CEH, CCNA, AWS, Azure, CompTIA, etc. (200+)
  - Engineering: PE, EIT, PMP, Six Sigma, etc. (100+)
  - Supply Chain: CSCP, CPIM, CTSC, CLTD, etc. (50+)
  - Legal: JD, LLM, Esq, etc. (40+)
  - Education: PhD, EdD, MA, MS, BA, BS, etc. (60+)
- **Pronouns**: Automatically removes (she/her), (he/him), (they/them), etc.
- **Generational Suffixes**: Jr., Sr., II, III, IV, V, etc.
- **Job Titles**: CEO, Director, Manager, etc.
- **Nicknames**: In quotes or parentheses
- **Last Name Prefixes**: van, de, von, etc. (80+ prefixes)
- **Multi-person Detection**: "John and Jane"
- **Hyphenated Names**: Preserves "Meng-Ling", "Jean-Paul", etc.
- **Encoding Issues**: Fran?ois → François
- **Accent Normalization**: Configurable
- **Asian Name Order Detection**: 400+ surname library

**Output Formats**:
- Full: "Dr. John Paul Smith Jr."
- Short: "John Smith"
- Initials: "J.P.S."
- Custom: "SMITH, John Paul"

### Phone Normalizer

**Powered by Google libphonenumber**

**Handles**:
- 250+ countries with validation
- Type detection (Mobile, Landline, Toll-free, VoIP, Premium Rate, Shared Cost, Personal Number, Pager, UAN, Voicemail)
- Multiple format outputs (E.164, national, international, RFC3966)
- Extension detection
- As-you-type formatting
- Invalid pattern filtering
- Carrier detection

**Output Formats**:
- E.164: "+14155552671"
- National: "(415) 555-2671"
- International: "+1 415-555-2671"
- RFC3966: "tel:+1-415-555-2671"

### Email Normalizer

**Powered by validator.js (23.7k stars, 8-10M weekly downloads)**

**Validation Features**:
- RFC 5322 compliant validation
- UTF-8 local part support
- Domain-specific validation
- TLD requirement enforcement

**Normalization Features**:
- Provider detection (Gmail, Outlook, Yahoo, iCloud, ProtonMail, AOL, Fastmail, Zoho)
- Plus tag extraction and removal (+spam, +newsletter)
- Dot removal (Gmail-specific: john.doe@gmail.com → johndoe@gmail.com)
- Case normalization
- Batch CSV processing (up to 10,000 emails)

**Enterprise Verification** (v1.4.0):
- MX record validation (DNS lookup for mail exchange servers)
- SMTP connection testing (verify server reachability)
- Mailbox verification (RCPT TO command)
- Disposable email detection (temporary/throwaway services)
- Free provider detection (Gmail, Yahoo vs corporate)
- Role-based email detection (admin@, info@, support@)
- Catch-all domain detection (domains accepting all emails)
- Email reputation scoring (0-100 based on all checks)

**Output**:
- Original email
- Normalized email
- Provider (Gmail, Outlook, etc.)
- Plus tag extracted
- Validation status
- Verification score (if enterprise verification enabled)

## 🧪 Testing

```bash
# Run tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Check TypeScript types
pnpm type-check

# Lint code
pnpm lint

# Build packages
pnpm build
```

## 🚢 Deployment

### Using Manus Platform (Recommended)

The project is optimized for deployment on Manus:

1. Create a checkpoint in the Manus UI
2. Click "Publish" in the dashboard
3. Your app is live with automatic SSL and domain

### Manual Deployment

```bash
# Build for production
pnpm build

# Start production server
pnpm start
```

Ensure environment variables are set in your production environment.

## 📝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Development Workflow

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/email-normalizer`)
3. Make your changes
4. Add tests for new functionality
5. Commit with clear messages (`git commit -m "Add email normalizer with disposable detection"`)
6. Push to your fork (`git push origin feature/email-normalizer`)
7. Create a Pull Request

### Code Style

- TypeScript for all new code
- Follow existing patterns in normalizer files
- Add JSDoc comments for public APIs
- Use meaningful variable names
- Keep functions focused and testable

## 🐛 Bug Fixes

All critical bugs have been fixed:

- ✅ Hyphenated names ("Meng-Ling Erik Kuo" now parses correctly)
- ✅ Generational suffixes (III, Jr., Sr. detected as suffixes, not last names)
- ✅ Pronouns removal ((she/her), (he/him), (they/them) automatically stripped)
- ✅ Supply chain credentials (CSCP, CPIM, CTSC now recognized)
- ✅ Multiple parentheses handling ("John Doe (he/him) (Ph.D.)" works correctly)
- ✅ Vite HMR WebSocket configuration (no console errors)
- ✅ Deployment path mappings (all imports resolved correctly)
- ✅ Phone Demo old version button removed (v1.4.1)
- ✅ Cross-page navigation implemented (v1.4.1)

## 📚 Documentation

- [Name Normalizer Implementation](docs/NAME_NORMALIZATION_IMPLEMENTATION.md)
- [Phone Normalizer Implementation](docs/PHONE_NORMALIZATION_IMPLEMENTATION.md)
- [Email Normalization Implementation](docs/EMAIL_NORMALIZATION_IMPLEMENTATION.md)
- [CSV Format Guide](docs/csv-formats.md)
- [Batch Processing Guide](docs/batch-processing.md)
- [Deployment Guide](docs/deployment.md)
- [Monorepo Architecture](MONOREPO.md)

## 🔐 Security

- User authentication via OAuth
- Job-level access control (users only see their own jobs)
- S3 presigned URLs for secure file access
- Input validation and sanitization
- SQL injection protection via Drizzle ORM
- SMTP verification with timeout protection
- Rate limiting for email verification APIs

## 📈 Performance

- **Browser-based**: Handles up to 10,000 rows in ~5-10 seconds
- **Server-side**: Processes 100K rows in ~30-60 seconds
- **Chunked processing**: 1000 rows per chunk to prevent memory issues
- **Real-time updates**: WebSocket-based progress tracking (<100ms latency)
- **Optimized lookups**: O(1) credential matching using Sets and Maps
- **Email verification**: <1ms per email (format + normalization), <100ms with MX/SMTP checks

## 🙏 Acknowledgments

- Original Python script inspired by hours of iteration with Gemini and ChatGPT
- [Namefully](https://namefully.netlify.app/) JavaScript library for name formatting patterns
- [Google libphonenumber](https://github.com/google/libphonenumber) for phone normalization
- [validator.js](https://github.com/validatorjs/validator.js) for email validation
- [@devmehq/email-validator-js](https://github.com/devmehq/email-validator-js) for enterprise email verification
- shadcn/ui for beautiful component library
- Credential data sourced from Wikipedia, FDA, CompTIA, Cisco, Microsoft, AWS, (ISC)², ISACA, APICS, ASQ, and other professional organizations

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details

## 🤝 Support

- Create an [Issue](https://github.com/roALAB1/data-normalization-platform/issues)
- Documentation: [Wiki](https://github.com/roALAB1/data-normalization-platform/wiki)

---

**Built with ❤️ for data professionals who deal with messy real-world data**
