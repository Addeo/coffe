# 🗄️ Руководство по пересозданию базы данных

## Проблема

При добавлении новой таблицы `work_sessions` может возникнуть ошибка миграции:

```
QueryFailedError: SQLITE_CONSTRAINT: NOT NULL constraint failed: 
temporary_user_activity_logs.activity_type
```

## Причина

TypeORM пытается обновить структуру существующей БД, но в старых записях могут быть несовместимости.

---

## ✅ Решение для DEV среды

### Вариант 1: Пересоздать БД (рекомендуется)

```bash
cd backend

# Удалить старую БД
rm -f database.sqlite

# Запустить backend - БД создастся автоматически
npm run start:dev
```

При запуске TypeORM создаст новую БД с правильной структурой, включая таблицу `work_sessions`.

### Вариант 2: Создать резервную копию перед удалением

```bash
cd backend

# Создать резервную копию
cp database.sqlite database.sqlite.backup

# Удалить рабочую БД
rm -f database.sqlite

# Запустить backend
npm run start:dev
```

---

## 🔄 Что произойдёт при первом запуске

TypeORM автоматически создаст все таблицы:

1. ✅ `users`
2. ✅ `engineers`
3. ✅ `organizations`
4. ✅ `orders`
5. ✅ `work_sessions` ⭐ **НОВАЯ**
6. ✅ `salary_calculations`
7. ✅ `engineer_organization_rates`
8. ✅ `files`
9. ✅ `notifications`
10. ✅ `user_activity_logs`
11. ✅ `settings`
12. ✅ И другие...

---

## 📝 Наполнение тестовыми данными

После создания БД можно запустить seed:

```bash
cd backend
npm run seed
```

Это создаст:
- Тестовых пользователей
- Организации
- Инженеров
- Образцы заказов

---

## ⚠️ Важно для PRODUCTION

**НЕ УДАЛЯЙТЕ БД в продакшене!**

Для production нужно:

1. Создать SQL миграцию вручную
2. Проверить её на копии БД
3. Применить через миграционный скрипт

### Пример SQL миграции для production:

```sql
-- Создание таблицы work_sessions
CREATE TABLE IF NOT EXISTS work_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL,
  engineer_id INTEGER NOT NULL,
  work_date DATE NOT NULL,
  regular_hours DECIMAL(5,2) DEFAULT 0,
  overtime_hours DECIMAL(5,2) DEFAULT 0,
  calculated_amount DECIMAL(10,2) DEFAULT 0,
  car_usage_amount DECIMAL(10,2) DEFAULT 0,
  engineer_base_rate DECIMAL(10,2) NOT NULL,
  engineer_overtime_rate DECIMAL(10,2),
  organization_payment DECIMAL(10,2) DEFAULT 0,
  organization_base_rate DECIMAL(10,2) NOT NULL,
  organization_overtime_multiplier DECIMAL(5,2),
  regular_payment DECIMAL(10,2) DEFAULT 0,
  overtime_payment DECIMAL(10,2) DEFAULT 0,
  organization_regular_payment DECIMAL(10,2) DEFAULT 0,
  organization_overtime_payment DECIMAL(10,2) DEFAULT 0,
  profit DECIMAL(10,2) DEFAULT 0,
  distance_km DECIMAL(8,2),
  territory_type VARCHAR(20),
  notes TEXT,
  photo_url VARCHAR(255),
  status VARCHAR(20) DEFAULT 'completed',
  can_be_invoiced BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (engineer_id) REFERENCES engineers(id) ON DELETE CASCADE
);

-- Создание индексов
CREATE INDEX idx_work_sessions_work_date ON work_sessions(work_date);
CREATE INDEX idx_work_sessions_engineer_work_date ON work_sessions(engineer_id, work_date);
CREATE INDEX idx_work_sessions_order_id ON work_sessions(order_id);
```

---

## 🐛 Troubleshooting

### Ошибка: "database is locked"

```bash
# Остановить все процессы backend
pkill -f "nest start"

# Подождать 2 секунды
sleep 2

# Удалить БД
rm -f database.sqlite

# Запустить снова
npm run start:dev
```

### Ошибка: "SQLITE_ERROR: table already exists"

Это означает, что БД частично создана. Решение:

```bash
# Полностью удалить БД и журналы
rm -f database.sqlite*

# Запустить backend
npm run start:dev
```

---

## 📊 Проверка структуры БД

После создания можно проверить структуру:

```bash
# Открыть SQLite консоль
sqlite3 database.sqlite

# Показать все таблицы
.tables

# Показать структуру work_sessions
.schema work_sessions

# Выход
.quit
```

---

## ✅ Checklist после пересоздания БД

- [ ] БД удалена
- [ ] Backend запущен успешно
- [ ] Все таблицы созданы (проверить в логах)
- [ ] Таблица `work_sessions` существует
- [ ] Индексы созданы
- [ ] Seed данные загружены (опционально)
- [ ] Frontend подключается к backend
- [ ] Можно создать заказ
- [ ] Можно добавить рабочую сессию

---

**Готово! БД обновлена и готова к работе!** 🚀

