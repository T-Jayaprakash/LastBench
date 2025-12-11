#!/bin/bash

# Script to generate Android app icons from Genfess.png

echo "🎨 Generating Android app icons from Genfess.png..."

SOURCE_IMAGE="./assets/Genfess.png"

if [ ! -f "$SOURCE_IMAGE" ]; then
    echo "❌ Error: Source image not found at $SOURCE_IMAGE"
    exit 1
fi

# Android icon sizes (mipmap densities)
# mdpi: 48x48
# hdpi: 72x72
# xhdpi: 96x96
# xxhdpi: 144x144
# xxxhdpi: 192x192

echo "📱 Generating mdpi (48x48)..."
magick "$SOURCE_IMAGE" -resize 48x48 android/app/src/main/res/mipmap-mdpi/ic_launcher.png

echo "📱 Generating hdpi (72x72)..."
magick "$SOURCE_IMAGE" -resize 72x72 android/app/src/main/res/mipmap-hdpi/ic_launcher.png

echo "📱 Generating xhdpi (96x96)..."
magick "$SOURCE_IMAGE" -resize 96x96 android/app/src/main/res/mipmap-xhdpi/ic_launcher.png

echo "📱 Generating xxhdpi (144x144)..."
magick "$SOURCE_IMAGE" -resize 144x144 android/app/src/main/res/mipmap-xxhdpi/ic_launcher.png

echo "📱 Generating xxxhdpi (192x192)..."
magick "$SOURCE_IMAGE" -resize 192x192 android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png

echo "✅ All Android icons generated successfully!"
echo ""
echo "Generated icons:"
echo "  - mipmap-mdpi/ic_launcher.png (48x48)"
echo "  - mipmap-hdpi/ic_launcher.png (72x72)"
echo "  - mipmap-xhdpi/ic_launcher.png (96x96)"
echo "  - mipmap-xxhdpi/ic_launcher.png (144x144)"
echo "  - mipmap-xxxhdpi/ic_launcher.png (192x192)"
