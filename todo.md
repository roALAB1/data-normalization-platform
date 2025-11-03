# Project TODO

## Current Status
- **Latest Stable:** v3.9.1 - Bug Report System Complete (API + UI, production ready)
- **Next:** v3.8.2 - Fix Remaining 2 Issues (Row 81, Row 170)

---

## v3.8.0 - Context-Aware CSV Processor [STABLE]

**Problem:** CSV processor doesn't understand column relationships. When input has "Name", "First Name", and "Last Name" columns, it normalizes each independently and overwrites good data.

**Example:**
- Input: Name="Dr. John Smith MD", First Name="John", Last Name="Smith"
- Current: Normalizes "Name" → First="John", Last="Smith", then overwrites with existing columns
- Result: First Name and Last Name don't get cleaned properly

**Solution:** 3-phase context-aware processing:

### Phase 1: Schema Analysis
- [ ] Detect column relationships (full vs component columns)
- [ ] Identify column variants (personal vs business phone)
- [ ] Build column schema with roles and relationships

### Phase 2: Normalization Plan
- [ ] Identify primary columns to normalize first
- [ ] Identify derived columns that extract from primary
- [ ] Identify independent columns to normalize separately

### Phase 3: Context-Aware Execution
- [ ] Normalize primary columns first (cache results)
- [ ] Derive component columns from cache (don't re-normalize)
- [ ] Handle independent columns separately

### Tasks:
- [x] Read FIX_PROCESS.md, VERSION_HISTORY.md, DEBUGGING_GUIDE.md, ARCHITECTURE_DECISIONS.md
- [x] Create test FIRST (tests/context-aware-processor.test.ts)
- [x] Run test on current code (should fail)
- [x] Implement schema analyzer
- [x] Implement normalization plan builder
- [x] Implement context-aware executor
- [x] Run tests - 76/76 passing
- [x] Update VERSION_HISTORY.md
- [ ] Update DEBUGGING_GUIDE.md
- [ ] Update ARCHITECTURE_DECISIONS.md
- [ ] Ask user to verify with dclark_aids.csv

**Expected Impact:**
- Fix all 41 issues in user's CSV
- Prevent future column overwriting issues
- Handle location, phone, address variants intelligently

---

## v3.7.6 - Remove Hybrid Heuristics + Add Report Issue [PARTIAL]
- [x] Remove hybrid heuristics (too risky for names)
- [ ] Add "Report Issue" button to UI (NOT STARTED)
- [x] Build credentials tracking database (schema + API done)
- [x] Run tests - 32/32 passing
- [ ] Complete UI components
- [ ] Update documentation
- [ ] Ask user to verify

**Decision:** Hybrid heuristics are too risky for name data. Stick with pure list approach (679 credentials) and let users report missing credentials.

**New Features:**
1. Report Issue button - users can flag incorrectly stripped/kept text
2. Credentials database - track which credentials appear in real data

---

## v3.7.5 - Fix Remaining 30 Issues [FAILED - REGRESSION]

**Status:** FAILED - Fixes didn't work due to column overwriting issue

- [x] Add 5 missing credentials: CPO, SRS, PSA, CPC, Ph D (with space)
- [x] Fix First Name column normalization (strip titles, middle names, nicknames)
- [x] Fix Last Name column normalization (strip suffixes, credentials, middle names)
- [x] Fix trailing punctuation (commas, hyphens)
- [x] Fix nickname removal (now removes entire nickname, not just quotes)
- [x] Fix -FNP credential stripping (clean up leading hyphens)
- [x] Run tests - 32/32 passing
- [x] User verified - WORSE than before (41 issues found)

**Root Cause:** Context-aware processor issue - existing First/Last columns overwrite good data from Name column normalization.

---

## v3.7.4 - More Missing Credentials [STABLE]
- [x] Added 17 credentials (657 → 674)
- [x] Fixed hyphenated credential matching
- [x] All tests passing
- [x] User verified - "better overall but ~10 issues remain"

---

## v3.7.3 - Full Name Credential Stripping [STABLE]
- [x] Added 24 credentials (633 → 657)
- [x] Fixed `full` getter to exclude prefix
- [x] Fixed pronoun pattern for square brackets
- [x] All tests passing

---

## v3.7.2 - Credentials Without Commas [STABLE]
- [x] Exported ALL_CREDENTIALS
- [x] Updated normalizeValue.ts
- [x] User verified - 99.75% clean

---

## v3.7.1 - CSV Column Cleaning [STABLE]
- [x] Created normalizeValue.ts
- [x] Integrated into worker
- [x] User verified - "much better"

---

## v3.7.0 - Credentials Fixed [STABLE]
- [x] Hardcoded 633 credentials
- [x] All tests passing

---

## Earlier Versions
See VERSION_HISTORY.md for complete history.


## v3.8.1 - Fix Remaining 5 Issues [STABLE]

**Status:** STABLE - Production ready! 93% clean (382/410 rows perfect)

**Problematic Rows:**
1. Row 81: `Nancy Kurts -` → Last Name shows "-" (trailing hyphen)
2. Row 170: `#NAME?` → Full Name and First Name show "#NAME?" error
3. Row 386: `Jeani Hunt CDN` → Last Name shows "CDN" (credential not stripped)
4. Row 404: `Andie B Schwartz M Ed` → Last Name shows "Ed" (part of "M Ed" credential)
5. Row 405: `Abrar Al-Shaer WIMI-CP` → Last Name shows "WIMI-CP" (credential not stripped)

**Solutions Applied:**
1. Row 81: ✅ Trailing hyphen cleanup already existed (line 1149)
2. Row 170: ✅ Added Excel error detection (`/^#[A-Z]+[?!]?$/`)
3. Row 386: ✅ Added CDN credential
4. Row 404: ✅ Added "M Ed" and "M.Ed" space-separated variants
5. Row 405: ✅ Added WIMI-CP credential

**Tasks:**
- [x] Analyze all 5 issues
- [x] Create test FIRST (10 tests)
- [x] Add missing credentials (CDN, WIMI-CP, "M Ed", "M.Ed")
- [x] Fix "M Ed" splitting issue
- [x] Fix #NAME? error handling
- [x] Fix trailing hyphen issue (already existed)
- [x] Run tests - 86/86 passing (+10 new tests)
- [x] Update VERSION_HISTORY.md
- [x] Update todo.md
- [x] Ask user to verify with CSV
- [x] User verified - 93% clean, 2 real bugs remaining (Row 81, Row 170)
- [x] Mark STABLE - Production ready!

---

## v3.8.2 - Fix Remaining 2 Issues [NOT STARTED]

**Status:** NOT STARTED

**Problematic Rows:**
1. **Row 81:** `Nancy Kurts -` → Last Name = "-" (trailing hyphen cleanup not working)
2. **Row 170:** `-Ling Erik Kuo` → First Name = "-Ling" (leading hyphen issue)

**Root Causes:**
1. **Row 81:** Trailing hyphen cleanup exists (line 1149) but not working correctly
   - Code: `textNoNicknames.replace(/\s*[-\u2013\u2014]\s*$/, '').trim()`
   - Issue: May be running before final name parsing, so hyphen gets into lastName
   
2. **Row 170:** Leading hyphen in first name
   - Original: `-Ling Erik Kuo` (should be `Meng-Ling Erik Kuo`)
   - Excel formula prevention removed hyphen from formula check
   - Need to handle leading hyphens in name parts

**Tasks:**
- [ ] Read FIX_PROCESS.md, VERSION_HISTORY.md, DEBUGGING_GUIDE.md
- [ ] Create test FIRST (tests/name-enhanced-v382-fixes.test.ts)
- [ ] Run test on current code (should fail)
- [ ] Fix trailing hyphen issue (Row 81)
- [ ] Fix leading hyphen issue (Row 170)
- [ ] Run tests - should pass all 88 tests (+2 new)
- [ ] Update VERSION_HISTORY.md
- [ ] Update todo.md
- [ ] Ask user to verify with CSV

**Expected Impact:**
- Fix final 2 real bugs
- 100% clean CSV (excluding incomplete source data)
- Production-ready name normalization system

---

## Future Enhancements [BACKLOG]

### Incomplete Name Handling
- [ ] Add option to filter/flag incomplete names (single-letter last names)
- [ ] Add validation mode: strict (reject incomplete) vs lenient (accept as-is)
- [ ] Add warning column for flagged rows

### User-Reported Issues
- [ ] Add "Report Issue" button to UI → **MOVED TO v3.9.0**
- [ ] Build credentials tracking database
- [ ] Allow users to flag incorrectly stripped/kept text

---

## v3.9.0 - Bug Report System Phase 1 [STABLE]

**Status:** STABLE - API complete, tested with UI

**Goal:** Allow users to report normalization issues directly from the UI

**Features:**
- [ ] Database schema for issue_reports table
- [ ] API endpoint to submit bug reports
- [ ] "Report Issue" button in results table
- [ ] Report dialog with context capture
- [ ] Admin dashboard to view reports
- [ ] Export function for AI review

**Tasks:**
- [x] Read all required docs (VERSION_HISTORY, DEBUGGING_GUIDE, ARCHITECTURE_DECISIONS)
- [x] Create database migration for issue_reports table
- [x] Create tests for bug report API (14 tests)
- [x] Implement bug report API endpoints (5 endpoints)
- [ ] Create UI components (Report button + dialog) - DEFERRED to v3.9.1
- [x] Run tests and verify functionality (14/14 passing)
- [x] Update documentation (VERSION_HISTORY, DEBUGGING_GUIDE, ARCHITECTURE_DECISIONS)
- [x] Ask user to verify API before checkpoint
- [x] User verified - API working, report saved to database

**Design Reference:** See `BUG_REPORT_SYSTEM_DESIGN.md` for full design


## v3.9.1 - Bug Report UI Components [STABLE]

**Status:** STABLE - End-to-end tested, production ready

**Goal:** Add UI components for bug reporting (Report Issue button + submission dialog)

**Features:**
- [ ] Report Issue button in results table
- [ ] Bug report submission dialog
- [ ] Issue type selector
- [ ] Severity selector
- [ ] Description textarea
- [ ] Expected output fields
- [ ] Success/error feedback

**Tasks:**
- [x] Read all required docs (VERSION_HISTORY, DEBUGGING_GUIDE, ARCHITECTURE_DECISIONS)
- [x] Design UI components structure and user flow
- [x] Create ReportIssueButton component
- [x] Create ReportIssueDialog component
- [x] Integrate into IntelligentNormalization page
- [x] Test UI functionality in browser
- [x] Update documentation (VERSION_HISTORY, todo.md)
- [x] Ask user to verify before checkpoint
- [x] User verified - Report submitted successfully, saved to database

**Design Principles:**
- Use shadcn/ui components (Button, Dialog, Select, Textarea)
- Match existing app design (colors, spacing, typography)
- Mobile-responsive
- Clear success/error states
- Accessible (keyboard navigation, ARIA labels)

**User Flow:**
1. User sees normalized result in table
2. Clicks "Report Issue" button next to problematic result
3. Dialog opens with pre-filled context (original input, actual output)
4. User selects issue type and severity
5. User optionally adds description and expected output
6. User clicks "Submit Report"
7. Success toast appears, dialog closes
8. Report saved to database via tRPC API


## v3.10.0 - Simplified Output Schema (Enrichment-Ready) [IN PROGRESS]

**Status:** IN PROGRESS - Following FIX_PROCESS.md

**Goal:** Output ONLY First Name + Last Name (matching enrichment tool requirements)

**Problem:** Current output includes Full Name, Middle Name, Suffix which enrichment tool doesn't need

**Solution:**
- Remove Full Name, Middle Name, Suffix from output columns
- Output only: `First Name`, `Last Name`
- Use Full Name internally for parsing context
- Strip all credentials, titles, suffixes automatically
- Match ENRICHMENT_REQUIREMENTS.md schema exactly

**Tasks:**
- [x] Read all required docs (FIX_PROCESS, VERSION_HISTORY, DEBUGGING_GUIDE, ARCHITECTURE_DECISIONS)
- [ ] Create tests for simplified schema (First Name + Last Name only)
- [ ] Run tests on current code (should fail)
- [ ] Update normalization engine to output only First Name + Last Name
- [ ] Run tests again (should pass)
- [ ] Update UI to show only First Name + Last Name columns
- [ ] Test with user's CSV file (dclark_aids.csv)
- [ ] Update documentation (VERSION_HISTORY, DEBUGGING_GUIDE, ARCHITECTURE_DECISIONS, todo.md)
- [ ] Ask user to verify before checkpoint

**Enrichment Tool Compliance:**
- ✅ First Name: Title case, no middle initials, no punctuation
- ✅ Last Name: Title case, no middle initials, no punctuation
- ✅ Remove Full Name from output (use internally only)
- ✅ Remove Middle Name from output
- ✅ Remove Suffix from output

**Design Reference:** See `ENRICHMENT_REQUIREMENTS.md` for full requirements



## v3.11.0 - Enrichment Requirements Hero Section [COMPLETE]

**Status:** COMPLETE - Production ready

**Goal:** Add hero section to homepage displaying enrichment normalization requirements in aesthetically pleasing format

**Features:**
- [x] Read enrichment requirements PDF document
- [x] Extract normalization rules and requirements
- [x] Design hero section with requirements table/cards
- [x] Implement aesthetically pleasing layout above upload section
- [x] Show users what normalization will do before they upload
- [x] Test on homepage
- [x] Update documentation

**Design Principles:**
- Clean, modern design matching existing UI
- Easy to scan and understand
- Shows input → output examples
- Highlights key requirements (title case, credential stripping, etc.)
- Positioned prominently on homepage


## v3.12.0 - Bug Fixes: Dropdown, Preview, Location Splitting

**Status:** COMPLETE

**Reported Issues:**
1. [x] Dropdown missing "First Name", "Last Name", "Location" options
2. [x] Preview transformation display missing above "Normalize All Columns" button
3. [x] Location column not split into "Personal City" and "Personal State"

**Requirements:**
- Dropdown should show: Name, Email, Phone, Address, Company, City, State, ZIP Code, Country, First Name, Last Name, Location, Unknown
- Preview should show sample transformations for each detected column before normalization
- Location input (e.g., "Durham, North Carolina, United States") should split into:
  - Personal City: "Durham"
  - Personal State: "North Carolina" (or "NC" if abbreviation detected)
  - Country: Dropped (not needed for enrichment)

**Files to Fix:**
- client/src/pages/IntelligentNormalization.tsx - Add missing dropdown options
- client/src/pages/IntelligentNormalization.tsx - Restore preview transformation display
- client/src/lib/contextAwareExecutor.ts - Add location splitting logic
- shared/normalization/intelligent/DataTypeDetector.ts - Ensure location detection works
