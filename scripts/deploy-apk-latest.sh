#!/bin/bash

# ============================================
# Deploy latest Android APK to production server
# ============================================

set -e

# Styling
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
VPS_HOST="192.144.12.102"
VPS_USER="user1"
PROJECT_DIR="~/coffe"
LOCAL_APK_PATH="backend/app-debug.apk"
REMOTE_APK_PATH="${PROJECT_DIR}/app-debug.apk"
DOCKER_COMPOSE_FILE="docker-compose.fallback.yml"
CONTAINER_NAME="coffee_backend_fallback"

print_step() {
  echo -e "${YELLOW}[${1}] ${2}${NC}"
}

print_ok() {
  echo -e "${GREEN}✅ ${1}${NC}"
}

print_error() {
  echo -e "${RED}❌ ${1}${NC}"
}

echo -e "${BLUE}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Deploy latest APK                                    ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════╝${NC}"
echo ""

# 0. Validate local APK
print_step "0/5" "Checking local APK..."
if [ ! -f "$LOCAL_APK_PATH" ]; then
  print_error "Local APK not found at $LOCAL_APK_PATH"
  echo "Run the build first: npm run build:android && (cd android && ./gradlew assembleDebug)"
  exit 1
fi
print_ok "Local APK found ($(ls -lh $LOCAL_APK_PATH | awk '{print $5}'))"

aapt_cmd=$(command -v aapt || true)
if [ -n "$aapt_cmd" ]; then
  package_info=$($aapt_cmd dump badging "$LOCAL_APK_PATH" 2>/dev/null | grep -E "package:" || true)
  if [ -n "$package_info" ]; then
    echo "APK info: $package_info"
  fi
fi

echo ""

# Helper to execute SSH commands
ssh_exec() {
  ssh -o StrictHostKeyChecking=no -o ServerAliveInterval=60 -o ServerAliveCountMax=3 -o ConnectTimeout=30 "${VPS_USER}@${VPS_HOST}" "$@"
}

# 1. Ensure SSH connectivity
print_step "1/5" "Testing SSH connection..."
if ! ssh_exec "echo OK" &>/dev/null; then
  print_error "SSH connection failed"
  exit 1
fi
print_ok "SSH connection established"

echo ""

# 2. Prepare remote path (remove old file or directory)
print_step "2/5" "Preparing remote path..."
ssh_exec "cd ${PROJECT_DIR} && \
  if [ -f app-debug.apk ]; then \
    timestamp=\$(date +%Y%m%d%H%M%S); \
    mkdir -p apk-backups; \
    mv app-debug.apk apk-backups/app-debug-\${timestamp}.apk; \
  fi; \
  if [ -d app-debug.apk ]; then \
    rm -rf app-debug.apk; \
  fi"
print_ok "Remote path prepared"

echo ""

# Disk space check
AVAILABLE_SPACE=$(ssh_exec "df --output=avail -k ${PROJECT_DIR} | tail -n 1" | tr -d ' \r')
AVAILABLE_SPACE=${AVAILABLE_SPACE:-0}
REQUIRED_SPACE=$((10 * 1024))
if [ "${AVAILABLE_SPACE}" -lt "${REQUIRED_SPACE}" ]; then
  print_error "Not enough space on server (available: ${AVAILABLE_SPACE} KB). Free up disk space before deploying."
  exit 1
fi

# 3. Upload new APK
print_step "3/5" "Uploading APK to server..."
scp -o StrictHostKeyChecking=no "$LOCAL_APK_PATH" "${VPS_USER}@${VPS_HOST}:${REMOTE_APK_PATH}"
print_ok "APK uploaded"

echo ""

# 4. Restart backend container
print_step "4/5" "Restarting backend container..."
ssh_exec "cd ${PROJECT_DIR} && docker stop ${CONTAINER_NAME} || true && docker rm ${CONTAINER_NAME} || true && docker compose -f ${DOCKER_COMPOSE_FILE} up -d backend"
print_ok "Backend container restarted"

echo ""

# 5. Verify deployment
print_step "5/5" "Verifying deployment..."
sleep 3

HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://${VPS_HOST}:3001/app-debug.apk || echo "000")
if [ "$HTTP_STATUS" != "200" ]; then
  print_error "APK endpoint returned status $HTTP_STATUS"
  echo "Check logs: ssh ${VPS_USER}@${VPS_HOST} 'docker logs ${CONTAINER_NAME} | tail -n 50'"
  exit 1
fi

ssh_exec "ls -lh ${REMOTE_APK_PATH}"
print_ok "APK endpoint responds with 200"

echo ""
echo -e "${BLUE}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Deployment complete                                  ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════╝${NC}"
echo ""
echo "Download URL: http://${VPS_HOST}:3001/app-debug.apk"
echo "Version API:   http://${VPS_HOST}:3001/api/app/version"
echo ""
