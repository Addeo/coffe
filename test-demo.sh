#!/bin/bash

echo "🚀 Testing Coffee Admin Panel Demo Build"
echo "========================================"

# Test frontend build
echo "📦 Building frontend..."
cd frontend
if npm run build -- --configuration production --base-href /coffee-admin/; then
    echo "✅ Frontend build successful"
else
    echo "❌ Frontend build failed"
    exit 1
fi

# Test serving locally
echo "🌐 Starting local server..."
npx http-server dist/coffee-admin -p 8080 &
SERVER_PID=$!

# Wait a moment for server to start
sleep 3

# Test if server is responding
if curl -s http://localhost:8080 > /dev/null; then
    echo "✅ Local server running at http://localhost:8080"
else
    echo "❌ Local server failed to start"
    kill $SERVER_PID 2>/dev/null
    exit 1
fi

# Kill server
kill $SERVER_PID 2>/dev/null

echo ""
echo "🎉 Demo build test completed successfully!"
echo ""
echo "Next steps:"
echo "1. Push changes to GitHub main branch"
echo "2. GitHub Actions will automatically deploy to GitHub Pages"
echo "3. Deploy backend to Render.com using render.yaml"
echo "4. Update frontend environment.prod.ts with backend URL"
echo ""
echo "Demo URLs (after deployment):"
echo "- Frontend: https://[your-username].github.io/coffee-admin/"
echo "- Backend: https://coffee-admin-demo.onrender.com"
