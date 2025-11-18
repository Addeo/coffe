#!/bin/bash

# VM Backup Setup Script
# Настраивает автоматизированные бэкапы на виртуальной машине SberCloud
# Usage: ./vm-backup-setup.sh [vm_ip] [ssh_key_path] [admin_token]

set -e

VM_IP=${1:-"your-sbercloud-vm-ip"}
SSH_KEY=${2:-"~/.ssh/id_ed25519"}
ADMIN_TOKEN=${3:-""}
REMOTE_USER=${4:-"ubuntu"}

echo "🔧 Setting up automated backups on VM: $VM_IP"

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

# Check if admin token is provided
if [ -z "$ADMIN_TOKEN" ]; then
    print_warning "Admin token not provided. You can get it from the application admin panel."
    print_warning "The script will set up backup infrastructure, but you'll need to configure the token manually."
fi

print_step "1. Creating backup directories and scripts on VM..."

ssh -i "$SSH_KEY" "$REMOTE_USER@$VM_IP" << 'EOF'
    set -e

    echo "📁 Creating backup directories..."
    mkdir -p ~/backups
    mkdir -p ~/scripts

    echo "📝 Creating backup script..."
    cat > ~/scripts/create-backup.sh << 'SCRIPT_EOF'
#!/bin/bash
# Automated backup script for Coffee Admin
# This script runs inside the VM to create database backups

set -e

BACKUP_DIR="/home/ubuntu/backups"
LOG_FILE="/home/ubuntu/backups/backup.log"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_NAME="coffee_backup_$TIMESTAMP.sql"

# Colors for logging
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() {
    echo -e "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log "${GREEN}[START]${NC} Starting backup process..."

# Check if containers are running
if ! docker-compose -f docker-compose.prod.yml ps mysql | grep -q "Up"; then
    log "${RED}[ERROR]${NC} MySQL container is not running"
    exit 1
fi

log "${YELLOW}[INFO]${NC} Creating database dump..."

# Create backup using mysqldump inside the container
if docker-compose -f docker-compose.prod.yml exec -T mysql mysqldump \
    -u coffee_user \
    -pcoffee_password \
    coffee_admin > "$BACKUP_DIR/$BACKUP_NAME"; then

    # Get file size
    FILE_SIZE=$(stat -f%z "$BACKUP_DIR/$BACKUP_NAME" 2>/dev/null || stat -c%s "$BACKUP_DIR/$BACKUP_NAME")

    log "${GREEN}[SUCCESS]${NC} Backup created: $BACKUP_NAME (${FILE_SIZE} bytes)"

    # Alternative: Use API endpoint if available
    # if [ ! -z "$ADMIN_TOKEN" ]; then
    #     log "${YELLOW}[INFO]${NC} Creating backup via API..."
    #     if curl -X POST \
    #         -H "Authorization: Bearer $ADMIN_TOKEN" \
    #         -H "Content-Type: application/json" \
    #         http://localhost:3001/api/backup/create-sql-dump; then
    #         log "${GREEN}[SUCCESS]${NC} Backup created via API"
    #     fi
    # fi

else
    log "${RED}[ERROR]${NC} Failed to create database dump"
    exit 1
fi

log "${GREEN}[COMPLETE]${NC} Backup process finished"

SCRIPT_EOF

    chmod +x ~/scripts/create-backup.sh
EOF

print_step "2. Setting up cron job for daily backups..."

ssh -i "$SSH_KEY" "$REMOTE_USER@$VM_IP" << 'EOF'
    set -e

    echo "⏰ Setting up cron job for daily backups at 2:00 AM..."

    # Create cron job (runs at 2:00 AM daily)
    (crontab -l 2>/dev/null || true; echo "0 2 * * * /home/ubuntu/scripts/create-backup.sh") | crontab -

    echo "📋 Current cron jobs:"
    crontab -l

    echo "🧹 Setting up backup rotation (keep last 30 days)..."

    # Create cleanup script
    cat > ~/scripts/cleanup-backups.sh << 'CLEANUP_EOF'
#!/bin/bash
# Cleanup old backup files (keep last 30 days)

BACKUP_DIR="/home/ubuntu/backups"
KEEP_DAYS=30

echo "🧹 Cleaning up backups older than $KEEP_DAYS days..."

# Find and remove old files
find "$BACKUP_DIR" -name "coffee_backup_*.sql" -mtime +$KEEP_DAYS -delete -print

echo "✅ Cleanup completed"
CLEANUP_EOF

    chmod +x ~/scripts/cleanup-backups.sh

    # Add cleanup to cron (runs weekly on Sunday at 3:00 AM)
    (crontab -l 2>/dev/null || true; echo "0 3 * * 0 /home/ubuntu/scripts/cleanup-backups.sh") | crontab -

    echo "📋 Updated cron jobs:"
    crontab -l
EOF

print_step "3. Testing backup functionality..."

ssh -i "$SSH_KEY" "$REMOTE_USER@$VM_IP" << 'EOF'
    set -e

    echo "🧪 Testing backup script..."
    ~/scripts/create-backup.sh

    echo "📂 Checking backup files..."
    ls -la ~/backups/

    echo "📊 Backup statistics:"
    echo "Total backups: $(ls ~/backups/coffee_backup_*.sql 2>/dev/null | wc -l)"
    echo "Total size: $(du -sh ~/backups/ 2>/dev/null | cut -f1)"
EOF

if [ $? -eq 0 ]; then
    print_status "✅ Backup setup completed successfully!"
    print_status ""
    print_status "📋 Backup Configuration:"
    print_status "  • Daily backups at 2:00 AM"
    print_status "  • Weekly cleanup (Sundays at 3:00 AM)"
    print_status "  • Backups stored in: ~/backups/"
    print_status "  • Logs available in: ~/backups/backup.log"
    print_status ""
    print_status "🔄 Next steps:"
    print_status "  1. Run './download-backups.sh $VM_IP $SSH_KEY' to download backups locally"
    print_status "  2. Monitor backup logs: 'ssh -i $SSH_KEY $REMOTE_USER@$VM_IP tail -f ~/backups/backup.log'"
else
    print_error "❌ Backup setup failed!"
    exit 1
fi
