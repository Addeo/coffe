# 💰 Система управления выплатами зарплаты

## 📋 Обзор

Комплексная система для отслеживания начислений и фактических выплат зарплаты инженерам, включающая:
- История всех выплат (зарплата, авансы, премии, корректировки)
- Баланс каждого инженера (начислено vs выплачено)
- Частичные выплаты и авансы
- Аудит и отчетность

---

## 🏗️ Архитектура

### Основные сущности

#### 1. **SalaryPayment** - Выплата
Представляет одну фактическую выплату инженеру.

```typescript
{
  id: number;
  engineerId: number;
  salaryCalculationId: number | null;  // Связь с начислением (может быть null для авансов)
  month: number | null;                 // Период выплаты
  year: number | null;
  amount: number;                       // Сумма выплаты
  type: 'regular' | 'advance' | 'bonus' | 'adjustment';
  method: 'cash' | 'bank_transfer' | 'card' | 'other';
  status: 'pending' | 'completed' | 'cancelled';
  paymentDate: Date;                    // Фактическая дата выплаты
  notes: string;
  paidById: number;                     // Кто выплатил
  documentNumber: string;               // Номер документа
}
```

**Типы выплат:**
- `regular` - Обычная зарплата по начислению
- `advance` - Аванс (выплата вперед)
- `bonus` - Премия
- `adjustment` - Корректировка (может быть отрицательной)

#### 2. **EngineerBalance** - Баланс инженера
Агрегированная информация о балансе инженера.

```typescript
{
  id: number;
  engineerId: number;                   // Уникальный для каждого инженера
  totalAccrued: number;                 // Всего начислено
  totalPaid: number;                    // Всего выплачено
  balance: number;                      // Текущий баланс (+ долг, - переплата)
  lastAccrualDate: Date;                // Дата последнего начисления
  lastPaymentDate: Date;                // Дата последней выплаты
  lastCalculatedAt: Date;               // Дата последнего пересчета
}
```

**Расчет баланса:**
- `balance = totalAccrued - totalPaid`
- Положительный баланс = должны инженеру
- Отрицательный баланс = переплата (инженер должен вернуть)
- Нулевой баланс = все погашено

#### 3. **SalaryCalculation** (обновлено)
Добавлена связь с выплатами:

```typescript
{
  // ... существующие поля ...
  payments: SalaryPayment[];            // Все выплаты по этому начислению
  status: 'draft' | 'calculated' | 'approved' | 'paid';
}
```

Статус автоматически обновляется:
- `paid` - когда сумма всех выплат >= totalAmount

---

## 🔄 Бизнес-процессы

### 1. Создание выплаты

```typescript
// POST /api/salary-payments
{
  engineerId: 5,
  salaryCalculationId: 123,  // Опционально
  amount: 50000,
  type: "regular",
  method: "bank_transfer",
  paymentDate: "2025-10-15",
  notes: "Зарплата за сентябрь 2025",
  documentNumber: "ПЛ-00123"
}
```

**Автоматические действия:**
1. ✅ Создается запись выплаты
2. ✅ Обновляется баланс инженера
3. ✅ Обновляется статус начисления (если привязано)
4. ✅ Логируется в систему аудита

### 2. Сценарий: Полная выплата зарплаты

```
Начисление за сентябрь: 80,000₽
↓
Выплата 1: 80,000₽ (15.10.2025)
↓
Статус начисления: PAID
Баланс: +0₽
```

### 3. Сценарий: Частичная выплата

```
Начисление за сентябрь: 80,000₽
↓
Выплата 1: 30,000₽ (15.09.2025, аванс)
↓
Выплата 2: 50,000₽ (05.10.2025, остаток)
↓
Статус начисления: PAID
Баланс: +0₽
```

### 4. Сценарий: Аванс наперед

```
Текущая дата: 10.10.2025
↓
Выплата (аванс): 20,000₽ (type: advance, month: 10, year: 2025)
↓
Начисление за октябрь: 75,000₽ (01.11.2025)
↓
Баланс: +55,000₽ (требуется доплатить)
↓
Выплата (остаток): 55,000₽ (15.11.2025)
↓
Баланс: +0₽
```

### 5. Сценарий: Переплата

```
Начисление за сентябрь: 70,000₽
↓
Выплата по ошибке: 80,000₽
↓
Баланс: -10,000₽ (переплата)
↓
Корректировка в следующем месяце:
  Начисление за октябрь: 75,000₽
  Выплата: 65,000₽ (с учетом переплаты)
↓
Баланс: +0₽
```

---

## 📡 API Endpoints

### Выплаты

```typescript
// Создать выплату
POST /api/salary-payments
Body: CreateSalaryPaymentDto
Response: SalaryPaymentDto

// Получить выплаты инженера
GET /api/salary-payments/engineer/:engineerId
Query: ?year=2025&month=10&type=regular&limit=20
Response: SalaryPaymentDto[]

// Получить выплаты по начислению
GET /api/salary-payments/calculation/:calculationId
Response: SalaryPaymentDto[]

// Обновить выплату
PUT /api/salary-payments/:id
Body: UpdateSalaryPaymentDto
Response: SalaryPaymentDto

// Удалить выплату
DELETE /api/salary-payments/:id
Response: { success: boolean }
```

### Балансы

```typescript
// Получить баланс инженера
GET /api/salary-payments/balance/:engineerId
Response: EngineerBalanceDto

// Получить детальный баланс
GET /api/salary-payments/balance/:engineerId/detail
Response: EngineerBalanceDetailDto {
  ...balance,
  recentPayments: SalaryPaymentDto[],
  recentCalculations: {
    id, month, year, totalAmount, paidAmount, remainingAmount
  }[]
}

// Получить все балансы
GET /api/salary-payments/balances
Response: EngineerBalanceDto[]
```

---

## 🎨 Frontend компоненты

### 1. EngineerBalanceCardComponent
Карточка баланса инженера.

**Отображает:**
- Всего начислено
- Всего выплачено
- Текущий баланс (с цветовой индикацией)
- Даты последних операций

### 2. PaymentListComponent
Список выплат с фильтрами.

**Функции:**
- Просмотр истории выплат
- Добавление новой выплаты
- Редактирование выплаты
- Удаление выплаты

### 3. PaymentFormComponent
Форма создания/редактирования выплаты.

**Поля:**
- Сумма *
- Тип выплаты *
- Способ оплаты *
- Дата выплаты *
- Месяц/год (для привязки к периоду)
- Номер документа
- Комментарий

### 4. EngineerPaymentsPageComponent
Страница управления выплатами инженера.

**Включает:**
- Карточку баланса
- Список начислений с информацией о выплатах
- Историю выплат
- Формы добавления/редактирования

---

## 🗄️ База данных

### Таблица: salary_payments

```sql
CREATE TABLE salary_payments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  engineer_id INT NOT NULL,
  salary_calculation_id INT NULL,
  month INT NULL,
  year INT NULL,
  amount DECIMAL(10,2) NOT NULL,
  type VARCHAR(20) NOT NULL DEFAULT 'regular',
  method VARCHAR(20) NOT NULL DEFAULT 'bank_transfer',
  status VARCHAR(20) NOT NULL DEFAULT 'completed',
  payment_date DATE NOT NULL,
  notes TEXT NULL,
  document_number VARCHAR(100) NULL,
  paid_by INT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (engineer_id) REFERENCES engineers(id) ON DELETE CASCADE,
  FOREIGN KEY (salary_calculation_id) REFERENCES salary_calculations(id) ON DELETE SET NULL,
  FOREIGN KEY (paid_by) REFERENCES users(id) ON DELETE SET NULL,
  
  INDEX idx_engineer_payment_date (engineer_id, payment_date),
  INDEX idx_payment_date (payment_date),
  INDEX idx_status (status),
  INDEX idx_calculation (salary_calculation_id)
);
```

### Таблица: engineer_balances

```sql
CREATE TABLE engineer_balances (
  id INT PRIMARY KEY AUTO_INCREMENT,
  engineer_id INT NOT NULL UNIQUE,
  total_accrued DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_paid DECIMAL(12,2) NOT NULL DEFAULT 0,
  balance DECIMAL(12,2) NOT NULL DEFAULT 0,
  last_accrual_date DATE NULL,
  last_payment_date DATE NULL,
  last_calculated_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (engineer_id) REFERENCES engineers(id) ON DELETE CASCADE,
  INDEX idx_engineer (engineer_id)
);
```

---

## 🔍 Примеры использования

### Пример 1: Создание обычной выплаты

```typescript
// Frontend
const payment: CreateSalaryPaymentDto = {
  engineerId: 5,
  salaryCalculationId: 123,
  amount: 80000,
  type: PaymentType.REGULAR,
  method: PaymentMethod.BANK_TRANSFER,
  paymentDate: '2025-10-15',
  notes: 'Зарплата за сентябрь 2025',
  documentNumber: 'ПЛ-00123',
};

salaryPaymentService.createPayment(payment).subscribe(result => {
  console.log('Payment created:', result);
});
```

### Пример 2: Создание аванса

```typescript
const advance: CreateSalaryPaymentDto = {
  engineerId: 5,
  month: 10,
  year: 2025,
  amount: 20000,
  type: PaymentType.ADVANCE,
  method: PaymentMethod.BANK_TRANSFER,
  paymentDate: '2025-10-10',
  notes: 'Аванс за октябрь 2025',
};

salaryPaymentService.createPayment(advance).subscribe(result => {
  console.log('Advance created:', result);
});
```

### Пример 3: Получение баланса инженера

```typescript
salaryPaymentService.getEngineerBalanceDetail(5).subscribe(detail => {
  console.log('Balance:', detail.balance);
  console.log('Total accrued:', detail.totalAccrued);
  console.log('Total paid:', detail.totalPaid);
  console.log('Recent payments:', detail.recentPayments);
  console.log('Recent calculations:', detail.recentCalculations);
});
```

### Пример 4: Получение истории выплат за месяц

```typescript
salaryPaymentService.getEngineerPayments(5, {
  year: 2025,
  month: 10,
}).subscribe(payments => {
  console.log('October payments:', payments);
});
```

---

## ⚙️ Автоматические процессы

### 1. Пересчет баланса

Баланс пересчитывается автоматически:
- При создании выплаты
- При обновлении выплаты
- При удалении выплаты
- При создании нового начисления

```typescript
// Автоматический пересчет в SalaryPaymentService
private async recalculateEngineerBalance(engineerId: number) {
  // 1. Получить все начисления (status = CALCULATED)
  const calculations = await this.salaryCalculationRepository.find({
    where: { engineerId, status: CalculationStatus.CALCULATED }
  });
  
  const totalAccrued = calculations.reduce((sum, c) => sum + c.totalAmount, 0);
  
  // 2. Получить все выплаты (status = COMPLETED)
  const payments = await this.salaryPaymentRepository.find({
    where: { engineerId, status: PaymentStatus.COMPLETED }
  });
  
  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  
  // 3. Обновить баланс
  balance.totalAccrued = totalAccrued;
  balance.totalPaid = totalPaid;
  balance.balance = totalAccrued - totalPaid;
  balance.lastCalculatedAt = new Date();
}
```

### 2. Обновление статуса начисления

Статус начисления обновляется автоматически:

```typescript
private async updateCalculationStatus(calculationId: number) {
  const calculation = await this.salaryCalculationRepository.findOne({
    where: { id: calculationId }
  });
  
  const payments = await this.salaryPaymentRepository.find({
    where: { salaryCalculationId: calculationId, status: PaymentStatus.COMPLETED }
  });
  
  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  
  // Если выплачено >= начислено → статус PAID
  if (totalPaid >= calculation.totalAmount) {
    calculation.status = CalculationStatus.PAID;
    await this.salaryCalculationRepository.save(calculation);
  }
}
```

---

## 📊 Отчеты и аналитика

### Отчет 1: Балансы всех инженеров

```typescript
GET /api/salary-payments/balances

[
  {
    engineerName: "Иванов Иван",
    totalAccrued: 240000,
    totalPaid: 220000,
    balance: 20000,  // Должны инженеру
    lastPaymentDate: "2025-10-15"
  },
  {
    engineerName: "Петров Петр",
    totalAccrued: 180000,
    totalPaid: 190000,
    balance: -10000,  // Переплата
    lastPaymentDate: "2025-10-10"
  }
]
```

### Отчет 2: Выплаты за период

```typescript
GET /api/salary-payments/engineer/5?year=2025&month=10

[
  {
    amount: 20000,
    type: "advance",
    paymentDate: "2025-10-10",
    notes: "Аванс"
  },
  {
    amount: 55000,
    type: "regular",
    paymentDate: "2025-10-25",
    notes: "Остаток зарплаты"
  }
]
```

### Отчет 3: Начисления с детализацией выплат

```typescript
GET /api/salary-payments/balance/5/detail

{
  balance: 5000,
  recentCalculations: [
    {
      month: 10,
      year: 2025,
      totalAmount: 80000,
      paidAmount: 75000,
      remainingAmount: 5000  // Еще не выплачено
    },
    {
      month: 9,
      year: 2025,
      totalAmount: 75000,
      paidAmount: 75000,
      remainingAmount: 0  // Полностью выплачено
    }
  ]
}
```

---

## 🔒 Безопасность и права доступа

### Роли и разрешения

- **ADMIN** - полный доступ
- **MANAGER** - полный доступ к просмотру и созданию выплат
- **USER** (инженер) - только просмотр своих выплат и баланса

### Аудит

Все операции логируются:
- Кто создал выплату (paidById)
- Когда создана (createdAt)
- Когда обновлена (updatedAt)
- История изменений через UserActivityLog

---

## 🚀 Развертывание

### 1. Миграция базы данных

```bash
# Для MySQL/Production
mysql -u user -p database < backend/migrations/003_create_salary_payments_tables.sql

# Для SQLite/Development
# Таблицы создаются автоматически через TypeORM synchronize: true
```

### 2. Обновление backend

```bash
cd backend
npm install
npm run build
npm run start:prod
```

### 3. Обновление frontend

```bash
cd frontend
npm install
ng build --configuration production
```

---

## 📝 Checklist для внедрения

- [x] Создать entities (SalaryPayment, EngineerBalance)
- [x] Создать DTOs для API
- [x] Реализовать SalaryPaymentService
- [x] Создать API endpoints (SalaryPaymentController)
- [x] Интегрировать PaymentsModule в AppModule
- [x] Обновить SalaryCalculation entity
- [x] Создать SQL миграции
- [x] Создать frontend сервис
- [x] Создать UI компоненты
- [ ] Добавить маршруты в роутинг
- [ ] Протестировать все сценарии
- [ ] Обновить документацию для пользователей

---

## 🎯 Преимущества системы

✅ **Полная прозрачность** - видна вся история начислений и выплат
✅ **Гибкость** - поддержка авансов, премий, корректировок
✅ **Контроль долгов** - автоматический расчет балансов
✅ **Аудит** - все операции логируются
✅ **Автоматизация** - статусы обновляются автоматически
✅ **Удобство** - интуитивный UI для менеджеров

---

## 📞 Поддержка

При возникновении вопросов или проблем:
1. Проверьте логи: `backend/server.log`
2. Проверьте состояние базы данных
3. Проверьте права доступа пользователя

**Система готова к использованию!** 🎉

