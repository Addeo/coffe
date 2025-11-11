#!/bin/bash

# ============================================
# Fix Production APK (Remove Directory & Upload File)
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
CONTAINER_NAME="coffee_backend_fallback"
APK_LOCAL="./backend/app-debug.apk"

# Check if local APK exists
if [ ! -f "$APK_LOCAL" ]; then
  echo -e "${RED}❌ Local APK not found: $APK_LOCAL${NC}"
  echo "Checking alternative locations..."
  
  # Try other locations
  if [ -f "./app-debug.apk" ]; then
    APK_LOCAL="./app-debug.apk"
    echo -e "${GREEN}✅ Found APK at: $APK_LOCAL${NC}"
  elif [ -f "./apk-builds/app-debug-1.0.6.apk" ]; then
    APK_LOCAL="./apk-builds/app-debug-1.0.6.apk"
    echo -e "${GREEN}✅ Found APK at: $APK_LOCAL${NC}"
  else
    echo -e "${RED}❌ APK file not found in any location${NC}"
    echo "Please ensure APK file exists in one of:"
    echo "  - ./backend/app-debug.apk"
    echo "  - ./app-debug.apk"
    echo "  - ./apk-builds/app-debug-*.apk"
    exit 1
  fi
fi

echo -e "${BLUE}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Fix Production APK                                  ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════╝${NC}"
echo ""

# Function to execute SSH commands
execute_ssh() {
  ssh -o StrictHostKeyChecking=no -o ServerAliveInterval=60 -o ServerAliveCountMax=3 -o ConnectTimeout=30 -o TCPKeepAlive=yes "${VPS_USER}@${VPS_HOST}" "$@"
}

# Step 1: Remove directory on host
echo -e "${YELLOW}[1/4] Removing app-debug.apk directory on host...${NC}"
execute_ssh "cd ${PROJECT_DIR} && rm -rf app-debug.apk && echo 'Directory removed'"
echo -e "${GREEN}✅ Directory removed${NC}"
echo ""

# Step 2: Upload APK file
echo -e "${YELLOW}[2/4] Uploading APK file to server...${NC}"
echo "Local file: $APK_LOCAL ($(ls -lh "$APK_LOCAL" | awk '{print $5}'))"
scp -o StrictHostKeyChecking=no "$APK_LOCAL" "${VPS_USER}@${VPS_HOST}:${PROJECT_DIR}/app-debug.apk"
echo -e "${GREEN}✅ APK uploaded${NC}"
echo ""

# Step 3: Verify file on server
echo -e "${YELLOW}[3/4] Verifying APK file on server...${NC}"
APK_INFO=$(execute_ssh "cd ${PROJECT_DIR} && ls -lh app-debug.apk")
if [[ "$APK_INFO" == *"d"* ]]; then
  echo -e "${RED}❌ Still a directory! Something went wrong.${NC}"
  exit 1
else
  echo -e "${GREEN}✅ File verified${NC}"
  echo "$APK_INFO"
fi
echo ""

# Step 4: Restart backend container
echo -e "${YELLOW}[4/4] Restarting backend container...${NC}"
execute_ssh "cd ${PROJECT_DIR} && docker compose -f docker-compose.fallback.yml restart backend"
echo -e "${GREEN}✅ Container restarted${NC}"
echo ""

# Wait a bit for container to start
echo -e "${YELLOW}Waiting 5 seconds for container to start...${NC}"
sleep 5

# Test endpoint
echo -e "${YELLOW}Testing HTTP endpoint...${NC}"
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://${VPS_HOST}:3001/app-debug.apk 2>&1 || echo "ERROR")
if [[ "$HTTP_STATUS" == "200" ]]; then
  echo -e "${GREEN}✅ HTTP endpoint works! (200 OK)${NC}"
  
  # Get file size from HTTP response
  FILE_SIZE=$(curl -s -I http://${VPS_HOST}:3001/app-debug.apk | grep -i "content-length" | awk '{print $2}' | tr -d '\r')
  echo "File size: $FILE_SIZE bytes"
else
  echo -e "${YELLOW}⚠️  HTTP status: $HTTP_STATUS${NC}"
  if [[ "$HTTP_STATUS" == "500" ]]; then
    HTTP_ERROR=$(curl -s http://${VPS_HOST}:3001/app-debug.apk 2>&1 | head -3)
    echo "Error: $HTTP_ERROR"
  fi
fi
echo ""

echo -e "${BLUE}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Done!                                               ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════╝${NC}"
echo ""
echo "APK should now be available at:"
echo "  http://${VPS_HOST}:3001/app-debug.apk"
echo ""
echo "Check version endpoint:"
echo "  curl http://${VPS_HOST}:3001/api/app/version"
echo ""

