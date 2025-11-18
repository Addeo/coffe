# 🔐 Backup Quick Start Guide

Быстрая инструкция по работе с резервными копиями базы данных.

## 🚀 Быстрый старт

### Создание бэкапа

```bash
curl -X POST http://localhost:3001/api/backup/create \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Список бэкапов

```bash
curl -X GET http://localhost:3001/api/backup/list \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Загрузка бэкапа

```bash
curl -X POST http://localhost:3001/api/backup/upload \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "file=@/path/to/backup.sql"
```

### Восстановление

```bash
curl -X POST http://localhost:3001/api/backup/restore/backup-file-name.sql \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Скачивание

```bash
curl -X GET http://localhost:3001/api/backup/download/backup-file-name.sql \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -o backup.sql
```

---

## 📋 Все доступные команды

| Действие            | Метод  | Endpoint                          |
| ------------------- | ------ | --------------------------------- |
| Создать бэкап       | POST   | `/api/backup/create`              |
| Список бэкапов      | GET    | `/api/backup/list`                |
| **Загрузить бэкап** | POST   | `/api/backup/upload`              |
| Восстановить        | POST   | `/api/backup/restore/:fileName`   |
| Скачать             | GET    | `/api/backup/download/:fileName`  |
| **Удалить**         | DELETE | `/api/backup/:fileName`           |
| Очистить старые     | DELETE | `/api/backup/cleanup?keepDays=30` |

---

## 🔐 Требования

- ✅ JWT аутентификация
- ✅ Роль: **ADMIN**
- ✅ Для загрузки: файлы `.sql` или `.sqlite`, макс 100MB

---

## ⚙️ Автоматизация

**Автоматический бэкап:**

- Запускается: 1-го числа каждого месяца в 2:00
- Очистка: автоматическое удаление бэкапов старше 180 дней

**VM скрипты:**

```bash
# Настройка автоматических бэкапов на VM
./vm-backup-setup.sh <vm_ip> <ssh_key>

# Скачивание бэкапов с VM
./download-backups.sh <vm_ip> <ssh_key> <local_dir>

# Управление VM
./vm-manage.sh status
./vm-manage.sh logs backend
```

---

## 🆕 Что нового?

### Добавлено в этом обновлении:

1. **POST /api/backup/upload** - Загрузка бэкапа через API
   - Поддержка .sql и .sqlite файлов
   - Валидация размера (макс 100MB)
   - Санитизация имен файлов

2. **DELETE /api/backup/:fileName** - Удаление бэкапов

3. **Улучшенная поддержка SQLite** - автоматическое определение окружения

4. **Метаданные бэкапов** - размер, дата, тип базы данных

5. **Безопасное восстановление SQLite** - автоматический rollback при ошибках

---

## 📚 Полная документация

Подробное руководство с лучшими практиками: [BACKUP_BEST_PRACTICES.md](./docs/BACKUP_BEST_PRACTICES.md)

---

## ⚠️ Важные замечания

1. **Перед восстановлением** всегда создавайте текущий бэкап
2. **Production**: используйте только MySQL бэкапы (.sql)
3. **Development**: используйте только SQLite бэкапы (.sqlite)
4. **Автоматически сохраняется** бэкап перед восстановлением SQLite

---

## 🎯 Типичные сценарии

### Перенос с Production на Staging

```bash
# 1. Создать бэкап на Production
curl -X POST https://prod.example.com/api/backup/create \
  -H "Authorization: Bearer $PROD_TOKEN"

# 2. Скачать бэкап
curl -X GET https://prod.example.com/api/backup/download/backup.sql \
  -H "Authorization: Bearer $PROD_TOKEN" \
  -o backup.sql

# 3. Загрузить на Staging
curl -X POST https://staging.example.com/api/backup/upload \
  -H "Authorization: Bearer $STAGING_TOKEN" \
  -F "file=@backup.sql"

# 4. Восстановить на Staging
curl -X POST https://staging.example.com/api/backup/restore/uploaded-backup.sql \
  -H "Authorization: Bearer $STAGING_TOKEN"
```

### Регулярное резервное копирование на локальную машину

```bash
#!/bin/bash
# Скрипт для ежедневного скачивания бэкапов

TOKEN="your_admin_token"
API_URL="http://your-server.com:3001/api/backup"
BACKUP_DIR="./local-backups"

# Создать бэкап на сервере
echo "Creating backup..."
curl -X POST "$API_URL/create" -H "Authorization: Bearer $TOKEN"

# Получить список бэкапов
LATEST=$(curl -s "$API_URL/list" -H "Authorization: Bearer $TOKEN" | \
  jq -r '.backups[0].name')

# Скачать последний бэкап
echo "Downloading $LATEST..."
curl "$API_URL/download/$LATEST" \
  -H "Authorization: Bearer $TOKEN" \
  -o "$BACKUP_DIR/$LATEST"

echo "✅ Backup saved to $BACKUP_DIR/$LATEST"
```

---

**✅ Готово! Ваша система бэкапов настроена и готова к использованию.**
