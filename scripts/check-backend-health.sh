#!/bin/bash

# Script to check backend health on production
# Usage: ./check-backend-health.sh [VPS_HOST]

# Default VPS host (can be overridden via environment variable or argument)
VPS_HOST="${1:-${VPS_HOST:-192.144.12.102}}"
BACKEND_URL="http://${VPS_HOST}:3001/api/health"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${BLUE}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Backend Health Check (Production)                  ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${CYAN}Backend URL: ${BACKEND_URL}${NC}"
echo ""

# Test health endpoint
echo -e "${CYAN}🔍 Checking backend health...${NC}"
echo ""

HEALTH_RESPONSE=$(curl -s -w "\n%{http_code}" --max-time 10 "${BACKEND_URL}" 2>&1)
HTTP_CODE=$(echo "$HEALTH_RESPONSE" | tail -n 1)
RESPONSE_BODY=$(echo "$HEALTH_RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
  echo -e "${GREEN}✅ Backend is HEALTHY${NC}"
  echo -e "${GREEN}   HTTP Status: ${HTTP_CODE}${NC}"
  echo ""
  echo -e "${CYAN}Response:${NC}"
  echo "$RESPONSE_BODY" | jq '.' 2>/dev/null || echo "$RESPONSE_BODY"
  echo ""
  
  # Extract and display key metrics if available
  if command -v jq &> /dev/null; then
    STATUS=$(echo "$RESPONSE_BODY" | jq -r '.status // "unknown"' 2>/dev/null)
    UPTIME=$(echo "$RESPONSE_BODY" | jq -r '.uptime // "unknown"' 2>/dev/null)
    TIMESTAMP=$(echo "$RESPONSE_BODY" | jq -r '.timestamp // "unknown"' 2>/dev/null)
    
    if [ "$STATUS" != "unknown" ]; then
      echo -e "${CYAN}📊 Status Details:${NC}"
      echo -e "   Status: ${GREEN}${STATUS}${NC}"
      if [ "$UPTIME" != "unknown" ]; then
        UPTIME_HOURS=$(echo "scale=2; $UPTIME / 3600" | bc 2>/dev/null)
        echo -e "   Uptime: ${CYAN}${UPTIME}s${NC} (${UPTIME_HOURS}h)"
      fi
      if [ "$TIMESTAMP" != "unknown" ]; then
        echo -e "   Timestamp: ${CYAN}${TIMESTAMP}${NC}"
      fi
    fi
  fi
elif [ "$HTTP_CODE" = "000" ]; then
  echo -e "${RED}❌ Backend is UNREACHABLE${NC}"
  echo -e "${RED}   Connection failed - backend may be down or unreachable${NC}"
  echo ""
  echo -e "${YELLOW}Possible issues:${NC}"
  echo "   - Backend service is not running"
  echo "   - Network connectivity issues"
  echo "   - Firewall blocking port 3001"
  echo "   - Incorrect VPS host address"
  exit 1
elif [ "$HTTP_CODE" -ge 500 ]; then
  echo -e "${RED}❌ Backend has SERVER ERROR${NC}"
  echo -e "${RED}   HTTP Status: ${HTTP_CODE}${NC}"
  echo ""
  echo -e "${YELLOW}Response:${NC}"
  echo "$RESPONSE_BODY" | head -20
  exit 1
else
  echo -e "${YELLOW}⚠️  Backend returned unexpected status${NC}"
  echo -e "${YELLOW}   HTTP Status: ${HTTP_CODE}${NC}"
  echo ""
  echo -e "${CYAN}Response:${NC}"
  echo "$RESPONSE_BODY" | head -20
fi

echo ""
echo -e "${BLUE}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Additional Checks                                 ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════╝${NC}"
echo ""

# Test if backend API is responding at all
echo -e "${CYAN}🔍 Testing API base endpoint...${NC}"
BASE_RESPONSE=$(curl -s -w "\n%{http_code}" --max-time 5 "http://${VPS_HOST}:3001/api/test" 2>&1)
BASE_HTTP_CODE=$(echo "$BASE_RESPONSE" | tail -n 1)

if [ "$BASE_HTTP_CODE" = "200" ] || [ "$BASE_HTTP_CODE" = "404" ]; then
  echo -e "${GREEN}✅ API is responding${NC} (HTTP ${BASE_HTTP_CODE})"
else
  echo -e "${YELLOW}⚠️  API base endpoint returned: ${BASE_HTTP_CODE}${NC}"
fi

echo ""
echo -e "${CYAN}💡 To check all endpoints, run:${NC}"
echo -e "${CYAN}   ./check-endpoints-status.sh ${VPS_HOST}${NC}"

