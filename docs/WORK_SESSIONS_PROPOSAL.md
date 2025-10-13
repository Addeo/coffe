# 📋 Предложение: Система учёта работ по заказам в разные месяцы

## 🎯 Цель

Реализовать возможность привязки **нескольких рабочих сессий (выездов)** к одному заказу, где каждая сессия может быть выполнена в **разные месяцы** и должна учитываться в расчётах зарплаты **в соответствующем месяце**.

---

## 📊 Текущая архитектура (Анализ)

### Как работает сейчас:

```
Order #123 (Заказ)
├── regularHours: 8h         ← Накопленные часы
├── overtimeHours: 4h        ← Накопленные часы переработки
├── calculatedAmount: 9600₽  ← Накопленная оплата
├── completionDate: 2025-10-15  ← ОДНА дата завершения
└── status: 'completed'
```

**Процесс:**
1. Инженер выезжает → `POST /api/orders/:id/complete-work`
2. Метод `completeWork()` **НАКАПЛИВАЕТ** часы в заказе:
   ```typescript
   order.regularHours += workData.regularHours;
   order.overtimeHours += workData.overtimeHours;
   order.calculatedAmount += totalPayment;
   order.completionDate = now;  // Перезаписывается!
   order.status = 'completed';
   ```

**Расчёт зарплаты** (`salary-calculation.service.ts`):
```typescript
const orders = await this.orderRepository
  .where('order.completionDate >= :startDate', { startDate })
  .where('order.completionDate < :endDate', { endDate })
  .getMany();
```

### ❌ Проблемы текущей архитектуры:

1. **Одна дата завершения**
   - `completionDate` перезаписывается при каждом выезде
   - Все накопленные часы попадают в месяц последнего `completionDate`

2. **Невозможность учёта работ в разные месяцы**
   - Пример: Выезд 1 в сентябре (4ч + 2000₽), выезд 2 в октябре (6ч + 1500₽)
   - Результат: Все 10 часов и 3500₽ идут в октябрь (последний completionDate)

3. **Потеря детализации**
   - Не видно, сколько выездов было
   - Нет истории работ по датам
   - Невозможно отследить прогресс выполнения

4. **Проблемы с незавершёнными заказами**
   - Если инженер выехал, поработал, но не завершил заказ
   - Текущая система требует статус `completed` для учёта в зарплате
   - Но заказ ещё не готов!

---

## ✅ Предлагаемое решение

### Архитектура: Возвращаем концепцию Work Sessions

```
Order #123 (Заказ - контракт)
├── status: 'in_progress'
├── plannedStartDate: 2025-09-01
├── completionDate: null        ← Заказ ещё не завершён
│
└── WorkSessions[] (Рабочие сессии - выезды)
    ├── WorkSession #1
    │   ├── workDate: 2025-09-15
    │   ├── regularHours: 4h
    │   ├── overtimeHours: 0h
    │   ├── calculatedAmount: 2800₽
    │   ├── carUsageAmount: 2000₽
    │   ├── notes: "Диагностика, нужны запчасти"
    │   ├── status: 'completed'
    │   └── canBeInvoiced: true  ← Можно выставить счёт
    │
    └── WorkSession #2
        ├── workDate: 2025-10-20
        ├── regularHours: 6h
        ├── overtimeHours: 2h
        ├── calculatedAmount: 5800₽
        ├── carUsageAmount: 1500₽
        ├── notes: "Установка запчастей, всё готово"
        ├── status: 'completed'
        └── canBeInvoiced: true
```

### Новая Entity: WorkSession

```typescript
@Entity('work_sessions')
export class WorkSession {
  @PrimaryGeneratedColumn()
  id: number;

  // Связь с заказом
  @ManyToOne(() => Order, order => order.workSessions)
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @Column({ name: 'order_id' })
  orderId: number;

  // Связь с инженером
  @ManyToOne(() => Engineer)
  @JoinColumn({ name: 'engineer_id' })
  engineer: Engineer;

  @Column({ name: 'engineer_id' })
  engineerId: number;

  // ⭐ Дата работы (для определения месяца оплаты)
  @Column({ name: 'work_date', type: 'date' })
  workDate: Date;

  // Время работы
  @Column('decimal', { name: 'regular_hours', precision: 5, scale: 2 })
  regularHours: number;

  @Column('decimal', { name: 'overtime_hours', precision: 5, scale: 2 })
  overtimeHours: number;

  // Оплата инженеру
  @Column('decimal', { name: 'calculated_amount', precision: 10, scale: 2 })
  calculatedAmount: number;

  @Column('decimal', { name: 'car_usage_amount', precision: 10, scale: 2 })
  carUsageAmount: number;

  // Ставки (для аудита)
  @Column('decimal', { name: 'engineer_base_rate', precision: 10, scale: 2 })
  engineerBaseRate: number;

  @Column('decimal', { name: 'engineer_overtime_rate', precision: 10, scale: 2, nullable: true })
  engineerOvertimeRate: number;

  // Оплата от организации
  @Column('decimal', { name: 'organization_payment', precision: 10, scale: 2 })
  organizationPayment: number;

  @Column('decimal', { name: 'organization_base_rate', precision: 10, scale: 2 })
  organizationBaseRate: number;

  @Column('decimal', { name: 'organization_overtime_multiplier', precision: 5, scale: 2, nullable: true })
  organizationOvertimeMultiplier: number;

  // Разбивка оплат (для отчётности)
  @Column('decimal', { name: 'regular_payment', precision: 10, scale: 2 })
  regularPayment: number;

  @Column('decimal', { name: 'overtime_payment', precision: 10, scale: 2 })
  overtimePayment: number;

  @Column('decimal', { name: 'organization_regular_payment', precision: 10, scale: 2 })
  organizationRegularPayment: number;

  @Column('decimal', { name: 'organization_overtime_payment', precision: 10, scale: 2 })
  organizationOvertimePayment: number;

  @Column('decimal', { precision: 10, scale: 2 })
  profit: number;

  // Детали работы
  @Column({ name: 'distance_km', type: 'decimal', precision: 8, scale: 2, nullable: true })
  distanceKm: number;

  @Column({ name: 'territory_type', type: 'varchar', length: 20, nullable: true })
  territoryType: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ name: 'photo_url', type: 'varchar', length: 255, nullable: true })
  photoUrl: string;

  // Статус сессии
  @Column({
    type: 'varchar',
    length: 20,
    default: 'completed',
  })
  status: 'completed' | 'cancelled';

  // Можно ли выставить счёт (для бухгалтерии)
  @Column({ name: 'can_be_invoiced', type: 'boolean', default: true })
  canBeInvoiced: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
```

### Обновлённая Order Entity

```typescript
@Entity('orders')
export class Order {
  // ... существующие поля ...

  // ⭐ Связь с рабочими сессиями
  @OneToMany(() => WorkSession, session => session.order)
  workSessions: WorkSession[];

  // ⚠️ DEPRECATED FIELDS (оставляем для обратной совместимости, но не используем)
  @Column('decimal', { name: 'regular_hours', nullable: true })
  regularHours: number; // Теперь вычисляется из workSessions

  @Column('decimal', { name: 'overtime_hours', nullable: true })
  overtimeHours: number; // Теперь вычисляется из workSessions

  @Column('decimal', { name: 'calculated_amount', nullable: true })
  calculatedAmount: number; // Теперь вычисляется из workSessions

  // ... остальные поля ...

  // 🔥 Виртуальные поля (вычисляются на лету)
  getTotalHours(): number {
    return this.workSessions?.reduce(
      (sum, s) => sum + (s.regularHours || 0) + (s.overtimeHours || 0),
      0
    ) || 0;
  }

  getTotalPayment(): number {
    return this.workSessions?.reduce(
      (sum, s) => sum + (s.calculatedAmount || 0) + (s.carUsageAmount || 0),
      0
    ) || 0;
  }
}
```

---

## 🔄 Изменения в бизнес-логике

### 1. Метод создания рабочей сессии (заменяет `completeWork`)

```typescript
// orders.service.ts

async createWorkSession(
  orderId: number,
  engineerId: number,
  workData: {
    workDate: Date;          // ⭐ Дата работы
    regularHours: number;
    overtimeHours: number;
    carPayment: number;
    distanceKm?: number;
    territoryType?: string;
    notes?: string;
    photoUrl?: string;
    canBeInvoiced?: boolean; // По умолчанию true
  }
): Promise<WorkSession> {
  // Получаем заказ
  const order = await this.ordersRepository.findOne({
    where: { id: orderId },
    relations: ['organization', 'assignedEngineer'],
  });

  if (!order) {
    throw new NotFoundException('Order not found');
  }

  // Получаем инженера
  const engineer = await this.engineersRepository.findOne({
    where: { userId: engineerId },
    relations: ['user'],
  });

  if (!engineer) {
    throw new NotFoundException('Engineer not found');
  }

  // Получаем ставки
  const rates = await this.calculationService.getEngineerRatesForOrganization(
    engineer,
    order.organization
  );

  // Рассчитываем оплату
  const regularPayment = workData.regularHours * rates.baseRate;
  const overtimePayment = workData.overtimeHours * (rates.overtimeRate || rates.baseRate);
  const totalPayment = regularPayment + overtimePayment;

  // Рассчитываем оплату от организации
  const organizationRegularPayment = workData.regularHours * order.organization.baseRate;
  const organizationOvertimePayment = order.organization.hasOvertime
    ? workData.overtimeHours * order.organization.baseRate * order.organization.overtimeMultiplier
    : workData.overtimeHours * order.organization.baseRate;
  const organizationPayment = organizationRegularPayment + organizationOvertimePayment;

  // ⭐ Создаём новую рабочую сессию
  const workSession = this.workSessionsRepository.create({
    orderId,
    engineerId: engineer.id,
    workDate: workData.workDate,
    regularHours: workData.regularHours,
    overtimeHours: workData.overtimeHours,
    calculatedAmount: totalPayment,
    carUsageAmount: workData.carPayment,
    engineerBaseRate: rates.baseRate,
    engineerOvertimeRate: rates.overtimeRate || rates.baseRate,
    organizationPayment,
    organizationBaseRate: order.organization.baseRate,
    organizationOvertimeMultiplier: order.organization.overtimeMultiplier,
    regularPayment,
    overtimePayment,
    organizationRegularPayment,
    organizationOvertimePayment,
    profit: organizationPayment - totalPayment,
    distanceKm: workData.distanceKm,
    territoryType: workData.territoryType,
    notes: workData.notes,
    photoUrl: workData.photoUrl,
    canBeInvoiced: workData.canBeInvoiced ?? true,
    status: 'completed',
  });

  const savedSession = await this.workSessionsRepository.save(workSession);

  // Обновляем статус заказа (если ещё не в работе)
  if (order.status === 'waiting' || order.status === 'assigned') {
    order.status = 'in_progress';
    order.actualStartDate = order.actualStartDate || new Date();
    await this.ordersRepository.save(order);
  }

  console.log('✅ Work session created:', {
    orderId,
    workDate: workData.workDate,
    regularHours: workData.regularHours,
    overtimeHours: workData.overtimeHours,
    totalPayment,
  });

  return savedSession;
}
```

### 2. Метод завершения заказа (отдельно от создания сессии)

```typescript
async completeOrder(orderId: number): Promise<Order> {
  const order = await this.ordersRepository.findOne({
    where: { id: orderId },
    relations: ['workSessions'],
  });

  if (!order) {
    throw new NotFoundException('Order not found');
  }

  // Проверяем, что есть хотя бы одна рабочая сессия
  if (!order.workSessions || order.workSessions.length === 0) {
    throw new BadRequestException('Cannot complete order without work sessions');
  }

  // Завершаем заказ
  order.status = 'completed';
  order.completionDate = new Date();

  const savedOrder = await this.ordersRepository.save(order);

  console.log('✅ Order completed:', {
    orderId,
    totalSessions: order.workSessions.length,
    completionDate: order.completionDate,
  });

  return savedOrder;
}
```

### 3. Обновлённый расчёт зарплаты

```typescript
// salary-calculation.service.ts

private async calculateEngineerSalary(
  engineer: Engineer,
  month: number,
  year: number,
  calculatedById?: number
): Promise<SalaryCalculation> {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 1);

  // ⭐ Получаем рабочие сессии за месяц (по workDate!)
  const workSessions = await this.workSessionRepository
    .createQueryBuilder('session')
    .leftJoinAndSelect('session.order', 'order')
    .leftJoinAndSelect('order.organization', 'organization')
    .where('session.engineerId = :engineerId', { engineerId: engineer.id })
    .andWhere('session.status = :status', { status: 'completed' })
    .andWhere('session.workDate >= :startDate', { startDate })
    .andWhere('session.workDate < :endDate', { endDate })
    .andWhere('session.canBeInvoiced = :canBeInvoiced', { canBeInvoiced: true })
    .getMany();

  // Суммируем данные из сессий
  let actualHours = 0;
  let overtimeHours = 0;
  let baseAmount = 0;
  let overtimeAmount = 0;
  let carUsageAmount = 0;
  let clientRevenue = 0;

  for (const session of workSessions) {
    actualHours += session.regularHours;
    overtimeHours += session.overtimeHours;
    baseAmount += session.regularPayment;
    overtimeAmount += session.overtimePayment;
    carUsageAmount += session.carUsageAmount;
    clientRevenue += session.organizationPayment;
  }

  const totalAmount = baseAmount + overtimeAmount + carUsageAmount;
  const profitMargin = clientRevenue - totalAmount;

  // Сохраняем расчёт
  const calculation = this.salaryCalculationRepository.create({
    engineerId: engineer.id,
    month,
    year,
    plannedHours: engineer.planHoursMonth,
    actualHours,
    overtimeHours,
    baseAmount,
    overtimeAmount,
    carUsageAmount,
    totalAmount,
    clientRevenue,
    profitMargin,
    status: CalculationStatus.CALCULATED,
    calculatedById,
  });

  return await this.salaryCalculationRepository.save(calculation);
}
```

### 4. Обновлённая статистика

```typescript
// statistics.service.ts

async getUserEarningsStatistics(
  userId: number,
  months: number = 12
): Promise<Array<{
  userId: number;
  month: number;
  year: number;
  totalEarnings: number;
  completedSessions: number;
  totalHours: number;
}>> {
  const engineer = await this.engineerRepository.findOne({
    where: { userId },
  });

  if (!engineer) {
    return [];
  }

  const currentDate = new Date();
  const statistics = [];

  for (let i = 0; i < months; i++) {
    const targetDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
    const targetMonth = targetDate.getMonth() + 1;
    const targetYear = targetDate.getFullYear();

    const startDate = new Date(targetYear, targetMonth - 1, 1);
    const endDate = new Date(targetYear, targetMonth, 1);

    // ⭐ Получаем сессии за месяц (по workDate!)
    const sessions = await this.workSessionRepository
      .createQueryBuilder('session')
      .where('session.engineerId = :engineerId', { engineerId: engineer.id })
      .andWhere('session.status = :status', { status: 'completed' })
      .andWhere('session.workDate >= :startDate', { startDate })
      .andWhere('session.workDate < :endDate', { endDate })
      .getMany();

    let totalEarnings = 0;
    let totalHours = 0;

    for (const session of sessions) {
      totalEarnings += session.calculatedAmount + session.carUsageAmount;
      totalHours += session.regularHours + session.overtimeHours;
    }

    statistics.push({
      userId,
      month: targetMonth,
      year: targetYear,
      totalEarnings,
      completedSessions: sessions.length,
      totalHours,
    });
  }

  return statistics;
}
```

---

## 📱 API изменения

### Новые endpoints:

```typescript
// 1. Создать рабочую сессию (выезд)
POST /api/orders/:id/work-sessions
Body: {
  workDate: "2025-10-15",
  regularHours: 4,
  overtimeHours: 0,
  carPayment: 2000,
  distanceKm: 50,
  territoryType: "home",
  notes: "Диагностика, нужны запчасти",
  photoUrl: "...",
  canBeInvoiced: true
}
Response: WorkSession

// 2. Получить все сессии по заказу
GET /api/orders/:id/work-sessions
Response: WorkSession[]

// 3. Обновить сессию (если ошибка в данных)
PATCH /api/work-sessions/:id
Body: { regularHours: 5, notes: "..." }
Response: WorkSession

// 4. Удалить сессию (если создана ошибочно)
DELETE /api/work-sessions/:id
Response: { success: true }

// 5. Завершить заказ (отдельно от создания сессии)
POST /api/orders/:id/complete
Response: Order
```

### Обновлённые endpoints:

```typescript
// GET /api/orders/:id - теперь возвращает с workSessions
Response: {
  id: 123,
  title: "...",
  status: "in_progress",
  workSessions: [
    {
      id: 1,
      workDate: "2025-09-15",
      regularHours: 4,
      calculatedAmount: 2800,
      notes: "..."
    },
    {
      id: 2,
      workDate: "2025-10-20",
      regularHours: 6,
      calculatedAmount: 4200,
      notes: "..."
    }
  ],
  // Вычисляемые поля
  totalHours: 10,
  totalPayment: 7000
}
```

---

## 🗄️ Миграция данных

### Стратегия миграции:

**Этап 1: Создание новой таблицы**

```sql
CREATE TABLE work_sessions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  order_id INT NOT NULL,
  engineer_id INT NOT NULL,
  work_date DATE NOT NULL,
  regular_hours DECIMAL(5,2) NOT NULL DEFAULT 0,
  overtime_hours DECIMAL(5,2) NOT NULL DEFAULT 0,
  calculated_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  car_usage_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  engineer_base_rate DECIMAL(10,2) NOT NULL,
  engineer_overtime_rate DECIMAL(10,2),
  organization_payment DECIMAL(10,2) NOT NULL DEFAULT 0,
  organization_base_rate DECIMAL(10,2) NOT NULL,
  organization_overtime_multiplier DECIMAL(5,2),
  regular_payment DECIMAL(10,2) NOT NULL DEFAULT 0,
  overtime_payment DECIMAL(10,2) NOT NULL DEFAULT 0,
  organization_regular_payment DECIMAL(10,2) NOT NULL DEFAULT 0,
  organization_overtime_payment DECIMAL(10,2) NOT NULL DEFAULT 0,
  profit DECIMAL(10,2) NOT NULL DEFAULT 0,
  distance_km DECIMAL(8,2),
  territory_type VARCHAR(20),
  notes TEXT,
  photo_url VARCHAR(255),
  status VARCHAR(20) NOT NULL DEFAULT 'completed',
  can_be_invoiced BOOLEAN NOT NULL DEFAULT true,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (engineer_id) REFERENCES engineers(id) ON DELETE CASCADE,
  INDEX idx_work_date (work_date),
  INDEX idx_engineer_work_date (engineer_id, work_date),
  INDEX idx_order_id (order_id)
);
```

**Этап 2: Миграция существующих данных**

```sql
-- Для каждого завершённого заказа создаём одну рабочую сессию
INSERT INTO work_sessions (
  order_id,
  engineer_id,
  work_date,
  regular_hours,
  overtime_hours,
  calculated_amount,
  car_usage_amount,
  engineer_base_rate,
  engineer_overtime_rate,
  organization_payment,
  organization_base_rate,
  organization_overtime_multiplier,
  regular_payment,
  overtime_payment,
  organization_regular_payment,
  organization_overtime_payment,
  profit,
  distance_km,
  territory_type,
  notes,
  photo_url,
  status,
  created_at,
  updated_at
)
SELECT
  o.id,
  o.assigned_engineer_id,
  COALESCE(o.completion_date, o.actual_start_date, o.created_at), -- workDate
  COALESCE(o.regular_hours, 0),
  COALESCE(o.overtime_hours, 0),
  COALESCE(o.calculated_amount, 0),
  COALESCE(o.car_usage_amount, 0),
  COALESCE(o.engineer_base_rate, 0),
  o.engineer_overtime_rate,
  COALESCE(o.organization_payment, 0),
  COALESCE(o.organization_base_rate, 0),
  o.organization_overtime_multiplier,
  COALESCE(o.regular_payment, 0),
  COALESCE(o.overtime_payment, 0),
  COALESCE(o.organization_regular_payment, 0),
  COALESCE(o.organization_overtime_payment, 0),
  COALESCE(o.profit, 0),
  o.distance_km,
  o.territory_type,
  o.work_notes,
  o.work_photo_url,
  'completed',
  o.created_at,
  o.updated_at
FROM orders o
WHERE o.status = 'completed'
  AND o.assigned_engineer_id IS NOT NULL
  AND (o.regular_hours > 0 OR o.overtime_hours > 0);
```

**Этап 3: Обратная совместимость**

```typescript
// Оставляем старые поля в Order как вычисляемые
// order.entity.ts

@Entity('orders')
export class Order {
  // ... существующие поля ...

  @OneToMany(() => WorkSession, session => session.order)
  workSessions: WorkSession[];

  // Геттеры для обратной совместимости
  get regularHours(): number {
    return this.workSessions?.reduce((sum, s) => sum + (s.regularHours || 0), 0) || 0;
  }

  get overtimeHours(): number {
    return this.workSessions?.reduce((sum, s) => sum + (s.overtimeHours || 0), 0) || 0;
  }

  get calculatedAmount(): number {
    return this.workSessions?.reduce((sum, s) => sum + (s.calculatedAmount || 0), 0) || 0;
  }

  get carUsageAmount(): number {
    return this.workSessions?.reduce((sum, s) => sum + (s.carUsageAmount || 0), 0) || 0;
  }

  get organizationPayment(): number {
    return this.workSessions?.reduce((sum, s) => sum + (s.organizationPayment || 0), 0) || 0;
  }
}
```

---

## 🎯 Преимущества нового подхода

### 1. ✅ Корректный учёт работ по месяцам
- Каждая сессия привязана к `workDate`
- Расчёт зарплаты идёт по дате работы, а не завершения заказа
- Работы в разные месяцы корректно распределяются

### 2. ✅ Детализация и прозрачность
- История всех выездов
- Аудит каждой сессии
- Понятно, сколько раз инженер выезжал

### 3. ✅ Гибкость в оплате
- Можно отметить сессию как `canBeInvoiced: false` (не учитывать в оплате)
- Можно закрыть выезд, но не завершать заказ
- Можно откорректировать данные отдельной сессии

### 4. ✅ Корректная работа с незавершёнными заказами
- Заказ в статусе `in_progress`
- Несколько закрытых сессий уже учтены в зарплате
- Заказ завершается отдельным действием

### 5. ✅ Удобство для бухгалтерии
- Можно выгрузить все сессии за месяц
- Видны все детали: часы, расходы, даты
- Привязка к заказу для документов

---

## 📊 Пример использования

### Сценарий: Заказ с двумя выездами в разные месяцы

```typescript
// 1. Создаём заказ (сентябрь)
POST /api/orders
{
  organizationId: 1,
  title: "Ремонт кофемашины Siemens",
  location: "ул. Ленина, 10",
  plannedStartDate: "2025-09-15"
}
// Response: Order { id: 123, status: 'waiting' }

// 2. Назначаем инженера
POST /api/orders/123/assign
{ engineerId: 5 }
// Response: Order { id: 123, status: 'assigned' }

// 3. Инженер выехал (сентябрь) - первый выезд
POST /api/orders/123/work-sessions
{
  workDate: "2025-09-15",
  regularHours: 4,
  overtimeHours: 0,
  carPayment: 2000,
  notes: "Провёл диагностику, нужны запчасти (арт. 12345)",
  photoUrl: "photo1.jpg",
  canBeInvoiced: true
}
// Response: WorkSession { id: 1, workDate: "2025-09-15", calculatedAmount: 2800 }
// Order status: 'in_progress'

// 4. Расчёт зарплаты за сентябрь
//    ✅ Сессия #1 (4ч + 2000₽) учтена в сентябре

// 5. Инженер выехал снова (октябрь) - второй выезд
POST /api/orders/123/work-sessions
{
  workDate: "2025-10-20",
  regularHours: 6,
  overtimeHours: 2,
  carPayment: 1500,
  notes: "Установил запчасти, всё работает",
  photoUrl: "photo2.jpg",
  canBeInvoiced: true
}
// Response: WorkSession { id: 2, workDate: "2025-10-20", calculatedAmount: 5800 }
// Order status: 'in_progress'

// 6. Расчёт зарплаты за октябрь
//    ✅ Сессия #2 (8ч + 1500₽) учтена в октябре

// 7. Завершаем заказ
POST /api/orders/123/complete
// Response: Order { id: 123, status: 'completed', completionDate: "2025-10-20" }

// 8. Просмотр истории заказа
GET /api/orders/123
// Response:
{
  id: 123,
  title: "Ремонт кофемашины Siemens",
  status: "completed",
  completionDate: "2025-10-20",
  workSessions: [
    {
      id: 1,
      workDate: "2025-09-15",
      regularHours: 4,
      overtimeHours: 0,
      calculatedAmount: 2800,
      carUsageAmount: 2000,
      notes: "Провёл диагностику, нужны запчасти (арт. 12345)"
    },
    {
      id: 2,
      workDate: "2025-10-20",
      regularHours: 6,
      overtimeHours: 2,
      calculatedAmount: 5800,
      carUsageAmount: 1500,
      notes: "Установил запчасти, всё работает"
    }
  ],
  totalHours: 12,
  totalPayment: 12100
}
```

---

## 🚀 План внедрения

### Этап 1: Backend Core (Неделя 1)
- [ ] Создать entity `WorkSession`
- [ ] Создать миграцию базы данных
- [ ] Обновить `Order` entity с связью `OneToMany`
- [ ] Создать `WorkSessionsService`
- [ ] Реализовать метод `createWorkSession()`
- [ ] Реализовать метод `completeOrder()`
- [ ] Написать unit tests

### Этап 2: API & Business Logic (Неделя 2)
- [ ] Создать `WorkSessionsController`
- [ ] Реализовать endpoints CRUD для сессий
- [ ] Обновить `SalaryCalculationService` (работа с сессиями)
- [ ] Обновить `StatisticsService` (работа с сессиями)
- [ ] Обновить `ReportsService` (работа с сессиями)
- [ ] Написать integration tests

### Этап 3: Migration & Data (Неделя 3)
- [ ] Создать скрипт миграции данных
- [ ] Протестировать миграцию на тестовой БД
- [ ] Запустить миграцию на продакшн
- [ ] Верификация данных после миграции
- [ ] Rollback план (на случай проблем)

### Этап 4: Frontend (Неделя 4)
- [ ] Обновить DTOs в `shared/`
- [ ] Создать компонент `WorkSessionsList`
- [ ] Создать компонент `WorkSessionForm`
- [ ] Обновить `OrderEditComponent` (отображение сессий)
- [ ] Обновить `OrdersService` (новые endpoints)
- [ ] Обновить статистику и отчёты
- [ ] E2E тестирование

### Этап 5: Documentation & Deployment (Неделя 5)
- [ ] Обновить API документацию
- [ ] Написать руководство для пользователей
- [ ] Подготовить release notes
- [ ] Staged rollout (постепенное развёртывание)
- [ ] Мониторинг и hotfixes

---

## ⚠️ Риски и митигация

### Риск 1: Миграция данных
**Проблема:** Потеря или некорректная миграция существующих данных

**Митигация:**
- Полный backup БД перед миграцией
- Тестирование на копии продакшн БД
- Верификационные скрипты после миграции
- Rollback план

### Риск 2: Производительность
**Проблема:** Дополнительные JOIN'ы могут замедлить запросы

**Митигация:**
- Индексы на `work_date`, `engineer_id`, `order_id`
- Eager loading для `workSessions` где нужно
- Pagination для больших списков
- Кэширование агрегированных данных

### Риск 3: Обратная совместимость
**Проблема:** Старый код может сломаться

**Митигация:**
- Геттеры в `Order` entity для старых полей
- Постепенный переход (dual-write период)
- Версионирование API
- Тщательное тестирование

### Риск 4: Сложность UX
**Проблема:** Пользователям может быть непонятно

**Митигация:**
- Понятный UI с историей сессий
- Tooltips и подсказки
- Обучающие материалы
- Поэтапное внедрение с обратной связью

---

## 💰 Оценка трудозатрат

| Задача | Часы | Описание |
|--------|------|----------|
| **Backend Core** | 40 | Entity, Service, основная логика |
| **API & Controllers** | 24 | REST endpoints, валидация |
| **Business Logic Updates** | 32 | Зарплата, статистика, отчёты |
| **Migration** | 16 | Скрипты, тестирование, rollback |
| **Frontend** | 40 | Components, Services, UI |
| **Testing** | 32 | Unit, Integration, E2E |
| **Documentation** | 16 | API docs, user guides |
| **Deployment & Support** | 20 | Rollout, monitoring, hotfixes |
| **ИТОГО** | **220 часов** | ~5-6 недель (1 разработчик) |

---

## 📋 Выводы

### ✅ Что решается:
1. **Учёт работ в разные месяцы** - каждая сессия в своём месяце
2. **Детализация работ** - видна история всех выездов
3. **Гибкость оплаты** - можно управлять каждой сессией отдельно
4. **Незавершённые заказы** - работы учтены, заказ ещё в процессе
5. **Прозрачность** - полный аудит трейл

### ⚡ Ключевые изменения:
- Новая entity `WorkSession`
- Связь `Order -> OneToMany -> WorkSession`
- Расчёты по `workDate` вместо `completionDate`
- Новые API endpoints
- Миграция существующих данных

### 🎯 Следующие шаги:
1. Утвердить архитектурное решение
2. Подготовить детальный план
3. Начать реализацию с Этапа 1
4. Регулярные демо и обратная связь

---

**Готовы обсудить детали и приступить к реализации?** 🚀

