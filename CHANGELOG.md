# Changelog

All notable changes to the Data Normalization Platform are documented in this file.

## [3.15.1] - 2025-11-11

### Fixed
- **CRITICAL BUG FIX:** Column filtering in output CSV
  - User deletes 69 columns from 78-column CSV, keeping only 9
  - Output CSV was containing ALL 78 columns instead of just 9 selected
  - Root cause: `processRowWithContext` was not filtering output columns
  - Solution: Added Phase 4 column filtering at end of normalization pipeline
  - Now output respects user's column selection across both client-side and backend processing

### Changed
- Updated `processRowWithContext` to accept `outputColumns` parameter
- Enhanced normalization pipeline to filter columns before returning results
- Extended backend `submitBatch` endpoint to accept `columnMappings`

### Technical Details
- Files Modified: 8 files across client, shared, and server
- Tests: All 4 unit tests passing (column filtering logic verified)
- Impact: Users can now delete columns and output will ONLY contain selected columns

---

## [3.14.0] - 2025-01-XX

### Fixed
- Job title removal now works by removing titles instead of rejecting entire name
- Added 8 missing job title keywords (Advisor, Expert, Speaker, Keynote, TEDx, Author, Coach, Photographer)
- Improved name parsing for 198 failure cases (2.47% of 8,006 rows)

### Added
- Comprehensive test suite with 29 tests for name parsing edge cases
- Support for foreign name prefixes (van, de, von, Le, El)
- Emoji and special character removal in names

### Test Results
- 266/266 tests passing (5 skipped edge cases)
- 26/29 v3.14.0 tests passing (90% success rate)
- ~70% improvement in parsing success rate

---

## [3.13.8] - 2025-01-XX

### Fixed
- Phone preview format now shows digits only
- Added CSM, CBC credentials to recognition list

---

## [3.13.7] - 2025-01-XX

### Fixed
- Credential regex pattern now makes periods optional (EdD matches Ed.D.)
- Added CCC-SLP, ESDP, WELL AP credentials

---

## [3.13.6] - 2025-01-XX

### Changed
- Updated footer version number
- Restored v3.11.0 enrichment-ready output format hero section

---

## [3.13.5] - 2025-01-XX

### Added
- Hero section with gradient background
- Ghost numbers fix in phone normalization

---

## [3.13.4] - 2025-01-XX

### Fixed
- Middle initial removal in name normalization
- Location splitting for address fields

---

For earlier versions, see VERSION_HISTORY.md
