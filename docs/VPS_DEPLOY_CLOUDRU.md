# Деплой на VPS (Cloud.ru) с GitHub Actions

## 🎯 Обзор

Автоматический деплой приложения на VPS с использованием:

- 🐳 **Docker Compose** - оркестрация контейнеров
- 🔄 **GitHub Actions** - CI/CD автоматизация
- 🗄️ **MySQL 8** - база данных
- 🚀 **NestJS** - backend API
- 🎨 **Angular SSR** - frontend

---

## ⚙️ 1. Подготовка VPS (Cloud.ru)

### Первоначальная настройка (один раз):

```bash
# 1. Обновить систему
sudo apt update && sudo apt upgrade -y

# 2. Установить Docker и Docker Compose
sudo apt install -y docker.io docker-compose git

# 3. Добавить пользователя в группу docker
sudo usermod -aG docker $USER
newgrp docker

# 4. Проверить установку
docker --version
docker-compose --version

# 5. Создать директорию для проекта
mkdir -p ~/coffe
cd ~/coffe
```

### Настройка SSH ключей:

```bash
# На вашем локальном компьютере:
# 1. Сгенерировать SSH ключ (если нет)
ssh-keygen -t ed25519 -C "github-actions-deploy"

# 2. Скопировать публичный ключ на VPS
ssh-copy-id -i ~/.ssh/id_ed25519.pub user@your-vps-ip

# 3. Сохранить приватный ключ для GitHub Actions
cat ~/.ssh/id_ed25519
# Скопировать весь вывод (включая BEGIN и END)
```

---

## 🔐 2. Настройка GitHub Secrets

Перейдите в **GitHub → Settings → Secrets and variables → Actions → New repository secret**

Добавьте следующие секреты:

| Название              | Значение                  | Пример                                   |
| --------------------- | ------------------------- | ---------------------------------------- |
| `VPS_HOST`            | IP адрес вашего VPS       | `185.123.45.67`                          |
| `VPS_USER`            | Имя пользователя SSH      | `ubuntu` или `root`                      |
| `VPS_SSH_KEY`         | Приватный SSH ключ        | Весь вывод `cat ~/.ssh/id_ed25519`       |
| `JWT_SECRET`          | Секретный ключ JWT        | `your-super-secret-jwt-key-min-32-chars` |
| `MYSQL_ROOT_PASSWORD` | Пароль root MySQL         | `strong-root-password-123`               |
| `MYSQL_DATABASE`      | Имя базы данных           | `coffee_admin`                           |
| `MYSQL_USER`          | Пользователь MySQL        | `coffee_user`                            |
| `MYSQL_PASSWORD`      | Пароль пользователя MySQL | `strong-user-password-456`               |
| `SMTP_HOST`           | SMTP сервер               | `smtp.gmail.com`                         |
| `SMTP_PORT`           | SMTP порт                 | `587`                                    |
| `SMTP_USER`           | Email для отправки        | `your-email@gmail.com`                   |
| `SMTP_PASS`           | Пароль приложения Gmail   | `xxxx xxxx xxxx xxxx`                    |

### Генерация JWT_SECRET:

```bash
# На локальном компьютере:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 📁 3. Структура проекта (уже готова!)

```
coffe/
├── .github/
│   └── workflows/
│       └── deploy-vps.yml          ✅ Создан
├── backend/
│   ├── Dockerfile                  ✅ Есть
│   ├── src/
│   └── package.json
├── frontend/
│   ├── Dockerfile                  ✅ Есть
│   ├── src/
│   └── package.json
├── shared/
│   └── dtos/
├── docker-compose.prod.yml         ✅ Есть
└── .env.example
```

---

## 🚀 4. Первый деплой (вручную)

### На VPS выполните:

```bash
cd ~/coffe

# 1. Создать .env файл
cat > .env << 'EOF'
NODE_ENV=production
PORT=3001

# Database
DB_HOST=mysql
DB_PORT=3306
DB_USERNAME=coffee_user
DB_PASSWORD=coffee_password
DB_DATABASE=coffee_admin
DB_SSL=false

# JWT
JWT_SECRET=your-super-secret-jwt-key-min-32-chars

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# MySQL
MYSQL_ROOT_PASSWORD=rootpassword
MYSQL_DATABASE=coffee_admin
MYSQL_USER=coffee_user
MYSQL_PASSWORD=coffee_password
EOF

# 2. Запустить контейнеры
docker-compose -f docker-compose.prod.yml up -d --build

# 3. Проверить статус
docker-compose -f docker-compose.prod.yml ps

# 4. Проверить логи
docker-compose -f docker-compose.prod.yml logs -f backend
docker-compose -f docker-compose.prod.yml logs -f frontend
```

---

## 🔄 5. Автоматический деплой через GitHub Actions

### После настройки секретов:

1. **Сделайте commit и push в `main` ветку:**

   ```bash
   git add .
   git commit -m "Setup VPS deployment"
   git push origin main
   ```

2. **GitHub Actions автоматически:**
   - ✅ Скопирует код на VPS
   - ✅ Создаст `.env` файл
   - ✅ Пересоберёт Docker контейнеры
   - ✅ Запустит приложение
   - ✅ Очистит старые образы

3. **Проверить статус:**
   - Перейдите в **GitHub → Actions**
   - Откройте последний workflow run
   - Проверьте логи каждого шага

---

## 🧪 6. Проверка работоспособности

### После деплоя проверьте:

```bash
# 1. Backend API
curl http://YOUR_VPS_IP:3001/api/test

# 2. Frontend
curl http://YOUR_VPS_IP:4000

# 3. MySQL
ssh user@YOUR_VPS_IP
docker exec -it coffee_mysql_prod mysql -u coffee_user -p
# Введите пароль: coffee_password
SHOW DATABASES;
USE coffee_admin;
SHOW TABLES;
```

---

## 🔧 7. Управление на VPS

### Полезные команды:

```bash
# Просмотр логов
docker-compose -f docker-compose.prod.yml logs -f backend
docker-compose -f docker-compose.prod.yml logs -f frontend
docker-compose -f docker-compose.prod.yml logs -f mysql

# Перезапуск сервисов
docker-compose -f docker-compose.prod.yml restart backend
docker-compose -f docker-compose.prod.yml restart frontend

# Остановка всех сервисов
docker-compose -f docker-compose.prod.yml down

# Запуск с пересборкой
docker-compose -f docker-compose.prod.yml up -d --build

# Проверка статуса
docker-compose -f docker-compose.prod.yml ps

# Очистка
docker system prune -af
docker volume prune -f
```

---

## 🗄️ 8. Резервное копирование

### Автоматический бэкап MySQL:

```bash
# Создать скрипт бэкапа
cat > ~/backup-mysql.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/home/$USER/backups"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

docker exec coffee_mysql_prod mysqldump \
  -u coffee_user \
  -pcoffee_password \
  coffee_admin > $BACKUP_DIR/backup_$DATE.sql

# Удалить бэкапы старше 7 дней
find $BACKUP_DIR -name "backup_*.sql" -mtime +7 -delete

echo "Backup created: $BACKUP_DIR/backup_$DATE.sql"
EOF

chmod +x ~/backup-mysql.sh

# Добавить в crontab (каждый день в 2:00)
(crontab -l 2>/dev/null; echo "0 2 * * * ~/backup-mysql.sh") | crontab -
```

---

## 🌐 9. Настройка Nginx (опционально)

Если хотите использовать доменное имя и SSL:

```bash
# 1. Установить Nginx
sudo apt install -y nginx certbot python3-certbot-nginx

# 2. Создать конфигурацию
sudo nano /etc/nginx/sites-available/coffee-admin

# Вставить:
server {
    listen 80;
    server_name your-domain.com;

    # Frontend
    location / {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

# 3. Включить конфигурацию
sudo ln -s /etc/nginx/sites-available/coffee-admin /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# 4. Получить SSL сертификат
sudo certbot --nginx -d your-domain.com
```

---

## 📊 10. Мониторинг

### Проверка здоровья сервисов:

```bash
# Статус контейнеров
docker-compose -f docker-compose.prod.yml ps

# Использование ресурсов
docker stats

# Логи в реальном времени
docker-compose -f docker-compose.prod.yml logs -f --tail=100

# Проверка backend health
curl http://localhost:3001/api/test/health

# Проверка frontend
curl http://localhost:4000
```

---

## 🐛 11. Troubleshooting

### Проблема: Backend не запускается

```bash
# Проверить логи
docker-compose -f docker-compose.prod.yml logs backend

# Проверить переменные окружения
docker exec coffee_backend_prod env | grep DB_

# Проверить подключение к MySQL
docker exec coffee_backend_prod ping -c 3 mysql
```

### Проблема: Frontend не доступен

```bash
# Проверить логи
docker-compose -f docker-compose.prod.yml logs frontend

# Проверить порты
docker ps | grep frontend
netstat -tulpn | grep 4000
```

### Проблема: MySQL не запускается

```bash
# Проверить логи
docker-compose -f docker-compose.prod.yml logs mysql

# Проверить volume
docker volume ls | grep mysql

# Пересоздать volume (ВНИМАНИЕ: удалит данные!)
docker-compose -f docker-compose.prod.yml down -v
docker-compose -f docker-compose.prod.yml up -d
```

---

## 🔄 12. Обновление приложения

### Автоматическое (через GitHub):

```bash
# Просто сделайте push в main ветку
git push origin main

# GitHub Actions автоматически задеплоит
```

### Ручное (на VPS):

```bash
cd ~/coffe
git pull origin main
docker-compose -f docker-compose.prod.yml up -d --build
```

---

## 📋 13. Checklist перед деплоем

- [ ] ✅ Docker и Docker Compose установлены на VPS
- [ ] ✅ SSH ключ добавлен на VPS
- [ ] ✅ Все секреты добавлены в GitHub
- [ ] ✅ `.github/workflows/deploy-vps.yml` создан
- [ ] ✅ `docker-compose.prod.yml` настроен
- [ ] ✅ `backend/Dockerfile` готов
- [ ] ✅ `frontend/Dockerfile` готов
- [ ] ✅ Порты 3001 и 4000 открыты на VPS
- [ ] ✅ Домен настроен (опционально)

---

## 🎉 14. Первый запуск

### Шаг 1: Настроить секреты в GitHub

1. Перейти в **Settings → Secrets and variables → Actions**
2. Добавить все секреты из списка выше

### Шаг 2: Запушить код

```bash
git add .
git commit -m "Setup VPS deployment with GitHub Actions"
git push origin main
```

### Шаг 3: Проверить деплой

1. Перейти в **GitHub → Actions**
2. Дождаться завершения workflow
3. Открыть `http://YOUR_VPS_IP:4000`

### Шаг 4: Создать первого админа

```bash
# На VPS:
ssh user@YOUR_VPS_IP
cd ~/coffe
docker exec -it coffee_mysql_prod mysql -u coffee_user -pcoffee_password coffee_admin

# Выполнить SQL:
INSERT INTO users (email, password, first_name, last_name, role, is_active)
VALUES (
  'admin@coffee.com',
  '$2b$10$ELj2iIA4Wlakkfd6Xwz3oOwzkYYBMB.Rag1KDbyQtRKBj3nSbeZYu',
  'Admin',
  'User',
  'admin',
  1
);
```

---

## 📊 15. Мониторинг и логи

### Просмотр логов:

```bash
# Все сервисы
docker-compose -f docker-compose.prod.yml logs -f

# Только backend
docker-compose -f docker-compose.prod.yml logs -f backend

# Последние 100 строк
docker-compose -f docker-compose.prod.yml logs --tail=100 backend
```

### Мониторинг ресурсов:

```bash
# Использование CPU/RAM
docker stats

# Размер образов
docker images

# Размер volumes
docker system df -v
```

---

## 🔒 16. Безопасность

### Рекомендации:

1. **Firewall (UFW):**

   ```bash
   sudo ufw allow 22/tcp    # SSH
   sudo ufw allow 80/tcp    # HTTP
   sudo ufw allow 443/tcp   # HTTPS
   sudo ufw allow 3001/tcp  # Backend API
   sudo ufw allow 4000/tcp  # Frontend
   sudo ufw enable
   ```

2. **Изменить дефолтные пароли:**
   - Обновить `MYSQL_ROOT_PASSWORD`
   - Обновить `MYSQL_PASSWORD`
   - Обновить `JWT_SECRET`

3. **Использовать SSL:**
   - Настроить Nginx с Let's Encrypt
   - Перенаправлять HTTP → HTTPS

4. **Регулярные обновления:**
   ```bash
   sudo apt update && sudo apt upgrade -y
   docker pull mysql:8.0
   docker pull node:18-alpine
   ```

---

## 🎯 Итого

### Преимущества этого подхода:

✅ **Автоматизация** - Push в GitHub → автоматический деплой  
✅ **Изоляция** - Каждый сервис в своём контейнере  
✅ **Масштабируемость** - Легко добавить новые сервисы  
✅ **Откат** - Легко вернуться к предыдущей версии  
✅ **Мониторинг** - Централизованные логи  
✅ **Безопасность** - Секреты не в коде

### Ваши файлы уже готовы:

- ✅ `docker-compose.prod.yml` - настроен для MySQL
- ✅ `backend/Dockerfile` - готов
- ✅ `frontend/Dockerfile` - готов с SSR
- ✅ `.github/workflows/deploy-vps.yml` - создан

**Осталось только добавить секреты в GitHub и сделать push!** 🚀
