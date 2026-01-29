#!/bin/bash

# Release script for Hermes Voice Assistant
# Usage: ./release.sh [--test] [version]
# If no version provided, will suggest next version based on manifest.json
# --test flag: Simulate release without committing/pushing

set -e

# Colors for pretty output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
ORANGE='\033[0;33m'
NC='\033[0m' # No Color

# Test mode flag
TEST_MODE=false

# Parse arguments
if [[ "$1" == "--test" ]]; then
    TEST_MODE=true
    shift
fi

# Logging functions
log() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')] $1${NC}"
}

success() {
    echo -e "${GREEN}✅ $1${NC}"
}

warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

error() {
    echo -e "${RED}❌ $1${NC}"
}

info() {
    echo -e "${PURPLE}ℹ️  $1${NC}"
}

step() {
    echo -e "${CYAN}🔄 Step $1: $2${NC}"
}

test_alert() {
    echo -e "${ORANGE}🧪 TEST MODE: $1${NC}"
}

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -f "manifest.json" ]; then
    error "Must be run from project root with package.json and manifest.json"
    exit 1
fi

# Get current versions
CURRENT_PACKAGE_VERSION=$(cat package.json | grep '"version"' | cut -d '"' -f 4)
CURRENT_MANIFEST_VERSION=$(cat manifest.json | grep '"version"' | cut -d '"' -f 4)

log "Current versions:"
info "  package.json: $CURRENT_PACKAGE_VERSION"
info "  manifest.json: $CURRENT_MANIFEST_VERSION"

# Determine target version
if [ $# -eq 0 ]; then
    # No version provided, suggest next version
    if [[ $CURRENT_MANIFEST_VERSION =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
        IFS='.' read -ra VERSION_PARTS <<< "$CURRENT_MANIFEST_VERSION"
        MAJOR=${VERSION_PARTS[0]}
        MINOR=${VERSION_PARTS[1]}
        PATCH=${VERSION_PARTS[2]}
        
        # Increment patch version
        NEW_PATCH=$((PATCH + 1))
        SUGGESTED_VERSION="$MAJOR.$MINOR.$NEW_PATCH"
    else
        error "Cannot parse current manifest version: $CURRENT_MANIFEST_VERSION"
        exit 1
    fi
    
    echo
    warning "No version provided. Suggested next version: $SUGGESTED_VERSION"
    read -p "Use this version? (y/N): " -n 1 -r
    echo
    
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log "Release cancelled."
        exit 0
    fi
    
    TARGET_VERSION=$SUGGESTED_VERSION
else
    TARGET_VERSION=$1
fi

log "Target version: $TARGET_VERSION"

# Validate version format
if [[ ! $TARGET_VERSION =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    error "Invalid version format. Use semantic versioning: X.Y.Z"
    exit 1
fi

# Check if tag already exists
if git rev-parse "refs/tags/$TARGET_VERSION" >/dev/null 2>&1; then
    error "Tag $TARGET_VERSION already exists!"
    exit 1
fi

# Test mode warning
if [ "$TEST_MODE" = true ]; then
    echo
    test_alert "🧪 TEST MODE ENABLED 🧪"
    test_alert "NO ACTUAL COMMITS OR PUSHES WILL BE MADE!"
    test_alert "Files WILL be modified - check them before running without --test!"
    echo
    read -p "Continue with test mode? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log "Test mode cancelled."
        exit 0
    fi
fi

echo
step "1/7" "Building project..."

# Build the project
if ! pnpm build; then
    error "Build failed!"
    exit 1
fi
success "Build completed"

step "2/7" "Updating package.json..."

# Update package.json
sed -i.tmp "s/\"version\": \".*\"/\"version\": \"$TARGET_VERSION\"/" package.json
rm package.json.tmp
success "package.json updated to $TARGET_VERSION"

step "3/7" "Updating manifest.json..."

# Update manifest.json
sed -i.tmp "s/\"version\": \".*\"/\"version\": \"$TARGET_VERSION\"/" manifest.json
rm manifest.json.tmp
success "manifest.json updated to $TARGET_VERSION"

step "4/7" "Committing changes..."

# Commit changes
if [ "$TEST_MODE" = true ]; then
    test_alert "WOULD COMMIT: package.json manifest.json main.js styles.css"
    test_alert "WOULD COMMIT MESSAGE: Release $TARGET_VERSION"
    test_alert "BUT FILES HAVE BEEN MODIFIED FOR YOUR REVIEW!"
else
    git add package.json manifest.json main.js styles.css
    git commit -m "Release $TARGET_VERSION"
    success "Changes committed"
fi

step "5/7" "Creating tag..."

# Create tag
if [ "$TEST_MODE" = true ]; then
    test_alert "WOULD CREATE TAG: $TARGET_VERSION"
    test_alert "WOULD TAG MESSAGE: Release $TARGET_VERSION"
else
    git tag -a "$TARGET_VERSION" -m "Release $TARGET_VERSION"
    success "Tag $TARGET_VERSION created"
fi

step "6/7" "Pushing to GitHub..."

# Push commits and tags
if [ "$TEST_MODE" = true ]; then
    test_alert "WOULD PUSH: git push origin main"
    test_alert "WOULD PUSH: git push origin $TARGET_VERSION"
else
    git push origin main
    git push origin "$TARGET_VERSION"
    success "Pushed to GitHub"
fi

step "7/7" "Release complete! 🎉"

echo
if [ "$TEST_MODE" = true ]; then
    success "🧪 TEST RELEASE $TARGET_VERSION completed successfully!"
    echo
    warning "🚨 THIS WAS A TEST RUN - NO ACTUAL RELEASE MADE! 🚨"
    echo
    info "What WOULD happen:"
    echo "  • Build the project ✅ (actually done)"
    echo "  • Update package.json: $CURRENT_PACKAGE_VERSION → $TARGET_VERSION ✅ (actually done)"
    echo "  • Update manifest.json: $CURRENT_MANIFEST_VERSION → $TARGET_VERSION ✅ (actually done)"
    echo "  • Commit changes with message: 'Release $TARGET_VERSION' ❌ (simulated)"
    echo "  • Create tag: $TARGET_VERSION ❌ (simulated)"
    echo "  • Push to GitHub (commits + tags) ❌ (simulated)"
    echo
    warning "🔍 CHECK YOUR MODIFIED FILES:"
    echo "  • package.json (version bumped)"
    echo "  • manifest.json (version bumped)"
    echo "  • main.js (rebuilt)"
    echo "  • styles.css (rebuilt)"
    echo
    info "To run the actual release:"
    echo "  1. Review the file changes above"
    echo "  2. Run: ./release.sh $TARGET_VERSION"
else
    success "🚀 Release $TARGET_VERSION completed successfully!"
    echo
    info "What happened:"
    echo "  • Built the project"
    echo "  • Updated package.json: $CURRENT_PACKAGE_VERSION → $TARGET_VERSION"
    echo "  • Updated manifest.json: $CURRENT_MANIFEST_VERSION → $TARGET_VERSION"
    echo "  • Committed changes"
    echo "  • Created tag: $TARGET_VERSION"
    echo "  • Pushed to GitHub (commits + tags)"
    echo
    info "GitHub Action should now be running to create the release."
fi
echo
log "Release process completed at $(date '+%Y-%m-%d %H:%M:%S')"
