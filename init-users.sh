#!/bin/bash

# ============================================
# Initialize Users After Database Cleanup
# ============================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
VPS_HOST="192.144.12.102"
BACKEND_URL="http://${VPS_HOST}:3001/api"

echo -e "${BLUE}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Initialize Default Users                           ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════╝${NC}"
echo ""

# Check backend health
echo -e "${YELLOW}[1/3] Checking backend health...${NC}"
HEALTH_RESPONSE=$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 "${BACKEND_URL}/health" 2>/dev/null || echo "failed")

if [ "$HEALTH_RESPONSE" != "200" ]; then
  echo -e "${RED}❌ Backend is not available (HTTP ${HEALTH_RESPONSE})${NC}"
  echo "Please check if backend is running:"
  echo "  ssh user1@${VPS_HOST}"
  echo "  cd ~/coffe && docker compose -f docker-compose.fallback.yml ps"
  exit 1
fi
echo -e "${GREEN}✅ Backend is healthy${NC}"
echo ""

# Initialize users
echo -e "${YELLOW}[2/3] Initializing default users...${NC}"
INIT_RESPONSE=$(curl -s --max-time 30 "${BACKEND_URL}/auth/init-admin" 2>/dev/null || echo "failed")

if [ "$INIT_RESPONSE" = "failed" ]; then
  echo -e "${RED}❌ Failed to initialize users${NC}"
  echo "Backend might not be ready. Wait a few seconds and try again."
  exit 1
fi

# Parse response (basic check)
if echo "$INIT_RESPONSE" | grep -q "success"; then
  echo -e "${GREEN}✅ Users initialized successfully${NC}"
else
  echo -e "${YELLOW}⚠️  Response:${NC}"
  echo "$INIT_RESPONSE" | head -20
fi
echo ""

# Show user credentials
echo -e "${BLUE}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Default User Credentials                            ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}Admin:${NC}"
echo "  Email: admin@coffee.com"
echo "  Password: admin123"
echo ""
echo -e "${GREEN}Manager:${NC}"
echo "  Email: manager@coffee.com"
echo "  Password: manager123"
echo ""
echo -e "${GREEN}Engineer:${NC}"
echo "  Email: engineer@coffee.com"
echo "  Password: engineer123"
echo ""
echo -e "${YELLOW}⚠️  Important:${NC}"
echo "  - Use these passwords, NOT the email as password"
echo "  - Change passwords after first login"
echo ""

# Test login
echo -e "${YELLOW}[3/3] Testing engineer login...${NC}"
LOGIN_RESPONSE=$(curl -s -X POST "${BACKEND_URL}/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"engineer@coffee.com","password":"engineer123"}' \
  --max-time 10 2>/dev/null || echo "failed")

if echo "$LOGIN_RESPONSE" | grep -q "access_token"; then
  echo -e "${GREEN}✅ Login successful! Users are ready${NC}"
else
  echo -e "${YELLOW}⚠️  Login test failed. Response:${NC}"
  echo "$LOGIN_RESPONSE" | head -5
  echo ""
  echo "Try logging in manually:"
  echo "  curl -X POST '${BACKEND_URL}/auth/login' \\"
  echo "    -H 'Content-Type: application/json' \\"
  echo "    -d '{\"email\":\"engineer@coffee.com\",\"password\":\"engineer123\"}'"
fi
echo ""

echo -e "${GREEN}✅ Initialization complete${NC}"
echo ""
echo "Frontend URL: http://${VPS_HOST}:4000"
echo ""

