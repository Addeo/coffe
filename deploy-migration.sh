#!/bin/bash

# ============================================
# Deploy Migration to Production VPS
# ============================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}╔═══════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Deploy Work Sessions Migration to Production VPS    ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════╝${NC}"
echo ""

# Load VPS config
if [ -f .env ]; then
    source .env
fi

VPS_HOST="${VPS_HOST:-your-vps-ip}"
VPS_USER="${VPS_USER:-root}"
VPS_PATH="${VPS_PATH:-/root/coffee-admin}"

echo -e "${YELLOW}Target VPS:${NC}"
echo "  Host: $VPS_HOST"
echo "  User: $VPS_USER"
echo "  Path: $VPS_PATH"
echo ""

read -p "Proceed with deployment? (yes/no): " confirm
if [ "$confirm" != "yes" ]; then
    echo "Deployment cancelled."
    exit 0
fi

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}Step 1: Upload migration files to VPS${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Create migrations directory on VPS
ssh $VPS_USER@$VPS_HOST "mkdir -p $VPS_PATH/backend/migrations"

# Upload migration files
scp backend/migrations/001_add_work_sessions_table.sql \
    $VPS_USER@$VPS_HOST:$VPS_PATH/backend/migrations/

scp backend/migrations/002_migrate_existing_order_data_to_sessions.sql \
    $VPS_USER@$VPS_HOST:$VPS_PATH/backend/migrations/

scp backend/migrations/rollback.sql \
    $VPS_USER@$VPS_HOST:$VPS_PATH/backend/migrations/

scp backend/migrations/run-migration.sh \
    $VPS_USER@$VPS_HOST:$VPS_PATH/backend/migrations/

echo -e "${GREEN}✅ Migration files uploaded${NC}"
echo ""

echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}Step 2: Make script executable${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

ssh $VPS_USER@$VPS_HOST "chmod +x $VPS_PATH/backend/migrations/run-migration.sh"

echo -e "${GREEN}✅ Script is executable${NC}"
echo ""

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Step 3: Run migration on VPS${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "Running migration on VPS..."
echo ""

ssh $VPS_USER@$VPS_HOST << 'ENDSSH'
cd $VPS_PATH/backend/migrations
source ../.env
./run-migration.sh
ENDSSH

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}Step 4: Deploy new backend code${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Build backend
echo "Building backend..."
cd backend
npm run build

# Create deployment package
echo "Creating deployment package..."
tar -czf ../backend-deploy.tar.gz \
    dist/ \
    node_modules/ \
    package.json \
    .env

# Upload to VPS
echo "Uploading to VPS..."
scp ../backend-deploy.tar.gz $VPS_USER@$VPS_HOST:$VPS_PATH/

# Extract and restart on VPS
ssh $VPS_USER@$VPS_HOST << 'ENDSSH'
cd $VPS_PATH
tar -xzf backend-deploy.tar.gz -C backend/ --overwrite
cd backend
pm2 restart coffee-backend || npm run start:prod &
ENDSSH

echo -e "${GREEN}✅ Backend deployed and restarted${NC}"
echo ""

echo -e "${BLUE}╔═══════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  ✅ Migration and deployment completed!              ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════╝${NC}"
echo ""
echo "Next steps:"
echo "1. Check backend logs: ssh $VPS_USER@$VPS_HOST 'pm2 logs coffee-backend'"
echo "2. Test in browser: http://your-domain.com"
echo "3. Create test work session"
echo ""

