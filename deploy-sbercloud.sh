#!/bin/bash

# SberCloud Deployment Script
# Usage: ./deploy-sbercloud.sh [vm_ip] [ssh_key_path]

set -e

VM_IP=${1:-"your-sbercloud-vm-ip"}
SSH_KEY=${2:-"~/.ssh/id_ed25519"}
REMOTE_USER=${3:-"ubuntu"}

echo "🚀 Starting deployment to SberCloud VM: $VM_IP"

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
if [ ! -f "backend/package.json" ]; then
    print_error "Please run this script from the project root directory"
    exit 1
fi

print_step "1. Building backend for production..."
cd backend
npm run build
cd ..

print_step "2. Building frontend with SSR..."
cd frontend
npm run build:ssr
cd ..

print_step "3. Creating deployment archive..."
tar -czf sbercloud-deploy.tar.gz \
    docker-compose.prod.yml \
    backend/dist \
    backend/package*.json \
    backend/.env.prod \
    frontend/dist \
    frontend/package*.json \
    docker/mysql/init.sql

print_step "4. Uploading to SberCloud VM..."
scp -i "$SSH_KEY" sbercloud-deploy.tar.gz "$REMOTE_USER@$VM_IP:~/" || {
    print_error "Failed to upload files to VM"
    exit 1
}

print_step "5. Deploying on SberCloud VM..."
ssh -i "$SSH_KEY" "$REMOTE_USER@$VM_IP" << 'EOF'
    set -e

    echo "📦 Extracting deployment files..."
    # Clean existing files to avoid permission issues
    rm -rf backend/dist backend/src backend/package*.json
    tar -xzf sbercloud-deploy.tar.gz --overwrite
    rm sbercloud-deploy.tar.gz

    echo "🐳 Installing Docker if not present..."
    if ! command -v docker &> /dev/null; then
        # Install Docker on Ubuntu
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
    if curl -f http://localhost:3001/api/test/health; then
        echo "✅ Application is healthy!"
    else
        echo "⚠️ Application health check failed, but containers are running"
    fi

    echo "💾 Setting up automated backups..."
    # Create backup setup script on VM
    cat > ~/setup-backups.sh << 'BACKUP_EOF'
#!/bin/bash
# Automated backup setup script

set -e

echo "📁 Creating backup directories..."
mkdir -p ~/backups
mkdir -p ~/scripts

echo "📝 Creating backup script..."
cat > ~/scripts/create-backup.sh << 'SCRIPT_EOF'
#!/bin/bash
# Automated backup script for Coffee Admin

set -e

BACKUP_DIR="/home/ubuntu/backups"
LOG_FILE="/home/ubuntu/backups/backup.log"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_NAME="coffee_backup_$TIMESTAMP.sql"

log() {
    echo -e "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log "[START] Starting backup process..."

if ! docker-compose -f docker-compose.prod.yml ps mysql | grep -q "Up"; then
    log "[ERROR] MySQL container is not running"
    exit 1
fi

log "[INFO] Creating database dump..."

if docker-compose -f docker-compose.prod.yml exec -T mysql mysqldump \
    -u coffee_user \
    -pcoffee_password \
    coffee_admin > "$BACKUP_DIR/$BACKUP_NAME"; then

    FILE_SIZE=$(stat -f%z "$BACKUP_DIR/$BACKUP_NAME" 2>/dev/null || stat -c%s "$BACKUP_DIR/$BACKUP_NAME")
    log "[SUCCESS] Backup created: $BACKUP_NAME (${FILE_SIZE} bytes)"
else
    log "[ERROR] Failed to create database dump"
    exit 1
fi

log "[COMPLETE] Backup process finished"
SCRIPT_EOF

chmod +x ~/scripts/create-backup.sh

echo "🧹 Creating cleanup script..."
cat > ~/scripts/cleanup-backups.sh << 'CLEANUP_EOF'
#!/bin/bash
# Cleanup old backup files (keep last 30 days)

BACKUP_DIR="/home/ubuntu/backups"
KEEP_DAYS=30

echo "Cleaning up backups older than $KEEP_DAYS days..."
find "$BACKUP_DIR" -name "coffee_backup_*.sql" -mtime +$KEEP_DAYS -delete -print
echo "Cleanup completed"
CLEANUP_EOF

chmod +x ~/scripts/cleanup-backups.sh

echo "⏰ Setting up cron jobs..."
# Daily backup at 2:00 AM
(crontab -l 2>/dev/null || true; echo "0 2 * * * /home/ubuntu/scripts/create-backup.sh") | crontab -

# Weekly cleanup on Sunday at 3:00 AM
(crontab -l 2>/dev/null || true; echo "0 3 * * 0 /home/ubuntu/scripts/cleanup-backups.sh") | crontab -

echo "🧪 Testing backup..."
~/scripts/create-backup.sh

echo "✅ Backup setup completed!"
BACKUP_EOF

    chmod +x ~/setup-backups.sh
    ~/setup-backups.sh
    rm ~/setup-backups.sh

    echo ""
    echo "🎉 Deployment completed!"
    echo "🌐 Backend API: http://$VM_IP:3001"
    echo "🌐 Frontend SSR: http://$VM_IP:4000"
    echo ""
    echo "📋 Useful commands:"
    echo "  docker-compose -f docker-compose.prod.yml logs -f backend     # View backend logs"
    echo "  docker-compose -f docker-compose.prod.yml logs -f frontend   # View frontend logs"
    echo "  docker-compose -f docker-compose.prod.yml restart backend    # Restart backend"
    echo "  docker-compose -f docker-compose.prod.yml restart frontend  # Restart frontend"
    echo "  docker-compose -f docker-compose.prod.yml down               # Stop all"
    echo ""
    echo "💾 Backup commands:"
    echo "  ~/scripts/create-backup.sh                                   # Create manual backup"
    echo "  crontab -l                                                   # View scheduled backups"
    echo "  ls -la ~/backups/                                            # List backup files"
EOF

if [ $? -eq 0 ]; then
    print_status "✅ Deployment to SberCloud completed successfully!"
    print_status "🌐 Backend API: http://$VM_IP:3001"
    print_status "🌐 Frontend SSR: http://$VM_IP:4000"
    print_status ""
    print_status "📋 Next steps:"
    print_status "  1. Update your domain DNS to point to $VM_IP"
    print_status "  2. Install SSL certificate with Let's Encrypt"
    print_status "  3. Configure security groups in SberCloud Console"
else
    print_error "❌ Deployment failed!"
    exit 1
fi

# Cleanup
rm sbercloud-deploy.tar.gz
print_status "🧹 Cleanup completed"
