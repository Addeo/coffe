#!/bin/bash

# Script to sync shared types from root to frontend and backend

echo "🔄 Syncing shared types..."

# Sync to frontend
echo "📦 Copying to frontend/shared..."
cp -r shared/interfaces/* frontend/shared/interfaces/
cp -r shared/dtos/* frontend/shared/dtos/
cp -r shared/types/* frontend/shared/types/ 2>/dev/null || true

# Sync to backend  
echo "📦 Copying to backend/shared..."
cp -r shared/interfaces/* backend/shared/interfaces/
cp -r shared/dtos/* backend/shared/dtos/
cp -r shared/types/* backend/shared/types/ 2>/dev/null || true

echo "✅ Shared types synced successfully!"
echo ""
echo "Now run:"
echo "  cd frontend && npm run build"
echo "  cd backend && npm run build"

