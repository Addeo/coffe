#!/bin/bash

# ============================================
# Test Update Process (1.0.1 -> 1.0.2)
# ============================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

VPS_HOST="192.144.12.102"
PACKAGE_NAME="com.coffee.admin"
APK_V2="./apk-builds/app-debug-1.0.2.apk"

echo -e "${BLUE}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Test Update Process (1.0.1 → 1.0.2)                 ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════╝${NC}"
echo ""

# Check prerequisites
echo -e "${YELLOW}[1/5] Checking prerequisites...${NC}"

# Check if emulator is connected
if ! adb devices | grep -q "device$"; then
  echo -e "${RED}❌ No devices connected${NC}"
  exit 1
fi
echo -e "${GREEN}✅ Device connected${NC}"

# Check installed version
INSTALLED_VERSION=$(adb shell dumpsys package "$PACKAGE_NAME" | grep "versionName" | head -1 | sed 's/.*versionName=\([^ ]*\).*/\1/' || echo "")
if [ -z "$INSTALLED_VERSION" ]; then
  echo -e "${RED}❌ App not installed${NC}"
  echo "Please run: ./install-v1-on-emulator.sh"
  exit 1
fi
echo -e "${GREEN}✅ Installed version: $INSTALLED_VERSION${NC}"
echo ""

# Check server version
echo -e "${YELLOW}[2/5] Checking server version...${NC}"
SERVER_VERSION=$(curl -s "http://${VPS_HOST}:3001/api/app/version" | grep -o '"version":"[^"]*"' | cut -d'"' -f4 || echo "")
if [ -z "$SERVER_VERSION" ]; then
  echo -e "${RED}❌ Cannot reach server${NC}"
  exit 1
fi
echo -e "${GREEN}✅ Server version: $SERVER_VERSION${NC}"
echo ""

# Check APK availability
echo -e "${YELLOW}[3/5] Checking APK availability...${NC}"
APK_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://${VPS_HOST}:3001/app-debug.apk" || echo "000")
if [ "$APK_STATUS" != "200" ]; then
  echo -e "${RED}❌ APK not accessible (HTTP $APK_STATUS)${NC}"
  echo "Please run: ./deploy-apk-v2.sh"
  exit 1
fi
echo -e "${GREEN}✅ APK accessible${NC}"
echo ""

# Launch app
echo -e "${YELLOW}[4/5] Launching app...${NC}"
adb shell am start -n "$PACKAGE_NAME/.MainActivity" 2>/dev/null || \
adb shell monkey -p "$PACKAGE_NAME" -c android.intent.category.LAUNCHER 1

echo -e "${GREEN}✅ App launched${NC}"
echo ""
echo -e "${BLUE}📱 Watch the emulator/device:${NC}"
echo "  1. App should start"
echo "  2. Check console logs for update check"
echo "  3. Update dialog should appear"
echo ""

# Monitor logs
echo -e "${YELLOW}[5/5] Monitoring logs (press Ctrl+C to stop)...${NC}"
echo ""
adb logcat -c  # Clear logs
adb logcat | grep -E "(Coffee|Update|Version|app-update)" --color=always || \
adb logcat | grep -i "coffee" --color=always || \
adb logcat

echo ""
echo -e "${BLUE}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Manual Testing Steps                               ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════╝${NC}"
echo ""
echo "1. ✅ Installed version 1.0.1"
echo "2. ✅ Server has version 1.0.2"
echo "3. ✅ APK is accessible"
echo ""
echo "Expected behavior:"
echo "  - App should check for updates on startup"
echo "  - Dialog should appear: 'Доступна новая версия 1.0.2'"
echo "  - On 'Update' button: Opens browser with APK"
echo "  - Android should show install dialog"
echo ""
echo "To manually install update:"
echo "  adb install -r $APK_V2"
echo ""

