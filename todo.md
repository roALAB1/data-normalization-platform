# Project TODO

## v3.13.4 - Critical Bug Fixes (COMPLETED ✅)

**Status:** COMPLETED - All 139 tests passing, awaiting user verification

**Issues from v3.13.3:**
- [x] Full Name column appearing in output despite deletion
- [x] First/Last names showing middle initials (e.g., "Jennifer R.", "James A. Simon")
- [x] Location column not being split into Personal City + Personal State
- [x] Missing Column Transformations Applied section in post-normalization view

**Root Causes Found:**
1. ✅ Full Name column removal was working correctly (v3.10.0 logic intact)
2. ✅ Middle initials: Single-letter "A" in LAST_NAME_PREFIXES was treated as last name prefix
3. ✅ Location splitting: Not implemented, schema used 'address' type instead of 'location'
4. ✅ Column Transformations: Already implemented in v3.13.3

**Solutions Applied:**
1. ✅ Added single-letter initial check in NameEnhanced.ts (line 1366)
2. ✅ Created locationParser.ts for location splitting
3. ✅ Updated contextAwareExecutor.ts to handle location columns
4. ✅ Created comprehensive test suite (11 new tests)
5. ✅ Updated 2 old tests to match new behavior

**Tasks:**
- [x] Read FIX_PROCESS.md, VERSION_HISTORY.md, DEBUGGING_GUIDE.md, ARCHITECTURE_DECISIONS.md
- [x] Create comprehensive tests for all 4 issues (11 tests)
- [x] Run tests on current code (4 failures, 7 passing)
- [x] Fix middle initial removal in NameEnhanced.ts
- [x] Implement location splitting (locationParser.ts + contextAwareExecutor.ts)
- [x] Verify Full Name column removal (already working)
- [x] Run all tests - **139/139 passing** ✅
- [x] Update VERSION_HISTORY.md with v3.13.4 entry
- [x] Update DEBUGGING_GUIDE.md with problem analysis
- [x] Update ARCHITECTURE_DECISIONS.md with design decisions
- [x] Update todo.md with completion status
- [ ] Ask user to verify before checkpoint
- [ ] Create checkpoint v3.13.4
- [ ] Push to GitHub with proper tags and commits

**Expected Impact:**
- ✅ No Full Name column in output (only First Name + Last Name)
- ✅ First/Last names clean without middle initials
- ✅ Location splits correctly into Personal City + Personal State columns
- ✅ State names converted to 2-letter abbreviations (North Carolina → NC)

**Files Modified:**
- `client/src/lib/NameEnhanced.ts` - Middle initial filtering
- `client/src/lib/locationParser.ts` - NEW: Location parsing
- `client/src/lib/contextAwareExecutor.ts` - Location splitting
- `tests/v3134-critical-fixes.test.ts` - NEW: 11 comprehensive tests
- `tests/name-enhanced-full-name.test.ts` - Updated 1 test
- `tests/name-enhanced-v381-fixes.test.ts` - Updated 1 test

---

## v3.13.3 - Preview Transformations + UI Improvements (BROKEN ❌)

**Status:** BROKEN - Superseded by v3.13.4

**Issues:**
- ❌ Middle initials not removed from First/Last names
- ❌ Location splitting not implemented
- ❌ Full Name column issues

**Checkpoint:** 18ee2f06 (DO NOT USE)

---

## v3.11.0 - Enrichment Requirements Hero (STABLE ✅)

**Status:** STABLE - Can rollback if needed

**Features:**
- [x] Hero section explaining enrichment requirements
- [x] Visual design improvements
- [x] User guidance for data preparation

**Checkpoint:** 18f8b9b2

---

## v3.10.0 - Simplified Output Schema (STABLE ✅)

**Status:** STABLE - All 124 tests passing, production ready

**Goal:** Simplify output to only First Name and Last Name columns to match enrichment tool requirements.

**Features:**
- [x] Remove "Name" column from output
- [x] Output only "First Name" and "Last Name" columns
- [x] Strip credentials, titles, suffixes, and middle names
- [x] All 124 tests passing

**Checkpoint:** ff3cf9df

---

## v3.9.1 - Bug Report System (STABLE ✅)

**Status:** STABLE - Production ready

**Features:**
- [x] Bug report API endpoints
- [x] Report Issue button in UI
- [x] Bug report submission dialog
- [x] End-to-end tested

**Checkpoint:** 33978c6f

---

## v3.8.1 - Credential Stripping Fixes (STABLE ✅)

**Status:** STABLE - 93% clean (382/410 rows perfect)

**Features:**
- [x] Fixed 5 critical credential stripping issues
- [x] Added CDN, WIMI-CP, "M Ed" credentials
- [x] Fixed #NAME? error handling
- [x] Fixed trailing hyphen cleanup

**Checkpoint:** def79358

---

## Future Enhancements

### High Priority
- [ ] International location support (countries, provinces)
- [ ] Address parsing (street, city, state, zip)
- [ ] User preference for middle initial handling

### Medium Priority
- [ ] Geocoding integration for ambiguous locations
- [ ] ZIP code extraction and validation
- [ ] Metropolitan area detection

### Low Priority
- [ ] Middle name expansion (R. → Robert)
- [ ] Multiple middle names handling
- [ ] Property-based testing for location parser

---

## Rollback Commands

**Latest Versions:**
- v3.13.4 (Current): TBD - awaiting checkpoint
- v3.13.3 (Broken): Rollback to checkpoint 18ee2f06 (DO NOT USE)
- v3.11.0 (Stable): Rollback to checkpoint 18f8b9b2
- v3.10.0 (Stable): Rollback to checkpoint ff3cf9df
- v3.9.1 (Stable): webdev_rollback_checkpoint(version_id="33978c6f")
- v3.8.1 (Stable): webdev_rollback_checkpoint(version_id="def79358")
- v3.6.0: webdev_rollback_checkpoint(version_id="c1420db")
- v3.4.1: webdev_rollback_checkpoint(version_id="8c1056a")

---

## Notes

- Always run full test suite before creating checkpoint (139 tests)
- Update all docs (VERSION_HISTORY, DEBUGGING_GUIDE, ARCHITECTURE_DECISIONS, todo.md)
- Ask user to verify before saving checkpoint
- Push to GitHub after checkpoint is verified
- GitHub credentials configured via git config
