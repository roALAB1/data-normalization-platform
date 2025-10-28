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
