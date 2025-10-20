# 🚀 Руководство по деплою на продакшен

## 📋 Что было создано

### ✅ **Дамп базы данных для продакшена**
- **Полный дамп**: `production-dump/production_dump_20251016_225347.sql` (584KB)
- **Seed данные**: `production-dump/production_seed_20251016_225347.sql` (9.6KB)
- **Архив**: `production-dump/production_dump_20251016_225347.tar.gz` (223KB)

### 📊 **Статистика данных**
- **Пользователи**: 3 (admin, manager, engineer)
- **Организации**: 8 (с различными ставками)
- **Заказы**: 54 (различных статусов)
- **Уведомления**: 92
- **Активность**: 191 запись
- **Ставки**: 16 связей инженер-организация

## 🛠 Установка на продакшене

### 1. **Подготовка сервера**
```bash
# Установка Node.js (если не установлен)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Установка SQLite
sudo apt-get install -y sqlite3

# Установка PM2 для управления процессами
sudo npm install -g pm2
```

### 2. **Развертывание приложения**
```bash
# Клонирование репозитория
git clone <your-repo-url> coffee-admin
cd coffee-admin

# Установка зависимостей
npm install

# Установка зависимостей для backend и frontend
cd backend && npm install
cd ../frontend && npm install
cd ..
```

### 3. **Настройка базы данных**
```bash
# Создание базы данных из дампа
sqlite3 backend/database.sqlite < production-dump/production_dump_20251016_225347.sql

# Или только с базовыми данными (если нужна чистая установка)
sqlite3 backend/database.sqlite < production-dump/production_seed_20251016_225347.sql
```

### 4. **Настройка переменных окружения**
```bash
# Создание .env файла для backend
cat > backend/.env << EOF
NODE_ENV=production
PORT=3001
JWT_SECRET=your-super-secret-jwt-key-here
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=your-db-user
DB_PASSWORD=your-db-password
DB_DATABASE=coffee_admin_prod
EOF
```

### 5. **Сборка frontend**
```bash
cd frontend
npm run build
cd ..
```

### 6. **Запуск приложения**
```bash
# Запуск backend
cd backend
pm2 start "npm run start:prod" --name "coffee-admin-backend"

# Настройка nginx для frontend
sudo nano /etc/nginx/sites-available/coffee-admin
```

### 7. **Конфигурация Nginx**
```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /path/to/coffee-admin/frontend/dist;
    index index.html;

    # Frontend
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:3001/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 🔐 Пользователи по умолчанию

| Email | Пароль | Роль | Описание |
|-------|--------|------|----------|
| admin@coffee.com | admin123 | Администратор | Полный доступ |
| manager@coffee.com | manager123 | Менеджер | Управление заказами |
| engineer1@coffee.com | engineer123 | Инженер | Работа с заказами |
| engineer2@coffee.com | engineer123 | Инженер | Работа с заказами |

## 🏢 Организации

- **Вистекс** - 900₽/час, переработка 1.5x
- **РусХолтс** - 1100₽/час, без переработки
- **ТО Франко** - 1100₽/час, без переработки
- **Холод Вистекс** - 1200₽/час, переработка 1.5x
- **Франко** - 1210₽/час, переработка 1.5x
- **Локальный Сервис** - 1200₽/час, переработка 1.5x

## ⚙️ Настройки системы

- **auto_distribution_enabled**: false (ручное назначение заказов)
- **max_orders_per_engineer**: 10 (максимум заказов на инженера)
- **default_base_rate**: 800 (базовая ставка по умолчанию)
- **default_overtime_multiplier**: 1.5 (коэффициент переработки)

## 🔧 Первоначальная настройка

### 1. **Смена паролей**
```sql
-- Подключение к базе данных
sqlite3 backend/database.sqlite

-- Смена пароля администратора (новый пароль: newadmin123)
UPDATE users SET password = '$2b$10$new_hashed_password_here' WHERE email = 'admin@coffee.com';
```

### 2. **Настройка email уведомлений**
```bash
# В backend/.env добавить:
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

### 3. **Настройка резервного копирования**
```bash
# Создание cron задачи для ежедневного бэкапа
echo "0 2 * * * /path/to/coffee-admin/backup-daily.sh" | crontab -
```

## 📊 Мониторинг

### PM2 команды
```bash
# Статус процессов
pm2 status

# Логи
pm2 logs coffee-admin-backend

# Перезапуск
pm2 restart coffee-admin-backend

# Мониторинг
pm2 monit
```

### Логи приложения
```bash
# Backend логи
tail -f backend/logs/app.log

# Nginx логи
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

## 🚨 Безопасность

### 1. **Обязательные действия**
- [ ] Сменить все пароли по умолчанию
- [ ] Настроить SSL сертификат (Let's Encrypt)
- [ ] Настроить firewall (только 80, 443, 22)
- [ ] Включить автоматические обновления безопасности

### 2. **Рекомендации**
- [ ] Настроить мониторинг (Prometheus + Grafana)
- [ ] Настроить логирование (ELK Stack)
- [ ] Создать план резервного копирования
- [ ] Настроить алерты при ошибках

## 📞 Поддержка

При возникновении проблем:
1. Проверьте логи приложения
2. Убедитесь, что все сервисы запущены
3. Проверьте доступность базы данных
4. Проверьте конфигурацию nginx

## 📝 Changelog

- **2025-10-16**: Создан полный дамп базы данных
- **2025-10-16**: Добавлены seed данные для продакшена
- **2025-10-16**: Создана документация по деплою

---

**Готово к продакшену!** 🎉
