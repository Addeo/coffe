# Исправление проблем SSH соединения в GitHub Actions

## Проблема

GitHub Actions не может подключиться к серверу из-за:
- `kex_exchange_identification: read: Connection reset by peer`
- `Connection reset by port 22`
- Таймауты при SCP/SSH

## Причины

1. **Файрвол на сервере** блокирует IP GitHub Actions
2. **Слишком много одновременных подключений** к SSH
3. **Сетевые проблемы** между GitHub и VPS
4. **Rate limiting** на SSH-сервере

## Решения

### 1. Улучшена конфигурация SSH в workflow

```yaml
- name: 🔐 Setup SSH
  run: |
    # Настройка SSH клиента для надежности
    cat >> ~/.ssh/config << 'SSH_CONFIG'
    Host *
      ServerAliveInterval 15
      ServerAliveCountMax 3
      TCPKeepAlive yes
      ConnectTimeout 30
      Compression yes
      StrictHostKeyChecking no
    SSH_CONFIG
    
    # Тест подключения
    ssh -o ConnectTimeout=10 user@host "echo 'Connection OK'"
```

### 2. Добавлена retry-логика для SCP

```yaml
- name: 📤 Upload to VPS
  run: |
    MAX_RETRIES=3
    RETRY_DELAY=10
    
    for i in $(seq 1 $MAX_RETRIES); do
      if scp -o ConnectTimeout=30 \
             -o ServerAliveInterval=15 \
             -o TCPKeepAlive=yes \
             -o Compression=yes \
             deploy-package.tar.gz user@host:/tmp/; then
        echo "✅ Upload successful"
        exit 0
      else
        echo "❌ Upload failed (attempt $i)"
        [ $i -lt $MAX_RETRIES ] && sleep $RETRY_DELAY
      fi
    done
    exit 1
```

### 3. Добавлена retry-логика для SSH deployment

```yaml
- name: 🔧 Deploy on VPS
  run: |
    MAX_RETRIES=2
    RETRY_DELAY=15
    
    for i in $(seq 1 $MAX_RETRIES); do
      if ssh [options] user@host bash -s << 'EOF'
        # deployment commands
      EOF
      then
        echo "✅ Deployment successful"
        break
      else
        [ $i -lt $MAX_RETRIES ] && sleep $RETRY_DELAY
      fi
    done
```

## Дополнительные меры

### На стороне сервера

1. **Увеличить лимиты SSH в `/etc/ssh/sshd_config`:**
   ```bash
   MaxSessions 20
   MaxStartups 10:30:20
   ClientAliveInterval 30
   ClientAliveCountMax 3
   TCPKeepAlive yes
   ```

2. **Разрешить IP GitHub Actions в файрволе:**
   ```bash
   # Получить список IP GitHub Actions
   curl https://api.github.com/meta | jq -r '.actions[]'
   
   # Добавить в UFW (пример)
   sudo ufw allow from <github-ip-range> to any port 22
   ```

3. **Настроить fail2ban для исключения GitHub Actions:**
   ```bash
   # В /etc/fail2ban/jail.local
   [sshd]
   ignoreip = 127.0.0.1/8 <github-ip-ranges>
   ```

### Альтернативные решения

1. **Использовать GitHub-hosted runner с статическим IP:**
   - Self-hosted runner на отдельном сервере
   - GitHub Enterprise с выделенными IP

2. **Использовать SSH Jump Host / Bastion:**
   - Настроить промежуточный сервер с более стабильным соединением

3. **Использовать другие методы деплоя:**
   - Docker Registry + Watchtower для автообновления
   - CI/CD через Webhook на сервере
   - Deploy keys через rsync over SSH tunnel

## Мониторинг

Проверить статус SSH-соединений на сервере:
```bash
# Активные SSH соединения
ss -t state established '( dport = :22 or sport = :22 )'

# Статистика SSH
sudo journalctl -u ssh -f

# Проверка fail2ban
sudo fail2ban-client status sshd
```

## Проверка исправлений

После внесения изменений:
1. Закоммитить и запушить изменения
2. Запустить workflow вручную через GitHub Actions
3. Проверить логи на наличие успешных retry-попыток
4. Убедиться, что деплой завершился успешно

## Результат

✅ SSH-соединение стало более устойчивым  
✅ SCP-загрузки работают с retry  
✅ Deployment продолжается даже при временных сбоях  
✅ Автоматическое восстановление при ошибках

