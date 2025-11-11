#!/bin/bash

# Script to apply database migrations on VPS
# Usage: ./apply-migrations.sh

VPS_HOST="${VPS_HOST:-192.144.12.102}"
VPS_USER="${VPS_USER:-user1}"
CONTAINER_NAME="coffee_mysql_fallback"

echo "🔄 Applying database migrations on VPS..."
echo ""

# Connect to VPS and apply migrations
ssh -o StrictHostKeyChecking=no ${VPS_USER}@${VPS_HOST} << EOF
  set -e
  
  echo "📋 Checking migrations directory..."
  if [ ! -d ~/coffe/backend/migrations ]; then
    echo "❌ Migrations directory not found!"
    exit 1
  fi
  
  echo "🐳 Checking MySQL container..."
  if ! docker ps | grep -q ${CONTAINER_NAME}; then
    echo "❌ MySQL container ${CONTAINER_NAME} is not running!"
    exit 1
  fi
  
  echo "⏳ Waiting for MySQL to be ready..."
  for i in {1..30}; do
    if docker exec ${CONTAINER_NAME} mysqladmin ping -h localhost --silent 2>/dev/null; then
      echo "✅ MySQL is ready"
      break
    fi
    echo "⏳ Waiting... ($i/30)"
    sleep 2
  done
  
  echo ""
  echo "🔄 Applying migrations..."
  
  # Get database credentials from .env
  source ~/coffe/.env 2>/dev/null || true
  
  MYSQL_USER=\${MYSQL_USER:-root}
  MYSQL_PASSWORD=\${MYSQL_ROOT_PASSWORD:-password}
  MYSQL_DATABASE=\${MYSQL_DATABASE:-coffee_admin}
  
  # Apply migration 004 (role hierarchy)
  if [ -f ~/coffe/backend/migrations/004_add_role_hierarchy_fields.sql ]; then
    echo "📝 Applying migration 004: role hierarchy fields..."
    docker exec -i ${CONTAINER_NAME} mysql \
      -u\${MYSQL_USER} \
      -p\${MYSQL_PASSWORD} \
      \${MYSQL_DATABASE} < ~/coffe/backend/migrations/004_add_role_hierarchy_fields.sql 2>&1 | grep -v "already exists" || true
    echo "✅ Migration 004 applied"
  fi
  
  # Apply migration 005 (order work execution)
  if [ -f ~/coffe/backend/migrations/005_add_order_work_execution_fields.sql ]; then
    echo "📝 Applying migration 005: order work execution fields..."
    docker exec -i ${CONTAINER_NAME} mysql \
      -u\${MYSQL_USER} \
      -p\${MYSQL_PASSWORD} \
      \${MYSQL_DATABASE} < ~/coffe/backend/migrations/005_add_order_work_execution_fields.sql 2>&1 | grep -v "already exists" || true
    echo "✅ Migration 005 applied"
  fi
  
  echo ""
  echo "✅ All migrations applied successfully!"
EOF

echo ""
echo "✅ Done!"

