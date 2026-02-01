#!/bin/bash

# ============================================================================
# LASTBENCH - COMPLETE DEPLOYMENT SCRIPT
# ============================================================================
# This script:
# 1. Runs database migrations
# 2. Builds the app
# 3. Syncs with Capacitor
# 4. Commits and pushes to Git
# 5. Deploys to Netlify (web)
# 6. Optionally builds APK
# ============================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# ============================================================================
# 1. PRE-FLIGHT CHECKS
# ============================================================================

log_info "Running pre-flight checks..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    log_error "package.json not found. Are you in the project root?"
    exit 1
fi

# Check if git is initialized
if [ ! -d ".git" ]; then
    log_error "Git repository not found. Please initialize git first."
    exit 1
fi

# Check for uncommitted changes
if [[ -n $(git status -s) ]]; then
    log_warning "You have uncommitted changes. They will be committed."
    git status -s
    read -p "Continue? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_info "Deployment cancelled."
        exit 0
    fi
fi

log_success "Pre-flight checks passed"

# ============================================================================
# 2. VERSION BUMP
# ============================================================================

log_info "Bumping version..."

# Read current version from package.json
CURRENT_VERSION=$(node -p "require('./package.json').version")
log_info "Current version: $CURRENT_VERSION"

# Parse version
IFS='.' read -r -a VERSION_PARTS <<< "$CURRENT_VERSION"
MAJOR="${VERSION_PARTS[0]}"
MINOR="${VERSION_PARTS[1]}"
PATCH="${VERSION_PARTS[2]}"

# Increment patch version
NEW_PATCH=$((PATCH + 1))
NEW_VERSION="$MAJOR.$MINOR.$NEW_PATCH"

log_info "New version: $NEW_VERSION"

# Update package.json
npm version $NEW_VERSION --no-git-tag-version

# Update version.json
cat > version.json << EOF
{
  "version": "$NEW_VERSION",
  "buildDate": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "buildNumber": $(date +%s)
}
EOF

log_success "Version bumped to $NEW_VERSION"

# ============================================================================
# 3. DATABASE MIGRATION (OPTIONAL)
# ============================================================================

log_info "Checking for database migrations..."

if [ -f "sql/notification_system_schema.sql" ]; then
    log_warning "New database schema found: sql/notification_system_schema.sql"
    log_warning "Please run this SQL in your Supabase SQL Editor manually:"
    log_warning "https://supabase.com/dashboard/project/YOUR_PROJECT/sql"
    echo ""
    read -p "Have you run the database migration? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_error "Please run the database migration first, then re-run this script."
        exit 1
    fi
    log_success "Database migration confirmed"
else
    log_info "No new database migrations"
fi

# ============================================================================
# 4. BUILD THE APP
# ============================================================================

log_info "Building the app..."

# Install dependencies
log_info "Installing dependencies..."
npm install

# Build for production
log_info "Building production bundle..."
npm run build

log_success "App built successfully"

# ============================================================================
# 5. SYNC WITH CAPACITOR
# ============================================================================

log_info "Syncing with Capacitor..."

npx cap sync

log_success "Capacitor sync complete"

# ============================================================================
# 6. GIT COMMIT & PUSH
# ============================================================================

log_info "Committing changes to Git..."

# Add all changes
git add .

# Create commit message
COMMIT_MSG="🚀 Deploy v$NEW_VERSION - Push notification system

- Added production-grade FCM notification system
- Multi-device support with automatic token cleanup
- Rate limiting and spam control
- Notification batching (Instagram-style)
- Deep linking support
- Comprehensive documentation

Version: $NEW_VERSION
Build: $(date -u +"%Y-%m-%d %H:%M:%S UTC")"

# Commit
git commit -m "$COMMIT_MSG" || log_warning "Nothing to commit"

# Push to remote
log_info "Pushing to remote repository..."
CURRENT_BRANCH=$(git branch --show-current)
git push origin $CURRENT_BRANCH

log_success "Changes pushed to $CURRENT_BRANCH"

# ============================================================================
# 7. DEPLOY TO NETLIFY (WEB)
# ============================================================================

log_info "Deploying to Netlify..."

# Check if Netlify CLI is installed
if ! command -v netlify &> /dev/null; then
    log_warning "Netlify CLI not found. Installing..."
    npm install -g netlify-cli
fi

# Deploy
netlify deploy --prod --dir=dist

log_success "Deployed to Netlify"

# ============================================================================
# 8. BUILD APK (OPTIONAL)
# ============================================================================

echo ""
read -p "Do you want to build Android APK? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    log_info "Building Android APK..."
    
    cd android
    ./gradlew assembleRelease || ./gradlew assembleDebug
    cd ..
    
    # Find the APK
    APK_PATH=$(find android/app/build/outputs/apk -name "*.apk" | head -n 1)
    
    if [ -f "$APK_PATH" ]; then
        # Copy to docs folder with version
        NEW_APK_NAME="docs/genfess-v$NEW_VERSION.apk"
        cp "$APK_PATH" "$NEW_APK_NAME"
        log_success "APK built: $NEW_APK_NAME"
        
        # Commit APK
        git add "$NEW_APK_NAME"
        git commit -m "📦 Add APK v$NEW_VERSION"
        git push origin $CURRENT_BRANCH
    else
        log_error "APK not found"
    fi
fi

# ============================================================================
# 9. DEPLOYMENT SUMMARY
# ============================================================================

echo ""
echo "════════════════════════════════════════════════════════════════"
log_success "DEPLOYMENT COMPLETE! 🎉"
echo "════════════════════════════════════════════════════════════════"
echo ""
echo "📦 Version: $NEW_VERSION"
echo "🌐 Web: https://your-app.netlify.app"
echo "📱 APK: docs/genfess-v$NEW_VERSION.apk (if built)"
echo "🔔 Server: Remember to restart notification server!"
echo ""
echo "Next steps:"
echo "1. Test the web app"
echo "2. Test push notifications"
echo "3. Download and test APK on Android device"
echo "4. Restart notification server: cd server && npm start"
echo ""
echo "════════════════════════════════════════════════════════════════"

# ============================================================================
# 10. NOTIFICATION SERVER REMINDER
# ============================================================================

echo ""
log_warning "IMPORTANT: Restart your notification server!"
echo ""
echo "If running locally:"
echo "  cd server"
echo "  npm start"
echo ""
echo "If running on a server:"
echo "  ssh your-server"
echo "  cd /path/to/server"
echo "  pm2 restart notification-server"
echo ""

log_success "All done! 🚀"
