#!/bin/bash

# Enhanced deployment script with cleanup and permission fixes
echo "🚀 Starting enhanced deployment with cleanup..."

# Build the project first
echo "🔨 Building frontend..."
cd frontend
npm run build
cd ..

echo "🔨 Building backend..."
cd backend
npm run build
cd ..

# Create deployment package
echo "📦 Creating deployment package..."
tar -czf deploy-latest.tar.gz \
  --exclude='node_modules' \
  --exclude='.git' \
  --exclude='*.log' \
  --exclude='dist' \
  --exclude='.tmp-deploy' \
  frontend/dist \
  backend/dist \
  backend/package.json \
  backend/package-lock.json \
  backend/tsconfig.json \
  backend/nest-cli.json \
  shared/ \
  docker-compose.prod.yml \
  docker-compose.fallback.yml

echo "📤 Uploading and deploying..."

# Deploy with cleanup
ssh -o StrictHostKeyChecking=no ***@*** << 'EOF'

echo "📁 Preparing deployment directory..."
cd /root/coffee-admin

# Stop services
echo "🛑 Stopping services..."
pm2 stop coffee-admin-backend || true
pm2 delete coffee-admin-backend || true

# Clean up existing files
echo "🗑️ Cleaning up existing files..."
rm -rf backend/
rm -rf frontend/dist/

# Create directories
mkdir -p backend
mkdir -p frontend/dist

# Extract new deployment (force overwrite, don't preserve owners/permissions)
echo "📦 Extracting new deployment..."
# Relax permissions on target to avoid conflicts
chown -R root:root . || true
chmod -R u+rwX . || true
tar -xzf deploy-latest.tar.gz --overwrite --no-same-owner --no-same-permissions

# Set proper permissions
echo "🔐 Setting permissions..."
chmod -R 755 backend/ frontend/dist/
chown -R root:root backend/ frontend/dist/

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd backend
npm install --production --silent

# Start backend service
echo "🚀 Starting backend service..."
pm2 start dist/main.js --name coffee-admin-backend
pm2 save

# Restart nginx
echo "🔄 Restarting nginx..."
systemctl reload nginx

# Check status
echo "✅ Checking deployment status..."
pm2 status
echo "🌐 Backend URL: http://$(curl -s ifconfig.me):3000"
echo "🎉 Deployment completed successfully!"

EOF

echo "✅ Enhanced deployment completed!"
