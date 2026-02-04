# 🔥 Firebase Setup Guide for Lastbench

This guide will help you set up Firebase from scratch or connect your existing Firebase project.

---

## OPTION A: You Already Have a Firebase Project

### Step 1: Download `google-services.json`

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Click the **⚙️ gear icon** → **Project settings**
4. Scroll to **"Your apps"** section
5. Find your **Android app** 
   - If you don't see one, click **"Add app"** → Android icon
   - Package name: `com.lastbench.app`
6. Click **"Download google-services.json"**
7. **Save it to:**
   ```
   /Users/jayaprakash/.gemini/antigravity/scratch/lastbench/android/app/google-services.json
   ```

### Step 2: Get Environment Variables

Still in **Project Settings**, copy these values:

```bash
# Create/edit .env.local file in project root
VITE_FIREBASE_API_KEY=<Your API Key>
VITE_FIREBASE_AUTH_DOMAIN=<Your Auth Domain>
VITE_FIREBASE_PROJECT_ID=<Your Project ID>
VITE_FIREBASE_STORAGE_BUCKET=<Your Storage Bucket>
VITE_FIREBASE_MESSAGING_SENDER_ID=<Your Sender ID>
VITE_FIREBASE_APP_ID=<Your App ID>
VITE_APP_VERSION=2.12.0
```

### Step 3: Enable Required Services

In Firebase Console sidebar:

1. **Authentication**
   - Click "Get Started"
   - Go to "Sign-in method" tab
   - Enable "Anonymous" (toggle ON)
   - If you're using email: Enable "Email/Password"

2. **Firestore Database**
   - Click "Create database"
   - Choose "Start in production mode" (we'll add security rules)
   - Select a location (closest to your users)

3. **Storage**
   - Click "Get started"
   - Start in production mode
   - Same location as Firestore

4. **Cloud Messaging** (for push notifications)
   - Should be auto-enabled
   - Go to Project Settings → Cloud Messaging tab
   - Note the "Server key" (for backend)

### Step 4: Deploy Security Rules

Use the existing rule files in your project:

**Firestore Rules:**
```bash
# File already exists: firestore.rules
# Deploy:
firebase deploy --only firestore:rules
```

**Storage Rules:**
```bash
# File already exists: storage.rules
# Deploy:
firebase deploy --only storage:rules
```

### Step 5: Verify Setup
```bash
cd /Users/jayaprakash/.gemini/antigravity/scratch/lastbench
./playstore-preflight-check.sh
# Should show ✅ for Firebase config
```

---

## OPTION B: Create a New Firebase Project

### Step 1: Create Project

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click **"Add project"**
3. Enter project name: `Lastbench` (or your choice)
4. **Enable Google Analytics?** 
   - Recommended: YES (free usage insights)
   - Select or create Analytics account
5. Click **"Create project"** (takes ~30 seconds)

### Step 2: Add Android App

1. In your new project, click **Android icon** (🤖)
2. **Android package name:** `com.lastbench.app`
3. **App nickname (optional):** Lastbench or GenFess
4. **Debug signing certificate SHA-1 (optional):** Skip for now
5. Click **"Register app"**
6. **Download `google-services.json`**
   - Save to: `/Users/jayaprakash/.gemini/antigravity/scratch/lastbench/android/app/`
7. Click **"Next"** → **"Continue to console"**

### Step 3: Add Web App (for PWA)

1. In Project Overview, click **Web icon** (`</>`)
2. **App nickname:** Lastbench Web
3. **Firebase Hosting?** No (you're using Vercel/Netlify)
4. Click **"Register app"**
5. **Copy the config object:**
   ```javascript
   const firebaseConfig = {
     apiKey: "...",
     authDomain: "...",
     projectId: "...",
     storageBucket: "...",
     messagingSenderId: "...",
     appId: "..."
   };
   ```
6. Create `.env.local` with these values:
   ```bash
   VITE_FIREBASE_API_KEY=<apiKey>
   VITE_FIREBASE_AUTH_DOMAIN=<authDomain>
   VITE_FIREBASE_PROJECT_ID=<projectId>
   VITE_FIREBASE_STORAGE_BUCKET=<storageBucket>
   VITE_FIREBASE_MESSAGING_SENDER_ID=<messagingSenderId>
   VITE_FIREBASE_APP_ID=<appId>
   VITE_APP_VERSION=2.12.0
   ```

### Step 4: Enable Services

Enable these in the Firebase Console sidebar:

#### 4.1 Authentication
- Click **"Authentication"** → **"Get started"**
- Go to **"Sign-in method"** tab
- Enable **"Anonymous"** (click, toggle ON, Save)
- If using email/password: Enable **"Email/Password"** too

#### 4.2 Firestore Database
- Click **"Firestore Database"** → **"Create database"**
- **Location:** Choose closest to your users
  - India: `asia-south1`
  - US: `us-central1`
  - Europe: `europe-west1`
- **Security rules:** Start in **production mode** (we'll add custom rules)
- Click **"Enable"**

#### 4.3 Storage
- Click **"Storage"** → **"Get started"**
- **Security rules:** Start in **production mode**
- **Location:** Same as Firestore (auto-selected)
- Click **"Done"**

#### 4.4 Cloud Messaging
- Automatically enabled
- Go to **Project Settings → Cloud Messaging** tab
- **For Web Push (optional):**
  1. Scroll to "Web configuration"
  2. Click "Generate key pair" under "Web Push certificates"
  3. Copy the generated key
  4. Add to `.env.local`:
     ```bash
     VITE_VAPID_PUBLIC_KEY=<paste_key_here>
     ```

### Step 5: Set Up Firebase CLI (for deploying rules)

```bash
# Install Firebase CLI globally
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize project (in your app directory)
cd /Users/jayaprakash/.gemini/antigravity/scratch/lastbench
firebase init

# Select:
# - Firestore
# - Storage
# 
# Use existing project: Select your project
# Firestore rules file: firestore.rules (already exists)
# Firestore indexes file: firestore.indexes.json (already exists)
# Storage rules file: storage.rules (already exists)
```

### Step 6: Deploy Security Rules

```bash
# Deploy Firestore rules
firebase deploy --only firestore:rules

# Deploy Storage rules
firebase deploy --only storage:rules

# Deploy both
firebase deploy --only firestore,storage
```

### Step 7: Create Firestore Structure

Your app expects this structure:

```
/users/{userId}
  - email: string
  - displayName: string (optional)
  - college: string
  - createdAt: timestamp
  
  /posts (subcollection)
    - text: string
    - imageUrl: string (optional)
    - likes: number
    - comments: number
    - createdAt: timestamp
  
  /notifications (subcollection)
    - type: string
    - message: string
    - isRead: boolean
    - createdAt: timestamp
  
  /fcmTokens (subcollection)
    - token: string
    - platform: string
    - updatedAt: timestamp
```

**No manual setup needed** - your app will create these on first use!

### Step 8: Verify Everything

```bash
cd /Users/jayaprakash/.gemini/antigravity/scratch/lastbench
./playstore-preflight-check.sh
```

Should show:
```
✅ google-services.json exists
✅ Firebase API key configured
✅ Version numbers match
✅ Package names match
✅ Web build successful
```

---

## 🔐 Security Rules Overview

Your project includes pre-configured security rules:

### Firestore Rules (`firestore.rules`)
- ✅ Users can only read/write their own data
- ✅ Posts are public within same college
- ✅ Notifications are private to user
- ✅ FCM tokens are protected

### Storage Rules (`storage.rules`)
- ✅ Users can upload images to their own folder
- ✅ File size limits enforced
- ✅ Only image types allowed
- ✅ Public read access for images

---

## 📊 Free Tier Limits

Firebase Free (Spark) Plan includes:

| Service | Free Quota | Enough for... |
|---------|-----------|---------------|
| Firestore | 50K reads/day | ~5K active users/day |
| Storage | 5 GB | ~50K images |
| Authentication | Unlimited | ✅ No limits |
| Cloud Messaging | Unlimited | ✅ No limits |

**Upgrade if:** You exceed these (will get email warning first)

---

## 🐛 Troubleshooting

### "google-services.json not found"
```bash
# Check file location
ls -la android/app/google-services.json

# Should output file details, not "No such file"
```

### "Firebase config invalid"
- Verify `.env.local` has correct values
- No quotes around values in .env
- No trailing spaces
- Restart dev server after changing .env

### "Authentication not working"
- Enable Anonymous auth in Firebase Console
- Check auth domain in .env matches Firebase

### "Firestore permission denied"
- Deploy security rules: `firebase deploy --only firestore:rules`
- Check user is authenticated before writing

---

## ✅ Checklist

After completing setup:

- [ ] `google-services.json` in `android/app/`
- [ ] `.env.local` created with all Firebase vars
- [ ] Anonymous auth enabled in Firebase Console
- [ ] Firestore database created
- [ ] Storage enabled
- [ ] Security rules deployed
- [ ] `./playstore-preflight-check.sh` passes

---

## 🚀 Next Steps

Once Firebase is configured:

1. Test locally:
   ```bash
   npm run build
   npx cap sync android
   npx cap open android
   ```

2. Run on device and verify:
   - App opens without crashing
   - Can create an account
   - Can post content
   - Posts appear in feed
   - Images upload successfully

3. Build for Play Store:
   ```bash
   ./build_release.sh
   ```

---

**Need Help?**
- Firebase Docs: https://firebase.google.com/docs
- Firebase Console: https://console.firebase.google.com
- Support: https://firebase.google.com/support

**Time Required:** 15-30 minutes for new project, 5 minutes if you have existing project.
