#!/bin/bash

# ============================================
# Test Migration on Local Docker Database
# Тестирование миграции на локальной Docker БД
# ============================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

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
echo -e "${BLUE}║  Test Migration on Local Docker Database             ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════╝${NC}"
echo ""

SCRIPT_PATH="scripts/seed-production-orders.sql"

# 1. Check if SQL file exists
print_step "1/4" "Checking SQL file..."
if [ ! -f "$SCRIPT_PATH" ]; then
  print_error "SQL file not found: $SCRIPT_PATH"
  exit 1
fi
print_ok "SQL file found ($(wc -l < $SCRIPT_PATH) lines)"

# 2. Find MySQL container
print_step "2/4" "Finding MySQL container..."
MYSQL_CONTAINER=$(docker ps --filter "name=mysql" --filter "status=running" --format "{{.Names}}" | head -n 1)

if [ -z "$MYSQL_CONTAINER" ]; then
  print_error "No running MySQL container found. Make sure backend is running (npm run dev:backend)"
  exit 1
fi
print_ok "MySQL container found: $MYSQL_CONTAINER"

# 3. Execute migration
print_step "3/4" "Executing migration..."
docker exec -i "$MYSQL_CONTAINER" mysql -uroot -proot coffee_db < "$SCRIPT_PATH"

if [ $? -eq 0 ]; then
  print_ok "Migration executed successfully"
else
  print_error "Migration failed"
  exit 1
fi

# 4. Verify data
print_step "4/4" "Verifying data..."
echo ""
echo -e "${BLUE}📊 Current Month Statistics:${NC}"
docker exec -i "$MYSQL_CONTAINER" mysql -uroot -proot coffee_db -e "
  SELECT 
    status, 
    COUNT(*) as count,
    COALESCE(SUM(calculatedAmount), 0) as total_engineer,
    COALESCE(SUM(organizationPayment), 0) as total_org,
    COALESCE(SUM(profit), 0) as profit
  FROM orders 
  WHERE createdAt >= DATE_FORMAT(NOW(), '%Y-%m-01')
  GROUP BY status
  ORDER BY FIELD(status, 'waiting', 'assigned', 'processing', 'working', 'review', 'completed', 'paid_to_engineer');
" 2>/dev/null

echo ""
echo -e "${BLUE}👥 Engineers Stats (Current Month):${NC}"
docker exec -i "$MYSQL_CONTAINER" mysql -uroot -proot coffee_db -e "
  SELECT 
    e.id,
    CONCAT(u.firstName, ' ', u.lastName) as engineer,
    COUNT(*) as orders,
    COALESCE(SUM(o.regularHours + o.overtimeHours), 0) as hours,
    COALESCE(SUM(o.calculatedAmount), 0) as earned
  FROM orders o
  JOIN engineers e ON o.assignedEngineerId = e.id
  JOIN users u ON e.userId = u.id
  WHERE o.createdAt >= DATE_FORMAT(NOW(), '%Y-%m-01')
    AND o.status IN ('review', 'completed', 'paid_to_engineer')
  GROUP BY e.id, u.firstName, u.lastName
  ORDER BY earned DESC;
" 2>/dev/null

echo ""
echo -e "${BLUE}🏢 Organizations Stats (Current Month):${NC}"
docker exec -i "$MYSQL_CONTAINER" mysql -uroot -proot coffee_db -e "
  SELECT 
    org.id,
    org.name,
    COUNT(*) as orders,
    COALESCE(SUM(o.organizationPayment), 0) as revenue,
    COALESCE(SUM(o.calculatedAmount), 0) as costs,
    COALESCE(SUM(o.profit), 0) as profit
  FROM orders o
  JOIN organizations org ON o.organizationId = org.id
  WHERE o.createdAt >= DATE_FORMAT(NOW(), '%Y-%m-01')
    AND o.status IN ('review', 'completed', 'paid_to_engineer')
  GROUP BY org.id, org.name
  ORDER BY profit DESC;
" 2>/dev/null

echo ""
echo -e "${BLUE}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Migration Test Complete                             ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════╝${NC}"
echo ""
echo "✅ Test successful!"
echo "🌐 Check statistics at: http://localhost:4202/orders"
echo ""
echo "📊 Total statistics:"
docker exec -i "$MYSQL_CONTAINER" mysql -uroot -proot coffee_db -e "
  SELECT 
    'Current Month' as period,
    COUNT(*) as total_orders,
    COUNT(DISTINCT assignedEngineerId) as active_engineers,
    COUNT(DISTINCT organizationId) as active_organizations,
    COALESCE(SUM(calculatedAmount), 0) as total_engineer_payments,
    COALESCE(SUM(organizationPayment), 0) as total_org_payments,
    COALESCE(SUM(profit), 0) as total_profit
  FROM orders 
  WHERE createdAt >= DATE_FORMAT(NOW(), '%Y-%m-01');
" 2>/dev/null
