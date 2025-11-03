# Changelog

## [3.13.4] - 2025-01-XX - STABLE

### Fixed - Critical Normalization Issues
- **Middle Initial Removal**: Single-letter initials (A., B., R.) now properly filtered from First/Last names
  - "Jennifer R. Berman" → First: "Jennifer", Last: "Berman" (not "Jennifer R.")
  - "James A. Simon" → First: "James", Last: "Simon" (not Last: "A Simon")
  - Fixed single-letter "a" being treated as last name prefix (Portuguese/Spanish names)
- **Location Splitting**: Location columns now split into Personal City + Personal State
  - "Durham, North Carolina, United States" → City: "Durham", State: "NC"
  - "San Francisco Bay Area" → City: "San Francisco", State: "CA"
  - "Washington DC-Baltimore Area" → City: "Washington", State: "DC"
  - State names converted to 2-letter abbreviations
  - Original Location column removed from output
- **Full Name Column Removal**: Verified v3.10.0 logic still works correctly
  - Only First Name and Last Name columns in output

### Added
- **locationParser.ts**: Comprehensive US location parsing module
  - Handles "City, State, Country" format
  - Handles "City Area" format (Bay Area, Metropolitan Area)
  - Infers state from well-known city names
  - Prioritizes state abbreviations over state names
  - Supports 50+ US states and territories
- **11 New Tests**: Comprehensive test coverage for all fixes
  - Middle initial removal (4 tests)
  - Location splitting (2 tests)
  - Full Name column removal (3 tests)
  - Output schema validation (2 tests)

### Changed
- **NameEnhanced.ts**: Added single-letter initial detection
  - Prevents single letters from being treated as last name prefixes
  - Filters single-letter middle initials from middleParts
- **contextAwareExecutor.ts**: Added location splitting logic
  - Detects location columns (type 'address' + name contains 'location')
  - Splits into Personal City + Personal State
  - Removes original Location column

### Technical Details
- All 139 tests passing (15 test files)
- Updated 2 old tests to match new middle initial behavior
- Full documentation updated (VERSION_HISTORY, DEBUGGING_GUIDE, ARCHITECTURE_DECISIONS)
- Production ready

---

## [3.9.1] - 2025-11-02

### Added - Bug Report System UI
- **ReportIssueButton Component**: Icon button next to each result row for reporting issues
  - AlertCircle icon with tooltip
  - Accessible (keyboard navigation, ARIA labels)
  - Opens dialog on click
- **ReportIssueDialog Component**: Modal form for submitting bug reports
  - Pre-filled fields: Original Input, Actual Output (read-only)
  - User inputs: Issue Type (dropdown), Severity (dropdown), Expected Output (optional), Description (optional)
  - Submit button with loading state
  - Success/error toast notifications
  - Auto-resets form on success
- **Integration**: Added Report Issue button column to results table in IntelligentNormalization page
- **End-to-end Testing**: Verified report submission and database storage

### Technical Details
- Uses shadcn/ui components (Button, Dialog, Select, Textarea, Label, Input, Tooltip)
- tRPC integration with `reports.submit` mutation
- Mobile-responsive dialog
- Loading states during API calls
- Toast notifications for user feedback

## [3.9.0] - 2025-11-02

### Added - Bug Report System API
- **Database Schema**: Created `issueReports` table with 15 columns
  - Tracks original input, actual output, expected output
  - Issue type, severity, status, description
  - User info, version, timestamps
- **5 tRPC API Endpoints**:
  1. `reports.submit` - Submit bug report (public, anonymous OK)
  2. `reports.list` - List reports with filters & pagination
  3. `reports.getById` - Get single report
  4. `reports.updateStatus` - Update status (requires auth)
  5. `reports.stats` - Get statistics
- **Issue Types Supported**:
  - credential_not_stripped
  - credential_incorrectly_stripped
  - name_split_wrong
  - special_char_issue
  - trailing_punctuation
  - leading_punctuation
  - other
- **14 Tests**: Full test coverage for all API endpoints

### Technical Details
- MySQL-compatible insert/update operations
- Pagination support (limit, offset)
- Filter by status, issue type, severity
- Anonymous reporting supported
- Version tracking for debugging

---

## Earlier Versions

See git history for versions prior to v3.9.0.
