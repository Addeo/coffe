#!/bin/bash

# ============================================
# Apply Engineer Balances Migration to Production
# ============================================

set -e

# Styling
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
VPS_HOST="${1:-192.144.12.102}"
VPS_USER="${2:-user1}"
DB_NAME="coffee_admin"
MIGRATION_FILE="backend/migrations/011_create_engineer_balances_table.sql"

print_step() {
  echo -e "${YELLOW}[${1}] ${2}${NC}"
}

print_ok() {
  echo -e "${GREEN}✅ ${1}${NC}"
}

print_error() {
  echo -e "${RED}❌ ${1}${NC}"
}

echo -e "${BLUE}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Apply Engineer Balances Migration (Production)      ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════╝${NC}"
echo ""

# 1. Check if migration file exists
print_step "1/5" "Checking migration file..."
if [ ! -f "$MIGRATION_FILE" ]; then
  print_error "Migration file not found: $MIGRATION_FILE"
  exit 1
fi
print_ok "Migration file found"

# 2. Test SSH connection
print_step "2/5" "Testing SSH connection..."
if ! ssh -o StrictHostKeyChecking=no "${VPS_USER}@${VPS_HOST}" "echo OK" &>/dev/null; then
  print_error "SSH connection failed"
  exit 1
fi
print_ok "SSH connection established"

# 3. Upload migration file
print_step "3/5" "Uploading migration file to server..."
scp -o StrictHostKeyChecking=no "$MIGRATION_FILE" "${VPS_USER}@${VPS_HOST}:/tmp/011_engineer_balances.sql"
print_ok "Migration file uploaded"

# 4. Execute migration on server
print_step "4/5" "Executing migration..."
ssh -o StrictHostKeyChecking=no "${VPS_USER}@${VPS_HOST}" << 'EOF'
  cd ~/coffe
  
  # Get MySQL credentials from .env file
  source .env
  
  echo "Executing migration 011_create_engineer_balances_table..."
  docker exec -i coffee_mysql_fallback mysql -uroot -p"${MYSQL_ROOT_PASSWORD}" coffee_admin < /tmp/011_engineer_balances.sql
  
  if [ $? -eq 0 ]; then
    echo "✅ Migration executed successfully"
    rm /tmp/011_engineer_balances.sql
  else
    echo "❌ Migration failed"
    exit 1
  fi
EOF

if [ $? -ne 0 ]; then
  print_error "Migration execution failed"
  exit 1
fi
print_ok "Migration executed successfully"

# 5. Verify table creation
print_step "5/5" "Verifying table creation..."
ssh -o StrictHostKeyChecking=no "${VPS_USER}@${VPS_HOST}" << 'EOF'
  cd ~/coffe
  source .env
  
  echo "Checking engineer_balances table:"
  docker exec -i coffee_mysql_fallback mysql -uroot -p"${MYSQL_ROOT_PASSWORD}" coffee_admin -e "
    SHOW CREATE TABLE engineer_balances\G
    SELECT COUNT(*) as table_exists FROM information_schema.tables 
    WHERE table_schema = 'coffee_admin' AND table_name = 'engineer_balances';
  "
EOF

print_ok "Verification complete"

echo ""
echo -e "${BLUE}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Migration Complete ✅                                ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════╝${NC}"
echo ""
echo "Table 'engineer_balances' has been created successfully."
echo "You can now delete users without errors."
echo ""
