# Пример расчёта статистики по завершённым заказам

## 📊 Исходные данные

### Организации

#### ООО "Альфа"
- Базовая ставка: **900 ₽/ч**
- Коэффициент переработки: **1.5**
- Переработка включена: **Да**

#### ООО "Бета"
- Базовая ставка: **800 ₽/ч**
- Коэффициент переработки: **1.5**
- Переработка включена: **Да**

#### ООО "Гамма"
- Базовая ставка: **1000 ₽/ч**
- Коэффициент переработки: **2.0**
- Переработка включена: **Да**

---

### Инженеры

#### Инженер #1: Иванов И.И.
**Базовые ставки:**
- Базовая ставка: **700 ₽/ч**
- Ставка переработки: **1050 ₽/ч** (1.5×)

**Индивидуальные ставки для ООО "Альфа":**
- Базовая ставка: **750 ₽/ч** (повышенная)
- Ставка переработки: **1125 ₽/ч** (1.5×)

---

#### Инженер #2: Петров П.П.
**Базовые ставки:**
- Базовая ставка: **650 ₽/ч**
- Ставка переработки: **975 ₽/ч** (1.5×)

**Индивидуальные ставки для ООО "Бета":**
- Базовая ставка: **700 ₽/ч** (повышенная)
- Ставка переработки: **1050 ₽/ч** (1.5×)

---

#### Инженер #3: Сидоров С.С.
**Базовые ставки:**
- Базовая ставка: **800 ₽/ч**
- Ставка переработки: **1200 ₽/ч** (1.5×)

*(Нет индивидуальных ставок)*

---

## 📝 Завершённые заказы за октябрь 2025

### Заказ #1
- **Организация:** ООО "Альфа"
- **Инженер:** Иванов И.И. (с индивидуальными ставками)
- **Дата:** 05.10.2025
- **Работа:**
  - Обычные часы: **8 ч**
  - Переработка: **2 ч**
  - Доплата за машину: **500 ₽**

#### Расчёт для инженера (индивидуальные ставки):
```
regularPayment = 8 ч × 750 ₽/ч = 6,000 ₽
overtimePayment = 2 ч × 1,125 ₽/ч = 2,250 ₽
calculatedAmount = 6,000 + 2,250 = 8,250 ₽
carUsageAmount = 500 ₽
ИТОГО инженеру: 8,750 ₽
```

#### Расчёт от организации:
```
organizationRegularPayment = 8 ч × 900 ₽/ч = 7,200 ₽
organizationOvertimePayment = 2 ч × 900 ₽/ч × 1.5 = 2,700 ₽
organizationPayment = 7,200 + 2,700 = 9,900 ₽
carUsageAmount = 500 ₽
ИТОГО от организации: 10,400 ₽
```

#### Прибыль:
```
profit = 9,900 - 8,250 = 1,650 ₽
```

#### Сохранённые данные в Order #1:
```json
{
  "id": 1,
  "organizationId": 1,
  "assignedEngineerId": 1,
  "status": "completed",
  "completionDate": "2025-10-05",
  "regularHours": 8,
  "overtimeHours": 2,
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
  "carUsageAmount": 500,
  "profit": 1650
}
```

---

### Заказ #2
- **Организация:** ООО "Бета"
- **Инженер:** Петров П.П. (с индивидуальными ставками)
- **Дата:** 10.10.2025
- **Работа:**
  - Обычные часы: **6 ч**
  - Переработка: **3 ч**
  - Доплата за машину: **400 ₽**

#### Расчёт для инженера (индивидуальные ставки):
```
regularPayment = 6 ч × 700 ₽/ч = 4,200 ₽
overtimePayment = 3 ч × 1,050 ₽/ч = 3,150 ₽
calculatedAmount = 4,200 + 3,150 = 7,350 ₽
carUsageAmount = 400 ₽
ИТОГО инженеру: 7,750 ₽
```

#### Расчёт от организации:
```
organizationRegularPayment = 6 ч × 800 ₽/ч = 4,800 ₽
organizationOvertimePayment = 3 ч × 800 ₽/ч × 1.5 = 3,600 ₽
organizationPayment = 4,800 + 3,600 = 8,400 ₽
carUsageAmount = 400 ₽
ИТОГО от организации: 8,800 ₽
```

#### Прибыль:
```
profit = 8,400 - 7,350 = 1,050 ₽
```

---

### Заказ #3
- **Организация:** ООО "Гамма"
- **Инженер:** Сидоров С.С. (базовые ставки)
- **Дата:** 15.10.2025
- **Работа:**
  - Обычные часы: **10 ч**
  - Переработка: **0 ч**
  - Доплата за машину: **600 ₽**

#### Расчёт для инженера (базовые ставки):
```
regularPayment = 10 ч × 800 ₽/ч = 8,000 ₽
overtimePayment = 0 ч × 1,200 ₽/ч = 0 ₽
calculatedAmount = 8,000 + 0 = 8,000 ₽
carUsageAmount = 600 ₽
ИТОГО инженеру: 8,600 ₽
```

#### Расчёт от организации:
```
organizationRegularPayment = 10 ч × 1,000 ₽/ч = 10,000 ₽
organizationOvertimePayment = 0 ч × 1,000 ₽/ч × 2.0 = 0 ₽
organizationPayment = 10,000 + 0 = 10,000 ₽
carUsageAmount = 600 ₽
ИТОГО от организации: 10,600 ₽
```

#### Прибыль:
```
profit = 10,000 - 8,000 = 2,000 ₽
```

---

### Заказ #4
- **Организация:** ООО "Альфа"
- **Инженер:** Иванов И.И. (с индивидуальными ставками)
- **Дата:** 20.10.2025
- **Работа:**
  - Обычные часы: **7 ч**
  - Переработка: **4 ч**
  - Доплата за машину: **450 ₽**

#### Расчёт для инженера (индивидуальные ставки):
```
regularPayment = 7 ч × 750 ₽/ч = 5,250 ₽
overtimePayment = 4 ч × 1,125 ₽/ч = 4,500 ₽
calculatedAmount = 5,250 + 4,500 = 9,750 ₽
carUsageAmount = 450 ₽
ИТОГО инженеру: 10,200 ₽
```

#### Расчёт от организации:
```
organizationRegularPayment = 7 ч × 900 ₽/ч = 6,300 ₽
organizationOvertimePayment = 4 ч × 900 ₽/ч × 1.5 = 5,400 ₽
organizationPayment = 6,300 + 5,400 = 11,700 ₽
carUsageAmount = 450 ₽
ИТОГО от организации: 12,150 ₽
```

#### Прибыль:
```
profit = 11,700 - 9,750 = 1,950 ₽
```

---

### Заказ #5
- **Организация:** ООО "Бета"
- **Инженер:** Сидоров С.С. (базовые ставки)
- **Дата:** 25.10.2025
- **Работа:**
  - Обычные часы: **9 ч**
  - Переработка: **1 ч**
  - Доплата за машину: **350 ₽**

#### Расчёт для инженера (базовые ставки):
```
regularPayment = 9 ч × 800 ₽/ч = 7,200 ₽
overtimePayment = 1 ч × 1,200 ₽/ч = 1,200 ₽
calculatedAmount = 7,200 + 1,200 = 8,400 ₽
carUsageAmount = 350 ₽
ИТОГО инженеру: 8,750 ₽
```

#### Расчёт от организации:
```
organizationRegularPayment = 9 ч × 800 ₽/ч = 7,200 ₽
organizationOvertimePayment = 1 ч × 800 ₽/ч × 1.5 = 1,200 ₽
organizationPayment = 7,200 + 1,200 = 8,400 ₽
carUsageAmount = 350 ₽
ИТОГО от организации: 8,750 ₽
```

#### Прибыль:
```
profit = 8,400 - 8,400 = 0 ₽ (нулевая прибыль!)
```

---

## 📈 РАСЧЁТ СТАТИСТИКИ ЗА ОКТЯБРЬ 2025

### SQL-запрос для инженера (userId = 1, Иванов И.И.):

```sql
SELECT 
  SUM(calculatedAmount + carUsageAmount) as totalEarnings,
  SUM(regularHours + overtimeHours) as totalHours,
  SUM(regularHours) as regularHours,
  SUM(overtimeHours) as overtimeHours,
  COUNT(*) as completedOrders
FROM orders
WHERE assignedEngineerId = 1
  AND status = 'completed'
  AND completionDate >= '2025-10-01'
  AND completionDate < '2025-11-01'
```

#### Результат для Иванова И.И.:
```json
{
  "totalEarnings": 18950,  // (8,250+500) + (9,750+450) = 18,950
  "totalHours": 21,        // (8+2) + (7+4) = 21
  "regularHours": 15,      // 8 + 7 = 15
  "overtimeHours": 6,      // 2 + 4 = 6
  "completedOrders": 2     // Заказы #1 и #4
}
```

---

### SQL-запрос для инженера (userId = 2, Петров П.П.):

```sql
SELECT 
  SUM(calculatedAmount + carUsageAmount) as totalEarnings,
  SUM(regularHours + overtimeHours) as totalHours,
  COUNT(*) as completedOrders
FROM orders
WHERE assignedEngineerId = 2
  AND status = 'completed'
  AND completionDate >= '2025-10-01'
  AND completionDate < '2025-11-01'
```

#### Результат для Петрова П.П.:
```json
{
  "totalEarnings": 7750,   // 7,350 + 400 = 7,750
  "totalHours": 9,         // 6 + 3 = 9
  "regularHours": 6,
  "overtimeHours": 3,
  "completedOrders": 1     // Заказ #2
}
```

---

### SQL-запрос для инженера (userId = 3, Сидоров С.С.):

```sql
SELECT 
  SUM(calculatedAmount + carUsageAmount) as totalEarnings,
  SUM(regularHours + overtimeHours) as totalHours,
  COUNT(*) as completedOrders
FROM orders
WHERE assignedEngineerId = 3
  AND status = 'completed'
  AND completionDate >= '2025-10-01'
  AND completionDate < '2025-11-01'
```

#### Результат для Сидорова С.С.:
```json
{
  "totalEarnings": 17350,  // (8,000+600) + (8,400+350) = 17,350
  "totalHours": 20,        // (10+0) + (9+1) = 20
  "regularHours": 19,
  "overtimeHours": 1,
  "completedOrders": 2     // Заказы #3 и #5
}
```

---

## 📊 СТАТИСТИКА ДЛЯ АДМИНИСТРАТОРА

### SQL-запрос для админа:

```sql
SELECT 
  engineer.userId as engineerId,
  user.firstName,
  user.lastName,
  COUNT(order.id) as completedOrders,
  SUM(order.regularHours + order.overtimeHours) as totalHours,
  SUM(order.calculatedAmount + order.carUsageAmount) as engineerEarnings,
  SUM(order.organizationPayment + order.carUsageAmount) as organizationPayments,
  SUM(order.profit) as totalProfit
FROM orders
JOIN engineer ON order.assignedEngineerId = engineer.id
JOIN user ON engineer.userId = user.id
WHERE order.status = 'completed'
  AND order.completionDate >= '2025-10-01'
  AND order.completionDate < '2025-11-01'
GROUP BY engineer.userId
ORDER BY engineerEarnings DESC
```

### Результат (таблица для админа):

| Инженер | Заказов | Часов | Инженеру | От организаций | Прибыль | Маржа |
|---------|---------|-------|----------|----------------|---------|-------|
| **Иванов И.И.** | 2 | 21 ч | **18,950 ₽** | **22,300 ₽** | **3,600 ₽** | 16.1% |
| **Сидоров С.С.** | 2 | 20 ч | **17,350 ₽** | **19,350 ₽** | **2,000 ₽** | 10.3% |
| **Петров П.П.** | 1 | 9 ч | **7,750 ₽** | **8,800 ₽** | **1,050 ₽** | 11.9% |
| **ИТОГО:** | **5** | **50 ч** | **44,050 ₽** | **50,450 ₽** | **6,650 ₽** | **13.2%** |

### Детализация по Иванову И.И.:
```
Заказ #1 (ООО "Альфа"):
  Инженеру:      8,750 ₽ (8ч × 750₽ + 2ч × 1,125₽ + 500₽)
  От организации: 10,400 ₽ (8ч × 900₽ + 2ч × 1,350₽ + 500₽)
  Прибыль:       1,650 ₽

Заказ #4 (ООО "Альфа"):
  Инженеру:      10,200 ₽ (7ч × 750₽ + 4ч × 1,125₽ + 450₽)
  От организации: 12,150 ₽ (7ч × 900₽ + 4ч × 1,350₽ + 450₽)
  Прибыль:       1,950 ₽

ИТОГО Иванов:
  Заработал:     18,950 ₽
  Принёс:        22,300 ₽
  Прибыль:       3,600 ₽ (16.1% маржа)
```

---

## 📋 СВОДНАЯ ТАБЛИЦА ПО ОРГАНИЗАЦИЯМ

### Для бухгалтерии:

| Организация | Заказов | Часов | Выплачено инженерам | Получено от организации | Прибыль |
|------------|---------|-------|---------------------|------------------------|---------|
| **ООО "Альфа"** | 2 | 21 ч | 18,950 ₽ | 22,300 ₽ | **3,600 ₽** |
| **ООО "Бета"** | 2 | 15 ч | 16,500 ₽ | 17,550 ₽ | **1,050 ₽** |
| **ООО "Гамма"** | 1 | 10 ч | 8,600 ₽ | 10,600 ₽ | **2,000 ₽** |
| **ИТОГО:** | **5** | **46 ч** | **44,050 ₽** | **50,450 ₽** | **6,650 ₽** |

---

## 🎯 ВЫВОДЫ

### Прибыльность инженеров:
1. **Иванов И.И.** - самый прибыльный (3,600 ₽, маржа 16.1%)
2. **Сидоров С.С.** - средняя прибыль (2,000 ₽, маржа 10.3%)
3. **Петров П.П.** - низкая прибыль (1,050 ₽, маржа 11.9%)

### Прибыльность организаций:
1. **ООО "Альфа"** - самая прибыльная (3,600 ₽)
2. **ООО "Гамма"** - хорошая прибыль (2,000 ₽)
3. **ООО "Бета"** - низкая прибыль (1,050 ₽)

### Важные наблюдения:
- ✅ Индивидуальные ставки повышают прибыль (Иванов у Альфа)
- ⚠️ Базовые ставки могут давать нулевую прибыль (Сидоров у Бета, заказ #5)
- 📈 Средняя маржа по всем заказам: **13.2%**
- 💡 Переработка увеличивает прибыль при правильных коэффициентах

---

## 🔍 КАК ЭТО РАБОТАЕТ В КОДЕ

### Backend: StatisticsService.getAdminEngineerStatistics()
```typescript
const engineerStats = await this.orderRepository
  .createQueryBuilder('order')
  .select('engineer.userId', 'engineerId')
  .addSelect('user.firstName', 'firstName')
  .addSelect('user.lastName', 'lastName')
  .addSelect('COUNT(order.id)', 'completedOrders')
  .addSelect('SUM(order.regularHours + order.overtimeHours)', 'totalHours')
  .addSelect('SUM(order.calculatedAmount)', 'engineerEarnings')
  .addSelect('SUM(order.organizationPayment)', 'organizationPayments')
  .addSelect('SUM(order.carUsageAmount)', 'carUsageAmount')
  .leftJoin('order.assignedEngineer', 'engineer')
  .leftJoin('engineer.user', 'user')
  .where('order.completionDate >= :startDate', { startDate })
  .andWhere('order.completionDate < :endDate', { endDate })
  .andWhere('order.status = :status', { status: 'completed' })
  .groupBy('engineer.userId')
  .getRawMany();

// Расчёт прибыли и маржи
const profit = organizationPayments - engineerEarnings;
const profitMargin = (profit / (organizationPayments + carUsageAmount)) * 100;
```

### Frontend: Отображение для админа
```html
<!-- Таблица инженеров -->
<table>
  <tr *ngFor="let engineer of engineers">
    <td>{{ engineer.name }}</td>
    <td>{{ engineer.completedOrders }}</td>
    <td>{{ engineer.totalHours }} ч</td>
    <td>{{ formatAmount(engineer.engineerEarnings) }}</td>
    <td>{{ formatAmount(engineer.organizationPayments) }}</td>
    <td class="profit">{{ formatAmount(engineer.profit) }}</td>
    <td>{{ engineer.profitMargin.toFixed(1) }}%</td>
  </tr>
</table>
```

---

## ✅ ИТОГО

**Вся статистика считается НАПРЯМУЮ из таблицы `orders`:**
- ✅ Нет промежуточных таблиц
- ✅ Нет кэширования
- ✅ Всегда актуальные данные
- ✅ Полная прозрачность расчётов
- ✅ Детальная разбивка для аудита

