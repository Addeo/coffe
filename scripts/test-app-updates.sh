#!/bin/bash

echo "🧪 Тестирование системы обновлений приложения"
echo "=============================================="

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Функция для проверки статуса
check_status() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✅ $2${NC}"
    else
        echo -e "${RED}❌ $2${NC}"
    fi
}

echo -e "${BLUE}1. Проверка backend API для версий...${NC}"
BACKEND_URL="http://192.144.12.102:3001/api/app/version"
echo "Запрос к: $BACKEND_URL"

# Проверяем API версий
API_RESPONSE=$(curl -s "$BACKEND_URL" 2>/dev/null)
if [ $? -eq 0 ] && [ ! -z "$API_RESPONSE" ]; then
    echo -e "${GREEN}✅ Backend API отвечает${NC}"
    echo "Ответ: $API_RESPONSE"
    
    # Проверяем структуру ответа
    if echo "$API_RESPONSE" | grep -q '"version"'; then
        check_status 0 "Структура ответа корректна"
    else
        check_status 1 "Структура ответа некорректна"
    fi
    
    if echo "$API_RESPONSE" | grep -q '"downloadUrl"'; then
        check_status 0 "URL для скачивания присутствует"
    else
        check_status 1 "URL для скачивания отсутствует"
    fi
else
    check_status 1 "Backend API не отвечает"
    echo "Убедитесь, что backend запущен на 192.144.12.102:3001"
fi

echo ""
echo -e "${BLUE}2. Проверка доступности APK файлов...${NC}"

# Проверяем APK файлы
APK_URL="http://192.144.12.102:3001/app-debug.apk"
echo "Проверка: $APK_URL"

APK_STATUS=$(curl -s -I "$APK_URL" 2>/dev/null | head -n 1)
if echo "$APK_STATUS" | grep -q "200 OK"; then
    check_status 0 "APK файл доступен для скачивания"
else
    check_status 1 "APK файл недоступен"
    echo "Статус: $APK_STATUS"
fi

echo ""
echo -e "${BLUE}3. Проверка локальных APK файлов...${NC}"

if [ -f "app-debug.apk" ]; then
    check_status 0 "app-debug.apk существует локально"
    echo "Размер: $(ls -lh app-debug.apk | awk '{print $5}')"
else
    check_status 1 "app-debug.apk не найден локально"
fi

if [ -f "CoffeeAdmin-v2.apk" ]; then
    check_status 0 "CoffeeAdmin-v2.apk существует локально"
    echo "Размер: $(ls -lh CoffeeAdmin-v2.apk | awk '{print $5}')"
else
    check_status 1 "CoffeeAdmin-v2.apk не найден локально"
fi

echo ""
echo -e "${BLUE}4. Проверка конфигурации frontend...${NC}"

# Проверяем environment файлы
if [ -f "frontend/src/environments/environment.mobile.ts" ]; then
    if grep -q "appVersion" "frontend/src/environments/environment.mobile.ts"; then
        check_status 0 "appVersion настроен в mobile environment"
    else
        check_status 1 "appVersion отсутствует в mobile environment"
    fi
    
    if grep -q "192.144.12.102" "frontend/src/environments/environment.mobile.ts"; then
        check_status 0 "Правильный API URL в mobile environment"
    else
        check_status 1 "Неправильный API URL в mobile environment"
    fi
else
    check_status 1 "environment.mobile.ts не найден"
fi

echo ""
echo -e "${BLUE}5. Проверка Capacitor конфигурации...${NC}"

if [ -f "frontend/capacitor.config.json" ]; then
    if grep -q "Browser" "frontend/capacitor.config.json"; then
        check_status 0 "Browser плагин настроен в Capacitor"
    else
        check_status 1 "Browser плагин не настроен в Capacitor"
    fi
else
    check_status 1 "capacitor.config.json не найден"
fi

echo ""
echo -e "${BLUE}6. Рекомендации для тестирования...${NC}"
echo -e "${YELLOW}📱 Для тестирования на Android устройстве:${NC}"
echo "1. Убедитесь, что приложение собрано с новой версией"
echo "2. Установите приложение на устройство"
echo "3. Откройте приложение и проверьте консоль на наличие логов обновлений"
echo "4. Для принудительной проверки используйте AppUpdateService.forceCheckForUpdates()"

echo ""
echo -e "${YELLOW}🔧 Для отладки:${NC}"
echo "1. Откройте DevTools в браузере/эмуляторе"
echo "2. Найдите логи с эмодзи 🔍, 📡, ✅, ❌"
echo "3. Проверьте Network tab на запросы к /api/app/version"

echo ""
echo -e "${GREEN}Тестирование завершено!${NC}"
