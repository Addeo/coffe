# Быстрая справка по командам

## ❌ Не работают (требуют SSH)

```bash
npm run check:disk      # Проверка диска на сервере
npm run clean:backups   # Очистка бэкапов на сервере
```

**Причина:** SSH-соединение недоступно с локальной машины

## ✅ Работают (локальные альтернативы)

### Новые команды

```bash
# Справка
npm run local:help

# Проверить статус Docker локально
npm run local:status

# Посмотреть логи backend
npm run local:logs

# Очистить Docker локально
npm run local:clean

# Создать скрипт для сервера
npm run local:generate
```

### Docker команды

```bash
npm run docker:up       # Запустить сервисы
npm run docker:down     # Остановить сервисы
npm run docker:logs     # Просмотр логов
```

### Разработка

```bash
npm run dev             # Запустить через Docker
npm run dev:frontend    # Только фронтенд
npm run dev:backend     # Только бэкенд
```

### Сборка

```bash
npm run build           # Собрать через Docker
npm run build:frontend  # Только фронтенд
npm run build:backend   # Только бэкенд
npm run build:apk       # Собрать Android APK
```

## 🖥️ Команды для выполнения на сервере

### Подключиться

```bash
ssh user1@192.144.12.102
```

### Проверка диска

```bash
df -h /                    # Использование диска
du -sh ~/coffe            # Размер проекта
du -h ~/coffe | sort -rh | head -10  # Топ-10 папок
docker system df          # Docker диск
```

### Очистка

```bash
# Бэкапы
rm -rf ~/coffe/backups/*

# Docker
docker system prune -af

# Логи
truncate -s 0 ~/coffe/backend/server.log
```

### Docker на сервере

```bash
cd ~/coffe
docker compose -f docker-compose.fallback.yml ps       # Статус
docker compose -f docker-compose.fallback.yml logs -f  # Логи
docker compose -f docker-compose.fallback.yml restart  # Перезапуск
```

## 📝 Использование сгенерированного скрипта

```bash
# 1. Создать скрипт
npm run local:generate

# 2. Запустить на сервере (выбрать один вариант)

# Вариант А: Загрузить и выполнить
scp server-maintenance.sh user1@192.144.12.102:~/
ssh user1@192.144.12.102 'bash ~/server-maintenance.sh'

# Вариант Б: Выполнить напрямую
ssh user1@192.144.12.102 'bash -s' < server-maintenance.sh
```

## 🔧 Troubleshooting

### Проблема: SSH не работает

```bash
# Проверить ключ
ls -la ~/.ssh/coffe_key

# Если нет - создать
nano ~/.ssh/coffe_key
# Вставить ключ из YOUR_GITHUB_SECRETS.txt (строки 43-49)
chmod 600 ~/.ssh/coffe_key
```

### Проблема: Docker не запущен

```bash
# macOS
open -a Docker

# Linux
sudo systemctl start docker

# Проверить
docker ps
```

### Проблема: Команда не найдена

```bash
# Посмотреть все доступные команды
npm run

# Обновить зависимости
npm install
```

## 📊 Мониторинг

### Локально

```bash
npm run local:status     # Статус контейнеров
npm run local:logs       # Логи
docker ps               # Все контейнеры
docker stats            # Использование ресурсов
```

### На сервере

```bash
ssh user1@192.144.12.102 'df -h / && docker system df'
```

## 🚀 Деплой

```bash
# Автоматический (через GitHub Actions)
git add .
git commit -m "Update"
git push origin main

# Проверить статус
# https://github.com/YOUR_REPO/actions
```

## 💡 Полезные ссылки

- Полная документация: `LOCAL_COMMANDS_README.md`
- Исправление деплоя: `DEPLOYMENT_CONNECTION_FIX.md`
- Старт проекта: `START_HERE.md`
