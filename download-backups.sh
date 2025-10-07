#!/bin/bash

# Download Backups Script
# Скачивает бэкапы с виртуальной машины SberCloud на локальную машину
# Usage: ./download-backups.sh [vm_ip] [ssh_key_path] [local_backup_dir]

set -e

VM_IP=${1:-"your-sbercloud-vm-ip"}
SSH_KEY=${2:-"~/.ssh/id_ed25519"}
LOCAL_BACKUP_DIR=${3:-"./vm-backups"}
REMOTE_USER=${4:-"ubuntu"}
REMOTE_BACKUP_DIR="~/backups"

echo "⬇️ Downloading backups from VM: $VM_IP"

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

# Create local backup directory
print_step "1. Preparing local backup directory..."
mkdir -p "$LOCAL_BACKUP_DIR"

# Add timestamp to local backup directory
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
LOCAL_BACKUP_DIR="$LOCAL_BACKUP_DIR/backup_$TIMESTAMP"

print_status "Local backup directory: $LOCAL_BACKUP_DIR"

print_step "2. Checking available backups on VM..."

# Get list of backup files from VM
BACKUP_FILES=$(ssh -i "$SSH_KEY" "$REMOTE_USER@$VM_IP" "ls -la $REMOTE_BACKUP_DIR/coffee_backup_*.sql 2>/dev/null" | awk '{print $9}' | grep -v "^$")

if [ -z "$BACKUP_FILES" ]; then
    print_warning "No backup files found on VM"
    exit 0
fi

print_status "Found backup files:"
echo "$BACKUP_FILES" | while read -r file; do
    if [ ! -z "$file" ]; then
        FILE_SIZE=$(ssh -i "$SSH_KEY" "$REMOTE_USER@$VM_IP" "stat -f%z $REMOTE_BACKUP_DIR/$file 2>/dev/null || stat -c%s $REMOTE_BACKUP_DIR/$file 2>/dev/null")
        echo "  • $file (${FILE_SIZE} bytes)"
    fi
done

print_step "3. Downloading backup files..."

# Download each backup file
DOWNLOAD_COUNT=0
TOTAL_SIZE=0

echo "$BACKUP_FILES" | while read -r file; do
    if [ ! -z "$file" ]; then
        print_status "Downloading: $file"

        if scp -i "$SSH_KEY" "$REMOTE_USER@$VM_IP:$REMOTE_BACKUP_DIR/$file" "$LOCAL_BACKUP_DIR/" 2>/dev/null; then
            LOCAL_FILE_SIZE=$(stat -f%z "$LOCAL_BACKUP_DIR/$file" 2>/dev/null || stat -c%s "$LOCAL_BACKUP_DIR/$file" 2>/dev/null)
            TOTAL_SIZE=$((TOTAL_SIZE + LOCAL_FILE_SIZE))
            DOWNLOAD_COUNT=$((DOWNLOAD_COUNT + 1))
            print_status "✅ Downloaded: $file (${LOCAL_FILE_SIZE} bytes)"
        else
            print_error "❌ Failed to download: $file"
        fi
    fi
done

print_step "4. Downloading backup logs and metadata..."

# Download backup log if exists
if ssh -i "$SSH_KEY" "$REMOTE_USER@$VM_IP" "test -f $REMOTE_BACKUP_DIR/backup.log"; then
    print_status "Downloading backup log..."
    scp -i "$SSH_KEY" "$REMOTE_USER@$VM_IP:$REMOTE_BACKUP_DIR/backup.log" "$LOCAL_BACKUP_DIR/" 2>/dev/null || true
fi

# Download system information
print_status "Collecting system information..."
ssh -i "$SSH_KEY" "$REMOTE_USER@$VM_IP" << 'EOF' > "$LOCAL_BACKUP_DIR/system_info.txt"
echo "=== System Information ==="
echo "Date: $(date)"
echo "Uptime: $(uptime)"
echo ""
echo "=== Disk Usage ==="
df -h
echo ""
echo "=== Docker Containers ==="
docker-compose -f docker-compose.prod.yml ps 2>/dev/null || echo "No docker-compose found"
echo ""
echo "=== Backup Directory ==="
ls -la ~/backups/
echo ""
echo "=== Recent Backup Logs ==="
tail -20 ~/backups/backup.log 2>/dev/null || echo "No backup log found"
EOF

# Create summary file
cat > "$LOCAL_BACKUP_DIR/README.md" << EOF
# VM Backup Download - $(date)

## Summary
- **Download Date:** $(date)
- **VM IP:** $VM_IP
- **Files Downloaded:** $DOWNLOAD_COUNT
- **Total Size:** $(echo "scale=2; $TOTAL_SIZE/1024/1024" | bc 2>/dev/null || echo "$TOTAL_SIZE bytes")

## Files
$(ls -la "$LOCAL_BACKUP_DIR" | grep -E "\.(sql|log|txt|md)$" | awk '{print "- " $9 " (" $5 " bytes)"}')

## VM System Info
\`\`\`
$(cat "$LOCAL_BACKUP_DIR/system_info.txt")
\`\`\`

## Next Steps
1. Verify backup integrity: \`mysql -u root -p < backup_file.sql\`
2. Store backups securely
3. Set up automated local backup rotation
EOF

print_step "5. Creating backup archive..."

# Create compressed archive
ARCHIVE_NAME="vm_backup_$TIMESTAMP.tar.gz"
cd "$(dirname "$LOCAL_BACKUP_DIR")"
tar -czf "$ARCHIVE_NAME" "$(basename "$LOCAL_BACKUP_DIR")"

ARCHIVE_SIZE=$(stat -f%z "$ARCHIVE_NAME" 2>/dev/null || stat -c%s "$ARCHIVE_NAME" 2>/dev/null)
print_status "Created archive: $ARCHIVE_NAME (${ARCHIVE_SIZE} bytes)"

# Cleanup: remove uncompressed directory (keep archive)
rm -rf "$LOCAL_BACKUP_DIR"

print_status "✅ Backup download completed successfully!"
print_status ""
print_status "📋 Summary:"
print_status "  • Files downloaded: $DOWNLOAD_COUNT"
print_status "  • Archive created: $ARCHIVE_NAME"
print_status "  • Archive size: $(echo "scale=2; $ARCHIVE_SIZE/1024/1024" | bc 2>/dev/null || echo "$ARCHIVE_SIZE bytes") MB"
print_status ""
print_status "🔄 To automate this process, add to cron:"
print_status "  0 6 * * * $(pwd)/download-backups.sh $VM_IP $SSH_KEY $(pwd)/vm-backups"
print_status ""
print_status "📁 Archive location: $(pwd)/$ARCHIVE_NAME"
