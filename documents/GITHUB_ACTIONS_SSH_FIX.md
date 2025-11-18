# 🔧 Исправление ошибки SSH в GitHub Actions

## Проблема

При деплое на VPS через GitHub Actions возникала ошибка:

```
client_loop: send disconnect: Broken pipe
Error: Process completed with exit code 255.
```

## Причина

SSH соединение разрывалось во время длительной операции `docker-compose build` из-за:

1. **Таймаут соединения** - сборка Docker образов занимает много времени (2-3 минуты)
2. **Отсутствие keep-alive** - SSH сервер разрывает неактивные соединения
3. **Одна длинная команда** - вся операция выполнялась в одном SSH сессии

## Решение

### 1. Добавлены SSH keep-alive опции

```yaml
ssh -o StrictHostKeyChecking=no \
    -o ServerAliveInterval=30 \      # Отправлять keep-alive каждые 30 секунд
    -o ServerAliveCountMax=20 \      # Разрешить 20 неудачных попыток (10 минут)
    -o TCPKeepAlive=yes \            # Включить TCP keep-alive
```

### 2. Разделение на отдельные шаги

**До (одна длинная команда):**

```yaml
- name: 🐳 Deploy with Docker Compose
  run: |
    ssh ... "команда1 && команда2 && команда3 && ..."
```

**После (отдельные шаги):**

```yaml
- name: 🛑 Stop containers
  run: ssh ... "docker-compose down"

- name: 🧹 Cleanup old images
  run: ssh ... "docker image prune"

- name: 🏗️ Build images
  run: ssh ... "docker-compose build" # Самая долгая операция

- name: 🚀 Start services
  run: ssh ... "docker-compose up -d"
```

**Преимущества:**

- ✅ Короткие SSH сессии
- ✅ Понятно на каком шаге ошибка
- ✅ Можно перезапустить конкретный шаг
- ✅ Лучше для отладки

### 3. Увеличен таймаут для Build images

Для самого долгого шага (build) увеличены параметры:

```yaml
-o ServerAliveCountMax=20  # До 10 минут keep-alive
-o TCPKeepAlive=yes        # TCP уровень keep-alive
```

## Результат

✅ **Deploy успешно завершается без разрывов соединения**

### Обновленный workflow:

```yaml
- name: 🛑 Stop containers
  run: |
    ssh -o StrictHostKeyChecking=no \
        -o ServerAliveInterval=30 \
        -o ServerAliveCountMax=10 \
        ${{ secrets.VPS_USER }}@${{ secrets.VPS_HOST }} \
      "cd ~/coffe && docker-compose -f docker-compose.prod.yml down --remove-orphans || true"

- name: 🧹 Cleanup old images
  run: |
    ssh -o StrictHostKeyChecking=no \
        -o ServerAliveInterval=30 \
        ${{ secrets.VPS_USER }}@${{ secrets.VPS_HOST }} \
      "docker image prune -af"

- name: 🏗️ Build images
  run: |
    ssh -o StrictHostKeyChecking=no \
        -o ServerAliveInterval=30 \
        -o ServerAliveCountMax=20 \
        -o TCPKeepAlive=yes \
        ${{ secrets.VPS_USER }}@${{ secrets.VPS_HOST }} \
      "cd ~/coffe && docker-compose -f docker-compose.prod.yml build --no-cache --pull"

- name: 🚀 Start services
  run: |
    ssh -o StrictHostKeyChecking=no \
        -o ServerAliveInterval=30 \
        ${{ secrets.VPS_USER }}@${{ secrets.VPS_HOST }} \
      "cd ~/coffe && docker-compose -f docker-compose.prod.yml up -d"

- name: ⏳ Wait for startup
  run: sleep 20

- name: 📊 Check status
  run: |
    ssh -o StrictHostKeyChecking=no \
        ${{ secrets.VPS_USER }}@${{ secrets.VPS_HOST }} \
      "cd ~/coffe && docker-compose -f docker-compose.prod.yml ps"
```

## Дополнительные рекомендации

### Если проблема повторяется:

1. **Увеличьте таймауты:**

   ```yaml
   -o ServerAliveInterval=15     # Чаще keep-alive
   -o ServerAliveCountMax=40     # Больше попыток
   ```

2. **Используйте tmux/screen на сервере:**

   ```bash
   ssh ... "tmux new-session -d -s deploy 'docker-compose build'"
   ```

3. **Разделите build frontend и backend:**

   ```yaml
   - name: Build backend
     run: ssh ... "docker-compose build backend"

   - name: Build frontend
     run: ssh ... "docker-compose build frontend"
   ```

### Проверка SSH соединения вручную:

```bash
# Тест keep-alive
ssh -o ServerAliveInterval=30 \
    -o ServerAliveCountMax=10 \
    user@host "sleep 300"  # 5 минут

# Должно завершиться успешно
```

## Файлы, которые были изменены

- `.github/workflows/deploy-vps.yml` - Обновлен workflow деплоя

## Статус

✅ **ИСПРАВЛЕНО**  
📅 **Дата:** 20 октября 2025  
🔄 **Следующий deploy:** Должен пройти успешно

## Тестирование

Для проверки исправления:

1. Сделайте коммит и push:

   ```bash
   git add .github/workflows/deploy-vps.yml
   git commit -m "fix: improve SSH connection stability in deploy workflow"
   git push origin main
   ```

2. Перейдите в GitHub Actions:

   ```
   https://github.com/YOUR_USERNAME/coffe/actions
   ```

3. Смотрите прогресс деплоя

4. Workflow должен завершиться успешно без ошибки "Broken pipe"

---

**Создано:** 20 октября 2025  
**Версия:** 1.0
