# SSH Connection Troubleshooting

## Текущая проблема

```
Connection timed out during banner exchange
Connection to 192.144.12.102 port 22 timed out
```

## Что это значит

- ✅ Порт 22 открыт (TCP соединение проходит)
- ✅ SSH ключ валидный
- ❌ SSH-сервер не отвечает на начальный обмен приветствиями

## Возможные причины

### 1. SSH-сервер перегружен

- Слишком много активных подключений
- Достигнут лимит `MaxStartups` или `MaxSessions`

### 2. Fail2ban заблокировал IP

- После нескольких неудачных попыток
- Временная блокировка (обычно 10-30 минут)

### 3. Файрвол/Rate limiting

- UFW или iptables ограничивает скорость подключений
- CloudFlare или другой прокси блокирует

### 4. Сетевые проблемы

- Проблемы у провайдера
- Высокая нагрузка на сеть

## Решения

### Быстрое решение: Использовать веб-консоль

1. Зайти в панель управления VPS
2. Открыть веб-консоль/терминал
3. Выполнить команды напрямую

### Решение 1: Проверить fail2ban

Через веб-консоль:

```bash
# Проверить статус
sudo fail2ban-client status sshd

# Посмотреть заблокированные IP
sudo fail2ban-client get sshd banned

# Разблокировать свой IP (узнать: curl ifconfig.me)
sudo fail2ban-client set sshd unbanip YOUR_IP
```

### Решение 2: Увеличить лимиты SSH

```bash
sudo nano /etc/ssh/sshd_config

# Изменить:
MaxStartups 20:30:40
MaxSessions 20
LoginGraceTime 60
ClientAliveInterval 30
ClientAliveCountMax 10

# Перезапустить
sudo systemctl restart sshd
```

### Решение 3: Очистить активные SSH соединения

```bash
# Посмотреть активные подключения
who

# Убить зависшие сессии
sudo pkill -u USER_NAME sshd

# Или все SSH соединения (осторожно!)
sudo systemctl restart sshd
```

### Решение 4: Использовать локальные команды

Вместо SSH:

```bash
# Справка по доступным командам
npm run local:help

# Статус локальных сервисов
npm run local:status

# Сгенерировать скрипт для сервера
npm run local:generate

# Потом выполнить через веб-консоль
```

### Решение 5: Подождать

Если это fail2ban, блокировка автоматически снимется через:

- 10 минут (по умолчанию)
- 30 минут (частая настройка)
- 1 час (строгая настройка)

```bash
# Попробовать снова через 15 минут
sleep 900 && ssh -i ~/.ssh/coffe_key user1@192.144.12.102
```

## Проверка с локальной машины

### Узнать свой IP

```bash
curl ifconfig.me
```

### Проверить доступность порта

```bash
nc -zv 192.144.12.102 22
```

### Попробовать с другими параметрами

```bash
# С увеличенными таймаутами
ssh -i ~/.ssh/coffe_key \
    -o ConnectTimeout=30 \
    -o ServerAliveInterval=10 \
    -o ServerAliveCountMax=3 \
    user1@192.144.12.102

# С другим SSH клиентом (если доступен)
telnet 192.144.12.102 22
```

## Мониторинг на сервере

Через веб-консоль провайдера:

```bash
# SSH лог
sudo tail -f /var/log/auth.log | grep sshd

# Активные SSH соединения
ss -tn state established '( dport = :22 or sport = :22 )'

# Количество соединений
ss -tn state established '( dport = :22 or sport = :22 )' | wc -l

# Системная нагрузка
uptime
htop
```

## Альтернативные методы работы

### 1. GitHub Actions (рекомендуется)

```bash
# Все изменения деплоятся автоматически
git add .
git commit -m "Update"
git push origin main

# Проверить статус: https://github.com/YOUR_REPO/actions
```

### 2. Docker API (если настроен)

```bash
# Подключение к Docker на сервере
docker -H tcp://192.144.12.102:2376 ps
```

### 3. REST API для управления

Создать эндпоинт в NestJS для мониторинга:

```typescript
@Get('system/status')
async getSystemStatus() {
  return {
    disk: await this.checkDiskUsage(),
    memory: process.memoryUsage(),
    uptime: process.uptime()
  };
}
```

## Команды для выполнения на сервере

Когда получите доступ через веб-консоль:

### Проверка диска

```bash
df -h /
du -sh ~/coffe
docker system df
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

### Перезапуск сервисов

```bash
cd ~/coffe
docker compose -f docker-compose.fallback.yml restart
```

## Профилактика

### На сервере (через веб-консоль)

1. **Настроить fail2ban whitelist**

```bash
sudo nano /etc/fail2ban/jail.local

[DEFAULT]
ignoreip = 127.0.0.1/8 YOUR_IP_HERE
```

2. **Увеличить SSH лимиты**

```bash
sudo nano /etc/ssh/sshd_config
# MaxStartups 20:30:40
```

3. **Мониторинг**

```bash
# Добавить в crontab
*/5 * * * * ss -tn '( dport = :22 )' | wc -l >> /tmp/ssh-connections.log
```

### На клиенте

1. **Использовать GitHub Actions** для деплоя
2. **Создать задачи cron на сервере** для очистки
3. **Настроить мониторинг** через API

## Контакты поддержки

Если проблема не решается:

1. Обратиться в поддержку VPS провайдера
2. Попросить проверить SSH логи
3. Попросить временно отключить fail2ban
4. Запросить доступ через VNC/консоль

## Полезные ссылки

- `LOCAL_COMMANDS_README.md` - Команды без SSH
- `DEPLOYMENT_CONNECTION_FIX.md` - Исправление деплоя
- `COMMANDS_QUICK_REFERENCE.md` - Быстрая справка
