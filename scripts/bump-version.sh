#!/bin/bash

# Semantic Versioning Script
# Usage: ./scripts/bump-version.sh [patch|minor|major]
# Example: ./scripts/bump-version.sh patch (3.40.6 → 3.40.7)

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get bump type from argument
BUMP_TYPE=$1

if [ -z "$BUMP_TYPE" ]; then
  echo -e "${RED}Error: Bump type required${NC}"
  echo "Usage: $0 [patch|minor|major]"
  echo ""
  echo "Examples:"
  echo "  $0 patch  # 3.40.6 → 3.40.7"
  echo "  $0 minor  # 3.40.6 → 3.41.0"
  echo "  $0 major  # 3.40.6 → 4.0.0"
  exit 1
fi

# Validate bump type
if [[ ! "$BUMP_TYPE" =~ ^(patch|minor|major)$ ]]; then
  echo -e "${RED}Error: Invalid bump type '$BUMP_TYPE'${NC}"
  echo "Must be one of: patch, minor, major"
  exit 1
fi

# Get current version from package.json
CURRENT_VERSION=$(node -p "require('./package.json').version")
echo -e "${BLUE}Current version: ${CURRENT_VERSION}${NC}"

# Parse version components
IFS='.' read -r MAJOR MINOR PATCH <<< "$CURRENT_VERSION"

# Calculate new version based on bump type
case $BUMP_TYPE in
  patch)
    NEW_VERSION="${MAJOR}.${MINOR}.$((PATCH + 1))"
    ;;
  minor)
    NEW_VERSION="${MAJOR}.$((MINOR + 1)).0"
    ;;
  major)
    NEW_VERSION="$((MAJOR + 1)).0.0"
    ;;
esac

echo -e "${YELLOW}New version: ${NEW_VERSION}${NC}"
echo ""

# Confirm with user
read -p "Continue with version bump? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo -e "${RED}Aborted${NC}"
  exit 1
fi

echo -e "${GREEN}Starting version bump...${NC}"
echo ""

# 1. Update package.json
echo -e "${BLUE}[1/7] Updating package.json...${NC}"
npm version $NEW_VERSION --no-git-tag-version
echo -e "${GREEN}✓ package.json updated${NC}"

# 2. Update all footer versions
echo -e "${BLUE}[2/7] Updating footer versions...${NC}"

# Find all footer version references and update them
FILES=(
  "client/src/pages/Home.tsx"
  "client/src/pages/IntelligentNormalization.tsx"
  "client/src/pages/BatchJobs.tsx"
  "client/src/pages/CRMSyncMapper.tsx"
  "client/src/pages/MemoryMonitoringDashboard.tsx"
)

for file in "${FILES[@]}"; do
  if [ -f "$file" ]; then
    # Replace version in footer (handles both v3.40.6 and 3.40.6 formats)
    sed -i "s/v[0-9]\+\.[0-9]\+\.[0-9]\+/v${NEW_VERSION}/g" "$file"
    sed -i "s/version [0-9]\+\.[0-9]\+\.[0-9]\+/version ${NEW_VERSION}/g" "$file"
    echo "  ✓ Updated $file"
  fi
done

echo -e "${GREEN}✓ All footers updated${NC}"

# 3. Update README.md version in overview section
echo -e "${BLUE}[3/7] Updating README.md...${NC}"
sed -i "s/(v[0-9]\+\.[0-9]\+\.[0-9]\+)/(v${NEW_VERSION})/g" README.md
echo -e "${GREEN}✓ README.md updated${NC}"

# 4. Add entry to CHANGELOG.md
echo -e "${BLUE}[4/7] Updating CHANGELOG.md...${NC}"

# Get current date
DATE=$(date +%Y-%m-%d)

# Create changelog entry
CHANGELOG_ENTRY="## [${NEW_VERSION}] - ${DATE}

### Changed
- Version bump to ${NEW_VERSION}

"

# Insert after the first line (# Changelog)
sed -i "2i\\
$CHANGELOG_ENTRY" CHANGELOG.md

echo -e "${GREEN}✓ CHANGELOG.md updated${NC}"

# 5. Create git commit
echo -e "${BLUE}[5/7] Creating git commit...${NC}"
git add -A
git commit -m "Release v${NEW_VERSION}: Version bump

- Updated package.json to ${NEW_VERSION}
- Updated all footer versions across pages
- Updated README.md overview version
- Updated CHANGELOG.md with v${NEW_VERSION} entry"

echo -e "${GREEN}✓ Git commit created${NC}"

# 6. Create git tag
echo -e "${BLUE}[6/7] Creating git tag...${NC}"
git tag -a "v${NEW_VERSION}" -m "Release v${NEW_VERSION}

Version bump from v${CURRENT_VERSION} to v${NEW_VERSION}"

echo -e "${GREEN}✓ Git tag v${NEW_VERSION} created${NC}"

# 7. Summary
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ Version bump complete!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${BLUE}Version:${NC} ${CURRENT_VERSION} → ${NEW_VERSION}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "  1. Review changes: git show HEAD"
echo "  2. Push to GitHub: git push origin main && git push origin v${NEW_VERSION}"
echo "  3. GitHub Actions will automatically create the release"
echo ""
echo -e "${BLUE}Files updated:${NC}"
echo "  • package.json"
echo "  • client/src/pages/*.tsx (5 files)"
echo "  • README.md"
echo "  • CHANGELOG.md"
echo ""
echo -e "${BLUE}Git operations:${NC}"
echo "  • Commit: Release v${NEW_VERSION}"
echo "  • Tag: v${NEW_VERSION}"
echo ""
