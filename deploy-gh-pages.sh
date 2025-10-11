#!/bin/bash

# Script to deploy frontend to GitHub Pages
# Usage: ./deploy-gh-pages.sh [ngrok-url]

set -e

echo "🚀 Deploying to GitHub Pages..."
echo "======================================"
echo ""

# Check if ngrok URL is provided
if [ $# -eq 1 ]; then
    NGROK_URL=$1
    echo "📝 Updating environment with ngrok URL: $NGROK_URL"
    ./update-ngrok-url.sh $NGROK_URL
    echo ""
fi

# Display current API URLs
echo "📋 Current configuration:"
echo "======================================"
if [ -f "frontend/src/environments/environment.prod.ts" ]; then
    echo "Production environment:"
    grep -E "(apiUrl|authUrl)" frontend/src/environments/environment.prod.ts || echo "  No API URLs found"
fi
echo ""

# Confirm deployment
read -p "🤔 Deploy to GitHub Pages? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Deployment cancelled"
    exit 1
fi

echo ""
echo "📦 Installing dependencies..."
cd frontend
npm install --legacy-peer-deps

echo ""
echo "🏗️  Building production bundle..."
npm run build

echo ""
echo "📤 Deploying to gh-pages branch..."
npm run deploy

echo ""
echo "======================================"
echo "✅ Deployment complete!"
echo "======================================"
echo ""
echo "📱 Frontend URL:"
echo "   https://addeo.github.io/coffe-deploy/"
echo ""
echo "💡 It may take a few minutes for GitHub Pages to update"
echo ""

