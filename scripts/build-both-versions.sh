#!/bin/bash

# ============================================
# Build Both APK Versions (1.0.1 and 1.0.2)
# ============================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

BUILD_DIR="frontend/android"
OUTPUT_DIR="./apk-builds"

echo -e "${BLUE}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Building Both APK Versions                         ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════╝${NC}"
echo ""

# Create output directory
mkdir -p "$OUTPUT_DIR"

# ============================================
# Version 1.0.1
# ============================================

echo -e "${YELLOW}📦 Building APK version 1.0.1...${NC}"

# 1. Update environment
echo "  1. Updating environment.prod.ts to 1.0.1..."
sed -i.bak 's/appVersion:.*/appVersion: '\''1.0.1'\'',/' frontend/src/environments/environment.prod.ts

# 2. Update build.gradle
echo "  2. Updating build.gradle to 1.0.1..."
sed -i.bak 's/versionCode [0-9]*/versionCode 1/' "$BUILD_DIR/app/build.gradle"
sed -i.bak 's/versionName "[^"]*"/versionName "1.0.1"/' "$BUILD_DIR/app/build.gradle"

# 3. Build Angular
echo "  3. Building Angular app..."
cd frontend
npm run build:android

# 4. Build APK
echo "  4. Building APK..."
cd android
./gradlew clean
./gradlew assembleDebug

# 5. Copy APK
APK_PATH="app/build/outputs/apk/debug/app-debug.apk"
OUTPUT_APK_V1="../../$OUTPUT_DIR/app-debug-1.0.1.apk"

if [ -f "$APK_PATH" ]; then
  cp "$APK_PATH" "$OUTPUT_APK_V1"
  echo -e "${GREEN}✅ Version 1.0.1 APK: $OUTPUT_APK_V1${NC}"
else
  echo -e "${RED}❌ APK not found at $APK_PATH${NC}"
  echo "Current directory: $(pwd)"
  echo "Files in current dir:"
  ls -lah | head -10
  exit 1
fi

cd ../../

# ============================================
# Version 1.0.2
# ============================================

echo ""
echo -e "${YELLOW}📦 Building APK version 1.0.2...${NC}"

# 1. Update environment
echo "  1. Updating environment.prod.ts to 1.0.2..."
sed -i.bak 's/appVersion:.*/appVersion: '\''1.0.2'\'',/' frontend/src/environments/environment.prod.ts

# 2. Update build.gradle
echo "  2. Updating build.gradle to 1.0.2..."
sed -i.bak 's/versionCode [0-9]*/versionCode 2/' "$BUILD_DIR/app/build.gradle"
sed -i.bak 's/versionName "[^"]*"/versionName "1.0.2"/' "$BUILD_DIR/app/build.gradle"

# 3. Build Angular
echo "  3. Building Angular app..."
cd frontend
npm run build:android

# 4. Build APK
echo "  4. Building APK..."
cd android
./gradlew clean
./gradlew assembleDebug

# 5. Copy APK
APK_PATH="app/build/outputs/apk/debug/app-debug.apk"
OUTPUT_APK_V2="../../$OUTPUT_DIR/app-debug-1.0.2.apk"

if [ -f "$APK_PATH" ]; then
  cp "$APK_PATH" "$OUTPUT_APK_V2"
  echo -e "${GREEN}✅ Version 1.0.2 APK: $OUTPUT_APK_V2${NC}"
else
  echo -e "${RED}❌ APK not found at $APK_PATH${NC}"
  echo "Current directory: $(pwd)"
  echo "Files in current dir:"
  ls -lah | head -10
  exit 1
fi

cd ../../

# ============================================
# Summary
# ============================================

echo ""
echo -e "${BLUE}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Build Summary                                      ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════╝${NC}"
echo ""
echo "📦 APK files:"
ls -lh "$OUTPUT_DIR"/*.apk
echo ""
echo -e "${GREEN}✅ Both versions built successfully!${NC}"
echo ""
echo "Next steps:"
echo "  1. Upload version 1.0.2 to server: ./deploy-apk-v2.sh"
echo "  2. Install version 1.0.1 on emulator: ./install-v1-on-emulator.sh"
echo "  3. Test update: ./test-update.sh"
echo ""

