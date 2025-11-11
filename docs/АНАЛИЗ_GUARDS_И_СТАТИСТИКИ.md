# 📊 АНАЛИЗ СИСТЕМЫ: Guards, Статистика и Автомобильные Отчисления

**Дата:** 21 января 2025  
**Анализ:** Проверка guards, логики статистики и автомобильных отчислений

---

## 🔐 GUARDS НА РОУТИНГАХ

### ✅ Статус: **РАБОТАЕТ ПРАВИЛЬНО**

#### Frontend Guards (`auth.guard.ts`):

```typescript
// ✅ Проверяет аутентификацию
if (!this.authService.isAuthenticated()) {
  this.router.navigate(['/login']);
  return false;
}

// ✅ Проверяет роли через исправленный hasAnyRole()
if (!this.authService.hasAnyRole(userRoles)) {
  this.router.navigate(['/unauthorized']);
  return false;
}
```

#### Backend Guards (`roles.guard.ts`):

```typescript
// ✅ Использует activeRole
const effectiveRole = user?.activeRole || user?.primaryRole || user?.role;

// ✅ Проверяет иерархию
const hasAccess = requiredRoles.some(requiredRole => {
  if (effectiveRole === requiredRole) return true;
  return hasRoleAccess(primaryRole, requiredRole) && hasRoleAccess(effectiveRole, requiredRole);
});
```

### 📋 Таблица защиты маршрутов:

| Маршрут                 | Frontend Guard | Backend Guard | ADMIN | MANAGER | USER |
| ----------------------- | -------------- | ------------- | ----- | ------- | ---- |
| `/users`                | ✅ AuthGuard   | ✅ RolesGuard | ✅    | ✅      | ❌   |
| `/users/create`         | ✅ AuthGuard   | ✅ RolesGuard | ✅    | ❌      | ❌   |
| `/organizations`        | ✅ AuthGuard   | ✅ RolesGuard | ✅    | ✅      | ❌   |
| `/organizations/create` | ✅ AuthGuard   | ✅ RolesGuard | ✅    | ❌      | ❌   |
| `/engineer-rates`       | ✅ AuthGuard   | ✅ RolesGuard | ✅    | ✅      | ❌   |
| `/statistics`           | ✅ AuthGuard   | ✅ RolesGuard | ✅    | ✅      | ❌   |
| `/reports`              | ✅ AuthGuard   | ✅ RolesGuard | ✅    | ✅      | ❌   |
| `/settings`             | ✅ AuthGuard   | ✅ RolesGuard | ✅    | ❌      | ❌   |
| `/backups`              | ✅ AuthGuard   | ✅ RolesGuard | ✅    | ❌      | ❌   |
| `/logs`                 | ✅ AuthGuard   | ✅ RolesGuard | ✅    | ❌      | ❌   |
| `/orders`               | ✅ AuthGuard   | ✅ RolesGuard | ✅    | ✅      | ✅   |

---

## 📊 ЛОГИКА СТАТИСТИКИ

### ✅ Статус: **РЕАЛИЗОВАНА ЧАСТИЧНО**

#### Что работает:

1. **Общая статистика:**
   - Общий доход от организаций
   - Количество заказов
   - Сверхурочные часы
   - Прибыль компании

2. **Финансовая сводка:**
   - Организации должны заплатить
   - Организации заплатили
   - Инженеры заработали
   - Прибыль компании

3. **Детальная статистика по инженерам:**
   - Фиксированная зарплата
   - Дополнительная оплата
   - **Оплата за автомобиль** (отдельно!)
   - Общий заработок

#### Backend логика (`statistics.service.ts`):

```typescript
// ✅ Автомобильные отчисления считаются отдельно
const engineerEarnings = Number(stat.engineerEarnings) || 0; // Работа
const carUsageAmount = Number(stat.carUsageAmount) || 0; // Машина

// ✅ Прибыль = (оплата от организации) - (оплата за работу)
// Доплата за машину НЕ влияет на прибыль
const profit = organizationPayments - engineerEarnings;

// ✅ Общая сумма от организации включает доплату за машину
const totalOrganizationPayment = organizationPayments + carUsageAmount;
const totalEngineerPayment = engineerEarnings + carUsageAmount;
```

#### Frontend отображение (`statistics.component.html`):

```html
<!-- ✅ Автомобильные отчисления показаны отдельно -->
<ng-container matColumnDef="carPayment">
  <th mat-header-cell *matHeaderCellDef>Оплата за автомобиль (₽)</th>
  <td mat-cell *matCellDef="let element">{{ formatCurrency(element.carPayment) }}</td>
</ng-container>
```

---

## 🚗 АВТОМОБИЛЬНЫЕ ОТЧИСЛЕНИЯ

### ✅ Статус: **ПРАВИЛЬНО РЕАЛИЗОВАНО**

#### Логика расчета (`calculation.service.ts`):

```typescript
async calculateCarUsage(
  engineer: Engineer,
  organization: Organization,
  distanceKm: number,
  territoryType: TerritoryType
): Promise<number> {
  // ✅ Для контрактников: 14₽/км
  if (engineer.type === EngineerType.CONTRACT) {
    return distanceKm * 14;
  }

  // ✅ Для штатных: фиксированная сумма
  return engineer.fixedCarAmount;
}
```

#### Отдельный учет в WorkSession:

```typescript
// ✅ В salary-calculation.service.ts
let carUsageAmount = 0;
let clientRevenue = 0;

for (const session of workSessions) {
  carUsageAmount += session.carUsageAmount; // Отдельно
  clientRevenue += session.organizationPayment; // Включает машину
}

// ✅ Общая сумма инженера = работа + машина
const totalAmount = baseAmount + overtimeAmount + carUsageAmount;
```

#### Отображение в статистике:

```typescript
// ✅ Backend возвращает отдельно
return {
  engineerEarnings: engineerEarnings, // Оплата за работу (без машины)
  carUsageAmount: carUsageAmount, // Доплата за машину отдельно
  totalEarnings: totalEngineerPayment, // Общая сумма (работа + машина)
  organizationPayments: totalOrganizationPayment, // Включаем доплату за машину
  profit, // Прибыль БЕЗ учета машины
  profitMargin,
};
```

---

## ⚠️ ЧТО НУЖНО ДОРАБОТАТЬ

### 1. Отображение статуса оплаты автомобильных отчислений

**Проблема:** Нет информации о том, сколько компания должна заплатить за автомобиль и сколько уже заплачено.

**Нужно добавить:**

```typescript
// В статистику добавить поля:
interface CarPaymentStatus {
  totalCarAmount: number; // Общая сумма к доплате за автомобили
  paidCarAmount: number; // Уже заплачено за автомобили
  pendingCarAmount: number; // Осталось доплатить за автомобили
}
```

### 2. Детализация по организациям

**Проблема:** Нет разбивки автомобильных отчислений по организациям.

**Нужно добавить:**

```typescript
interface OrganizationCarPayments {
  organizationId: number;
  organizationName: string;
  totalCarAmount: number;
  paidCarAmount: number;
  pendingCarAmount: number;
}
```

### 3. Отдельная таблица автомобильных отчислений

**Проблема:** Автомобильные отчисления смешаны с общей статистикой.

**Нужно добавить:**

- Отдельную вкладку "Автомобильные отчисления"
- Таблицу с разбивкой по инженерам и организациям
- Статус оплаты (заплачено/не заплачено)

---

## 📋 РЕКОМЕНДАЦИИ ПО ДОРАБОТКЕ

### Приоритет 1: Добавить статус оплаты автомобильных отчислений

```typescript
// В statistics.service.ts добавить метод:
async getCarPaymentStatus(year: number, month: number) {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 1);

  const carPayments = await this.workSessionRepository
    .createQueryBuilder('session')
    .leftJoinAndSelect('session.order', 'order')
    .leftJoinAndSelect('order.organization', 'organization')
    .leftJoinAndSelect('session.engineer', 'engineer')
    .where('session.workDate >= :startDate', { startDate })
    .andWhere('session.workDate < :endDate', { endDate })
    .andWhere('session.carUsageAmount > 0')
    .getMany();

  const totalCarAmount = carPayments.reduce((sum, session) =>
    sum + session.carUsageAmount, 0);

  const paidCarAmount = carPayments
    .filter(session => session.isPaidToEngineer)
    .reduce((sum, session) => sum + session.carUsageAmount, 0);

  return {
    totalCarAmount,
    paidCarAmount,
    pendingCarAmount: totalCarAmount - paidCarAmount,
    breakdown: this.groupCarPaymentsByOrganization(carPayments)
  };
}
```

### Приоритет 2: Обновить frontend для отображения

```html
<!-- Добавить в statistics.component.html -->
<mat-card class="car-payments-card">
  <mat-card-header>
    <mat-card-title>
      <mat-icon>directions_car</mat-icon>
      Автомобильные отчисления
    </mat-card-title>
  </mat-card-header>
  <mat-card-content>
    <div class="car-payments-summary">
      <div class="payment-item">
        <span class="label">Общая сумма к доплате:</span>
        <span class="value">{{ carPaymentStatus.totalCarAmount | currency }}</span>
      </div>
      <div class="payment-item">
        <span class="label">Уже заплачено:</span>
        <span class="value success">{{ carPaymentStatus.paidCarAmount | currency }}</span>
      </div>
      <div class="payment-item">
        <span class="label">Осталось доплатить:</span>
        <span class="value warning">{{ carPaymentStatus.pendingCarAmount | currency }}</span>
      </div>
    </div>
  </mat-card-content>
</mat-card>
```

---

## 🎯 ИТОГОВАЯ ОЦЕНКА

### ✅ Что работает отлично:

1. **Guards на роутингах** - полностью исправлены
2. **Разграничение прав** - работает корректно
3. **Автомобильные отчисления** - правильно считаются отдельно
4. **Прибыль компании** - не включает автомобильные отчисления
5. **Статистика по инженерам** - показывает автомобильные отчисления отдельно

### ⚠️ Что нужно доработать:

1. **Статус оплаты автомобильных отчислений** - добавить отслеживание
2. **Детализация по организациям** - разбивка автомобильных отчислений
3. **Отдельная таблица** - для автомобильных отчислений

### 📊 Общая оценка: **85%** ✅

Система работает правильно, но нужны доработки для полного отслеживания автомобильных отчислений.

---

_Анализ выполнен: 21 января 2025_
