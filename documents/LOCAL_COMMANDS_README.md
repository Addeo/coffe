# Локальные команды (без SSH)

## Проблема

Команды `npm run check:disk` и `npm run clean:backups` не работают, потому что требуют SSH-подключения к серверу, которое недоступно с локальной машины.

## Решение

### Новые локальные команды (работают без SSH)

```bash
# Показать справку
npm run local:help

# Проверить статус локальных Docker контейнеров
npm run local:status

# Просмотреть логи backend
npm run local:logs

# Очистить локальные Docker ресурсы
npm run local:clean

# Сгенерировать скрипт для выполнения на сервере
npm run local:generate
```

## Использование

### 1. Проверка локального статуса

```bash
npm run local:status
```

Показывает:
- Статус Docker контейнеров
- Использование диска Docker
- Запущенные сервисы

### 2. Просмотр логов

```bash
npm run local:logs
```

Показывает последние 50 строк логов backend контейнера.

### 3. Генерация скрипта для сервера

```bash
npm run local:generate
```

Создаёт файл `server-maintenance.sh` который можно запустить на сервере:

```bash
# Вариант 1: Загрузить и запустить
scp server-maintenance.sh user1@192.144.12.102:~/
ssh user1@192.144.12.102 'bash ~/server-maintenance.sh'

# Вариант 2: Запустить напрямую
ssh user1@192.144.12.102 'bash -s' < server-maintenance.sh
```

### 4. Очистка локальных ресурсов

```bash
npm run local:clean
```

Удаляет:
- Остановленные контейнеры
- Неиспользуемые сети
- Dangling образы

## Работа с сервером вручную

### Проверка диска на сервере

```bash
ssh user1@192.144.12.102

# Использование диска
df -h /

# Размер проекта
du -sh ~/coffe

# Топ-10 папок
du -h ~/coffe | sort -rh | head -10

# Docker
docker system df
```

### Очистка бэкапов на сервере

```bash
ssh user1@192.144.12.102

# Посмотреть размер
du -sh ~/coffe/backups

# Очистить
rm -rf ~/coffe/backups/*

# Проверить результат
df -h /
```

### Очистка Docker на сервере

```bash
ssh user1@192.144.12.102

# Посмотреть использование
docker system df

# Удалить неиспользуемое
docker system prune -af

# Удалить остановленные контейнеры
docker container prune -f

# Удалить неиспользуемые образы
docker image prune -af
```

## Альтернативные методы подключения

### Если SSH не работает напрямую

1. **Через веб-консоль провайдера** (например, панель управления VPS)
2. **Через VPN**, если требуется
3. **Настроить GitHub Actions** для выполнения команд:
   ```yaml
   - name: Server Maintenance
     run: |
       ssh user@host << 'EOF'
         df -h /
         docker system df
       EOF
   ```

## Docker команды (работают локально)

```bash
# Запустить локальные сервисы
npm run docker:up

# Остановить сервисы
npm run docker:down

# Просмотреть логи
npm run docker:logs

# Посмотреть статус
docker ps
```

## Troubleshooting

### SSH ключ не найден

```bash
# Создать директорию
mkdir -p ~/.ssh

# Скопировать ключ из YOUR_GITHUB_SECRETS.txt
# (строки 43-49) в ~/.ssh/coffe_key

# Установить права
chmod 600 ~/.ssh/coffe_key
```

### SSH соединение не работает

Причины:
- Файрвол блокирует подключение
- SSH сервер перегружен
- Неверный IP или порт

Решение:
- Используйте веб-консоль провайдера
- Используйте `local:generate` для создания скрипта
- Выполняйте команды через GitHub Actions

### Docker не запущен

```bash
# macOS
open -a Docker

# Linux
sudo systemctl start docker

# Проверить
docker ps
```

## Полезные команды

```bash
# Посмотреть все npm скрипты
npm run

# Посмотреть размер проекта локально
du -sh .

# Очистить node_modules
find . -name "node_modules" -type d -prune -exec rm -rf '{}' +

# Пересобрать всё
npm run build
```

## Примеры использования

### Ежедневная проверка

```bash
# Локально
npm run local:status

# На сервере (через SSH)
ssh user1@192.144.12.102 'df -h / && docker system df'
```

### Еженедельная очистка

```bash
# Локально
npm run local:clean

# На сервере
npm run local:generate
ssh user1@192.144.12.102 'bash -s' < server-maintenance.sh
```

### Перед деплоем

```bash
# Проверить локальный Docker
npm run local:status

# Проверить логи
npm run local:logs

# Запустить деплой
git push origin main  # Триггерит GitHub Actions
```

