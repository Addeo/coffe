# 🚀 Деплой исправлений на Production сервер

## Проблема

Создание заказов не работает на продакшене из-за дублирующихся DTO в orders.service.ts

## Что было исправлено

### 1. Удалены дубликаты DTO

- Удалены локальные определения `CreateOrderDto` и `UpdateOrderDto` из `orders.service.ts`
- Добавлены правильные импорты из `shared/dtos/order.dto`

### 2. Исправлен тип в shared DTO

- В `shared/dtos/order.dto.ts` исправлен тип поля `source`: `OrderStatus` → `OrderSource`

## Файлы изменены

- `backend/src/modules/orders/orders.service.ts`
- `shared/dtos/order.dto.ts`

## Деплой на продакшен

### Вариант 1: Через SSH (рекомендуется)

```bash
# 1. На локальной машине - собрать backend
cd backend
npm run build

# 2. Залогиниться на продакшен сервер
ssh user@192.144.12.102

# 3. На сервере - перейти в директорию проекта
cd /path/to/coffee-admin/backend

# 4. Остановить текущий backend
pm2 stop coffee-backend
# или
pkill -f "node.*dist/main"

# 5. Сделать backup текущей версии
cp -r dist dist.backup.$(date +%Y%m%d_%H%M%S)
cp -r node_modules node_modules.backup.$(date +%Y%m%d_%H%M%S)

# 6. Скопировать новые файлы (выберите один из вариантов)

# Вариант A: Через rsync (с локальной машины)
# В новом терминале локально:
rsync -avz --exclude 'node_modules' --exclude 'dist' \
  ./backend/ user@192.144.12.102:/path/to/coffee-admin/backend/

# Вариант B: Через SCP файлы напрямую
scp backend/src/modules/orders/orders.service.js \
    user@192.144.12.102:/path/to/coffee-admin/backend/dist/modules/orders/

# 7. На сервере - пересобрать
cd /path/to/coffee-admin/backend
npm run build

# 8. Запустить backend
pm2 restart coffee-backend
# или
npm run start:prod

# 9. Проверить логи
pm2 logs coffee-backend
# или
tail -f server.log
```

### Вариант 2: Через Git (если используете Git)

```bash
# 1. Коммит изменений локально
git add .
git commit -m "Fix: Remove duplicate DTOs in orders.service.ts"
git push

# 2. На продакшен сервере
ssh user@192.144.12.102
cd /path/to/coffee-admin
git pull origin main

# 3. Пересобрать backend
cd backend
npm run build
pm2 restart coffee-backend
```

### Вариант 3: Через Docker (если используете)

```bash
# 1. Пересобрать образ
docker-compose -f docker-compose.prod.yml build backend

# 2. Перезапустить контейнеры
docker-compose -f docker-compose.prod.yml up -d

# 3. Проверить логи
docker-compose -f docker-compose.prod.yml logs -f backend
```

## Проверка после деплоя

```bash
# 1. Проверить, что backend запущен
pm2 status
# или
curl http://localhost:3001/api/orders/test

# 2. Проверить логи на ошибки
pm2 logs coffee-backend --lines 50

# 3. Попробовать создать заказ через UI
# Откройте http://192.144.12.102:4000
# Создайте тестовый заказ

# 4. Проверить логи в реальном времени
pm2 logs coffee-backend --lines 100
```

## Откат (если что-то пошло не так)

```bash
# На сервере
cd /path/to/coffee-admin/backend

# Восстановить backup
rm -rf dist
mv dist.backup.YYYYMMDD_HHMMSS dist

# Перезапустить
pm2 restart coffee-backend
```

## Важные файлы для копирования

Обязательно обновите на продакшене:

```
backend/src/modules/orders/orders.service.ts
backend/dist/modules/orders/orders.service.js
shared/dtos/order.dto.ts
backend/dist/shared/dtos/order.dto.d.ts
```

## После деплоя

1. ✅ Проверьте, что создание заказа работает
2. ✅ Проверьте логи на ошибки
3. ✅ Удалите backup файлы после успешного тестирования

## Контакты

Если возникнут проблемы:

1. Проверьте логи: `pm2 logs coffee-backend`
2. Проверьте, что порт 3001 доступен
3. Проверьте, что база данных работает
4. Проверьте права доступа к файлам
