#!/bin/bash

# ============================================
# Display disk usage summary on production server
# ============================================

VPS_HOST="192.144.12.102"
VPS_USER="user1"
SSH_PORT="${SSH_PORT:-22}"
PROJECT_DIR="~/coffe"
SSH_KEY="${SSH_KEY:-$HOME/.ssh/coffe_key}"

echo "🔍 Checking disk usage on ${VPS_HOST}..."
echo ""

# Test connection first
if ! ssh -i "${SSH_KEY}" -p "${SSH_PORT}" \
     -o StrictHostKeyChecking=no \
     -o ConnectTimeout=5 \
     -o BatchMode=yes \
     "${VPS_USER}@${VPS_HOST}" "echo 'OK'" &>/dev/null; then
  echo "❌ Cannot connect to server ${VPS_HOST}"
  echo ""
  echo "Possible reasons:"
  echo "  • SSH service is not responding"
  echo "  • Firewall blocking connections"
  echo "  • Network issues"
  echo ""
  echo "Try connecting manually:"
  echo "  ssh -i ${SSH_KEY} ${VPS_USER}@${VPS_HOST}"
  exit 1
fi

echo "✅ Connected to server"
echo ""

echo "💾 Disk usage (root filesystem):"
ssh -i "${SSH_KEY}" -p "${SSH_PORT}" \
    -o StrictHostKeyChecking=no \
    -o ConnectTimeout=10 \
    "${VPS_USER}@${VPS_HOST}" "df -h /"

echo ""
echo "📂 Top directories in ${PROJECT_DIR}:"
ssh -i "${SSH_KEY}" -p "${SSH_PORT}" \
    -o StrictHostKeyChecking=no \
    -o ConnectTimeout=10 \
    "${VPS_USER}@${VPS_HOST}" "du -h --max-depth=1 ${PROJECT_DIR} 2>/dev/null | sort -h"

echo ""
echo "🐳 Docker disk usage:"
ssh -i "${SSH_KEY}" -p "${SSH_PORT}" \
    -o StrictHostKeyChecking=no \
    -o ConnectTimeout=10 \
    "${VPS_USER}@${VPS_HOST}" "docker system df 2>/dev/null || echo 'Docker not available'"
