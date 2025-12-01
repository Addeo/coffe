#!/bin/bash

# ============================================
# Apply Production Seed Script
# Применение миграции данных на продакшн сервер
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
DB_NAME="coffee_db"
SCRIPT_PATH="scripts/seed-production-orders.sql"

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
echo -e "${BLUE}║  Apply Production Data Seed                          ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════╝${NC}"
echo ""

# 1. Check if SQL file exists
print_step "1/5" "Checking SQL file..."
if [ ! -f "$SCRIPT_PATH" ]; then
  print_error "SQL file not found: $SCRIPT_PATH"
  exit 1
fi
print_ok "SQL file found"

# 2. Test SSH connection
print_step "2/5" "Testing SSH connection..."
if ! ssh -o StrictHostKeyChecking=no "${VPS_USER}@${VPS_HOST}" "echo OK" &>/dev/null; then
  print_error "SSH connection failed"
  exit 1
fi
print_ok "SSH connection established"

# 3. Upload SQL file
print_step "3/5" "Uploading SQL file to server..."
scp -o StrictHostKeyChecking=no "$SCRIPT_PATH" "${VPS_USER}@${VPS_HOST}:/tmp/seed-orders.sql"
print_ok "SQL file uploaded"

# 4. Execute SQL on server
print_step "4/5" "Executing SQL migration..."
ssh -o StrictHostKeyChecking=no "${VPS_USER}@${VPS_HOST}" << 'EOF'
  cd ~/coffe
  
  # Get MySQL credentials from docker-compose
  DB_PASSWORD=$(grep MYSQL_ROOT_PASSWORD docker-compose.fallback.yml | awk '{print $2}')
  
  echo "Executing SQL migration..."
  docker exec -i coffee_mysql_fallback mysql -uroot -p"${DB_PASSWORD}" coffee_db < /tmp/seed-orders.sql
  
  if [ $? -eq 0 ]; then
    echo "✅ Migration executed successfully"
    rm /tmp/seed-orders.sql
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

# 5. Verify data
print_step "5/5" "Verifying data..."
ssh -o StrictHostKeyChecking=no "${VPS_USER}@${VPS_HOST}" << 'EOF'
  cd ~/coffe
  DB_PASSWORD=$(grep MYSQL_ROOT_PASSWORD docker-compose.fallback.yml | awk '{print $2}')
  
  echo "Current month statistics:"
  docker exec -i coffee_mysql_fallback mysql -uroot -p"${DB_PASSWORD}" coffee_db -e "
    SELECT 
      status, 
      COUNT(*) as count,
      COALESCE(SUM(calculatedAmount), 0) as total_engineer,
      COALESCE(SUM(organizationPayment), 0) as total_org
    FROM orders 
    WHERE createdAt >= DATE_FORMAT(NOW(), '%Y-%m-01')
    GROUP BY status
    ORDER BY FIELD(status, 'waiting', 'assigned', 'processing', 'working', 'review', 'completed', 'paid_to_engineer');
  "
EOF

print_ok "Verification complete"

echo ""
echo -e "${BLUE}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Migration Complete                                   ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════╝${NC}"
echo ""
echo "Теперь статистика должна отображать:"
echo "  - Ожидают: 3"
echo "  - Назначено: 2"
echo "  - В обработке: 2"
echo "  - В работе: 3"
echo "  - На проверке: 2"
echo "  - Завершено: 4"
echo "  - Выплачено инженеру: 2"
echo ""
echo "Проверьте статистику на https://coffe-ug.ru/orders"
