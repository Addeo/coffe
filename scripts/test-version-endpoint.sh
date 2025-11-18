#!/bin/bash

# ============================================
# Test Version Endpoint
# ============================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

VPS_HOST="192.144.12.102"
API_URL="http://${VPS_HOST}:3001/api/app/version"
CURRENT_VERSION="1.0.1"
SERVER_VERSION="1.0.2"

echo -e "${BLUE}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Test Version Endpoint                             ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════╝${NC}"
echo ""

# Test 1: Check endpoint availability
echo -e "${YELLOW}[1/4] Checking endpoint availability...${NC}"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$API_URL" || echo "000")

if [ "$HTTP_CODE" = "200" ]; then
  echo -e "${GREEN}✅ Endpoint is available (HTTP $HTTP_CODE)${NC}"
else
  echo -e "${RED}❌ Endpoint not available (HTTP $HTTP_CODE)${NC}"
  echo "   Please check if backend is running"
  exit 1
fi
echo ""

# Test 2: Get version response
echo -e "${YELLOW}[2/4] Getting version response...${NC}"
RESPONSE=$(curl -s --max-time 10 "$API_URL" || echo "ERROR")

if [ "$RESPONSE" = "ERROR" ]; then
  echo -e "${RED}❌ Failed to get response${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Response received:${NC}"
echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
echo ""

# Test 3: Parse response
echo -e "${YELLOW}[3/4] Parsing response...${NC}"
VERSION=$(echo "$RESPONSE" | grep -o '"version":"[^"]*"' | cut -d'"' -f4 || echo "")
DOWNLOAD_URL=$(echo "$RESPONSE" | grep -o '"downloadUrl":"[^"]*"' | cut -d'"' -f4 || echo "")
REQUIRED=$(echo "$RESPONSE" | grep -o '"required":[^,}]*' | cut -d':' -f2 || echo "")

if [ -z "$VERSION" ]; then
  echo -e "${RED}❌ Could not parse version from response${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Parsed values:${NC}"
echo "  Version: $VERSION"
echo "  Download URL: $DOWNLOAD_URL"
echo "  Required: $REQUIRED"
echo ""

# Test 4: Check if update is needed
echo -e "${YELLOW}[4/4] Simulating app check (version $CURRENT_VERSION)...${NC}"
if [ "$VERSION" != "$CURRENT_VERSION" ]; then
  echo -e "${GREEN}✅ Update detected!${NC}"
  echo "  Current version: $CURRENT_VERSION"
  echo "  Server version: $VERSION"
  echo "  Action: Show update dialog"
  echo ""
  
  # Check if download URL is accessible
  if [ -n "$DOWNLOAD_URL" ]; then
    echo "  Checking download URL availability..."
    URL_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$DOWNLOAD_URL" || echo "000")
    if [ "$URL_CODE" = "200" ]; then
      echo -e "${GREEN}  ✅ Download URL is accessible${NC}"
    else
      echo -e "${RED}  ❌ Download URL not accessible (HTTP $URL_CODE)${NC}"
      echo "     URL: $DOWNLOAD_URL"
    fi
  else
    echo -e "${RED}  ❌ Download URL is empty${NC}"
  fi
else
  echo -e "${YELLOW}ℹ️  No update needed${NC}"
  echo "  Current version: $CURRENT_VERSION"
  echo "  Server version: $VERSION"
  echo "  Versions match - no action needed"
fi
echo ""

# Summary
echo -e "${BLUE}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Summary                                             ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════╝${NC}"
echo ""
echo "Endpoint: $API_URL"
echo "Response:"
echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
echo ""
echo "What app version 1.0.1 will do:"
if [ "$VERSION" != "$CURRENT_VERSION" ]; then
  echo "  1. ✅ Detect that server has version $VERSION"
  echo "  2. ✅ Show update dialog to user"
  echo "  3. ✅ Offer download URL: $DOWNLOAD_URL"
  echo "  4. ✅ User can update or cancel"
else
  echo "  1. ✅ Detect that versions match"
  echo "  2. ✅ No update dialog shown"
  echo "  3. ✅ App continues normally"
fi
echo ""

