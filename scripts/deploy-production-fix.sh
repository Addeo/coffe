#!/bin/bash

# ============================================
# Quick Deploy Production Fix Script
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
VPS_PATH="/root/coffe/backend"
BACKUP_DIR="backups-$(date +%Y%m%d_%H%M%S)"

echo -e "${BLUE}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Deploy Production Fix - Order Creation Fix        ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════╝${NC}"
echo ""

# Step 1: Build backend locally
echo -e "${YELLOW}Step 1: Building backend locally...${NC}"
cd backend
npm run build

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Build failed${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Build successful${NC}"
echo ""

# Step 2: Copy files to production
echo -e "${YELLOW}Step 2: Copying files to production server...${NC}"

# Create backup on production
echo -e "${BLUE}Creating backup on production server...${NC}"
ssh ${VPS_USER}@${VPS_HOST} << ENDSSH
cd ${VPS_PATH}
mkdir -p backups
cp -r dist backups/dist.backup-$(date +%Y%m%d_%H%M%S) || true
cp -r node_modules backups/node_modules.backup-$(date +%Y%m%d_%H%M%S) || true
echo "Backup created"
ENDSSH

# Copy source files
echo -e "${BLUE}Copying source files...${NC}"
rsync -avz --delete \
    --exclude 'node_modules' \
    --exclude 'dist' \
    --exclude '.env' \
    --exclude 'database.sqlite' \
    --exclude 'uploads' \
    ./ ${VPS_USER}@${VPS_HOST}:${VPS_PATH}/

echo -e "${GREEN}✅ Files copied${NC}"
echo ""

# Step 3: Rebuild on production
echo -e "${YELLOW}Step 3: Rebuilding on production server...${NC}"
ssh ${VPS_USER}@${VPS_HOST} << 'ENDSSH'
cd /root/coffe/backend
npm install
npm run build
echo "Build completed"
ENDSSH

echo -e "${GREEN}✅ Build completed on production${NC}"
echo ""

# Step 4: Restart backend
echo -e "${YELLOW}Step 4: Restarting backend service...${NC}"
ssh ${VPS_USER}@${VPS_HOST} << ENDSSH
cd /root/coffe/backend

# Try to restart with PM2
if command -v pm2 &> /dev/null; then
    echo "Restarting with PM2..."
    pm2 restart coffee-backend || npm run start:prod &
else
    echo "Starting with npm..."
    pkill -f "node.*dist/main" || true
    npm run start:prod &
fi

echo "Backend restarted"
ENDSSH

echo -e "${GREEN}✅ Backend restarted${NC}"
echo ""

# Step 5: Verify
echo -e "${YELLOW}Step 5: Verifying deployment...${NC}"
sleep 3

if curl -f http://${VPS_HOST}:3001/api/orders/test &> /dev/null; then
    echo -e "${GREEN}✅ Backend is responding${NC}"
else
    echo -e "${RED}⚠️  Backend might not be responding yet. Check logs.${NC}"
fi

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ Deployment completed!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo "1. Check backend logs: ssh ${VPS_USER}@${VPS_HOST} 'cd /root/coffe/backend && pm2 logs'"
echo "2. Test order creation at: http://${VPS_HOST}:4000"
echo "3. If issues, restore backup:"
echo "   ssh ${VPS_USER}@${VPS_HOST} 'cd /root/coffe/backend && mv backups/dist.backup-* dist'"
