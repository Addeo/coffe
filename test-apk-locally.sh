#!/bin/bash

# ============================================
# Test APK Download Locally
# ============================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

LOCAL_BACKEND_URL="http://localhost:3001"
APK_PATH="./apk-builds/app-debug-1.0.2.apk"
TEST_OUTPUT="./test-downloaded.apk"

echo -e "${BLUE}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Test APK Download Locally                           ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if backend is running locally
echo -e "${YELLOW}[1/5] Checking if backend is running locally...${NC}"
BACKEND_STATUS=$(curl -s -o /dev/null -w '%{http_code}' --max-time 5 "${LOCAL_BACKEND_URL}/api/health" 2>/dev/null || echo "failed")

if [ "$BACKEND_STATUS" != "200" ]; then
  echo -e "${RED}❌ Backend is not running locally${NC}"
  echo ""
  echo "Please start backend:"
  echo "  cd backend"
  echo "  npm run start:dev"
  echo ""
  exit 1
fi
echo -e "${GREEN}✅ Backend is running (HTTP $BACKEND_STATUS)${NC}"
echo ""

# Check if APK file exists locally
echo -e "${YELLOW}[2/5] Checking local APK file...${NC}"
if [ ! -f "$APK_PATH" ]; then
  echo -e "${RED}❌ APK file not found: $APK_PATH${NC}"
  echo "Please build APK first: ./build-both-versions.sh"
  exit 1
fi
echo -e "${GREEN}✅ APK file found: $APK_PATH${NC}"
ls -lh "$APK_PATH"
echo ""

# Copy APK to backend directory (where backend expects it)
echo -e "${YELLOW}[3/5] Copying APK to backend directory...${NC}"
mkdir -p backend
if [ -f "backend/app-debug.apk" ]; then
  echo -e "${GREEN}ℹ️  APK already exists in backend directory${NC}"
else
  cp "$APK_PATH" backend/app-debug.apk
  echo -e "${GREEN}✅ APK copied to backend/app-debug.apk${NC}"
fi
ls -lh backend/app-debug.apk
echo ""

# Test version endpoint
echo -e "${YELLOW}[4/5] Testing version endpoint...${NC}"
VERSION_RESPONSE=$(curl -s "${LOCAL_BACKEND_URL}/api/app/version")
echo "$VERSION_RESPONSE" | jq '.' 2>/dev/null || echo "$VERSION_RESPONSE"
echo ""

# Test APK download
echo -e "${YELLOW}[5/5] Testing APK download...${NC}"
HTTP_CODE=$(curl -s -o "$TEST_OUTPUT" -w '%{http_code}' --max-time 30 "${LOCAL_BACKEND_URL}/app-debug.apk" || echo "failed")

if [ "$HTTP_CODE" = "200" ]; then
  echo -e "${GREEN}✅ Download successful (HTTP $HTTP_CODE)${NC}"
  
  # Compare file sizes
  ORIGINAL_SIZE=$(stat -f%z "$APK_PATH" 2>/dev/null || stat -c%s "$APK_PATH" 2>/dev/null)
  DOWNLOADED_SIZE=$(stat -f%z "$TEST_OUTPUT" 2>/dev/null || stat -c%s "$TEST_OUTPUT" 2>/dev/null)
  
  if [ "$ORIGINAL_SIZE" = "$DOWNLOADED_SIZE" ]; then
    echo -e "${GREEN}✅ File sizes match: ${ORIGINAL_SIZE} bytes${NC}"
    echo -e "${GREEN}✅ APK download works correctly!${NC}"
    rm -f "$TEST_OUTPUT"
  else
    echo -e "${RED}❌ File sizes don't match!${NC}"
    echo "  Original: $ORIGINAL_SIZE bytes"
    echo "  Downloaded: $DOWNLOADED_SIZE bytes"
    echo "  Test file saved to: $TEST_OUTPUT"
  fi
else
  echo -e "${RED}❌ Download failed (HTTP $HTTP_CODE)${NC}"
  echo "Check backend logs for errors"
fi
echo ""

echo -e "${BLUE}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Summary                                             ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════╝${NC}"
echo ""
echo "Local Backend URL: ${LOCAL_BACKEND_URL}"
echo "APK Download URL: ${LOCAL_BACKEND_URL}/app-debug.apk"
echo ""
echo "To test in browser:"
echo "  Open: ${LOCAL_BACKEND_URL}/app-debug.apk"
echo ""

