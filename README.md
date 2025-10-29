# Data Normalization Platform

A production-ready web application for normalizing and cleaning messy data at scale. Built to handle tens to hundreds of thousands of rows with intelligent parsing, validation, and formatting.

## 🎯 Overview

This platform provides specialized normalizers for common data types found in business datasets:

- **Name Normalization**: Handles credentials, nicknames, prefixes, multi-person detection, encoding issues, pronouns, generational suffixes, **Asian name order detection**, **context-aware parsing**
- **Phone Normalization**: International format support, carrier detection, validation
- **Email Normalization**: *(Coming soon)*
- **Company Normalization**: *(Coming soon)*
- **Address Normalization**: *(Coming soon)*

### Key Features

✅ **750+ Professional Credentials**: Comprehensive coverage across healthcare, finance, IT, engineering, supply chain, legal, education, and more  
✅ **WebSocket Progress Tracking** ⚡: Real-time batch job updates with <100ms latency (v1.1.0)  
✅ **Asian Name Detection** 🌏: Intelligent detection of family-name-first patterns for 400+ Chinese/Korean/Japanese/Vietnamese surnames (v1.1.0)  
✅ **Context-Aware Parsing** 🧠: Uses email/phone/company context to boost parsing accuracy (v1.1.0)  
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

1. Navigate to the home page
2. Choose **Single** mode to test individual names
3. Enter a name and click "Parse Name"
4. View parsed components, formatted outputs, and repair log

### Batch Processing (Browser-based, up to 10K rows)

1. Switch to **Batch** mode
2. Paste names (one per line) or upload a CSV file
3. Click "Process Batch"
4. Download results as CSV or JSON

### Large-Scale Processing (Server-side, unlimited rows)

1. Click "Batch Jobs →" in the header
2. Upload your CSV file (supports millions of rows)
3. Select normalization type (Name, Phone, etc.)
4. Monitor progress in real-time
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
│   │   ├── components/    # Reusable UI components
│   │   ├── lib/           # Normalizer logic
│   │   │   ├── Name.ts           # Original name normalizer
│   │   │   ├── NameEnhanced.ts   # Enhanced with performance tracking
│   │   │   ├── PhoneNormalizer.ts
│   │   │   ├── csvParser.ts      # Intelligent CSV parsing
│   │   │   └── nameConfig.ts     # Configuration data
│   │   └── hooks/         # Custom React hooks
├── server/                # Backend Node.js application
│   ├── routers.ts         # tRPC route definitions
│   ├── jobRouter.ts       # Batch job API
│   ├── jobProcessor.ts    # Background worker
│   └── jobDb.ts           # Database operations
├── drizzle/               # Database schema
│   └── schema.ts
├── shared/                # Shared types and platform-wide normalization library
│   └── normalization/     # 750+ credentials organized by domain
│       ├── names/         # Name normalization (credentials, titles, prefixes, suffixes)
│       ├── phones/        # Phone normalization
│       ├── emails/        # Email normalization (coming soon)
│       ├── companies/     # Company normalization (coming soon)
│       └── addresses/     # Address normalization (coming soon)
├── packages/              # Publishable packages
│   └── normalization-core/ # @normalization/core npm package
└── docs/                  # Additional documentation
```

## 📦 Publishable Package

The normalization library is available as a standalone package:

```bash
# Install from the monorepo
pnpm add @normalization/core

# Use in your project
import { isCredential, ALL_CREDENTIALS } from '@normalization/core/names';
```

**Package Features**:
- 750+ professional credentials
- CJS + ESM + TypeScript declarations
- O(1) lookup performance
- Modular imports by domain
- Zero dependencies

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

**Output Formats**:
- Full: "Dr. John Paul Smith Jr."
- Short: "John Smith"
- Initials: "J.P.S."
- Custom: "SMITH, John Paul"

### Phone Normalizer

**Handles**:
- 30+ country codes with validation
- Multiple format outputs (E.164, national, international, RFC3966)
- Extension detection
- Carrier type detection (mobile, landline, VOIP, toll-free)
- Invalid pattern filtering

**Output Formats**:
- E.164: "+14155552671"
- National: "(415) 555-2671"
- International: "+1 415-555-2671"
- RFC3966: "tel:+1-415-555-2671"

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

## 🐛 Bug Fixes (v1.0.0)

All critical bugs have been fixed:

- ✅ Hyphenated names ("Meng-Ling Erik Kuo" now parses correctly)
- ✅ Generational suffixes (III, Jr., Sr. detected as suffixes, not last names)
- ✅ Pronouns removal ((she/her), (he/him), (they/them) automatically stripped)
- ✅ Supply chain credentials (CSCP, CPIM, CTSC now recognized)
- ✅ Multiple parentheses handling ("John Doe (he/him) (Ph.D.)" works correctly)
- ✅ Vite HMR WebSocket configuration (no console errors)
- ✅ Deployment path mappings (all imports resolved correctly)

## 📚 Documentation

- [Name Normalizer API](docs/name-normalizer.md)
- [Phone Normalizer API](docs/phone-normalizer.md)
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

## 📈 Performance

- **Browser-based**: Handles up to 10,000 rows in ~5-10 seconds
- **Server-side**: Processes 100K rows in ~30-60 seconds
- **Chunked processing**: 1000 rows per chunk to prevent memory issues
- **Progress tracking**: Real-time updates via polling
- **Optimized lookups**: O(1) credential matching using Sets and Maps

## 🙏 Acknowledgments

- Original Python script inspired by hours of iteration with Gemini and ChatGPT
- [Namefully](https://namefully.netlify.app/) JavaScript library for name formatting patterns
- shadcn/ui for beautiful component library
- Credential data sourced from Wikipedia, FDA, CompTIA, Cisco, Microsoft, AWS, (ISC)², ISACA, APICS, ASQ, and other professional organizations

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details

## 🤝 Support

- Create an [Issue](https://github.com/roALAB1/data-normalization-platform/issues)
- Email: your-email@example.com
- Documentation: [Wiki](https://github.com/roALAB1/data-normalization-platform/wiki)

---

**Built with ❤️ for data professionals who deal with messy real-world data**
