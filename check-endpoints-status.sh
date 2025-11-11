#!/bin/bash

# Script to check which endpoints are working and which are not
# Tests endpoints on the actual VPS

BASE_URL="${1:-http://192.144.12.102:3001/api}"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Test results storage
WORKING=()
NOT_WORKING=()
NEEDS_AUTH=()

echo -e "${BLUE}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  API Endpoints Status Check                         ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${CYAN}Base URL: ${BASE_URL}${NC}"
echo ""

# Helper to test endpoint
test_endpoint() {
  local method=$1
  local endpoint=$2
  local token=$3
  local name=$4
  
  local url="${BASE_URL}${endpoint}"
  local headers=(-H "Content-Type: application/json")
  
  if [ -n "$token" ]; then
    headers+=(-H "Authorization: Bearer $token")
  fi
  
  local status_code=$(curl -s -o /dev/null -w "%{http_code}" -X "$method" "$url" "${headers[@]}" --insecure 2>/dev/null)
  
  if [ "$status_code" -ge 200 ] && [ "$status_code" -lt 300 ]; then
    echo -e "${GREEN}✅ WORKING${NC} (${status_code}) - ${method} ${endpoint}"
    WORKING+=("${method} ${endpoint}")
  elif [ "$status_code" -eq 401 ]; then
    echo -e "${YELLOW}🔐 NEEDS AUTH${NC} (${status_code}) - ${method} ${endpoint}"
    NEEDS_AUTH+=("${method} ${endpoint}")
  elif [ "$status_code" -eq 403 ]; then
    echo -e "${YELLOW}🔐 FORBIDDEN${NC} (${status_code}) - ${method} ${endpoint} [Expected if role is wrong]"
    WORKING+=("${method} ${endpoint} [403 - Access control working]")
  elif [ "$status_code" -eq 404 ]; then
    echo -e "${YELLOW}⚠️  NOT FOUND${NC} (${status_code}) - ${method} ${endpoint} [Resource may not exist]"
    NOT_WORKING+=("${method} ${endpoint} [404]")
  elif [ "$status_code" -eq 500 ]; then
    echo -e "${RED}❌ SERVER ERROR${NC} (${status_code}) - ${method} ${endpoint}"
    NOT_WORKING+=("${method} ${endpoint} [500]")
  elif [ "$status_code" -eq 000 ]; then
    echo -e "${RED}❌ CONNECTION FAILED${NC} - ${method} ${endpoint}"
    NOT_WORKING+=("${method} ${endpoint} [Connection failed]")
  else
    echo -e "${RED}❌ ERROR${NC} (${status_code}) - ${method} ${endpoint}"
    NOT_WORKING+=("${method} ${endpoint} [${status_code}]")
  fi
}

# Get tokens
echo -e "${CYAN}📋 Getting authentication tokens...${NC}"
ADMIN_TOKEN=$(curl -s -X POST "${BASE_URL}/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@coffee.com","password":"admin123"}' \
  --insecure | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)

if [ -n "$ADMIN_TOKEN" ]; then
  echo -e "${GREEN}✅ Admin token obtained${NC}"
else
  echo -e "${RED}❌ Failed to get admin token${NC}"
  ADMIN_TOKEN=""
fi

echo ""
echo -e "${BLUE}📋 Testing Public Endpoints (No Auth Required)...${NC}"
echo ""

test_endpoint "GET" "/auth/init-admin" "" "Init Admin"
test_endpoint "GET" "/organizations/test" "" "Organizations Test"
test_endpoint "GET" "/organizations/public" "" "Organizations Public"
test_endpoint "GET" "/test" "" "Test"
test_endpoint "GET" "/app/version" "" "App Version"

echo ""
echo -e "${BLUE}📋 Testing Endpoints WITHOUT Authentication (Should return 401)...${NC}"
echo ""

test_endpoint "GET" "/users" "" "Users List"
test_endpoint "GET" "/orders" "" "Orders List"
test_endpoint "GET" "/organizations" "" "Organizations List"
test_endpoint "GET" "/statistics/monthly" "" "Statistics Monthly"
test_endpoint "GET" "/notifications" "" "Notifications"
test_endpoint "GET" "/users/profile" "" "User Profile"

echo ""
echo -e "${BLUE}📋 Testing Endpoints WITH Admin Token...${NC}"
echo ""

if [ -n "$ADMIN_TOKEN" ]; then
  test_endpoint "GET" "/users" "$ADMIN_TOKEN" "Users List"
  test_endpoint "GET" "/users/profile" "$ADMIN_TOKEN" "User Profile"
  test_endpoint "GET" "/organizations" "$ADMIN_TOKEN" "Organizations List"
  test_endpoint "GET" "/orders" "$ADMIN_TOKEN" "Orders List"
  test_endpoint "GET" "/orders/stats" "$ADMIN_TOKEN" "Orders Stats"
  test_endpoint "GET" "/statistics/monthly" "$ADMIN_TOKEN" "Statistics Monthly"
  test_endpoint "GET" "/statistics/admin/engineers" "$ADMIN_TOKEN" "Statistics Admin Engineers"
  test_endpoint "GET" "/statistics/comprehensive" "$ADMIN_TOKEN" "Statistics Comprehensive"
  test_endpoint "GET" "/notifications" "$ADMIN_TOKEN" "Notifications"
  test_endpoint "GET" "/notifications/unread-count" "$ADMIN_TOKEN" "Notifications Unread Count"
  test_endpoint "GET" "/logs" "$ADMIN_TOKEN" "Logs"
  test_endpoint "GET" "/backup/list" "$ADMIN_TOKEN" "Backup List"
  test_endpoint "GET" "/engineer-organization-rates" "$ADMIN_TOKEN" "Engineer Rates"
  test_endpoint "GET" "/salary-payments/balances" "$ADMIN_TOKEN" "Salary Payments Balances"
  test_endpoint "GET" "/calculations/salary" "$ADMIN_TOKEN" "Calculations Salary"
  test_endpoint "GET" "/calculations/statistics" "$ADMIN_TOKEN" "Calculations Statistics"
  test_endpoint "GET" "/work-sessions/my/sessions" "$ADMIN_TOKEN" "Work Sessions My"
  test_endpoint "GET" "/settings/auto-distribution" "$ADMIN_TOKEN" "Settings Auto Distribution"
  test_endpoint "GET" "/reports/engineer-salaries-chart" "$ADMIN_TOKEN" "Reports Engineer Salaries"
  test_endpoint "GET" "/export/orders" "$ADMIN_TOKEN" "Export Orders"
  test_endpoint "GET" "/files" "$ADMIN_TOKEN" "Files List"
  test_endpoint "GET" "/products" "$ADMIN_TOKEN" "Products List"
else
  echo -e "${RED}⚠️  Skipping authenticated tests (no admin token)${NC}"
fi

echo ""
echo -e "${BLUE}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Summary                                            ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${GREEN}✅ Working Endpoints: ${#WORKING[@]}${NC}"
for endpoint in "${WORKING[@]}"; do
  echo "   - $endpoint"
done

echo ""
echo -e "${YELLOW}🔐 Endpoints Requiring Authentication: ${#NEEDS_AUTH[@]}${NC}"
for endpoint in "${NEEDS_AUTH[@]}"; do
  echo "   - $endpoint"
done

echo ""
echo -e "${RED}❌ Not Working / Errors: ${#NOT_WORKING[@]}${NC}"
for endpoint in "${NOT_WORKING[@]}"; do
  echo "   - $endpoint"
done

echo ""
echo -e "${CYAN}💡 Note:${NC}"
echo -e "${CYAN}   - 401/403 responses indicate working access control${NC}"
echo -e "${CYAN}   - 404 may indicate missing resources (not necessarily broken)${NC}"
echo -e "${CYAN}   - 500 indicates server errors that need fixing${NC}"

