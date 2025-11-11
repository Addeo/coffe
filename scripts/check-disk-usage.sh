#!/bin/bash

# ============================================
# Display disk usage summary on production server
# ============================================

set -e

VPS_HOST="192.144.12.102"
VPS_USER="user1"
PROJECT_DIR="~/coffe"
SSH_KEY="${SSH_KEY:-$HOME/.ssh/coffe_key}"
SSH_OPTS="-i ${SSH_KEY} -o StrictHostKeyChecking=no -o ServerAliveInterval=60 -o ServerAliveCountMax=3 -o ConnectTimeout=30"

ssh_exec() {
  ssh ${SSH_OPTS} "${VPS_USER}@${VPS_HOST}" "$@"
}

echo "💾 Disk usage (root filesystem):"
ssh_exec "df -h /"

echo ""
echo "📂 Top directories in ${PROJECT_DIR}:"
ssh_exec "du -h --max-depth=1 ${PROJECT_DIR} | sort -h"


