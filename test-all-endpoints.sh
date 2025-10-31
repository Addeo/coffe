#!/bin/bash

# Comprehensive API Endpoints Test Script
# Tests all endpoints with all roles to verify access control

BASE_URL="${1:-http://192.144.12.102:3001/api}"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${BLUE}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Comprehensive API Endpoints Test                   ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${CYAN}Base URL: ${BASE_URL}${NC}"
echo ""

# Helper function to get token
get_token() {
  local email=$1
  local password=$2
  local response=$(curl -s -X POST "${BASE_URL}/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"${email}\",\"password\":\"${password}\"}" \
    --insecure)
  
  echo "$response" | grep -o '"access_token":"[^"]*' | cut -d'"' -f4
}

# Helper function to test endpoint
test_endpoint() {
  local method=$1
  local endpoint=$2
  local token=$3
  local role=$4
  local expected_status=$5
  local data=$6
  
  local url="${BASE_URL}${endpoint}"
  local headers=(-H "Content-Type: application/json")
  
  if [ -n "$token" ]; then
    headers+=(-H "Authorization: Bearer $token")
  fi
  
  local status_code
  if [ -n "$data" ]; then
    status_code=$(curl -s -o /dev/null -w "%{http_code}" -X "$method" "$url" "${headers[@]}" -d "$data" --insecure 2>/dev/null)
  else
    status_code=$(curl -s -o /dev/null -w "%{http_code}" -X "$method" "$url" "${headers[@]}" --insecure 2>/dev/null)
  fi
  
  local status_color
  local status_text
  
  if [ "$status_code" == "$expected_status" ]; then
    status_color=$GREEN
    status_text="✅ PASS"
  elif [ -z "$expected_status" ]; then
    # No expected status - just show result
    if [ "$status_code" -ge 200 ] && [ "$status_code" -lt 300 ]; then
      status_color=$GREEN
      status_text="✅ OK"
    elif [ "$status_code" -eq 401 ] || [ "$status_code" -eq 403 ]; then
      status_color=$YELLOW
      status_text="⚠️  FORBIDDEN"
    else
      status_color=$RED
      status_text="❌ ERROR"
    fi
  else
    status_color=$RED
    status_text="❌ FAIL"
  fi
  
  printf "${status_color}${status_text}${NC} (${status_code})"
  if [ -n "$expected_status" ]; then
    printf " [Expected: ${expected_status}]"
  fi
  echo " - ${method} ${endpoint} [${role:-No Auth}]"
}

# Test suite
echo -e "${BLUE}📋 Step 1: Testing Public Endpoints...${NC}"
echo ""

test_endpoint "GET" "/auth/init-admin" "" "Public"
test_endpoint "GET" "/organizations/test" "" "Public"
test_endpoint "GET" "/organizations/public" "" "Public"
test_endpoint "GET" "/test" "" "Public"

echo ""
echo -e "${BLUE}📋 Step 2: Getting Authentication Tokens...${NC}"
echo ""

echo -e "${CYAN}Getting ADMIN token...${NC}"
ADMIN_TOKEN=$(get_token "admin@coffee.com" "admin123")
if [ -n "$ADMIN_TOKEN" ]; then
  echo -e "${GREEN}✅ ADMIN token obtained${NC}"
else
  echo -e "${RED}❌ Failed to get ADMIN token${NC}"
  exit 1
fi

echo -e "${CYAN}Getting MANAGER token...${NC}"
MANAGER_TOKEN=$(get_token "manager@coffee.com" "manager123")
if [ -n "$MANAGER_TOKEN" ]; then
  echo -e "${GREEN}✅ MANAGER token obtained${NC}"
else
  echo -e "${YELLOW}⚠️  MANAGER token not available (may need to create user)${NC}"
fi

echo -e "${CYAN}Getting USER token...${NC}"
USER_TOKEN=$(get_token "engineer@coffee.com" "engineer123")
if [ -n "$USER_TOKEN" ]; then
  echo -e "${GREEN}✅ USER token obtained${NC}"
else
  echo -e "${YELLOW}⚠️  USER token not available (may need to create user)${NC}"
fi

echo ""
echo -e "${BLUE}📋 Step 3: Testing ADMIN Access...${NC}"
echo ""

if [ -n "$ADMIN_TOKEN" ]; then
  test_endpoint "GET" "/users" "$ADMIN_TOKEN" "ADMIN" "200"
  test_endpoint "POST" "/organizations" "$ADMIN_TOKEN" "ADMIN" "200" '{"name":"Test","baseRate":500}'
  test_endpoint "GET" "/organizations" "$ADMIN_TOKEN" "ADMIN" "200"
  test_endpoint "GET" "/orders" "$ADMIN_TOKEN" "ADMIN" "200"
  test_endpoint "GET" "/statistics/monthly" "$ADMIN_TOKEN" "ADMIN" "200"
  test_endpoint "GET" "/statistics/admin/engineers" "$ADMIN_TOKEN" "ADMIN" "200"
  test_endpoint "GET" "/logs" "$ADMIN_TOKEN" "ADMIN" "200"
  test_endpoint "GET" "/backup" "$ADMIN_TOKEN" "ADMIN" "200"
  test_endpoint "GET" "/engineer-organization-rates" "$ADMIN_TOKEN" "ADMIN" "200"
fi

echo ""
echo -e "${BLUE}📋 Step 4: Testing MANAGER Access...${NC}"
echo ""

if [ -n "$MANAGER_TOKEN" ]; then
  test_endpoint "GET" "/users" "$MANAGER_TOKEN" "MANAGER" "200"
  test_endpoint "GET" "/organizations" "$MANAGER_TOKEN" "MANAGER" "200"
  test_endpoint "POST" "/organizations" "$MANAGER_TOKEN" "MANAGER" "403"
  test_endpoint "GET" "/orders" "$MANAGER_TOKEN" "MANAGER" "200"
  test_endpoint "POST" "/orders" "$MANAGER_TOKEN" "MANAGER" "200" '{"title":"Test","organizationId":1,"location":"Test"}'
  test_endpoint "GET" "/statistics/monthly" "$MANAGER_TOKEN" "MANAGER" "200"
  test_endpoint "GET" "/statistics/admin/engineers" "$MANAGER_TOKEN" "MANAGER" "403"
  test_endpoint "GET" "/logs" "$MANAGER_TOKEN" "MANAGER" "403"
  test_endpoint "GET" "/backup" "$MANAGER_TOKEN" "MANAGER" "403"
fi

echo ""
echo -e "${BLUE}📋 Step 5: Testing USER (Engineer) Access...${NC}"
echo ""

if [ -n "$USER_TOKEN" ]; then
  test_endpoint "GET" "/users" "$USER_TOKEN" "USER" "403"
  test_endpoint "GET" "/organizations" "$USER_TOKEN" "USER" "403"
  test_endpoint "GET" "/orders" "$USER_TOKEN" "USER" "200"
  test_endpoint "POST" "/orders" "$USER_TOKEN" "USER" "403"
  test_endpoint "GET" "/users/profile" "$USER_TOKEN" "USER" "200"
  test_endpoint "GET" "/notifications" "$USER_TOKEN" "USER" "200"
  test_endpoint "GET" "/statistics/engineer/detailed" "$USER_TOKEN" "USER" "200"
  test_endpoint "GET" "/statistics/monthly" "$USER_TOKEN" "USER" "403"
  test_endpoint "GET" "/logs" "$USER_TOKEN" "USER" "403"
fi

echo ""
echo -e "${BLUE}📋 Step 6: Testing Unauthorized Access...${NC}"
echo ""

test_endpoint "GET" "/users" "" "No Auth" "401"
test_endpoint "GET" "/orders" "" "No Auth" "401"
test_endpoint "GET" "/organizations" "" "No Auth" "401"
test_endpoint "POST" "/orders" "" "No Auth" "401"

echo ""
echo -e "${GREEN}✅ Testing completed!${NC}"
echo ""
echo -e "${CYAN}💡 Summary:${NC}"
echo -e "${CYAN}   - ✅ PASS: Endpoint responded as expected${NC}"
echo -e "${CYAN}   - ❌ FAIL: Endpoint did not respond as expected${NC}"
echo -e "${CYAN}   - ⚠️  FORBIDDEN: Access denied (may be expected)${NC}"
echo ""
echo -e "${YELLOW}⚠️  Note: Some endpoints may return 404 if resources don't exist.${NC}"
echo -e "${YELLOW}    This is different from 403 (Forbidden) or 401 (Unauthorized).${NC}"

