#!/bin/bash
# Quick health check for coffe-ug.ru
# Run this script to diagnose issues

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "========================================="
echo "Coffee-UG.ru Health Check"
echo "========================================="
echo ""

# 1. Check Nginx
echo -e "${YELLOW}[1/7] Checking Nginx status...${NC}"
if systemctl is-active --quiet nginx; then
    echo -e "${GREEN}✅ Nginx is running${NC}"
else
    echo -e "${RED}❌ Nginx is NOT running${NC}"
    echo -e "${YELLOW}Fix: sudo systemctl start nginx${NC}"
fi
echo ""

# 2. Check Nginx ports
echo -e "${YELLOW}[2/7] Checking Nginx ports (80, 443)...${NC}"
if netstat -tulpn 2>/dev/null | grep -q ":80.*nginx" && netstat -tulpn 2>/dev/null | grep -q ":443.*nginx"; then
    echo -e "${GREEN}✅ Nginx is listening on ports 80 and 443${NC}"
    netstat -tulpn 2>/dev/null | grep nginx | grep -E ":(80|443)"
else
    echo -e "${RED}❌ Nginx is NOT listening on required ports${NC}"
    echo -e "${YELLOW}Current ports:${NC}"
    netstat -tulpn 2>/dev/null | grep nginx || echo "No nginx processes found"
fi
echo ""

# 3. Check Docker containers
echo -e "${YELLOW}[3/7] Checking Docker containers...${NC}"
if docker ps | grep -q "coffee_frontend_prod"; then
    echo -e "${GREEN}✅ Frontend container is running${NC}"
    docker ps | grep coffee_frontend_prod | awk '{print $1, $2, $NF}'
else
    echo -e "${RED}❌ Frontend container is NOT running${NC}"
    echo -e "${YELLOW}Fix: docker-compose -f docker-compose.prod.yml up -d${NC}"
fi

if docker ps | grep -q "coffee_backend_prod"; then
    echo -e "${GREEN}✅ Backend container is running${NC}"
    docker ps | grep coffee_backend_prod | awk '{print $1, $2, $NF}'
else
    echo -e "${RED}❌ Backend container is NOT running${NC}"
    echo -e "${YELLOW}Fix: docker-compose -f docker-compose.prod.yml up -d${NC}"
fi
echo ""

# 4. Check backend API (localhost)
echo -e "${YELLOW}[4/7] Testing backend API (localhost:3001)...${NC}"
if curl -sf http://localhost:3001/api/test > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Backend API is responding${NC}"
    curl -s http://localhost:3001/api/test | head -c 100
    echo ""
else
    echo -e "${RED}❌ Backend API is NOT responding${NC}"
    echo -e "${YELLOW}Check logs: docker logs coffee_backend_prod${NC}"
fi
echo ""

# 5. Check frontend (localhost)
echo -e "${YELLOW}[5/7] Testing frontend (localhost:4000)...${NC}"
if curl -sf http://localhost:4000 > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Frontend is responding${NC}"
else
    echo -e "${RED}❌ Frontend is NOT responding${NC}"
    echo -e "${YELLOW}Check logs: docker logs coffee_frontend_prod${NC}"
fi
echo ""

# 6. Check external HTTPS access
echo -e "${YELLOW}[6/7] Testing external HTTPS access...${NC}"
if curl -sf https://coffe-ug.ru > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Site is accessible via HTTPS${NC}"
    echo -e "${GREEN}Status:${NC} $(curl -s -o /dev/null -w '%{http_code}' https://coffe-ug.ru)"
else
    echo -e "${RED}❌ Site is NOT accessible via HTTPS${NC}"
    echo -e "${YELLOW}Possible issues:${NC}"
    echo -e "  - DNS not configured correctly"
    echo -e "  - Firewall blocking ports 80/443"
    echo -e "  - SSL certificate issue"
fi
echo ""

# 7. Check SSL certificate
echo -e "${YELLOW}[7/7] Checking SSL certificate...${NC}"
if [ -f "/etc/letsencrypt/live/coffe-ug.ru/fullchain.pem" ]; then
    echo -e "${GREEN}✅ SSL certificate exists${NC}"
    echo -e "${GREEN}Certificate info:${NC}"
    openssl x509 -in /etc/letsencrypt/live/coffe-ug.ru/fullchain.pem -noout -dates 2>/dev/null || echo "Could not read certificate"
else
    echo -e "${RED}❌ SSL certificate NOT found${NC}"
    echo -e "${YELLOW}Fix: Run ./setup-nginx-ssl.sh${NC}"
fi
echo ""

# Summary
echo "========================================="
echo "Summary"
echo "========================================="
echo ""
echo -e "${YELLOW}Logs to check if issues found:${NC}"
echo -e "  Nginx: sudo tail -f /var/log/nginx/coffe-ug.ru-error.log"
echo -e "  Backend: docker logs -f coffee_backend_prod"
echo -e "  Frontend: docker logs -f coffee_frontend_prod"
echo ""
echo -e "${YELLOW}Quick fixes:${NC}"
echo -e "  Restart Nginx: sudo systemctl restart nginx"
echo -e "  Restart Docker: docker-compose -f docker-compose.prod.yml restart"
echo -e "  Full reinstall: sudo ./setup-nginx-ssl.sh"
echo ""

