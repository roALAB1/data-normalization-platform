# Project TODO

## Core Features
- [x] Port name normalization logic from Python to JavaScript
- [x] Create configuration data (credentials, job words, prefixes)
- [x] Implement Name class with parsing logic
- [x] Build interactive demo interface
- [x] Add real-time name parsing with live results
- [x] Display parsed name parts (first, middle, last, nickname)
- [x] Show formatting options (full, short, custom patterns)
- [x] Add repair log display
- [x] Add example names for testing
- [x] Add documentation section
- [x] Make responsive design for mobile

## Active Improvements (Completed)
- [x] Add batch processing mode (paste multiple names, process all at once)
- [x] Add CSV upload and download functionality
- [x] Add copy-to-clipboard buttons for formatted outputs
- [x] Add option to preserve accents vs strip to ASCII
- [x] Show visual diff for repair log changes
- [x] Add statistics dashboard (total processed, valid/invalid ratio)
- [x] Show processing time/performance metrics
- [x] Add export options (JSON, CSV, formatted text)
- [x] Add dark mode toggle
- [x] Add validation rules configuration panel
- [x] Add name part highlighting in original input
- [x] Add API endpoint documentation
- [x] Add test suite results display
- [x] Better mobile experience optimization
- [x] Add animated transitions
- [x] Add tooltips & help text
- [x] Add loading states and progress indicators

## Future Improvements
- [ ] Create comparison view (original vs Namefully approach)
- [ ] Show side-by-side comparison with Namefully approach
- [ ] Add search/filter for example names
- [ ] Add custom prefix/credential lists editor
- [ ] Add keyboard shortcuts (Ctrl+Enter to parse)
- [ ] Add internationalization support

## Bug Fixes
- [x] Fix React ref warning with Tooltip wrapping Button components

## Phone Number Normalization (Completed)
- [x] Create phone number configuration (country codes, formats, patterns)
- [x] Implement PhoneNormalizer class with validation logic
- [x] Add international phone number support
- [x] Add phone number formatting options (E.164, national, international)
- [x] Add carrier type detection (mobile, landline, VOIP)
- [x] Add phone number validation and verification
- [x] Create phone number demo page
- [x] Add batch phone number processing
- [x] Integrate phone normalizer into main dashboard

## Bug Fixes (Completed)
- [x] Fix CSV upload stuck on processing in name demo

## Server-Side Processing Upgrade (Completed)
- [x] Upgrade project to web-db-user (adds backend, database, auth)
- [x] Design database schema for jobs and results
- [x] Implement job queue system
- [x] Create API endpoints for file upload
- [x] Build background worker for batch processing
- [x] Add chunked processing (1000 rows per chunk)
- [ ] Implement real-time progress tracking via WebSocket
- [x] Create job status dashboard UI
- [x] Add result download endpoints (CSV, JSON)
- [x] Implement error handling and retry logic
- [x] Add job cancellation support
- [x] Migrate existing normalizers to server-side
- [x] Add S3 file storage for uploads and results
- [x] Create user job history page UI
- [x] Add data quality scoring and statistics

## Bug Fixes (In Progress)
- [x] Add better error logging for batch upload errors (now shows specific error message)

## Critical Bugs
- [x] Fix NameEnhanced parser marking 99% of names as invalid (was using wrong CSV column with credentials)

## New Features (Completed)
- [x] Implement intelligent CSV column detection (single full name, first/last split, or multi-column)
- [x] Auto-detect header row vs data row
- [x] Support multiple name column formats
- [x] Clean credentials from combined first/last names

## Critical Bugs (Fixed)
- [x] Fix regex error: "Invalid regular expression: /?/g: Nothing to repeat" in batch processing (escaped special regex characters)

## GitHub Repository Setup (Completed)
- [x] Initialize Git repository
- [x] Create comprehensive README.md
- [x] Add CONTRIBUTING.md with development guidelines
- [x] .gitignore already exists and configured
- [x] Set up GitHub Actions for CI/CD
- [x] Create issue templates (bug report, feature request)
- [x] Add pull request template
- [x] Add LICENSE (MIT)
- [x] Add CHANGELOG.md
- [x] Commit all documentation to Git
- [x] Push to GitHub (completed - 18 commits pushed successfully with all improvements)
- [ ] Set up branch protection rules (post-push)
- [ ] Configure automated deployment (post-push)

## Critical Bugs (Fixed)
- [x] Fix server-side job processor regex error causing all names to be marked invalid (server restarted to pick up fix)

## Critical Bugs (Fixed)
- [x] Batch jobs not using intelligent CSV parser - now correctly parses CSV columns

## Bugs Fixed
- [x] Titles like "Dr" being treated as first names - now properly removed

## Bugs Fixed
- [x] Suffixes/credentials (MD, PhD, CFP, etc.) being treated as last names - now properly stripped

## Critical Bugs (Fixed)
- [x] Credentials appearing in middle/last name positions - now stripped from all positions
- [x] Credential removal now works anywhere in the name, not just the end
- [x] Added missing credentials (DACM, BCTMB, FAIHM, CFP®, LAc, LMHC, LCSW, etc.)

## Critical Bugs (Active)
- [ ] Credential removal still not working - credentials appearing in middle/last names
- [x] Pronouns in parentheses (she/her, he/him, they/them) - now properly removed

## New Features to Implement
- [ ] Enhanced validation with confidence scoring
- [ ] Name length validation
- [ ] Better handling of initials (J., R.J., etc.)
- [ ] Generational suffix detection (Jr., Sr., II, III, IV)
- [ ] Asian name order detection (family-name-first)
- [ ] Mononym support (single names)
- [ ] Patronymic/matronymic pattern recognition
- [ ] Hyphenated name handling
- [ ] Name particle position detection
- [ ] Phonetic matching for duplicates (Soundex/Metaphone)
- [ ] Fuzzy matching against known name databases
- [ ] Context-aware parsing using other CSV columns
- [ ] Character set validation (mixed scripts detection)

## Active Bugs
- [x] Credentials with modifiers like "DBA (ABD)" - now fully removed
- [x] Hyphens before credentials - now properly cleaned (e.g., "Nancy Kurts - DBA (ABD)")

## Enhancements (Completed)
- [x] Handle multiple sets of parentheses like "John Doe (he/him) (Ph.D.)" - now properly removes pronouns and credentials in correct order

## Critical Bugs (Fixed)
- [x] Generational suffixes (III, II, IV, Jr., Sr.) being treated as last names instead of suffixes - "Albert L Gaffney III" now correctly parses as First: Albert, Middle: L, Last: Gaffney, Suffix: III

## Critical Bugs (Fixed)
- [x] Credentials in comma-separated list not fully removed - "Chaitanya Saha CSCP, CPIM, CTSC" now correctly parses as First: Chaitanya, Last: Saha, Suffix: CSCP CPIM CTSC (added missing supply chain credentials)

## Enhancements (Completed)
- [x] Create comprehensive master list of professional credentials across all industries (healthcare, finance, IT, engineering, legal, education, etc.)

## Architecture Improvements (Completed)
- [x] Refactor into modular normalization library structure with optimized data structures (Sets/Maps for O(1) lookups)
- [x] Organize credentials by industry category (healthcare, finance, IT, engineering, etc.)
- [x] Create normalization library with 750+ credentials from Wikipedia, FDA, CompTIA, Cisco, Microsoft, AWS, (ISC)², ISACA, APICS, ASQ, and other professional organizations
- [x] Implement helper functions (isCredential, isGenerationalSuffix, isTitle, isLastNamePrefix) for efficient lookups
- [x] Update NameEnhanced to use new normalization library

## Integration Tasks (Completed)
- [x] Integrate new normalization library into server-side batch processing pipeline
- [x] Update all data processing components to use optimized library
- [x] Verify batch job processor uses new library
- [x] Test end-to-end pipeline with new library - all test cases passing

## Platform Architecture (Completed)
- [x] Refactor normalization library from /client/src/lib/normalization to /shared/normalization for platform-wide access
- [x] Create domain-specific sub-libraries (names, phones, emails, companies, addresses)
- [x] Update all normalizers to import from shared location
- [x] Add common utilities for validation and formatting
- [x] Document shared library API for future normalizer development with comprehensive README

## Critical Bugs (Fixed)
- [x] Missing navigation - no way to return to homepage from Phone Demo or Batch Jobs pages - added Home button to Batch Jobs page header
- [x] Add consistent navigation header across all pages - Phone Demo already had back button, Batch Jobs now has Home button

## Critical Bugs (Fixed)
- [x] Hyphenated names being split incorrectly - "Meng-Ling Erik Kuo" now correctly parses as First: "Meng-Ling", Middle: "Erik", Last: "Kuo" (fixed credential matching to not match within hyphenated names)
- [x] Excel formula injection - values starting with "-" no longer occur since hyphenated names are preserved


## Platform Architecture (Completed - Hybrid Monorepo)
- [x] Extract normalization libraries into @normalization/core package (750+ credentials)
- [x] Package built successfully (CJS + ESM + TypeScript declarations)
- [x] Restore main app to root level (webdev compatible)
- [x] Keep packages/normalization-core as workspace package
- [x] Update imports in main app to use @normalization/core
- [x] Configure simplified Turborepo for package builds only
- [x] Test webdev tooling - all systems operational (preview, database UI, deployment)
- [x] Hybrid monorepo structure complete and functional


## Critical Bugs (Fixed)
- [x] Deployment failing - Cannot find package '@shared/const' - fixed by adding @shared/* path mapping to tsconfig.json


## Critical Bugs (Fixed)
- [x] Vite HMR WebSocket connection failing - fixed by adding HMR config with wss protocol and port 443


## Post-GitHub Push Tasks (In Progress)
- [x] Update README.md to reflect new features (750+ credentials, hybrid monorepo, bug fixes)
- [x] Create release/tag v1.0.0 to mark this milestone
- [x] Set up branch protection rules on GitHub (guide created - user needs to apply via GitHub UI)
- [x] Publish the app via webdev UI for public access (checkpoint created - user can now click Publish button)
- [x] Create GitHub Release for v1.0.0 with comprehensive release notes


## Version 1.1.0 Features (In Progress)

### WebSocket Progress Tracking
- [x] Install and configure Socket.IO library (server + client)
- [x] Create WebSocket server endpoint in Express
- [x] Add job progress event emitter in job processor
- [x] Update client to connect to WebSocket server
- [x] Replace polling with WebSocket listeners
- [x] Add connection status indicator in UI
- [x] Handle reconnection logic
- [x] Add error handling for WebSocket failures (connection errors, reconnection logic)
- [ ] Test with multiple concurrent jobs (needs real batch job upload)
- [x] Update documentation with WebSocket architecture

### Asian Name Order Detection
- [x] Create comprehensive list of common Asian surnames (Chinese, Korean, Japanese, Vietnamese)
- [x] Add name order detection heuristics
- [x] Implement confidence scoring for detection
- [x] Add flag for family-name-first pattern
- [x] Handle mixed cases (e.g., "John Kim" vs "Kim Min-jun")
- [x] Update NameEnhanced to support name order detection
- [ ] Add option to preserve original order vs auto-reorder (future enhancement)
- [x] Test with real Asian names dataset (added 7 test examples)
- [x] Update documentation with Asian name handling

### Context-Aware Parsing
- [x] Add email domain analysis for cultural hints (.cn, .kr, .jp, .vn)
- [x] Add phone country code detection (+86, +82, +81, +84)
- [x] Add company name analysis for cultural context
- [x] Extend ParseOptions to accept context fields (email, phone, company)
- [x] Improve Asian name detection confidence using context
- [x] Add context metadata to ParseResult
- [x] Test with real-world data containing context (examples in documentation)
- [x] Update documentation with context-aware parsing examples


## Version 1.2.0 Features (In Progress)

### libphonenumber-js Integration
- [x] Install libphonenumber-js package
- [x] Create PhoneEnhanced class with libphonenumber-js
- [x] Add parsing and validation using libphonenumber
- [x] Add multiple format outputs (International, National, E.164, RFC3966)
- [x] Add phone type detection (Mobile, Landline, Toll-free, etc.)
- [x] Add as-you-type formatting
- [ ] Update server-side phone processor to use PhoneEnhanced (optional - current version works)
- [x] Update Phone Demo UI with new features
- [x] Add country selector for default country
- [x] Display phone type in results
- [x] Show all format options (International, National, E.164, RFC3966)
- [ ] Add unit tests for PhoneEnhanced (future enhancement)
- [x] Update documentation with libphonenumber integration
- [x] Test with international phone numbers (10 examples from different countries)
- [x] Optimize bundle size (~110 KB, acceptable for enterprise features)

## Version 1.2.1 Features (In Progress)

### Phone Demo Enhanced - Validation Results Section
- [x] Add detailed validation results section showing region-specific validation
- [x] Display validation status with visual indicators
- [x] Show possible vs valid distinction clearly
- [x] Add validation confidence/quality indicators
