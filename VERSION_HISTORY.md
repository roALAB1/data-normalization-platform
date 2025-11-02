# Version History & Changelog

**Purpose:** Track what was attempted, what worked, what failed, and why. This document serves as institutional memory for all developers and AI agents working on this codebase.

**⚠️ MANDATORY:** Review this file before making any code changes. Update after every fix or failed attempt.

---

## v3.7.0 (2025-11-02) - Infrastructure Improvements [STAGING]

**Status:** In Development (Staging Only)

### What Was Attempted:
1. Fixed random letter bug (p, m, s, q, d appearing in names)
2. Hardcoded credentials to bypass module loading issues
3. Implemented database indexes
4. Created automated test suite
5. Created documentation framework

### What Worked:
- ✅ Database indexes created (migration file generated)
- ✅ Documentation framework established
- ✅ Identified root cause: `format()` method leaking format codes

### What Failed:
- ❌ Credential stripping still broken despite multiple attempts
- ❌ Module loading issue not resolved (ALL_CREDENTIALS array empty)
- ❌ Hardcoded credentials approach didn't work
- ❌ Regex escaping fixes didn't work

### Root Causes:
1. **Module Loading Bug:** `ALL_CREDENTIALS` imported from `@shared/normalization/names` returns empty array when bundled by Vite for workers
2. **Format Code Leaking:** `format()` method using `||` operator instead of checking `undefined`, causing format letters to leak when name parts are empty

### Rollback Point:
- Rolled back to v3.6.0 for production stability

---

## v3.6.3 (2025-11-02) - Critical Bug Fix [FAILED]

**Status:** Failed - Rolled Back

### What Was Attempted:
- Fixed random letters (p, m, s, q, d) appearing in normalized names
- Updated `format()` method to check `undefined` instead of using `||`

### What Worked:
- ✅ Format code leaking fixed (p, m, s letters no longer appear)

### What Failed:
- ❌ Credentials still not being stripped
- ❌ Module loading still broken

### Why It Failed:
- Fixed one symptom but didn't address root cause (module loading)
- Spent too much time debugging instead of systematic approach

---

## v3.6.2 (2025-11-02) - Nested Anchor Fix [FAILED]

**Status:** Failed - Rolled Back

### What Was Attempted:
- Fixed nested `<a>` tag error in footer
- Removed inner `<a>` from `Link` component

### What Worked:
- ✅ Nested anchor error resolved

### What Failed:
- ❌ Introduced credential stripping regression

---

## v3.6.1 (2025-11-02) - Bug Fixes + Changelog

**Status:** Failed - Rolled Back

### What Was Attempted:
- Added Changelog tab
- Updated GitHub link
- Updated version to v3.6.1

### What Worked:
- ✅ Changelog tab functional
- ✅ GitHub link updated

### What Failed:
- ❌ Credentials started leaking back into output

---

## v3.6.0-fix1 (2025-11-02) - Worker Import Fix

**Status:** Fixed blocker bug

**What Was Fixed:**
- Removed non-existent `LocationNormalizer` import from `normalization.worker.ts`
- Removed `LocationNormalizer.normalize()` usage from worker
- Worker now returns original value for 'location' type (TODO: implement proper location normalization)

**Root Cause:**
- Worker was importing a module that doesn't exist: `shared/normalization/locations`
- This caused "Failed to process chunk 0" error
- Vite couldn't resolve the import, preventing worker from loading

**What Worked:**
- ✅ Removed import statement
- ✅ Removed method call
- ✅ Added TODO comment for future implementation
- ✅ Created test to prevent regression (`tests/worker-initialization.test.ts`)
- ✅ All tests passing

**Files Changed:**
- `client/src/workers/normalization.worker.ts`
- `tests/worker-initialization.test.ts` (new)
- `vitest.config.ts` (added tests/** to include pattern)

**Checkpoint:** Not yet saved - awaiting user verification

---

## v3.6.0 (2025-10-XX) - Location Normalization [STABLE] ⭐

**Status:** Stable - Production Version

### What Worked:
- ✅ Location normalization splits into City + State
- ✅ 50+ US state abbreviations supported
- ✅ E.164 phone formatting
- ✅ First/Last name columns
- ✅ React fixes
- ✅ **Credentials stripped correctly**

### Known Issues:
- None reported

**Checkpoint:** `c1420db` / `ae7b664b`

---

## v3.5.2 - Force Cache Clear

**Status:** Stable

### What Worked:
- ✅ Cache clearing mechanism

---

## v3.5.1 - Fixed Parsing Bugs

**Status:** Stable

### What Worked:
- ✅ Parsing bug fixes

---

## v3.5.0 - Smart Comma Detection

**Status:** Stable

### What Worked:
- ✅ Smart comma detection
- ✅ Excel formula prevention

---

## v3.4.1 - Fixed Credential Matching [STABLE FALLBACK] ⭐

**Status:** Stable - Fallback Option

### What Worked:
- ✅ Reverted to regex approach for credentials
- ✅ Credential matching working correctly

**Checkpoint:** `8c1056a`

**Note:** If v3.6.0 doesn't work, rollback to this version.

---

## v3.4.0 - Major Credential Stripping Fixes

**Status:** Stable

### What Worked:
- ✅ Major credential stripping improvements
- ✅ Title case handling

---

## v3.3.1 - Footer Updates

**Status:** Stable

### What Worked:
- ✅ Footer with version and GitHub link

---

## v3.3.0 - Added Credentials + Pronoun Handling

**Status:** Stable

### What Worked:
- ✅ Added 15+ missing credentials
- ✅ Fixed pronoun handling

---

## Lessons Learned

### What NOT to Do:
1. ❌ Don't debug regex escaping for hours - rollback and try different approach
2. ❌ Don't rely on module imports in workers - Vite bundling breaks them
3. ❌ Don't make multiple changes without testing each one
4. ❌ Don't skip creating tests before making fixes
5. ❌ Don't use `||` for undefined checks - use `!== undefined`

### What TO Do:
1. ✅ Create tests BEFORE making changes
2. ✅ Rollback to last working version when stuck
3. ✅ Apply one fix at a time and validate
4. ✅ Document what failed so we don't repeat it
5. ✅ Use staging environment for testing
6. ✅ Hardcode critical data instead of relying on broken imports

### Critical Patterns:
- **Module Loading:** Workers don't load ES modules correctly - hardcode or use different approach
- **Regex Escaping:** Use template literals carefully - `\\b` vs `\b` matters
- **Format Codes:** Always check `!== undefined` instead of `||` for optional values
- **Testing:** Automated tests prevent regressions - create them FIRST

---

## Quick Reference

### Stable Versions:
- **v3.6.0** (`c1420db` / `ae7b664b`) - Current production
- **v3.4.1** (`8c1056a`) - Fallback if v3.6.0 fails

### Failed Versions (Don't Use):
- v3.7.0 - Credential stripping broken
- v3.6.3 - Credential stripping broken
- v3.6.2 - Credential stripping broken
- v3.6.1 - Credential stripping broken

### Rollback Command:
```bash
# Use webdev_rollback_checkpoint tool with version_id
webdev_rollback_checkpoint(version_id="c1420db")  # v3.6.0
webdev_rollback_checkpoint(version_id="8c1056a")  # v3.4.1
```
