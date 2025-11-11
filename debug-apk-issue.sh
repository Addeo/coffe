#!/bin/bash

# ============================================
# Debug APK File Issue
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

echo -e "${BLUE}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Debug APK File Issue                               ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════╝${NC}"
echo ""

# Function to execute SSH commands
execute_ssh() {
  ssh -o StrictHostKeyChecking=no -o ServerAliveInterval=60 -o ServerAliveCountMax=3 -o ConnectTimeout=30 -o TCPKeepAlive=yes "${VPS_USER}@${VPS_HOST}" "$@"
}

# 1. Check if APK file exists on server
echo -e "${YELLOW}[1/4] Checking APK file on server...${NC}"
execute_ssh "ls -lah ${PROJECT_DIR}/app-debug.apk 2>/dev/null || echo 'APK file not found'"
echo ""

# 2. Check if file exists in container
echo -e "${YELLOW}[2/4] Checking APK file in backend container...${NC}"
execute_ssh "docker exec coffee_backend_fallback ls -lah /app/app-debug.apk 2>/dev/null || echo 'APK file not found in container'"
echo ""

# 3. Check backend logs for APK path
echo -e "${YELLOW}[3/4] Checking backend logs for APK path...${NC}"
execute_ssh "docker logs coffee_backend_fallback 2>&1 | grep -i 'apk\|file path' | tail -10 || echo 'No APK logs found'"
echo ""

# 4. Test direct file access in container
echo -e "${YELLOW}[4/4] Testing file access in container...${NC}"
execute_ssh "docker exec coffee_backend_fallback test -f /app/app-debug.apk && echo '✅ File exists' || echo '❌ File does not exist'"
execute_ssh "docker exec coffee_backend_fallback cat /app/app-debug.apk > /dev/null 2>&1 && echo '✅ File is readable' || echo '❌ File is not readable'"
echo ""

echo -e "${BLUE}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Next Steps                                         ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════╝${NC}"
echo ""
echo "If APK file is missing:"
echo "  1. Upload APK: ./setup-apk-serving.sh"
echo "  2. Restart backend: docker compose restart backend"
echo ""
echo "If file exists but not accessible:"
echo "  1. Check volume mount in docker-compose.fallback.yml"
echo "  2. Check backend logs for errors"
echo ""

