#!/bin/bash

# Script to generate Android Notification icons
# Source must be a white-on-transparent PNG

SOURCE_IMAGE="./assets/notification-icon.png"

if [ ! -f "$SOURCE_IMAGE" ]; then
    echo "❌ Error: Source image not found at $SOURCE_IMAGE"
    exit 1
fi

echo "🔔 Generating Notification Icons (ic_stat_icon)..."

# Ensure directories exist
mkdir -p android/app/src/main/res/drawable-mdpi
mkdir -p android/app/src/main/res/drawable-hdpi
mkdir -p android/app/src/main/res/drawable-xhdpi
mkdir -p android/app/src/main/res/drawable-xxhdpi
mkdir -p android/app/src/main/res/drawable-xxxhdpi

# Generate icons
# mdpi: 24x24
magick "$SOURCE_IMAGE" -resize 24x24 android/app/src/main/res/drawable-mdpi/ic_stat_icon.png

# hdpi: 36x36
magick "$SOURCE_IMAGE" -resize 36x36 android/app/src/main/res/drawable-hdpi/ic_stat_icon.png

# xhdpi: 48x48
magick "$SOURCE_IMAGE" -resize 48x48 android/app/src/main/res/drawable-xhdpi/ic_stat_icon.png

# xxhdpi: 72x72
magick "$SOURCE_IMAGE" -resize 72x72 android/app/src/main/res/drawable-xxhdpi/ic_stat_icon.png

# xxxhdpi: 96x96
magick "$SOURCE_IMAGE" -resize 96x96 android/app/src/main/res/drawable-xxxhdpi/ic_stat_icon.png

echo "✅ Notification icons generated!"
