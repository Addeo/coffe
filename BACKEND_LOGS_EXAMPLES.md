# 📝 Примеры Логов Backend при Создании Заказа

## ✅ Успешное создание заказа

```log
📝 [OrdersController] Creating order: {
  userId: 1,
  userRole: 'admin',
  orderData: {
    title: 'Ремонт офиса',
    organizationId: 1,
    location: 'Москва, ул. Примерная, 10',
    hasFiles: true,
    filesCount: 2
  }
}

🔨 [OrdersService] Starting order creation: {
  userId: 1,
  organizationId: 1,
  title: 'Ремонт офиса',
  filesCount: 2
}

✅ [OrdersService] User found: admin@coffee.com
✅ [OrdersService] Organization found: ООО "Пример"
🏗️ [OrdersService] Creating order entity...
✅ [OrdersService] Order saved with ID: 123
📎 [OrdersService] Attaching files: ['uuid-1', 'uuid-2']
✅ [OrdersService] Files attached successfully
📝 [OrdersService] Logging order creation activity...
📤 [OrdersService] Returning order to controller...
```

## ❌ Ошибка: Пользователь не найден

```log
📝 [OrdersController] Creating order: {
  userId: 999,
  userRole: 'admin',
  orderData: {
    title: 'Тестовый заказ',
    organizationId: 1,
    location: 'Москва',
    hasFiles: false,
    filesCount: 0
  }
}

🔨 [OrdersService] Starting order creation: {
  userId: 999,
  organizationId: 1,
  title: 'Тестовый заказ',
  filesCount: 0
}

❌ [OrdersService] User not found: 999
❌ [OrdersController] Error creating order: NotFoundException: User not found
Error details: {
  message: 'User not found',
  stack: '...',
  name: 'NotFoundException'
}
```

## ❌ Ошибка: Организация не найдена

```log
📝 [OrdersController] Creating order: {
  userId: 1,
  userRole: 'admin',
  orderData: {
    title: 'Тестовый заказ',
    organizationId: 999,
    location: 'Москва',
    hasFiles: false,
    filesCount: 0
  }
}

🔨 [OrdersService] Starting order creation: {
  userId: 1,
  organizationId: 999,
  title: 'Тестовый заказ',
  filesCount: 0
}

✅ [OrdersService] User found: admin@coffee.com
❌ [OrdersService] Organization not found: 999
❌ [OrdersController] Error creating order: NotFoundException: Organization with ID 999 not found
Error details: {
  message: 'Organization with ID 999 not found',
  stack: '...',
  name: 'NotFoundException'
}
```

## ❌ Ошибка: Проблемы с файлами

```log
📝 [OrdersController] Creating order: {
  userId: 1,
  userRole: 'admin',
  orderData: {
    title: 'Заказ с файлами',
    organizationId: 1,
    location: 'Москва',
    hasFiles: true,
    filesCount: 2
  }
}

🔨 [OrdersService] Starting order creation: {
  userId: 1,
  organizationId: 1,
  title: 'Заказ с файлами',
  filesCount: 2
}

✅ [OrdersService] User found: admin@coffee.com
✅ [OrdersService] Organization found: ООО "Пример"
🏗️ [OrdersService] Creating order entity...
✅ [OrdersService] Order saved with ID: 124
📎 [OrdersService] Attaching files: ['invalid-uuid-1', 'invalid-uuid-2']
❌ [OrdersService] Error attaching files: Error: File not found
Error details: {
  message: 'File with ID invalid-uuid-1 not found',
  stack: '...',
  name: 'Error'
}
```

## ✅ Создание заказа без файлов

```log
📝 [OrdersController] Creating order: {
  userId: 1,
  userRole: 'admin',
  orderData: {
    title: 'Простой заказ',
    organizationId: 1,
    location: 'Москва',
    hasFiles: false,
    filesCount: 0
  }
}

🔨 [OrdersService] Starting order creation: {
  userId: 1,
  organizationId: 1,
  title: 'Простой заказ',
  filesCount: 0
}

✅ [OrdersService] User found: admin@coffee.com
✅ [OrdersService] Organization found: ООО "Пример"
🏗️ [OrdersService] Creating order entity...
✅ [OrdersService] Order saved with ID: 125
ℹ️ [OrdersService] No files to attach
📝 [OrdersService] Logging order creation activity...
📤 [OrdersService] Returning order to controller...
```

## 🔍 Как использовать

### 1. Запустите мониторинг логов
```bash
./check-production-logs.sh
# Выберите опцию 4 - Follow logs in real-time
```

### 2. Создайте заказ в UI
Откройте http://192.144.12.102:4000 и создайте заказ

### 3. Наблюдайте за логами
Вы увидите полный поток создания заказа в реальном времени

### 4. При возникновении ошибки
- Найдите строку с ❌
- Прочитайте message (сообщение об ошибке)
- Проверьте stack (трассировку стека)
- Скопируйте все логи для анализа

## 📌 Важные моменты

1. **Все логи имеют эмодзи** для быстрой визуальной идентификации:
   - 📝 - Controller
   - 🔨 - Service начало
   - ✅ - Успешная операция
   - ❌ - Ошибка
   - 📎 - Работа с файлами
   - ℹ️ - Информация

2. **Последовательность логов** показывает путь создания заказа:
   Controller → Service → Validation → Save → Attach Files → Return

3. **Ошибки логируются дважды**:
   - В месте возникновения (Service)
   - В Controller при перехвате

## 🎯 Типичные проблемы

### Заказ не создается
Проверьте:
- ✅ User found?
- ✅ Organization found?
- ❌ Какая ошибка в message?

### Файлы не прикрепляются
Проверьте:
- 📎 Attaching files?
- ✅ Files attached successfully?
- ❌ Error attaching files?

### Таймаут
Проверьте:
- Доходит ли до "Creating order entity"?
- На каком шаге зависает?
