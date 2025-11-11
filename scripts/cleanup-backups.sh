#!/bin/bash

# ============================================
# Cleanup backup archives on production server
# ============================================

set -e

VPS_HOST="192.144.12.102"
VPS_USER="user1"
PROJECT_DIR="~/coffe"
BACKUP_DIR="${PROJECT_DIR}/backups"
SSH_OPTS="-o StrictHostKeyChecking=no -o ServerAliveInterval=60 -o ServerAliveCountMax=3 -o ConnectTimeout=30"

ssh_exec() {
  ssh ${SSH_OPTS} "${VPS_USER}@${VPS_HOST}" "$@"
}

echo "🔍 Checking current backup usage..."
ssh_exec "du -sh ${BACKUP_DIR} 2>/dev/null || echo 'No backups directory present.'"

echo "🗑️  Removing backup archives..."
ssh_exec "rm -rf ${BACKUP_DIR}/*"
ssh_exec "mkdir -p ${BACKUP_DIR}"

echo "✅ Backups directory cleaned."

echo "💾 Current disk usage:"
ssh_exec "df -h /"
