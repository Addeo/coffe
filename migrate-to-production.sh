#!/bin/bash

# ============================================
# Migrate Local SQLite Database to Production MySQL
# ============================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

echo -e "${PURPLE}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${PURPLE}║  Migrate Local SQLite to Production MySQL           ║${NC}"
echo -e "${PURPLE}╚══════════════════════════════════════════════════════╝${NC}"
echo ""

# Configuration
LOCAL_DB="backend/database.sqlite"
PRODUCTION_HOST="${DB_HOST:-192.144.12.102}"
PRODUCTION_PORT="${DB_PORT:-3306}"
PRODUCTION_USER="${DB_USERNAME:-coffee_user}"
PRODUCTION_PASSWORD="${DB_PASSWORD}"
PRODUCTION_DB="${DB_DATABASE:-coffee_admin}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="migration-backup-$TIMESTAMP"
DUMP_FILE="migration-dump-$TIMESTAMP.sql"

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check required tools
echo -e "${YELLOW}Checking required tools...${NC}"

if ! command_exists sqlite3; then
    echo -e "${RED}❌ sqlite3 not found. Please install it:${NC}"
    echo "   macOS: brew install sqlite3"
    echo "   Linux: apt-get install sqlite3"
    exit 1
fi

if ! command_exists mysql; then
    echo -e "${RED}❌ mysql client not found. Please install it:${NC}"
    echo "   macOS: brew install mysql"
    echo "   Linux: apt-get install mysql-client"
    exit 1
fi

echo -e "${GREEN}✅ All tools installed${NC}"
echo ""

# Check if local database exists
if [ ! -f "$LOCAL_DB" ]; then
    echo -e "${RED}❌ Local database not found: $LOCAL_DB${NC}"
    exit 1
fi

# Get local database info
echo -e "${BLUE}Local Database Info:${NC}"
echo "  File: $LOCAL_DB"
echo "  Size: $(du -h "$LOCAL_DB" | cut -f1)"
echo ""

# Check production connection
echo -e "${YELLOW}Checking production database connection...${NC}"

if mysql -h "$PRODUCTION_HOST" -P "$PRODUCTION_PORT" -u "$PRODUCTION_USER" -p"$PRODUCTION_PASSWORD" "$PRODUCTION_DB" -e "SELECT 1;" >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Successfully connected to production database${NC}"
else
    echo -e "${RED}❌ Failed to connect to production database${NC}"
    echo ""
    echo "Please check your database credentials:"
    echo "  DB_HOST=$PRODUCTION_HOST"
    echo "  DB_PORT=$PRODUCTION_PORT"
    echo "  DB_USERNAME=$PRODUCTION_USER"
    echo "  DB_DATABASE=$PRODUCTION_DB"
    exit 1
fi

echo ""

# Show production database info
echo -e "${BLUE}Production Database Info:${NC}"
mysql -h "$PRODUCTION_HOST" -P "$PRODUCTION_PORT" -u "$PRODUCTION_USER" -p"$PRODUCTION_PASSWORD" "$PRODUCTION_DB" -e "
SELECT 
    table_name as 'Table',
    table_rows as 'Rows'
FROM information_schema.tables
WHERE table_schema = '$PRODUCTION_DB'
ORDER BY table_name;
" 2>/dev/null || echo "  (Unable to get table info)"

echo ""

# Confirmation
echo -e "${YELLOW}⚠️  WARNING: This will overwrite data in production!${NC}"
echo -e "${YELLOW}Target database: ${PRODUCTION_HOST}/${PRODUCTION_DB}${NC}"
echo ""
read -p "Do you want to continue? (type 'yes' to confirm): " confirm

if [ "$confirm" != "yes" ]; then
    echo -e "${RED}Migration cancelled.${NC}"
    exit 0
fi

echo ""

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Step 1: Export SQLite to SQL dump
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}Step 1: Exporting SQLite database...${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

sqlite3 "$LOCAL_DB" .dump > "$BACKUP_DIR/$DUMP_FILE"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Exported to: $BACKUP_DIR/$DUMP_FILE${NC}"
    echo "  Size: $(du -h "$BACKUP_DIR/$DUMP_FILE" | cut -f1)"
else
    echo -e "${RED}❌ Export failed${NC}"
    exit 1
fi

echo ""

# Step 2: Convert SQLite dump to MySQL compatible format
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}Step 2: Converting to MySQL format...${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

MYSQL_DUMP="$BACKUP_DIR/mysql-$DUMP_FILE"

# Convert SQLite syntax to MySQL syntax
sed -E '
s/INTEGER PRIMARY KEY AUTOINCREMENT/BIGINT AUTO_INCREMENT PRIMARY KEY/g
s/INTEGER PRIMARY KEY/BIGINT PRIMARY KEY/g
s/INTEGER NOT NULL/BIGINT NOT NULL/g
s/INTEGER/BIGINT/g
s/BOOLEAN/TINYINT(1)/g
s/REFERENCES /FOREIGN KEY REFERENCES /g
s/,PRIMARY KEY/, PRIMARY KEY/g
/^PRAGMA/d
/^BEGIN TRANSACTION/d
/^COMMIT/d
/^ROLLBACK/d
/^\./d
' "$BACKUP_DIR/$DUMP_FILE" | \
    grep -v "^SET \|^SELECT \|^CREATE TABLE sqlite_\|^CREATE UNIQUE INDEX \|^INSERT INTO sqlite_" > "$MYSQL_DUMP"

echo -e "${GREEN}✅ Converted to: $MYSQL_DUMP${NC}"
echo "  Size: $(du -h "$MYSQL_DUMP" | cut -f1)"

echo ""

# Step 3: Create production backup
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}Step 3: Creating production backup...${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

PRODUCTION_BACKUP="$BACKUP_DIR/production-backup-$TIMESTAMP.sql"

mysqldump -h "$PRODUCTION_HOST" -P "$PRODUCTION_PORT" -u "$PRODUCTION_USER" -p"$PRODUCTION_PASSWORD" \
    "$PRODUCTION_DB" > "$PRODUCTION_BACKUP"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Production backup created: $PRODUCTION_BACKUP${NC}"
    echo "  Size: $(du -h "$PRODUCTION_BACKUP" | cut -f1)"
else
    echo -e "${RED}❌ Production backup failed${NC}"
    exit 1
fi

echo ""

# Step 4: Import to production
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}Step 4: Importing to production database...${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

mysql -h "$PRODUCTION_HOST" -P "$PRODUCTION_PORT" -u "$PRODUCTION_USER" -p"$PRODUCTION_PASSWORD" "$PRODUCTION_DB" < "$MYSQL_DUMP"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Successfully imported to production${NC}"
else
    echo -e "${RED}❌ Import failed${NC}"
    exit 1
fi

echo ""

# Step 5: Verify migration
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Step 5: Verification${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

echo "Tables in production:"
mysql -h "$PRODUCTION_HOST" -P "$PRODUCTION_PORT" -u "$PRODUCTION_USER" -p"$PRODUCTION_PASSWORD" "$PRODUCTION_DB" -e "
SELECT 
    table_name as 'Table',
    table_rows as 'Rows'
FROM information_schema.tables
WHERE table_schema = '$PRODUCTION_DB'
ORDER BY table_name;
"

echo ""
echo -e "${GREEN}✅ Migration completed successfully!${NC}"
echo ""
echo -e "${BLUE}Backup files saved in: $BACKUP_DIR/${NC}"
echo "  - SQLite dump: $DUMP_FILE"
echo "  - MySQL dump: mysql-$DUMP_FILE"
echo "  - Production backup: production-backup-$TIMESTAMP.sql"
