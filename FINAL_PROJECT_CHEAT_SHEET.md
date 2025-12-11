# 🚀 GENFESS PROJECT - FINAL CHEAT SHEET

## ✅ **Live System Links**
| Item | Link |
|------|------|
| **For Users (Download)** | [https://t-jayaprakash.github.io/LastBench/](https://t-jayaprakash.github.io/LastBench/) |
| **Direct APK File** | [genfess-v2.9.0.apk](https://github.com/T-Jayaprakash/LastBench/raw/main/genfess-v2.9.0.apk) |
| **GitHub Repo** | [https://github.com/T-Jayaprakash/LastBench](https://github.com/T-Jayaprakash/LastBench) |

---

## 🛠 **How to Release a New Update (e.g., v3.0.0)**

Since we built the update system, releasing a new version is easy. Just follow these steps:

### 1. Update the Code
Make your changes, fix bugs, or add features.

### 2. Update Version Number
Edit `package.json`:
```json
"version": "3.0.0"
```

### 3. Build the New APK
Run these commands in your terminal:
```bash
# 1. Build web assets
npm run build

# 2. Sync to Android
npx cap sync android

# 3. Create Signed APK
cd android
./gradlew assembleRelease -Pandroid.injected.signing.store.file="$(pwd)/../my-release-key.keystore" -Pandroid.injected.signing.store.password=password123 -Pandroid.injected.signing.key.alias=my-key-alias -Pandroid.injected.signing.key.password=password123
```

### 4. Prepare for Release
Copy the new APK to your main folder:
```bash
# Go back to root
cd ..
cp android/app/build/outputs/apk/release/app-release.apk ./genfess-v3.0.0.apk
```

### 5. Update the Website & System
1.  **Edit `index.html`:** Change the download link to `genfess-v3.0.0.apk`.
2.  **Edit `version.json`:**
    ```json
    {
        "latestVersion": "3.0.0",
        "updateUrl": "https://t-jayaprakash.github.io/LastBench/",
        "message": "New features available! Update now."
    }
    ```

### 6. Publish!
```bash
git add .
git commit -m "Release v3.0.0"
git push
```

**That's it!** All your users will see a "New Update Available" popup when they open the app. 🚀
