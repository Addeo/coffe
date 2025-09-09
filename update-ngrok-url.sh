#!/bin/bash

# Script to update ngrok URL in environment files
# Usage: ./update-ngrok-url.sh https://abc123.ngrok.io

if [ $# -eq 0 ]; then
    echo "❌ Error: Please provide ngrok URL"
    echo "Usage: $0 https://your-ngrok-url.ngrok.io"
    exit 1
fi

NGROK_URL=$1
API_URL="${NGROK_URL}/api"
AUTH_URL="${NGROK_URL}/api/auth/login"

echo "🔄 Updating ngrok URLs..."
echo "Ngrok URL: $NGROK_URL"
echo "API URL: $API_URL"
echo "Auth URL: $AUTH_URL"

# Update production environment
sed -i.bak "s|apiUrl: '.*'|apiUrl: '$API_URL'|g" frontend/src/environments/environment.prod.ts
sed -i.bak "s|authUrl: '.*'|authUrl: '$AUTH_URL'|g" frontend/src/environments/environment.prod.ts

# Update development environment (optional)
sed -i.bak "s|apiUrl: '.*localhost.*'|apiUrl: '$API_URL'|g" frontend/src/environments/environment.ts
sed -i.bak "s|authUrl: '.*localhost.*'|authUrl: '$AUTH_URL'|g" frontend/src/environments/environment.ts

echo "✅ URLs updated successfully!"
echo ""
echo "Next steps:"
echo "1. Push changes to GitHub (frontend will auto-deploy)"
echo "2. Or rebuild locally: npm run build && npm run test-demo"
echo ""
echo "Frontend will be available at:"
echo "https://[your-username].github.io/coffee-admin/"
echo ""
echo "Test credentials:"
echo "- Admin: admin@coffee.com / password"
echo "- Manager: manager@coffee.com / password"
