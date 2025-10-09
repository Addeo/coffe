#!/bin/bash
# Скрипт для первоначальной настройки VPS

echo "🚀 Настройка VPS для деплоя приложения..."

# 1. Обновление системы
echo "📦 Обновление системы..."
sudo apt update && sudo apt upgrade -y

# 2. Установка Docker
echo "🐳 Установка Docker..."
sudo apt install -y docker.io docker-compose git curl

# 3. Добавление пользователя в группу docker
echo "👤 Настройка прав для Docker..."
sudo usermod -aG docker $USER

# 4. Создание директории для проекта
echo "📁 Создание директории проекта..."
mkdir -p ~/coffe
cd ~/coffe

# 5. Проверка установки
echo "✅ Проверка установки..."
docker --version
docker-compose --version

echo ""
echo "════════════════════════════════════════════════"
echo "✅ VPS готов к деплоу!"
echo "════════════════════════════════════════════════"
echo ""
echo "Следующие шаги:"
echo "1. Добавьте секреты в GitHub (Settings → Secrets)"
echo "2. Сделайте git push origin main"
echo "3. GitHub Actions автоматически задеплоит приложение"
echo ""
echo "После деплоя приложение будет доступно:"
echo "  - Frontend: http://$(curl -s ifconfig.me):4000"
echo "  - Backend:  http://$(curl -s ifconfig.me):3001"
echo ""

