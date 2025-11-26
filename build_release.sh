#!/bin/bash

# 1. Generate a Release Keystore (if not exists)
if [ ! -f my-release-key.keystore ]; then
    echo "🔑 Generating release keystore..."
    keytool -genkey -v -keystore my-release-key.keystore -alias my-key-alias -keyalg RSA -keysize 2048 -validity 10000 -storepass password123 -keypass password123 -dname "CN=LastBench, OU=Engineering, O=LastBench, L=SanFrancisco, S=California, C=US"
else
    echo "🔑 Keystore already exists."
fi

# Get absolute path of keystore (it's in ROOT directory)
KEYSTORE_PATH="$(pwd)/my-release-key.keystore"

# 1.5. Build Web Assets and Sync
echo "📦 Building web assets..."
npm run build
echo "🔄 Syncing with Capacitor..."
npx cap sync android

# 2. Clean Project
echo "🧹 Cleaning project..."
cd android
./gradlew clean

# 3. Build Signed Release APK
echo "🏗️ Building Signed Release APK..."
# We are already in android/ directory
./gradlew assembleRelease \
  -Pandroid.injected.signing.store.file="$KEYSTORE_PATH" \
  -Pandroid.injected.signing.store.password=password123 \
  -Pandroid.injected.signing.key.alias=my-key-alias \
  -Pandroid.injected.signing.key.password=password123

# 4. Move and Rename
cd ..
APK_SOURCE_PATH="android/app/build/outputs/apk/release/app-release.apk"
APK_DEST_PATH="docs/lastbench-v2.8-PRODUCTION.apk"

if [ -f "$APK_SOURCE_PATH" ]; then
    # Ensure the docs directory exists
    mkdir -p docs
    mv "$APK_SOURCE_PATH" "$APK_DEST_PATH"
    echo "✅ Build Success! APK moved to $APK_DEST_PATH"
    ls -lh "$APK_DEST_PATH"
else
    echo "❌ Build Failed! APK not found at $APK_SOURCE_PATH"
    exit 1
fi
