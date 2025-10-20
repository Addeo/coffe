# ⚡ Быстрый старт миграции на Production

## 🎯 Что это делает

Добавляет таблицу `work_sessions` для учёта множественных выездов по заказам в разные месяцы.

---

## 🚀 Запуск миграции (3 шага)

### 1️⃣ Подключитесь к VPS

```bash
ssh user@your-vps-ip
cd /path/to/coffee-admin/backend
```

### 2️⃣ Загрузите переменные окружения

```bash
source .env
```

### 3️⃣ Запустите миграцию

```bash
cd migrations
./run-migration.sh
```

Скрипт:
- ✅ Создаст backup автоматически
- ✅ Покажет текущее состояние БД
- ✅ Попросит подтверждение
- ✅ Выполнит миграцию
- ✅ Проверит результат

---

## ⏱️ Время: ~1-2 минуты

---

## ✅ После миграции

Перезапустите backend:

```bash
pm2 restart coffee-backend
# или
npm run start:prod
```

Проверьте в браузере:
- Откройте заказ
- Должна появиться вкладка "Рабочие сессии"

---

## 🆘 Если что-то пошло не так

Восстановите из backup:

```bash
cd backend

# Найдите последний backup
ls -lht backups/backup-*.sql | head -1

# Восстановите
mysql -h $DB_HOST -u $DB_USERNAME -p$DB_PASSWORD $DB_DATABASE \
  < backups/backup-YYYY-MM-DD-HH-MM-SS.sql

# Перезапустите backend
pm2 restart coffee-backend
```

---

## 📚 Полная документация

См. **`docs/PRODUCTION_MIGRATION_GUIDE.md`** для детальных инструкций.

---

**Готовы? Запускайте миграцию!** 🚀

