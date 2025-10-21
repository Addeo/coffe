#!/bin/bash

# 🚀 Скрипт для быстрого запуска эмулятора с Coffee Admin
# Использование: ./start-emulator-test.sh [emulator|production]

VERSION=${1:-production}

echo "═══════════════════════════════════════════════════════"
echo "📱 ЗАПУСК ANDROID ЭМУЛЯТОРА С COFFEE ADMIN"
echo "═══════════════════════════════════════════════════════"
echo ""

# Определяем какой APK использовать
if [ "$VERSION" = "emulator" ]; then
    APK="CoffeeAdmin-emulator.apk"
    BACKEND="localhost:3001"
    echo "📦 Версия: EMULATOR (localhost:3001)"
else
    APK="CoffeeAdmin-fixed.apk"
    BACKEND="192.144.12.102:3001"
    echo "📦 Версия: PRODUCTION (192.144.12.102:3001)"
fi

echo ""
echo "🛑 Останавливаю старые эмуляторы..."
pkill -f "emulator.*Medium_Phone" || true
adb kill-server 2>/dev/null || true
sleep 2

echo ""
echo "🚀 Запускаю эмулятор..."
/Users/sergejkosilov/Library/Android/sdk/emulator/emulator \
    -avd Medium_Phone_API_36.1 \
    -no-snapshot-load \
    -no-boot-anim &

EMULATOR_PID=$!
echo "   PID: $EMULATOR_PID"

echo ""
echo "⏳ Ожидание загрузки эмулятора (30 секунд)..."
sleep 30

echo ""
echo "🔌 Запуск ADB сервера..."
adb start-server

echo ""
echo "📱 Проверка устройств..."
adb devices

# Если это версия для эмулятора, настроим port forwarding
if [ "$VERSION" = "emulator" ]; then
    echo ""
    echo "🔧 Настройка port forwarding для localhost..."
    adb reverse tcp:3001 tcp:3001
    echo "   ✅ Port forwarding: 3001 -> 3001"
fi

echo ""
echo "📲 Установка APK: $APK..."
adb install -r "$APK"

echo ""
echo "🚀 Запуск приложения..."
adb shell am start -n com.coffee.admin/.MainActivity

echo ""
sleep 3

echo "═══════════════════════════════════════════════════════"
echo "✅ ГОТОВО! ПРИЛОЖЕНИЕ ЗАПУЩЕНО"
echo "═══════════════════════════════════════════════════════"
echo ""
echo "🌐 Chrome DevTools:"
echo "   1. Откройте: chrome://inspect/#devices"
echo "   2. Найдите: Coffee Admin под emulator-5554"
echo "   3. Кликните: [inspect]"
echo ""
echo "📊 Конфигурация:"
echo "   • APK: $APK"
echo "   • Backend: $BACKEND"
echo "   • Эмулятор: emulator-5554"
echo ""
echo "🔐 Тестовые данные:"
echo "   Email: admin@coffee.com"
echo "   Password: password"
echo ""
echo "📋 Полезные команды:"
echo "   • Логи в реальном времени: ./monitor-android-logs.sh"
echo "   • Остановить эмулятор: pkill -f emulator"
echo "   • Перезапустить: ./start-emulator-test.sh $VERSION"
echo ""
echo "═══════════════════════════════════════════════════════"


