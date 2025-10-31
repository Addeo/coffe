#!/bin/bash

# Script to test all API endpoints with different roles
# Usage: ./test-api-endpoints.sh [BASE_URL]

BASE_URL="${1:-http://192.144.12.102:3001/api}"
VPS_HOST="${VPS_HOST:-192.144.12.102}"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${BLUE}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  API Endpoints Test Suite                           ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${CYAN}Base URL: ${BASE_URL}${NC}"
echo ""

# Test function
test_endpoint() {
  local method=$1
  local endpoint=$2
  local token=$3
  local role=$4
  local data=$5
  
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
  
  if [ "$status_code" -ge 200 ] && [ "$status_code" -lt 300 ]; then
    status_color=$GREEN
    status_text="✅ OK"
  elif [ "$status_code" -eq 401 ] || [ "$status_code" -eq 403 ]; then
    status_color=$YELLOW
    status_text="⚠️  FORBIDDEN"
  elif [ "$status_code" -ge 400 ] && [ "$status_code" -lt 500 ]; then
    status_color=$RED
    status_text="❌ ERROR"
  else
    status_color=$RED
    status_text="❌ FAIL"
  fi
  
  echo -e "${status_color}${status_text}${NC} (${status_code}) - ${method} ${endpoint} [${role:-No Auth}]"
}

echo -e "${BLUE}📋 Testing endpoints without authentication...${NC}"
echo ""

# Public endpoints
test_endpoint "GET" "/auth/init-admin" "" "Public"
test_endpoint "GET" "/organizations/test" "" "Public"
test_endpoint "GET" "/organizations/public" "" "Public"
test_endpoint "GET" "/test" "" "Public"

echo ""
echo -e "${BLUE}📋 Testing with ADMIN role...${NC}"
echo ""
echo -e "${YELLOW}⚠️  Note: You need to provide admin token${NC}"
echo -e "${YELLOW}   Run: curl -X POST ${BASE_URL}/auth/login -d '{\"email\":\"admin@coffee.com\",\"password\":\"admin123\"}'${NC}"
echo ""

read -p "Enter ADMIN token (or press Enter to skip): " ADMIN_TOKEN

if [ -n "$ADMIN_TOKEN" ]; then
  # Admin endpoints
  echo -e "${CYAN}Testing Admin endpoints...${NC}"
  test_endpoint "GET" "/users" "$ADMIN_TOKEN" "ADMIN"
  test_endpoint "POST" "/users" "$ADMIN_TOKEN" "ADMIN" '{"email":"test@test.com","password":"test123","firstName":"Test","lastName":"User","role":"user"}'
  test_endpoint "GET" "/users/1" "$ADMIN_TOKEN" "ADMIN"
  test_endpoint "GET" "/organizations" "$ADMIN_TOKEN" "ADMIN"
  test_endpoint "POST" "/organizations" "$ADMIN_TOKEN" "ADMIN" '{"name":"Test Org","baseRate":500}'
  test_endpoint "GET" "/orders" "$ADMIN_TOKEN" "ADMIN"
  test_endpoint "POST" "/orders" "$ADMIN_TOKEN" "ADMIN" '{"title":"Test Order","organizationId":1,"location":"Test"}'
  test_endpoint "GET" "/statistics" "$ADMIN_TOKEN" "ADMIN"
  test_endpoint "GET" "/statistics/organizations" "$ADMIN_TOKEN" "ADMIN"
  test_endpoint "GET" "/statistics/engineers" "$ADMIN_TOKEN" "ADMIN"
  test_endpoint "GET" "/logs" "$ADMIN_TOKEN" "ADMIN"
  test_endpoint "GET" "/backup" "$ADMIN_TOKEN" "ADMIN"
  test_endpoint "GET" "/settings" "$ADMIN_TOKEN" "ADMIN"
  test_endpoint "GET" "/engineer-organization-rates" "$ADMIN_TOKEN" "ADMIN"
  test_endpoint "GET" "/salary-payments" "$ADMIN_TOKEN" "ADMIN"
fi

echo ""
read -p "Enter MANAGER token (or press Enter to skip): " MANAGER_TOKEN

if [ -n "$MANAGER_TOKEN" ]; then
  echo -e "${CYAN}Testing Manager endpoints...${NC}"
  test_endpoint "GET" "/users" "$MANAGER_TOKEN" "MANAGER"
  test_endpoint "GET" "/organizations" "$MANAGER_TOKEN" "MANAGER"
  test_endpoint "GET" "/orders" "$MANAGER_TOKEN" "MANAGER"
  test_endpoint "POST" "/orders" "$MANAGER_TOKEN" "MANAGER" '{"title":"Test","organizationId":1,"location":"Test"}'
  test_endpoint "GET" "/orders/my-orders" "$MANAGER_TOKEN" "MANAGER"
  test_endpoint "GET" "/statistics" "$MANAGER_TOKEN" "MANAGER"
  test_endpoint "GET" "/settings" "$MANAGER_TOKEN" "MANAGER"
fi

echo ""
read -p "Enter USER (Engineer) token (or press Enter to skip): " USER_TOKEN

if [ -n "$USER_TOKEN" ]; then
  echo -e "${CYAN}Testing User/Engineer endpoints...${NC}"
  test_endpoint "GET" "/orders" "$USER_TOKEN" "USER"
  test_endpoint "GET" "/users/profile" "$USER_TOKEN" "USER"
  test_endpoint "PATCH" "/users/profile" "$USER_TOKEN" "USER" '{"firstName":"Updated"}'
  test_endpoint "GET" "/notifications" "$USER_TOKEN" "USER"
  test_endpoint "POST" "/orders/1/accept" "$USER_TOKEN" "USER"
  test_endpoint "POST" "/orders/1/complete-work" "$USER_TOKEN" "USER" '{"regularHours":1,"overtimeHours":0,"carPayment":100,"isFullyCompleted":false}'
  test_endpoint "POST" "/orders/1/work-sessions" "$USER_TOKEN" "USER" '{"regularHours":1,"overtimeHours":0,"workDate":"2025-10-31"}'
fi

echo ""
echo -e "${GREEN}✅ Testing completed!${NC}"
echo ""
echo -e "${CYAN}💡 Tip: Check the status codes above${NC}"
echo -e "${CYAN}   - 200-299: ✅ Success${NC}"
echo -e "${CYAN}   - 401/403: ⚠️  Access denied (expected for some roles)${NC}"
echo -e "${CYAN}   - 400-499: ❌ Client error${NC}"
echo -e "${CYAN}   - 500+: ❌ Server error${NC}"
