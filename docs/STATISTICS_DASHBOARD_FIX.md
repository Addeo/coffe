# Исправление статистики и дашборда

## Обнаруженные проблемы

### 1. Отчёты о работе сохранялись, но статистика не обновлялась
**Причина:** В методах `OrdersService.createWorkReport()` и `OrdersService.update()` использовался `engineer.id` вместо `engineer.userId` при вызове `statisticsService.calculateMonthlyEarnings()`.

**Исправление:**
- В `createWorkReport()`: изменено с `engineer.id` на `engineer.userId`
- В `update()`: добавлена загрузка Engineer entity чтобы получить `userId` из `assignedEngineerId`

### 2. Endpoint `/api/statistics/monthly` возвращал 500 Internal Server Error
**Причина:** Ошибка в методе `getOvertimeStatisticsData()` - попытка получить `firstName` и `lastName` из `Engineer` entity, но эти поля находятся в связанной `User` entity.

**Исправление:**
- Добавлен join с `engineer.user`
- Изменено получение полей: `engineer.firstName` → `user.firstName`, `engineer.lastName` → `user.lastName`

### 3. Endpoint `/api/statistics/monthly` использовал неправильное поле для расчёта доходов организаций
**Причина:** Запрос пытался использовать `order.totalAmount`, которого нет в entity `Order`.

**Исправление:**
- Изменен источник данных с `Order` на `WorkReport`
- Используется `report.calculatedAmount` для расчёта доходов
- Подсчёт уникальных заказов через `COUNT(DISTINCT order.id)`

### 4. Отсутствовал endpoint `/api/statistics/engineer/detailed`
**Причина:** Frontend запрашивал endpoint, которого не существовало на backend.

**Исправление:**
- Добавлен метод `getEngineerDetailedStats()` в `StatisticsService`
- Добавлен endpoint `@Get('engineer/detailed')` в `StatisticsController`
- Метод возвращает детальную статистику инженера с данными:
  - totalHours, regularHours, overtimeHours
  - totalEarnings, baseEarnings, overtimeEarnings
  - completedOrders, averageHoursPerOrder
  - previousMonthEarnings, previousMonthHours
  - earningsGrowth, hoursGrowth

## Текущее состояние

### Backend
✅ Все endpoints статистики работают:
- `/api/statistics/earnings` - история заработка пользователя
- `/api/statistics/earnings/comparison` - сравнение текущего и прошлого месяца
- `/api/statistics/earnings/rank` - ранг пользователя по заработку
- `/api/statistics/top-earners` - топ заработавших
- `/api/statistics/total-earnings` - общий заработок за период
- `/api/statistics/engineer/detailed` - детальная статистика инженера
- `/api/statistics/monthly` - месячная статистика для админов

✅ Статистика автоматически обновляется:
- При создании отчёта о работе (Work Report)
- При изменении статуса заказа на COMPLETED

✅ Обработка ошибок:
- Если статистика не обновилась, это не блокирует сохранение отчёта
- `/api/statistics/monthly` возвращает пустую статистику вместо ошибки, если данных нет

### Frontend
✅ Dashboard отображает:
- Статистику заказов (для всех ролей)
- Статистику пользователей (для admin/manager)
- Статистику заработка (для всех ролей)
- Детальную статистику инженера (для role USER)

✅ Страница Statistics отображает:
- Месячную статистику с разбивкой по инженерам, организациям и переработкам
- Возможность выбора месяца и года

## Измененные файлы

### Backend
1. `backend/src/modules/statistics/statistics.service.ts`
   - Добавлен метод `getEngineerDetailedStats()`
   - Исправлен `getOvertimeStatisticsData()`
   - Исправлен `getOrganizationEarningsData()`
   - Добавлена обработка ошибок в `getMonthlyStatistics()`

2. `backend/src/modules/statistics/statistics.controller.ts`
   - Добавлен endpoint `@Get('engineer/detailed')`

3. `backend/src/modules/orders/orders.service.ts`
   - Исправлен `createWorkReport()` - используется `engineer.userId`
   - Исправлен `update()` - загрузка Engineer для получения `userId`
   - Добавлена обработка ошибок при обновлении статистики

### Frontend
Без изменений - фронтенд уже был корректно реализован и ожидал эти endpoints.

## Проверка работоспособности

### 1. Проверить создание отчёта о работе
```bash
curl -X POST 'http://localhost:3001/api/orders/:orderId/work-reports' \
  -H 'Authorization: Bearer <token>' \
  -H 'Content-Type: application/json' \
  -d '{
    "regularHours": 8,
    "overtimeHours": 2,
    "carPayment": 500,
    "distanceKm": 50,
    "territoryType": "ZONE_1",
    "notes": "Работа выполнена"
  }'
```

### 2. Проверить месячную статистику (admin)
```bash
curl 'http://localhost:3001/api/statistics/monthly?year=2025&month=10' \
  -H 'Authorization: Bearer <admin_token>'
```

### 3. Проверить детальную статистику инженера
```bash
curl 'http://localhost:3001/api/statistics/engineer/detailed?year=2025&month=10' \
  -H 'Authorization: Bearer <engineer_token>'
```

### 4. Проверить dashboard
Открыть `http://localhost:4202/` и войти как:
- Admin - увидит полную статистику
- Engineer (USER) - увидит свою детальную статистику

## Известные ограничения

1. **Пустая таблица `earnings_statistics`**: Статистика создаётся только при сохранении Work Report или завершении заказа. До этого таблица пуста.

2. **Organization name = "Unknown"**: Если organization не загружается из-за проблем с foreign key, будет отображаться "Unknown". Это исправляется SQL-миграцией данных (аналогично исправлению engineer_organization_rates).

3. **Данные за прошлые месяцы**: Если отчёты создавались до внедрения автоматического обновления статистики, нужно запустить пересчёт вручную через endpoint `/api/calculations/calculate-monthly/:month/:year`.

## Рекомендации

1. Проверить consistency данных в таблицах:
   - `work_reports` - должны быть связаны с `engineers` и `orders`
   - `engineers` - должны иметь корректные `user_id`
   - `orders` - должны иметь корректные `organization_id`

2. При необходимости запустить миграцию данных:
```sql
-- Проверить наличие orphaned records
SELECT COUNT(*) FROM work_reports WHERE engineer_id IS NULL;
SELECT COUNT(*) FROM orders WHERE organization_id IS NULL;

-- Если нужно, исправить
UPDATE work_reports SET engineer_id = engineerId WHERE engineer_id IS NULL;
UPDATE orders SET organization_id = organizationId WHERE organization_id IS NULL;
```

3. Для production окружения рекомендуется:
   - Настроить логирование ошибок в отдельный файл
   - Добавить мониторинг для отслеживания ошибок обновления статистики
   - Периодически запускать пересчёт статистики через cron job

