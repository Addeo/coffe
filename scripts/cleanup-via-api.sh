#!/bin/bash

# Cleanup server via HTTP API (works without SSH)

API_URL="${API_URL:-http://192.144.12.102:3001}"
TOKEN="${API_TOKEN:-}"

echo "🗑️  Cleaning up server via API..."
echo "API URL: $API_URL"
echo ""

# Function to get auth token
get_token() {
  if [ -n "$TOKEN" ]; then
    echo "$TOKEN"
    return
  fi
  
  RESPONSE=$(curl -s -X POST "$API_URL/api/auth/login" \
    -H 'Content-Type: application/json' \
    -d '{"email":"admin@coffee.com","password":"admin123"}' 2>/dev/null)
  
  if [ $? -eq 0 ]; then
    echo "$RESPONSE" | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4
  fi
}

# Get token
echo "🔐 Authenticating..."
AUTH_TOKEN=$(get_token)

if [ -z "$AUTH_TOKEN" ]; then
  echo "❌ Could not authenticate"
  exit 1
fi

echo "✅ Authenticated"
echo ""

# Perform cleanup
echo "🧹 Performing cleanup..."
echo "───────────────────────────────────────"
curl -s "$API_URL/api/system/cleanup" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H 'Content-Type: application/json' | python3 -m json.tool 2>/dev/null || echo "Could not perform cleanup"

echo ""
echo "✅ Cleanup completed"

