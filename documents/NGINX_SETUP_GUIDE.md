# Nginx Reverse Proxy Setup Guide

## Проблема

Раньше **Cloudflare Tunnel** проксировал трафик на внутренний порт 4000. Теперь трафик идёт **напрямую на IP сервера**, поэтому сервер должен **сам обслуживать HTTP/HTTPS на стандартных портах 80/443**.

Текущая конфигурация:

- Frontend (Angular): слушает на порту **4000** (внутри контейнера на 80, снаружи 4000)
- Backend (NestJS): слушает на порту **3001**
- **Проблема**: Сайт https://coffe-ug.ru и http://coffe-ug.ru не загружается, потому что ничего не слушает на портах 80/443

## Решение

Установить **Nginx** на хост-машине как **reverse proxy**, который будет:

1. Слушать на портах **80** (HTTP) и **443** (HTTPS)
2. Перенаправлять трафик на Docker-контейнеры:
   - `/api/*` → Backend (localhost:3001)
   - `/*` → Frontend (localhost:4000)
3. Обрабатывать **SSL/TLS** (HTTPS) с помощью Let's Encrypt

## Шаги установки

### 1. Подготовка файлов

Файлы уже созданы в репозитории:

- `nginx-host.conf` - конфигурация Nginx для хоста
- `setup-nginx-ssl.sh` - автоматический скрипт установки

### 2. Загрузка на сервер

```bash
# На вашем локальном компьютере
scp nginx-host.conf setup-nginx-ssl.sh root@your-server-ip:/root/coffe/

# Или через rsync
rsync -avz nginx-host.conf setup-nginx-ssl.sh root@your-server-ip:/root/coffe/
```

### 3. Подключение к серверу

```bash
ssh root@your-server-ip
cd /root/coffe
```

### 4. Запуск автоматической установки

```bash
# Сделать скрипт исполняемым
chmod +x setup-nginx-ssl.sh

# Запустить установку (требуется root)
sudo ./setup-nginx-ssl.sh
```

Скрипт выполнит:

1. ✅ Установку Nginx и Certbot
2. ✅ Получение SSL-сертификата от Let's Encrypt
3. ✅ Настройку reverse proxy
4. ✅ Настройку автоматического обновления сертификата
5. ✅ Запуск и проверку Nginx

### 5. Проверка работы

```bash
# Проверить статус Nginx
systemctl status nginx

# Проверить, что Nginx слушает на портах 80 и 443
netstat -tulpn | grep nginx
# Должно показать:
# tcp  0  0  0.0.0.0:80    0.0.0.0:*  LISTEN  1234/nginx
# tcp  0  0  0.0.0.0:443   0.0.0.0:*  LISTEN  1234/nginx

# Проверить SSL-сертификат
certbot certificates

# Проверить логи
tail -f /var/log/nginx/coffe-ug.ru-access.log
tail -f /var/log/nginx/coffe-ug.ru-error.log
```

### 6. Запуск Docker-контейнеров

```bash
# Убедитесь, что контейнеры запущены
docker-compose -f docker-compose.prod.yml up -d

# Проверить статус контейнеров
docker ps

# Проверить логи
docker logs coffee_frontend_prod
docker logs coffee_backend_prod
```

## Ручная установка (если автоскрипт не подходит)

### Шаг 1: Установка Nginx и Certbot

```bash
sudo apt update
sudo apt install -y nginx certbot python3-certbot-nginx
```

### Шаг 2: Получение SSL-сертификата

```bash
# Остановить Nginx временно
sudo systemctl stop nginx

# Создать директорию для certbot
sudo mkdir -p /var/www/certbot

# Получить сертификат
sudo certbot certonly --standalone -d coffe-ug.ru -d www.coffe-ug.ru --non-interactive --agree-tos --email admin@coffe-ug.ru
```

### Шаг 3: Установка конфигурации Nginx

```bash
# Скопировать конфигурацию
sudo cp nginx-host.conf /etc/nginx/sites-available/coffe-ug.ru

# Создать символическую ссылку
sudo ln -s /etc/nginx/sites-available/coffe-ug.ru /etc/nginx/sites-enabled/

# Удалить дефолтную конфигурацию
sudo rm -f /etc/nginx/sites-enabled/default

# Проверить конфигурацию
sudo nginx -t

# Запустить Nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

### Шаг 4: Настройка автообновления сертификата

```bash
# Добавить в crontab
sudo crontab -e

# Добавить строку:
0 0,12 * * * certbot renew --quiet --post-hook 'systemctl reload nginx'
```

## Архитектура после установки

```
Internet (Port 80/443)
         ↓
    Nginx (Host)
    /           \
   /             \
  ↓               ↓
Frontend        Backend
(Port 4000)   (Port 3001)
   ↓               ↓
Docker          Docker
Container      Container
```

## Проверка доступности

После установки проверьте:

1. **HTTP → HTTPS редирект:**

   ```bash
   curl -I http://coffe-ug.ru
   # Должен вернуть: Location: https://coffe-ug.ru/
   ```

2. **HTTPS доступность:**

   ```bash
   curl -I https://coffe-ug.ru
   # Должен вернуть: HTTP/2 200
   ```

3. **API доступность:**

   ```bash
   curl https://coffe-ug.ru/api/test
   # Должен вернуть ответ от backend
   ```

4. **Откройте в браузере:**
   - https://coffe-ug.ru - должна загрузиться Angular-приложение
   - https://coffe-ug.ru/api/test - должен вернуть JSON от API

## Troubleshooting

### Проблема: "502 Bad Gateway"

**Причина:** Docker-контейнеры не запущены или недоступны

**Решение:**

```bash
# Проверить контейнеры
docker ps

# Перезапустить
docker-compose -f docker-compose.prod.yml restart

# Проверить логи
docker logs coffee_frontend_prod
docker logs coffee_backend_prod
```

### Проблема: "Connection refused"

**Причина:** Nginx не может подключиться к контейнерам

**Решение:**

```bash
# Проверить, что порты открыты
netstat -tulpn | grep -E '(3001|4000)'

# Проверить, что контейнеры слушают на 0.0.0.0, а не на 127.0.0.1
docker exec coffee_backend_prod netstat -tulpn
```

### Проблема: Сертификат не получается

**Причина:** DNS не настроен или порт 80 занят

**Решение:**

```bash
# Проверить DNS
dig coffe-ug.ru
nslookup coffe-ug.ru

# Проверить, что порт 80 свободен
sudo netstat -tulpn | grep :80

# Остановить все сервисы на порту 80
sudo systemctl stop nginx
```

### Проблема: Firewall блокирует порты

**Решение:**

```bash
# Для UFW
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Для iptables
sudo iptables -A INPUT -p tcp --dport 80 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 443 -j ACCEPT
sudo iptables-save
```

## Важные команды

```bash
# Перезагрузка Nginx
sudo systemctl reload nginx

# Проверка конфигурации Nginx
sudo nginx -t

# Логи Nginx
sudo tail -f /var/log/nginx/coffe-ug.ru-access.log
sudo tail -f /var/log/nginx/coffe-ug.ru-error.log

# Проверка SSL-сертификата
sudo certbot certificates

# Ручное обновление сертификата
sudo certbot renew --dry-run

# Перезапуск Docker-контейнеров
docker-compose -f docker-compose.prod.yml restart

# Логи Docker
docker logs -f coffee_frontend_prod
docker logs -f coffee_backend_prod
```

## Безопасность

✅ **Что уже настроено:**

- Автоматический редирект HTTP → HTTPS
- Современные SSL/TLS протоколы (TLSv1.2, TLSv1.3)
- Безопасные заголовки (X-Frame-Options, X-Content-Type-Options, etc.)
- Автоматическое обновление SSL-сертификатов

🔒 **Дополнительные рекомендации:**

- Настройте firewall (ufw/iptables)
- Ограничьте доступ к портам 3001, 4000 только с localhost
- Регулярно обновляйте систему: `apt update && apt upgrade`
- Настройте fail2ban для защиты от brute-force атак

## Обновление конфигурации

Если нужно изменить конфигурацию Nginx:

```bash
# Редактировать конфигурацию
sudo nano /etc/nginx/sites-available/coffe-ug.ru

# Проверить
sudo nginx -t

# Применить изменения
sudo systemctl reload nginx
```

## Дополнительная информация

- **Документация Nginx:** https://nginx.org/en/docs/
- **Документация Certbot:** https://certbot.eff.org/
- **Let's Encrypt Rate Limits:** https://letsencrypt.org/docs/rate-limits/
