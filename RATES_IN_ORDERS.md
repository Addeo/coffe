# Добавление Ставок в Order для Аудита

## ✅ Что Добавлено


### Order Entity - Новые Поля:

```typescript
// Детальная разбивка расчётов (для аудита и отчётности)
engineerBaseRate: number; // базовая ставка инженера (₽/час)
engineerOvertimeRate: number; // ставка переработки инженера (₽/час)
organizationBaseRate: number; // базовая ставка организации (₽/час)
organizationOvertimeMultiplier: number; // коэффициент переработки организации
```

### Теперь При Завершении Работы Сохраняются:

1. **Часы работы:**
   - `regularHours` - обычные часы
   - `overtimeHours` - часы переработки

2. **Суммы оплат:**
   - `calculatedAmount` - оплата инженеру
   - `carUsageAmount` - доплата за машину
   - `organizationPayment` - платёж от организации

3. **✨ СТАВКИ (новое!):**
   - `engineerBaseRate` - базовая ставка инженера
   - `engineerOvertimeRate` - ставка за переработку инженера
   - `organizationBaseRate` - базовая ставка организации
   - `organizationOvertimeMultiplier` - коэффициент организации

## 🎯 Зачем Это Нужно?

### Проблема:

Если ставки изменятся в будущем, мы не сможем понять, по каким ставкам был рассчитан старый заказ.

### Решение:

**Сохраняем snapshot ставок** в момент завершения работы!

### Пример:

```json
{
  "id": 6,
  "regularHours": 8,
  "overtimeHours": 2,
  "calculatedAmount": 5600,

  // ✨ Теперь также:
  "engineerBaseRate": 600, // ₽/час обычная работа
  "engineerOvertimeRate": 900, // ₽/час переработка
  "organizationBaseRate": 800, // ₽/час от организации
  "organizationOvertimeMultiplier": 1.5 // коэффициент
}
```

**Расчёт проверяется:**

- 8 часов × 600₽ = 4,800₽ (обычные)
- 2 часа × 900₽ = 1,800₽ (переработка)
- **Итого:** 6,600₽ ❌ Но в базе 5,600₽

Видно, что что-то не так! Можно разобраться.

## 📝 API Response

**Теперь GET /api/orders/:id возвращает:**

```json
{
  "id": 6,
  "regularHours": 0,
  "overtimeHours": 31,
  "calculatedAmount": 21600,
  "carUsageAmount": 4000,
  "organizationPayment": 30150,

  // ✨ Ставки для аудита:
  "engineerBaseRate": 600,
  "engineerOvertimeRate": 900,
  "organizationBaseRate": 800,
  "organizationOvertimeMultiplier": 1.5
}
```

## 🔧 Изменения в Коде

### 1. Order Entity

**File:** `backend/src/entities/order.entity.ts`

Добавлены поля (уже были):

- `engineerBaseRate`
- `engineerOvertimeRate`
- `organizationBaseRate`
- `organizationOvertimeMultiplier`

### 2. Complete Work Method

**File:** `backend/src/modules/orders/orders.service.ts`

```typescript
async completeWork(orderId, engineerId, workData) {
  // ...расчёты...

  // 🔥 СОХРАНЯЕМ СТАВКИ
  order.engineerBaseRate = rates.baseRate;
  order.engineerOvertimeRate = rates.overtimeRate;
  order.organizationBaseRate = organization.baseRate;
  order.organizationOvertimeMultiplier = organization.overtimeMultiplier;

  await this.ordersRepository.save(order);
}
```

### 3. API Endpoint

**File:** `backend/src/modules/orders/orders.controller.ts`

```typescript
@Post(':id/complete-work')
@Roles(UserRole.USER)
async completeWork(@Param('id') orderId, @Body() workData, @Request() req) {
  return this.ordersService.completeWork(orderId, req.user.id, workData);
}
```

## 🚀 Как Использовать

### Frontend (уже настроен):

```typescript
// POST /api/orders/6/complete-work
{
  regularHours: 8,
  overtimeHours: 2,
  carPayment: 1000,
  notes: "Работа выполнена"
}

// Response:
{
  id: 6,
  regularHours: 8,
  overtimeHours: 2,
  calculatedAmount: 6600,

  // ✨ Автоматически сохранены:
  engineerBaseRate: 600,
  engineerOvertimeRate: 900,
  organizationBaseRate: 800,
  organizationOvertimeMultiplier: 1.5
}
```

## 📊 SQL для Проверки

```sql
SELECT
  id,
  title,
  regularHours,
  overtimeHours,
  calculatedAmount,
  engineerBaseRate,
  engineerOvertimeRate,
  -- Проверка расчёта:
  (regularHours * engineerBaseRate + overtimeHours * engineerOvertimeRate) as calculated_check
FROM orders
WHERE status = 'completed'
  AND engineerBaseRate IS NOT NULL;
```

## ✅ Преимущества

1. **Аудит** - всегда можно проверить расчёты
2. **История** - видно изменение ставок во времени
3. **Отчётность** - детальная разбивка для бухгалтерии
4. **Прозрачность** - понятно, откуда взялись суммы

## 🎉 Результат

**Теперь в каждом заказе сохраняется полная информация о расчётах!**

Можно в любой момент:

- Проверить, правильно ли посчитана оплата
- Увидеть, какие ставки действовали на момент работы
- Построить отчёт по изменению ставок
- Найти ошибки в расчётах

**Полная прозрачность и аудит!** ✨
