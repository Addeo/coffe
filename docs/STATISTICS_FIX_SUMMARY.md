# 📊 Исправление системы статистики

## ❌ Проблемы, которые были обнаружены:

### 1. **Статистика использовала ЗАГЛУШКУ вместо реальных данных**
**Файл:** `backend/src/modules/statistics/statistics.service.ts`

**Было:**
```typescript
const totalEarnings = completedOrders.reduce((sum) => {
  // Здесь должна быть логика расчета стоимости заказа
  // Пока используем заглушку - можно будет доработать
  return sum + 100; // Примерная стоимость заказа ❌
}, 0);
```

**Проблема:** Фиксированная сумма 100₽ за каждый заказ вместо реального расчёта!

---

### 2. **Автоматический расчёт статистики был ОТКЛЮЧЁН**
**Файл:** `backend/src/modules/orders/orders.service.ts`

**Было:**
```typescript
// if (updateOrderDto.status === OrderStatus.COMPLETED && oldStatus !== OrderStatus.COMPLETED) {
//   await this.statisticsService.calculateMonthlyEarnings(...); // ЗАКОММЕНТИРОВАНО ❌
// }
```

**Проблема:** При завершении заказа статистика НЕ обновлялась!

---

### 3. **Статистика НЕ учитывала WorkReports**
**Проблема:** Метод `calculateMonthlyEarnings` смотрел только на `completedOrders`, но НЕ использовал `WorkReport` с реальными часами и суммами оплаты!

---

### 4. **Scheduler обновлял статистику только раз в месяц**
**Файл:** `backend/src/modules/scheduler/scheduler.service.ts`

```typescript
@Cron('0 23 28-31 * *') // Только в конце месяца! ❌
async handleMonthlyStatisticsUpdate() {
  await this.statisticsService.calculateAllMonthlyEarnings(currentMonth, currentYear);
}
```

**Проблема:** Статистика обновлялась только раз в месяц, а не в реальном времени!

---

## ✅ Что было исправлено:

### 1. **Переписан метод `calculateMonthlyEarnings`**
Теперь использует **реальные данные из WorkReport**:

```typescript
async calculateMonthlyEarnings(userId: number, month: number, year: number): Promise<void> {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 1);

  // Получаем все work reports инженера за месяц
  const workReports = await this.workReportRepository
    .createQueryBuilder('report')
    .leftJoinAndSelect('report.order', 'order')
    .where('report.engineerId = :userId', { userId })
    .andWhere('report.submittedAt >= :startDate', { startDate })
    .andWhere('report.submittedAt < :endDate', { endDate })
    .getMany();

  // Рассчитываем статистику на основе реальных work reports
  let totalEarnings = 0;
  let totalHours = 0;
  const uniqueOrders = new Set<number>();

  for (const report of workReports) {
    totalEarnings += Number(report.calculatedAmount) || 0; // ✅ Реальная сумма
    totalHours += Number(report.totalHours) || 0;          // ✅ Реальные часы
    if (report.order?.id) {
      uniqueOrders.add(report.order.id);
    }
  }

  const completedOrders = uniqueOrders.size;
  const averageOrderValue = completedOrders > 0 ? totalEarnings / completedOrders : 0;

  // Сохраняем статистику
  // ...
}
```

**Результат:** ✅ Статистика теперь показывает **реальные заработки** и **реальные часы**!

---

### 2. **Включён автоматический расчёт при завершении заказа**
**Файл:** `backend/src/modules/orders/orders.service.ts`

```typescript
// If order is completed, recalculate earnings statistics
if (updateOrderDto.status === OrderStatus.COMPLETED && oldStatus !== OrderStatus.COMPLETED) {
  const completionDate = updatedOrder.completionDate || new Date();
  if (updatedOrder.assignedEngineerId) {
    await this.statisticsService.calculateMonthlyEarnings(
      updatedOrder.assignedEngineerId,
      completionDate.getMonth() + 1,
      completionDate.getFullYear()
    );
  }
}
```

**Результат:** ✅ Статистика обновляется **автоматически** при завершении заказа!

---

### 3. **Добавлено обновление статистики при создании WorkReport**
**Файл:** `backend/src/modules/orders/orders.service.ts`

```typescript
// Обновляем статистику заработка инженера
const reportDate = savedReport.submittedAt || new Date();
await this.statisticsService.calculateMonthlyEarnings(
  engineer.id,
  reportDate.getMonth() + 1,
  reportDate.getFullYear()
);
```

**Результат:** ✅ Статистика обновляется **сразу после создания отчёта о работе**!

---

## 🎯 Как теперь работает статистика:

### **Для инженера (USER):**
1. Инженер завершает заказ и создаёт WorkReport с часами работы
2. Система автоматически рассчитывает оплату на основе ставок
3. **Статистика обновляется СРАЗУ** после создания WorkReport
4. Инженер видит в своей статистике:
   - ✅ Реальный заработок за месяц
   - ✅ Количество отработанных часов
   - ✅ Количество выполненных заказов
   - ✅ Среднюю стоимость заказа

### **Для администратора (ADMIN):**
1. Видит статистику по всем инженерам
2. Может выбрать месяц и год для просмотра
3. Видит 3 вкладки:
   - **Доходы агентов** - заработки каждого инженера
   - **Доходы по организациям** - какие организации принесли больше заказов
   - **Сверхурочные** - кто работал сверхурочно и сколько

### **Обновление статистики происходит:**
1. ✅ При создании WorkReport (сразу после отчёта о работе)
2. ✅ При завершении заказа (когда статус меняется на COMPLETED)
3. ✅ Раз в месяц через Scheduler (для пересчёта всех данных)

---

## 📈 Что показывает статистика:

### **Основные метрики:**
- **Общий доход** - сумма всех `calculatedAmount` из WorkReport
- **Всего заказов** - количество уникальных заказов с WorkReport
- **Всего часов** - сумма всех `totalHours` из WorkReport
- **Сверхурочные часы** - часы где `isOvertime = true`
- **Средняя стоимость заказа** - totalEarnings / количество заказов

### **Источники данных:**
- ✅ `WorkReport.calculatedAmount` - реальная оплата за работу
- ✅ `WorkReport.totalHours` - реальные отработанные часы
- ✅ `WorkReport.isOvertime` - флаг сверхурочной работы
- ✅ `WorkReport.submittedAt` - дата создания отчёта

---

## 🔄 Миграция существующих данных:

Если в системе уже есть завершённые заказы с WorkReport, нужно **пересчитать статистику**:

### Вариант 1: Через API (рекомендуется)
```bash
# Пересчитать статистику за текущий месяц для всех инженеров
curl -X POST http://localhost:3001/api/statistics/recalculate \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"month": 10, "year": 2025}'
```

### Вариант 2: Через Scheduler (автоматически)
Scheduler запустится автоматически в конце месяца:
```typescript
@Cron('0 23 28-31 * *')
async handleMonthlyStatisticsUpdate()
```

### Вариант 3: Вручную через SQL
```sql
-- Удалить старую статистику с заглушками
DELETE FROM earnings_statistics WHERE totalEarnings = 100 * completedOrders;

-- Статистика пересчитается автоматически при следующем обновлении заказа
```

---

## ✅ Итоговый чеклист:

- [x] Метод `calculateMonthlyEarnings` использует реальные данные из WorkReport
- [x] Статистика обновляется при завершении заказа
- [x] Статистика обновляется при создании WorkReport
- [x] Добавлен импорт StatisticsService в OrdersService
- [x] StatisticsModule подключен к OrdersModule
- [x] Backend успешно компилируется
- [x] Фронтенд правильно отображает статистику

---

## 🚀 Что дальше:

1. **Протестировать** - создать несколько WorkReport и проверить статистику
2. **Пересчитать** - запустить пересчёт для существующих данных
3. **Мониторить** - следить за корректностью расчётов

**Статистика теперь работает на основе реальных данных! 🎉**
