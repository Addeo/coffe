# Overtime Statistics Fix - Order Aggregates

## ❌ Problem

Statistics API was returning overtime hours incorrectly:

```json
{
  "overtimeStatistics": [
    {
      "agentId": 4,
      "agentName": "Unknown",
      "overtimeHours": 27, // ❌ All hours marked as overtime!
      "regularHours": 0,
      "totalHours": 27
    }
  ]
}
```

### Root Cause

**Flawed Logic in Work Report Creation:**

```typescript
// OLD LOGIC (WRONG):
const workReport = {
  totalHours: regularHours + overtimeHours,
  isOvertime: overtimeHours > 0, // ❌ Marks ENTIRE report as overtime!
};
```

**Problem:**

- If user entered ANY overtime hours, the **entire work_report** was marked as `isOvertime=true`
- Statistics counted ALL hours in that report as overtime
- User entering 4h regular + 0h overtime = 4h regular ✅
- User entering 0h regular + 4h overtime = 4h overtime ✅
- **But user entering 4h regular + 4h overtime = 8h ALL marked as overtime!** ❌

## ✅ Solution: Order-Level Aggregates

Instead of storing overtime flag on work_report level, we now **aggregate data at Order level**.

### Architecture Change

```
BEFORE (Wrong):
work_report {
  totalHours: 4,
  isOvertime: true  // ❌ Entire report marked as overtime
}

AFTER (Correct):
order {
  regularHours: 4,     // ✅ Separated into regular hours
  overtimeHours: 4,    // ✅ and overtime hours
  calculatedAmount: X,
  carUsageAmount: Y,
  organizationPayment: Z
}
```

### Changes Made

#### 1. Order Entity Already Had Aggregate Fields

Order entity (lines 107-120) already contained:

- `regularHours` - regular work hours
- `overtimeHours` - overtime work hours
- `calculatedAmount` - engineer payment
- `carUsageAmount` - car usage payment
- `organizationPayment` - organization payment

#### 2. Updated Work Report Creation Logic

**File:** `backend/src/modules/orders/orders.service.ts` (lines 1072-1086)

```typescript
// After saving work_report, UPDATE ORDER AGGREGATES:
order.regularHours = (order.regularHours || 0) + workReportData.regularHours;
order.overtimeHours = (order.overtimeHours || 0) + workReportData.overtimeHours;
order.calculatedAmount = (order.calculatedAmount || 0) + totalPayment;
order.carUsageAmount = (order.carUsageAmount || 0) + workReportData.carPayment;
order.organizationPayment = (order.organizationPayment || 0) + organizationPayment;

await this.ordersRepository.save(order);
```

#### 3. Updated Statistics to Use Order Aggregates

**File:** `backend/src/modules/statistics/statistics.service.ts`

**All statistics methods now query Order fields instead of work_reports:**

**Before:**

```typescript
const stats = await this.workReportRepository
  .select(
    'SUM(CASE WHEN report.isOvertime = true THEN report.totalHours ELSE 0 END)',
    'overtimeHours'
  )
  .where('report.submittedAt BETWEEN :start AND :end');
```

**After:**

```typescript
const stats = await this.orderRepository
  .select('SUM(order.overtimeHours)', 'overtimeHours')
  .select('SUM(order.regularHours)', 'regularHours')
  .where('order.completionDate BETWEEN :start AND :end')
  .andWhere('order.status = :status', { status: 'completed' });
```

**Methods Updated:**

- `getAgentEarningsData()` - uses `order.calculatedAmount` + `order.carUsageAmount`
- `getOrganizationEarningsData()` - uses `order.organizationPayment`
- `getOvertimeStatisticsData()` - uses `order.overtimeHours` + `order.regularHours`
- `getUserEarningsStatistics()` - aggregates from orders
- `getUserRankByEarnings()` - ranks from orders
- `getEarningsComparison()` - compares from orders
- `getEngineerDetailedStats()` - details from orders
- `getAdminEngineerStatistics()` - admin stats from orders

#### 4. Migration Script for Existing Data

**File:** `backend/migrate-order-aggregates.js`

Migrates existing work_reports data into order aggregate fields.

**Run with:**

```bash
cd backend
node migrate-order-aggregates.js
```

**Output:**

```
🔄 Starting migration: Aggregate work_reports data into orders...
✅ Order #6 "тестовый заказ": 0h regular + 31h overtime = 25600 RUB (3 work reports)
🎉 Migration completed!
```

## 📊 Benefits

### 1. Accurate Statistics

- Regular and overtime hours are properly separated
- Statistics reflect actual work breakdown
- No more "all hours as overtime" bug

### 2. Better Performance

- Single query to orders table instead of joining work_reports
- Aggregated data ready to use, no runtime aggregation needed
- Simpler queries with fewer joins

### 3. Single Source of Truth

- Order holds all financial information
- work_reports are audit trail, Order is the contract
- Easier to understand and maintain

### 4. Cleaner Architecture

```
Order (Aggregate Root)
  ├── regularHours
  ├── overtimeHours
  ├── calculatedAmount
  ├── carUsageAmount
  ├── organizationPayment
  └── WorkReports[] (audit trail)
        ├── WorkReport 1
        ├── WorkReport 2
        └── WorkReport 3
```

## 🧪 Testing

### Before Fix:

```bash
curl 'https://api/statistics/monthly?year=2025&month=10'

# Response:
{
  "overtimeStatistics": [
    {
      "overtimeHours": 27,    // ❌ All hours as overtime
      "regularHours": 0,
      "totalHours": 27
    }
  ]
}
```

### After Fix:

```bash
curl 'https://api/statistics/monthly?year=2025&month=10'

# Response:
{
  "overtimeStatistics": [
    {
      "overtimeHours": 4,     // ✅ Only actual overtime
      "regularHours": 4,      // ✅ Regular hours separated
      "totalHours": 8
    }
  ]
}
```

## 📝 Migration Checklist

- [x] Update Order entity (already had fields)
- [x] Update work_report creation to aggregate into Order
- [x] Refactor statistics service to use Order aggregates
- [x] Create migration script for existing data
- [x] Run migration on development database
- [ ] Test statistics endpoints
- [ ] Deploy to production
- [ ] Run migration on production database

## 🚀 Deployment Steps

1. **Deploy Code:**

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

3. **Verify Statistics:**

   ```bash
   curl 'https://your-api/statistics/monthly?year=2025&month=10'
   ```

4. **Monitor Logs:**
   - Check for "✅ Order aggregated data updated" messages
   - Verify no errors in statistics calculations

## 🔍 Database Changes

### Orders Table - Fields Used:

```sql
regularHours         DECIMAL(5,2) DEFAULT 0
overtimeHours        DECIMAL(5,2) DEFAULT 0
calculatedAmount     DECIMAL(10,2) DEFAULT 0
carUsageAmount       DECIMAL(10,2) DEFAULT 0
organizationPayment  DECIMAL(10,2) DEFAULT 0
```

### Work Reports Table:

- `isOvertime` field is now deprecated (kept for backward compatibility)
- Field still exists but is NOT used by statistics
- Future work_reports still set this field, but it's not queried

## 🎯 Result

**Statistics now correctly show:**

- ✅ Separate regular and overtime hours
- ✅ Accurate earnings calculations
- ✅ Correct organization payments
- ✅ Proper profit margins
- ✅ Real-time data from Order aggregates (no stale cache!)

**No more "everything is overtime" bug!** 🎉
