# Как обновить заказ с данными о работе

## 🎯 Новая логика (упрощённая)

Теперь **все данные о работе передаются в одном запросе** при обновлении заказа.

---

## 📝 Пример запроса

### Инженер завершает работу:

```http
PATCH /api/orders/8
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "test 2",
  "description": "test",
  "organizationId": 9,
  "location": "stavropol",
  "plannedStartDate": "2025-10-08T21:00:00.000Z",
  "source": "manual",
  "status": "completed",
  "files": ["aea0b812-8ffc-4bd2-b031-32b689e5788e"],

  // ✨ НОВЫЕ ПОЛЯ - данные о работе:
  "regularHours": 8,
  "overtimeHours": 2,
  "carUsageAmount": 500,
  "workNotes": "Работа выполнена качественно"
}
```

---

## 🔄 Что происходит на backend:

### 1. Backend получает запрос

```typescript
updateOrderDto = {
  ...orderData,
  regularHours: 8,
  overtimeHours: 2,
  carUsageAmount: 500,
  workNotes: '...',
};
```

### 2. Backend автоматически рассчитывает:

```typescript
// Загружает ставки инженера (индивидуальные или базовые)
engineerBaseRate = 750 ₽/ч
engineerOvertimeRate = 1,125 ₽/ч

// Загружает ставки организации
organizationBaseRate = 900 ₽/ч
organizationOvertimeMultiplier = 1.5

// Рассчитывает оплату инженеру
regularPayment = 8 × 750 = 6,000 ₽
overtimePayment = 2 × 1,125 = 2,250 ₽
calculatedAmount = 6,000 + 2,250 = 8,250 ₽

// Рассчитывает оплату от организации
organizationRegularPayment = 8 × 900 = 7,200 ₽
organizationOvertimePayment = 2 × 900 × 1.5 = 2,700 ₽
organizationPayment = 7,200 + 2,700 = 9,900 ₽

// Рассчитывает прибыль
profit = 9,900 - 8,250 = 1,650 ₽
```

### 3. Backend сохраняет ВСЁ в Order:

```json
{
  "id": 8,
  "status": "completed",
  "regularHours": 8,
  "overtimeHours": 2,
  "carUsageAmount": 500,
  "workNotes": "...",
  "engineerBaseRate": 750,
  "engineerOvertimeRate": 1125,
  "organizationBaseRate": 900,
  "organizationOvertimeMultiplier": 1.5,
  "regularPayment": 6000,
  "overtimePayment": 2250,
  "calculatedAmount": 8250,
  "organizationRegularPayment": 7200,
  "organizationOvertimePayment": 2700,
  "organizationPayment": 9900,
  "profit": 1650
}
```

---

## 💻 Frontend (Angular)

### Форма работы (workReportForm):

```typescript
workReportForm = {
  regularHours: 8,
  overtimeHours: 2,
  carPayment: 500,
  distanceKm: 50,
  territoryType: 'urban',
  notes: 'Работа выполнена',
};
```

### Метод updateOrder():

```typescript
private async updateOrder() {
  const workReportValue = this.workReportForm.value;
  const hasWorkData = workReportValue.regularHours !== null;

  const orderData: UpdateOrderDto = {
    ...orderFormData,
    // Добавляем данные о работе
    regularHours: hasWorkData ? (workReportValue.regularHours || 0) : undefined,
    overtimeHours: hasWorkData ? (workReportValue.overtimeHours || 0) : undefined,
    carUsageAmount: hasWorkData ? (workReportValue.carPayment || 0) : undefined,
    workNotes: hasWorkData ? workReportValue.notes : undefined,
  };

  this.ordersService.updateOrder(this.orderId, orderData).subscribe(...);
}
```

---

## ✅ Преимущества новой логики:

### 1. Простота

- ❌ Было: 2 запроса (`PATCH /orders/:id` + `POST /orders/:id/complete-work`)
- ✅ Стало: 1 запрос (`PATCH /orders/:id` с данными о работе)

### 2. Атомарность

- ✅ Все данные обновляются одновременно
- ✅ Нет промежуточных состояний
- ✅ Нет рассинхронизации

### 3. Гибкость

- ✅ Можно обновить только часы работы
- ✅ Можно обновить только статус
- ✅ Можно обновить всё вместе

### 4. Автоматизация

- ✅ Backend сам рассчитывает все суммы
- ✅ Сохраняет детальную разбивку
- ✅ Логирует расчёты

---

## 🔍 Примеры использования

### Пример 1: Инженер завершает работу

```http
PATCH /api/orders/123
{
  "regularHours": 8,
  "overtimeHours": 0,
  "carUsageAmount": 0,
  "status": "completed"
}
```

### Пример 2: Инженер обновляет часы работы (не завершая)

```http
PATCH /api/orders/123
{
  "regularHours": 6,
  "overtimeHours": 2,
  "carUsageAmount": 500,
  "workNotes": "Переработка из-за сложности"
}
```

### Пример 3: Админ меняет статус (без данных о работе)

```http
PATCH /api/orders/123
{
  "status": "processing"
}
```

### Пример 4: Админ обновляет всё

```http
PATCH /api/orders/123
{
  "title": "Новое название",
  "organizationId": 5,
  "regularHours": 10,
  "overtimeHours": 3,
  "carUsageAmount": 600,
  "status": "completed"
}
```

---

## 🧪 Тестирование

### Проверка расчётов:

```bash
# 1. Обновить заказ с данными о работе
curl -X PATCH 'http://localhost:3001/api/orders/8' \
  -H 'Authorization: Bearer <token>' \
  -H 'Content-Type: application/json' \
  -d '{
    "regularHours": 8,
    "overtimeHours": 2,
    "carUsageAmount": 500,
    "status": "completed"
  }'

# 2. Проверить, что поля рассчитаны
curl 'http://localhost:3001/api/orders/8' \
  -H 'Authorization: Bearer <token>'

# Ожидается:
# - calculatedAmount: рассчитано
# - organizationPayment: рассчитано
# - profit: рассчитано
# - engineerBaseRate: сохранено
# - и т.д.
```

---

## 📊 Логи backend при обновлении:

```
🔄 UPDATE ORDER: {
  orderId: 8,
  hasWorkData: true
}

💰 Auto-calculated payments with details: {
  regularHours: 8,
  overtimeHours: 2,
  engineerRates: { base: 750, overtime: 1125 },
  organizationRates: { base: 900, overtimeMultiplier: 1.5 },
  payments: {
    engineerRegular: 6000,
    engineerOvertime: 2250,
    engineerTotal: 8250,
    organizationRegular: 7200,
    organizationOvertime: 2700,
    organizationTotal: 9900,
    carUsage: 500,
    profit: 1650
  }
}

💾 Order saved to database
```

---

## ✅ Итого

**Одна форма → Один запрос → Все расчёты автоматически!** 🚀

Инженер просто заполняет:

- ✏️ Обычные часы
- ✏️ Часы переработки
- ✏️ Доплата за машину
- ✏️ Примечания

И нажимает **"Обновить"** - всё остальное делает backend!
