#!/bin/bash

# ============================================
# Check Production Logs Script
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
VPS_USER="${VPS_USER:-root}"

echo -e "${BLUE}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Check Production Backend Logs                      ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════╝${NC}"
echo ""

# Show menu
echo -e "${YELLOW}Select action:${NC}"
echo "1) View last 50 lines of logs"
echo "2) View last 100 lines of logs"
echo "3) View last 200 lines of logs"
echo "4) Follow logs in real-time (Ctrl+C to exit)"
echo "5) Search for errors in logs"
echo "6) Search for order creation logs"
echo "7) Check PM2 status"
echo "8) Restart backend"
echo ""

read -p "Enter choice [1-8]: " choice

case $choice in
  1)
    echo -e "${BLUE}Showing last 50 lines...${NC}"
    ssh ${VPS_USER}@${VPS_HOST} "cd /root/coffe/backend && tail -n 50 server.log"
    ;;
  2)
    echo -e "${BLUE}Showing last 100 lines...${NC}"
    ssh ${VPS_USER}@${VPS_HOST} "cd /root/coffe/backend && tail -n 100 server.log"
    ;;
  3)
    echo -e "${BLUE}Showing last 200 lines...${NC}"
    ssh ${VPS_USER}@${VPS_HOST} "cd /root/coffe/backend && tail -n 200 server.log"
    ;;
  4)
    echo -e "${YELLOW}Following logs in real-time (press Ctrl+C to exit)...${NC}"
    ssh ${VPS_USER}@${VPS_HOST} "cd /root/coffe/backend && tail -f server.log"
    ;;
  5)
    echo -e "${BLUE}Searching for errors...${NC}"
    ssh ${VPS_USER}@${VPS_HOST} "cd /root/coffe/backend && tail -n 500 server.log | grep -i error -A 5"
    ;;
  6)
    echo -e "${BLUE}Searching for order creation logs...${NC}"
    ssh ${VPS_USER}@${VPS_HOST} "cd /root/coffe/backend && tail -n 500 server.log | grep -i 'order\|📝\|🔨\|📎' | tail -100"
    ;;
  7)
    echo -e "${BLUE}PM2 Status:${NC}"
    ssh ${VPS_USER}@${VPS_HOST} "pm2 status"
    echo ""
    echo -e "${BLUE}PM2 Logs:${NC}"
    ssh ${VPS_USER}@${VPS_HOST} "pm2 logs --lines 50 --nostream"
    ;;
  8)
    echo -e "${YELLOW}Restarting backend...${NC}"
    ssh ${VPS_USER}@${VPS_HOST} << 'ENDSSH'
cd /root/coffe/backend
if command -v pm2 &> /dev/null; then
    echo "Restarting with PM2..."
    pm2 restart coffee-backend
else
    echo "Restarting with npm..."
    pkill -f "node.*dist/main" || true
    npm run start:prod &
fi
echo "Backend restarted"
ENDSSH
    echo -e "${GREEN}✅ Backend restarted${NC}"
    ;;
  *)
    echo -e "${RED}Invalid choice${NC}"
    exit 1
    ;;
esac
