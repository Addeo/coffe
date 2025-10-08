# Changelog: Детальные расчёты в заказах

## 📊 Что добавлено

### Новые поля в Order Entity

#### 1. Ставки для аудита
- `engineerBaseRate` - базовая ставка инженера (₽/ч)
- `engineerOvertimeRate` - ставка переработки инженера (₽/ч)
- `organizationBaseRate` - базовая ставка организации (₽/ч)
- `organizationOvertimeMultiplier` - коэффициент переработки организации

#### 2. Детальная разбивка оплаты инженеру
- `regularPayment` - оплата за обычные часы
- `overtimePayment` - оплата за переработку
- `calculatedAmount` - итого к выплате инженеру

#### 3. Детальная разбивка оплаты от организации
- `organizationRegularPayment` - оплата за обычные часы от организации
- `organizationOvertimePayment` - оплата за переработку от организации
- `organizationPayment` - итого от организации

#### 4. Финансовый результат
- `profit` - прибыль (organizationPayment - calculatedAmount)

## 🔧 Изменения в логике

### OrdersService.update()
При обновлении заказа с полями `regularHours`/`overtimeHours` автоматически:
1. Загружаются ставки инженера (индивидуальные или базовые)
2. Загружаются ставки организации
3. Рассчитываются все поля детальной разбивки
4. Сохраняются в Order для аудита

### Логирование
Добавлено детальное логирование расчётов:
```javascript
console.log('💰 Auto-calculated payments with details:', {
  regularHours,
  overtimeHours,
  engineerRates: { base, overtime },
  organizationRates: { base, overtimeMultiplier },
  payments: {
    engineerRegular, engineerOvertime, engineerTotal,
    organizationRegular, organizationOvertime, organizationTotal,
    carUsage, profit
  }
});
```

## 📈 Использование в статистике

Все статистические отчёты теперь используют детализированные поля:

### Для инженеров
```sql
SUM(calculatedAmount + carUsageAmount) as totalEarnings
SUM(regularHours + overtimeHours) as totalHours
```

### Для администраторов
```sql
SUM(calculatedAmount + carUsageAmount) as engineerEarnings
SUM(organizationPayment + carUsageAmount) as organizationPayments
SUM(profit) as totalProfit
```

## 🎯 Преимущества

### 1. Прозрачность
- Все расчёты хранятся и доступны для проверки
- Можно увидеть, какие ставки использовались

### 2. Аудит
- Можно проверить правильность любого расчёта
- История изменений ставок сохраняется

### 3. Отчётность
- Детальные отчёты для бухгалтерии
- Разбивка по типам оплаты

### 4. Аналитика
- Анализ прибыльности по заказам
- Сравнение ставок организаций
- Оптимизация расценок

## 📝 Пример использования

### Создание/обновление заказа
```http
PATCH /api/orders/123
{
  "regularHours": 8,
  "overtimeHours": 2,
  "carUsageAmount": 500,
  "status": "completed"
}
```

### Автоматический результат
```json
{
  "regularHours": 8,
  "overtimeHours": 2,
  "carUsageAmount": 500,
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
  "profit": 2200,
  "status": "completed"
}
```

## 🔄 Миграция

### База данных
Новые поля добавлены в таблицу `orders`:
```sql
ALTER TABLE orders ADD COLUMN engineerBaseRate DECIMAL(10,2);
ALTER TABLE orders ADD COLUMN engineerOvertimeRate DECIMAL(10,2);
ALTER TABLE orders ADD COLUMN organizationBaseRate DECIMAL(10,2);
ALTER TABLE orders ADD COLUMN organizationOvertimeMultiplier DECIMAL(5,2);
ALTER TABLE orders ADD COLUMN regularPayment DECIMAL(10,2);
ALTER TABLE orders ADD COLUMN overtimePayment DECIMAL(10,2);
ALTER TABLE orders ADD COLUMN organizationRegularPayment DECIMAL(10,2);
ALTER TABLE orders ADD COLUMN organizationOvertimePayment DECIMAL(10,2);
ALTER TABLE orders ADD COLUMN profit DECIMAL(10,2);
```

### Существующие заказы
Для существующих завершённых заказов можно пересчитать детали:
```sql
-- Будет добавлено позже, если потребуется
```

## 📚 Документация

Подробная документация доступна в:
- `docs/ORDER_CALCULATIONS_DETAILS.md` - детальное описание расчётов

## ✅ Что дальше

### Frontend
Нужно обновить компонент редактирования заказа для отображения:
1. Детальной разбивки расчётов (для админов/менеджеров)
2. Итоговой суммы к выплате (для инженеров)
3. Прибыли (только для админов)

### Отчёты
Добавить новые отчёты:
1. Детализация расчётов по заказам
2. Анализ прибыльности по организациям
3. Сравнение фактических и плановых ставок

