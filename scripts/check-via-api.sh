#!/bin/bash

# Check server status via HTTP API (works without SSH)

API_URL="${API_URL:-http://192.144.12.102:3001}"
# Get token from environment or use default admin credentials
TOKEN="${API_TOKEN:-}"

echo "🔍 Checking server status via API..."
echo "API URL: $API_URL"
echo ""

# Function to get auth token
get_token() {
  if [ -n "$TOKEN" ]; then
    echo "$TOKEN"
    return
  fi
  
  # Try to login as admin
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
  echo "❌ Could not authenticate. Server might be down or credentials are wrong."
  echo ""
  echo "Trying direct health check..."
  if curl -f -s "$API_URL/api/health" > /dev/null 2>&1; then
    echo "✅ Server is responding (health check OK)"
  else
    echo "❌ Server is not responding"
  fi
  exit 1
fi

echo "✅ Authenticated"
echo ""

# Get system status
echo "📊 System Status:"
echo "───────────────────────────────────────"
curl -s "$API_URL/api/system/status" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H 'Content-Type: application/json' | python3 -m json.tool 2>/dev/null || echo "Could not fetch system status"

echo ""
echo "💾 Disk Usage:"
echo "───────────────────────────────────────"
curl -s "$API_URL/api/system/disk" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H 'Content-Type: application/json' | python3 -m json.tool 2>/dev/null || echo "Could not fetch disk usage"

echo ""
echo "✅ Done"

