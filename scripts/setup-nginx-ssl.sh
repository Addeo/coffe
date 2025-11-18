#!/bin/bash
# Setup Nginx as reverse proxy with SSL for coffe-ug.ru
# Run this script on your production server

set -e

echo "========================================="
echo "Setting up Nginx Reverse Proxy with SSL"
echo "========================================="

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}Please run as root (sudo)${NC}"
    exit 1
fi

echo -e "${YELLOW}Step 1: Installing Nginx and Certbot...${NC}"
apt update
apt install -y nginx certbot python3-certbot-nginx

echo -e "${YELLOW}Step 2: Stopping Nginx temporarily...${NC}"
systemctl stop nginx

echo -e "${YELLOW}Step 3: Creating certbot webroot directory...${NC}"
mkdir -p /var/www/certbot

echo -e "${YELLOW}Step 4: Copying Nginx configuration...${NC}"
# Copy the nginx-host.conf to sites-available
cp nginx-host.conf /etc/nginx/sites-available/coffe-ug.ru

echo -e "${YELLOW}Step 5: Obtaining SSL certificate...${NC}"
echo -e "${YELLOW}This will use Let's Encrypt certbot...${NC}"

# First, create a temporary HTTP-only config for certbot
cat > /etc/nginx/sites-available/coffe-ug.ru-temp <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name coffe-ug.ru www.coffe-ug.ru;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        root /var/www/html;
        index index.html;
    }
}
EOF

# Create simple index.html
echo "<html><body><h1>Setting up...</h1></body></html>" > /var/www/html/index.html

# Enable temporary config
ln -sf /etc/nginx/sites-available/coffe-ug.ru-temp /etc/nginx/sites-enabled/coffe-ug.ru
rm -f /etc/nginx/sites-enabled/default

# Test and start nginx
nginx -t
systemctl start nginx

# Obtain certificate
certbot certonly --webroot -w /var/www/certbot -d coffe-ug.ru -d www.coffe-ug.ru --non-interactive --agree-tos --email admin@coffe-ug.ru

echo -e "${YELLOW}Step 6: Installing full Nginx configuration with SSL...${NC}"
# Replace with full SSL config
ln -sf /etc/nginx/sites-available/coffe-ug.ru /etc/nginx/sites-enabled/coffe-ug.ru

echo -e "${YELLOW}Step 7: Testing Nginx configuration...${NC}"
nginx -t

echo -e "${YELLOW}Step 8: Reloading Nginx...${NC}"
systemctl reload nginx

echo -e "${YELLOW}Step 9: Enabling Nginx autostart...${NC}"
systemctl enable nginx

echo -e "${YELLOW}Step 10: Setting up automatic certificate renewal...${NC}"
# Add cron job for certificate renewal
(crontab -l 2>/dev/null; echo "0 0,12 * * * certbot renew --quiet --post-hook 'systemctl reload nginx'") | crontab -

echo ""
echo -e "${GREEN}✅ Setup complete!${NC}"
echo ""
echo -e "${GREEN}Your site should now be accessible at:${NC}"
echo -e "  ${GREEN}https://coffe-ug.ru${NC}"
echo -e "  ${GREEN}https://www.coffe-ug.ru${NC}"
echo ""
echo -e "${YELLOW}Important: Make sure your Docker containers are running:${NC}"
echo -e "  docker-compose -f docker-compose.prod.yml up -d"
echo ""
echo -e "${YELLOW}Check Nginx status:${NC}"
echo -e "  systemctl status nginx"
echo ""
echo -e "${YELLOW}Check SSL certificate:${NC}"
echo -e "  certbot certificates"
echo ""
echo -e "${YELLOW}View Nginx logs:${NC}"
echo -e "  tail -f /var/log/nginx/coffe-ug.ru-error.log"
echo -e "  tail -f /var/log/nginx/coffe-ug.ru-access.log"
echo ""

