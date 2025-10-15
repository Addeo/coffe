#!/bin/bash

# Diagnostic script for order creation 500 error
# This script checks the common causes of the 500 Internal Server Error

API_URL="http://192.144.12.102:3001/api"
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6ImFkbWluQGNvZmZlZS5jb20iLCJzdWIiOjEsInJvbGUiOiJhZG1pbiIsImlhdCI6MTc2MDQ2MjU0NywiZXhwIjoxNzYwNTQ4OTQ3fQ.C1pD0hfV4eknojxJ5tv8epuOb3iKXC2A1xtytqPNo_c"

echo "=========================================="
echo "Order Creation Diagnostics"
echo "=========================================="
echo ""

# Check if server is reachable
echo "1. Checking if server is reachable..."
if curl -s --connect-timeout 5 "${API_URL}/test" > /dev/null 2>&1; then
  echo "   ✅ Server is reachable"
else
  echo "   ❌ Server is NOT reachable"
  exit 1
fi
echo ""

# Check if authentication works
echo "2. Checking authentication..."
AUTH_RESPONSE=$(curl -s -H "Authorization: Bearer ${TOKEN}" "${API_URL}/test")
if [ $? -eq 0 ]; then
  echo "   ✅ Authentication works"
else
  echo "   ❌ Authentication failed"
  exit 1
fi
echo ""

# Check if organization exists
echo "3. Checking if organization ID 7 exists..."
ORG_RESPONSE=$(curl -s -H "Authorization: Bearer ${TOKEN}" "${API_URL}/organizations/7")
ORG_STATUS=$(echo "$ORG_RESPONSE" | grep -o '"statusCode":404' || echo "ok")

if [ "$ORG_STATUS" == "ok" ]; then
  echo "   ✅ Organization ID 7 exists"
  echo "   Response: ${ORG_RESPONSE}" | head -c 200
else
  echo "   ❌ Organization ID 7 NOT FOUND"
  echo "   This is likely the cause of your 500 error!"
  echo ""
  echo "   Available organizations:"
  curl -s -H "Authorization: Bearer ${TOKEN}" "${API_URL}/organizations" | grep -o '"id":[0-9]*,"name":"[^"]*"' | head -5
fi
echo ""

# Check if file exists
echo "4. Checking if file UUID exists..."
FILE_ID="f84813a8-e083-4e91-ae06-8e183899a232"
FILE_RESPONSE=$(curl -s -H "Authorization: Bearer ${TOKEN}" "${API_URL}/files/${FILE_ID}")
FILE_STATUS=$(echo "$FILE_RESPONSE" | grep -o '"statusCode":404' || echo "ok")

if [ "$FILE_STATUS" == "ok" ]; then
  echo "   ✅ File exists"
else
  echo "   ⚠️  File NOT FOUND (this is okay - files are optional)"
  echo "   Try creating an order without files first"
fi
echo ""

# Try creating order without files
echo "5. Testing order creation WITHOUT files..."
TEST_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}\n" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -X POST "${API_URL}/orders" \
  --data '{"title":"Diagnostic Test","description":"Testing without files","organizationId":7,"location":"Test Location","territoryType":"urban","plannedStartDate":"2025-10-15T21:00:00.000Z","source":"manual"}')

HTTP_STATUS=$(echo "$TEST_RESPONSE" | grep "HTTP_STATUS:" | cut -d: -f2)
RESPONSE_BODY=$(echo "$TEST_RESPONSE" | sed '/HTTP_STATUS:/d')

if [ "$HTTP_STATUS" == "201" ] || [ "$HTTP_STATUS" == "200" ]; then
  echo "   ✅ Order creation SUCCESS (without files)"
  echo "   The issue is specifically with the file attachment"
else
  echo "   ❌ Order creation FAILED (status: ${HTTP_STATUS})"
  echo "   Response: ${RESPONSE_BODY}"
  
  # Check if it's the organization issue
  if echo "$RESPONSE_BODY" | grep -q "Organization.*not found"; then
    echo ""
    echo "   ⚠️  FOUND THE ISSUE: Organization ID 7 does not exist!"
    echo "   Solution: Use an existing organization ID from the list above"
  fi
fi
echo ""

echo "=========================================="
echo "Diagnostic Complete"
echo "=========================================="

