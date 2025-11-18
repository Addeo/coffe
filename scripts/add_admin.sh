#!/bin/bash

echo "Добавление админ пользователя в базу данных..."

# Параметры подключения
MYSQL_HOST="localhost"
MYSQL_PORT="3307"
MYSQL_USER="coffee_user"
MYSQL_PASSWORD="coffee_password"
MYSQL_DATABASE="coffee_admin"

# SQL запросы
SQL_CHECK="SELECT COUNT(*) as user_count FROM users WHERE email = 'admin@coffee.com';"
SQL_INSERT="INSERT INTO users (email, password, first_name, last_name, role, is_active) VALUES ('admin@coffee.com', '\$2b\$10\$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Admin', 'User', 'admin', true) ON DUPLICATE KEY UPDATE first_name = VALUES(first_name), last_name = VALUES(last_name), role = VALUES(role), is_active = VALUES(is_active);"

echo "Проверка существующего админа..."
mysql -h $MYSQL_HOST -P $MYSQL_PORT -u $MYSQL_USER -p$MYSQL_PASSWORD $MYSQL_DATABASE -e "$SQL_CHECK"

echo ""
echo "Добавление/обновление админа..."
mysql -h $MYSQL_HOST -P $MYSQL_PORT -u $MYSQL_USER -p$MYSQL_PASSWORD $MYSQL_DATABASE -e "$SQL_INSERT"

echo ""
echo "Проверка результата..."
mysql -h $MYSQL_HOST -P $MYSQL_PORT -u $MYSQL_USER -p$MYSQL_PASSWORD $MYSQL_DATABASE -e "SELECT id, email, first_name, last_name, role, is_active, created_at FROM users WHERE email = 'admin@coffee.com';"

echo ""
echo "Готово!"

