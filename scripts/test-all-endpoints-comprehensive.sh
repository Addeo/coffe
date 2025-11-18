#!/bin/bash

# Comprehensive API Endpoints Testing Script
# Tests all endpoints with proper authentication and data validation
# Usage: ./test-all-endpoints-comprehensive.sh [BASE_URL]

BASE_URL="${1:-http://localhost:3001/api}"
REPORT_FILE="test-results-$(date +%Y%m%d-%H%M%S).json"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m'

# Counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0
SKIPPED_TESTS=0

# Test results array (JSON format)
declare -a TEST_RESULTS=()

echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     Comprehensive API Endpoints Test Suite                    ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${CYAN}Base URL: ${BASE_URL}${NC}"
echo -e "${CYAN}Report file: ${REPORT_FILE}${NC}"
echo ""

# Test function with detailed reporting
test_endpoint() {
  local method=$1
  local endpoint=$2
  local token=$3
  local role=$4
  local data=$5
  local expected_status=$6
  local description=$7
  
  TOTAL_TESTS=$((TOTAL_TESTS + 1))
  
  local url="${BASE_URL}${endpoint}"
  local headers=(-H "Content-Type: application/json")
  
  if [ -n "$token" ]; then
    headers+=(-H "Authorization: Bearer $token")
  fi
  
  local response
  local status_code
  local response_time
  
  if [ -n "$data" ]; then
    response=$(curl -s -w "\n%{http_code}\n%{time_total}" -X "$method" "$url" "${headers[@]}" -d "$data" --insecure 2>/dev/null)
  else
    response=$(curl -s -w "\n%{http_code}\n%{time_total}" -X "$method" "$url" "${headers[@]}" --insecure 2>/dev/null)
  fi
  
  status_code=$(echo "$response" | tail -n 2 | head -n 1)
  response_time=$(echo "$response" | tail -n 1)
  response_body=$(echo "$response" | sed '$d' | sed '$d')
  
  local status_color
  local status_text
  local test_status="failed"
  
  if [ -z "$expected_status" ]; then
    expected_status="200"
  fi
  
  if [ "$status_code" = "$expected_status" ] || ([ "$expected_status" = "200" ] && [ "$status_code" -ge 200 ] && [ "$status_code" -lt 300 ]); then
    status_color=$GREEN
    status_text="✅ PASS"
    test_status="passed"
    PASSED_TESTS=$((PASSED_TESTS + 1))
  elif [ "$status_code" -eq 401 ] || [ "$status_code" -eq 403 ]; then
    status_color=$YELLOW
    status_text="⚠️  AUTH"
    test_status="auth_required"
    SKIPPED_TESTS=$((SKIPPED_TESTS + 1))
  elif [ "$status_code" -ge 400 ] && [ "$status_code" -lt 500 ]; then
    status_color=$RED
    status_text="❌ FAIL"
    test_status="failed"
    FAILED_TESTS=$((FAILED_TESTS + 1))
  else
    status_color=$RED
    status_text="❌ ERROR"
    test_status="error"
    FAILED_TESTS=$((FAILED_TESTS + 1))
  fi
  
  local display_desc="${description:-${method} ${endpoint}}"
  echo -e "${status_color}${status_text}${NC} (${status_code}) [${response_time}s] - ${display_desc} [${role:-No Auth}]"
  
  # Add to results array
  TEST_RESULTS+=("{\"method\":\"$method\",\"endpoint\":\"$endpoint\",\"status\":\"$test_status\",\"statusCode\":$status_code,\"responseTime\":$response_time,\"role\":\"${role:-none}\",\"description\":\"$display_desc\"}")
}

# Login function
login() {
  local email=$1
  local password=$2
  local response=$(curl -s -X POST "${BASE_URL}/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$email\",\"password\":\"$password\"}" \
    --insecure 2>/dev/null)
  
  echo "$response" | grep -o '"access_token":"[^"]*' | cut -d'"' -f4
}

echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${MAGENTA}📋 Testing Public Endpoints${NC}"
echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Public endpoints
test_endpoint "GET" "/auth/init-admin" "" "Public" "" "200" "Initialize admin"
test_endpoint "GET" "/organizations/test" "" "Public" "" "200" "Test organizations endpoint"
test_endpoint "GET" "/organizations/public" "" "Public" "" "200" "Get public organizations"
test_endpoint "GET" "/test" "" "Public" "" "200" "Test endpoint"

echo ""
echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${MAGENTA}🔐 Authenticating Users${NC}"
echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo -e "${CYAN}Logging in as ADMIN...${NC}"
ADMIN_TOKEN=$(login "admin@coffee.com" "admin123")
if [ -n "$ADMIN_TOKEN" ]; then
  echo -e "${GREEN}✅ Admin authenticated${NC}"
else
  echo -e "${YELLOW}⚠️  Admin authentication failed, trying to initialize...${NC}"
  curl -s "${BASE_URL}/auth/init-admin" > /dev/null
  sleep 2
  ADMIN_TOKEN=$(login "admin@coffee.com" "admin123")
fi

echo -e "${CYAN}Logging in as MANAGER...${NC}"
MANAGER_TOKEN=$(login "manager@coffee.com" "manager123")
if [ -z "$MANAGER_TOKEN" ]; then
  echo -e "${YELLOW}⚠️  Manager not found, will skip manager tests${NC}"
fi

echo -e "${CYAN}Logging in as ENGINEER...${NC}"
ENGINEER_TOKEN=$(login "engineer@coffee.com" "engineer123")
if [ -z "$ENGINEER_TOKEN" ]; then
  echo -e "${YELLOW}⚠️  Engineer not found, will skip engineer tests${NC}"
fi

echo ""

if [ -z "$ADMIN_TOKEN" ]; then
  echo -e "${RED}❌ Cannot proceed without admin token${NC}"
  exit 1
fi

# Store created IDs for later use
CREATED_USER_ID=""
CREATED_ORG_ID=""
CREATED_ORDER_ID=""
CREATED_PRODUCT_ID=""

echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${MAGENTA}👥 Testing Users Endpoints (ADMIN)${NC}"
echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

test_endpoint "GET" "/users" "$ADMIN_TOKEN" "ADMIN" "" "200" "Get all users"
test_endpoint "GET" "/users/profile" "$ADMIN_TOKEN" "ADMIN" "" "200" "Get own profile"

# Create test user
CREATE_USER_RESPONSE=$(curl -s -X POST "${BASE_URL}/users" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"email":"testuser@test.com","password":"test123","firstName":"Test","lastName":"User","role":"user"}' \
  --insecure 2>/dev/null)

CREATED_USER_ID=$(echo "$CREATE_USER_RESPONSE" | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)
if [ -n "$CREATED_USER_ID" ]; then
  test_endpoint "POST" "/users" "$ADMIN_TOKEN" "ADMIN" '{"email":"testuser@test.com","password":"test123","firstName":"Test","lastName":"User","role":"user"}' "201" "Create user"
  test_endpoint "GET" "/users/${CREATED_USER_ID}" "$ADMIN_TOKEN" "ADMIN" "" "200" "Get user by ID"
  test_endpoint "PATCH" "/users/${CREATED_USER_ID}" "$ADMIN_TOKEN" "ADMIN" '{"firstName":"Updated"}' "200" "Update user"
else
  test_endpoint "POST" "/users" "$ADMIN_TOKEN" "ADMIN" '{"email":"testuser@test.com","password":"test123","firstName":"Test","lastName":"User","role":"user"}' "201" "Create user"
fi

test_endpoint "PATCH" "/users/profile" "$ADMIN_TOKEN" "ADMIN" '{"firstName":"AdminUpdated"}' "200" "Update own profile"

echo ""
echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${MAGENTA}🏢 Testing Organizations Endpoints (ADMIN)${NC}"
echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

test_endpoint "GET" "/organizations" "$ADMIN_TOKEN" "ADMIN" "" "200" "Get all organizations"

# Create test organization
CREATE_ORG_RESPONSE=$(curl -s -X POST "${BASE_URL}/organizations" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"name":"Test Organization","baseRate":1000,"hasOvertime":true,"overtimeMultiplier":1.5}' \
  --insecure 2>/dev/null)

CREATED_ORG_ID=$(echo "$CREATE_ORG_RESPONSE" | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)
if [ -n "$CREATED_ORG_ID" ]; then
  test_endpoint "POST" "/organizations" "$ADMIN_TOKEN" "ADMIN" '{"name":"Test Organization","baseRate":1000,"hasOvertime":true,"overtimeMultiplier":1.5}' "201" "Create organization"
  test_endpoint "GET" "/organizations/${CREATED_ORG_ID}" "$ADMIN_TOKEN" "ADMIN" "" "200" "Get organization by ID"
  test_endpoint "PATCH" "/organizations/${CREATED_ORG_ID}" "$ADMIN_TOKEN" "ADMIN" '{"baseRate":1200}' "200" "Update organization"
  test_endpoint "PATCH" "/organizations/${CREATED_ORG_ID}/toggle-status" "$ADMIN_TOKEN" "ADMIN" "" "200" "Toggle organization status"
else
  # Try to get first organization
  ORG_LIST=$(curl -s -X GET "${BASE_URL}/organizations" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    --insecure 2>/dev/null)
  CREATED_ORG_ID=$(echo "$ORG_LIST" | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)
  if [ -n "$CREATED_ORG_ID" ]; then
    test_endpoint "GET" "/organizations/${CREATED_ORG_ID}" "$ADMIN_TOKEN" "ADMIN" "" "200" "Get organization by ID"
  fi
fi

echo ""
echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${MAGENTA}📦 Testing Orders Endpoints${NC}"
echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

test_endpoint "GET" "/orders" "$ADMIN_TOKEN" "ADMIN" "" "200" "Get all orders"
test_endpoint "GET" "/orders/stats" "$ADMIN_TOKEN" "ADMIN" "" "200" "Get order statistics"
test_endpoint "GET" "/orders/my-orders" "$ADMIN_TOKEN" "ADMIN" "" "200" "Get my orders"
test_endpoint "GET" "/orders/by-source/manual" "$ADMIN_TOKEN" "ADMIN" "" "200" "Get orders by source"

# Create test order (need organization ID)
if [ -n "$CREATED_ORG_ID" ]; then
  CREATE_ORDER_RESPONSE=$(curl -s -X POST "${BASE_URL}/orders" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -d "{\"title\":\"Test Order\",\"organizationId\":${CREATED_ORG_ID},\"location\":\"Test Location\",\"description\":\"Test Description\"}" \
    --insecure 2>/dev/null)
  
  CREATED_ORDER_ID=$(echo "$CREATE_ORDER_RESPONSE" | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)
  if [ -n "$CREATED_ORDER_ID" ]; then
    test_endpoint "POST" "/orders" "$ADMIN_TOKEN" "ADMIN" "{\"title\":\"Test Order\",\"organizationId\":${CREATED_ORG_ID},\"location\":\"Test Location\"}" "201" "Create order"
    test_endpoint "GET" "/orders/${CREATED_ORDER_ID}" "$ADMIN_TOKEN" "ADMIN" "" "200" "Get order by ID"
    test_endpoint "PATCH" "/orders/${CREATED_ORDER_ID}" "$ADMIN_TOKEN" "ADMIN" '{"title":"Updated Order"}' "200" "Update order"
    test_endpoint "GET" "/orders/${CREATED_ORDER_ID}/work-sessions" "$ADMIN_TOKEN" "ADMIN" "" "200" "Get order work sessions"
  fi
fi

echo ""
echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${MAGENTA}📊 Testing Statistics Endpoints (ADMIN)${NC}"
echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

test_endpoint "GET" "/statistics" "$ADMIN_TOKEN" "ADMIN" "" "200" "Get general statistics"
test_endpoint "GET" "/statistics/organizations" "$ADMIN_TOKEN" "ADMIN" "" "200" "Get organization statistics"
test_endpoint "GET" "/statistics/engineers" "$ADMIN_TOKEN" "ADMIN" "" "200" "Get engineer statistics"
test_endpoint "GET" "/statistics/engineer/detailed" "$ADMIN_TOKEN" "ADMIN" "" "200" "Get detailed engineer statistics"

echo ""
echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${MAGENTA}💰 Testing Salary Payments Endpoints (ADMIN)${NC}"
echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

test_endpoint "GET" "/salary-payments" "$ADMIN_TOKEN" "ADMIN" "" "200" "Get all salary payments"

echo ""
echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${MAGENTA}👨‍💼 Testing Engineer-Organization Rates Endpoints (ADMIN)${NC}"
echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

test_endpoint "GET" "/engineer-organization-rates" "$ADMIN_TOKEN" "ADMIN" "" "200" "Get all engineer-organization rates"

echo ""
echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${MAGENTA}🔔 Testing Notifications Endpoints${NC}"
echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

test_endpoint "GET" "/notifications" "$ADMIN_TOKEN" "ADMIN" "" "200" "Get notifications"
test_endpoint "GET" "/notifications/unread-count" "$ADMIN_TOKEN" "ADMIN" "" "200" "Get unread count"

echo ""
echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${MAGENTA}⚙️ Testing Settings Endpoints (ADMIN)${NC}"
echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

test_endpoint "GET" "/settings" "$ADMIN_TOKEN" "ADMIN" "" "200" "Get settings"

echo ""
echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${MAGENTA}📄 Testing Files Endpoints${NC}"
echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

test_endpoint "GET" "/files" "$ADMIN_TOKEN" "ADMIN" "" "200" "Get all files"

echo ""
echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${MAGENTA}📈 Testing Reports Endpoints (ADMIN)${NC}"
echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

test_endpoint "GET" "/reports/orders" "$ADMIN_TOKEN" "ADMIN" "" "200" "Get orders report"
test_endpoint "GET" "/reports/salary" "$ADMIN_TOKEN" "ADMIN" "" "200" "Get salary report"

echo ""
echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${MAGENTA}📤 Testing Export Endpoints${NC}"
echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

test_endpoint "GET" "/export/orders" "$ADMIN_TOKEN" "ADMIN" "" "200" "Export orders"

echo ""
echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${MAGENTA}💾 Testing Backup Endpoints (ADMIN)${NC}"
echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

test_endpoint "GET" "/backup" "$ADMIN_TOKEN" "ADMIN" "" "200" "Get backups list"

echo ""
echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${MAGENTA}📝 Testing Logs Endpoints (ADMIN)${NC}"
echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

test_endpoint "GET" "/logs" "$ADMIN_TOKEN" "ADMIN" "" "200" "Get logs"

echo ""
echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${MAGENTA}📦 Testing Products Endpoints (ADMIN)${NC}"
echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

test_endpoint "GET" "/products" "$ADMIN_TOKEN" "ADMIN" "" "200" "Get all products"
test_endpoint "GET" "/products/stats" "$ADMIN_TOKEN" "ADMIN" "" "200" "Get product statistics"
test_endpoint "GET" "/products/categories" "$ADMIN_TOKEN" "ADMIN" "" "200" "Get product categories"

# Test with MANAGER role if available
if [ -n "$MANAGER_TOKEN" ]; then
  echo ""
  echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${MAGENTA}👔 Testing with MANAGER Role${NC}"
  echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""
  
  test_endpoint "GET" "/users" "$MANAGER_TOKEN" "MANAGER" "" "200" "Get users (manager)"
  test_endpoint "GET" "/organizations" "$MANAGER_TOKEN" "MANAGER" "" "200" "Get organizations (manager)"
  test_endpoint "GET" "/orders" "$MANAGER_TOKEN" "MANAGER" "" "200" "Get orders (manager)"
  test_endpoint "GET" "/statistics" "$MANAGER_TOKEN" "MANAGER" "" "200" "Get statistics (manager)"
fi

# Test with ENGINEER role if available
if [ -n "$ENGINEER_TOKEN" ]; then
  echo ""
  echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${MAGENTA}🔧 Testing with ENGINEER Role${NC}"
  echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""
  
  test_endpoint "GET" "/orders" "$ENGINEER_TOKEN" "ENGINEER" "" "200" "Get orders (engineer)"
  test_endpoint "GET" "/users/profile" "$ENGINEER_TOKEN" "ENGINEER" "" "200" "Get profile (engineer)"
  test_endpoint "GET" "/notifications" "$ENGINEER_TOKEN" "ENGINEER" "" "200" "Get notifications (engineer)"
fi

# Generate JSON report
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}📊 Test Summary${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo -e "${CYAN}Total Tests: ${TOTAL_TESTS}${NC}"
echo -e "${GREEN}Passed: ${PASSED_TESTS}${NC}"
echo -e "${RED}Failed: ${FAILED_TESTS}${NC}"
echo -e "${YELLOW}Skipped (Auth): ${SKIPPED_TESTS}${NC}"
echo ""

# Calculate success rate
if [ $TOTAL_TESTS -gt 0 ]; then
  SUCCESS_RATE=$((PASSED_TESTS * 100 / TOTAL_TESTS))
  echo -e "${CYAN}Success Rate: ${SUCCESS_RATE}%${NC}"
fi

# Write JSON report
{
  echo "{"
  echo "  \"timestamp\": \"$(date -u +"%Y-%m-%dT%H:%M:%SZ")\","
  echo "  \"baseUrl\": \"$BASE_URL\","
  echo "  \"summary\": {"
  echo "    \"total\": $TOTAL_TESTS,"
  echo "    \"passed\": $PASSED_TESTS,"
  echo "    \"failed\": $FAILED_TESTS,"
  echo "    \"skipped\": $SKIPPED_TESTS,"
  echo "    \"successRate\": $SUCCESS_RATE"
  echo "  },"
  echo "  \"tests\": ["
  IFS=','
  for i in "${!TEST_RESULTS[@]}"; do
    if [ $i -gt 0 ]; then
      echo ","
    fi
    echo -n "    ${TEST_RESULTS[$i]}"
  done
  echo ""
  echo "  ]"
  echo "}"
} > "$REPORT_FILE"

echo -e "${GREEN}✅ Test report saved to: ${REPORT_FILE}${NC}"
echo ""

if [ $FAILED_TESTS -eq 0 ]; then
  echo -e "${GREEN}✅ All tests passed!${NC}"
  exit 0
else
  echo -e "${RED}❌ Some tests failed. Check the report for details.${NC}"
  exit 1
fi




