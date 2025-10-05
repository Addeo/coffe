#!/bin/bash

echo "🚀 Starting Coffee Admin Demo with LocalTunnel"
echo "=============================================="

# Kill any existing processes
echo "🧹 Cleaning up existing processes..."
pkill -f "nest start" 2>/dev/null || true
pkill -f "localtunnel" 2>/dev/null || true
sleep 2

# Start backend
echo "🔧 Starting NestJS backend..."
cd backend
npm run start:dev &
BACKEND_PID=$!
echo "Backend started with PID: $BACKEND_PID"
cd ..

# Wait for backend to start
echo "⏳ Waiting for backend to initialize..."
sleep 5

# Start localtunnel
echo "🌐 Starting LocalTunnel..."
npx localtunnel --port 3000 &
LT_PID=$!
echo "LocalTunnel started with PID: $LT_PID"

# Wait for tunnel URL
echo "⏳ Waiting for tunnel URL..."
sleep 3

echo ""
echo "✅ Demo services started!"
echo "📝 Note: Copy the tunnel URL from above and use it to update your frontend environment"
echo ""
echo "🔧 Management:"
echo "  - Backend PID: $BACKEND_PID"
echo "  - LocalTunnel PID: $LT_PID"
echo "  - To stop: kill $BACKEND_PID $LT_PID"
echo ""
echo "📋 Next steps:"
echo "1. Copy the https://xxxxx.loca.lt URL above"
echo "2. Run: ./update-ngrok-url.sh https://xxxxx.loca.lt"
echo "3. Push to GitHub for frontend deployment"

# Keep script running to show output
echo "Press Ctrl+C to stop all services"
trap "echo '🛑 Stopping services...'; kill $BACKEND_PID $LT_PID 2>/dev/null; exit" INT
wait
