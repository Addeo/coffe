#!/bin/bash

echo "🧪 Локальное тестирование системы обновлений"
echo "=============================================="

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}1. Запуск backend локально...${NC}"

# Проверяем, запущен ли уже backend
if lsof -i :3001 > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️ Backend уже запущен на порту 3001${NC}"
else
    echo "Запускаем backend..."
    cd backend && npm run start:dev &
    BACKEND_PID=$!
    echo "Backend запущен с PID: $BACKEND_PID"
    
    # Ждем запуска backend
    echo "Ожидание запуска backend..."
    for i in {1..30}; do
        if curl -s http://localhost:3001/api/test > /dev/null 2>&1; then
            echo -e "${GREEN}✅ Backend запущен успешно${NC}"
            break
        fi
        sleep 1
        echo -n "."
    done
fi

echo ""
echo -e "${BLUE}2. Тестирование API версий...${NC}"

# Тестируем API версий
API_RESPONSE=$(curl -s http://localhost:3001/api/app/version 2>/dev/null)
if [ $? -eq 0 ] && [ ! -z "$API_RESPONSE" ]; then
    echo -e "${GREEN}✅ Backend API отвечает${NC}"
    echo "Ответ: $API_RESPONSE"
    
    # Проверяем URL
    if echo "$API_RESPONSE" | grep -q "localhost:3001"; then
        echo -e "${GREEN}✅ URL для скачивания правильный${NC}"
    else
        echo -e "${RED}❌ URL для скачивания неправильный${NC}"
        echo "Ожидается: localhost:3001"
    fi
else
    echo -e "${RED}❌ Backend API не отвечает${NC}"
fi

echo ""
echo -e "${BLUE}3. Тестирование доступности APK...${NC}"

# Проверяем APK файлы
APK_URL="http://localhost:3001/app-debug.apk"
echo "Проверка: $APK_URL"

APK_STATUS=$(curl -s -I "$APK_URL" 2>/dev/null | head -n 1)
if echo "$APK_STATUS" | grep -q "200 OK"; then
    echo -e "${GREEN}✅ APK файл доступен локально${NC}"
else
    echo -e "${RED}❌ APK файл недоступен локально${NC}"
    echo "Статус: $APK_STATUS"
fi

echo ""
echo -e "${BLUE}4. Сборка frontend для тестирования...${NC}"

cd ../frontend

# Проверяем зависимости
if [ ! -d "node_modules/@capacitor/browser" ]; then
    echo "Устанавливаем Capacitor Browser..."
    npm install @capacitor/browser@^5.0.0 --legacy-peer-deps
fi

# Собираем приложение
echo "Собираем приложение..."
npm run build:android

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Приложение собрано успешно${NC}"
else
    echo -e "${RED}❌ Ошибка сборки приложения${NC}"
fi

echo ""
echo -e "${BLUE}5. Инструкции для тестирования...${NC}"
echo -e "${YELLOW}📱 Для тестирования на эмуляторе:${NC}"
echo "1. Запустите Android эмулятор"
echo "2. Установите приложение: adb install android/app/build/outputs/apk/debug/app-debug.apk"
echo "3. Откройте приложение и проверьте консоль"

echo ""
echo -e "${YELLOW}🌐 Для тестирования в браузере:${NC}"
echo "1. Запустите: npm run dev"
echo "2. Откройте DevTools"
echo "3. В консоли выполните:"
echo "   localStorage.removeItem('app_update_last_check');"
echo "   // Затем перезагрузите страницу"

echo ""
echo -e "${YELLOW}🔧 Для отладки:${NC}"
echo "1. Откройте DevTools"
echo "2. Найдите логи с эмодзи 🔍, 📡, ✅, ❌"
echo "3. Проверьте Network tab на запросы к /api/app/version"

echo ""
echo -e "${GREEN}Локальное тестирование завершено!${NC}"

# Очистка
if [ ! -z "$BACKEND_PID" ]; then
    echo ""
    echo -e "${YELLOW}Для остановки backend выполните: kill $BACKEND_PID${NC}"
fi
