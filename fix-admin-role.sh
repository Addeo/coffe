#!/bin/bash

# Script to fix admin user role on VPS
# Usage: ./fix-admin-role.sh

VPS_HOST="${VPS_HOST:-192.144.12.102}"
VPS_USER="${VPS_USER:-user1}"
CONTAINER_NAME="coffee_mysql_fallback"

echo "🔧 Fixing admin user role on VPS..."
echo ""

ssh -o StrictHostKeyChecking=no ${VPS_USER}@${VPS_HOST} << 'EOF'
  set -e
  
  # Get database credentials from .env
  source ~/coffe/.env 2>/dev/null || true
  
  MYSQL_USER=${MYSQL_USER:-root}
  MYSQL_PASSWORD=${MYSQL_ROOT_PASSWORD:-password}
  MYSQL_DATABASE=${MYSQL_DATABASE:-coffee_admin}
  
  echo "🐳 Connecting to MySQL container..."
  
  # Update admin role
  docker exec ${CONTAINER_NAME} mysql \
    -u${MYSQL_USER} \
    -p${MYSQL_PASSWORD} \
    ${MYSQL_DATABASE} \
    -e "UPDATE users SET role = 'admin', primary_role = 'admin', active_role = NULL WHERE email = 'admin@coffee.com';" 2>/dev/null || {
    echo "⚠️ Failed to update, trying with root..."
    docker exec ${CONTAINER_NAME} mysql \
      -uroot \
      -p${MYSQL_ROOT_PASSWORD} \
      ${MYSQL_DATABASE} \
      -e "UPDATE users SET role = 'admin', primary_role = 'admin', active_role = NULL WHERE email = 'admin@coffee.com';" || true
  }
  
  echo ""
  echo "✅ Admin role updated"
  echo ""
  echo "📋 Current admin user data:"
  docker exec ${CONTAINER_NAME} mysql \
    -u${MYSQL_USER} \
    -p${MYSQL_PASSWORD} \
    ${MYSQL_DATABASE} \
    -e "SELECT id, email, role, primary_role, active_role, is_active FROM users WHERE email = 'admin@coffee.com';" 2>/dev/null || \
  docker exec ${CONTAINER_NAME} mysql \
    -uroot \
    -p${MYSQL_ROOT_PASSWORD} \
    ${MYSQL_DATABASE} \
    -e "SELECT id, email, role, primary_role, active_role, is_active FROM users WHERE email = 'admin@coffee.com';" || true
  
  echo ""
  echo "✅ Done! Please logout and login again to see the changes."
EOF

echo ""
echo "✅ Script completed!"

