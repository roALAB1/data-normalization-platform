# Project TODO

## v3.44.0 - Edge Case Fixes & ZIP+4 Support

**Status:** IN PROGRESS 🚀

**Goal:** Fix 8 failing edge case tests and add ZIP+4 support to improve extraction rates from 70-75% to 90%+

### Phase 1: Analyze Failing Tests ✅
- [x] Run test suite and identify 5 failing tests (not 8)
- [x] Categorize failures by pattern:
  * **Issue #1:** Addresses without ZIP - city parsed as street (456 Maple Dr Springfield IL)
  * **Issue #2:** Addresses without street suffix - entire address parsed as city (123 Main Durham NC 27701)
  * **Issue #3:** Periods not removed from street names (301 W. 6th St. → should be 301 W 6th St)
  * **Issue #4:** Hyphens in street names treated as word boundaries (North-South → Blvd)
  * **Issue #5:** Trailing periods not removed after secondary address stripping (301 W6th St.)
- [x] Root causes identified:
  * parseRunOnAddress() requires street suffix to identify street boundary
  * Title case formatter doesn't remove periods
  * Hyphenated street names split incorrectly
  * Secondary address stripping leaves trailing periods

### Phase 2: Fix Edge Case Handling ✅
- [x] Fix period handling in street names (titleCase now removes periods)
- [x] Fix hyphenated street name preservation (North-South Blvd)
- [x] Fix stripSecondaryAddress word boundary issues (Springfield vs sp)
- [x] Fix addresses without ZIP codes (456 Maple Dr Springfield IL)
- [x] Fix addresses without street suffix (123 Main Durham NC 27701)
- [x] Update AddressParser.ts with all fixes
- [x] Verify all 25 tests now pass (was 20/25, now 25/25)

### Phase 3: ZIP+4 Support ✅
- [x] Add ZIP+4 pattern detection (12345-6789)
- [x] Update parseRunOnAddress() to handle extended format
- [x] Add 12 tests for ZIP+4 extraction (all passing)
- [x] Ensure backward compatibility with 5-digit ZIP
- [x] Test mixed ZIP formats (5-digit and ZIP+4)

### Phase 4: Testing & Validation ✅
- [x] Run full test suite (71/71 passing - includes 34 v3.42, 25 v3.43, 12 v3.44)
- [x] Test with 200+ sample addresses (203 total)
- [x] Verify extraction rates EXCEEDED targets:
  * City: 99.5% (target 90%+, was 75%) - **+24.5% improvement**
  * State: 91.1% (target 90%+, was 70%) - **+21.1% improvement**
  * ZIP: 91.1% (target 85%+, was 55%) - **+36.1% improvement**
- [x] Test ZIP+4 extraction on real data (12 tests, all passing)
- [x] Verify backward compatibility (5-digit ZIPs still work)

### Phase 5: Documentation & Delivery ✅
- [x] Update VERSION_HISTORY.md with v3.44.0 (docs/VERSION_HISTORY_v3.44.0.md)
- [x] Update CHANGELOG.md with comprehensive v3.44.0 entry
- [x] Create checkpoint (ready)
- [x] Deliver to user with improved test results

---

## v3.43.0 - Automatic City/State Splitting from Parsed Addresses

**Status:** COMPLETED ✅

### Phase 5: Documentation & Delivery
- [x] Update VERSION_HISTORY.md with v3.43.0 (docs/VERSION_HISTORY_v3.43.0.md)
- [x] Update CHANGELOG.md with v3.43.0 entry
- [x] Create checkpoint (66f8afa1)
- [x] Deliver to user with test results

---

## v3.42.0 - Address Normalization Fixes

**Status:** COMPLETED ✅

### Phase 5: Documentation & Delivery
- [x] Update VERSION_HISTORY.md with v3.42.0
- [x] Update CHANGELOG.md
- [x] Create checkpoint (8bdf2bee)
- [x] Deliver to user with test results

---

## v3.41.0 - Release Automation & Versioning Improvements

**Status:** COMPLETED ✅

### Phase 4: Final Verification
- [x] Committed all changes to git
- [x] Pushed changes to GitHub
- [x] Verified v3.41.0 release created successfully
- [x] Verified GitHub Actions workflows functional
- [x] All automation features working

---

## v3.40.6 - CRITICAL: Fix Hanging Server (72% CPU, Not Responding)

**Status:** COMPLETED ✅

**Root Cause:** File descriptor leak in Vite's HMR system (19 leaked handles to index.html)

**Solution:**
- Added file watcher limits to vite.config.ts
- Proper file handle cleanup in server/_core/vite.ts
- 90% CPU reduction (72% → 7.2%)
- 99.97% faster health checks (30s → 10ms)

---

## ARCHIVED TASKS

### v3.14.0 - Fix 198 Name Parsing Failures (Foreign Prefixes, Job Titles, Emojis)
**Status:** COMPLETED ✅
- 266/266 tests passing
- 70% improvement in parsing success rate

### v3.13.9 - Systematic Credential Scan
**Status:** COMPLETED ✅
- Added 314 missing credentials (682 → 996)
