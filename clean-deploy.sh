#!/bin/bash

# ⚠️ ВНИМАНИЕ: Этот скрипт ПОЛНОСТЬЮ ОЧИЩАЕТ базу данных!
# Используйте только для тестирования или свежей установки!

set -e

echo "⚠️  ВНИМАНИЕ! ⚠️"
echo "Этот скрипт полностью удалит все данные базы данных!"
echo "Вы уверены? (yes/no)"
read -r CONFIRM

if [ "$CONFIRM" != "yes" ]; then
  echo "Отменено."
  exit 0
fi

echo "🔴 Последний шанс! Введите 'DELETE ALL DATA' для подтверждения:"
read -r FINAL_CONFIRM

if [ "$FINAL_CONFIRM" != "DELETE ALL DATA" ]; then
  echo "Отменено."
  exit 0
fi

echo "🗑️  Удаление всех контейнеров и данных..."

# Останавливаем контейнеры с удалением volumes
docker-compose -f docker-compose.prod.yml down -v --remove-orphans

# Удаляем все контейнеры coffee
docker rm -f $(docker ps -aq --filter 'name=coffee_') 2>/dev/null || true

# Удаляем volumes
docker volume rm coffe_mysql_data coffe_uploads_data 2>/dev/null || true

# Удаляем сеть
docker network rm coffe_coffee_prod_network 2>/dev/null || true

# Очищаем систему
docker system prune -af --volumes

echo "✅ Полная очистка завершена!"
echo ""
echo "Для запуска с чистой базой данных выполните:"
echo "docker-compose -f docker-compose.prod.yml up -d --build"









