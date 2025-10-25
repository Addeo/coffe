# 🗄️ Сохранение данных при деплое

## ✅ Что было исправлено

### ❌ Проблема (ДО)

При каждом деплое через GitHub Actions база данных **полностью очищалась**:

```yaml
# СТАРЫЙ КОД - НЕ ИСПОЛЬЗУЙТЕ!
docker-compose down -v  # ⚠️ Флаг -v удаляет volumes!
docker volume rm coffe_mysql_data  # ⚠️ Удаление данных MySQL!
docker system prune -af --volumes  # ⚠️ Удаление всех volumes!
```

**Результат:**

- ❌ Все пользователи удалялись
- ❌ Все заказы удалялись
- ❌ Все организации удалялись
- ❌ Все загруженные файлы удалялись

---

### ✅ Решение (ПОСЛЕ)

Теперь деплой **сохраняет** все данные:

```yaml
# НОВЫЙ КОД - БЕЗОПАСНЫЙ!
docker-compose down --remove-orphans  # ✅ БЕЗ флага -v!
docker image prune -af                # ✅ Только старые образы
# НЕТ удаления volumes                # ✅ Данные сохраняются!
```

**Результат:**

- ✅ База данных сохраняется
- ✅ Пользователи остаются
- ✅ Заказы остаются
- ✅ Загруженные файлы остаются

---

## 📦 Как работают Docker Volumes

### Структура хранения данных:

```
docker-compose.prod.yml
├── volumes:
│   ├── mysql_data:         # ← База данных MySQL
│   │   └── /var/lib/mysql
│   └── uploads_data:       # ← Загруженные файлы
│       └── /app/uploads
```

### Где физически хранятся данные:

На сервере:

```bash
/var/lib/docker/volumes/
├── coffe_mysql_data/    # MySQL база данных
└── coffe_uploads_data/  # Загруженные файлы
```

---

## 🔄 Что происходит при деплое

### 1. **Обычный деплой (данные сохраняются)**

```bash
cd ~/coffe
docker-compose -f docker-compose.prod.yml down --remove-orphans
# Контейнеры останавливаются, volumes остаются

docker-compose -f docker-compose.prod.yml build --no-cache
# Пересобираются образы приложения

docker-compose -f docker-compose.prod.yml up -d
# Запускаются новые контейнеры с СУЩЕСТВУЮЩИМИ данными
```

**Результат:**

- ✅ Новая версия кода
- ✅ Старые данные сохранены
- ✅ База данных на месте

---

### 2. **Полная очистка (только вручную!)**

Если нужно начать с чистого листа:

```bash
# Используйте специальный скрипт
./clean-deploy.sh

# ИЛИ вручную:
docker-compose -f docker-compose.prod.yml down -v
docker volume rm coffe_mysql_data coffe_uploads_data
docker-compose -f docker-compose.prod.yml up -d --build
```

⚠️ **ВНИМАНИЕ:** Это удалит ВСЕ данные! Используйте только для тестирования.

---

## 💾 Резервное копирование

### Создать бэкап базы данных:

```bash
# На сервере
docker exec coffee_mysql_prod mysqldump \
  -u coffee_user \
  -pcoffee_password \
  coffee_admin > backup_$(date +%Y%m%d_%H%M%S).sql
```

### Восстановить из бэкапа:

```bash
# На сервере
docker exec -i coffee_mysql_prod mysql \
  -u coffee_user \
  -pcoffee_password \
  coffee_admin < backup_20231215_120000.sql
```

### Автоматический бэкап (cron):

```bash
# Добавить в crontab на сервере
crontab -e

# Ежедневный бэкап в 3:00
0 3 * * * docker exec coffee_mysql_prod mysqldump -u coffee_user -pcoffee_password coffee_admin > ~/backups/db_$(date +\%Y\%m\%d).sql
```

---

## 🔍 Проверка volumes

### Посмотреть список volumes:

```bash
docker volume ls | grep coffe
```

Должно быть:

```
local     coffe_mysql_data
local     coffe_uploads_data
```

### Посмотреть размер данных:

```bash
docker system df -v | grep coffe
```

### Инспектировать volume:

```bash
docker volume inspect coffe_mysql_data
```

---

## 🚨 Миграции базы данных

При обновлении структуры БД:

1. **TypeORM автоматически применяет миграции** при старте backend
2. **Данные сохраняются** (только структура меняется)
3. **Откат возможен** через SQL скрипты в `backend/migrations/`

### Ручная миграция (если нужно):

```bash
# На сервере
docker exec -it coffee_backend_prod npm run migration:run
```

---

## ✅ Checklist безопасного деплоя

- [x] ✅ Данные MySQL сохраняются
- [x] ✅ Загруженные файлы сохраняются
- [x] ✅ Автоматические бэкапы настроены (если нужно)
- [x] ✅ GitHub Actions не удаляет volumes
- [x] ✅ Есть скрипт для полной очистки (`clean-deploy.sh`)

---

## 📝 Рекомендации

1. **Перед важным обновлением:**

   ```bash
   # Создайте бэкап!
   ./backup-database.sh
   ```

2. **После деплоя:**

   ```bash
   # Проверьте, что данные на месте
   docker exec -it coffee_mysql_prod mysql -u coffee_user -pcoffee_password -e "SELECT COUNT(*) FROM coffee_admin.users;"
   ```

3. **Регулярные бэкапы:**
   - Настройте автоматические бэкапы через cron
   - Храните бэкапы на другом сервере/облаке
   - Проверяйте восстановление из бэкапов

---

## 🎯 Итог

✅ **Теперь деплой безопасен!**

- Данные сохраняются между деплоями
- Только код обновляется
- База данных остается нетронутой

❌ **Полная очистка возможна только вручную**

- Используйте `./clean-deploy.sh`
- Требует двойного подтверждения
- Не происходит автоматически
