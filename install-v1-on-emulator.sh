#!/bin/bash

# ============================================
# Install APK Version 1.0.1 on Emulator
# ============================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

APK_FILE="./apk-builds/app-debug-1.0.1.apk"
PACKAGE_NAME="com.coffee.admin"

echo -e "${BLUE}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Install APK Version 1.0.1 on Emulator               ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if APK exists
if [ ! -f "$APK_FILE" ]; then
  echo -e "${RED}❌ APK file not found: $APK_FILE${NC}"
  echo "Please run ./build-both-versions.sh first"
  exit 1
fi

# Check if adb is available
if ! command -v adb &> /dev/null; then
  echo -e "${RED}❌ adb command not found${NC}"
  echo "Please install Android SDK Platform Tools"
  echo "  brew install --cask android-platform-tools"
  exit 1
fi

# Check if emulator is connected
echo -e "${YELLOW}[1/4] Checking for connected devices...${NC}"
DEVICES=$(adb devices | grep -v "List" | grep "device" | wc -l | tr -d ' ')

if [ "$DEVICES" -eq 0 ]; then
  echo -e "${RED}❌ No devices/emulators connected${NC}"
  echo ""
  echo "Please:"
  echo "  1. Start Android emulator"
  echo "  2. Or connect Android device via USB"
  echo "  3. Enable USB debugging on device"
  exit 1
fi

echo -e "${GREEN}✅ Found $DEVICES device(s)${NC}"
adb devices
echo ""

# Uninstall existing version (if exists)
echo -e "${YELLOW}[2/4] Uninstalling existing version (if any)...${NC}"
adb uninstall "$PACKAGE_NAME" 2>/dev/null || echo "  No existing installation"
echo ""

# Install version 1.0.1
echo -e "${YELLOW}[3/4] Installing version 1.0.1...${NC}"
adb install -r "$APK_FILE"
echo ""

# Verify installation
echo -e "${YELLOW}[4/4] Verifying installation...${NC}"
INSTALLED_VERSION=$(adb shell dumpsys package "$PACKAGE_NAME" | grep "versionName" | head -1 | sed 's/.*versionName=\([^ ]*\).*/\1/')

if [ -n "$INSTALLED_VERSION" ]; then
  echo -e "${GREEN}✅ Installed version: $INSTALLED_VERSION${NC}"
else
  echo -e "${YELLOW}⚠️  Could not verify version${NC}"
fi

echo ""
echo -e "${GREEN}✅ Installation complete!${NC}"
echo ""
echo "Next steps:"
echo "  1. Launch the app on emulator"
echo "  2. It should detect version 1.0.2 on server"
echo "  3. Show update dialog"
echo ""
echo "To launch app:"
echo "  adb shell am start -n com.coffee.admin/.MainActivity"
echo ""

