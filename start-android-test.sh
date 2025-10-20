#!/bin/bash

# 🚀 СКРИПТ ДЛЯ БЫСТРОГО ТЕСТИРОВАНИЯ ANDROID ПРИЛОЖЕНИЯ

echo "📱 ЗАПУСК ТЕСТИРОВАНИЯ ANDROID ПРИЛОЖЕНИЯ"
echo "========================================"

# Переходим в папку frontend
cd /Users/sergejkosilov/WebstormProjects/new\ goal/coffe/frontend

echo "✅ Перешли в папку frontend"

# Проверяем, что Android Studio установлена
if [ ! -d "/Applications/Android Studio.app" ]; then
    echo "❌ Android Studio не найдена!"
    echo "📥 Скачайте с: https://developer.android.com/studio"
    exit 1
fi

echo "✅ Android Studio найдена"

# Проверяем подключенные устройства
echo "🔍 Проверяем подключенные устройства..."
adb devices

echo ""
echo "📋 ВАРИАНТЫ ТЕСТИРОВАНИЯ:"
echo "1️⃣ На эмуляторе (рекомендуется)"
echo "2️⃣ На реальном устройстве"
echo "3️⃣ Открыть Android Studio"
echo ""

read -p "Выберите вариант (1/2/3): " choice

case $choice in
    1)
        echo "🚀 Запускаем на эмуляторе..."
        npx @capacitor/cli run android
        ;;
    2)
        echo "📱 Запускаем на реальном устройстве..."
        echo "⚠️  Убедитесь, что устройство подключено и включена отладка по USB"
        npx @capacitor/cli run android
        ;;
    3)
        echo "🔧 Открываем Android Studio..."
        npx @capacitor/cli open android
        echo "✅ Android Studio открыта!"
        echo "📋 Следующие шаги:"
        echo "   1. Создайте эмулятор (Device Manager → +)"
        echo "   2. Запустите эмулятор (▶️)"
        echo "   3. Нажмите Run 'app' (зелёная ▶️ вверху)"
        ;;
    *)
        echo "❌ Неверный выбор"
        exit 1
        ;;
esac

echo ""
echo "🎯 ПРОВЕРЬТЕ РЕЗУЛЬТАТ:"
echo "✅ Приложение должно открыться"
echo "✅ Должен показаться интерфейс входа (не белый экран)"
echo "✅ Если есть проблемы - смотрите логи в Logcat"
echo ""
echo "📞 Нужна помощь? Смотрите файл: 📱_ANDROID_STUDIO_ТЕСТИРОВАНИЕ.md"
