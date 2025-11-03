# Changelog

## [3.11.0] - 2025-11-02

### Added - Enrichment Requirements Hero Section
- **Hero Section Design**: Beautiful gradient purple/indigo section with glass-morphism cards
  - 6 requirement cards: First Name, Last Name, Address, City, State & ZIP, Phone
  - Clear before → after examples with color coding (red input, green output)
  - Bullet points explaining each normalization rule
  - Positioned prominently above upload section
  - Bottom CTA: "Ready for enrichment in AudienceLab"
- **Responsive Layout**: Grid layout adapts to mobile (1 col), tablet (2 col), desktop (3 col)
- **Visual Design**: 
  - Glass-morphism cards with backdrop blur and white borders
  - Color-coded examples (red-300 for input, green-300 for output)
  - White text on gradient background for high contrast
  - Consistent spacing and typography
- **User Experience**: Users see exactly what normalization will do before uploading CSV

### Technical Details
- Updated `IntelligentNormalization.tsx` with enrichment requirements section
- Created `ENRICHMENT_REQUIREMENTS_SUMMARY.md` reference document
- Responsive grid with Tailwind CSS
- Icons from lucide-react (User, MapPin, Phone)

## [3.10.0] - 2025-11-02

### Changed - Simplified Output Schema (Enrichment-Ready Format)
- **Output Columns**: Simplified to only **First Name** and **Last Name** columns
  - Removed "Name" (full name) column from output
  - Removed "Middle Name" column from output
  - Removed "Suffix" column from output
- **Auto-Derivation**: System automatically generates First Name + Last Name from any name input
  - Handles "Name" column → derives First + Last
  - Handles "First Name" + "Last Name" columns → normalizes both
  - Handles mixed scenarios with intelligent context-aware processing
- **Title Case**: Maintains title case conversion (John Smith, not JOHN SMITH)
- **Credential Stripping**: Strips all 770+ credentials, titles, prefixes, suffixes
- **Enrichment Tool Ready**: Output format matches requirements for Apollo.io, ZoomInfo, Clearbit, etc.

### Technical Details
- Updated `contextAwareExecutor.ts` to delete "Name" column and auto-generate First/Last
- Updated `IntelligentBatchProcessor.ts` for server-side consistency
- Updated 5 tests in `context-aware-processor.test.ts`
- All 124 tests passing (10 test files)
- Added comprehensive VERSION_HISTORY.md entry

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
- Automatic timestamp management
- Version tracking for debugging
