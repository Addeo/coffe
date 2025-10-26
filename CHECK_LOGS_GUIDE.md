# 📊 Как Проверить Логи Production Backend

## 🚀 Быстрый способ

Просто запустите скрипт:

```bash
./check-production-logs.sh
```

И выберите нужную опцию из меню.

---

## 📝 Варианты проверки логов

### 1. Просмотр последних строк логов

**Через скрипт:**

```bash
./check-production-logs.sh
# Выберите опцию 1, 2 или 3
```

**Вручную через SSH:**

```bash
# Последние 50 строк
ssh root@192.144.12.102 "cd /root/coffe/backend && tail -n 50 server.log"

# Последние 100 строк
ssh root@192.144.12.102 "cd /root/coffe/backend && tail -n 100 server.log"

# Последние 200 строк
ssh root@192.144.12.102 "cd /root/coffe/backend && tail -n 200 server.log"
```

### 2. Отслеживание логов в реальном времени

**Через скрипт:**

```bash
./check-production-logs.sh
# Выберите опцию 4
```

**Вручную:**

```bash
ssh root@192.144.12.102 "cd /root/coffe/backend && tail -f server.log"
# Нажмите Ctrl+C для выхода
```

### 3. Поиск ошибок

**Через скрипт:**

```bash
./check-production-logs.sh
# Выберите опцию 5
```

**Вручную:**

```bash
ssh root@192.144.12.102 "cd /root/coffe/backend && grep -i error server.log | tail -20"
```

### 4. Поиск логов создания заказов

**Через скрипт:**

```bash
./check-production-logs.sh
# Выберите опцию 6
```

**Вручную:**

```bash
ssh root@192.144.12.102 "cd /root/coffe/backend && tail -n 500 server.log | grep -E '📝|🔨|📎|Order|order' | tail -50"
```

### 5. Проверка статуса PM2

**Через скрипт:**

```bash
./check-production-logs.sh
# Выберите опцию 7
```

**Вручную:**

```bash
ssh root@192.144.12.102 "pm2 status"
ssh root@192.144.12.102 "pm2 logs coffee-backend --lines 50"
```

---

## 🔍 Что искать в логах

### Успешное создание заказа

Ищите последовательность сообщений:

```
📝 [OrdersController] Creating order: {...}
🔨 [OrdersService] Starting order creation: {...}
✅ [OrdersService] User found: ...
✅ [OrdersService] Organization found: ...
🏗️ [OrdersService] Creating order entity...
✅ [OrdersService] Order saved with ID: ...
✅ [OrdersService] Files attached successfully
📝 [OrdersService] Logging order creation activity...
📤 [OrdersService] Returning order to controller...
```

### Ошибки при создании заказа

Ищите:

- `❌` - ошибки
- `Error:` - сообщения об ошибках
- Stack trace после ошибки

Примеры:

```
❌ [OrdersService] User not found: 1
❌ [OrdersService] Organization not found: 1
❌ [OrdersController] Error creating order: ...
```

### Проблемы с файлами

Ищите:

```
📎 [OrdersService] Attaching files: [...]
❌ File not found
```

---

## 🎯 Диагностика проблем

### Проблема: Заказ не создается

**Шаги:**

1. Проверьте логи на наличие ошибок:

   ```bash
   ./check-production-logs.sh
   # Выберите опцию 5 (Search for errors)
   ```

2. Попробуйте создать заказ и сразу посмотрите логи:

   ```bash
   # В одном терминале - отслеживание логов
   ./check-production-logs.sh
   # Выберите опцию 4 (Follow logs)

   # В другом терминале или браузере - создайте заказ
   ```

3. Проверьте, что backend запущен:
   ```bash
   ./check-production-logs.sh
   # Выберите опцию 7 (Check PM2 status)
   ```

### Проблема: Файлы не прикрепляются

**Ищите в логах:**

```
📎 [OrdersService] Attaching files: [...]
✅ [OrdersService] Files attached successfully
```

Если нет этих сообщений - файлы не передаются.

---

## 🔧 Полезные команды

### Посмотреть размер лог-файла

```bash
ssh root@192.144.12.102 "ls -lh /root/coffe/backend/server.log"
```

### Очистить логи (ОСТОРОЖНО!)

```bash
ssh root@192.144.12.102 "cd /root/coffe/backend && > server.log"
```

### Поиск по конкретному тексту

```bash
ssh root@192.144.12.102 "cd /root/coffe/backend && grep 'конкретный_текст' server.log"
```

### Фильтрация по времени

```bash
# Логи за последний час
ssh root@192.144.12.102 "cd /root/coffe/backend && tail -n 1000 server.log | tail -n 100"
```

---

## 🎨 Примеры использования

### Пример 1: Создание заказа с подробными логами

**В терминале 1 (logs):**

```bash
./check-production-logs.sh
# Выберите 4 - Follow logs
```

**В терминале 2 (web-интерфейс):**

- Откройте http://192.144.12.102:4000
- Создайте заказ

**Вы увидите в логах:**

```
📝 [OrdersController] Creating order: { userId: 1, ... }
🔨 [OrdersService] Starting order creation: { userId: 1, ... }
✅ [OrdersService] User found: admin@coffee.com
✅ [OrdersService] Organization found: Some Org
🏗️ [OrdersService] Creating order entity...
✅ [OrdersService] Order saved with ID: 123
✅ [OrdersService] Files attached successfully
📤 [OrdersService] Returning order to controller...
```

### Пример 2: Диагностика ошибки

Если заказ не создается, выполните:

```bash
./check-production-logs.sh
# Выберите 5 - Search for errors
```

Вы увидите ошибки с stack trace, например:

```
❌ [OrdersController] Error creating order: ValidationError: ...
Error details: {
  message: '...',
  stack: '...',
  name: '...'
}
```

---

## 📌 Важно

1. **Логи увеличиваются** - периодически очищайте `server.log` если он слишком большой
2. **SSH доступ** - убедитесь, что у вас есть SSH доступ к серверу
3. **PM2** - если используется PM2, логи могут быть в `pm2 logs`, а не в `server.log`

---

## 🚨 Частые проблемы и решения

### Backend не отвечает

```bash
./check-production-logs.sh
# Выберите 7 - Check PM2 status
# Если процесс не запущен, выберите 8 - Restart backend
```

### Нет логов в server.log

```bash
ssh root@192.144.12.102 "pm2 logs coffee-backend"
# Логи могут быть в PM2, а не в файле
```

### Слишком много логов

```bash
ssh root@192.144.12.102 "cd /root/coffe/backend && wc -l server.log"
# Если > 10000 строк, очистите логи
ssh root@192.144.12.102 "cd /root/coffe/backend && > server.log"
```
