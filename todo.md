# Project TODO

## PHASE 1: Critical Performance Fixes (IN PROGRESS)

### Workstream 1: Automated Test Suite (PRIORITY #1)
- [ ] Create test runner script with Vitest
- [ ] Add 20+ regression tests for name normalization
- [ ] Add tests for credential stripping (CFP, MD, MSc, etc.)
- [ ] Add tests for format() method (no p, m, s leaking)
- [ ] Add tests for pronoun removal
- [ ] Add tests for location splitting
- [ ] Integrate tests into checkpoint validation

### Workstream 2: Credential Loading Fix
- [x] Rolled back NameEnhanced.ts to v3.4.1 (last working version)
- [x] Applied ONLY format() fix to prevent p/m/s letter leaking
- [x] Left credential stripping code untouched from v3.4.1
- [ ] Test both fixes work together in browser

### Workstream 3: Database Indexes & Connection Pooling
- [ ] Add index on jobs.userId for user-specific queries
- [ ] Add index on jobs.status for job queue processing
- [ ] Add index on jobs.createdAt for sorting
- [ ] Add composite index on (userId, status, createdAt)
- [ ] Implement connection pooling with better-sqlite3
- [ ] Test query performance improvement

### Workstream 4: Code Splitting
- [ ] Configure Vite to split worker bundles
- [ ] Lazy-load credential data only when needed
- [ ] Reduce main bundle size by 50%+
- [ ] Test worker loading in production build

## Previous Issues (RESOLVED)
- [x] Fix random letters (p, m, s, q, d) being added to names
- [x] Fix format() method leaking format codes
- [x] Fix nested anchor tag error in footer
- [x] Add Changelog tab
- [x] Update GitHub link in footer
- [x] Update version to v3.6.3

## Known Regressions (TO FIX AFTER PHASE 1)
- [ ] Credential stripping not working (CFP, MD, MSc, etc. still appearing)
- [ ] CREDENTIALS_SET loading as empty (size: 0)
- [ ] Module loading issue in worker bundle
