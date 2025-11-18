#!/bin/bash

# ============================================
# Check Services Status on VPS
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
VPS_USER="user1"
PROJECT_DIR="~/coffe"
COMPOSE_FILE="docker-compose.fallback.yml"

echo -e "${BLUE}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Check Services Status                             ║${NC}"
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

# Check Docker containers
echo -e "${YELLOW}[2/6] Checking Docker containers...${NC}"
execute_ssh "cd ${PROJECT_DIR} 2>/dev/null && docker compose -f ${COMPOSE_FILE} ps 2>/dev/null || docker-compose -f ${COMPOSE_FILE} ps 2>/dev/null || docker ps --filter 'name=coffee' --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'"
echo ""

# Check backend logs (last 30 lines)
echo -e "${YELLOW}[3/6] Checking backend logs (last 30 lines)...${NC}"
execute_ssh "docker logs --tail=30 coffee_backend_fallback 2>/dev/null || echo 'Backend container not found'"
echo ""

# Check frontend logs (last 20 lines)
echo -e "${YELLOW}[4/6] Checking frontend logs (last 20 lines)...${NC}"
execute_ssh "docker logs --tail=20 coffee_frontend_fallback 2>/dev/null || echo 'Frontend container not found'"
echo ""

# Check backend health
echo -e "${YELLOW}[5/6] Checking backend health...${NC}"
BACKEND_STATUS=$(curl -s -o /dev/null -w '%{http_code}' --max-time 5 "http://${VPS_HOST}:3001/api/health" 2>/dev/null || echo "failed")
if [ "$BACKEND_STATUS" = "200" ]; then
  echo -e "${GREEN}✅ Backend is healthy (HTTP $BACKEND_STATUS)${NC}"
else
  echo -e "${RED}❌ Backend is not responding (HTTP $BACKEND_STATUS)${NC}"
fi
echo ""

# Check frontend accessibility
echo -e "${YELLOW}[6/6] Checking frontend accessibility...${NC}"
FRONTEND_STATUS=$(curl -s -o /dev/null -w '%{http_code}' --max-time 5 "http://${VPS_HOST}:4000" 2>/dev/null || echo "failed")
if [ "$FRONTEND_STATUS" = "200" ] || [ "$FRONTEND_STATUS" = "304" ]; then
  echo -e "${GREEN}✅ Frontend is accessible (HTTP $FRONTEND_STATUS)${NC}"
else
  echo -e "${RED}❌ Frontend is not accessible (HTTP $FRONTEND_STATUS)${NC}"
fi
echo ""

# Summary
echo -e "${BLUE}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Summary                                             ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════╝${NC}"
echo ""
echo "Frontend URL: http://${VPS_HOST}:4000"
echo "Backend URL: http://${VPS_HOST}:3001/api"
echo ""
echo "If services are down, try:"
echo "  ssh ${VPS_USER}@${VPS_HOST}"
echo "  cd ${PROJECT_DIR}"
echo "  docker compose -f ${COMPOSE_FILE} restart"
echo ""

