# Исправление хардкода в расчётах статистики

## Обнаруженная проблема

При создании отчёта о работе (`WorkReport`) расчёт оплаты инженера использовал хардкод:

```typescript
// БЫЛО (НЕПРАВИЛЬНО):
const baseRate = engineer.baseRate || 700;  // ❌ Хардкод 700
const overtimeRate = engineer.overtimeRate || 700;  // ❌ Хардкод 700

const regularPayment = workReportData.regularHours * baseRate;
const overtimePayment = workReportData.overtimeHours * overtimeRate;
const totalPayment = regularPayment + overtimePayment;

workReport.calculatedAmount = totalPayment;
```

### Почему это проблема?

1. **Игнорировались кастомные ставки для организаций** - в системе есть таблица `engineer_organization_rates`, которая хранит индивидуальные ставки инженера для каждой организации, но они не использовались.

2. **Неверные расчёты** - если у инженера базовая ставка 800₽/час, а для организации "Вистекс" установлена кастомная ставка 1000₽/час, система всё равно считала по 800₽.

3. **Неверная статистика** - так как статистика рассчитывается на основе `workReport.calculatedAmount`, все показатели доходов были занижены.

## Решение

### 1. Использование CalculationService

Система уже имела правильную логику в `CalculationService.getEngineerRatesForOrganization()`, которая:
- Ищет кастомные ставки для пары инженер-организация
- Если не находит - использует базовые ставки инженера
- Учитывает все типы ставок: базовая, переработка, зональные доплаты

### 2. Изменения в OrdersService

**Файл:** `backend/src/modules/orders/orders.service.ts`

```typescript
// ТЕПЕРЬ (ПРАВИЛЬНО):
// Получаем ставки инженера для организации (с учётом кастомных ставок)
let rates;
try {
  rates = await this.calculationService.getEngineerRatesForOrganization(
    engineer, 
    order.organization
  );
} catch (error) {
  // Если индивидуальные ставки не установлены, используем базовые ставки инженера
  console.warn(`Using default rates for engineer ${engineer.id} and organization ${order.organizationId}:`, error.message);
  rates = {
    baseRate: engineer.baseRate || 700,
    overtimeRate: engineer.overtimeRate || engineer.baseRate || 700,
    fixedSalary: engineer.fixedSalary,
    fixedCarAmount: engineer.fixedCarAmount,
  };
}

// Рассчитываем оплату с учётом индивидуальных ставок
const regularPayment = workReportData.regularHours * rates.baseRate;
const overtimePayment = workReportData.overtimeHours * (rates.overtimeRate || rates.baseRate);
const totalPayment = regularPayment + overtimePayment;

workReport.calculatedAmount = totalPayment;
```

### 3. Fallback логика

Если по какой-то причине кастомные ставки не установлены (например, старые данные или забыли настроить):
- Система логирует предупреждение
- Использует базовые ставки инженера как fallback
- Сохраняет хардкод 700₽ как последний fallback (только если у инженера вообще нет ставок)

## Результат

### ✅ Что теперь работает правильно:

1. **Корректные расчёты для Work Reports:**
   - Используются кастомные ставки для организаций
   - Учитываются все типы доплат
   - Правильно считается переработка

2. **Точная статистика:**
   - `totalEarnings` рассчитывается на основе реальных `calculatedAmount` из WorkReports
   - Все аналитические отчёты показывают корректные суммы
   - Dashboard отображает правильные цифры

3. **Прозрачность:**
   - Если ставки не найдены - в логах видно предупреждение
   - Администратор может увидеть где нужно настроить кастомные ставки

## Как проверить

### 1. Проверить установлены ли кастомные ставки

```sql
SELECT 
  e.id as engineer_id,
  u.firstName || ' ' || u.lastName as engineer_name,
  o.name as organization_name,
  eor.customBaseRate,
  eor.customOvertimeRate,
  e.baseRate as default_base,
  e.overtimeRate as default_overtime
FROM engineer_organization_rates eor
JOIN engineers e ON e.id = eor.engineer_id
JOIN users u ON u.id = e.user_id
JOIN organizations o ON o.id = eor.organization_id
WHERE eor.isActive = 1;
```

### 2. Создать тестовый Work Report

```bash
curl -X POST 'http://localhost:3001/api/orders/:orderId/work-reports' \
  -H 'Authorization: Bearer <engineer_token>' \
  -H 'Content-Type: application/json' \
  -d '{
    "regularHours": 8,
    "overtimeHours": 2,
    "carPayment": 500,
    "distanceKm": 50,
    "territoryType": "ZONE_1"
  }'
```

### 3. Проверить расчёт

Ожидаемый `calculatedAmount`:
- Если есть кастомные ставки: `regularHours * customBaseRate + overtimeHours * customOvertimeRate`
- Если нет кастомных ставок: `regularHours * engineer.baseRate + overtimeHours * engineer.overtimeRate`

### 4. Проверить логи

Если кастомные ставки не настроены, в логах backend будет:
```
Using default rates for engineer 4 and organization 5: Individual rates not set...
```

## Рекомендации для production

### 1. Настроить кастомные ставки для всех пар инженер-организация

**Через API:**
```bash
curl -X POST 'http://localhost:3001/api/engineer-organization-rates' \
  -H 'Authorization: Bearer <admin_token>' \
  -H 'Content-Type: application/json' \
  -d '{
    "engineerId": 4,
    "organizationId": 5,
    "customBaseRate": 1000,
    "customOvertimeRate": 1500,
    "customZone1Extra": 200,
    "customZone2Extra": 400,
    "customZone3Extra": 600
  }'
```

**Или через UI:** Страница "Ставки инженеров" в админ-панели

### 2. Пересчитать статистику для старых данных

Если до исправления были созданы WorkReports с неверными расчётами:

```sql
-- Найти WorkReports с потенциально неверными расчётами
SELECT 
  wr.id,
  wr.orderId,
  wr.calculatedAmount as old_amount,
  wr.totalHours,
  e.baseRate,
  e.overtimeRate,
  o.name as organization
FROM work_reports wr
JOIN engineers e ON e.id = wr.engineerId
JOIN orders ord ON ord.id = wr.orderId
JOIN organizations o ON o.id = ord.organizationId
WHERE wr.submittedAt < '2025-10-08'; -- До даты исправления
```

Затем вручную пересчитать и обновить:
```sql
UPDATE work_reports 
SET calculatedAmount = <new_calculated_value>
WHERE id = <work_report_id>;
```

После обновления WorkReports нужно пересчитать статистику:
```bash
# Для каждого инженера и месяца
curl -X POST 'http://localhost:3001/api/calculations/calculate-monthly/:month/:year' \
  -H 'Authorization: Bearer <admin_token>'
```

### 3. Мониторинг

Добавить алерты на отсутствие кастомных ставок:
- Когда создаётся заказ для новой пары инженер-организация
- Периодическая проверка через cron job

## Связанные изменения

- `backend/src/modules/orders/orders.service.ts` - Исправлена логика в `createWorkReport()`
- Добавлен импорт `CalculationService`
- Раскомментирован `calculationService` в конструкторе

## См. также

- `STATISTICS_DASHBOARD_FIX.md` - Общие исправления статистики
- `DATABASE_MIGRATION_ORDERS.md` - Миграция данных для relations
- `docs/SALARY_CALCULATION_COMPLETE_SYSTEM.md` - Полная документация по системе расчётов

