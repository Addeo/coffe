#!/bin/bash

# ============================================
# Cleanup backup archives on production server
# ============================================

VPS_HOST="192.144.12.102"
VPS_USER="user1"
PROJECT_DIR="~/coffe"
BACKUP_DIR="${PROJECT_DIR}/backups"
SSH_KEY="${SSH_KEY:-$HOME/.ssh/coffe_key}"

echo "🗑️  Cleaning up backups on ${VPS_HOST}..."
echo ""

# Check if SSH key exists
if [ ! -f "$SSH_KEY" ]; then
  echo "❌ SSH key not found at $SSH_KEY"
  echo ""
  echo "To fix this issue:"
  echo "  1. Copy your SSH key to ~/.ssh/coffe_key"
  echo "  2. Or set SSH_KEY environment variable"
  echo ""
  echo "Alternative: Run cleanup directly on server:"
  echo "  ssh user1@192.144.12.102"
  echo "  cd ~/coffe && rm -rf backups/* && echo 'Backups cleaned'"
  exit 1
fi

# Test connection
if ! ssh -i "$SSH_KEY" \
     -o StrictHostKeyChecking=no \
     -o ConnectTimeout=5 \
     -o BatchMode=yes \
     "$VPS_USER@$VPS_HOST" "echo 'OK'" &>/dev/null; then
  echo "❌ Cannot connect to server $VPS_HOST"
  echo ""
  echo "Please run cleanup manually on server:"
  echo "  ssh user1@192.144.12.102"
  echo "  cd ~/coffe"
  echo "  du -sh backups/"
  echo "  rm -rf backups/*"
  echo "  df -h /"
  exit 1
fi

echo "✅ Connected to server"
echo ""

echo "🔍 Checking current backup usage..."
ssh -i "$SSH_KEY" \
    -o StrictHostKeyChecking=no \
    "$VPS_USER@$VPS_HOST" "du -sh ${BACKUP_DIR} 2>/dev/null || echo 'No backups directory'"

echo ""
echo "🗑️  Removing backup archives..."
ssh -i "$SSH_KEY" \
    -o StrictHostKeyChecking=no \
    "$VPS_USER@$VPS_HOST" "rm -rf ${BACKUP_DIR}/* && mkdir -p ${BACKUP_DIR}"

echo "✅ Backups directory cleaned"
echo ""

echo "💾 Current disk usage:"
ssh -i "$SSH_KEY" \
    -o StrictHostKeyChecking=no \
    "$VPS_USER@$VPS_HOST" "df -h /"
