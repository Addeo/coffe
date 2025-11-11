#!/bin/bash

# ============================================
# Deploy APK Version 1.0.4 to Server
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
APK_FILE="./apk-builds/app-debug-1.0.4.apk"
SERVER_PATH="/home/user1/coffe/app-debug.apk"

echo -e "${BLUE}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Deploy APK Version 1.0.4 to Server                  ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if APK exists
if [ ! -f "$APK_FILE" ]; then
  echo -e "${RED}❌ APK file not found: $APK_FILE${NC}"
  echo "Please build APK first"
  exit 1
fi

# 1. Create directory if it doesn't exist
echo -e "${YELLOW}[1/3] Ensuring server directory exists...${NC}"
ssh -o StrictHostKeyChecking=no "${VPS_USER}@${VPS_HOST}" "mkdir -p /home/user1/coffe"

# 2. Upload APK to server
echo -e "${YELLOW}[2/3] Uploading APK to server...${NC}"
scp -o StrictHostKeyChecking=no "$APK_FILE" "${VPS_USER}@${VPS_HOST}:/tmp/app-debug-1.0.4.apk"
ssh -o StrictHostKeyChecking=no "${VPS_USER}@${VPS_HOST}" "sudo mv /tmp/app-debug-1.0.4.apk ${SERVER_PATH} && sudo chown user1:user1 ${SERVER_PATH}"
echo -e "${GREEN}✅ APK uploaded${NC}"
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
echo "⚠️  IMPORTANT: Backend version has been updated to 1.0.4"
echo "   You need to rebuild and redeploy backend:"
echo "   cd backend && npm run build"
echo "   Then redeploy via GitHub Actions or manually"
echo ""

