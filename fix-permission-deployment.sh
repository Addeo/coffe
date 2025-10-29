#!/bin/bash

# Fix permission issues during deployment
echo "🔧 Fixing deployment permission issues..."

# Replace *** with your actual server details
VPS_HOST="192.144.12.102"  # Replace with your actual IP
VPS_USER="root"             # Replace with your actual username

echo "📡 Connecting to server: $VPS_USER@$VPS_HOST"

ssh -o StrictHostKeyChecking=no $VPS_USER@$VPS_HOST << 'EOF'

echo "🚀 Starting deployment with permission fixes..."

# Navigate to the project directory
cd /root/coffee-admin

# Stop all services first
echo "🛑 Stopping all services..."
pm2 stop all || true
pm2 delete all || true

# Kill any remaining processes
pkill -f "node.*dist/main" || true
pkill -f "nginx" || true

# Clean up existing files completely
echo "🗑️ Cleaning up existing files..."
rm -rf backend/
rm -rf frontend/dist/
rm -rf node_modules/

# Create fresh directories
echo "📁 Creating fresh directories..."
mkdir -p backend
mkdir -p frontend/dist
mkdir -p node_modules

# Set proper permissions
echo "🔐 Setting proper permissions..."
chmod -R 755 backend/
chmod -R 755 frontend/
chmod -R 755 node_modules/

# Extract the deployment package
echo "📦 Extracting deployment package..."
if [ -f "deploy-latest.tar.gz" ]; then
    tar -xzf deploy-latest.tar.gz --no-same-owner --no-same-permissions
    echo "✅ Extraction completed"
else
    echo "❌ deploy-latest.tar.gz not found!"
    exit 1
fi

# Set proper ownership and permissions
echo "🔐 Setting ownership and permissions..."
chown -R root:root backend/
chown -R root:root frontend/
chmod -R 755 backend/
chmod -R 755 frontend/

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd backend
npm install --production --silent

# Build backend if needed
echo "🔨 Building backend..."
npm run build

# Start backend service
echo "🚀 Starting backend service..."
pm2 start dist/main.js --name coffee-admin-backend
pm2 save

# Restart nginx
echo "🔄 Restarting nginx..."
systemctl restart nginx

# Check status
echo "✅ Checking deployment status..."
pm2 status

# Get server IP for testing
SERVER_IP=$(curl -s ifconfig.me)
echo "🌐 Backend URL: http://$SERVER_IP:3000"
echo "🌐 Frontend URL: http://$SERVER_IP"

# Test backend health
echo "🏥 Testing backend health..."
sleep 5
if curl -f http://localhost:3000/api/health &> /dev/null; then
    echo "✅ Backend is healthy"
else
    echo "❌ Backend health check failed"
    pm2 logs coffee-admin-backend --lines 20
fi

echo "🎉 Deployment completed successfully!"

EOF

echo "✅ Permission fix deployment completed!"
