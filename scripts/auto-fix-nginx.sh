#!/bin/bash
# Автоматическое исправление проблемы с сайтом coffe-ug.ru
# Этот скрипт автоматически:
# 1. Подключится к серверу
# 2. Загрузит необходимые файлы
# 3. Установит и настроит Nginx с SSL
# 4. Проверит работоспособность

set -e

# Цвета для вывода
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Конфигурация сервера
VPS_USER="user1"
VPS_HOST="192.144.12.102"
VPS_PATH="/home/user1/coffe"
SSH_KEY="$HOME/.ssh/coffe_key"

# Если SSH ключ не найден, попробовать другие варианты
if [ ! -f "$SSH_KEY" ]; then
    if [ -f "$HOME/.ssh/id_ed25519" ]; then
        SSH_KEY="$HOME/.ssh/id_ed25519"
    elif [ -f "$HOME/.ssh/id_rsa" ]; then
        SSH_KEY="$HOME/.ssh/id_rsa"
    else
        echo -e "${YELLOW}⚠️  SSH ключ не найден. Попробую подключиться без ключа...${NC}"
        SSH_KEY=""
    fi
fi

# Функция для SSH подключения
ssh_exec() {
    if [ -n "$SSH_KEY" ]; then
        ssh -o StrictHostKeyChecking=no -o ConnectTimeout=10 -i "$SSH_KEY" "${VPS_USER}@${VPS_HOST}" "$@"
    else
        ssh -o StrictHostKeyChecking=no -o ConnectTimeout=10 "${VPS_USER}@${VPS_HOST}" "$@"
    fi
}

# Функция для SCP копирования
scp_file() {
    if [ -n "$SSH_KEY" ]; then
        scp -o StrictHostKeyChecking=no -i "$SSH_KEY" "$@"
    else
        scp -o StrictHostKeyChecking=no "$@"
    fi
}

echo ""
echo -e "${BLUE}=========================================${NC}"
echo -e "${BLUE}  🚀 Автоматическое исправление сайта${NC}"
echo -e "${BLUE}  🌐 https://coffe-ug.ru${NC}"
echo -e "${BLUE}=========================================${NC}"
echo ""

# Шаг 1: Проверка подключения
echo -e "${YELLOW}[1/6] Проверка подключения к серверу...${NC}"
if ssh_exec "echo 'Подключено'" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Подключение к серверу успешно${NC}"
else
    echo -e "${RED}❌ Не удалось подключиться к серверу${NC}"
    echo -e "${YELLOW}Попробуйте:${NC}"
    echo -e "  ssh ${VPS_USER}@${VPS_HOST}"
    echo -e "${YELLOW}Если не работает, проверьте SSH ключи${NC}"
    exit 1
fi
echo ""

# Шаг 2: Загрузка файлов на сервер
echo -e "${YELLOW}[2/6] Загрузка файлов на сервер...${NC}"

# Создать директорию, если не существует
ssh_exec "mkdir -p ${VPS_PATH}/nginx-setup" || true

# Загрузить файлы
FILES_TO_UPLOAD=(
    "nginx-host.conf"
    "setup-nginx-ssl.sh"
    "check-site-health.sh"
)

for file in "${FILES_TO_UPLOAD[@]}"; do
    if [ -f "$file" ]; then
        echo -e "  📤 Загрузка $file..."
        scp_file "$file" "${VPS_USER}@${VPS_HOST}:${VPS_PATH}/nginx-setup/"
    else
        echo -e "${RED}❌ Файл $file не найден!${NC}"
        exit 1
    fi
done

echo -e "${GREEN}✅ Файлы загружены${NC}"
echo ""

# Шаг 3: Установка Nginx и SSL
echo -e "${YELLOW}[3/6] Установка Nginx и получение SSL сертификата...${NC}"
echo -e "${BLUE}Это может занять несколько минут...${NC}"
echo ""

# Создать модифицированный скрипт для запуска
ssh_exec "cat > ${VPS_PATH}/nginx-setup/run-setup.sh << 'SETUP_EOF'
#!/bin/bash
set -e

cd ${VPS_PATH}/nginx-setup

# Сделать скрипт исполняемым
chmod +x setup-nginx-ssl.sh

# Скопировать nginx-host.conf в правильное место с sudo
sudo mkdir -p /etc/nginx/sites-available
sudo cp nginx-host.conf /tmp/coffe-ug.ru.conf
sudo mv /tmp/coffe-ug.ru.conf /etc/nginx/sites-available/coffe-ug.ru

# Установить Nginx и Certbot
echo '📦 Проверка и установка Nginx и Certbot...'
sudo apt update -qq

# Установить Nginx если не установлен
if ! command -v nginx &> /dev/null; then
    echo '  Установка Nginx...'
    sudo apt install -y nginx
fi

# Установить Certbot если не установлен
if ! command -v certbot &> /dev/null; then
    echo '  Установка Certbot...'
    sudo apt install -y certbot python3-certbot-nginx
fi

echo '✅ Nginx и Certbot установлены'

# Остановить Nginx временно
sudo systemctl stop nginx || true

# Создать директорию для certbot
sudo mkdir -p /var/www/certbot

# Создать временную конфигурацию для получения сертификата
cat > /tmp/coffe-ug.ru-temp << 'EOF_TEMP'
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
EOF_TEMP

sudo mv /tmp/coffe-ug.ru-temp /etc/nginx/sites-available/coffe-ug.ru-temp

# Создать простую страницу
echo '<html><body><h1>Setting up...</h1></body></html>' | sudo tee /var/www/html/index.html > /dev/null

# Включить временную конфигурацию
sudo ln -sf /etc/nginx/sites-available/coffe-ug.ru-temp /etc/nginx/sites-enabled/coffe-ug.ru
sudo rm -f /etc/nginx/sites-enabled/default

# Проверить конфигурацию
sudo nginx -t

# Запустить Nginx
sudo systemctl start nginx

# Получить сертификат
echo '🔐 Получение SSL сертификата от Let'\''s Encrypt...'
sudo certbot certonly --webroot -w /var/www/certbot \
    -d coffe-ug.ru -d www.coffe-ug.ru \
    --non-interactive --agree-tos --email admin@coffe-ug.ru || {
    echo '⚠️ Не удалось получить сертификат автоматически'
    echo 'Это может быть из-за:'
    echo '  - DNS не настроен правильно'
    echo '  - Firewall блокирует порт 80'
    echo '  - Сертификат уже существует'
    echo ''
    echo 'Проверяю существующий сертификат...'
    if [ -f '/etc/letsencrypt/live/coffe-ug.ru/fullchain.pem' ]; then
        echo '✅ Сертификат уже существует, продолжаю...'
    else
        echo '❌ Сертификат не найден'
        exit 1
    fi
}

# Установить финальную конфигурацию с SSL
sudo ln -sf /etc/nginx/sites-available/coffe-ug.ru /etc/nginx/sites-enabled/coffe-ug.ru

# Проверить конфигурацию
sudo nginx -t

# Перезапустить Nginx
sudo systemctl reload nginx

# Включить автозапуск
sudo systemctl enable nginx

# Настроить автообновление сертификатов
(sudo crontab -l 2>/dev/null; echo \"0 0,12 * * * certbot renew --quiet --post-hook 'systemctl reload nginx'\") | sudo crontab -

echo ''
echo '✅ Nginx и SSL настроены!'
SETUP_EOF
"

# Сделать скрипт исполняемым и запустить
ssh_exec "chmod +x ${VPS_PATH}/nginx-setup/run-setup.sh && bash ${VPS_PATH}/nginx-setup/run-setup.sh"

echo ""
echo -e "${GREEN}✅ Nginx и SSL установлены${NC}"
echo ""

# Шаг 4: Проверка Docker контейнеров
echo -e "${YELLOW}[4/6] Проверка Docker контейнеров...${NC}"

if ssh_exec "cd ${VPS_PATH} && docker ps | grep -q coffee_frontend_prod"; then
    echo -e "${GREEN}✅ Frontend контейнер работает${NC}"
else
    echo -e "${YELLOW}⚠️  Frontend контейнер не запущен, запускаю...${NC}"
    ssh_exec "cd ${VPS_PATH} && docker-compose -f docker-compose.prod.yml up -d frontend"
fi

if ssh_exec "cd ${VPS_PATH} && docker ps | grep -q coffee_backend_prod"; then
    echo -e "${GREEN}✅ Backend контейнер работает${NC}"
else
    echo -e "${YELLOW}⚠️  Backend контейнер не запущен, запускаю...${NC}"
    ssh_exec "cd ${VPS_PATH} && docker-compose -f docker-compose.prod.yml up -d backend"
fi
echo ""

# Шаг 5: Проверка здоровья
echo -e "${YELLOW}[5/6] Проверка работоспособности...${NC}"

# Скопировать скрипт проверки и запустить
ssh_exec "cd ${VPS_PATH}/nginx-setup && chmod +x check-site-health.sh && bash check-site-health.sh" || true

echo ""

# Шаг 6: Финальная проверка
echo -e "${YELLOW}[6/6] Финальная проверка сайта...${NC}"

sleep 3

if curl -sf https://coffe-ug.ru > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Сайт доступен через HTTPS!${NC}"
    HTTP_CODE=$(curl -s -o /dev/null -w '%{http_code}' https://coffe-ug.ru)
    echo -e "${GREEN}   HTTP Status: ${HTTP_CODE}${NC}"
else
    echo -e "${YELLOW}⚠️  Сайт пока не отвечает через HTTPS${NC}"
    echo -e "${YELLOW}   Это может быть временно, DNS может потребовать времени${NC}"
fi

echo ""
echo -e "${BLUE}=========================================${NC}"
echo -e "${GREEN}✅ УСТАНОВКА ЗАВЕРШЕНА!${NC}"
echo -e "${BLUE}=========================================${NC}"
echo ""
echo -e "${GREEN}Ваш сайт должен быть доступен по адресу:${NC}"
echo -e "${BLUE}  🌐 https://coffe-ug.ru${NC}"
echo -e "${BLUE}  🌐 https://www.coffe-ug.ru${NC}"
echo ""
echo -e "${YELLOW}📊 Полезные команды:${NC}"
echo -e "${YELLOW}Подключиться к серверу:${NC}"
echo -e "  ssh ${VPS_USER}@${VPS_HOST}"
echo ""
echo -e "${YELLOW}Проверить статус:${NC}"
echo -e "  ssh ${VPS_USER}@${VPS_HOST} 'sudo systemctl status nginx'"
echo -e "  ssh ${VPS_USER}@${VPS_HOST} 'cd ${VPS_PATH} && docker ps'"
echo ""
echo -e "${YELLOW}Посмотреть логи:${NC}"
echo -e "  ssh ${VPS_USER}@${VPS_HOST} 'sudo tail -f /var/log/nginx/coffe-ug.ru-error.log'"
echo -e "  ssh ${VPS_USER}@${VPS_HOST} 'docker logs -f coffee_backend_prod'"
echo ""
echo -e "${YELLOW}Перезапустить:${NC}"
echo -e "  ssh ${VPS_USER}@${VPS_HOST} 'sudo systemctl restart nginx'"
echo -e "  ssh ${VPS_USER}@${VPS_HOST} 'cd ${VPS_PATH} && docker-compose -f docker-compose.prod.yml restart'"
echo ""
echo -e "${GREEN}🎉 Готово!${NC}"
echo ""

