#!/bin/bash
# Get SSL certificate with correct Nginx configuration

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
echo -e "${BLUE}=========================================${NC}"
echo ""

echo -e "${YELLOW}[1/3] Fixing Nginx configuration for Let's Encrypt...${NC}"

# Создать правильную конфигурацию с приоритетом для .well-known
ssh_exec "sudo tee /etc/nginx/sites-available/coffe-ug.ru > /dev/null << 'EOF'
server {
    listen 80;
    listen [::]:80;
    server_name coffe-ug.ru www.coffe-ug.ru;

    # Let's Encrypt challenge - ПРИОРИТЕТ!
    location ^~ /.well-known/acme-challenge/ {
        root /var/www/certbot;
        try_files \\\$uri =404;
    }

    client_max_body_size 50M;

    # API Backend
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

    # APK downloads
    location ~ ^/(app-debug\.apk|CoffeeAdmin-v2\.apk)\$ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Host \\\$host;
        proxy_set_header X-Real-IP \\\$remote_addr;
        proxy_set_header X-Forwarded-For \\\$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \\\$scheme;
        proxy_buffering off;
    }

    # Frontend
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

# Перезагрузить Nginx
ssh_exec "sudo nginx -t && sudo systemctl reload nginx"
echo -e "${GREEN}✅ Nginx configuration fixed${NC}"
echo ""

echo -e "${YELLOW}[2/3] Getting SSL certificate...${NC}"

# Получить сертификат
ssh_exec "
sudo certbot certonly --webroot -w /var/www/certbot \
    -d coffe-ug.ru -d www.coffe-ug.ru \
    --non-interactive --agree-tos --email admin@coffe-ug.ru
" && {
    echo -e "${GREEN}✅ SSL certificate obtained!${NC}"
    
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

    # SSL Certificate
    ssl_certificate /etc/letsencrypt/live/coffe-ug.ru/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/coffe-ug.ru/privkey.pem;

    # SSL Configuration
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

    client_max_body_size 50M;

    # API Backend
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

    # APK downloads
    location ~ ^/(app-debug\.apk|CoffeeAdmin-v2\.apk)\$ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Host \\\$host;
        proxy_set_header X-Real-IP \\\$remote_addr;
        proxy_set_header X-Forwarded-For \\\$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \\\$scheme;
        proxy_buffering off;
    }

    # Frontend
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
    
    # Проверить и перезагрузить
    ssh_exec "sudo nginx -t && sudo systemctl reload nginx"
    
    # Настроить автообновление
    ssh_exec "(sudo crontab -l 2>/dev/null | grep -v certbot; echo \"0 0,12 * * * certbot renew --quiet --post-hook 'systemctl reload nginx'\") | sudo crontab -" || true
    
    echo -e "${GREEN}✅ Nginx configured with SSL${NC}"
    echo ""
    echo -e "${GREEN}=========================================${NC}"
    echo -e "${GREEN}✅ SUCCESS! Your site is now live!${NC}"
    echo -e "${GREEN}=========================================${NC}"
    echo ""
    echo -e "${GREEN}🌐 Your site:${NC}"
    echo -e "${BLUE}  https://coffe-ug.ru${NC}"
    echo -e "${BLUE}  https://www.coffe-ug.ru${NC}"
    echo ""
    echo -e "${GREEN}✅ SSL certificate: Valid${NC}"
    echo -e "${GREEN}✅ Auto-renewal: Configured${NC}"
    echo -e "${GREEN}✅ HTTP → HTTPS redirect: Enabled${NC}"
    echo ""
    
} || {
    echo -e "${RED}❌ Failed to get SSL certificate${NC}"
    echo ""
    echo -e "${YELLOW}Check logs:${NC}"
    echo -e "  ssh ${VPS_USER}@${VPS_HOST} 'sudo tail -50 /var/log/letsencrypt/letsencrypt.log'"
    exit 1
}

