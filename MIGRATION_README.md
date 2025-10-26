# 🚀 Миграция базы данных из локальной SQLite в Production MySQL

## 📋 Предварительные требования

### 1. Установленные инструменты

- **sqlite3** - для работы с локальной БД
- **mysql client** - для подключения к production БД

```bash
# macOS
brew install sqlite3
brew install mysql

# Linux (Ubuntu/Debian)
sudo apt-get install sqlite3
sudo apt-get install mysql-client
```

### 2. Переменные окружения

Скрипт использует переменные окружения для подключения к production базе данных.

Вы можете установить их одним из способов:

#### Способ 1: Экспорт переменных перед запуском

```bash
export DB_HOST="192.144.12.102"
export DB_PORT="3306"
export DB_USERNAME="coffee_user"
export DB_PASSWORD="your_password_here"
export DB_DATABASE="coffee_admin"
```

#### Способ 2: Редактирование скрипта

Отредактируйте строки в начале скрипта `migrate-to-production.sh`:

```bash
PRODUCTION_HOST="${DB_HOST:-192.144.12.102}"
PRODUCTION_PORT="${DB_PORT:-3306}"
PRODUCTION_USER="${DB_USERNAME:-coffee_user}"
PRODUCTION_PASSWORD="${DB_PASSWORD}"
PRODUCTION_DB="${DB_DATABASE:-coffee_admin}"
```

#### Способ 3: Создание .env файла

Если у вас уже есть `.env` файл в корне проекта, скрипт автоматически использует его.

---

## 🎯 Выполнение миграции

### Простой запуск:

```bash
cd /path/to/coffe  # Перейдите в корневую директорию проекта
./migrate-to-production.sh
```

### Что делает скрипт:

1. **✅ Проверяет инструменты** - убеждается, что установлены sqlite3 и mysql
2. **✅ Проверяет подключение** - тестирует соединение с production БД
3. **✅ Показывает текущее состояние** - отображает информацию о локальной и production БД
4. **✅ Запрашивает подтверждение** - требует ввести 'yes' для продолжения
5. **✅ Создает резервную копию** - сохраняет текущее состояние production БД
6. **✅ Экспортирует SQLite** - создает SQL dump локальной БД
7. **✅ Конвертирует формат** - преобразует SQLite синтаксис в MySQL синтаксис
8. **✅ Импортирует данные** - загружает данные в production БД
9. **✅ Проверяет результат** - показывает список таблиц и количество записей

---

## ⚠️ Важные замечания

### 1. Это ОПАСНАЯ операция!

Скрипт **ПЕРЕЗАПИСЫВАЕТ** данные в production базе данных.

- ❌ **Все существующие данные будут удалены**
- ✅ **Автоматически создается backup** перед импортом
- ✅ **Backup сохраняется** в директории `migration-backup-TIMESTAMP/`

### 2. Backup сохраняется в:

```
migration-backup-TIMESTAMP/
├── migration-dump-TIMESTAMP.sql          # SQLite dump
├── mysql-migration-dump-TIMESTAMP.sql   # MySQL формат
└── production-backup-TIMESTAMP.sql      # Резервная копия production
```

### 3. Восстановление из backup

Если что-то пошло не так, восстановите production из backup:

```bash
mysql -h 192.144.12.102 -P 3306 -u coffee_user -p coffee_admin < migration-backup-TIMESTAMP/production-backup-TIMESTAMP.sql
```

---

## 🔍 Проверка локальной базы данных

Перед миграцией проверьте, что в локальной БД есть данные:

```bash
# Подсчет записей в таблицах
sqlite3 backend/database.sqlite "SELECT name FROM sqlite_master WHERE type='table';" | while read table; do
    echo -n "$table: "
    sqlite3 backend/database.sqlite "SELECT COUNT(*) FROM $table;"
done
```

Примерный вывод:

```
users: 3
organizations: 8
orders: 54
engineers: 2
...
```

---

## 🚨 Решение проблем

### Ошибка: "sqlite3 not found"

```bash
# macOS
brew install sqlite3

# Linux
sudo apt-get install sqlite3
```

### Ошибка: "mysql client not found"

```bash
# macOS
brew install mysql

# Linux
sudo apt-get install mysql-client
```

### Ошибка: "Failed to connect to production database"

Проверьте:

1. Правильность credentials (DB_HOST, DB_PASSWORD и т.д.)
2. Доступность сервера (ping 192.144.12.102)
3. Открыт ли порт 3306 на firewall
4. Правильные ли права у пользователя MySQL

### Ошибка: "Access denied for user"

Пользователь не имеет права доступа к базе. Проверьте права:

```sql
GRANT ALL PRIVILEGES ON coffee_admin.* TO 'coffee_user'@'%';
FLUSH PRIVILEGES;
```

### Ошибка при импорте: "Table already exists"

База данных не пустая. Варианты:

1. Удалить существующие таблицы (ОПАСНО!)
2. Использовать другой подход (см. "Альтернативные методы")

---

## 📊 После миграции

Проверьте, что данные успешно импортированы:

```bash
# Подключитесь к production БД
mysql -h 192.144.12.102 -u coffee_user -p coffee_admin

# Проверьте количество записей
SELECT 'users' as table_name, COUNT(*) as count FROM users
UNION ALL
SELECT 'orders', COUNT(*) FROM orders
UNION ALL
SELECT 'organizations', COUNT(*) FROM organizations;
```

---

## 🆘 Альтернативные методы миграции

### Метод 1: Ручной SQL dump

```bash
# 1. Экспорт SQLite
sqlite3 backend/database.sqlite .dump > local_dump.sql

# 2. Конвертация (вручную или через sed)
# См. раздел "Конвертация формата" в скрипте

# 3. Импорт в MySQL
mysql -h 192.144.12.102 -u coffee_user -p coffee_admin < local_dump.sql
```

### Метод 2: Через промежуточный MySQL dump

```bash
# 1. Создать дамп из SQLite
sqlite3 backend/database.sqlite .dump > dump.sql

# 2. Конвертировать в MySQL формат
python3 convert_sqlite_to_mysql.py dump.sql mysql_dump.sql

# 3. Импортировать в production
mysql -h 192.144.12.102 -u coffee_user -p coffee_admin < mysql_dump.sql
```

### Метод 3: Через TypeORM CLI (если настроен)

```bash
cd backend
npm run migration:run
```

---

## ✅ Checklist перед миграцией

- [ ] SQLite3 установлен
- [ ] MySQL client установлен
- [ ] Переменные окружения установлены
- [ ] Локальная БД содержит данные
- [ ] Production БД доступна
- [ ] Создана резервная копия production (автоматически)
- [ ] Понимаете, что все данные в production будут удалены
- [ ] Знаете, как восстановиться из backup

---

## 📞 Поддержка

При возникновении проблем:

1. Проверьте логи - скрипт выводит подробную информацию
2. Проверьте backup - файлы сохранены в `migration-backup-*/`
3. Проверьте подключение к БД
4. Обратитесь к документации MySQL

---

**Удачной миграции!** 🚀
