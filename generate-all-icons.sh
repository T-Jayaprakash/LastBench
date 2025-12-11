#!/bin/bash

# Complete Android Icon Generator for Genfess

echo "🎨 Generating ALL Android app icons from Genfess.png..."

SOURCE_IMAGE="./assets/Genfess.png"

if [ ! -f "$SOURCE_IMAGE" ]; then
    echo "❌ Error: Source image not found at $SOURCE_IMAGE"
    exit 1
fi

# Function to generate icon
generate_icon() {
    local size=$1
    local output=$2
    echo "📱 Generating $output (${size}x${size})..."
    magick "$SOURCE_IMAGE" -resize ${size}x${size} "$output"
}

# Generate ic_launcher.png for all densities
generate_icon 48 android/app/src/main/res/mipmap-mdpi/ic_launcher.png
generate_icon 72 android/app/src/main/res/mipmap-hdpi/ic_launcher.png
generate_icon 96 android/app/src/main/res/mipmap-xhdpi/ic_launcher.png
generate_icon 144 android/app/src/main/res/mipmap-xxhdpi/ic_launcher.png
generate_icon 192 android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png

# Generate ic_launcher_round.png for all densities (same as regular)
generate_icon 48 android/app/src/main/res/mipmap-mdpi/ic_launcher_round.png
generate_icon 72 android/app/src/main/res/mipmap-hdpi/ic_launcher_round.png
generate_icon 96 android/app/src/main/res/mipmap-xhdpi/ic_launcher_round.png
generate_icon 144 android/app/src/main/res/mipmap-xxhdpi/ic_launcher_round.png
generate_icon 192 android/app/src/main/res/mipmap-xxxhdpi/ic_launcher_round.png

# Generate ic_launcher_foreground.png for all densities
generate_icon 48 android/app/src/main/res/mipmap-mdpi/ic_launcher_foreground.png
generate_icon 72 android/app/src/main/res/mipmap-hdpi/ic_launcher_foreground.png
generate_icon 96 android/app/src/main/res/mipmap-xhdpi/ic_launcher_foreground.png
generate_icon 144 android/app/src/main/res/mipmap-xxhdpi/ic_launcher_foreground.png
generate_icon 192 android/app/src/main/res/mipmap-xxxhdpi/ic_launcher_foreground.png

echo "✅ All Android icons generated successfully!"
echo ""
echo "Generated icons for all variants:"
echo "  - ic_launcher.png (5 densities)"
echo "  - ic_launcher_round.png (5 densities)"
echo "  - ic_launcher_foreground.png (5 densities)"
