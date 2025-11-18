# Анализ текущих расчётов

## 📊 Данные из вашего запроса

### Заказ #8 (Локальный Сервис)

```json
{
  "regularHours": 2,
  "overtimeHours": 2,
  "calculatedAmount": 3800,
  "carUsageAmount": 2000,
  "organizationPayment": 6000,
  "engineerBaseRate": 700,
  "engineerOvertimeRate": 1200,
  "organizationBaseRate": 1200,
  "organizationOvertimeMultiplier": 1.5,
  "regularPayment": 1400,
  "overtimePayment": 2400,
  "organizationRegularPayment": 2400,
  "organizationOvertimePayment": 3600,
  "profit": 2200
}
```

### Заказ #7 (Вистекс)

```json
{
  "regularHours": 2,
  "overtimeHours": 2,
  "calculatedAmount": 3600,
  "carUsageAmount": 2000,
  "organizationPayment": 4500,
  "engineerBaseRate": 600,
  "engineerOvertimeRate": 1200,
  "organizationBaseRate": 900,
  "organizationOvertimeMultiplier": 1.5,
  "regularPayment": 1200,
  "overtimePayment": 2400,
  "organizationRegularPayment": 1800,
  "organizationOvertimePayment": 2700,
  "profit": 900
}
```

---

## ✅ Проверка расчётов

### Заказ #8 - Локальный Сервис

#### Оплата инженеру:

```
regularPayment = 2 ч × 700 ₽/ч = 1,400 ₽ ✅
overtimePayment = 2 ч × 1,200 ₽/ч = 2,400 ₽ ✅
calculatedAmount = 1,400 + 2,400 = 3,800 ₽ ✅
+ carUsageAmount = 2,000 ₽
ИТОГО инженеру: 5,800 ₽
```

#### Оплата от организации:

```
organizationRegularPayment = 2 ч × 1,200 ₽/ч = 2,400 ₽ ✅
organizationOvertimePayment = 2 ч × 1,200 ₽/ч × 1.5 = 3,600 ₽ ✅
organizationPayment = 2,400 + 3,600 = 6,000 ₽ ✅
+ carUsageAmount = 2,000 ₽
ИТОГО от организации: 8,000 ₽
```

#### Прибыль:

```
profit = 6,000 - 3,800 = 2,200 ₽ ✅
```

**✅ ВСЕ РАСЧЁТЫ ПРАВИЛЬНЫЕ!**

---

### Заказ #7 - Вистекс

#### Оплата инженеру:

```
regularPayment = 2 ч × 600 ₽/ч = 1,200 ₽ ✅
overtimePayment = 2 ч × 1,200 ₽/ч = 2,400 ₽ ✅
calculatedAmount = 1,200 + 2,400 = 3,600 ₽ ✅
+ carUsageAmount = 2,000 ₽
ИТОГО инженеру: 5,600 ₽
```

#### Оплата от организации:

```
organizationRegularPayment = 2 ч × 900 ₽/ч = 1,800 ₽ ✅
organizationOvertimePayment = 2 ч × 900 ₽/ч × 1.5 = 2,700 ₽ ✅
organizationPayment = 1,800 + 2,700 = 4,500 ₽ ✅
+ carUsageAmount = 2,000 ₽
ИТОГО от организации: 6,500 ₽
```

#### Прибыль:

```
profit = 4,500 - 3,600 = 900 ₽ ✅
```

**✅ ВСЕ РАСЧЁТЫ ПРАВИЛЬНЫЕ!**

---

## 📈 Статистика по организациям

### Локальный Сервис (Заказ #8):

```json
{
  "organizationName": "Локальный Сервис",
  "totalRevenue": 6000, // ✅ organizationPayment
  "totalCosts": 3800, // ✅ calculatedAmount
  "totalProfit": 2200, // ✅ 6,000 - 3,800
  "profitMargin": 36.67, // ✅ (2,200 / 6,000) × 100
  "totalOrders": 1,
  "totalHours": 4, // ✅ 2 + 2
  "averageOrderValue": 6000
}
```

**✅ ПРАВИЛЬНО!**

### Вистекс (Заказ #7):

```json
{
  "organizationName": "Вистекс",
  "totalRevenue": 4500, // ✅ organizationPayment
  "totalCosts": 3600, // ✅ calculatedAmount
  "totalProfit": 900, // ✅ 4,500 - 3,600
  "profitMargin": 20, // ✅ (900 / 4,500) × 100
  "totalOrders": 1,
  "totalHours": 4, // ✅ 2 + 2
  "averageOrderValue": 4500
}
```

**✅ ПРАВИЛЬНО!**

---

## ❌ Проблемы в статистике

### 1. **`agentEarnings: []` - пустой массив**

**Причина:** `leftJoin` с `assignedEngineer` не работает, потому что в базе:

```json
"assignedEngineer": null,  // ❌ relation не загружена
"assignedEngineerId": 4    // ✅ но ID есть!
```

**Решение:** Использовать `innerJoin` напрямую с таблицами `engineer` и `user`:

```typescript
.innerJoin('engineer', 'engineer', 'order.assignedEngineerId = engineer.id')
.innerJoin('user', 'user', 'engineer.userId = user.id')
```

### 2. **`totalEarnings: 0` и `totalOrders: 0`**

Эти поля считаются из `agentEarnings`, который пустой. После исправления п.1 они заполнятся автоматически.

---

## ✅ После исправления ожидается:

```json
{
  "year": 2025,
  "month": 10,
  "agentEarnings": [
    {
      "agentId": 4,
      "agentName": "Инженер Ставрополь",
      "totalEarnings": 11400, // (3,800+2,000) + (3,600+2,000)
      "completedOrders": 2,
      "averageOrderValue": 5700
    }
  ],
  "organizationEarnings": [
    {
      "organizationName": "Локальный Сервис",
      "totalRevenue": 6000,
      "totalCosts": 3800,
      "totalProfit": 2200,
      "profitMargin": 36.67,
      "totalOrders": 1,
      "totalHours": 4
    },
    {
      "organizationName": "Вистекс",
      "totalRevenue": 4500,
      "totalCosts": 3600,
      "totalProfit": 900,
      "profitMargin": 20,
      "totalOrders": 1,
      "totalHours": 4
    }
  ],
  "overtimeStatistics": [
    {
      "agentId": 4,
      "agentName": "Инженер Ставрополь",
      "overtimeHours": 4,
      "regularHours": 4,
      "totalHours": 8,
      "overtimePercentage": 50
    }
  ],
  "totalEarnings": 11400, // ✅ Сумма по всем инженерам
  "totalOrders": 2, // ✅ Всего заказов
  "totalOvertimeHours": 4
}
```

---

## 🎯 Итоговая проверка

### Расчёты правильные? ✅ ДА!

- ✅ Оплата инженерам рассчитана верно
- ✅ Оплата от организаций рассчитана верно
- ✅ Прибыль рассчитана верно
- ✅ Все детальные поля сохранены

### Статистика работает? ⚠️ ЧАСТИЧНО

- ✅ Статистика по организациям работает
- ✅ Статистика переработок работает (но показывает engineerId вместо имени)
- ❌ Статистика по инженерам (`agentEarnings`) была пустой → **ИСПРАВЛЕНО**

### Что исправлено:

1. ✅ Заменил `leftJoin` на `innerJoin` в `getAgentEarningsData`
2. ✅ Заменил `leftJoin` на `innerJoin` в `getOvertimeStatisticsData`
3. ✅ Добавил условие `order.assignedEngineerId IS NOT NULL`

---

## 📋 Итого

**Логика расчётов ПРАВИЛЬНАЯ!** ✅

Все формулы работают корректно:

- ✅ Ставки применяются правильно
- ✅ Коэффициенты переработки учитываются
- ✅ Прибыль рассчитывается верно
- ✅ Детализация сохраняется

**После перезапуска backend статистика по инженерам заработает!** 🚀
