# 🚀 SberCloud Deployment Guide

Полное руководство по деплою Coffee Admin Panel в SberCloud с использованием Docker и MySQL.

## 📋 Содержание

1. [Подготовка SberCloud](#1-подготовка-sbercloud)
2. [Создание виртуальной машины (ECS)](#2-создание-виртуальной-машины-ecs)
3. [Создание MySQL базы данных (RDS)](#3-создание-mysql-базы-данных-rds)
4. [Настройка переменных окружения](#4-настройка-переменных-окружения)
5. [Деплой приложения](#5-деплой-приложения)
6. [Настройка домена и SSL](#6-настройка-домена-и-ssl)
7. [Мониторинг и обслуживание](#7-мониторинг-и-обслуживание)

## 1. Подготовка SberCloud

### Регистрация и настройка аккаунта

1. **Перейдите на [sbercloud.ru](https://sbercloud.ru)**
2. **Зарегистрируйтесь** или войдите в существующий аккаунт
3. **Пройдите верификацию** (паспортные данные для юридических лиц)
4. **Пополните баланс** (минимум 1000₽ для теста)

### Создание проекта

1. **Создайте проект** в регионе **Москва** или **Санкт-Петербург**
2. **Название проекта:** `coffee-admin-prod`
3. **Описание:** `Production deployment for Coffee Admin Panel`

## 2. Создание виртуальной машины (ECS)

### Настройка ECS инстанса

1. **В консоли SberCloud** → **Вычислительные ресурсы** → **Elastic Cloud Server (ECS)**
2. **Нажмите "Купить инстанс"**

### Выбор конфигурации

3. **Регион:** Москва или Санкт-Петербург
4. **ОС:** Ubuntu 22.04 LTS
5. **Тип инстанса:** `s3.medium.2` (рекомендую)
   - **vCPU:** 2
   - **RAM:** 4 GB
   - **Цена:** ~300₽/месяц

### Настройка сети и безопасности

6. **VPC:** Создайте новую VPC
   - **CIDR:** `192.168.0.0/16`
   - **Подсеть:** `192.168.1.0/24`

7. **Группа безопасности:**
   - **Создайте правило:** TCP, порт 22 (SSH) - для вашего IP
   - **Создайте правило:** TCP, порт 80 (HTTP)
   - **Создайте правило:** TCP, порт 443 (HTTPS)
   - **Создайте правило:** TCP, порт 3000 (приложение)

8. **Публичный IP:** Назначьте Elastic IP (EIP)
   - **Тип:** Базовый
   - **Цена:** ~120₽/месяц

### SSH ключи

9. **SSH ключ:**

   ```bash
   # Сгенерируйте ключ (если нет)
   ssh-keygen -t ed25519 -C "sbercloud"

   # Скопируйте публичный ключ
   cat ~/.ssh/id_ed25519.pub
   ```

10. **Вставьте публичный ключ** в поле SSH ключа

11. **Создайте инстанс** (займет 5-10 минут)

### Подключение к ECS

После создания:

```bash
ssh -i ~/.ssh/id_ed25519 ubuntu@ВАШ_ELASTIC_IP
```

## 3. Создание MySQL базы данных (RDS)

### Настройка RDS MySQL

1. **В консоли** → **Базы данных** → **Relational Database Service (RDS)**
2. **Нажмите "Создать инстанс БД"**

### Выбор конфигурации

3. **Тип БД:** MySQL
4. **Версия:** 8.0
5. **Регион:** Тот же, что и ECS (Москва/СПб)

### Спецификации инстанса

6. **Класс инстанса:** `rds.mysql.s3.medium`
   - **vCPU:** 2
   - **RAM:** 4 GB
   - **Хранилище:** 40 GB SSD
   - **Цена:** ~500₽/месяц

### Настройки базы данных

7. **Имя инстанса:** `coffee-mysql-prod`
8. **Имя БД:** `coffee_admin`
9. **Пользователь:** `coffee_user`
10. **Пароль:** `Придумайте-сильный-пароль-2025!`

### Настройки сети

11. **VPC:** Та же, что и ECS
12. **Подсеть:** Та же, что и ECS
13. **Группа безопасности:** Разрешить доступ с ECS инстанса

### Создание инстанса

14. **Создайте инстанс** (займет 10-15 минут)

### Получение данных подключения

После создания:

- **Endpoint:** `coffee-mysql-prod.xxxx.rds.sbercloud.ru`
- **Порт:** `3306`
- **База данных:** `coffee_admin`
- **Пользователь:** `coffee_user`

## 4. Настройка переменных окружения

### Создание файла .env.prod

Создайте файл `backend/.env.prod`:

```env
# SberCloud Production Environment Variables

# Application Settings
NODE_ENV=production
PORT=3000

# Database Settings (SberCloud RDS MySQL)
DB_HOST=coffee-mysql-prod.xxxx.rds.sbercloud.ru
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
chmod +x deploy-sbercloud.sh

# Запустите деплой
./deploy-sbercloud.sh ВАШ_ELASTIC_IP ~/.ssh/id_ed25519
```

### Ручной деплой (если скрипт не работает)

1. **Соберите приложение:**

   ```bash
   cd backend
   npm run build
   cd ..
   ```

2. **Загрузите файлы на ECS:**

   ```bash
   scp -i ~/.ssh/id_ed25519 docker-compose.prod.yml ubuntu@ВАШ_IP:~/
   scp -i ~/.ssh/id_ed25519 backend/.env.prod ubuntu@ВАШ_IP:~/
   scp -r -i ~/.ssh/id_ed25519 backend/dist ubuntu@ВАШ_IP:~/
   scp -i ~/.ssh/id_ed25519 backend/package*.json ubuntu@ВАШ_IP:~/
   ```

3. **На ECS установите Docker:**

   ```bash
   ssh -i ~/.ssh/id_ed25519 ubuntu@ВАШ_IP

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

1. **Зарегистрируйте домен** (reg.ru, namecheap.com)
2. **Стоимость:** 100-150₽/год

### Настройка DNS

1. **В панели регистратора** добавьте A-запись:
   - **Имя:** `@` или `www`
   - **Тип:** `A`
   - **Значение:** `ВАШ_ELASTIC_IP`

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

### Cloud Eye (мониторинг)

1. **В консоли** → **Мониторинг** → **Cloud Eye**
2. **Настройте метрики** для ECS и RDS:
   - CPU utilization
   - Memory usage
   - Disk I/O
   - Network traffic

### Резервное копирование

1. **RDS** → **Резервные копии**
2. **Настройте расписание** бэкапов
3. **Автоматическое резервное копирование** включено по умолчанию

### Логи приложения

```bash
# На ECS
docker-compose -f docker-compose.prod.yml logs -f backend
```

### Обновление приложения

```bash
# На ECS
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d
```

## 💰 Стоимость владения

### Ежемесячные расходы:

| **Сервис**    | **Конфигурация**                | **Цена/месяц**  |
| ------------- | ------------------------------- | --------------- |
| **ECS (VM)**  | s3.medium.2 (2 vCPU, 4 GB)      | ~300₽           |
| **RDS MySQL** | s3.medium (2 vCPU, 4 GB, 40 GB) | ~500₽           |
| **EIP**       | Публичный IP                    | ~120₽           |
| **Домен**     | Через Reg.ru                    | ~10₽            |
| **Итого**     | -                               | **~930₽/месяц** |

### Бесплатные ресурсы:

- ✅ **SSL сертификат** (Let's Encrypt)
- ✅ **Мониторинг** (Cloud Eye)
- ✅ **Бэкапы** (включены в RDS)

## 🆘 Troubleshooting

### Приложение не запускается

```bash
# Проверьте логи
docker-compose -f docker-compose.prod.yml logs backend

# Проверьте статус контейнеров
docker-compose -f docker-compose.prod.yml ps

# Проверьте подключение к БД
telnet coffee-mysql-prod.xxxx.rds.sbercloud.ru 3306
```

### Проблемы с сетью

1. **Проверьте группы безопасности** в консоли SberCloud
2. **Убедитесь,** что ECS и RDS в одной VPC
3. **Проверьте EIP** привязку

### Высокая нагрузка

1. **Масштабируйте ECS** до большего размера
2. **Добавьте реплику RDS** для чтения
3. **Настройте Cloud Eye** алерты

---

## 🎯 Быстрый чек-лист

- [ ] Регистрация в SberCloud
- [ ] Создание проекта
- [ ] Настройка VPC и подсетей
- [ ] Создание ECS инстанса
- [ ] Создание RDS MySQL
- [ ] Настройка групп безопасности
- [ ] Создание файла .env.prod
- [ ] Запуск скрипта деплоя
- [ ] Проверка работы приложения
- [ ] Настройка домена
- [ ] Установка SSL сертификата
- [ ] Настройка мониторинга

**Готово!** 🚀 Ваше приложение запущено в SberCloud!

_SberCloud - надежное решение для российских компаний_ 🇷🇺
