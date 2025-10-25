# 🚀 Руководство по миграции Production базы данных

## ⚠️ ВАЖНО: Прочитайте ПОЛНОСТЬЮ перед выполнением!

Эта миграция добавляет таблицу `work_sessions` для учёта множественных рабочих сессий по заказам.

---

## 📋 Предварительные требования

- [ ] Доступ к production серверу (VPS)
- [ ] Доступ к MySQL базе данных
- [ ] Права на создание таблиц и индексов
- [ ] Минимум 100MB свободного места для backup
- [ ] Доступ к `.env` файлу с credentials

---

## 🔐 Проверка доступа к БД

### 1. SSH подключение к VPS:

```bash
ssh user@your-vps-ip
```

### 2. Переход в директорию проекта:

```bash
cd /path/to/coffee-admin/backend
```

### 3. Проверка доступа к MySQL:

```bash
mysql -h $DB_HOST -P $DB_PORT -u $DB_USERNAME -p$DB_PASSWORD $DB_DATABASE -e "SELECT VERSION();"
```

Если команда выполнена успешно - доступ есть.

---

## 📦 Подготовка

### 1. Загрузить файлы миграции на сервер:

```bash
# С локального компьютера
scp backend/migrations/*.sql user@vps-ip:/path/to/backend/migrations/
scp backend/migrations/run-migration.sh user@vps-ip:/path/to/backend/migrations/
```

### 2. Проверить файлы на сервере:

```bash
# На VPS
cd /path/to/backend/migrations
ls -lh
```

Должны быть файлы:

- `001_add_work_sessions_table.sql`
- `002_migrate_existing_order_data_to_sessions.sql`
- `rollback.sql`
- `run-migration.sh`

---

## 🔄 Процесс миграции

### Автоматический способ (рекомендуется):

```bash
cd backend/migrations

# Загрузить environment переменные
source ../.env

# Запустить скрипт миграции
./run-migration.sh
```

Скрипт автоматически:

1. ✅ Создаст backup БД
2. ✅ Покажет текущее состояние
3. ✅ Попросит подтверждение
4. ✅ Выполнит миграцию
5. ✅ Проверит результат

### Ручной способ (если нужен полный контроль):

#### Шаг 1: Создать backup вручную

```bash
cd backend

# Создать директорию для backups (если нет)
mkdir -p backups

# Создать backup
mysqldump -h $DB_HOST -P $DB_PORT -u $DB_USERNAME -p$DB_PASSWORD \
  $DB_DATABASE > backups/backup-$(date +%Y-%m-%d-%H-%M-%S).sql

# Проверить размер backup
ls -lh backups/backup-*.sql | tail -1
```

#### Шаг 2: Проверить текущее состояние БД

```bash
mysql -h $DB_HOST -P $DB_PORT -u $DB_USERNAME -p$DB_PASSWORD $DB_DATABASE <<EOF
SELECT
  COUNT(*) AS total_orders,
  SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed_orders
FROM orders;

-- Проверить, что work_sessions ещё не существует
SHOW TABLES LIKE 'work_sessions';
EOF
```

#### Шаг 3: Выполнить миграцию 001 (создание таблицы)

```bash
mysql -h $DB_HOST -P $DB_PORT -u $DB_USERNAME -p$DB_PASSWORD $DB_DATABASE \
  < migrations/001_add_work_sessions_table.sql
```

Ожидаемый вывод:

```
+----------------+------------+---------------------+
| TABLE_NAME     | TABLE_ROWS | CREATE_TIME         |
+----------------+------------+---------------------+
| work_sessions  |          0 | 2025-10-13 19:00:00 |
+----------------+------------+---------------------+
```

#### Шаг 4: Выполнить миграцию 002 (перенос данных)

```bash
mysql -h $DB_HOST -P $DB_PORT -u $DB_USERNAME -p$DB_PASSWORD $DB_DATABASE \
  < migrations/002_migrate_existing_order_data_to_sessions.sql
```

Ожидаемый вывод - количество мигрированных сессий по месяцам.

#### Шаг 5: Проверка результата

```bash
mysql -h $DB_HOST -P $DB_PORT -u $DB_USERNAME -p$DB_PASSWORD $DB_DATABASE <<EOF
-- Общая информация
SELECT
  COUNT(*) AS total_sessions,
  COUNT(DISTINCT order_id) AS unique_orders,
  ROUND(SUM(regular_hours + overtime_hours), 2) AS total_hours,
  ROUND(SUM(calculated_amount + car_usage_amount), 2) AS total_amount
FROM work_sessions;

-- По месяцам
SELECT
  YEAR(work_date) AS year,
  MONTH(work_date) AS month,
  COUNT(*) AS sessions,
  ROUND(SUM(regular_hours + overtime_hours), 2) AS hours
FROM work_sessions
GROUP BY YEAR(work_date), MONTH(work_date)
ORDER BY year DESC, month DESC
LIMIT 6;
EOF
```

---

## ✅ Проверка успешности миграции

### Checklist:

- [ ] Backup создан в `backups/`
- [ ] Таблица `work_sessions` существует
- [ ] Количество сессий = количество завершённых заказов
- [ ] Общие часы совпадают с суммой из orders
- [ ] Индексы созданы (4 индекса)
- [ ] Backend запускается без ошибок
- [ ] Frontend может получить список сессий

### Команды проверки:

```bash
# Проверить структуру таблицы
mysql ... -e "DESCRIBE work_sessions;"

# Проверить индексы
mysql ... -e "SHOW INDEXES FROM work_sessions;"

# Проверить данные
mysql ... -e "SELECT * FROM work_sessions LIMIT 5;"
```

---

## 🔙 Откат (Rollback)

Если что-то пошло не так:

### Вариант 1: Восстановить из backup

```bash
cd backend

# Остановить backend
pm2 stop coffee-backend  # или ваш метод остановки

# Восстановить БД из backup
mysql -h $DB_HOST -P $DB_PORT -u $DB_USERNAME -p$DB_PASSWORD $DB_DATABASE \
  < backups/backup-2025-10-13-*.sql

# Запустить backend
pm2 start coffee-backend
```

### Вариант 2: Удалить только work_sessions

```bash
cd backend/migrations

# Отредактировать rollback.sql - раскомментировать DROP TABLE
# Затем выполнить:
mysql -h $DB_HOST -P $DB_PORT -u $DB_USERNAME -p$DB_PASSWORD $DB_DATABASE \
  < rollback.sql
```

---

## 🔒 Безопасность

### ⚠️ НЕ ВЫПОЛНЯЙТЕ миграцию если:

- ❌ Нет backup текущей БД
- ❌ Не протестировано на копии БД
- ❌ Система активно используется пользователями
- ❌ Нет доступа к серверу для отката

### ✅ РЕКОМЕНДУЕТСЯ:

- ✅ Выполнять в maintenance window (ночью/выходные)
- ✅ Сначала протестировать на staging/dev
- ✅ Уведомить пользователей о возможном downtime
- ✅ Иметь готовый план отката
- ✅ Проверить backup перед началом

---

## 🕐 Время выполнения

- **Backup:** ~30 секунд (зависит от размера БД)
- **Создание таблицы:** ~1 секунда
- **Миграция данных:** ~5-30 секунд (зависит от количества заказов)
- **Верификация:** ~5 секунд

**Общее время:** ~1-2 минуты

---

## 📞 Поддержка

Если возникли проблемы:

1. **НЕ ПАНИКУЙТЕ** - у вас есть backup
2. Остановите backend
3. Сохраните логи ошибок
4. Восстановите из backup
5. Свяжитесь со мной для помощи

---

## 🎯 После успешной миграции

1. Перезапустить backend:

```bash
pm2 restart coffee-backend
# или
npm run start:prod
```

2. Проверить логи:

```bash
pm2 logs coffee-backend
# или
tail -f server.log
```

3. Проверить в браузере:

- Открыть заказ
- Перейти на вкладку "Рабочие сессии"
- Должна быть видна история (если были завершённые заказы)

4. Создать тестовую сессию:

- Создать новый заказ
- Назначить инженера
- Добавить рабочую сессию
- Проверить, что всё сохраняется

---

## 🎊 Готово!

После успешной миграции система будет:

- ✅ Поддерживать множественные выезды на один заказ
- ✅ Корректно учитывать работы в разных месяцах
- ✅ Сохранять детализацию каждой сессии
- ✅ Правильно рассчитывать зарплату по месяцам

**Удачной миграции!** 🚀
