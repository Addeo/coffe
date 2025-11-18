#!/bin/bash
# Get SSL certificate using standalone mode (stops Nginx temporarily)

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

VPS_USER="user1"
VPS_HOST="192.144.12.102"
SSH_KEY="$HOME/.ssh/coffe_key"

if [ ! -f "$SSH_KEY" ] && [ -f "$HOME/.ssh/id_ed25519" ]; then
    SSH_KEY="$HOME/.ssh/id_ed25519"
elif [ ! -f "$SSH_KEY" ] && [ -f "$HOME/.ssh/id_rsa" ]; then
    SSH_KEY="$HOME/.ssh/id_rsa"
fi

ssh_exec() {
    if [ -n "$SSH_KEY" ] && [ -f "$SSH_KEY" ]; then
        ssh -o StrictHostKeyChecking=no -i "$SSH_KEY" "${VPS_USER}@${VPS_HOST}" "$@"
    else
        ssh -o StrictHostKeyChecking=no "${VPS_USER}@${VPS_HOST}" "$@"
    fi
}

echo ""
echo -e "${BLUE}=========================================${NC}"
echo -e "${BLUE}  🔐 Getting SSL Certificate${NC}"
echo -e "${BLUE}  (Standalone Mode)${NC}"
echo -e "${BLUE}=========================================${NC}"
echo ""

echo -e "${YELLOW}[1/3] Stopping Nginx temporarily...${NC}"
ssh_exec "sudo systemctl stop nginx"
echo -e "${GREEN}✅ Nginx stopped${NC}"
echo ""

echo -e "${YELLOW}[2/3] Getting SSL certificate (standalone)...${NC}"
echo -e "${BLUE}Certbot will start its own temporary server...${NC}"
echo ""

ssh_exec "
sudo certbot certonly --standalone \
    -d coffe-ug.ru -d www.coffe-ug.ru \
    --non-interactive --agree-tos --email admin@coffe-ug.ru
" && {
    echo ""
    echo -e "${GREEN}✅ SSL certificate obtained successfully!${NC}"
    echo ""
    
    echo -e "${YELLOW}[3/3] Configuring Nginx with SSL...${NC}"
    
    # Установить финальную конфигурацию с SSL
    ssh_exec "sudo tee /etc/nginx/sites-available/coffe-ug.ru > /dev/null << 'EOF'
# Redirect HTTP to HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name coffe-ug.ru www.coffe-ug.ru;

    # Allow Let's Encrypt challenges
    location ^~ /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    # Redirect all other traffic to HTTPS
    location / {
        return 301 https://\\\$host\\\$request_uri;
    }
}

# HTTPS Server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name coffe-ug.ru www.coffe-ug.ru;

    # SSL Certificate paths
    ssl_certificate /etc/letsencrypt/live/coffe-ug.ru/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/coffe-ug.ru/privkey.pem;

    # SSL Configuration (modern, secure)
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384';
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Security headers
    add_header X-Frame-Options \"SAMEORIGIN\" always;
    add_header X-Content-Type-Options \"nosniff\" always;
    add_header X-XSS-Protection \"1; mode=block\" always;
    add_header Referrer-Policy \"no-referrer-when-downgrade\" always;

    # Increase client body size for file uploads
    client_max_body_size 50M;

    # Logging
    access_log /var/log/nginx/coffe-ug.ru-access.log;
    error_log /var/log/nginx/coffe-ug.ru-error.log;

    # API Backend (NestJS on port 3001)
    location /api/ {
        proxy_pass http://localhost:3001/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \\\$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \\\$host;
        proxy_set_header X-Real-IP \\\$remote_addr;
        proxy_set_header X-Forwarded-For \\\$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \\\$scheme;
        proxy_cache_bypass \\\$http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # APK downloads (served by backend)
    location ~ ^/(app-debug\.apk|CoffeeAdmin-v2\.apk)\$ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Host \\\$host;
        proxy_set_header X-Real-IP \\\$remote_addr;
        proxy_set_header X-Forwarded-For \\\$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \\\$scheme;
        proxy_buffering off;
    }

    # Frontend (Angular/Ionic on port 4000)
    location / {
        proxy_pass http://localhost:4000/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \\\$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \\\$host;
        proxy_set_header X-Real-IP \\\$remote_addr;
        proxy_set_header X-Forwarded-For \\\$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \\\$scheme;
        proxy_cache_bypass \\\$http_upgrade;
    }
}
EOF
"
    
    # Проверить конфигурацию
    ssh_exec "sudo nginx -t"
    
    # Запустить Nginx
    ssh_exec "sudo systemctl start nginx"
    ssh_exec "sudo systemctl enable nginx"
    
    # Настроить автообновление сертификатов
    ssh_exec "(sudo crontab -l 2>/dev/null | grep -v 'certbot renew'; echo '0 0,12 * * * certbot renew --quiet --deploy-hook \"systemctl reload nginx\"') | sudo crontab -" || true
    
    echo -e "${GREEN}✅ Nginx configured and started with SSL${NC}"
    echo ""
    echo -e "${GREEN}=========================================${NC}"
    echo -e "${GREEN}🎉 SUCCESS! Your site is now live!${NC}"
    echo -e "${GREEN}=========================================${NC}"
    echo ""
    echo -e "${GREEN}🌐 Your site is now available at:${NC}"
    echo -e "${BLUE}  ✅ https://coffe-ug.ru${NC}"
    echo -e "${BLUE}  ✅ https://www.coffe-ug.ru${NC}"
    echo -e "${BLUE}  ✅ http://coffe-ug.ru ${YELLOW}(redirects to HTTPS)${NC}"
    echo ""
    echo -e "${GREEN}✅ SSL certificate: Valid${NC}"
    echo -e "${GREEN}✅ Auto-renewal: Configured (every 12 hours)${NC}"
    echo -e "${GREEN}✅ HTTP → HTTPS redirect: Enabled${NC}"
    echo -e "${GREEN}✅ Security headers: Configured${NC}"
    echo ""
    echo -e "${YELLOW}📊 Test your site:${NC}"
    echo -e "  curl -I https://coffe-ug.ru"
    echo -e "  Or open in browser: ${BLUE}https://coffe-ug.ru${NC}"
    echo ""
    echo -e "${YELLOW}📝 Useful commands:${NC}"
    echo -e "  Check SSL cert: ${BLUE}ssh ${VPS_USER}@${VPS_HOST} 'sudo certbot certificates'${NC}"
    echo -e "  Nginx status: ${BLUE}ssh ${VPS_USER}@${VPS_HOST} 'sudo systemctl status nginx'${NC}"
    echo -e "  View logs: ${BLUE}ssh ${VPS_USER}@${VPS_HOST} 'sudo tail -f /var/log/nginx/coffe-ug.ru-error.log'${NC}"
    echo ""
    
} || {
    echo ""
    echo -e "${RED}❌ Failed to get SSL certificate${NC}"
    echo -e "${YELLOW}Starting Nginx anyway...${NC}"
    ssh_exec "sudo systemctl start nginx"
    echo ""
    echo -e "${YELLOW}Check logs:${NC}"
    echo -e "  ssh ${VPS_USER}@${VPS_HOST} 'sudo tail -50 /var/log/letsencrypt/letsencrypt.log'"
    exit 1
}

