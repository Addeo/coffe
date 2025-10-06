# 🚀 Yandex Cloud + Docker Deployment Guide

Полное руководство по деплою Coffee Admin Panel в Yandex Cloud с использованием Docker и MySQL.

## 📋 Содержание

1. [Подготовка Yandex Cloud](#1-подготовка-yandex-cloud)
2. [Создание MySQL базы данных](#2-создание-mysql-базы-данных)
3. [Создание виртуальной машины](#3-создание-виртуальной-машины)
4. [Настройка переменных окружения](#4-настройка-переменных-окружения)
5. [Деплой приложения](#5-деплой-приложения)
6. [Настройка домена и SSL](#6-настройка-домена-и-ssl)
7. [Мониторинг и обслуживание](#7-мониторинг-и-обслуживание)

## 1. Подготовка Yandex Cloud

### Регистрация и настройка аккаунта

1. **Перейдите на [cloud.yandex.ru](https://cloud.yandex.ru)**
2. **Зарегистрируйтесь** или войдите в аккаунт
3. **Создайте платежный аккаунт** (привяжите карту)

### Создание облака и каталога

1. **Создайте облако** (если не создано автоматически)
2. **Создайте каталог** (папку) для проекта:
   - Название: `coffee-admin`
   - Описание: `Coffee Admin Panel Production`

## 2. Создание MySQL базы данных

### Создание Managed MySQL кластера

1. **Перейдите в каталог** `coffee-admin`
2. **В меню слева** → **Yandex Database** → **Кластеры**
3. **Нажмите "Создать кластер"**
4. **Выберите тип:** `MySQL`
5. **Настройки кластера:**
   - **Имя:** `coffee-mysql`
   - **Версия MySQL:** `8.0`
   - **Класс хоста:** `s3.small` (2 vCPU, 4 GB RAM)
   - **Хранилище:** 20 GB SSD
   - **Зона доступности:** `ru-central1-a`

### Настройка базы данных

6. **Настройки базы данных:**
   - **Имя базы:** `coffee_admin`
   - **Имя пользователя:** `coffee_user`
   - **Пароль:** `придумайте-сильный-пароль`

7. **Настройки сети:**
   - **Группы безопасности:** Создайте новую
   - **Разрешить доступ из интернета:** ✅ Включено

8. **Создайте кластер** (это займет 10-15 минут)

### Получение данных для подключения

После создания кластера:

- **Хост:** `c-xxx.ru-central1.internal` (или внешний хост)
- **Порт:** `3306`
- **База данных:** `coffee_admin`
- **Пользователь:** `coffee_user`
- **Пароль:** `ваш-пароль`

## 3. Создание виртуальной машины

### Создание VM для приложения

1. **В меню слева** → **Compute Cloud** → **Виртуальные машины**
2. **Нажмите "Создать VM"**
3. **Настройки VM:**
   - **Имя:** `coffee-backend`
   - **Зона:** `ru-central1-a`
   - **Платформа:** Ubuntu 22.04 LTS
   - **vCPU:** 2
   - **RAM:** 4 GB
   - **Диск:** 20 GB SSD

### Настройка сети и безопасности

4. **Сеть:**
   - **Подсеть:** `default-ru-central1-a`
   - **Публичный адрес:** ✅ Автоматически

5. **Группы безопасности:**
   - **Создайте правило:** TCP, порт 22 (SSH)
   - **Создайте правило:** TCP, порт 80 (HTTP)
   - **Создайте правило:** TCP, порт 443 (HTTPS)
   - **Создайте правило:** TCP, порт 3000 (приложение)

### SSH ключи

6. **SSH ключи:**

   ```bash
   # Сгенерируйте ключ (если нет)
   ssh-keygen -t ed25519 -C "yandex-cloud"

   # Скопируйте публичный ключ
   cat ~/.ssh/id_ed25519.pub
   ```

7. **Вставьте публичный ключ** в поле SSH ключей

8. **Создайте VM** (это займет 2-3 минуты)

### Подключение к VM

После создания:

```bash
ssh -i ~/.ssh/id_ed25519 yc-user@VM_EXTERNAL_IP
```

## 4. Настройка переменных окружения

### Создание файла .env.prod

Создайте файл `backend/.env.prod`:

```env
# Yandex Cloud Production Environment Variables

# Application Settings
NODE_ENV=production
PORT=3000

# Database Settings (Yandex Cloud MySQL)
DB_HOST=ваш-mysql-хост.db.yandex.net
DB_PORT=3306
DB_USERNAME=coffee_user
DB_PASSWORD=ваш-сильный-пароль
DB_DATABASE=coffee_admin
DB_SSL=true

# JWT Secret (СГЕНЕРИРУЙТЕ СЛУЧАЙНЫЙ КЛЮЧ!)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production-2025-random-string

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=ваш-email@gmail.com
SMTP_PASS=ваш-app-password

# File Upload Settings
UPLOAD_DEST=./uploads
MAX_FILE_SIZE=52428800
```

### Генерация JWT секрета

```bash
# Сгенерируйте случайный ключ
openssl rand -hex 32
```

## 5. Деплой приложения

### Использование скрипта деплоя

```bash
# Сделайте скрипт исполняемым
chmod +x deploy-yandex-cloud.sh

# Запустите деплой
./deploy-yandex-cloud.sh ВАШ_VM_IP ~/.ssh/id_ed25519
```

### Ручной деплой (если скрипт не работает)

1. **Соберите приложение:**

   ```bash
   cd backend
   npm run build
   cd ..
   ```

2. **Загрузите файлы на VM:**

   ```bash
   scp -i ~/.ssh/id_ed25519 docker-compose.prod.yml yc-user@VM_IP:~/
   scp -i ~/.ssh/id_ed25519 backend/.env.prod yc-user@VM_IP:~/
   scp -r -i ~/.ssh/id_ed25519 backend/dist yc-user@VM_IP:~/
   scp -i ~/.ssh/id_ed25519 backend/package*.json yc-user@VM_IP:~/
   ```

3. **На VM установите Docker:**

   ```bash
   ssh -i ~/.ssh/id_ed25519 yc-user@VM_IP

   # Установка Docker
   sudo apt update
   sudo apt install -y docker.io docker-compose
   sudo systemctl start docker
   sudo usermod -aG docker $USER
   ```

4. **Запустите приложение:**
   ```bash
   docker-compose -f docker-compose.prod.yml up -d --build
   ```

## 6. Настройка домена и SSL

### Покупка домена

1. **Зарегистрируйте домен** (namecheap.com, reg.ru)
2. **Стоимость:** 10-15$ в год

### Настройка DNS

1. **В панели регистратора** укажите NS сервера Yandex Cloud:

   ```
   ns1.yandexcloud.net
   ns2.yandexcloud.net
   ```

2. **Создайте A-запись:**
   - **Имя:** `@` или `www`
   - **Тип:** `A`
   - **Значение:** `ВАШ_VM_IP`

### SSL сертификат

1. **Установите Nginx:**

   ```bash
   sudo apt install nginx
   ```

2. **Создайте конфиг Nginx** (`/etc/nginx/sites-available/coffee-admin`):

   ```nginx
   server {
       listen 80;
       server_name your-domain.com www.your-domain.com;

       location / {
           proxy_pass http://localhost:3000;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
       }
   }
   ```

3. **Включите сайт:**

   ```bash
   sudo ln -s /etc/nginx/sites-available/coffee-admin /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl reload nginx
   ```

4. **Получите SSL:**
   ```bash
   sudo apt install certbot python3-certbot-nginx
   sudo certbot --nginx -d your-domain.com -d www.your-domain.com
   ```

## 7. Мониторинг и обслуживание

### Просмотр логов

```bash
# На VM
docker-compose -f docker-compose.prod.yml logs -f backend
```

### Перезапуск приложения

```bash
# На VM
docker-compose -f docker-compose.prod.yml restart backend
```

### Бэкапы базы данных

1. **В консоли Yandex Cloud** → Yandex Database
2. **Выберите кластер** → Настройки → Резервные копии
3. **Настройте расписание** бэкапов

### Мониторинг

1. **Yandex Monitoring** - встроенный мониторинг
2. **Настройте алерты** на CPU, RAM, диск

## 💰 Стоимость владения

### Ежемесячные расходы:

- **VM (2 vCPU, 4 GB RAM):** ~300₽
- **MySQL (s3.small):** ~500₽
- **Внешний IP:** ~150₽
- **Домен:** ~100₽
- **Итого:** ~1050₽/месяц

### Бесплатно:

- **SSL сертификат** (Let's Encrypt)
- **Yandex Cloud monitoring**

## 🆘 Troubleshooting

### Приложение не запускается

```bash
# Проверьте логи
docker-compose -f docker-compose.prod.yml logs backend

# Проверьте статус контейнеров
docker-compose -f docker-compose.prod.yml ps
```

### База данных недоступна

```bash
# Проверьте подключение к MySQL
telnet ваш-mysql-хост.db.yandex.net 3306
```

### Проблемы с SSL

```bash
# Проверьте сертификат
sudo certbot certificates

# Перевыпустите сертификат
sudo certbot renew
```

---

## 🎯 Быстрый чек-лист

- [ ] Регистрация в Yandex Cloud
- [ ] Создание каталога
- [ ] Настройка MySQL кластера
- [ ] Создание VM инстанса
- [ ] Настройка SSH ключей
- [ ] Создание .env.prod файла
- [ ] Запуск скрипта деплоя
- [ ] Проверка работы приложения
- [ ] Настройка домена
- [ ] Установка SSL сертификата
- [ ] Настройка бэкапов

**Готово!** 🚀 Ваше приложение запущено в Yandex Cloud!
