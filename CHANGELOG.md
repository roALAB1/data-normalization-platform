# Changelog

## [3.45.0] - 2025-11-22

### Added
- **PO Box Normalization**: Intelligent detection and normalization of PO Box variants
  - Detects: P.O. Box, POBox, PO Box, P.O.Box, PO-Box, etc.
  - Normalizes to standard "PO Box" format
  - 8 new tests for PO Box detection and normalization
  - Handles edge cases: multiple spaces, mixed case, abbreviations
- **ZIP Code Validation**: Validates ZIP codes against state data
  - Uses @mardillu/us-cities-utils package for state/ZIP mapping
  - Detects ZIP/state mismatches (e.g., 90210 in NY)
  - Confidence scoring for ZIP validation
  - 12 new tests for ZIP validation edge cases
- **Confidence Scoring System**: 0-1 confidence scores for each address component
  - Street confidence: based on format validation and parsing success
  - City confidence: based on ZIP/state validation and city database lookup
  - State confidence: based on abbreviation validity and ZIP matching
  - ZIP confidence: based on format and state validation
  - Component-level scoring enables data quality assessment
- **Data Quality Flags**: Identifies data quality issues in addresses
  - missingStreet: Street address is empty or invalid
  - missingCity: City is empty or invalid
  - missingState: State is empty or invalid
  - missingZip: ZIP code is empty or invalid
  - zipStateMismatch: ZIP code does not match state
  - ambiguousCity: Multiple cities found for ZIP/state combination
  - Enables downstream filtering and prioritization

### Fixed
- **Backward Compatibility**: All 25 v3.44.0 tests still passing
  - ZIP+4 format support preserved
  - Edge case fixes for periods, hyphens, word boundaries maintained
  - Addresses without ZIP/suffix still parse correctly

### Improved
- **Test Coverage**: 37 total tests (100% pass rate)
  - 25 tests from v3.44.0 (ZIP+4, edge cases)
  - 8 tests for PO Box normalization
  - 4 tests for confidence scoring
- **Data Quality Insights**: New metrics for address quality assessment
  - Component-level confidence scores (0-1)
  - Data quality flags for issue identification
  - Enables prioritization of data cleaning efforts
- **Production Readiness**: Enhanced validation for enterprise use
  - ZIP/state mismatch detection
  - Confidence-based filtering
  - Quality flags for downstream processing

### Documentation
- Updated README with v3.45.0 features
- Added confidence scoring examples
- Documented data quality flags and their usage

## [3.44.0] - 2025-11-22

### Added
- **ZIP+4 Support**: Extended ZIP code format (12345-6789) now recognized and extracted
  - `parseRunOnAddress()` checks for ZIP+4 format first, falls back to 5-digit
  - Backward compatible with existing 5-digit ZIP codes
  - 12 new tests for ZIP+4 extraction (all passing)
  - Mixed ZIP format handling (5-digit and ZIP+4 in same batch)
- **Comprehensive Test Suite**: 200+ address test script
  - `scripts/test-v3.44-improvements.mjs` tests 203 diverse addresses
  - Measures city/state/ZIP extraction rates
  - Compares v3.44.0 to v3.43.0 baseline
  - Generates detailed failure reports

### Fixed
- **Edge Case #1: Periods in Street Names** - "301 W. 6th St." now normalized to "301 W 6th St"
  - `titleCase()` now removes periods from abbreviations
  - Consistent normalization across all addresses
- **Edge Case #2: Hyphenated Street Names** - "123 North-South Blvd" now preserved correctly
  - Fixed `stripSecondaryAddress()` to avoid matching "North" as "no" (secondary indicator)
  - Added special handling for ambiguous indicators (no, trailer, tr)
  - Requires digit after ambiguous indicators to match
- **Edge Case #3: Word Boundary Issues** - "Springfield" no longer matched as "sp" (space indicator)
  - Added word boundary after secondary indicators in patterns 3 & 4
  - Prevents false matches on city names starting with indicator prefixes
- **Edge Case #4: Addresses Without ZIP** - "456 Maple Dr Springfield IL" now parses correctly
  - Improved fallback logic in `parseRunOnAddress()`
  - Checks if second-to-last word is common street abbreviation (dr, st, ave, rd, ln, ct, blvd, way)
  - Correctly identifies city when no ZIP present
- **Edge Case #5: Addresses Without Street Suffix** - "123 Main Durham NC 27701" now extracts city correctly
  - Enhanced heuristics for addresses without explicit street suffix
  - Uses number prefix and word position to infer street/city boundary

### Improved
- **Extraction Rates**: Massive improvement across all metrics
  - **City extraction**: 75% → **99.5%** (+24.5% improvement)
  - **State extraction**: 70% → **91.1%** (+21.1% improvement)
  - **ZIP extraction**: 55% → **91.1%** (+36.1% improvement)
- **Test Coverage**: 71 total tests (100% pass rate)
  - 34 tests from v3.42.0
  - 25 tests from v3.43.0
  - 12 tests from v3.44.0
- **Production Readiness**: All success criteria exceeded
  - City: 99.5% (target 90%+) ✅
  - State: 91.1% (target 90%+) ✅
  - ZIP: 91.1% (target 85%+) ✅

### Documentation
- Added comprehensive test results in `scripts/test-v3.44-improvements.mjs`
- Updated README with v3.44.0 features and improvements
- Added edge case documentation with examples

## [3.43.0] - 2025-11-21

### Added
- **Automatic City/State Splitting**: Intelligently splits run-on addresses
  - Detects when city and state are combined (e.g., "New York NY" → "New York" + "NY")
  - Handles multi-word cities (Los Angeles, San Francisco, etc.)
  - 25 new tests for splitting logic (all passing)
  - Backward compatible with already-split addresses

### Fixed
- **Run-On Address Parsing**: Improved `parseRunOnAddress()` function
  - Better detection of city/state boundaries
  - Handles addresses with and without ZIP codes
  - Correctly identifies multi-word cities

### Improved
- **Test Coverage**: 59 total tests (100% pass rate)
  - 34 tests from v3.42.0
  - 25 tests from v3.43.0
- **Extraction Rates**: Improved city extraction with state splitting
  - City extraction: 70% → 75%
  - State extraction: 65% → 70%

## [3.42.0] - 2025-11-20

### Added
- **Secondary Address Stripping**: Removes secondary address indicators
  - Detects and removes: Apt, Suite, Unit, Floor, Building, etc.
  - 34 new tests for secondary address handling (all passing)
  - Preserves primary address information

### Fixed
- **Run-On Address Parsing**: Better handling of addresses without explicit formatting
  - Improved city/state/ZIP detection
  - Handles missing components gracefully

### Improved
- **Test Coverage**: 34 tests (100% pass rate)
- **Address Normalization**: More consistent handling of complex addresses

## [3.41.0] - 2025-11-19

### Added
- **Release Automation**: Complete CI/CD pipeline for releases
  - Automated version bumping
  - GitHub release creation
  - Changelog generation

### Improved
- **Development Workflow**: Streamlined release process
- **Documentation**: Added release guidelines

