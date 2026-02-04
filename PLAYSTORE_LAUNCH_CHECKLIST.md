# 🚀 Play Store Launch Checklist for Lastbench (GenFess)

**App Name:** GenFess (Lastbench - Anonymous College Gossip)  
**Version:** 2.12.0  
**Build Number:** 10  
**Package:** com.lastbench.app  
**Date:** Feb 4, 2026

---

## ✅ CRITICAL ISSUES FIXED

### 1. **Build Error Fixed** ✅
- **Issue:** `fcmService.ts` was importing obsolete Supabase client after Firebase migration
- **Status:** FIXED - Replaced Supabase imports with Firebase/Firestore
- **Build:** ✅ Successfully building (`npm run build` passes)

---

## 📋 PRE-LAUNCH CHECKLIST

### 🔥 **1. Firebase Configuration** 

#### ❌ **CRITICAL: Missing `google-services.json`**
**Status:** NOT FOUND in `android/app/`
**Action Required:**
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Go to Project Settings → General tab
4. Under "Your apps" section, find your Android app
5. Download `google-services.json`
6. **Place it at:** `/Users/jayaprakash/.gemini/antigravity/scratch/lastbench/android/app/google-services.json`

**Why it matters:** Without this file:
- ❌ Push notifications won't work
- ❌ Firebase Authentication won't connect
- ❌ Firestore database won't sync
- ❌ Storage uploads will fail

#### ⚠️ **Environment Variables Check**
**Required Variables:**
```bash
# Create .env.local file with:
VITE_FIREBASE_API_KEY=your_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_domain.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_bucket.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_VAPID_PUBLIC_KEY=your_vapid_key_for_web_push
VITE_APP_VERSION=2.12.0
```

**Check Status:**
```bash
cd /Users/jayaprakash/.gemini/antigravity/scratch/lastbench
ls -la | grep .env
```

---

### 📱 **2. Android Configuration**

#### ✅ **App Identity** (Verified)
- **App ID:** `com.lastbench.app` ✅
- **App Name:** "Genfess" ✅
- **Version Code:** 10 ✅
- **Version Name:** "2.11.1" ⚠️ *Needs update to 2.12.0*

**Action Required:** Update version in `android/app/build.gradle`

#### ✅ **SDK Versions** (Production Ready)
- **Min SDK:** 23 (Android 6.0) - Covers 98%+ devices ✅
- **Target SDK:** 35 (Android 15) - Latest required by Play Store ✅
- **Compile SDK:** 35 ✅

#### ❌ **Package Naming Inconsistency**
**Issue:** Multiple package names detected:
- `com.lastbench.app` (in build.gradle) ✅
- `com.jayple.app` (in capacitor.config.ts and strings.xml) ❌

**Action Required:** Choose ONE package name and update everywhere

#### ✅ **Permissions** (Verified)
- INTERNET ✅
- POST_NOTIFICATIONS ✅

---

### 🔐 **3. Signing Configuration**

#### ⚠️ **Release Keystore**
**Current Status:** Script uses `my-release-key.keystore` with test credentials

**⚠️ SECURITY WARNING:** 
The current keystore in `build_release.sh` uses:
- Password: `password123` (hardcoded and weak)
- Common Name: Generic ("LastBench")

**Recommended Actions:**
1. **Generate a SECURE production keystore:**
```bash
keytool -genkey -v \
  -keystore production-release-key.keystore \
  -alias lastbench-production \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000 \
  -storepass "YOUR_STRONG_PASSWORD_HERE" \
  -keypass "YOUR_STRONG_PASSWORD_HERE" \
  -dname "CN=YOUR_REAL_NAME, OU=YOUR_COMPANY, O=YOUR_COMPANY, L=YOUR_CITY, S=YOUR_STATE, C=YOUR_COUNTRY"
```

2. **IMPORTANT:** 
   - ⚠️ Back up this keystore file securely (Google Drive, 1Password, etc.)
   - ⚠️ If you lose this keystore, you CANNOT update your app on Play Store
   - ⚠️ Store passwords in a secure password manager

3. **Update `build_release.sh`** to use production keystore

---

### 🎨 **4. App Assets**

#### ✅ **App Icons** (Verified)
- HDPI, MDPI, XHDPI, XXHDPI, XXXHDPI ✅
- Located at: `android/app/src/main/res/mipmap-*` ✅

#### TODO: **Feature Graphic** (Play Store Requirement)
- **Size:** 1024 x 500 px
- **Format:** PNG or JPEG
- **Purpose:** Shown at top of Play Store listing

#### TODO: **Screenshots** (Play Store Requirement)
- **Minimum:** 2 screenshots
- **Recommended:** 4-8 screenshots
- **Sizes:** 
  - Phone: 1080 x 1920 px minimum
  - Tablet (optional): 1600 x 2560 px minimum
- **Show:** Key features like posting, commenting, notifications

---

### 📝 **5. Content & Privacy**

#### TODO: **Privacy Policy**
**Status:** REQUIRED by Play Store
**Action Required:**
1. Create a privacy policy covering:
   - Data collection (emails, posts, analytics)
   - Firebase services usage
   - User rights (deletion, access)
   - Contact information
2. Host it publicly (website, GitHub Pages, or privacy policy generator)
3. Add URL to Play Store listing

#### TODO: **Content Rating**
**Action Required:**
1. Complete Play Store content rating questionnaire
2. Expected rating: "Teen" or "Everyone" (based on anonymous social content)

#### TODO: **App Description**
**Play Store Listing:**
- **Short description** (80 chars max)
- **Full description** (4000 chars max)
- Should highlight:
  - College email verification
  - Anonymous posting
  - Real-time updates
  - Privacy features

**Draft short description:**
"Share anonymously with your college. Verified students only. Real-time gossip & confessions."

---

### 🧪 **6. Testing Requirements**

#### ✅ **Build Test**
```bash
npm run build  # ✅ PASSES
```

#### TODO: **Android Build Test**
```bash
cd /Users/jayaprakash/.gemini/antigravity/scratch/lastbench
npm run build
npx cap sync android
cd android
./gradlew assembleRelease
```

**Expected Output:** `android/app/build/outputs/apk/release/app-release-unsigned.apk`

#### TODO: **Functional Testing**
Test these core flows on a real device:
- [ ] App installs and opens
- [ ] Email verification works
- [ ] Can create a post
- [ ] Can view posts
- [ ] Can like/comment on posts
- [ ] Push notifications arrive
- [ ] Images upload successfully
- [ ] App doesn't crash on common actions

#### TODO: **Performance Testing**
- [ ] App opens in < 3 seconds
- [ ] Feed scrolls smoothly (60fps)
- [ ] No memory leaks (use Android Profiler)
- [ ] Battery usage is reasonable

---

### 🔧 **7. Code Quality**

#### ✅ **Production Build**
- Minification: Enabled ✅
- Source maps: Disabled for production ✅
- Build size: ~862 KB (JS bundle) ⚠️ *Consider code splitting*

**Optimization Recommendation:**
```typescript
// In vite.config.ts
build: {
  rollupOptions: {
    output: {
      manualChunks: {
        'vendor': ['react', 'react-dom'],
        'firebase': ['firebase/app', 'firebase/auth', 'firebase/firestore']
      }
    }
  }
}
```

#### ⚠️ **Obsolete Files**
These files should be removed (Supabase leftovers):
- `components/RealtimeTest.tsx` (uses Supabase)
- `.env.example` (has Supabase references)
- `database-indexes.sql` (Supabase SQL)
- `sql/` directory if it contains Supabase scripts

---

### 🚀 **8. Play Store Setup**

#### TODO: **Create Play Console App**
1. Go to [Google Play Console](https://play.google.com/console)
2. Create new app
3. Fill in app details:
   - **App name:** GenFess (or Lastbench)
   - **Default language:** English (or your choice)
   - **App or game:** App
   - **Free or paid:** Free

#### TODO: **Upload Release**
1. Build signed APK or AAB (recommended):
```bash
./build_release.sh  # or use Android Studio for AAB
```

2. Go to Play Console → Production → Create new release
3. Upload APK/AAB
4. Add release notes (what's new)
5. Submit for review

#### TODO: **App Categories**
- **Category:** Social
- **Tags:** college, anonymous, social networking, chat

---

## 🎯 IMMEDIATE ACTION ITEMS (Priority Order)

### **HIGH PRIORITY** (Launch Blockers)
1. ❌ **Add `google-services.json` to `android/app/`** - WITHOUT THIS, NOTHING WORKS
2. ❌ **Create `.env.local` with Firebase credentials**
3. ❌ **Fix package name inconsistency** (choose `com.lastbench.app` or `com.jayple.app`)
4. ❌ **Update version name** in `android/app/build.gradle` to `2.12.0`
5. ❌ **Generate production keystore** and secure it
6. ❌ **Create Privacy Policy** and host it online

### **MEDIUM PRIORITY** (Play Store Requirements)
7. ⚠️ **Create screenshots** (4-8 phone screenshots)
8. ⚠️ **Design feature graphic** (1024x500)
9. ⚠️ **Write app description** (short + full)
10. ⚠️ **Complete content rating questionnaire**

### **LOW PRIORITY** (Optimizations)
11. 🔧 Clean up Supabase files
12. 🔧 Implement code splitting to reduce bundle size
13. 🔧 Test on multiple devices/Android versions

---

## 📊 CURRENT STATUS SUMMARY

| Category | Status | Notes |
|----------|--------|-------|
| Code Build | ✅ PASS | Fixed Supabase import errors |
| Firebase Setup | ❌ INCOMPLETE | Missing google-services.json |
| Environment Config | ❌ MISSING | No .env.local file |
| Package Naming | ⚠️ INCONSISTENT | Two different package IDs |
| Versioning | ⚠️ MISMATCH | build.gradle has 2.11.1, should be 2.12.0 |
| Signing | ⚠️ INSECURE | Using weak test keystore |
| Privacy Policy | ❌ MISSING | Required by Play Store |
| Screenshots | ❌ MISSING | Required by Play Store |
| Testing | ⏳ PENDING | Need device testing |
| Play Store Listing | ❌ NOT CREATED | Need to set up |

---

## 🔗 HELPFUL RESOURCES

- **Firebase Console:** https://console.firebase.google.com
- **Google Play Console:** https://play.google.com/console
- **Android Studio:** For AAB builds and testing
- **Privacy Policy Generator:** https://app-privacy-policy-generator.firebaseapp.com/

---

## 📞 SUPPORT

If you encounter issues:
1. Check Firebase Console for any service disruptions
2. Review Android Logcat for runtime errors
3. Test on a physical device, not just emulator
4. Verify all environment variables are set correctly

---

**Last Updated:** 2026-02-04  
**Prepared By:** Antigravity AI Assistant  
**App Version:** 2.12.0
