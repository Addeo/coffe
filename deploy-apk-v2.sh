#!/bin/bash

# ============================================
# Deploy APK Version 1.0.2 to Server
# ============================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

VPS_HOST="192.144.12.102"
VPS_USER="user1"
APK_FILE="./apk-builds/app-debug-1.0.2.apk"
SERVER_PATH="~/coffe/app-debug.apk"
BACKEND_FILE="backend/src/modules/app/app.controller.ts"

echo -e "${BLUE}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Deploy APK Version 1.0.2 to Server                  ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if APK exists
if [ ! -f "$APK_FILE" ]; then
  echo -e "${RED}❌ APK file not found: $APK_FILE${NC}"
  echo "Please run ./build-both-versions.sh first"
  exit 1
fi

# 1. Upload APK to server
echo -e "${YELLOW}[1/3] Uploading APK to server...${NC}"
scp -o StrictHostKeyChecking=no "$APK_FILE" "${VPS_USER}@${VPS_HOST}:${SERVER_PATH}"
echo -e "${GREEN}✅ APK uploaded${NC}"
echo ""

# 2. Update backend version
echo -e "${YELLOW}[2/3] Updating backend version to 1.0.2...${NC}"
if [ -f "$BACKEND_FILE" ]; then
  # Backup original
  cp "$BACKEND_FILE" "${BACKEND_FILE}.bak"
  
  # Update version
  sed -i.bak "s/version: '[^']*'/version: '1.0.2'/" "$BACKEND_FILE"
  
  echo -e "${GREEN}✅ Backend version updated${NC}"
  echo ""
  echo "⚠️  IMPORTANT: You need to rebuild and redeploy backend!"
  echo "   Run: cd backend && npm run build"
  echo "   Then redeploy via GitHub Actions or manually"
else
  echo -e "${YELLOW}⚠️  Backend file not found: $BACKEND_FILE${NC}"
  echo "Update manually: backend/src/modules/app/app.controller.ts"
fi
echo ""

# 3. Verify deployment
echo -e "${YELLOW}[3/3] Verifying deployment...${NC}"
echo "Checking APK on server..."
ssh -o StrictHostKeyChecking=no "${VPS_USER}@${VPS_HOST}" "ls -lh ${SERVER_PATH} && echo '' && echo 'APK file size:' && stat -f%z ${SERVER_PATH} 2>/dev/null || stat -c%s ${SERVER_PATH} 2>/dev/null"

echo ""
echo -e "${GREEN}✅ Deployment complete!${NC}"
echo ""
echo "APK URL: http://${VPS_HOST}:3001/app-debug.apk"
echo "Version API: http://${VPS_HOST}:3001/api/app/version"
echo ""
echo "To test:"
echo "  1. Install version 1.0.1 on emulator"
echo "  2. Run app and check for update dialog"
echo ""

