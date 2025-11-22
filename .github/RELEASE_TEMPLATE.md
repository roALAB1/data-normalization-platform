# Release Template

Use this template when creating manual releases or reviewing automated release notes.

## Version: vX.Y.Z

**Release Date:** YYYY-MM-DD  
**Status:** [STABLE | BETA | CRITICAL FIX]

---

## 📋 Summary

Brief one-paragraph summary of this release (2-3 sentences).

---

## ✨ Features

### Feature Name 1

Description of the new feature and its benefits.

**Impact:**
- Benefit 1
- Benefit 2
- Benefit 3

**Usage Example:**
```typescript
// Code example if applicable
```

### Feature Name 2

Description of another new feature.

---

## 🐛 Bug Fixes

### Bug Fix 1

**Problem:** Description of the issue that was fixed.

**Solution:** How it was resolved.

**Impact:** Who benefits and how.

### Bug Fix 2

**Problem:** ...

**Solution:** ...

**Impact:** ...

---

## 💥 Breaking Changes

### Breaking Change 1

**What Changed:** Description of the breaking change.

**Migration Guide:**
```bash
# Steps to migrate from previous version
```

**Why:** Rationale for the breaking change.

---

## 📚 Documentation

### Updated Documentation

- [Document 1](link) - What was updated
- [Document 2](link) - What was updated

### New Documentation

- [New Guide](link) - Description
- [New Tutorial](link) - Description

---

## 🔧 Technical Details

### Performance Improvements

- Improvement 1: X% faster
- Improvement 2: Y% reduction in memory usage

### Dependencies

**Added:**
- `package-name@version` - Purpose

**Updated:**
- `package-name@old-version` → `package-name@new-version` - Reason

**Removed:**
- `package-name@version` - Reason

### Database Changes

**Migrations:**
- Migration 1: Description
- Migration 2: Description

**Schema Changes:**
```sql
-- SQL changes if applicable
```

---

## 🧪 Testing

### Test Coverage

- Unit tests: X% coverage
- Integration tests: Y scenarios
- E2E tests: Z flows

### Manual Testing Checklist

- [ ] Feature A tested in production-like environment
- [ ] Feature B tested with real data
- [ ] Performance benchmarks verified
- [ ] Security audit completed

---

## 📦 Installation

### New Installation

```bash
git clone https://github.com/roALAB1/data-normalization-platform.git
cd data-normalization-platform
git checkout vX.Y.Z
pnpm install
pnpm run dev
```

### Upgrade from Previous Version

```bash
git pull origin main
git checkout vX.Y.Z
pnpm install
pnpm run db:push  # If database changes
pnpm run dev
```

---

## 🔗 Links

- **Full Changelog:** [vX.Y.Z-1...vX.Y.Z](https://github.com/roALAB1/data-normalization-platform/compare/vX.Y.Z-1...vX.Y.Z)
- **Issues Closed:** [Milestone vX.Y.Z](https://github.com/roALAB1/data-normalization-platform/milestone/N?closed=1)
- **Pull Requests:** [PRs in vX.Y.Z](https://github.com/roALAB1/data-normalization-platform/pulls?q=milestone%3AvX.Y.Z)

---

## 👥 Contributors

Thanks to everyone who contributed to this release:

- @username1 - Contribution description
- @username2 - Contribution description

---

## 📝 Notes

### Known Issues

- Issue 1: Description and workaround
- Issue 2: Description and workaround

### Deprecation Warnings

- Feature X will be removed in vX+1.0.0
- API Y will be deprecated in vX+2.0.0

### Future Plans

- Upcoming feature A (planned for vX.Y+1.Z)
- Upcoming feature B (planned for vX+1.0.0)

---

## 🎯 Usage Instructions

### For Automated Releases

The GitHub Actions workflow automatically generates release notes from commits. You can enhance them by:

1. **Before creating a tag:**
   - Review commit messages for clarity
   - Ensure all commits follow conventional commit format
   - Update CHANGELOG.md with detailed notes

2. **After automated release is created:**
   - Edit the release on GitHub
   - Add sections from this template as needed
   - Highlight breaking changes and migration steps

### For Manual Releases

1. Copy this template
2. Fill in all sections relevant to your release
3. Remove sections that don't apply
4. Create release on GitHub with the filled template

---

## 📊 Release Checklist

Before creating a release, ensure:

- [ ] All tests passing
- [ ] Documentation updated
- [ ] CHANGELOG.md updated
- [ ] Version bumped in package.json
- [ ] Migration guides written (if breaking changes)
- [ ] Security audit completed (for major releases)
- [ ] Performance benchmarks run
- [ ] Backward compatibility verified (or breaking changes documented)
- [ ] Dependencies audited for vulnerabilities
- [ ] Release notes reviewed by team

---

**Template Version:** 1.0.0  
**Last Updated:** 2025-11-21
