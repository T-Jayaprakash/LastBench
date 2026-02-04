# 📱 Testing Checklist for Release APK

## Installation Instructions

### Transfer APK to Device:

**Option 1: USB Cable**
```bash
# Connect your Android device via USB
# Enable USB Debugging on device (Settings → Developer Options)
adb install docs/lastbench-v2.8-PRODUCTION.apk
```

**Option 2: Cloud Transfer**
- Upload APK to Google Drive
- Download on device
- Enable "Install from Unknown Sources" if needed
- Install the APK

---

## ⚠️ CRITICAL TESTS (Must Pass Before Upload)

Test these features on your device:

### 1. App Launch ✅/❌
- [ ] App icon appears in launcher
- [ ] App opens without crashing
- [ ] Splash screen shows correctly
- [ ] No immediate errors

### 2. Firebase Connection ✅/❌
- [ ] App connects to Firebase (no "connection failed" messages)
- [ ] Loading indicators work properly

### 3. Authentication ✅/❌
- [ ] Can initiate signup/login flow
- [ ] Email verification works (if enabled)
- [ ] Anonymous auth works (if enabled)
- [ ] User can access main screen after auth

### 4. Core Features ✅/❌
- [ ] Can create a new post
- [ ] Posts appear in feed
- [ ] Can scroll through feed smoothly
- [ ] Can like posts
- [ ] Can comment on posts
- [ ] Comments load correctly

### 5. Image Upload ✅/❌  
- [ ] Can select image from gallery
- [ ] Image uploads successfully
- [ ] Uploaded image displays in post
- [ ] No crashes during upload

### 6. Push Notifications ✅/❌
- [ ] App requests notification permission
- [ ] Can grant permission
- [ ] FCM token is generated (check Firebase Console → Cloud Messaging)

### 7. Performance ✅/❌
- [ ] App opens in < 3 seconds
- [ ] Feed loads in reasonable time
- [ ] UI is responsive (no lag)
- [ ] No memory warnings or crashes
- [ ] Battery drain is normal

### 8. Edge Cases ✅/❌
- [ ] App works on slow/no internet (offline mode)
- [ ] Can handle back button correctly
- [ ] App survives force-close and reopening
- [ ] No data loss after app restart

---

## 🐛 If You Find Issues:

### Problem: App crashes on launch
**Check:**
- Android Logcat for error messages
- Firebase configuration is correct
- google-services.json matches your Firebase project

**Fix:**
```bash
# View crash logs
adb logcat | grep -i error
```

### Problem: Firebase connection failed
**Check:**
- .env.local has correct values
- google-services.json is present
- Firebase services are enabled in console

### Problem: Can't create posts
**Check:**
- Firestore security rules are deployed
- User is authenticated
- Internet connection is active

### Problem: Images not uploading
**Check:**
- Storage security rules are deployed
- Storage bucket name is correct
- App has storage permissions

---

## 📊 Testing Tools

### ADB Commands:
```bash
# View all logs
adb logcat

# Filter for errors
adb logcat | grep -E "(ERROR|AndroidRuntime)"

# Monitor Firebase
adb logcat | grep Firebase

# Clear app data (fresh test)
adb shell pm clear com.lastbench.app

# Uninstall
adb uninstall com.lastbench.app
```

### Check App Info:
```bash
# Verify package and version
adb shell dumpsys package com.lastbench.app | grep versionName
# Should show: versionName=2.12.0
```

---

## ✅ Ready for Upload When:

- [ ] All critical tests pass
- [ ] App works on at least 2 different devices
- [ ] No crashes in normal usage
- [ ] Firebase features work correctly
- [ ] Performance is acceptable

---

## 🚀 Next: Upload to Play Console

Once testing passes, continue to Play Store upload.

See: PLAYSTORE_LAUNCH_CHECKLIST.md for upload instructions.
