# Version History

## v3.13.5 - Hero Section + Ghost Numbers Fix (2025-01-XX)

**Status:** STABLE - UI enhancements complete

### What Was Built:
**Goal:** Restore hero section explaining enrichment features and fix ghost columns (_1, _2, _3) appearing in output.

**Problem:** v3.13.3 rollback removed the hero section, and empty CSV columns were generating ghost column names (_1, _2, _3) in output.

### Solution:

1. **Hero Section:**
   - Added enterprise-scale data normalization hero section
   - Displays 4 feature cards: Names, Emails, Phone Numbers, Addresses
   - Shows key capabilities for each data type
   - Includes examples with before/after transformations

2. **Enhanced Preview Transformations:**
   - Shows actual sample data for each column type
   - Displays before → after transformations with examples:
     * Name: "Dr. John Smith, PhD" → "First Name: John, Last Name: Smith"
     * First Name: "jOhN R." → "John"
     * Last Name: "SMITH, PhD" → "Smith"
     * Location: "Durham, North Carolina, United States" → "Personal City: Durham, Personal State: NC"
   - Purple gradient background with indigo accents

3. **Column Transformations Applied:**
   - Added collapsible section after normalization
   - Shows which columns were transformed and how
   - Displays split badges for columns that generate multiple outputs
   - Green checkmarks for completed transformations

4. **Ghost Column Filtering:**
   - Added regex filter `/^_\d+$/` to detect ghost columns
   - Filtered from CSV download headers (line 322)
   - Filtered from results table headers (line 959)
   - Filtered from results table cells (line 971)

### Files Modified:
- `client/src/pages/IntelligentNormalization.tsx` - Hero section, transformations display, ghost column filtering

### Impact:
- Better user guidance with hero section showing available features
- Cleaner CSV output without ghost columns (_1, _2, _3)
- Improved visualization of transformations before and after normalization
- Professional UI with purple/indigo color scheme

---

## v3.13.4 - Middle Initial Removal + Location Splitting (2025-01-XX)

**Status:** STABLE - All 139 tests passing, production ready

### What Was Built:
**Goal:** Fix critical normalization issues: remove middle initials from First/Last names, implement location splitting into Personal City + Personal State, and ensure Full Name column is properly removed from output.

**Problem:** v3.13.3 had three critical issues:
1. Middle initials appearing in First/Last names (e.g., "Jennifer R." instead of "Jennifer")
2. No location splitting - Location column was passed through unchanged
3. Full Name column sometimes appearing in output despite deletion logic

### Solution:

1. **Middle Initial Filtering:**
   - Added single-letter initial detection in `NameEnhanced.ts` (line 1366)
   - Prevents single letters (A, B, C, etc.) from being treated as last name prefixes
   - Filters out single-letter middle initials from middleParts (line 1383-1388)
   - Fixes issue where "James A. Simon" → Last Name: "A Simon" (now correctly "Simon")

2. **Location Splitting:**
   - Created `locationParser.ts` with comprehensive US location parsing
   - Handles formats: "City, State, Country", "City State", "City Area"
   - Converts state names to 2-letter abbreviations (North Carolina → NC)
   - Prioritizes state abbreviations over state names (fixes "Washington DC" vs "Washington" state)
   - Infers state from well-known city names (San Francisco → CA)
   - Updated `contextAwareExecutor.ts` to split location columns into Personal City + Personal State
   - Removes original Location column from output

3. **Full Name Column Removal:**
   - Verified existing v3.10.0 logic still works correctly
   - Full Name column is properly deleted when processing name data
   - Only First Name and Last Name columns appear in output

### Files Modified:
- `client/src/lib/NameEnhanced.ts` - Added middle initial filtering logic
- `client/src/lib/locationParser.ts` - NEW: Location parsing and splitting
- `client/src/lib/contextAwareExecutor.ts` - Added location splitting logic
- `tests/v3134-critical-fixes.test.ts` - NEW: 11 comprehensive tests for all fixes
- `tests/name-enhanced-full-name.test.ts` - Updated 1 test for new behavior
- `tests/name-enhanced-v381-fixes.test.ts` - Updated 1 test for new behavior

### Test Results:
- **139 tests passing** (15 test files)
- **11 new tests** added for v3.13.4 fixes
- **2 old tests** updated to match new middle initial behavior

### Output Format:

**Input CSV:**
```
Name,Location,Company,Title
"Jennifer R. Berman, MD","Durham, North Carolina, United States",MAS3 Scientific,Owner
```

**Output CSV (v3.13.4):**
```
First Name,Last Name,Personal City,Personal State,Company,Title
Jennifer,Berman,Durham,NC,MAS3 Scientific,Owner
```

**Key Changes:**
- ✅ Middle initials removed from First/Last names
- ✅ Location split into Personal City + Personal State
- ✅ State names converted to 2-letter abbreviations
- ✅ Credentials stripped (MD, PhD, etc.)
- ❌ No "Name" column in output
- ❌ No "Location" column in output

### Technical Details:

**Middle Initial Detection:**
```typescript
// v3.13.4: Skip single-letter initials (A, B, etc.) - they're middle initials, not last name prefixes
const isSingleLetterInitial = parts[i].length === 1;
if (!isSingleLetterInitial && LAST_NAME_PREFIXES.includes(candidate as any)) {
  lastNameParts = [parts[i], ...lastNameParts];
}
```

**Location Parsing Priority:**
1. State abbreviations (DC, CA, NY) - highest priority
2. State names (California, North Carolina)
3. City name inference for well-known cities
4. Area suffix removal (Bay Area → extract city)

**Supported Location Formats:**
- "Durham, North Carolina, United States" → Durham, NC
- "San Francisco Bay Area" → San Francisco, CA
- "Washington DC-Baltimore Area" → Washington, DC
- "Beverly Hills, California" → Beverly Hills, CA

---

## v3.10.0 - Simplified Output Schema (2025-01-XX)

**Status:** STABLE - All 124 tests passing, production ready

### What Was Built:
**Goal:** Simplify output to only First Name and Last Name columns to match enrichment tool requirements.

**Problem:** v3.9.1 output included Full Name, First Name, Middle Name, Last Name, and Suffix columns. Enrichment tools only accept First Name + Last Name format.

### Solution:
1. **Simplified Output Schema:**
   - Removed "Name" (full name) column from output
   - Output only "First Name" and "Last Name" columns
   - Automatically derives First/Last from "Name" column when present
   - Strips all credentials, titles, suffixes, and middle names

2. **Client-Side Processing:**
   - Updated `contextAwareExecutor.ts` to delete "Name" column from output
   - Auto-generates "First Name" and "Last Name" columns when processing name data
   - Maintains title case conversion (John Smith, not JOHN SMITH)

3. **Server-Side Processing:**
   - Updated `IntelligentBatchProcessor.ts` to match client-side behavior
   - Consistent output format across all processing paths

4. **Test Updates:**
   - Updated 5 tests in `context-aware-processor.test.ts` to match new schema
   - All 124 tests passing (10 test files)

### Files Modified:
- `client/src/lib/contextAwareExecutor.ts` - Remove "Name" column, auto-generate First/Last
- `server/services/IntelligentBatchProcessor.ts` - Updated comment for v3.10.0
- `tests/context-aware-processor.test.ts` - Updated 5 test assertions
- `VERSION_HISTORY.md` - Added v3.10.0 entry

### Output Format:
**Input CSV:**
```
Name,Company,Title
"Dr. John Smith, PhD",Acme Corp,CEO
```

**Output CSV (v3.10.0):**
```
First Name,Last Name,Company,Title
John,Smith,Acme Corp,CEO
```

**Key Changes:**
- ❌ No "Name" column in output
- ❌ No "Middle Name" column in output
- ❌ No "Suffix" column in output
- ✅ Only "First Name" and "Last Name" columns
- ✅ Credentials, titles, and suffixes stripped automatically

---

## v3.9.1 - Bug Report System (2024-12-XX)

**Status:** STABLE - All tests passing

### What Was Built:
- Integrated bug report system for user feedback
- Enhanced error handling and logging
- Improved UI/UX for error states

---

## v3.8.1 - Credential Stripping Fixes (2024-12-XX)

**Status:** STABLE - All tests passing

### What Was Built:
- Fixed 5 critical credential stripping issues
- Added support for hyphenated credentials (WIMI-CP, ARNP-FNP)
- Fixed "M Ed" splitting bug
- Added trailing hyphen cleanup
- Added Excel error value handling (#NAME?, #VALUE!, etc.)

---

## Earlier Versions

See git history for details on versions prior to v3.8.1.
