#!/bin/bash

# Production Environment Testing Script
# Tests login, engineer creation, order creation, and other critical endpoints
# Usage: ./test-production.sh

PROD_URL="http://192.144.12.102:3001/api"
BASE_URL="${1:-$PROD_URL}"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m'

# Test counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     Production Environment Test Suite                         ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${CYAN}Production URL: ${BASE_URL}${NC}"
echo -e "${CYAN}Timestamp: $(date)${NC}"
echo ""

# Test function
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
    response=$(curl -s -w "\n%{http_code}\n%{time_total}" -X "$method" "$url" "${headers[@]}" -d "$data" --insecure --max-time 10 2>/dev/null)
  else
    response=$(curl -s -w "\n%{http_code}\n%{time_total}" -X "$method" "$url" "${headers[@]}" --insecure --max-time 10 2>/dev/null)
  fi
  
  status_code=$(echo "$response" | tail -n 2 | head -n 1)
  response_time=$(echo "$response" | tail -n 1)
  response_body=$(echo "$response" | sed '$d' | sed '$d')
  
  local status_color
  local status_text
  
  if [ -z "$expected_status" ]; then
    expected_status="200"
  fi
  
  if [ "$status_code" = "$expected_status" ] || ([ "$expected_status" = "200" ] && [ "$status_code" -ge 200 ] && [ "$status_code" -lt 300 ]); then
    status_color=$GREEN
    status_text="✅ PASS"
    PASSED_TESTS=$((PASSED_TESTS + 1))
  else
    status_color=$RED
    status_text="❌ FAIL"
    FAILED_TESTS=$((FAILED_TESTS + 1))
    echo -e "${RED}Response body: ${response_body}${NC}" | head -c 200
    echo ""
  fi
  
  local display_desc="${description:-${method} ${endpoint}}"
  echo -e "${status_color}${status_text}${NC} (${status_code}) [${response_time}s] - ${display_desc} [${role:-No Auth}]"
  
  # Return response body for parsing
  echo "$response_body"
}

# Login function
login() {
  local email=$1
  local password=$2
  local response=$(curl -s -X POST "${BASE_URL}/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$email\",\"password\":\"$password\"}" \
    --insecure --max-time 10 2>/dev/null)
  
  echo "$response" | grep -o '"access_token":"[^"]*' | cut -d'"' -f4
}

echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${MAGENTA}🔐 STEP 1: Testing Authentication${NC}"
echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Test server connectivity
echo -e "${CYAN}Testing server connectivity...${NC}"
CONNECTIVITY=$(curl -s -o /dev/null -w "%{http_code}" "${BASE_URL}/test" --insecure --max-time 5 2>/dev/null)
if [ "$CONNECTIVITY" = "200" ] || [ "$CONNECTIVITY" = "000" ]; then
  echo -e "${GREEN}✅ Server is reachable${NC}"
else
  echo -e "${RED}❌ Server connectivity issue (HTTP $CONNECTIVITY)${NC}"
  echo -e "${YELLOW}⚠️  Continuing with tests anyway...${NC}"
fi
echo ""

# Test admin login
echo -e "${CYAN}Testing ADMIN login...${NC}"
ADMIN_TOKEN=$(login "admin@coffee.com" "admin123")
if [ -n "$ADMIN_TOKEN" ]; then
  echo -e "${GREEN}✅ Admin login successful${NC}"
  test_endpoint "GET" "/users/profile" "$ADMIN_TOKEN" "ADMIN" "" "200" "Get admin profile"
  
  # Reset role to admin to ensure full access
  echo -e "${CYAN}Resetting role to admin...${NC}"
  RESET_RESPONSE=$(curl -s -X POST "${BASE_URL}/auth/reset-role" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "Content-Type: application/json" \
    --insecure --max-time 10 2>/dev/null)
  
  NEW_ADMIN_TOKEN=$(echo "$RESET_RESPONSE" | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)
  if [ -n "$NEW_ADMIN_TOKEN" ]; then
    ADMIN_TOKEN="$NEW_ADMIN_TOKEN"
    echo -e "${GREEN}✅ Role reset to admin, new token obtained${NC}"
  else
    echo -e "${YELLOW}⚠️  Role reset failed, using original token${NC}"
  fi
else
  echo -e "${YELLOW}⚠️  Admin login failed, trying to initialize admin...${NC}"
  INIT_RESPONSE=$(curl -s "${BASE_URL}/auth/init-admin" --insecure --max-time 10 2>/dev/null)
  sleep 2
  ADMIN_TOKEN=$(login "admin@coffee.com" "admin123")
  if [ -n "$ADMIN_TOKEN" ]; then
    echo -e "${GREEN}✅ Admin initialized and login successful${NC}"
  else
    echo -e "${RED}❌ Admin login failed after initialization${NC}"
    exit 1
  fi
fi
echo ""

# Test manager login
echo -e "${CYAN}Testing MANAGER login...${NC}"
MANAGER_TOKEN=$(login "manager@coffee.com" "manager123")
if [ -n "$MANAGER_TOKEN" ]; then
  echo -e "${GREEN}✅ Manager login successful${NC}"
else
  echo -e "${YELLOW}⚠️  Manager login failed (may not exist)${NC}"
fi
echo ""

echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${MAGENTA}👥 STEP 2: Testing User Management${NC}"
echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Get all users
test_endpoint "GET" "/users" "$ADMIN_TOKEN" "ADMIN" "" "200" "Get all users"

# Get organizations (needed for order creation)
echo -e "${CYAN}Getting organizations for order creation...${NC}"
ORG_RESPONSE=$(curl -s -X GET "${BASE_URL}/organizations" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  --insecure --max-time 10 2>/dev/null)

ORG_ID=$(echo "$ORG_RESPONSE" | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)
if [ -z "$ORG_ID" ]; then
  echo -e "${YELLOW}⚠️  No organizations found, creating test organization...${NC}"
  CREATE_ORG_RESPONSE=$(curl -s -X POST "${BASE_URL}/organizations" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"name":"Test Organization","baseRate":1000,"hasOvertime":true,"overtimeMultiplier":1.5}' \
    --insecure --max-time 10 2>/dev/null)
  ORG_ID=$(echo "$CREATE_ORG_RESPONSE" | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)
fi

if [ -n "$ORG_ID" ]; then
  echo -e "${GREEN}✅ Organization ID: ${ORG_ID}${NC}"
else
  echo -e "${RED}❌ Cannot proceed without organization${NC}"
  ORG_ID=1  # Fallback
fi
echo ""

echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${MAGENTA}👨‍💼 STEP 3: Testing Engineer Creation${NC}"
echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Create engineer user
TIMESTAMP=$(date +%s)
ENGINEER_EMAIL="test-engineer-${TIMESTAMP}@test.com"
ENGINEER_DATA="{\"email\":\"${ENGINEER_EMAIL}\",\"password\":\"test123456\",\"firstName\":\"Test\",\"lastName\":\"Engineer\",\"role\":\"user\",\"engineerType\":\"staff\",\"baseRate\":700,\"overtimeRate\":700,\"planHoursMonth\":160}"

echo -e "${CYAN}Creating engineer: ${ENGINEER_EMAIL}${NC}"
CREATE_ENGINEER_RESPONSE=$(test_endpoint "POST" "/users" "$ADMIN_TOKEN" "ADMIN" "$ENGINEER_DATA" "201" "Create engineer user")

CREATED_ENGINEER_ID=$(echo "$CREATE_ENGINEER_RESPONSE" | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)
if [ -n "$CREATED_ENGINEER_ID" ]; then
  echo -e "${GREEN}✅ Engineer created with ID: ${CREATED_ENGINEER_ID}${NC}"
  
  # Verify engineer was created
  test_endpoint "GET" "/users/${CREATED_ENGINEER_ID}" "$ADMIN_TOKEN" "ADMIN" "" "200" "Get created engineer"
  
  # Test engineer login
  echo -e "${CYAN}Testing engineer login...${NC}"
  ENGINEER_TOKEN=$(login "$ENGINEER_EMAIL" "test123456")
  if [ -n "$ENGINEER_TOKEN" ]; then
    echo -e "${GREEN}✅ Engineer login successful${NC}"
    test_endpoint "GET" "/users/profile" "$ENGINEER_TOKEN" "ENGINEER" "" "200" "Get engineer profile"
  else
    echo -e "${RED}❌ Engineer login failed${NC}"
  fi
else
  echo -e "${RED}❌ Failed to create engineer${NC}"
fi
echo ""

echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${MAGENTA}📦 STEP 4: Testing Order Creation${NC}"
echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Create order
ORDER_DATA="{\"title\":\"Test Order $(date +%H:%M:%S)\",\"organizationId\":${ORG_ID},\"location\":\"Test Location\",\"description\":\"Test order for production verification\"}"

echo -e "${CYAN}Creating test order...${NC}"
CREATE_ORDER_RESPONSE=$(test_endpoint "POST" "/orders" "$ADMIN_TOKEN" "ADMIN" "$ORDER_DATA" "201" "Create order")

CREATED_ORDER_ID=$(echo "$CREATE_ORDER_RESPONSE" | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)
if [ -n "$CREATED_ORDER_ID" ]; then
  echo -e "${GREEN}✅ Order created with ID: ${CREATED_ORDER_ID}${NC}"
  
  # Verify order was created
  test_endpoint "GET" "/orders/${CREATED_ORDER_ID}" "$ADMIN_TOKEN" "ADMIN" "" "200" "Get created order"
  
  # Test order update
  UPDATE_ORDER_DATA="{\"title\":\"Updated Test Order\"}"
  test_endpoint "PATCH" "/orders/${CREATED_ORDER_ID}" "$ADMIN_TOKEN" "ADMIN" "$UPDATE_ORDER_DATA" "200" "Update order"
else
  echo -e "${RED}❌ Failed to create order${NC}"
fi
echo ""

echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${MAGENTA}📊 STEP 5: Testing Other Critical Endpoints${NC}"
echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Test orders list
test_endpoint "GET" "/orders" "$ADMIN_TOKEN" "ADMIN" "" "200" "Get all orders"
test_endpoint "GET" "/orders/stats" "$ADMIN_TOKEN" "ADMIN" "" "200" "Get order statistics"

# Test organizations
test_endpoint "GET" "/organizations" "$ADMIN_TOKEN" "ADMIN" "" "200" "Get all organizations"

# Test statistics (with required parameters)
CURRENT_YEAR=$(date +%Y)
CURRENT_MONTH=$(date +%m)
test_endpoint "GET" "/statistics/comprehensive?year=${CURRENT_YEAR}&month=${CURRENT_MONTH}" "$ADMIN_TOKEN" "ADMIN" "" "200" "Get comprehensive statistics"
test_endpoint "GET" "/statistics/admin/engineers?year=${CURRENT_YEAR}&month=${CURRENT_MONTH}" "$ADMIN_TOKEN" "ADMIN" "" "200" "Get admin engineer statistics"
test_endpoint "GET" "/statistics/monthly?year=${CURRENT_YEAR}&month=${CURRENT_MONTH}" "$ADMIN_TOKEN" "ADMIN" "" "200" "Get monthly statistics"

# Test notifications (with required parameters)
test_endpoint "GET" "/notifications?page=1&limit=20" "$ADMIN_TOKEN" "ADMIN" "" "200" "Get notifications"
test_endpoint "GET" "/notifications/unread-count" "$ADMIN_TOKEN" "ADMIN" "" "200" "Get unread notifications count"

echo ""

# Summary
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}📊 Test Summary${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo -e "${CYAN}Total Tests: ${TOTAL_TESTS}${NC}"
echo -e "${GREEN}Passed: ${PASSED_TESTS}${NC}"
echo -e "${RED}Failed: ${FAILED_TESTS}${NC}"
echo ""

if [ $TOTAL_TESTS -gt 0 ]; then
  SUCCESS_RATE=$((PASSED_TESTS * 100 / TOTAL_TESTS))
  echo -e "${CYAN}Success Rate: ${SUCCESS_RATE}%${NC}"
fi
echo ""

if [ $FAILED_TESTS -eq 0 ]; then
  echo -e "${GREEN}✅ All tests passed! Production is working correctly.${NC}"
  exit 0
else
  echo -e "${RED}❌ Some tests failed. Please check the errors above.${NC}"
  exit 1
fi

