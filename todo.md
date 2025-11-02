# Project TODO

## Current Status
- **Latest Stable:** v3.8.0 - Context-Aware CSV Processor
- **Testing:** v3.8.1 - Final 5 Issues Fixed

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


## v3.8.1 - Fix Remaining 5 Issues [TESTING]

**Status:** TESTING - Awaiting user verification

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
- [ ] Ask user to verify with CSV
