#!/bin/bash

# Complete demo setup script
# This script helps you set up the full demo environment

set -e

echo "☕ Coffee Admin Panel - Demo Setup"
echo "======================================"
echo ""

# Check if backend is running
check_backend() {
    if nc -z localhost 3002 2>/dev/null; then
        echo "✅ Backend is running on port 3002"
        return 0
    else
        echo "❌ Backend is not running"
        return 1
    fi
}

# Function to start backend
start_backend() {
    echo ""
    echo "🔧 Starting backend..."
    cd backend
    
    if [ ! -d "node_modules" ]; then
        echo "📦 Installing backend dependencies..."
        npm install
    fi
    
    echo "🚀 Starting backend in development mode..."
    npm run start:dev &
    BACKEND_PID=$!
    
    echo "⏳ Waiting for backend to start..."
    sleep 10
    
    if check_backend; then
        echo "✅ Backend started successfully (PID: $BACKEND_PID)"
        cd ..
        return 0
    else
        echo "❌ Failed to start backend"
        cd ..
        return 1
    fi
}

# Main flow
echo "Step 1: Check/Start Backend"
echo "======================================"
if ! check_backend; then
    read -p "Start backend now? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        start_backend
    else
        echo "❌ Backend is required. Please start it manually:"
        echo "   cd backend && npm run start:dev"
        exit 1
    fi
fi

echo ""
echo "Step 2: Start ngrok"
echo "======================================"
echo ""
echo "📋 Instructions:"
echo "   1. Open a NEW terminal window"
echo "   2. Run: ./start-ngrok.sh"
echo "   3. Copy the HTTPS URL from ngrok output"
echo "   4. Return here and paste it"
echo ""
read -p "Enter your ngrok URL (e.g., https://abc123.ngrok.io): " NGROK_URL

if [ -z "$NGROK_URL" ]; then
    echo "❌ Error: ngrok URL is required"
    exit 1
fi

echo ""
echo "Step 3: Update Environment"
echo "======================================"
./update-ngrok-url.sh $NGROK_URL

echo ""
echo "Step 4: Deploy to GitHub Pages"
echo "======================================"
read -p "Deploy to GitHub Pages now? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    ./deploy-gh-pages.sh
else
    echo ""
    echo "📋 To deploy later, run:"
    echo "   ./deploy-gh-pages.sh"
fi

echo ""
echo "======================================"
echo "🎉 Demo Setup Complete!"
echo "======================================"
echo ""
echo "📱 Frontend: https://addeo.github.io/coffe-deploy/"
echo "🔧 Backend:  $NGROK_URL"
echo ""
echo "👤 Test Credentials:"
echo "   Admin:    admin@coffee.com / password"
echo "   Manager:  manager@coffee.com / password"
echo "   Engineer: engineer@coffee.com / password"
echo ""
echo "💡 Remember: ngrok URL changes on restart!"
echo "   When ngrok restarts, run: ./update-ngrok-url.sh <new-url>"
echo ""

