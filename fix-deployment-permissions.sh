#!/bin/bash

# Fix deployment permissions and clean up conflicts
echo "🔧 Fixing deployment permissions and cleaning up conflicts..."

# Connect to the server and fix permissions
ssh -o StrictHostKeyChecking=no ***@*** << 'EOF'

echo "📁 Cleaning up existing backend files..."
cd /root/coffee-admin

# Stop the backend service first
echo "🛑 Stopping backend service..."
pm2 stop coffee-admin-backend || true
pm2 delete coffee-admin-backend || true

# Remove the entire backend directory to avoid conflicts
echo "🗑️ Removing existing backend directory..."
rm -rf backend/

# Create fresh backend directory
echo "📁 Creating fresh backend directory..."
mkdir -p backend
chmod 755 backend

# Extract the new deployment (force overwrite, avoid preserving owners/permissions)
echo "📦 Extracting new deployment..."
cd /root/coffee-admin
chown -R root:root . || true
chmod -R u+rwX . || true
tar -xzf deploy-latest.tar.gz --overwrite --no-same-owner --no-same-permissions

# Set proper permissions
echo "🔐 Setting proper permissions..."
chmod -R 755 backend/
chown -R root:root backend/

# Install dependencies
echo "📦 Installing backend dependencies..."
cd backend
npm install --production

# Start the backend service
echo "🚀 Starting backend service..."
pm2 start dist/main.js --name coffee-admin-backend
pm2 save

# Check service status
echo "✅ Checking service status..."
pm2 status

echo "🎉 Deployment completed successfully!"

EOF

echo "✅ Permission fix and deployment completed!"
