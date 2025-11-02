# Project TODO

## CURRENT VERSION: v3.6.0 (Stable Base)

**Status:** Testing credential stripping, then applying critical fixes

---

## Phase 1: Verify v3.6.0 Works
- [x] Fixed worker import error (removed non-existent LocationNormalizer)
- [x] Created test for worker initialization
- [x] All tests passing (3/3)
- [x] Updated VERSION_HISTORY.md
- [x] Updated DEBUGGING_GUIDE.md
- [ ] User tests CSV file on v3.6.0
- [ ] Verify credentials are stripped correctly
- [ ] If fails → Rollback to v3.4.1
- [ ] If works → Proceed to Phase 2

## Phase 2: Apply Database Migration (CRITICAL 🔴)
- [ ] Review migration file: `drizzle/0004_bent_mongoose.sql`
- [ ] Run `pnpm db:push` to apply indexes
- [ ] Verify indexes created: `user_id_idx`, `status_idx`, `created_at_idx`
- [ ] Test job queue performance improvement

## Phase 3: Research Enterprise Solutions (HIGH PRIORITY 🟡)
- [ ] Research how libphonenumber-js handles data loading in workers
- [ ] Research how validator.js handles validation rules
- [ ] Research how Intl.js loads locale data
- [ ] Document findings in ARCHITECTURE_DECISIONS.md
- [ ] Identify optimal pattern for credential loading

## Phase 4: Create TypeScript Test Suite (CRITICAL 🔴)
- [ ] Create `tests/name-normalization.test.ts` using Vitest
- [ ] Add tests for credential stripping (MD, PhD, CFP, etc.)
- [ ] Add tests for format() method (no p/m/s leaking)
- [ ] Add tests for location splitting
- [ ] Add tests for pronoun handling
- [ ] Run tests on v3.6.0 (should all pass)
- [ ] Add test script to package.json

## Phase 5: Apply Format Fix (If Needed)
- [ ] Check if v3.6.0 has p/m/s letter leaking bug
- [ ] If yes: Apply ONLY format() fix (2 lines)
- [ ] Run tests to verify no regressions
- [ ] Test with user's CSV
- [ ] If works → Save as v3.6.4

## Phase 6: Final Checkpoint & Publish
- [ ] All tests passing
- [ ] User CSV test passing
- [ ] Documentation updated
- [ ] Save checkpoint
- [ ] Publish to production

---

## Documentation Files (Completed ✅)
- [x] VERSION_HISTORY.md - Tracks what worked/failed
- [x] DEBUGGING_GUIDE.md - Known issues and solutions
- [x] ARCHITECTURE_DECISIONS.md - Technical context

**⚠️ MANDATORY:** Review these docs before ANY code changes!

---

## Previously Completed (v3.6.0 and earlier)
- [x] Location normalization (City + State split)
- [x] E.164 phone formatting
- [x] First/Last name columns
- [x] React fixes
- [x] 50+ US state abbreviations
- [x] Changelog tab
- [x] GitHub link
- [x] Footer with version

---

## Known Issues to Fix Later
- Module loading in workers (needs enterprise solution)
- CSV streaming (memory optimization)
- Code splitting (bundle size)
- Job queue polling (use Redis pub/sub)
