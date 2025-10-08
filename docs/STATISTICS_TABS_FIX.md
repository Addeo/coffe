# Statistics Tabs Fix - Agent and Organization Earnings

## Problem Overview

The user reported two issues with the statistics dashboard:

1. **Agent Earnings Tab (Доходы агентов)** - Was showing empty data
2. **Organization Earnings Tab (Доходы организаций)** - Was showing confusing/incorrect data

## Root Causes Identified

### 1. Agent Earnings Tab Issues

**Problem:** The tab was empty because it relied solely on the `earnings_statistics` table, which may not have data if:
- Work reports were created recently and statistics haven't been calculated yet
- The system is new and doesn't have historical data

**Root Cause:** The `getAgentEarningsData()` method only queried the `earnings_statistics` table without a fallback mechanism.

### 2. Organization Earnings Tab Issues

**Problem:** The calculation was conceptually wrong.

**What it was showing:** Engineer costs (sum of `calculatedAmount` from work reports)
- `calculatedAmount` = hours × engineer's rate
- This represents **costs TO engineers** (expenses)

**What it should show:** Client revenue (what organizations pay)
- Should be: hours × organization's rate
- This represents **revenue FROM organizations** (income)

## Solutions Implemented

### Backend Changes (`statistics.service.ts`)

#### 1. Fixed Agent Earnings Calculation

**Before:**
```typescript
private async getAgentEarningsData(year: number, month: number): Promise<AgentEarningsData[]> {
  // Only queried earnings_statistics table
  const earningsStats = await this.earningsStatisticRepository
    .createQueryBuilder('stat')
    // ... rest of query
    .getMany();

  return earningsStats.map(...); // Returns empty if no data
}
```

**After:**
```typescript
private async getAgentEarningsData(year: number, month: number): Promise<AgentEarningsData[]> {
  // First try earnings_statistics table
  const earningsStats = await this.earningsStatisticRepository
    .createQueryBuilder('stat')
    // ... query
    .getMany();

  if (earningsStats.length > 0) {
    return earningsStats.map(...);
  }

  // FALLBACK: Calculate directly from work reports
  const agentData = await this.workReportRepository
    .createQueryBuilder('report')
    .select('engineer.userId', 'userId')
    .addSelect('SUM(report.calculatedAmount)', 'totalEarnings')
    .addSelect('COUNT(DISTINCT report.orderId)', 'completedOrders')
    // ... group by and calculate
    .getRawMany();

  return agentData.map(...);
}
```

**Benefits:**
- Always shows data if work reports exist
- Provides fallback when statistics table is not populated
- Maintains consistency with historical data when available

#### 2. Fixed Organization Earnings Calculation

**Before:**
```typescript
private async getOrganizationEarningsData(startDate: Date, endDate: Date): Promise<OrganizationEarningsData[]> {
  const organizationStats = await this.workReportRepository
    .createQueryBuilder('report')
    .addSelect('SUM(report.calculatedAmount)', 'totalEarnings') // WRONG! Engineer costs
    .addSelect('AVG(report.calculatedAmount)', 'averageOrderValue')
    // ... rest of query
}
```

**After:**
```typescript
private async getOrganizationEarningsData(startDate: Date, endDate: Date): Promise<OrganizationEarningsData[]> {
  const organizationStats = await this.workReportRepository
    .createQueryBuilder('report')
    .addSelect('SUM(report.totalHours * organization.baseRate)', 'totalEarnings') // CORRECT! Client revenue
    .addSelect('AVG(report.totalHours * organization.baseRate)', 'averageOrderValue')
    .andWhere('order.organizationId IS NOT NULL') // Added filter
    // ... rest of query
}
```

**Key Changes:**
- Changed calculation from `SUM(report.calculatedAmount)` to `SUM(report.totalHours * organization.baseRate)`
- Added filter to exclude records without organization
- This now correctly shows revenue FROM organizations

**Business Logic:**
- **Engineer Cost**: hours × engineer.baseRate → What we pay engineers
- **Client Revenue**: hours × organization.baseRate → What organizations pay us
- **Profit Margin**: Client Revenue - Engineer Cost

#### 3. Removed Unused Import

Removed `OrderStatus` import that was causing linter errors.

### Frontend Changes

#### 1. Updated Component HTML (`statistics.component.html`)

**Agent Earnings Tab:**
- Added subtitle explaining what the data represents: "Показывает начисленные суммы инженерам (затраты на персонал)"
- Added empty state message with helpful hints
- Updated column headers for clarity:
  - "Общий доход" → "Начислено (₽)"
  - "Средняя стоимость заказа" → "Средний чек (₽)"
  - "Выполненные заказы" → "Заказов"

**Organization Earnings Tab:**
- Changed tab label: "Доходы организаций" → "Доходы от организаций"
- Changed title: "Доходы организаций" → "Выручка от организаций"
- Added subtitle: "Показывает доходы от организаций-заказчиков (часы × ставка организации)"
- Added empty state message
- Updated column headers:
  - "Название организации" → "Организация-заказчик"
  - "Общий доход" → "Выручка (₽)"
  - "Всего заказов" → "Заказов"
  - "Средняя стоимость заказа" → "Средний чек (₽)"

#### 2. Added Empty State Styling (`statistics.component.scss`)

```scss
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  color: #666;
  text-align: center;

  mat-icon {
    font-size: 64px;
    width: 64px;
    height: 64px;
    margin-bottom: 16px;
    color: #999;
  }

  p {
    margin: 8px 0;
    font-size: 1rem;
  }

  .hint {
    font-size: 0.875rem;
    color: #999;
  }
}
```

## User Experience Improvements

### Before:
- ❌ Agent Earnings: Empty with no explanation
- ❌ Organization Earnings: Showing incorrect data (costs instead of revenue)
- ❌ No clear explanation of what each tab shows
- ❌ Confusing when no data exists

### After:
- ✅ Agent Earnings: Shows data from work reports if statistics not calculated
- ✅ Organization Earnings: Correctly shows client revenue
- ✅ Clear subtitles explaining what each section represents
- ✅ Friendly empty state messages with hints
- ✅ Better column headers for clarity

## Data Flow

### Agent Earnings:
1. Try to fetch from `earnings_statistics` table (pre-calculated)
2. If empty, calculate on-the-fly from `work_reports` table
3. Group by engineer (user)
4. Show: Total earnings, completed orders, average order value

### Organization Earnings:
1. Fetch from `work_reports` table (always fresh)
2. Join with `orders` and `organizations` tables
3. Calculate: `SUM(hours × organization.baseRate)`
4. Group by organization
5. Show: Total revenue, total orders, average order value

## Testing Recommendations

1. **Test with empty data:**
   - Verify empty states appear with helpful messages
   - Check that no errors occur

2. **Test with work reports:**
   - Create work reports for different engineers
   - Verify Agent Earnings shows correct sums
   - Verify Organization Earnings shows revenue (not costs)

3. **Test calculations:**
   - Verify Agent Earnings = engineer hours × engineer rate
   - Verify Organization Earnings = work hours × organization rate
   - Compare with manual calculations

4. **Test across months:**
   - Switch between different months
   - Verify data updates correctly
   - Check refresh functionality

## Files Modified

### Backend:
- `backend/src/modules/statistics/statistics.service.ts`

### Frontend:
- `frontend/src/app/pages/statistics/statistics.component.html`
- `frontend/src/app/pages/statistics/statistics.component.scss`

## Summary

The statistics tabs now:
1. **Always show data** when work reports exist (no more empty screens)
2. **Show correct financial data** (revenue vs. costs)
3. **Provide clear explanations** of what each section represents
4. **Have friendly empty states** when no data exists
5. **Use consistent, clear terminology** throughout

The fixes address both the technical issues (wrong calculations, missing fallbacks) and UX issues (unclear labels, no empty states).

