# 🚀 Быстрое внедрение Fallback системы в Production

## ⚡ За 10 минут

### 1. Обновить GitHub Actions (2 минуты)

```bash
# Переименовать старый workflow
mv .github/workflows/deploy-vps.yml .github/workflows/deploy-vps.yml.backup

# Использовать новый workflow с fallback
# Файл уже создан: .github/workflows/deploy-with-fallback.yml
```

### 2. Настроить переменные окружения (3 минуты)

В GitHub Secrets добавить:
```
VPS_HOST=your-server-ip
VPS_USER=root
VPS_SSH_KEY=your-ssh-key
MYSQL_USER=coffee_user
MYSQL_PASSWORD=coffee_password
MYSQL_DATABASE=coffee_admin
MYSQL_ROOT_PASSWORD=rootpassword
JWT_SECRET=your-jwt-secret
SMTP_HOST=your-smtp-host
SMTP_PORT=587
SMTP_USER=your-smtp-user
SMTP_PASS=your-smtp-password
```

### 3. Обновить сервер (3 минуты)

```bash
# На сервере создать директорию для бэкапов
ssh root@your-server "mkdir -p /root/coffe/backups"

# Скопировать новые скрипты
scp scripts/fallback-manager.sh root@your-server:/root/coffe/
scp scripts/system-monitor.sh root@your-server:/root/coffe/
scp deploy-with-fallback.sh root@your-server:/root/coffe/

# Сделать скрипты исполняемыми
ssh root@your-server "chmod +x /root/coffe/*.sh"
```

### 4. Настроить мониторинг (2 минуты)

```bash
# Добавить в crontab для автоматического мониторинга
ssh root@your-server "crontab -e"
# Добавить строку:
# */5 * * * * /root/coffe/scripts/system-monitor.sh check
```

## 🎯 Что изменилось

### До:
- ❌ Сервер падал при неудачной сборке
- ❌ Нет механизма отката
- ❌ Нет health checks

### После:
- ✅ **Автоматический fallback** на последнюю рабочую версию
- ✅ **Health checks** для всех сервисов
- ✅ **Автоматические бэкапы** успешных сборок
- ✅ **Мониторинг** и алерты
- ✅ **Graceful degradation**

## 🔍 Проверка работы

### Health Check URLs:
- Backend: `http://your-server:3001/api/health`
- Frontend: `http://your-server:4000`

### Команды для проверки:
```bash
# Проверить статус системы
ssh root@your-server "/root/coffe/scripts/system-monitor.sh status"

# Проверить здоровье
ssh root@your-server "/root/coffe/scripts/system-monitor.sh check"

# Список бэкапов
ssh root@your-server "/root/coffe/scripts/fallback-manager.sh list backend"
```

## 🚨 Аварийные процедуры

### Если система не работает:

1. **Проверить статус:**
```bash
ssh root@your-server "/root/coffe/scripts/system-monitor.sh status"
```

2. **Попытаться восстановление:**
```bash
ssh root@your-server "/root/coffe/scripts/system-monitor.sh recover"
```

3. **Ручной откат:**
```bash
# Найти последний бэкап
ssh root@your-server "ls -la /root/coffe/backups/"

# Восстановить
ssh root@your-server "cd /root/coffe && tar -xzf backups/backup-YYYYMMDD_HHMMSS.tar.gz --overwrite"
ssh root@your-server "cd /root/coffe && docker-compose -f docker-compose.fallback.yml up -d"
```

## ✅ Готово!

**Fallback система внедрена и готова к работе!**

Теперь при неудачной сборке приложения система автоматически подставит последнюю успешную сборку, обеспечивая непрерывную работу сервиса.

**Система защищена от падений!** 🛡️
