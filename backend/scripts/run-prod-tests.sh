#!/bin/bash

# Скрипт для запуска расширенных тестов на продакшене
# Использование: ./run-prod-tests.sh <PROD_API_URL>

if [ -z "$1" ]; then
  echo "❌ Ошибка: Не указан URL продакшена"
  echo ""
  echo "Использование:"
  echo "  ./run-prod-tests.sh https://your-production-api.com/api"
  echo ""
  echo "Или:"
  echo "  PROD_API_URL=https://your-production-api.com/api npm run test:orders"
  echo "  PROD_API_URL=https://your-production-api.com/api npm run test:statistics"
  exit 1
fi

PROD_API_URL="$1"
export PROD_API_URL

echo "🚀 Запуск расширенных тестов на продакшене"
echo "📍 URL: $PROD_API_URL"
echo ""

# Проверка доступности API
echo "🔍 Проверка доступности API..."
HEALTH_CHECK=$(curl -s -o /dev/null -w "%{http_code}" "$PROD_API_URL/test/health" 2>/dev/null)

if [ "$HEALTH_CHECK" != "200" ]; then
  echo "⚠️  Предупреждение: API может быть недоступен (HTTP $HEALTH_CHECK)"
  echo "   Продолжаю выполнение..."
  echo ""
fi

# Запуск тестов заявок
echo "═══════════════════════════════════════════════════════════════"
echo "  ТЕСТЫ ЗАЯВОК"
echo "═══════════════════════════════════════════════════════════════"
echo ""
npm run test:orders

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "  АНАЛИЗ СТАТИСТИКИ"
echo "═══════════════════════════════════════════════════════════════"
echo ""
npm run test:statistics

echo ""
echo "✅ Тестирование завершено"

