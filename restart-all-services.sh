#!/bin/bash

# ============================================
# Restart All Services on VPS
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
echo -e "${BLUE}║  Restart All Services                               ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════╝${NC}"
echo ""

# Function to execute SSH commands
execute_ssh() {
  ssh -o StrictHostKeyChecking=no -o ServerAliveInterval=60 -o ServerAliveCountMax=3 -o ConnectTimeout=30 -o TCPKeepAlive=yes "${VPS_USER}@${VPS_HOST}" "$@"
}

# Check SSH connection
echo -e "${YELLOW}Testing SSH connection...${NC}"
if ! execute_ssh "echo 'OK'" &>/dev/null; then
  echo -e "${RED}❌ SSH connection failed${NC}"
  exit 1
fi
echo -e "${GREEN}✅ Connected${NC}"
echo ""

# Check current status
echo -e "${YELLOW}[1/5] Checking current status...${NC}"
execute_ssh "cd ${PROJECT_DIR} 2>/dev/null && docker compose -f ${COMPOSE_FILE} ps 2>/dev/null || docker-compose -f ${COMPOSE_FILE} ps 2>/dev/null || echo 'No containers running'"
echo ""

# Start services
echo -e "${YELLOW}[2/5] Starting services...${NC}"
execute_ssh "cd ${PROJECT_DIR} && docker compose -f ${COMPOSE_FILE} up -d 2>/dev/null || docker-compose -f ${COMPOSE_FILE} up -d 2>/dev/null || echo 'Error starting services'"
echo ""

# Wait for services to start
echo -e "${YELLOW}[3/5] Waiting for services to start (30 seconds)...${NC}"
sleep 30
echo ""

# Check status
echo -e "${YELLOW}[4/5] Checking services status...${NC}"
execute_ssh "cd ${PROJECT_DIR} && docker compose -f ${COMPOSE_FILE} ps 2>/dev/null || docker-compose -f ${COMPOSE_FILE} ps 2>/dev/null || docker ps --filter 'name=coffee' --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'"
echo ""

# Check health
echo -e "${YELLOW}[5/5] Checking health...${NC}"
sleep 10

BACKEND_STATUS=$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 "http://${VPS_HOST}:3001/api/health" 2>/dev/null || echo "failed")
FRONTEND_STATUS=$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 "http://${VPS_HOST}:4000" 2>/dev/null || echo "failed")

echo ""
if [ "$BACKEND_STATUS" = "200" ]; then
  echo -e "${GREEN}✅ Backend: OK (HTTP $BACKEND_STATUS)${NC}"
else
  echo -e "${RED}❌ Backend: Failed (HTTP $BACKEND_STATUS)${NC}"
  echo "Check logs: docker logs coffee_backend_fallback"
fi

if [ "$FRONTEND_STATUS" = "200" ] || [ "$FRONTEND_STATUS" = "304" ]; then
  echo -e "${GREEN}✅ Frontend: OK (HTTP $FRONTEND_STATUS)${NC}"
else
  echo -e "${RED}❌ Frontend: Failed (HTTP $FRONTEND_STATUS)${NC}"
  echo "Check logs: docker logs coffee_frontend_fallback"
fi
echo ""

echo -e "${BLUE}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Services Status                                    ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════╝${NC}"
echo ""
echo "Frontend: http://${VPS_HOST}:4000"
echo "Backend: http://${VPS_HOST}:3001/api"
echo ""
echo "If services still not working:"
echo "  1. Check logs: ./check-docker-logs.sh"
echo "  2. Restart manually via SSH"
echo ""

