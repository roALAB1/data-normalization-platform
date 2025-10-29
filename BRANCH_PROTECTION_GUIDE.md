# GitHub Branch Protection Rules Setup Guide

This guide will help you set up branch protection rules for the `master` branch to prevent accidental force pushes and ensure code quality.

## Why Branch Protection?

Branch protection rules help you:
- ✅ Prevent accidental force pushes that could overwrite history
- ✅ Require pull request reviews before merging
- ✅ Ensure CI/CD checks pass before merging
- ✅ Maintain code quality and collaboration standards

## Step-by-Step Instructions

### 1. Navigate to Repository Settings

1. Go to your repository: https://github.com/roALAB1/data-normalization-platform
2. Click the **Settings** tab (near the top right)
3. In the left sidebar, click **Branches** (under "Code and automation")

### 2. Add Branch Protection Rule

1. Click **Add branch protection rule** (or **Add rule**)
2. In the "Branch name pattern" field, enter: `master`

### 3. Configure Protection Settings

**Recommended settings for this project:**

#### ✅ Protect matching branches
- [x] **Require a pull request before merging**
  - [x] Require approvals: `1` (optional, if working with a team)
  - [x] Dismiss stale pull request approvals when new commits are pushed
  
- [x] **Require status checks to pass before merging**
  - [x] Require branches to be up to date before merging
  - Add status checks if you have CI/CD set up (e.g., "build", "test")

- [x] **Require conversation resolution before merging**
  - Ensures all PR comments are addressed

- [x] **Require signed commits** (optional, for extra security)

- [x] **Require linear history**
  - Prevents merge commits, keeps history clean

- [x] **Do not allow bypassing the above settings**
  - Applies rules to administrators too

#### ❌ Optional (not needed for solo projects)
- [ ] Require deployments to succeed before merging
- [ ] Lock branch (only if you want to make it read-only)

### 4. Save Changes

1. Scroll to the bottom
2. Click **Create** (or **Save changes**)

## Verification

After setting up, try to force push to master:

```bash
git push --force origin master
```

You should see an error message like:
```
remote: error: GH006: Protected branch update failed for refs/heads/master.
```

This confirms your branch protection is working! 🎉

## For Solo Projects

If you're working alone, you can use a simpler configuration:

- [x] **Require a pull request before merging** (unchecked for solo work)
- [x] **Do not allow force pushes** ✅ (most important)
- [x] **Do not allow deletions** ✅ (prevents accidental branch deletion)

## Alternative: Use GitHub CLI (if you prefer)

If you have GitHub CLI installed and authenticated:

```bash
gh api repos/roALAB1/data-normalization-platform/branches/master/protection \
  --method PUT \
  --field required_status_checks='null' \
  --field enforce_admins=true \
  --field required_pull_request_reviews='null' \
  --field restrictions='null' \
  --field allow_force_pushes=false \
  --field allow_deletions=false
```

## Need Help?

- GitHub Docs: https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches
- Contact: Create an issue in the repository

---

**Note**: These settings can be adjusted later based on your team's workflow and requirements.
