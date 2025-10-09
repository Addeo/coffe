#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🔍 Checking deployment status..."
echo ""

# Check GitHub Actions status
echo "📊 GitHub Actions:"
echo "   Visit: https://github.com/Addeo/coffe/actions"
echo ""

# Check VPS connection
echo "🌐 Testing VPS connection..."
if ssh -o ConnectTimeout=5 -o StrictHostKeyChecking=no user1@192.144.12.102 "echo 'Connected'" 2>/dev/null; then
    echo -e "${GREEN}✅ VPS is reachable${NC}"
    
    # Check Docker containers
    echo ""
    echo "🐳 Docker containers on VPS:"
    ssh -o StrictHostKeyChecking=no user1@192.144.12.102 "cd ~/coffe && docker-compose -f docker-compose.prod.yml ps"
    
    echo ""
    echo "📝 Recent backend logs:"
    ssh -o StrictHostKeyChecking=no user1@192.144.12.102 "cd ~/coffe && docker-compose -f docker-compose.prod.yml logs --tail=20 backend"
else
    echo -e "${RED}❌ Cannot connect to VPS${NC}"
fi

echo ""
echo "🌍 Application URLs:"
echo "   Frontend: http://192.144.12.102:4000"
echo "   Backend:  http://192.144.12.102:3000"
echo ""
echo "💡 To test the application:"
echo "   curl http://192.144.12.102:3000/api/health"
echo "   curl http://192.144.12.102:4000"

