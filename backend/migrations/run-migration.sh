#!/bin/bash

# ============================================
# Production Database Migration Script
# ============================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Database credentials (from environment or .env file)
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-3306}"
DB_USER="${DB_USERNAME:-root}"
DB_PASSWORD="${DB_PASSWORD}"
DB_NAME="${DB_DATABASE:-coffee_admin}"

echo -e "${BLUE}╔════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Production Database Migration Script     ║${NC}"
echo -e "${BLUE}╔════════════════════════════════════════════╗${NC}"
echo ""

# Check if running in production
if [ "$NODE_ENV" != "production" ]; then
    echo -e "${YELLOW}⚠️  WARNING: NODE_ENV is not 'production'${NC}"
    echo -e "${YELLOW}   Current value: ${NODE_ENV:-not set}${NC}"
    read -p "Continue anyway? (yes/no): " confirm
    if [ "$confirm" != "yes" ]; then
        echo "Migration cancelled."
        exit 0
    fi
fi

# Step 1: Backup database
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}Step 1: Creating database backup...${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

BACKUP_FILE="backup-$(date +%Y-%m-%d-%H-%M-%S).sql"

mysqldump -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASSWORD" \
  "$DB_NAME" > "../backups/$BACKUP_FILE"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Backup created: ../backups/$BACKUP_FILE${NC}"
else
    echo -e "${RED}❌ Backup failed! Migration aborted.${NC}"
    exit 1
fi

echo ""

# Step 2: Show current database state
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Step 2: Current database state${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" <<EOF
SELECT 
  COUNT(*) AS total_orders,
  SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed_orders,
  SUM(COALESCE(regular_hours, 0)) AS total_regular_hours,
  SUM(COALESCE(overtime_hours, 0)) AS total_overtime_hours,
  SUM(COALESCE(calculated_amount, 0)) AS total_amount
FROM orders
WHERE assigned_engineer_id IS NOT NULL;
EOF

echo ""

# Step 3: Confirm migration
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}⚠️  IMPORTANT: This will create work_sessions table${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "Migration will:"
echo "  1. Create work_sessions table"
echo "  2. Migrate existing order work data"
echo "  3. Create indexes"
echo ""
read -p "Proceed with migration? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Migration cancelled."
    exit 0
fi

echo ""

# Step 4: Run migration 001
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}Step 4: Creating work_sessions table...${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" \
  < "001_add_work_sessions_table.sql"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Table created successfully${NC}"
else
    echo -e "${RED}❌ Table creation failed!${NC}"
    exit 1
fi

echo ""

# Step 5: Run migration 002
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}Step 5: Migrating existing data...${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" \
  < "002_migrate_existing_order_data_to_sessions.sql"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Data migrated successfully${NC}"
else
    echo -e "${RED}❌ Data migration failed!${NC}"
    echo -e "${RED}Run rollback: mysql ... < rollback.sql${NC}"
    exit 1
fi

echo ""

# Step 6: Verification
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Step 6: Verification${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" <<EOF
-- Verification queries from 002 migration
SELECT 
  COUNT(*) AS total_sessions,
  COUNT(DISTINCT order_id) AS unique_orders,
  SUM(regular_hours + overtime_hours) AS total_hours,
  ROUND(SUM(calculated_amount + car_usage_amount), 2) AS total_amount
FROM work_sessions;

SELECT 
  YEAR(work_date) AS year,
  MONTH(work_date) AS month,
  COUNT(*) AS sessions_count,
  ROUND(SUM(regular_hours + overtime_hours), 2) AS total_hours
FROM work_sessions
GROUP BY YEAR(work_date), MONTH(work_date)
ORDER BY year DESC, month DESC
LIMIT 12;
EOF

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  ✅ Migration completed successfully!     ║${NC}"
echo -e "${GREEN}╔════════════════════════════════════════════╗${NC}"
echo ""
echo -e "Backup saved to: ${BLUE}../backups/$BACKUP_FILE${NC}"
echo ""

