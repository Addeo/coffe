#!/bin/bash

# Quick deployment script for order creation fix

set -e  # Exit on error

echo "=========================================="
echo "Quick Fix Deployment for Order Creation"
echo "=========================================="
echo ""

VPS_HOST="192.144.12.102"
VPS_USER="root"
VPS_PATH="/root/backend"

# Step 1: Build backend
echo "1. Building backend..."
cd "$(dirname "$0")/backend"
npm run build
echo "   ✅ Backend built successfully"
echo ""

# Step 2: Create deployment package
echo "2. Creating deployment package..."
cd ..
tar -czf backend-fix.tar.gz \
  backend/dist \
  backend/package.json \
  backend/src
echo "   ✅ Package created"
echo ""

# Step 3: Copy to VPS
echo "3. Copying files to VPS..."
scp backend-fix.tar.gz ${VPS_USER}@${VPS_HOST}:/tmp/
echo "   ✅ Files copied"
echo ""

# Step 4: Deploy on VPS
echo "4. Deploying on VPS..."
ssh ${VPS_USER}@${VPS_HOST} << 'ENDSSH'
  cd /root/backend
  
  # Backup current version
  if [ -d "dist" ]; then
    echo "   📦 Creating backup..."
    tar -czf backup-$(date +%Y%m%d-%H%M%S).tar.gz dist src
  fi
  
  # Extract new version
  echo "   📦 Extracting new files..."
  tar -xzf /tmp/backend-fix.tar.gz
  mv backend/* .
  rmdir backend
  rm /tmp/backend-fix.tar.gz
  
  # Install dependencies
  echo "   📦 Installing dependencies..."
  npm install --production
  
  # Restart application
  echo "   🔄 Restarting application..."
  if command -v pm2 > /dev/null; then
    pm2 restart coffee-backend || pm2 start dist/main.js --name coffee-backend
  elif command -v docker > /dev/null; then
    docker restart coffe-backend-1 || docker-compose restart backend
  else
    echo "   ⚠️  Could not find pm2 or docker. Please restart manually."
  fi
  
  echo "   ✅ Deployment complete!"
ENDSSH

echo ""
echo "=========================================="
echo "Deployment Complete!"
echo "=========================================="
echo ""

# Step 5: Verify deployment
echo "5. Verifying deployment..."
sleep 3  # Give server time to restart
./diagnose-order-creation.sh

# Cleanup
rm -f backend-fix.tar.gz

echo ""
echo "=========================================="
echo "Done!"
echo "=========================================="

