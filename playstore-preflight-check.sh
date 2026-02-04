#!/bin/bash

# ============================================================================
# PLAY STORE PRE-FLIGHT CHECK
# ============================================================================
# Quick validation script to check if app is ready for Play Store
# Run this before attempting to build release APK
# ============================================================================

echo "🚀 Play Store Pre-Flight Check"
echo "================================"
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

ERRORS=0
WARNINGS=0

# ============================================================================
# 1. Check Firebase Configuration
# ============================================================================
echo "📱 Checking Firebase Configuration..."

if [ -f "android/app/google-services.json" ]; then
    echo -e "  ${GREEN}✅ google-services.json exists${NC}"
else
    echo -e "  ${RED}❌ CRITICAL: google-services.json NOT FOUND${NC}"
    echo "     Location: android/app/google-services.json"
    echo "     Download from: https://console.firebase.google.com"
    ((ERRORS++))
fi

if [ -f ".env.local" ] || [ -f ".env" ]; then
    echo -e "  ${GREEN}✅ Environment file exists${NC}"
    
    # Check for required Firebase variables
    if grep -q "VITE_FIREBASE_API_KEY" .env* 2>/dev/null; then
        echo -e "  ${GREEN}✅ Firebase API key configured${NC}"
    else
        echo -e "  ${RED}❌ CRITICAL: VITE_FIREBASE_API_KEY not found${NC}"
        ((ERRORS++))
    fi
else
    echo -e "  ${RED}❌ CRITICAL: .env.local or .env NOT FOUND${NC}"
    echo "     Create .env.local with Firebase credentials"
    ((ERRORS++))
fi

echo ""

# ============================================================================
# 2. Check Build Configuration
# ============================================================================
echo "🔧 Checking Build Configuration..."

# Check version consistency
PACKAGE_VERSION=$(node -p "require('./package.json').version")
GRADLE_VERSION=$(grep "versionName" android/app/build.gradle | sed 's/.*"\(.*\)".*/\1/')

echo "  Package.json version: $PACKAGE_VERSION"
echo "  Gradle version: $GRADLE_VERSION"

if [ "$PACKAGE_VERSION" = "$GRADLE_VERSION" ]; then
    echo -e "  ${GREEN}✅ Version numbers match${NC}"
else
    echo -e "  ${YELLOW}⚠️  WARNING: Version mismatch${NC}"
    ((WARNINGS++))
fi

# Check package name consistency
GRADLE_PKG=$(grep "applicationId" android/app/build.gradle | sed 's/.*"\(.*\)".*/\1/')
CAP_PKG=$(grep "appId:" capacitor.config.ts | sed "s/.*'\(.*\)'.*/\1/")

echo "  Gradle package: $GRADLE_PKG"
echo "  Capacitor package: $CAP_PKG"

if [ "$GRADLE_PKG" = "$CAP_PKG" ]; then
    echo -e "  ${GREEN}✅ Package names match${NC}"
else
    echo -e "  ${RED}❌ ERROR: Package name mismatch${NC}"
    ((ERRORS++))
fi

echo ""

# ============================================================================
# 3. Check Build Process
# ============================================================================
echo "🏗️  Testing Build Process..."

# Test npm build
echo "  Running npm build..."
if npm run build > /dev/null 2>&1; then
    echo -e "  ${GREEN}✅ Web build successful${NC}"
else
    echo -e "  ${RED}❌ CRITICAL: Web build failed${NC}"
    echo "     Run 'npm run build' to see errors"
    ((ERRORS++))
fi

# Check dist directory
if [ -d "dist" ] && [ "$(ls -A dist)" ]; then
    echo -e "  ${GREEN}✅ dist/ directory exists and not empty${NC}"
else
    echo -e "  ${RED}❌ ERROR: dist/ directory missing or empty${NC}"
    ((ERRORS++))
fi

echo ""

# ============================================================================
# 4. Check Signing Configuration
# ============================================================================
echo "🔐 Checking Signing Configuration..."

if [ -f "my-release-key.keystore" ]; then
    echo -e "  ${GREEN}✅ Keystore file exists${NC}"
    
    # Check if it's the test keystore (insecure)
    if grep -q "password123" build_release.sh 2>/dev/null; then
        echo -e "  ${YELLOW}⚠️  WARNING: Using test keystore with weak password${NC}"
        echo "     Consider generating a production keystore"
        ((WARNINGS++))
    fi
else
    echo -e "  ${YELLOW}⚠️  WARNING: Release keystore not found${NC}"
    echo "     Will be generated on first build"
    ((WARNINGS++))
fi

echo ""

# ============================================================================
# 5. Check App Assets
# ============================================================================
echo "🎨 Checking App Assets..."

# Check icons
ICON_COUNT=$(find android/app/src/main/res -name "ic_launcher.png" 2>/dev/null | wc -l)
echo "  Found $ICON_COUNT icon files"

if [ "$ICON_COUNT" -ge 5 ]; then
    echo -e "  ${GREEN}✅ App icons present${NC}"
else
    echo -e "  ${YELLOW}⚠️  WARNING: Missing some icon densities${NC}"
    ((WARNINGS++))
fi

echo ""

# ============================================================================
# 6. Check for Obsolete Files
# ============================================================================
echo "🧹 Checking for Obsolete Files..."

OBSOLETE_COUNT=0

if [ -f "components/RealtimeTest.tsx" ]; then
    echo -e "  ${YELLOW}⚠️  Found: components/RealtimeTest.tsx (Supabase, unused)${NC}"
    ((OBSOLETE_COUNT++))
fi

if grep -r "supabaseClient" services/ 2>/dev/null | grep -v "fcmService" > /dev/null; then
    echo -e "  ${YELLOW}⚠️  Found Supabase references in services/${NC}"
    ((OBSOLETE_COUNT++))
fi

if [ "$OBSOLETE_COUNT" -gt 0 ]; then
    echo -e "  ${YELLOW}⚠️  Found $OBSOLETE_COUNT obsolete files${NC}"
    ((WARNINGS++))
else
    echo -e "  ${GREEN}✅ No obsolete files detected${NC}"
fi

echo ""

# ============================================================================
# SUMMARY
# ============================================================================
echo "================================"
echo "📊 SUMMARY"
echo "================================"

if [ "$ERRORS" -eq 0 ] && [ "$WARNINGS" -eq 0 ]; then
    echo -e "${GREEN}✅ ALL CHECKS PASSED!${NC}"
    echo ""
    echo "🎉 Your app appears ready for release build!"
    echo ""
    echo "Next steps:"
    echo "  1. Review PLAYSTORE_LAUNCH_CHECKLIST.md"
    echo "  2. Run ./build_release.sh to create APK"
    echo "  3. Test APK on real device"
    echo "  4. Upload to Play Console"
    exit 0
elif [ "$ERRORS" -eq 0 ]; then
    echo -e "${YELLOW}⚠️  PASSED WITH $WARNINGS WARNING(S)${NC}"
    echo ""
    echo "You can proceed with caution, but review warnings above."
    echo "Run ./build_release.sh when ready."
    exit 0
else
    echo -e "${RED}❌ FAILED WITH $ERRORS ERROR(S) AND $WARNINGS WARNING(S)${NC}"
    echo ""
    echo "❌ DO NOT BUILD FOR PRODUCTION YET"
    echo ""
    echo "Fix the errors above, then run this script again."
    echo "See PLAYSTORE_LAUNCH_CHECKLIST.md for detailed guidance."
    exit 1
fi
