#!/bin/bash

# ============================================
# Check Production APK Status
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

echo -e "${BLUE}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Production APK Status Check                        ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════╝${NC}"
echo ""

# Function to execute SSH commands
execute_ssh() {
  ssh -o StrictHostKeyChecking=no -o ServerAliveInterval=60 -o ServerAliveCountMax=3 -o ConnectTimeout=30 -o TCPKeepAlive=yes "${VPS_USER}@${VPS_HOST}" "$@"
}

# Check SSH connection
echo -e "${YELLOW}[1/6] Testing SSH connection...${NC}"
if ! execute_ssh "echo 'OK'" &>/dev/null; then
  echo -e "${RED}❌ SSH connection failed${NC}"
  exit 1
fi
echo -e "${GREEN}✅ Connected${NC}"
echo ""

# Check if container is running
echo -e "${YELLOW}[2/6] Checking backend container status...${NC}"
CONTAINER_STATUS=$(execute_ssh "docker ps --filter name=${CONTAINER_NAME} --format '{{.Status}}' 2>/dev/null || echo 'not running'")
if [[ "$CONTAINER_STATUS" == "not running" ]] || [[ -z "$CONTAINER_STATUS" ]]; then
  echo -e "${RED}❌ Container ${CONTAINER_NAME} is not running${NC}"
  echo "Status: $CONTAINER_STATUS"
else
  echo -e "${GREEN}✅ Container is running${NC}"
  echo "Status: $CONTAINER_STATUS"
fi
echo ""

# Check APK file on host
echo -e "${YELLOW}[3/6] Checking APK file on host server...${NC}"
APK_INFO=$(execute_ssh "cd ${PROJECT_DIR} && ls -lh app-debug.apk 2>&1 || echo 'NOT_FOUND'")
if [[ "$APK_INFO" == *"NOT_FOUND"* ]]; then
  echo -e "${RED}❌ APK file not found on host${NC}"
  echo "Path: ${PROJECT_DIR}/app-debug.apk"
elif [[ "$APK_INFO" == *"total"* ]] || [[ "$APK_INFO" == *"d"* ]]; then
  echo -e "${RED}❌ app-debug.apk is a DIRECTORY, not a file!${NC}"
  echo "$APK_INFO"
  echo ""
  echo -e "${YELLOW}⚠️  This is the problem! Need to remove directory and upload file.${NC}"
else
  echo -e "${GREEN}✅ APK file found on host${NC}"
  echo "$APK_INFO"
fi
echo ""

# Check APK file inside container
echo -e "${YELLOW}[4/6] Checking APK file inside container...${NC}"
CONTAINER_APK=$(execute_ssh "docker exec ${CONTAINER_NAME} ls -lh /app/app-debug.apk 2>&1 || echo 'NOT_FOUND'")
if [[ "$CONTAINER_APK" == *"NOT_FOUND"* ]] || [[ "$CONTAINER_APK" == *"No such file"* ]]; then
  echo -e "${RED}❌ APK file not found inside container${NC}"
  echo "Path: /app/app-debug.apk"
elif [[ "$CONTAINER_APK" == *"total"* ]] || [[ "$CONTAINER_APK" == *"d"* ]]; then
  echo -e "${RED}❌ /app/app-debug.apk is a DIRECTORY inside container!${NC}"
  echo "$CONTAINER_APK"
else
  echo -e "${GREEN}✅ APK file found inside container${NC}"
  echo "$CONTAINER_APK"
fi
echo ""

# Check APK_PATH environment variable
echo -e "${YELLOW}[5/6] Checking APK_PATH environment variable...${NC}"
APK_PATH_ENV=$(execute_ssh "docker exec ${CONTAINER_NAME} printenv APK_PATH 2>&1 || echo 'NOT_SET'")
if [[ "$APK_PATH_ENV" == "NOT_SET" ]] || [[ -z "$APK_PATH_ENV" ]]; then
  echo -e "${YELLOW}⚠️  APK_PATH not set in container${NC}"
  echo "Using default path: /app/app-debug.apk"
else
  echo -e "${GREEN}✅ APK_PATH is set${NC}"
  echo "APK_PATH=$APK_PATH_ENV"
fi
echo ""

# Check backend logs for APK path
echo -e "${YELLOW}[6/6] Checking backend logs for APK path...${NC}"
APK_LOG=$(execute_ssh "docker logs ${CONTAINER_NAME} 2>&1 | grep -i 'APK file path' | tail -1 || echo 'NOT_FOUND'")
if [[ "$APK_LOG" == "NOT_FOUND" ]]; then
  echo -e "${YELLOW}⚠️  APK path not found in logs${NC}"
else
  echo -e "${GREEN}✅ Found in logs:${NC}"
  echo "$APK_LOG"
fi
echo ""

# Test HTTP endpoint
echo -e "${YELLOW}[BONUS] Testing HTTP endpoint...${NC}"
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://${VPS_HOST}:3001/app-debug.apk 2>&1 || echo "ERROR")
if [[ "$HTTP_STATUS" == "200" ]]; then
  echo -e "${GREEN}✅ HTTP endpoint works (200 OK)${NC}"
elif [[ "$HTTP_STATUS" == "404" ]]; then
  echo -e "${RED}❌ HTTP endpoint returns 404 (Not Found)${NC}"
elif [[ "$HTTP_STATUS" == "500" ]]; then
  echo -e "${RED}❌ HTTP endpoint returns 500 (Server Error)${NC}"
  HTTP_ERROR=$(curl -s http://${VPS_HOST}:3001/app-debug.apk 2>&1 | head -3)
  echo "Error: $HTTP_ERROR"
else
  echo -e "${YELLOW}⚠️  HTTP endpoint status: $HTTP_STATUS${NC}"
fi
echo ""

# Summary
echo -e "${BLUE}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Summary & Recommendations                          ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════╝${NC}"
echo ""

if [[ "$APK_INFO" == *"d"* ]] || [[ "$CONTAINER_APK" == *"d"* ]]; then
  echo -e "${RED}❌ PROBLEM FOUND: app-debug.apk is a directory!${NC}"
  echo ""
  echo "To fix:"
  echo "1. Remove directory on host:"
  echo "   ssh ${VPS_USER}@${VPS_HOST}"
  echo "   cd ${PROJECT_DIR}"
  echo "   rm -rf app-debug.apk"
  echo ""
  echo "2. Upload APK file:"
  echo "   ./setup-apk-serving.sh"
  echo ""
  echo "3. Restart backend:"
  echo "   docker compose -f docker-compose.fallback.yml restart backend"
elif [[ "$APK_INFO" == *"NOT_FOUND"* ]]; then
  echo -e "${RED}❌ PROBLEM FOUND: APK file not found on host!${NC}"
  echo ""
  echo "To fix:"
  echo "   ./setup-apk-serving.sh"
elif [[ "$HTTP_STATUS" != "200" ]]; then
  echo -e "${YELLOW}⚠️  HTTP endpoint is not working properly${NC}"
  echo ""
  echo "Check:"
  echo "1. Container logs: docker logs ${CONTAINER_NAME}"
  echo "2. APK file exists and is a file (not directory)"
  echo "3. Volume mount in docker-compose.fallback.yml"
else
  echo -e "${GREEN}✅ Everything looks good!${NC}"
fi
echo ""

