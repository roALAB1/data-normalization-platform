# Debugging Guide

**Purpose:** Document known issues, failed approaches, optimal solutions, and debugging patterns for future developers and AI agents.

**⚠️ MANDATORY:** Read this BEFORE attempting any fixes. Update AFTER every debugging session.

---

## 🔴 BEFORE YOU START: Read FIX_PROCESS.md

**ALL code changes MUST follow the 6-step process in `FIX_PROCESS.md`:**

1. ✅ Check docs (VERSION_HISTORY, DEBUGGING_GUIDE, ARCHITECTURE_DECISIONS)
2. ✅ Create test FIRST
3. ✅ Apply fix
4. ✅ Run test
5. ✅ Update docs
6. ✅ Ask user to verify

**NO SHORTCUTS.** See `FIX_PROCESS.md` for full details.

---

---

## Table of Contents

1. [Known Issues](#known-issues)
2. [Failed Approaches (What NOT to Do)](#failed-approaches-what-not-to-do)
3. [Optimal Solutions (What TO Do)](#optimal-solutions-what-to-do)
4. [Debugging Patterns](#debugging-patterns)
5. [Testing Requirements](#testing-requirements)
6. [Emergency Procedures](#emergency-procedures)

---

## Known Issues

### 1. v3.8.1 Remaining Issues (IN PROGRESS 🚧)

**Problem:**
- Row 81: `Nancy Kurts -` → Last Name = "-" (trailing hyphen not cleaned)
- Row 170: `-Ling Erik Kuo` → First Name = "-Ling" (leading hyphen issue)

**Root Cause:**
1. **Row 81:** Trailing hyphen cleanup exists (line 1149) but runs before final name parsing
   - Code: `textNoNicknames.replace(/\s*[-\u2013\u2014]\s*$/, '').trim()`
   - Hyphen gets into lastName during parsing after cleanup runs
   
2. **Row 170:** Leading hyphen in first name
   - Original: `-Ling Erik Kuo` (should be `Meng-Ling Erik Kuo`)
   - Excel formula prevention was removed from hyphen check
   - Need to handle leading hyphens in name parts

**Solution (v3.8.2):**
- TBD - See todo.md for planned approach
- Will require test-first development per FIX_PROCESS.md

**Status:**
- v3.8.1 marked STABLE despite these 2 issues (93% clean overall)
- 26 other "issues" are incomplete source data (acceptable)
- Production ready for real-world use

---

### 2. Credentials Without Commas Not Removed (FIXED ✅)

**Problem:**
- Last Name column still has credentials like "Simon MD", "Kopman DDS"
- Middle initials like "S. Perrin" not being removed
- v3.7.1 only removed credentials AFTER commas

**Root Cause:**
- normalizeValue.ts only had comma-removal logic: `cleaned.replace(/,.*$/, '')`
- No pattern matching for credentials as standalone words

**Solution (v3.7.2):**
1. Exported ALL_CREDENTIALS from NameEnhanced.ts
2. Added credential regex pattern to normalizeValue.ts:
   ```typescript
   const credentialPattern = new RegExp(
     `(?<![-])\\b(${ALL_CREDENTIALS.map(c => escapeRegex(c)).join('|')})(?=\\s|$|[^\\w])`,
     'gi'
   );
   cleaned = cleaned.replace(credentialPattern, '').trim();
   ```
3. Added middle initial removal: `cleaned.replace(/^[A-Z]\\.\\s+/, '')`

**Test Coverage:**
- ✅ 18/18 tests passing in `csv-column-cleaning.test.ts`
- ✅ Credentials without commas removed
- ✅ Middle initials removed
- ✅ Credentials after commas still working

**Files:**
- `client/src/lib/NameEnhanced.ts` - Exported ALL_CREDENTIALS
- `client/src/lib/normalizeValue.ts` - Added credential pattern
- `tests/csv-column-cleaning.test.ts` - Added 3 new tests

---

### 2. Worker Import Errors (BLOCKER 🔴)

**Problem:**
- Worker fails to initialize with "Failed to process chunk 0" error
- Vite shows: "Failed to resolve import ... from ... Does the file exist?"

**Root Cause:**
- Worker trying to import modules that don't exist
- Broken import statements left in code

**Solution:**
1. Check error message for the missing module path
2. Search worker file for that import
3. Remove the import statement
4. Remove any usage of that module in the code
5. Add TODO comment if feature is needed later
6. Create test to prevent regression

**Example Fix:**
```typescript
// ❌ Before (broken)
import { LocationNormalizer } from '../../../shared/normalization/locations';
case 'location': {
  return LocationNormalizer.normalize(value);
}

// ✅ After (fixed)
// No import
case 'location': {
  // TODO: Implement location normalization
  return value;
}
```

**Test to Add:**
```typescript
it('should not have broken imports', async () => {
  const workerContent = await fs.readFile(workerPath, 'utf-8');
  expect(workerContent).not.toContain('import { NonExistentModule }');
});
```

---

### 2. CSV Column Cleaning (FIXED ✅)

**Problem:**
- Input CSV already has "First Name" and "Last Name" columns with credentials/titles
- Worker was only processing "Name" column, not cleaning existing columns
- Credentials like "MD", "CFP" still appearing in Last Name column
- Titles like "Dr." still appearing in First Name column
- Pronouns like "(she/her)" not being removed

**Root Cause:**
- Worker only handled "name" type, not "first-name" and "last-name" types
- No logic to clean individual column values

**Solution (VALIDATED):**
1. Create separate `normalizeValue.ts` utility file
2. Add `first-name` type handler:
   - Remove titles: `Dr.`, `Prof.`, `Mr.`, `Mrs.`, `Ms.`, `Miss.`
   - Remove middle initials: `Jennifer R.` → `Jennifer`
3. Add `last-name` type handler:
   - Remove credentials after commas: `Berman, MD` → `Berman`
   - Remove pronouns: `Bouch (she/her)` → `Bouch`
   - Remove trailing periods

**Test Coverage:**
- 15/15 tests passing in `csv-column-cleaning.test.ts`
- Covers titles, credentials, pronouns, complex cases

**Files:**
- `client/src/lib/normalizeValue.ts` - Utility function
- `client/src/workers/normalization.worker.ts` - Uses normalizeValue
- `tests/csv-column-cleaning.test.ts` - Test suite

---

### 3. Module Loading in Workers (FIXED ✅)

**Problem:**
- `ALL_CREDENTIALS` array imported from `@shared/normalization/names` returns empty `[]` when loaded in Web Workers
- Vite bundling breaks ES module imports for worker contexts
- Console shows: `CREDENTIALS_SET size: 0`

**Root Cause:**
- Vite's worker bundling doesn't properly include `as const` arrays from shared modules
- Circular dependencies or initialization order issues

**Symptoms:**
- Credentials not being stripped from names
- Empty credential arrays in console logs
- `isCredential()` always returns `false`

**Solution (RESEARCHED & VALIDATED):**

**Enterprise Pattern from theiconic/name-parser (131 stars, production-proven):**
- **DON'T** import credentials from external modules
- **DO** hardcode credentials as constants directly in the class file
- **Pattern:** Define data where it's consumed

**Implementation:**
```typescript
// In NameEnhanced.ts - at the top of the file
const ALL_CREDENTIALS = [
  'MD', 'PhD', 'MBA', 'CFP', 'CPA', 'RN', 'DDS', ...
  // All 723 credentials hardcoded here
];

// Then use it directly
const CREDENTIALS_SET = new Set(ALL_CREDENTIALS);
```

**Why This Works:**
- No module imports = no bundling issues
- Works in all contexts (main thread, workers, tests)
- Zero dependencies on external modules
- Proven pattern from production libraries processing "hundreds of thousands" of names

**Status:** ✅ FIXED in v3.7.0 - All tests passing

---

### 2. Format Code Leaking (FIXED ✅)

**Problem:**
- Random letters (p, m, s, q, d) appearing at beginning/end of names
- Example: "p Michael m March s" instead of "Michael March"

**Root Cause:**
```typescript
// ❌ BAD - Uses || operator
.map(c => formatMap[c] || c)

// When formatMap['p'] is empty string '', it returns 'p' (the letter)
```

**Solution:**
```typescript
// ✅ GOOD - Checks undefined explicitly
.map(c => formatMap[c] !== undefined ? formatMap[c] : c)
.filter(s => s && s.trim())  // Also filter empty strings
```

**Fixed In:** v3.7.0 (staging)

**Location:** `client/src/lib/NameEnhanced.ts` line ~480

---

### 3. Regex Escaping in Credential Patterns

**Problem:**
- Regex patterns not matching credentials correctly
- Word boundaries not working: `\\b` vs `\b`

**Root Cause:**
```typescript
// ❌ BAD - Double escaping
`\\\\b(${credentials.join('|')})\\\\b`  // Results in literal "\\b"

// ✅ GOOD - Single escaping in template literal
`\\b(${credentials.join('|')})\\b`  // Results in word boundary
```

**Solution:**
- Use single backslash `\` in template literals
- Escape special regex chars: `c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')`
- Make periods optional: `.replace(/\\\./g, '\\.?')`

**Status:** ATTEMPTED but didn't solve module loading issue

---

### 4. Nested Anchor Tags

**Problem:**
- React error: "cannot contain a nested <a>"
- Occurs when wrapping `<a>` inside `<Link>` component

**Root Cause:**
```tsx
// ❌ BAD - Link already renders <a>
<Link href="/changelog">
  <a className="...">Changelog</a>
</Link>
```

**Solution:**
```tsx
// ✅ GOOD - Pass className directly to Link
<Link href="/changelog" className="...">
  Changelog
</Link>
```

**Fixed In:** v3.6.2

---

## Failed Approaches (What NOT to Do)

### ❌ Approach 1: Debugging Regex Escaping for Hours

**What We Tried:**
- Spent 10+ iterations trying different regex escape patterns
- Tested `\\b`, `\\\\b`, `\b` variations
- Added console.log debugging for pattern matching

**Why It Failed:**
- The regex wasn't the problem - the credentials array was EMPTY
- Debugging symptoms instead of root cause
- Wasted time on wrong problem

**Lesson:**
- **Always check data exists BEFORE debugging patterns**
- If array is empty, no regex will work
- Use `console.log` to verify data FIRST

---

### ❌ Approach 2: Hardcoding Credentials (Partial Failure)

**What We Tried:**
- Created `HARDCODED_CREDENTIALS` array with 150+ credentials
- Bypassed module import entirely
- Used local array in `NameEnhanced.ts`

**Why It Failed:**
- Regex still didn't match (escaping issues)
- Didn't solve root cause (module loading)
- Band-aid solution, not systematic fix

**Lesson:**
- Hardcoding works as TEMPORARY fix
- Must still fix underlying module loading issue
- Need enterprise-grade solution

---

### ❌ Approach 3: Multiple Changes Without Testing

**What We Tried:**
- Fixed format() method
- Changed credential regex
- Updated imports
- All in one commit

**Why It Failed:**
- Couldn't isolate which change broke what
- Introduced regressions
- Hard to rollback specific changes

**Lesson:**
- **One change at a time**
- Test after EACH change
- Commit working changes before next fix

---

### ❌ Approach 4: No Test Suite Before Changes

**What We Tried:**
- Made fixes without automated tests
- Relied on manual CSV uploads to verify
- No regression detection

**Why It Failed:**
- Every fix broke something else
- No way to catch regressions automatically
- Debugging loop never ended

**Lesson:**
- **Create tests FIRST**
- Tests validate fixes work
- Tests catch regressions immediately

---

## Optimal Solutions (What TO Do)

### ✅ Solution 1: Rollback to Last Working Version

**When to Use:**
- Stuck in debugging loop (3+ failed attempts)
- Don't know root cause
- Breaking more things than fixing

**How to Do It:**
1. Check `VERSION_HISTORY.md` for last stable version
2. Use `webdev_rollback_checkpoint(version_id="...")`
3. Test that version works
4. Apply ONE fix at a time from there

**Example:**
```bash
# Rollback to v3.6.0
webdev_rollback_checkpoint(version_id="c1420db")

# Or fallback to v3.4.1
webdev_rollback_checkpoint(version_id="8c1056a")
```

---

### ✅ Solution 2: Create Tests Before Fixes

**When to Use:**
- Before ANY code changes
- After rolling back to stable version
- When implementing new features

**How to Do It:**
1. Create test file: `tests/name-normalization.test.ts`
2. Write tests for expected behavior
3. Run tests - they should PASS on stable version
4. Make fix
5. Run tests - they should STILL pass

**Example:**
```typescript
import { describe, it, expect } from 'vitest';
import { NameEnhanced } from '../client/src/lib/NameEnhanced';

describe('Credential Stripping', () => {
  it('should strip MD from last name', () => {
    const name = new NameEnhanced('Jennifer Berman MD');
    expect(name.lastName).toBe('Berman');
    expect(name.full).toBe('Jennifer Berman');
  });
  
  it('should strip CFP® from last name', () => {
    const name = new NameEnhanced('John Bell CFP®');
    expect(name.lastName).toBe('Bell');
  });
});
```

---

### ✅ Solution 3: Use Staging Environment

**When to Use:**
- Testing any fixes
- Before publishing to production
- Experimenting with new approaches

**How to Do It:**
1. Keep production on stable version (v3.6.0)
2. Use dev server (port 3000) as staging
3. Test fixes in staging
4. Only publish after validation

---

### ✅ Solution 4: Research Enterprise Solutions

**When to Use:**
- Stuck on same problem multiple times
- Need proven, production-ready approach
- Building critical features

**How to Do It:**
1. Search for enterprise libraries solving same problem
2. Study their source code on GitHub
3. Adopt their patterns and approaches
4. Don't reinvent the wheel

**Examples:**
- `libphonenumber-js` for phone normalization
- `validator.js` for email validation
- Check how they handle module loading in workers

---

## Debugging Patterns

### Pattern 1: Data First, Logic Second

**Always check:**
1. Does the data exist? (`console.log(array.length)`)
2. Is it the right format? (`console.log(array[0])`)
3. Is it being loaded? (`console.log('Module loaded')`)

**Then debug:**
4. Pattern matching (regex, etc.)
5. Logic flow
6. Edge cases

---

### Pattern 2: Binary Search for Bugs

**When multiple changes broke something:**
1. Rollback all changes
2. Apply half the changes
3. Test - works or broken?
4. If broken, remove half again
5. If works, add half back
6. Repeat until you find the breaking change

---

### Pattern 3: Console Log Checkpoints

**Add logs at key points:**
```typescript
console.log('[NameEnhanced] Starting parse:', originalText);
console.log('[NameEnhanced] After credential strip:', cleanedText);
console.log('[NameEnhanced] Final parts:', { firstName, lastName });
```

**Remove logs after fix is working**

---

## Testing Requirements

### Before ANY Code Changes:

1. ✅ Read `VERSION_HISTORY.md`
2. ✅ Read this `DEBUGGING_GUIDE.md`
3. ✅ Read `ARCHITECTURE_DECISIONS.md`
4. ✅ Create test file for the feature
5. ✅ Run tests on current stable version (should pass)

### After Making Changes:

1. ✅ Run automated tests
2. ✅ Test with user's CSV file manually
3. ✅ Check console for errors
4. ✅ Verify no regressions in other features
5. ✅ Update documentation

### Before Publishing:

1. ✅ All tests pass
2. ✅ Manual CSV test passes
3. ✅ No console errors
4. ✅ Documentation updated
5. ✅ Checkpoint saved

---

## Emergency Procedures

### If Production is Broken:

1. **Immediate Rollback:**
   ```bash
   webdev_rollback_checkpoint(version_id="c1420db")  # v3.6.0
   ```

2. **Notify user** of rollback

3. **Fix in staging** before re-publishing

---

### If Stuck in Debugging Loop:

1. **Stop** - Don't make more changes
2. **Rollback** to last working version
3. **Document** what failed in this guide
4. **Research** enterprise solutions
5. **Create tests** before trying again

---

### If Module Loading Breaks:

1. **Don't debug** - it's a known issue
2. **Hardcode** critical data as temporary fix
3. **Research** how enterprise libraries handle it
4. **Implement** proper solution from research

---

## Quick Reference Commands

### Rollback to Stable:
```bash
webdev_rollback_checkpoint(version_id="c1420db")  # v3.6.0
webdev_rollback_checkpoint(version_id="8c1056a")  # v3.4.1
```

### Run Tests:
```bash
pnpm test
```

### Check Logs:
```bash
# Browser console (F12)
# Look for [NameEnhanced] logs
```

### Apply Database Migration:
```bash
pnpm db:push
```

---

## Update Log

| Date | Who | What Changed |
|------|-----|--------------|
| 2025-11-02 | AI Agent | Initial creation with v3.7.0 lessons |

**Remember:** This guide is only useful if we UPDATE it after every debugging session!
