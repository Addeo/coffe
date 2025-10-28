# 🚀 Быстрое внедрение Fallback системы

## ⚡ За 5 минут

### 1. Переключиться на fallback Docker Compose

```bash
# Остановить текущие контейнеры
docker-compose down

# Запустить с fallback механизмом
docker-compose -f docker-compose.fallback.yml up -d --build
```

### 2. Проверить работу

```bash
# Проверить health check
curl http://localhost:3001/api/health

# Проверить frontend
curl http://localhost:4000
```

### 3. Настроить мониторинг

```bash
# Сделать скрипты исполняемыми
chmod +x scripts/fallback-manager.sh
chmod +x scripts/system-monitor.sh
chmod +x deploy-with-fallback.sh

# Проверить систему
./scripts/system-monitor.sh check
```

## 🔧 Настройка для Production

### 1. Обновить GitHub Actions

Заменить `.github/workflows/deploy-vps.yml` на `.github/workflows/deploy-with-fallback.yml`

### 2. Настроить переменные окружения

```bash
# В GitHub Secrets добавить:
VPS_HOST=your-server-ip
VPS_USER=root
VPS_SSH_KEY=your-ssh-key
MYSQL_USER=coffee_user
MYSQL_PASSWORD=coffee_password
# ... остальные переменные
```

### 3. Настроить мониторинг на сервере

```bash
# Добавить в crontab для автоматического мониторинга
crontab -e

# Добавить строку:
*/5 * * * * /path/to/scripts/system-monitor.sh check
```

## 🎯 Что изменилось

### До:
- ❌ Сервер падал при неудачной сборке
- ❌ Нет механизма отката
- ❌ Нет health checks

### После:
- ✅ Автоматический fallback на последнюю рабочую версию
- ✅ Health checks для всех сервисов
- ✅ Автоматические бэкапы
- ✅ Мониторинг и алерты
- ✅ Graceful degradation

## 🛠️ Команды для управления

```bash
# Проверка здоровья
./scripts/system-monitor.sh check

# Статус системы
./scripts/system-monitor.sh status

# Деплой с fallback
./deploy-with-fallback.sh

# Управление бэкапами
./scripts/fallback-manager.sh list backend
./scripts/fallback-manager.sh restore backend /app/dist
```

## 📊 Мониторинг

### Health Check URLs:
- Backend: `http://your-server:3001/api/health`
- Frontend: `http://your-server:4000`

### Логи:
- Система: `/var/log/system-monitor.log`
- Docker: `docker logs coffee_backend_fallback`

## 🚨 Аварийные процедуры

### Если система не работает:

1. **Проверить статус:**
```bash
./scripts/system-monitor.sh status
```

2. **Попытаться восстановление:**
```bash
./scripts/system-monitor.sh recover
```

3. **Ручной откат:**
```bash
# Найти последний бэкап
ls -la ~/coffe/backups/

# Восстановить
tar -xzf ~/coffe/backups/backup-YYYYMMDD_HHMMSS.tar.gz -C ~/coffe
docker-compose -f docker-compose.fallback.yml up -d
```

## ✅ Готово!

Теперь ваша система имеет:
- 🛡️ Защиту от падения при неудачной сборке
- 🔄 Автоматическое восстановление
- 📊 Мониторинг состояния
- 🚨 Систему алертов

**Система готова к production использованию!**
