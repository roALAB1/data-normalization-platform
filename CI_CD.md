# CI/CD Pipeline Documentation

This document explains the Continuous Integration and Continuous Deployment (CI/CD) pipeline for the Data Normalization Platform.

---

## Overview

The project uses **GitHub Actions** for automated testing, building, and deployment. The CI/CD pipeline ensures code quality, prevents regressions, and automates the release process.

**Workflows:**
1. **CI Workflow** (`.github/workflows/ci.yml`) - Runs on every push and pull request
2. **Release Workflow** (`.github/workflows/release.yml`) - Runs when a version tag is pushed

---

## CI Workflow

### Triggers

The CI workflow runs automatically on:
- **Push** to `main`, `master`, or `develop` branches
- **Pull requests** targeting `main`, `master`, or `develop` branches

### Jobs

#### 1. Test Job

Runs automated tests and quality checks:

```yaml
- Type check (pnpm check)
- Lint (pnpm format:check)
- Run tests (pnpm test)
- Build (pnpm build)
```

**Purpose:**
- Verify TypeScript types are correct
- Ensure code formatting follows standards
- Run unit and integration tests
- Confirm the project builds successfully

#### 2. Quality Job

Performs additional code quality checks:

```yaml
- Check formatting (pnpm format:check)
- Security audit (pnpm audit)
```

**Purpose:**
- Verify code is properly formatted
- Detect known security vulnerabilities in dependencies

### Caching

The CI workflow uses **pnpm caching** to speed up builds:
- Cache key: `${{ runner.os }}-pnpm-store-${{ hashFiles('**/pnpm-lock.yaml') }}`
- Cached directory: pnpm store path
- **Benefit:** Faster CI runs (2-3x speedup)

### Environment

- **OS:** Ubuntu latest
- **Node.js:** v22
- **pnpm:** v9
- **Environment variable:** `NODE_ENV=production` for builds

---

## Release Workflow

### Triggers

The release workflow runs automatically when:
- A tag matching `v*.*.*` is pushed (e.g., `v3.41.0`)

### Jobs

#### Create Release

Automatically creates a GitHub release with:

1. **Extract version** from tag
2. **Generate changelog** from commits since previous tag
3. **Create release notes** with:
   - What's New section
   - List of changes (commits)
   - Installation instructions
   - Documentation links
4. **Publish release** on GitHub

### Release Notes Format

The automated release notes include:

```markdown
## What's New in v3.41.0 🚀

### Changes
- Commit message 1 (hash)
- Commit message 2 (hash)
- ...

---

## Full Changelog
See CHANGELOG.md for complete version history.

## Installation
git clone https://github.com/roALAB1/data-normalization-platform.git
cd data-normalization-platform
pnpm install
pnpm run dev

## Documentation
- README.md
- VERSION_HISTORY.md
- API Documentation
```

---

## Complete CI/CD Flow

### 1. Development Workflow

```bash
# 1. Create feature branch
git checkout -b feature/new-feature

# 2. Make changes
# ... edit files ...

# 3. Run local checks
pnpm check        # TypeScript
pnpm format       # Format code
pnpm test         # Run tests
pnpm build        # Build project

# 4. Commit and push
git add .
git commit -m "feat: Add new feature"
git push origin feature/new-feature

# 5. Create pull request
# CI workflow runs automatically on PR
```

### 2. Pull Request Workflow

When you create a PR:

1. **CI workflow triggers** automatically
2. **All checks run:**
   - ✅ Type check
   - ✅ Lint
   - ✅ Tests
   - ✅ Build
   - ✅ Code quality
   - ✅ Security audit
3. **Status checks** appear on PR
4. **Merge** only if all checks pass

### 3. Release Workflow

```bash
# 1. Bump version (automated)
pnpm run version:minor  # or version:patch, version:major

# 2. Push to GitHub
git push origin main && git push origin v3.41.0

# 3. Release workflow triggers automatically
# - Generates changelog
# - Creates GitHub release
# - Publishes release notes

# 4. Release is live!
# Visit: https://github.com/roALAB1/data-normalization-platform/releases
```

---

## Local Development

### Running CI Checks Locally

Before pushing, run the same checks that CI runs:

```bash
# Full CI check suite
pnpm check && pnpm format:check && pnpm test && pnpm build

# Individual checks
pnpm check          # TypeScript type checking
pnpm format         # Format code (auto-fix)
pnpm format:check   # Check formatting (no auto-fix)
pnpm test           # Run tests
pnpm build          # Build project
```

### Pre-commit Hook (Optional)

You can set up a pre-commit hook to run checks automatically:

```bash
# .git/hooks/pre-commit
#!/bin/bash
pnpm check && pnpm format:check && pnpm test
```

Make it executable:
```bash
chmod +x .git/hooks/pre-commit
```

---

## Troubleshooting

### CI Workflow Fails

#### Type Check Fails

```bash
# Run locally to see errors
pnpm check

# Fix TypeScript errors
# ... edit files ...

# Verify fix
pnpm check
```

#### Tests Fail

```bash
# Run tests locally
pnpm test

# Run specific test file
pnpm test path/to/test.test.ts

# Run tests in watch mode
pnpm test --watch
```

#### Build Fails

```bash
# Run build locally
pnpm build

# Check for errors in console
# Fix issues and rebuild
```

### Release Workflow Fails

#### Tag Not Triggering Workflow

Ensure tag matches pattern `v*.*.*`:

```bash
# Correct format
git tag v3.41.0

# Incorrect format (won't trigger)
git tag 3.41.0
git tag release-3.41.0
```

#### Workflow YAML Syntax Error

Check the workflow file:

```bash
# Validate YAML syntax
cat .github/workflows/release.yml
```

Use an online YAML validator if needed.

---

## GitHub Actions Secrets

### Required Secrets

The workflows use these secrets:

1. **GITHUB_TOKEN** (automatically provided by GitHub)
   - Used for creating releases
   - No manual setup required

### Optional Secrets

For future enhancements:

1. **DEPLOY_TOKEN** - For automated deployment
2. **SLACK_WEBHOOK** - For build notifications
3. **NPM_TOKEN** - For publishing packages

Add secrets at: `Settings → Secrets and variables → Actions`

---

## Monitoring CI/CD

### Viewing Workflow Runs

1. Go to repository on GitHub
2. Click **Actions** tab
3. View workflow runs:
   - Green checkmark = Success
   - Red X = Failed
   - Yellow circle = In progress

### Workflow Logs

Click on a workflow run to see:
- Job status
- Step-by-step logs
- Error messages
- Timing information

### Notifications

GitHub sends notifications for:
- Failed workflow runs (if you're the author)
- Successful releases
- Security alerts

Configure at: `Settings → Notifications`

---

## Best Practices

### 1. Keep CI Fast

- Use caching (already configured)
- Run only necessary checks
- Parallelize jobs when possible

### 2. Fail Fast

- Run quick checks first (type check, lint)
- Run slow checks last (build, tests)
- Stop on first failure

### 3. Consistent Environments

- Use same Node.js version locally and in CI
- Use `pnpm install --frozen-lockfile` to ensure exact dependencies
- Set `CI=true` environment variable

### 4. Meaningful Commit Messages

Good commit messages improve automated changelog:

```bash
# Good
feat: Add email normalization
fix: Resolve memory leak in HMR
docs: Update API documentation

# Bad
update
fix bug
changes
```

### 5. Test Before Pushing

Always run checks locally before pushing:

```bash
pnpm check && pnpm test && pnpm build
```

---

## Workflow Configuration

### Customizing CI Workflow

Edit `.github/workflows/ci.yml`:

```yaml
# Add new job
new-job:
  name: New Job
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - run: echo "Custom step"

# Add new step to existing job
- name: Custom check
  run: pnpm custom-script
```

### Customizing Release Workflow

Edit `.github/workflows/release.yml`:

```yaml
# Change release notes format
- name: Generate changelog
  run: |
    # Custom changelog generation
    echo "Custom release notes" > release-notes.md

# Add release assets
- name: Create GitHub Release
  uses: softprops/action-gh-release@v1
  with:
    files: |
      dist/*.zip
      docs/*.pdf
```

---

## Metrics and Analytics

### CI Performance

Track these metrics:
- **Build time:** Target < 5 minutes
- **Test time:** Target < 2 minutes
- **Success rate:** Target > 95%

### Release Frequency

Recommended cadence:
- **Patch releases:** Weekly (bug fixes)
- **Minor releases:** Monthly (new features)
- **Major releases:** Quarterly (breaking changes)

---

## Future Enhancements

### Planned Improvements

1. **Automated Deployment**
   - Deploy to staging on merge to `develop`
   - Deploy to production on release

2. **Code Coverage**
   - Track test coverage
   - Fail if coverage drops below threshold

3. **Performance Benchmarks**
   - Run performance tests in CI
   - Compare against baseline

4. **Visual Regression Testing**
   - Screenshot comparison for UI changes
   - Prevent unintended visual changes

5. **Dependency Updates**
   - Automated dependency updates (Dependabot)
   - Security patch automation

---

## Related Documentation

- [VERSIONING.md](VERSIONING.md) - Version bump and release process
- [.github/workflows/ci.yml](.github/workflows/ci.yml) - CI workflow configuration
- [.github/workflows/release.yml](.github/workflows/release.yml) - Release workflow configuration
- [.github/RELEASE_TEMPLATE.md](.github/RELEASE_TEMPLATE.md) - Release notes template
- [CHANGELOG.md](CHANGELOG.md) - Complete version history

---

## Summary

**For most development:**

```bash
# 1. Make changes
# 2. Run local checks
pnpm check && pnpm test && pnpm build

# 3. Push
git push

# 4. CI runs automatically
# 5. Merge when green ✅
```

**For releases:**

```bash
# 1. Bump version
pnpm run version:minor

# 2. Push
git push origin main && git push origin v3.41.0

# 3. Release created automatically 🚀
```

Everything else is automated! 🎉

---

**Last Updated:** 2025-11-21  
**Version:** 1.0.0
