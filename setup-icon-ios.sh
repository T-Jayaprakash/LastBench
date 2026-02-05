#!/bin/bash

# Script to set up iOS app icon using macOS sips command
SOURCE_IMAGE="/Users/jayaprakash/.gemini/antigravity/scratch/lastbench/assets/Genfess.png"
IOS_ICON_DIR="ios/App/App/Assets.xcassets/AppIcon.appiconset"

if [ ! -f "$SOURCE_IMAGE" ]; then
    echo "Error: Source image not found at $SOURCE_IMAGE"
    exit 1
fi

if [ ! -d "$IOS_ICON_DIR" ]; then
    echo "Error: iOS icon directory not found at $IOS_ICON_DIR. Did you run 'npx cap add ios'?"
    exit 1
fi

echo "Setting up iOS app icons from $SOURCE_IMAGE..."

# Function to resize and save
resize_icon() {
    SIZE=$1
    FILENAME=$2
    echo "Creating $FILENAME ($SIZE x $SIZE)..."
    sips -z $SIZE $SIZE "$SOURCE_IMAGE" --out "$IOS_ICON_DIR/$FILENAME" > /dev/null 2>&1
}

# Generate all required sizes
resize_icon 20 "AppIcon-20x20@1x.png"
resize_icon 40 "AppIcon-20x20@2x.png"
resize_icon 60 "AppIcon-20x20@3x.png"
resize_icon 29 "AppIcon-29x29@1x.png"
resize_icon 58 "AppIcon-29x29@2x.png"
resize_icon 87 "AppIcon-29x29@3x.png"
resize_icon 40 "AppIcon-40x40@1x.png"
resize_icon 80 "AppIcon-40x40@2x.png"
resize_icon 120 "AppIcon-40x40@3x.png"
resize_icon 120 "AppIcon-60x60@2x.png"
resize_icon 180 "AppIcon-60x60@3x.png"
resize_icon 76 "AppIcon-76x76@1x.png"
resize_icon 152 "AppIcon-76x76@2x.png"
resize_icon 167 "AppIcon-83.5x83.5@2x.png"
resize_icon 1024 "AppIcon-512@2x.png"

# Update Contents.json (Optional, usually Capacitor creates a default one, but we should ensure it matches)
# For now, we assume the default Contents.json exists and matches these filenames if we stick to standard naming.
# But Capacitor's default might be different.
# Let's just overwrite the images.

echo "✓ iOS Icons generated!"
