#!/bin/bash
# Script to rebuild frontend with updated API configuration

echo "🔄 Rebuilding frontend with HTTPS API configuration..."

# Stop the current frontend container
echo "⏹️  Stopping frontend container..."
docker-compose -f docker-compose.prod.yml stop frontend

# Remove the old frontend container and image
echo "🗑️  Removing old frontend container and image..."
docker-compose -f docker-compose.prod.yml rm -f frontend
docker rmi coffee_frontend || true

# Rebuild and start the frontend
echo "🏗️  Building new frontend image..."
docker-compose -f docker-compose.prod.yml build --no-cache frontend

echo "🚀 Starting frontend container..."
docker-compose -f docker-compose.prod.yml up -d frontend

# Show status
echo ""
echo "✅ Frontend rebuild complete!"
echo ""
echo "📊 Container status:"
docker ps | grep coffee_frontend

echo ""
echo "🌐 Testing the site..."
sleep 5
curl -s -o /dev/null -w "HTTP Status: %{http_code}\n" https://coffe-ug.ru

echo ""
echo "✨ Done! Please test login at https://coffe-ug.ru/login"

