#!/bin/bash

echo "🚀 Building APK to test navigation bar styling..."
echo ""
echo "📱 Navigation bar styling does NOT work in Expo Go"
echo "✅ This build will show the black navigation bar"
echo ""

# Check if EAS CLI is installed
if ! command -v eas &> /dev/null; then
    echo "📦 Installing EAS CLI..."
    npm install -g @expo/eas-cli
fi

# Login to Expo (if not already logged in)
echo "🔐 Please login to Expo if prompted..."
eas login

# Build preview APK
echo "🔨 Building preview APK..."
echo "⏳ This will take a few minutes..."
eas build --platform android --profile preview

echo ""
echo "✅ Build complete!"
echo "📱 Install the APK on your Android device"
echo "🎯 You should now see:"
echo "   - Black navigation bar background"
echo "   - White navigation buttons"
echo "   - Consistent styling across all screens"
