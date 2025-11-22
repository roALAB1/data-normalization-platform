# Versioning Guide

This document explains the automated versioning and release workflow for the Data Normalization Platform.

## Overview

The project uses **Semantic Versioning 2.0.0** (SemVer) with automated tooling for version bumps and GitHub releases.

**Version Format:** `MAJOR.MINOR.PATCH` (e.g., `3.40.6`)

- **MAJOR**: Breaking changes or major feature additions (e.g., `3.40.6` → `4.0.0`)
- **MINOR**: New features, backward-compatible (e.g., `3.40.6` → `3.41.0`)
- **PATCH**: Bug fixes, backward-compatible (e.g., `3.40.6` → `3.40.7`)

---

## Quick Start

### Automated Version Bump

Use the built-in npm scripts to automatically bump versions:

```bash
# Patch version (bug fixes)
pnpm run version:patch

# Minor version (new features)
pnpm run version:minor

# Major version (breaking changes)
pnpm run version:major
```

### What Happens Automatically

When you run a version bump script, the following happens automatically:

1. ✅ **package.json** version updated
2. ✅ **All footer versions** updated across 5 pages:
   - `client/src/pages/Home.tsx`
   - `client/src/pages/IntelligentNormalization.tsx`
   - `client/src/pages/BatchJobs.tsx`
   - `client/src/pages/CRMSyncMapper.tsx`
   - `client/src/pages/MemoryMonitoringDashboard.tsx`
3. ✅ **README.md** overview version updated
4. ✅ **CHANGELOG.md** entry added with date
5. ✅ **Git commit** created with descriptive message
6. ✅ **Git tag** created (e.g., `v3.40.7`)

---

## Complete Release Workflow

### Step 1: Bump Version

Choose the appropriate bump type based on your changes:

```bash
# For bug fixes (3.40.6 → 3.40.7)
pnpm run version:patch

# For new features (3.40.6 → 3.41.0)
pnpm run version:minor

# For breaking changes (3.40.6 → 4.0.0)
pnpm run version:major
```

The script will:
- Show current and new version
- Ask for confirmation
- Update all files automatically
- Create commit and tag

### Step 2: Review Changes

```bash
# Review the commit
git show HEAD

# Review changed files
git diff HEAD~1
```

### Step 3: Push to GitHub

```bash
# Push commits and tags
git push origin main && git push origin v3.40.7
```

### Step 4: Automated Release

GitHub Actions will automatically:
- Detect the new tag push
- Generate changelog from commits
- Create GitHub release with release notes
- Publish release (visible at `https://github.com/roALAB1/data-normalization-platform/releases`)

---

## Manual Version Bump (Advanced)

If you need more control, you can use the script directly:

```bash
# Run the script manually
./scripts/bump-version.sh patch
./scripts/bump-version.sh minor
./scripts/bump-version.sh major
```

---

## GitHub Actions Workflow

The automated release workflow is defined in `.github/workflows/release.yml`.

**Triggers:**
- Push of any tag matching `v*.*.*` (e.g., `v3.40.7`)

**Actions:**
1. Checkout code
2. Extract version from tag
3. Generate changelog from commits since previous tag
4. Create GitHub release with generated notes
5. Publish release

**Customization:**
Edit `.github/workflows/release.yml` to customize release behavior.

---

## Version Badge

The README.md includes a dynamic version badge that automatically updates:

[![GitHub Release](https://img.shields.io/github/v/release/roALAB1/data-normalization-platform?style=for-the-badge&logo=github&color=blue)](https://github.com/roALAB1/data-normalization-platform/releases/latest)

This badge always shows the latest GitHub release version.

---

## Best Practices

### When to Bump Versions

**PATCH (3.40.6 → 3.40.7):**
- Bug fixes
- Performance improvements
- Documentation updates
- Dependency updates (security patches)

**MINOR (3.40.6 → 3.41.0):**
- New features
- New API endpoints
- New UI components
- Backward-compatible changes

**MAJOR (3.40.6 → 4.0.0):**
- Breaking API changes
- Removed features
- Major architecture changes
- Database schema changes requiring migration

### Commit Message Guidelines

The version bump script creates standardized commit messages:

```
Release vX.Y.Z: Version bump

- Updated package.json to X.Y.Z
- Updated all footer versions across pages
- Updated README.md overview version
- Updated CHANGELOG.md with vX.Y.Z entry
```

For manual commits, follow this pattern for clarity.

### CHANGELOG.md Format

The script automatically adds entries to CHANGELOG.md:

```markdown
## [3.40.7] - 2025-01-21

### Changed
- Version bump to 3.40.7
```

You can manually edit the CHANGELOG.md after the script runs to add more details:

```markdown
## [3.40.7] - 2025-01-21

### Fixed
- Fixed server hang issue (72% CPU)
- Resolved file descriptor leak in Vite HMR

### Changed
- Version bump to 3.40.7
```

---

## Troubleshooting

### Script Fails with "Permission Denied"

Make sure the script is executable:

```bash
chmod +x scripts/bump-version.sh
```

### Version Already Exists

If you accidentally run the script twice:

```bash
# Delete the tag
git tag -d v3.40.7

# Delete the commit (if not pushed)
git reset --hard HEAD~1
```

### GitHub Actions Workflow Not Triggering

Ensure you pushed the tag:

```bash
git push origin v3.40.7
```

Check the Actions tab on GitHub to see workflow runs.

### Badge Not Updating

The badge updates automatically when a new release is created on GitHub. If it's not updating:
1. Verify the release was created successfully
2. Clear browser cache
3. Check the badge URL in README.md

---

## Files Modified by Version Bump

The `bump-version.sh` script modifies these files:

1. **package.json** - Updates `version` field
2. **client/src/pages/Home.tsx** - Updates footer version
3. **client/src/pages/IntelligentNormalization.tsx** - Updates footer version
4. **client/src/pages/BatchJobs.tsx** - Updates footer version
5. **client/src/pages/CRMSyncMapper.tsx** - Updates footer version
6. **client/src/pages/MemoryMonitoringDashboard.tsx** - Updates footer version
7. **README.md** - Updates version in overview section
8. **CHANGELOG.md** - Adds new version entry

---

## Release Template

For creating detailed, professional release notes, use the release template:

**Template Location:** `.github/RELEASE_TEMPLATE.md`

### When to Use the Template

1. **Manual Releases:** Copy the template and fill in all sections
2. **Enhancing Automated Releases:** After GitHub Actions creates a release, edit it and add sections from the template
3. **Major Releases:** Use the full template with all sections (features, breaking changes, migration guides)
4. **Patch Releases:** Use a simplified version focusing on bug fixes

### Template Sections

The template includes:
- ✨ Features - New functionality with usage examples
- 🐛 Bug Fixes - Problems solved and their impact
- 💥 Breaking Changes - Migration guides for incompatible changes
- 📚 Documentation - Updated and new documentation
- 🔧 Technical Details - Performance, dependencies, database changes
- 🧪 Testing - Coverage and manual testing checklist
- 📦 Installation - New installation and upgrade instructions

### Example Usage

```bash
# 1. Create automated release
pnpm run version:minor
git push origin main && git push origin v3.41.0

# 2. Wait for GitHub Actions to create release

# 3. Edit release on GitHub
# - Click "Edit" on the release
# - Copy relevant sections from .github/RELEASE_TEMPLATE.md
# - Fill in details about features, bug fixes, breaking changes
# - Add migration guides if needed
# - Save the enhanced release notes
```

---

## Related Documentation

- [CHANGELOG.md](CHANGELOG.md) - Complete version history
- [VERSION_HISTORY.md](VERSION_HISTORY.md) - Detailed version notes
- [README.md](README.md) - Project overview
- [.github/workflows/release.yml](.github/workflows/release.yml) - GitHub Actions workflow
- [.github/RELEASE_TEMPLATE.md](.github/RELEASE_TEMPLATE.md) - Release notes template

---

## Summary

**For most releases, just run:**

```bash
pnpm run version:patch  # or version:minor, version:major
git push origin main && git push origin v3.40.7
```

Everything else is automated! 🚀
