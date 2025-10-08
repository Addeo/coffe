# Work Reports - Роль в Системе

## 🎯 TL;DR

**`work_reports` = Audit Trail (История событий)**  
**`Order` = Aggregate Root (Итоговый контракт)**

## 📊 Архитектура

```
┌─────────────────────────────────────────────────────────┐
│  Order #6: "тестовый заказ"                            │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                          │
│  📝 AGGREGATE DATA (Single Source of Truth):            │
│  ├── regularHours: 0h                                   │
│  ├── overtimeHours: 31h                                 │
│  ├── calculatedAmount: 21,600₽                          │
│  ├── carUsageAmount: 4,000₽                             │
│  ├── organizationPayment: 30,150₽                       │
│  └── status: completed                                  │
│                                                          │
│  📜 WORK REPORTS HISTORY (Audit Trail):                 │
│  ├── WorkReport #4                                      │
│  │   ├── Created: 08.10.2025 09:36:39                  │
│  │   ├── Hours: 4h (overtime)                          │
│  │   ├── Payment: 3,600₽ + 1,000₽ car                 │
│  │   ├── Photo: [link]                                 │
│  │   └── Notes: "Работа выполнена"                     │
│  │                                                      │
│  ├── WorkReport #5                                      │
│  │   ├── Created: 08.10.2025 09:36:50                  │
│  │   ├── Hours: 23h (overtime)                         │
│  │   ├── Payment: 14,400₽ + 2,000₽ car                │
│  │   ├── Photo: [link]                                 │
│  │   └── Notes: "Дополнительные работы"                │
│  │                                                      │
│  └── WorkReport #6                                      │
│      ├── Created: 08.10.2025 10:29:48                  │
│      ├── Hours: 4h (overtime)                          │
│      ├── Payment: 3,600₽ + 1,000₽ car                 │
│      ├── Photo: [link]                                 │
│      └── Notes: "Финальная проверка"                   │
│                                                         │
│  ✅ Total = SUM of all work reports                     │
└─────────────────────────────────────────────────────────┘
```

## 🔍 Зачем Нужны Work Reports?

### 1. **История Выполнения (Audit Trail)**

Показывает **КОГДА, КТО, СКОЛЬКО** работал:

```
2025-10-08 09:36 → Инженер добавил 4h
2025-10-08 09:36 → Инженер добавил 23h
2025-10-08 10:29 → Инженер добавил 4h
════════════════════════════════════════
ИТОГО в Order: 31h
```

### 2. **Детализация Для Бухгалтерии**

```sql
-- Что заплатили инженеру:
SELECT SUM(calculatedAmount + carUsageAmount) FROM work_reports WHERE orderId = 6
→ 25,600₽

-- По каким визитам:
WorkReport #4: 3,600₽ + 1,000₽
WorkReport #5: 14,400₽ + 2,000₽
WorkReport #6: 3,600₽ + 1,000₽
```

### 3. **Документы с Фотографиями**

Каждый work_report содержит:

- 📸 **Фото акта** выполненных работ
- 📝 **Заметки** инженера
- 📍 **Локация** (distanceKm, territoryType)
- ⏰ **Время** начала/окончания

### 4. **UI/UX - Отображение Истории**

На фронтенде в табе **"Отчет о работе"**:

```html
<mat-card *ngFor="let report of order.workReports">
  <h4>Отчет #{{ report.id }}</h4>
  <p>Создан: {{ report.submittedAt }}</p>
  <p>Часов: {{ report.totalHours }}</p>
  <img [src]="report.photoUrl" />
  <p>{{ report.notes }}</p>
</mat-card>
```

### 5. **Возможность Исправлений**

Если инженер ошибся:

- ❌ Нельзя изменить Order напрямую
- ✅ Можно добавить корректирующий work_report
- 📊 Order пересчитывается автоматически

## 📐 Разделение Ответственности

### Order (Aggregate Root)

**Отвечает за:**

- ✅ Итоговые цифры (сколько всего часов, оплат)
- ✅ Статус заказа (waiting → completed)
- ✅ Бизнес-логику (валидация, переходы статусов)
- ✅ Статистику (используется для reports/dashboards)

**НЕ хранит:**

- ❌ Историю изменений
- ❌ Фото актов
- ❌ Детали каждого визита

### WorkReport (Event Log)

**Отвечает за:**

- ✅ Историю событий (audit trail)
- ✅ Детализацию каждого визита
- ✅ Документы (фото, заметки)
- ✅ Временные метки

**НЕ используется для:**

- ❌ Статистики (используется Order)
- ❌ Расчёта зарплат (используется Order)
- ❌ Бизнес-логики (используется Order)

## 🔄 Поток Данных

```
1. Инженер создаёт WorkReport
   POST /api/orders/:id/work-reports
   {
     regularHours: 4,
     overtimeHours: 0,
     carPayment: 1000,
     photoUrl: "...",
     notes: "..."
   }

2. Backend создаёт WorkReport
   ↓
   workReport = {
     id: 7,
     orderId: 6,
     totalHours: 4,
     calculatedAmount: 3600,
     carUsageAmount: 1000,
     submittedAt: now
   }

3. Backend АГРЕГИРУЕТ в Order
   ↓
   order.regularHours += 4
   order.calculatedAmount += 3600
   order.carUsageAmount += 1000
   ✅ order.save()

4. Статистика читает Order
   GET /api/statistics/monthly
   ↓
   SELECT SUM(regularHours), SUM(overtimeHours)
   FROM orders
   WHERE completionDate BETWEEN ... AND ...
```

## 🎯 Когда НЕ Нужны Work Reports?

Можно убрать `work_reports`, если:

- ❌ Не нужна история изменений
- ❌ Не нужны фото актов
- ❌ Инженер работает строго один раз
- ❌ Не нужна детализация для бухгалтерии

**НО:** В реальном бизнесе это **критично** для:

- 📊 Аудита
- 🏢 Бухгалтерии
- ⚖️ Юридических споров
- 📈 Анализа эффективности

## ✅ Итог

**`work_reports` остаются как:**

1. **Audit Trail** - история всех действий
2. **Event Log** - журнал событий
3. **Documentation** - документы с фото
4. **Accountability** - кто, когда, что делал

**`Order` становится:**

1. **Aggregate Root** - единственный источник истины для сумм
2. **Contract** - итоговый контракт между заказчиком и исполнителем
3. **Statistics Source** - источник данных для аналитики

**Это классический паттерн Event Sourcing:**

- Events (WorkReports) → Immutable history
- Aggregate (Order) → Current state

🎉 **Best of both worlds!**
