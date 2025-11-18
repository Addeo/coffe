#!/bin/bash

# ============================================
# Setup APK File Serving on Server
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
PROJECT_DIR="~/coffe"
APK_LOCAL="./apk-builds/app-debug-1.0.2.apk"
APK_REMOTE="${PROJECT_DIR}/app-debug.apk"
BACKEND_MAIN="backend/src/main.ts"

echo -e "${BLUE}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Setup APK File Serving                             ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════╝${NC}"
echo ""

# Function to execute SSH commands
execute_ssh() {
  ssh -o StrictHostKeyChecking=no -o ServerAliveInterval=60 -o ServerAliveCountMax=3 -o ConnectTimeout=30 -o TCPKeepAlive=yes "${VPS_USER}@${VPS_HOST}" "$@"
}

# Check SSH connection
echo -e "${YELLOW}[1/5] Testing SSH connection...${NC}"
if ! execute_ssh "echo 'OK'" &>/dev/null; then
  echo -e "${RED}❌ SSH connection failed${NC}"
  exit 1
fi
echo -e "${GREEN}✅ Connected${NC}"
echo ""

# Check if APK exists locally
echo -e "${YELLOW}[2/5] Checking local APK file...${NC}"
if [ ! -f "$APK_LOCAL" ]; then
  echo -e "${RED}❌ Local APK not found: $APK_LOCAL${NC}"
  echo "Please build APK first: ./build-both-versions.sh"
  exit 1
fi
echo -e "${GREEN}✅ Local APK found: $APK_LOCAL${NC}"
ls -lh "$APK_LOCAL"
echo ""

# Upload APK to server
echo -e "${YELLOW}[3/5] Uploading APK to server...${NC}"

# Remove directory if it exists (sometimes app-debug.apk is a directory)
execute_ssh "cd ${PROJECT_DIR} && rm -rf app-debug.apk 2>/dev/null || true"

# Upload directly to project root directory
scp -o StrictHostKeyChecking=no "$APK_LOCAL" "${VPS_USER}@${VPS_HOST}:${PROJECT_DIR}/app-debug.apk"
echo -e "${GREEN}✅ APK uploaded to ${PROJECT_DIR}/app-debug.apk${NC}"
echo ""

# Verify APK on server
echo -e "${YELLOW}[4/5] Verifying APK on server...${NC}"
execute_ssh "ls -lh ${APK_REMOTE}"
echo ""

# Check if backend serves static files
echo -e "${YELLOW}[5/5] Checking backend static files configuration...${NC}"
if grep -q "app-debug.apk\|static\|express.static" "$BACKEND_MAIN" 2>/dev/null; then
  echo -e "${GREEN}✅ Static files configuration found${NC}"
else
  echo -e "${YELLOW}⚠️  Need to configure static files serving${NC}"
  echo "Checking current main.ts..."
  grep -A 5 -B 5 "app.use\|express.static" "$BACKEND_MAIN" || echo "No static files configuration found"
fi
echo ""

echo -e "${BLUE}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Next Steps                                         ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════╝${NC}"
echo ""
echo "1. ✅ APK uploaded to: ${APK_REMOTE}"
echo ""
echo "2. Restart backend container to mount APK:"
echo "   ssh ${VPS_USER}@${VPS_HOST}"
echo "   cd ${PROJECT_DIR}"
echo "   docker compose -f docker-compose.fallback.yml restart backend"
echo ""
echo "3. Or rebuild and restart (if needed):"
echo "   docker compose -f docker-compose.fallback.yml up -d --build backend"
echo ""
echo "4. Test: curl http://${VPS_HOST}:3001/app-debug.apk"
echo ""
echo "5. Check backend logs for APK path:"
echo "   docker logs coffee_backend_fallback | grep 'APK file path'"
echo ""

