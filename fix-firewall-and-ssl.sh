#!/bin/bash
# Fix firewall and get SSL certificate

set -e

# Цвета
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Конфигурация
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
echo -e "${BLUE}  🔥 Fixing Firewall and Getting SSL${NC}"
echo -e "${BLUE}=========================================${NC}"
echo ""

# Проверка подключения
echo -e "${YELLOW}[1/4] Checking connection...${NC}"
if ! ssh_exec "echo 'Connected'" > /dev/null 2>&1; then
    echo -e "${RED}❌ Cannot connect to server${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Connected${NC}"
echo ""

# Открытие портов в firewall
echo -e "${YELLOW}[2/4] Opening ports 80 and 443 in firewall...${NC}"
ssh_exec "sudo ufw allow 80/tcp && sudo ufw allow 443/tcp && sudo ufw status" || {
    echo -e "${YELLOW}⚠️  UFW might not be enabled or installed${NC}"
    echo -e "${YELLOW}Trying iptables...${NC}"
    ssh_exec "sudo iptables -I INPUT -p tcp --dport 80 -j ACCEPT && sudo iptables -I INPUT -p tcp --dport 443 -j ACCEPT" || true
}
echo -e "${GREEN}✅ Ports opened${NC}"
echo ""

# Проверка доступности порта 80
echo -e "${YELLOW}[3/4] Testing port 80 accessibility...${NC}"
sleep 2

# Запустить Nginx если не запущен
ssh_exec "sudo systemctl start nginx || true"

# Проверить порт 80
if curl -sf http://192.144.12.102 > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Port 80 is accessible${NC}"
else
    echo -e "${RED}❌ Port 80 is still not accessible${NC}"
    echo -e "${YELLOW}This might be Cloud.ru firewall. Check your Cloud.ru panel.${NC}"
fi
echo ""

# Получение SSL сертификата
echo -e "${YELLOW}[4/4] Getting SSL certificate...${NC}"
ssh_exec "
sudo certbot certonly --webroot -w /var/www/certbot \
    -d coffe-ug.ru -d www.coffe-ug.ru \
    --non-interactive --agree-tos --email admin@coffe-ug.ru
" && {
    echo -e "${GREEN}✅ SSL certificate obtained!${NC}"
    
    # Установить финальную конфигурацию
    ssh_exec "
        sudo ln -sf /etc/nginx/sites-available/coffe-ug.ru /etc/nginx/sites-enabled/coffe-ug.ru
        sudo nginx -t && sudo systemctl reload nginx
    "
    
    echo ""
    echo -e "${GREEN}✅ DONE! Your site should be working now:${NC}"
    echo -e "${BLUE}  🌐 https://coffe-ug.ru${NC}"
} || {
    echo -e "${RED}❌ Failed to get SSL certificate${NC}"
    echo ""
    echo -e "${YELLOW}Common issues:${NC}"
    echo -e "1. ${YELLOW}Cloud.ru Firewall:${NC}"
    echo -e "   - Login to Cloud.ru panel"
    echo -e "   - Go to your VM settings"
    echo -e "   - Find 'Firewall' or 'Security Groups'"
    echo -e "   - Allow ports 80 and 443"
    echo ""
    echo -e "2. ${YELLOW}DNS not configured:${NC}"
    echo -e "   - Check that coffe-ug.ru points to 192.144.12.102"
    echo -e "   - Run: dig coffe-ug.ru"
    echo ""
    echo -e "3. ${YELLOW}Manual certificate:${NC}"
    echo -e "   If you want to continue without SSL for now:"
    ssh_exec "
        sudo rm -f /etc/nginx/sites-enabled/coffe-ug.ru
        sudo cat > /tmp/nginx-nossl.conf << 'EOF'
server {
    listen 80;
    listen [::]:80;
    server_name coffe-ug.ru www.coffe-ug.ru;

    client_max_body_size 50M;

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

    location ~ ^/(app-debug\.apk|CoffeeAdmin-v2\.apk)\$ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Host \\\$host;
        proxy_set_header X-Real-IP \\\$remote_addr;
        proxy_set_header X-Forwarded-For \\\$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \\\$scheme;
        proxy_buffering off;
    }

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
        sudo mv /tmp/nginx-nossl.conf /etc/nginx/sites-available/coffe-ug.ru-nossl
        sudo ln -sf /etc/nginx/sites-available/coffe-ug.ru-nossl /etc/nginx/sites-enabled/coffe-ug.ru
        sudo nginx -t && sudo systemctl reload nginx
        echo ''
        echo '✅ Nginx configured WITHOUT SSL'
        echo '🌐 Site should work on: http://coffe-ug.ru'
        echo '⚠️  But WITHOUT HTTPS! Fix firewall and run this script again to get SSL.'
    "
}

