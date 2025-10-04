#!/bin/bash

# Backend Deployment Script
# Usage: ./deploy-backend.sh [server_ip] [ssh_key_path]

set -e

SERVER_IP=${1:-"your-server-ip"}
SSH_KEY=${2:-"~/.ssh/id_rsa"}
REMOTE_USER=${3:-"root"}

echo "🚀 Starting backend deployment to $SERVER_IP"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "backend/package.json" ]; then
    print_error "Please run this script from the project root directory"
    exit 1
fi

print_status "Building backend for production..."
cd backend
npm run build

print_status "Creating deployment archive..."
cd ..
tar -czf backend-deploy.tar.gz backend/dist backend/package*.json backend/.env.production

print_status "Uploading to server..."
scp -i "$SSH_KEY" backend-deploy.tar.gz "$REMOTE_USER@$SERVER_IP:~/" || {
    print_error "Failed to upload files to server"
    exit 1
}

print_status "Deploying on server..."
ssh -i "$SSH_KEY" "$REMOTE_USER@$SERVER_IP" << 'EOF'
    set -e

    # Install Node.js if not installed
    if ! command -v node &> /dev/null; then
        curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
        sudo apt-get install -y nodejs
    fi

    # Install PM2 if not installed
    if ! command -v pm2 &> /dev/null; then
        sudo npm install -g pm2
    fi

    # Create app directory
    mkdir -p ~/coffee-backend
    cd ~/coffee-backend

    # Extract files
    tar -xzf ~/backend-deploy.tar.gz
    rm ~/backend-deploy.tar.gz

    # Install dependencies
    npm install --production

    # Create uploads directory
    mkdir -p uploads

    # Stop existing app if running
    pm2 stop coffee-backend || true
    pm2 delete coffee-backend || true

    # Start app with PM2
    pm2 start dist/src/main.js --name coffee-backend

    # Save PM2 configuration
    pm2 save

    # Setup PM2 to start on boot
    pm2 startup
    sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u $USER --hp $HOME

    echo "✅ Backend deployed successfully!"
    echo "🌐 App should be running on port 3000"
    echo "📊 Check status with: pm2 status"
    echo "📝 Check logs with: pm2 logs coffee-backend"
EOF

if [ $? -eq 0 ]; then
    print_status "✅ Deployment completed successfully!"
    print_status "🌐 Backend should be available at: http://$SERVER_IP:3000"
    print_status "📊 Check server status with: ssh -i $SSH_KEY $REMOTE_USER@$SERVER_IP 'pm2 status'"
else
    print_error "❌ Deployment failed!"
    exit 1
fi

# Cleanup
rm backend-deploy.tar.gz
print_status "🧹 Cleanup completed"
