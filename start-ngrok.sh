#!/bin/bash

# Script to start ngrok for backend and update environment
# Usage: ./start-ngrok.sh [port]

PORT=${1:-3002}

echo "🚀 Starting ngrok on port $PORT..."
echo "======================================"
echo ""

# Check if ngrok is installed
if ! command -v ngrok &> /dev/null; then
    echo "❌ Error: ngrok is not installed"
    echo "📥 Please install ngrok from: https://ngrok.com/download"
    echo ""
    echo "Quick install:"
    echo "  brew install ngrok/ngrok/ngrok  # macOS"
    echo "  snap install ngrok              # Linux"
    exit 1
fi

# Check if backend is running
echo "🔍 Checking if backend is running on port $PORT..."
if ! nc -z localhost $PORT 2>/dev/null; then
    echo "⚠️  Warning: Backend is not running on port $PORT"
    echo "💡 Start backend first with: cd backend && npm run start:dev"
    echo ""
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo ""
echo "🌐 Starting ngrok tunnel..."
echo "======================================"
echo ""
echo "ℹ️  ngrok will start in the foreground"
echo "ℹ️  Keep this terminal open"
echo "ℹ️  Press Ctrl+C to stop ngrok"
echo ""
echo "📋 After ngrok starts, copy the HTTPS URL and run:"
echo "   ./update-ngrok-url.sh <your-ngrok-url>"
echo ""
echo "======================================"
echo ""

# Start ngrok
ngrok http $PORT --log=stdout

