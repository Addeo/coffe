# Complete Removal of work_reports Entity

## 🎯 Goal

Simplify architecture by storing all work data **directly in Order entity**, eliminating the need for a separate `work_reports` table.

## ❌ Problem with Original Architecture

### Before:

```
Order (Contract)
  └── WorkReports[] (Event Log)
        ├── WorkReport #1: 4h, photo, notes
        ├── WorkReport #2: 23h, photo, notes
        └── WorkReport #3: 4h, photo, notes

Statistics → Query work_reports → Aggregate → Return
```

**Issues:**

- 🔄 Extra complexity with 2 entities
- 📊 Statistics had to aggregate work_reports
- 🗄️ Two tables to maintain
- 🔗 Complex relationships

### After:

```
Order (Single Entity)
  ├── regularHours: 0h
  ├── overtimeHours: 31h
  ├── calculatedAmount: 21,600₽
  ├── carUsageAmount: 4,000₽
  ├── workPhotoUrl: "..."
  └── workNotes: "..."

Statistics → Query orders → Return (already aggregated!)
```

**Benefits:**

- ✅ Single source of truth
- ✅ Simpler architecture
- ✅ Faster queries
- ✅ Less storage

## 🔧 Changes Made

### 1. Order Entity - Extended Fields

**File:** `backend/src/entities/order.entity.ts`

Order already had all necessary fields:

```typescript
// Work hours
regularHours: number; // Regular work hours
overtimeHours: number; // Overtime hours

// Payments
calculatedAmount: number; // Engineer payment
carUsageAmount: number; // Car usage payment
organizationPayment: number; // Organization payment

// Work details
workNotes: string; // Work notes
workPhotoUrl: string; // Work photo
distanceKm: number; // Distance traveled
territoryType: TerritoryType; // Territory type

// Timestamps
actualStartDate: Date; // Work started
completionDate: Date; // Work completed
```

### 2. Simplified Work Report Creation

**File:** `backend/src/modules/orders/orders.service.ts`

**Before:**

```typescript
// Create WorkReport entity
const workReport = this.workReportsRepository.create({...});
await this.workReportsRepository.save(workReport);

// Then aggregate into Order
order.regularHours += data.regularHours;
await this.ordersRepository.save(order);

return workReport;
```

**After:**

```typescript
// Update Order directly
order.regularHours += workData.regularHours;
order.overtimeHours += workData.overtimeHours;
order.calculatedAmount += totalPayment;
order.workPhotoUrl = workData.photoUrl;
order.workNotes = workData.notes;
order.status = OrderStatus.COMPLETED;

await this.ordersRepository.save(order);
return order;
```

### 3. Removed work_reports Entity

**Deleted:** `backend/src/entities/work-report.entity.ts` ❌

### 4. Updated All Modules

**Removed WorkReport imports from:**

- ✅ `app.module.ts`
- ✅ `orders.module.ts` & `orders.service.ts`
- ✅ `statistics.module.ts` & `statistics.service.ts`
- ✅ `users.module.ts` & `users.service.ts`
- ✅ `расчеты/calculations.module.ts`
- ✅ `расчеты/salary-calculation.service.ts`
- ✅ `расчеты/calculation.service.ts`
- ✅ `reports/reports.module.ts` & `reports.service.ts`
- ✅ `config/database.config.ts`

### 5. Updated Statistics (Already Done)

Statistics now query Order fields directly:

- `getAgentEarningsData()` - from `order.calculatedAmount`
- `getOrganizationEarningsData()` - from `order.organizationPayment`
- `getOvertimeStatisticsData()` - from `order.overtimeHours` + `order.regularHours`

### 6. Updated Salary Calculations

**File:** `backend/src/modules/расчеты/salary-calculation.service.ts`

**Before:**

```typescript
const workReports = await this.workReportRepository.find(...);
const calculation = await this.calculationService.calculateMonthlySalary(
  engineer,
  workReports,
  plannedHours
);
```

**After:**

```typescript
const orders = await this.orderRepository
  .where('order.assignedEngineerId = :engineerId')
  .andWhere('order.status = :status', { status: 'completed' })
  .getMany();

const calculation = await this.calculationService.calculateMonthlySalary(
  engineer,
  orders,
  plannedHours
);
```

### 7. Updated Reports Service

**File:** `backend/src/modules/reports/reports.service.ts`

Charts now built from Orders instead of work_reports:

```typescript
// Before: work_reports for hours chart
const workReports = await this.workReportRepository.find(...);

// After: orders for hours chart
const orders = await this.orderRepository
  .where('order.status = :status', { status: 'completed' })
  .getMany();
```

### 8. Removed Endpoints

**Removed:**

- `GET /api/orders/:id/work-reports` - list work reports
- `GET /api/orders/work-reports/my` - my work reports

**Renamed:**

- `POST /api/orders/:id/work-reports` → `POST /api/orders/:id/complete-work`
- Now returns `Order` instead of `WorkReport`

### 9. Removed Test Endpoints

**Removed:**

- `POST /api/calculations/work-report-cost` - test endpoint

## 📊 Data Flow (New)

```
1. Engineer completes work
   POST /api/orders/:id/complete-work
   {
     regularHours: 4,
     overtimeHours: 0,
     carPayment: 1000,
     photoUrl: "...",
     notes: "Работа выполнена"
   }

2. Backend updates Order directly
   ↓
   order.regularHours += 4
   order.calculatedAmount += 3600
   order.workPhotoUrl = "..."
   order.workNotes = "..."
   order.status = 'completed'
   ✅ order.save()

3. Statistics query Order
   GET /api/statistics/monthly
   ↓
   SELECT
     SUM(regularHours),
     SUM(overtimeHours),
     SUM(calculatedAmount)
   FROM orders
   WHERE status = 'completed'
     AND completionDate BETWEEN ... AND ...
```

## 🗄️ Database Changes

### Dropped Table:

```sql
DROP TABLE IF EXISTS work_reports;
```

### Orders Table - Fields Used:

```sql
-- Work hours
regularHours         DECIMAL(5,2) DEFAULT 0
overtimeHours        DECIMAL(5,2) DEFAULT 0

-- Payments
calculatedAmount     DECIMAL(10,2) DEFAULT 0
carUsageAmount       DECIMAL(10,2) DEFAULT 0
organizationPayment  DECIMAL(10,2) DEFAULT 0

-- Work details
workNotes            TEXT
workPhotoUrl         VARCHAR(255)
distanceKm           DECIMAL(8,2)
territoryType        VARCHAR(20)

-- Timestamps
actualStartDate      DATETIME
completionDate       DATETIME
```

## ✅ Benefits

### 1. Simpler Architecture

- ❌ No work_reports table
- ❌ No relationships to manage
- ✅ Single entity (Order)
- ✅ Clearer data model

### 2. Better Performance

- ✅ No JOINs needed for statistics
- ✅ Pre-aggregated data in Order
- ✅ Faster queries
- ✅ Less database load

### 3. Easier Maintenance

- ✅ One entity to understand
- ✅ No cascade deletions
- ✅ Simpler migrations
- ✅ Less code to maintain

### 4. Clearer Business Logic

```typescript
// Order IS the work contract
Order {
  status: 'completed',
  regularHours: 4,
  overtimeHours: 0,
  calculatedAmount: 3600,
  workPhotoUrl: 'proof.jpg',
  workNotes: 'All fixed'
}
```

## ⚠️ Trade-offs

### Lost Features:

- ❌ **Multiple work sessions** per order (now only one "completion")
- ❌ **Detailed history** of when/how work was done
- ❌ **Audit trail** for each visit
- ❌ **Multiple photos** per order (only one via workPhotoUrl)

**But** we can use:

- ✅ **Files** entity for multiple photos (order.files[])
- ✅ **Activity logs** for audit trail
- ✅ **Simpler model** for most use cases

## 🔄 Migration

### Script: `backend/migrate-order-aggregates.js`

Already ran successfully:

```
✅ Order #6 "тестовый заказ": 0h regular + 31h overtime = 25600 RUB (3 work reports)
```

### Manual Migration (if needed):

```sql
-- Aggregate work_reports into orders
UPDATE orders o
SET
  regularHours = (
    SELECT SUM(CASE WHEN isOvertime = 0 THEN totalHours ELSE 0 END)
    FROM work_reports WHERE orderId = o.id
  ),
  overtimeHours = (
    SELECT SUM(CASE WHEN isOvertime = 1 THEN totalHours ELSE 0 END)
    FROM work_reports WHERE orderId = o.id
  ),
  calculatedAmount = (
    SELECT SUM(calculatedAmount)
    FROM work_reports WHERE orderId = o.id
  ),
  carUsageAmount = (
    SELECT SUM(carUsageAmount)
    FROM work_reports WHERE orderId = o.id
  );

-- Drop work_reports table
DROP TABLE IF EXISTS work_reports;
```

## 🧪 Testing

### Test Statistics Endpoint:

```bash
curl 'http://localhost:3000/api/statistics/monthly?year=2025&month=10' \
  -H 'Authorization: Bearer TOKEN'
```

**Expected Response:**

```json
{
  "year": 2025,
  "month": 10,
  "agentEarnings": [
    {
      "agentId": 4,
      "totalEarnings": 25600,
      "completedOrders": 1
    }
  ],
  "organizationEarnings": [
    {
      "organizationId": 1,
      "totalRevenue": 30150,
      "totalProfit": 8550
    }
  ],
  "overtimeStatistics": [
    {
      "agentId": 4,
      "overtimeHours": 31,
      "regularHours": 0,
      "totalHours": 31
    }
  ]
}
```

## 📱 Frontend Changes Needed

### 1. Update Order Interface

**File:** `shared/dtos/order.dto.ts`

Remove:

```typescript
workReports?: WorkReportDto[];
```

### 2. Update Order Edit Component

**File:** `frontend/src/app/pages/order-edit/order-edit.component.html`

Replace "Work Report" tab to show Order data directly:

```html
<!-- Before: Loop through workReports -->
<mat-card *ngFor="let report of order.workReports">...</mat-card>

<!-- After: Show Order data -->
<mat-card>
  <h4>Работа выполнена</h4>
  <p>Обычные часы: {{ order.regularHours }}</p>
  <p>Переработка: {{ order.overtimeHours }}</p>
  <p>Оплата: {{ order.calculatedAmount }}</p>
  <img [src]="order.workPhotoUrl" />
  <p>{{ order.workNotes }}</p>
</mat-card>
```

### 3. Update API Call

**File:** `frontend/src/app/services/orders.service.ts`

```typescript
// Change endpoint
completeWork(orderId: number, data: WorkData): Observable<Order> {
  return this.http.post<Order>(
    `${this.apiUrl}/${orderId}/complete-work`,  // Changed endpoint
    data
  );
}
```

## 🎉 Result

### Database:

- ❌ work_reports table removed
- ✅ All data in orders table
- ✅ Simpler schema

### Backend:

- ❌ WorkReport entity removed
- ✅ All statistics from Order
- ✅ Cleaner code

### Architecture:

```
┌─────────────────────────────────┐
│  Order #6: "тестовый заказ"   │
│  ═══════════════════════════════ │
│                                  │
│  📊 Work Summary:                │
│  ├── regularHours: 0h            │
│  ├── overtimeHours: 31h          │
│  ├── calculatedAmount: 21,600₽  │
│  ├── carUsageAmount: 4,000₽     │
│  └── status: completed           │
│                                  │
│  📝 Work Details:                │
│  ├── workPhotoUrl: "..."         │
│  ├── workNotes: "..."            │
│  ├── distanceKm: 50              │
│  └── territoryType: "zone_1"     │
│                                  │
│  📸 Additional Files:            │
│  └── files[] → File entity       │
│                                  │
└──────────────────────────────────┘
```

## 📋 Checklist

- [x] Remove work_reports entity
- [x] Update Order entity (fields already existed)
- [x] Simplify createWorkReport method
- [x] Update statistics to use Order
- [x] Update salary calculations to use Order
- [x] Update reports service to use Order
- [x] Remove work_reports from all modules
- [x] Remove work_reports endpoints
- [x] Run migration script
- [x] Test compilation
- [ ] Update frontend Order interface
- [ ] Update frontend Order edit component
- [ ] Update frontend API calls
- [ ] Test end-to-end flow
- [ ] Deploy to production

## 🚀 Deployment

1. **Deploy Backend:**

   ```bash
   cd backend
   npm run build
   # Deploy to server
   ```

2. **Run Migration:**

   ```bash
   cd backend
   node migrate-order-aggregates.js
   ```

3. **Drop Table (if needed):**

   ```sql
   DROP TABLE IF EXISTS work_reports;
   ```

4. **Update Frontend:**
   - Remove workReports from Order interface
   - Update order-edit component
   - Change API endpoint to `/complete-work`

## 🎯 Final Architecture

**Order = Complete Contract**

- Work hours (regular + overtime)
- Payments (engineer + car + organization)
- Work details (photo, notes, location)
- Status lifecycle (waiting → working → completed)

**No more intermediate entities!** 🎉

**One entity to rule them all!** 👑
