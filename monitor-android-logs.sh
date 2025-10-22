#!/bin/bash

# 📱 Скрипт для мониторинга логов Android приложения Coffee Admin
# Использование: ./monitor-android-logs.sh

echo "🔍 МОНИТОРИНГ ЛОГОВ ANDROID ПРИЛОЖЕНИЯ"
echo "======================================"
echo ""
echo "📱 Приложение: Coffee Admin (com.coffee.admin)"
echo "📊 Отображаю: Capacitor, Console, Errors, HTTP"
echo ""
echo "⏹️  Для остановки нажмите Ctrl+C"
echo ""
echo "======================================"
echo ""

# Очистить старые логи
adb logcat -c

# Показать логи в реальном времени
adb logcat | grep --line-buffered -iE "capacitor|console|coffee|error|http|xhr|fetch|network" | while read line; do
    # Подсветка важных строк
    if echo "$line" | grep -qi "error\|fatal"; then
        echo "❌ $line"
    elif echo "$line" | grep -qi "console"; then
        echo "💬 $line"
    elif echo "$line" | grep -qi "http\|xhr\|fetch"; then
        echo "🌐 $line"
    else
        echo "📋 $line"
    fi
done



