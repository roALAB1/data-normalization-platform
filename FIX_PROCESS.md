# 🔴 MANDATORY FIX PROCESS

**⚠️ READ THIS BEFORE MAKING ANY CODE CHANGES ⚠️**

This document defines the **required process** for fixing bugs, adding features, or making any code modifications. **NO EXCEPTIONS.**

---

## The Process (6 Steps - DO NOT SKIP)

### Step 1: Check Documentation (5 minutes)

**Before touching any code, read these 3 files:**

1. **VERSION_HISTORY.md**
   - Has this issue been solved before?
   - What approaches failed?
   - What's the last known working version?

2. **DEBUGGING_GUIDE.md**
   - Is this a known issue?
   - What's the optimal solution pattern?
   - What should I NOT do?

3. **ARCHITECTURE_DECISIONS.md**
   - Are there constraints or compatibility issues?
   - Is there a module loading problem?
   - What's the recommended approach?

**If the issue has been attempted before and failed → STOP and consider rollback instead of trying again.**

---

### Step 2: Create Test FIRST (10 minutes)

**Write a test that validates the fix BEFORE writing any code.**

**Location:** `tests/[feature-name].test.ts`

**Example:**
```typescript
import { describe, it, expect } from 'vitest';
import { NameEnhanced } from '../client/src/lib/NameEnhanced';

describe('Credential Stripping Fix', () => {
  it('should strip MD from last name', () => {
    const name = new NameEnhanced('Jennifer Berman MD');
    expect(name.lastName).toBe('Berman');
    expect(name.full).toBe('Jennifer Berman');
  });
});
```

**Run the test on the CURRENT code:**
- If it passes → The bug might not exist, investigate further
- If it fails → Good, the test validates the bug exists

---

### Step 3: Apply Fix (Variable time)

**Now and ONLY now, make the code change.**

**Rules:**
- ✅ Make ONE change at a time
- ✅ Keep changes small and focused
- ✅ Add comments explaining WHY (not what)
- ❌ Don't make multiple unrelated changes
- ❌ Don't refactor while fixing bugs

---

### Step 4: Run Test (2 minutes)

**Run the test you created in Step 2:**

```bash
pnpm test
```

**Expected result:**
- ✅ Test passes → Fix works, proceed to Step 5
- ❌ Test fails → Fix didn't work, debug or rollback

**If test fails 3 times → STOP and rollback to last working version.**

---

### Step 5: Update Documentation (5 minutes)

**Update ALL 3 documentation files:**

1. **VERSION_HISTORY.md**
   - Add entry for this fix
   - Document what worked
   - Document what was attempted

2. **DEBUGGING_GUIDE.md**
   - Add to "Optimal Solutions" if it's a new pattern
   - Update "Known Issues" if it's now fixed

3. **ARCHITECTURE_DECISIONS.md**
   - Add decision log entry if architectural choice was made

**Also update:**
- `todo.md` - Mark items as complete
- `CHANGELOG.md` - Add user-facing change description (if applicable)

---

### Step 6: Ask User to Verify (User time)

**Do NOT publish or save checkpoint yet.**

**Send message to user:**
```
✅ Fixed [issue description]

Changes made:
- [List changes]

Tests passing:
- [List tests]

Documentation updated:
- VERSION_HISTORY.md
- DEBUGGING_GUIDE.md
- todo.md

Please test with your CSV file and confirm it works.
```

**Wait for user confirmation before saving checkpoint.**

---

## Emergency Shortcuts (Only When Justified)

### When You CAN Skip Steps:

**Blocker Bug (Nothing Works):**
- Example: Import error preventing app from loading
- Skip: Step 2 (Create test) - Fix immediately
- But: MUST create test after fix and update docs

**Typo Fix:**
- Example: Fixing a misspelled variable name
- Skip: Step 2 (Create test)
- But: MUST still update docs if it was a bug

### When You CANNOT Skip Steps:

**Logic Bugs:**
- Example: Credentials not being stripped
- MUST follow all 6 steps

**Feature Additions:**
- Example: Adding new normalization type
- MUST follow all 6 steps

**Performance Optimizations:**
- Example: Adding database indexes
- MUST follow all 6 steps

---

## Rollback Decision Tree

```
Is this the 3rd failed attempt at the same issue?
├─ YES → STOP, rollback to last working version
└─ NO → Continue

Has this approach been tried before and failed?
├─ YES → STOP, try different approach or rollback
└─ NO → Continue

Is the fix taking more than 30 minutes?
├─ YES → STOP, consider rollback and research
└─ NO → Continue

Are you making changes without understanding root cause?
├─ YES → STOP, investigate more or rollback
└─ NO → Continue
```

---

## Quick Reference Card

```
┌─────────────────────────────────────────┐
│  MANDATORY FIX PROCESS (6 STEPS)        │
├─────────────────────────────────────────┤
│  1. ✅ Check docs (VERSION, DEBUG, ARCH)│
│  2. ✅ Create test FIRST                │
│  3. ✅ Apply fix                        │
│  4. ✅ Run test                         │
│  5. ✅ Update docs                      │
│  6. ✅ Ask user to verify               │
├─────────────────────────────────────────┤
│  ⚠️  NO SHORTCUTS (except blockers)     │
│  ⚠️  3 failures = ROLLBACK              │
│  ⚠️  Update docs EVERY TIME             │
└─────────────────────────────────────────┘
```

---

## Checklist (Copy This for Every Fix)

```markdown
## Fix: [Issue Description]

- [ ] Step 1: Read VERSION_HISTORY.md
- [ ] Step 1: Read DEBUGGING_GUIDE.md
- [ ] Step 1: Read ARCHITECTURE_DECISIONS.md
- [ ] Step 2: Created test file: `tests/[name].test.ts`
- [ ] Step 2: Test fails on current code (validates bug exists)
- [ ] Step 3: Applied fix in: `[file path]`
- [ ] Step 4: Test passes after fix
- [ ] Step 5: Updated VERSION_HISTORY.md
- [ ] Step 5: Updated DEBUGGING_GUIDE.md
- [ ] Step 5: Updated ARCHITECTURE_DECISIONS.md
- [ ] Step 5: Updated todo.md
- [ ] Step 6: Asked user to verify
- [ ] Step 6: User confirmed fix works
- [ ] Saved checkpoint

**If any checkbox is unchecked → DO NOT PROCEED**
```

---

## Why This Process Exists

### Problems It Solves:

1. **Regression Loops** - Tests catch when fixes break other things
2. **Repeated Failures** - Docs prevent trying same failed approach
3. **Lost Knowledge** - Documentation preserves what worked/failed
4. **Debugging Fatigue** - Rollback decision tree prevents endless debugging
5. **User Frustration** - Verification step ensures fix actually works

### What Happens If You Skip Steps:

- Skip Step 1 → Repeat failed approaches, waste time
- Skip Step 2 → No way to validate fix, regressions happen
- Skip Step 3 → N/A (this is the actual fix)
- Skip Step 4 → Ship broken code, user finds bugs
- Skip Step 5 → Lose knowledge, repeat mistakes
- Skip Step 6 → Fix doesn't work for user's actual use case

---

## Update Log

| Date | Change | Reason |
|------|--------|--------|
| 2025-11-02 | Initial creation | Formalize fix process after v3.7.0 regression loop |

---

**Remember: Following this process takes 30 minutes. NOT following it costs hours or days of debugging loops.**
