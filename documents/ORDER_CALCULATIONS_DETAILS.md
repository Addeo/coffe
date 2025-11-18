# Детальные расчёты в заказах (Orders)

## Обзор

Каждый заказ хранит полную детализацию всех расчётов для прозрачности и аудита.

## Поля расчётов в Order

### Основные данные о работе

```typescript
regularHours: number; // Обычные часы работы (ч)
overtimeHours: number; // Часы переработки (ч)
carUsageAmount: number; // Доплата за использование машины (₽)
```

### Ставки (для аудита)

```typescript
engineerBaseRate: number; // Базовая ставка инженера (₽/ч)
engineerOvertimeRate: number; // Ставка переработки инженера (₽/ч)
organizationBaseRate: number; // Базовая ставка организации (₽/ч)
organizationOvertimeMultiplier: number; // Коэффициент переработки организации
```

### Детальная разбивка оплаты инженеру

```typescript
regularPayment: number; // Оплата за обычные часы = regularHours × engineerBaseRate
overtimePayment: number; // Оплата за переработку = overtimeHours × engineerOvertimeRate
calculatedAmount: number; // ИТОГО инженеру = regularPayment + overtimePayment
```

### Детальная разбивка оплаты от организации

```typescript
organizationRegularPayment: number; // За обычные часы = regularHours × organizationBaseRate
organizationOvertimePayment: number; // За переработку = overtimeHours × organizationBaseRate × organizationOvertimeMultiplier
organizationPayment: number; // ИТОГО от организации = organizationRegularPayment + organizationOvertimePayment
```

### Финансовый результат

```typescript
profit: number; // Прибыль = organizationPayment - calculatedAmount
```

## Пример расчёта

### Исходные данные

- **Инженер:** Иванов И.И.
- **Организация:** ООО "Тест"
- **Обычные часы:** 8 ч
- **Переработка:** 2 ч
- **Доплата за машину:** 500 ₽

### Ставки инженера

- **Базовая ставка:** 700 ₽/ч
- **Ставка переработки:** 1050 ₽/ч (1.5×)

### Ставки организации

- **Базовая ставка:** 900 ₽/ч
- **Коэффициент переработки:** 1.5

### Расчёт оплаты инженеру

```
regularPayment = 8 ч × 700 ₽/ч = 5,600 ₽
overtimePayment = 2 ч × 1,050 ₽/ч = 2,100 ₽
calculatedAmount = 5,600 + 2,100 = 7,700 ₽
+ carUsageAmount = 500 ₽
ИТОГО к выплате инженеру: 8,200 ₽
```

### Расчёт оплаты от организации

```
organizationRegularPayment = 8 ч × 900 ₽/ч = 7,200 ₽
organizationOvertimePayment = 2 ч × 900 ₽/ч × 1.5 = 2,700 ₽
organizationPayment = 7,200 + 2,700 = 9,900 ₽
+ carUsageAmount = 500 ₽
ИТОГО от организации: 10,400 ₽
```

### Финансовый результат

```
profit = organizationPayment - calculatedAmount = 9,900 - 7,700 = 2,200 ₽
+ carUsageAmount (транзитом) = 500 ₽
Чистая прибыль: 2,200 ₽
Общий доход: 10,400 ₽
```

## Автоматический расчёт

При обновлении заказа с полями `regularHours` и/или `overtimeHours`, backend **автоматически**:

1. Загружает ставки инженера (индивидуальные или базовые)
2. Загружает ставки организации
3. Рассчитывает все поля детальной разбивки
4. Сохраняет результаты в Order

### Пример запроса

```http
PATCH /api/orders/123
Authorization: Bearer <token>
Content-Type: application/json

{
  "regularHours": 8,
  "overtimeHours": 2,
  "carUsageAmount": 500,
  "workNotes": "Работа выполнена в срок",
  "status": "completed"
}
```

### Автоматически будут рассчитаны и сохранены

```json
{
  "engineerBaseRate": 700,
  "engineerOvertimeRate": 1050,
  "organizationBaseRate": 900,
  "organizationOvertimeMultiplier": 1.5,
  "regularPayment": 5600,
  "overtimePayment": 2100,
  "calculatedAmount": 7700,
  "organizationRegularPayment": 7200,
  "organizationOvertimePayment": 2700,
  "organizationPayment": 9900,
  "profit": 2200
}
```

## Использование в статистике

Все статистические отчёты используют эти поля для расчёта:

### Для инженеров

```sql
SELECT
  SUM(calculatedAmount + carUsageAmount) as totalEarnings,
  SUM(regularHours + overtimeHours) as totalHours,
  COUNT(*) as completedOrders
FROM orders
WHERE assignedEngineerId = ?
  AND status = 'completed'
  AND completionDate BETWEEN ? AND ?
```

### Для администраторов (прибыль)

```sql
SELECT
  assignedEngineerId,
  SUM(calculatedAmount + carUsageAmount) as engineerEarnings,
  SUM(organizationPayment + carUsageAmount) as organizationPayments,
  SUM(profit) as totalProfit
FROM orders
WHERE status = 'completed'
  AND completionDate BETWEEN ? AND ?
GROUP BY assignedEngineerId
```

## Аудит и отчётность

### Преимущества детальной разбивки:

✅ **Прозрачность** - все расчёты хранятся и доступны для проверки
✅ **Аудит** - можно проверить правильность любого расчёта
✅ **Отчётность** - детальные отчёты для бухгалтерии
✅ **Аналитика** - анализ прибыльности по разным параметрам

### Пример отчёта для бухгалтерии

```
Заказ #123
Дата: 08.10.2025
Инженер: Иванов И.И.
Организация: ООО "Тест"

ДЕТАЛИЗАЦИЯ РАСЧЁТА:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Часы работы:
  Обычные:     8 ч × 700 ₽/ч = 5,600 ₽
  Переработка: 2 ч × 1,050 ₽/ч = 2,100 ₽
  ────────────────────────────────────
  Итого к выплате инженеру:   7,700 ₽

Доплаты:
  Машина:                       500 ₽
  ────────────────────────────────────
  ВСЕГО инженеру:             8,200 ₽

Оплата от организации:
  Обычные:     8 ч × 900 ₽/ч = 7,200 ₽
  Переработка: 2 ч × 1,350 ₽/ч = 2,700 ₽
  Машина:                       500 ₽
  ────────────────────────────────────
  ВСЕГО от организации:      10,400 ₽

ФИНАНСОВЫЙ РЕЗУЛЬТАТ:
  Доход:                     10,400 ₽
  Расход (инженеру):          8,200 ₽
  ────────────────────────────────────
  ПРИБЫЛЬ:                    2,200 ₽
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```
