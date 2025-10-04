#!/bin/bash

# Yandex Cloud Docker Deployment Script
# Usage: ./deploy-yandex-cloud.sh [vm_instance_ip] [ssh_key_path]

set -e

VM_IP=${1:-"your-vm-ip"}
SSH_KEY=${2:-"~/.ssh/id_ed25519"}
REMOTE_USER=${3:-"yc-user"}

echo "🚀 Starting deployment to Yandex Cloud VM: $VM_IP"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "docker-compose.prod.yml" ]; then
    print_error "Please run this script from the project root directory"
    exit 1
fi

print_step "1. Building backend for production..."
cd backend
npm run build
cd ..

print_step "2. Creating deployment archive..."
tar -czf yandex-deploy.tar.gz \
    docker-compose.prod.yml \
    backend/dist \
    backend/package*.json \
    backend/.env.prod \
    --exclude='**/node_modules' \
    --exclude='**/.git'

print_step "3. Uploading to Yandex Cloud VM..."
scp -i "$SSH_KEY" yandex-deploy.tar.gz "$REMOTE_USER@$VM_IP:~/" || {
    print_error "Failed to upload files to VM"
    exit 1
}

print_step "4. Deploying on Yandex Cloud VM..."
ssh -i "$SSH_KEY" "$REMOTE_USER@$VM_IP" << 'EOF'
    set -e

    echo "📦 Extracting deployment files..."
    tar -xzf yandex-deploy.tar.gz
    rm yandex-deploy.tar.gz

    echo "🐳 Installing Docker if not present..."
    if ! command -v docker &> /dev/null; then
        # Install Docker on Ubuntu/Debian
        sudo apt-get update
        sudo apt-get install -y ca-certificates curl gnupg lsb-release
        sudo mkdir -p /etc/apt/keyrings
        curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
        echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
        sudo apt-get update
        sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
        sudo systemctl start docker
        sudo systemctl enable docker
    fi

    # Add user to docker group
    sudo usermod -aG docker $USER

    echo "🏗️ Building and starting containers..."
    # Stop existing containers
    docker-compose -f docker-compose.prod.yml down || true

    # Start containers
    docker-compose -f docker-compose.prod.yml up -d --build

    echo "⏳ Waiting for application to start..."
    sleep 30

    echo "🔍 Checking container status..."
    docker-compose -f docker-compose.prod.yml ps

    echo "📊 Checking application health..."
    if curl -f http://localhost:3000/api/test/health; then
        echo "✅ Application is healthy!"
    else
        echo "⚠️ Application health check failed, but containers are running"
    fi

    echo ""
    echo "🎉 Deployment completed!"
    echo "🌐 Application should be available at: http://$VM_IP:3000"
    echo ""
    echo "📋 Useful commands:"
    echo "  docker-compose -f docker-compose.prod.yml logs -f backend    # View logs"
    echo "  docker-compose -f docker-compose.prod.yml restart backend   # Restart app"
    echo "  docker-compose -f docker-compose.prod.yml down              # Stop all"
EOF

if [ $? -eq 0 ]; then
    print_status "✅ Deployment to Yandex Cloud completed successfully!"
    print_status "🌐 Your application is running at: http://$VM_IP:3000"
    print_status ""
    print_status "📋 Next steps:"
    print_status "  1. Update your domain DNS to point to $VM_IP"
    print_status "  2. Install SSL certificate with Let's Encrypt"
    print_status "  3. Configure firewall rules in Yandex Cloud Console"
else
    print_error "❌ Deployment failed!"
    exit 1
fi

# Cleanup
rm yandex-deploy.tar.gz
print_status "🧹 Cleanup completed"
