# Organization Earnings - Complete Financial Analysis

## Overview

Исправлена и улучшена система отображения доходов организаций в статистике. Теперь показывается полная финансовая картина: **выручка, затраты и прибыль** для каждой организации-заказчика.

## Problem Statement

Пользователь указал, что нужно отображать:

1. Все доходы со всех заказов (выручка от организаций)
2. Все расходы на зарплаты инженеров по заказам
3. Разницу (профицит/прибыль) после вычета одного из другого

**Пример:**

- Заказ может идти по 1000₽/час от организации
- Инженер получает 700₽/час
- Прибыль = 300₽/час

## Solution Implementation

### 1. Updated DTO (`shared/dtos/reports.dto.ts`)

**Before:**

```typescript
export interface OrganizationEarningsData {
  organizationId: number;
  organizationName: string;
  totalEarnings: number;
  totalOrders: number;
  averageOrderValue: number;
}
```

**After:**

```typescript
export interface OrganizationEarningsData {
  organizationId: number;
  organizationName: string;
  totalRevenue: number; // Выручка от организации (часы × ставка организации)
  totalCosts: number; // Затраты на инженеров (часы × ставка инженера)
  totalProfit: number; // Прибыль (выручка - затраты)
  profitMargin: number; // Маржа прибыли в процентах
  totalOrders: number;
  totalHours: number;
  averageOrderValue: number;
}
```

### 2. Backend Calculation (`backend/src/modules/statistics/statistics.service.ts`)

**New Calculation Logic:**

```typescript
private async getOrganizationEarningsData(startDate: Date, endDate: Date): Promise<OrganizationEarningsData[]> {
  // Calculate full financial picture for each organization:
  // 1. Revenue: hours × organization.baseRate (what organizations pay us)
  // 2. Costs: report.calculatedAmount (what we pay engineers)
  // 3. Profit: Revenue - Costs
  const organizationStats = await this.workReportRepository
    .createQueryBuilder('report')
    .select('order.organizationId', 'organizationId')
    .addSelect('organization.name', 'organizationName')
    .addSelect('COUNT(DISTINCT order.id)', 'totalOrders')
    .addSelect('SUM(report.totalHours)', 'totalHours')
    .addSelect('SUM(report.totalHours * organization.baseRate)', 'totalRevenue')
    .addSelect('SUM(report.calculatedAmount)', 'totalCosts')
    .addSelect('AVG(report.totalHours * organization.baseRate)', 'averageOrderValue')
    .leftJoin('report.order', 'order')
    .leftJoin('order.organization', 'organization')
    .where('report.submittedAt BETWEEN :startDate AND :endDate', { startDate, endDate })
    .andWhere('order.organizationId IS NOT NULL')
    .groupBy('order.organizationId')
    .addGroupBy('organization.name')
    .orderBy('totalRevenue', 'DESC')
    .getRawMany();

  return organizationStats.map(stat => {
    const totalRevenue = Number(stat.totalRevenue) || 0;
    const totalCosts = Number(stat.totalCosts) || 0;
    const totalProfit = totalRevenue - totalCosts;
    const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

    return {
      organizationId: stat.organizationId,
      organizationName: stat.organizationName || 'Unknown',
      totalRevenue,
      totalCosts,
      totalProfit,
      profitMargin: Number(profitMargin.toFixed(2)),
      totalOrders: Number(stat.totalOrders) || 0,
      totalHours: Number(stat.totalHours) || 0,
      averageOrderValue: Number(stat.averageOrderValue) || 0,
    };
  });
}
```

**Key Calculations:**

1. **Total Revenue (Выручка):**

   ```sql
   SUM(report.totalHours * organization.baseRate)
   ```

   - Что организация платит нам за работу
   - Например: 10 часов × 1000₽/час = 10,000₽

2. **Total Costs (Затраты):**

   ```sql
   SUM(report.calculatedAmount)
   ```

   - Что мы платим инженерам
   - Например: 10 часов × 700₽/час = 7,000₽

3. **Total Profit (Прибыль):**

   ```typescript
   totalRevenue - totalCosts;
   ```

   - Наша прибыль
   - Например: 10,000₽ - 7,000₽ = 3,000₽

4. **Profit Margin (Маржа):**

   ```typescript
   (totalProfit / totalRevenue) * 100;
   ```

   - Процент прибыли от выручки
   - Например: (3,000₽ / 10,000₽) × 100 = 30%

### 3. Frontend Component (`frontend/src/app/pages/statistics/statistics.component.ts`)

**Updated Columns:**

```typescript
organizationEarningsColumns = [
  'organizationName',
  'totalRevenue', // Выручка
  'totalCosts', // Затраты
  'totalProfit', // Прибыль
  'profitMargin', // Маржа
  'totalOrders', // Количество заказов
  'totalHours', // Всего часов
];
```

**New Helper Methods:**

```typescript
formatPercentage(value: number): string {
  return `${value.toFixed(2)}%`;
}

getProfitColor(profit: number): string {
  if (profit > 0) return '#4caf50'; // green for profit
  if (profit < 0) return '#f44336'; // red for loss
  return '#666'; // gray for zero
}

getProfitMarginColor(margin: number): string {
  if (margin >= 20) return '#4caf50'; // green for good margin (>=20%)
  if (margin >= 10) return '#ff9800'; // orange for ok margin (>=10%)
  if (margin > 0) return '#ffeb3b';   // yellow for low margin (>0%)
  return '#f44336'; // red for negative margin
}
```

### 4. Frontend Template (`frontend/src/app/pages/statistics/statistics.component.html`)

**New Table Structure:**

```html
<table
  mat-table
  [dataSource]="statistics()?.organizationEarnings || []"
  class="mat-elevation-z8 financial-table"
>
  <!-- Organization Name -->
  <ng-container matColumnDef="organizationName">
    <th mat-header-cell *matHeaderCellDef>Организация</th>
    <td mat-cell *matCellDef="let element" class="org-name">{{ element.organizationName }}</td>
  </ng-container>

  <!-- Total Revenue (Выручка) -->
  <ng-container matColumnDef="totalRevenue">
    <th mat-header-cell *matHeaderCellDef>Выручка (₽)</th>
    <td mat-cell *matCellDef="let element" class="revenue">
      {{ formatCurrency(element.totalRevenue) }}
    </td>
  </ng-container>

  <!-- Total Costs (Затраты) -->
  <ng-container matColumnDef="totalCosts">
    <th mat-header-cell *matHeaderCellDef>Затраты (₽)</th>
    <td mat-cell *matCellDef="let element" class="costs">
      {{ formatCurrency(element.totalCosts) }}
    </td>
  </ng-container>

  <!-- Total Profit (Прибыль) with color coding -->
  <ng-container matColumnDef="totalProfit">
    <th mat-header-cell *matHeaderCellDef>Прибыль (₽)</th>
    <td mat-cell *matCellDef="let element" class="profit">
      <span [style.color]="getProfitColor(element.totalProfit)" [style.font-weight]="'600'">
        {{ formatCurrency(element.totalProfit) }}
      </span>
    </td>
  </ng-container>

  <!-- Profit Margin (Маржа) with color coding -->
  <ng-container matColumnDef="profitMargin">
    <th mat-header-cell *matHeaderCellDef>Маржа (%)</th>
    <td mat-cell *matCellDef="let element" class="margin">
      <span [style.color]="getProfitMarginColor(element.profitMargin)" [style.font-weight]="'600'">
        {{ formatPercentage(element.profitMargin) }}
      </span>
    </td>
  </ng-container>

  <!-- Orders and Hours -->
  <ng-container matColumnDef="totalOrders">
    <th mat-header-cell *matHeaderCellDef>Заказов</th>
    <td mat-cell *matCellDef="let element">{{ formatNumber(element.totalOrders) }}</td>
  </ng-container>

  <ng-container matColumnDef="totalHours">
    <th mat-header-cell *matHeaderCellDef>Часов</th>
    <td mat-cell *matCellDef="let element">{{ formatNumber(element.totalHours) }}</td>
  </ng-container>
</table>
```

### 5. Styling (`frontend/src/app/pages/statistics/statistics.component.scss`)

```scss
&.financial-table {
  min-width: 900px;

  .org-name {
    font-weight: 500;
    color: #333;
  }

  .revenue {
    color: #2196f3; // Blue for revenue
    font-weight: 500;
  }

  .costs {
    color: #ff9800; // Orange for costs
    font-weight: 500;
  }

  .profit {
    font-weight: 600;
    // Color set dynamically based on value
  }

  .margin {
    font-weight: 600;
    // Color set dynamically based on value
  }

  td {
    white-space: nowrap;
  }
}
```

## Visual Design

### Color Coding System

**Profit Column:**

- 🟢 **Green** (#4caf50): Positive profit (прибыльно)
- 🔴 **Red** (#f44336): Negative profit (убыточно)
- ⚫ **Gray** (#666): Zero profit

**Profit Margin Column:**

- 🟢 **Green** (#4caf50): ≥20% (отличная маржа)
- 🟠 **Orange** (#ff9800): 10-19% (хорошая маржа)
- 🟡 **Yellow** (#ffeb3b): 1-9% (низкая маржа)
- 🔴 **Red** (#f44336): <0% (убыток)

**Other Columns:**

- 🔵 **Blue** (#2196f3): Revenue (выручка)
- 🟠 **Orange** (#ff9800): Costs (затраты)

## Example Output

### Sample Data Display

| Организация  | Выручка (₽) | Затраты (₽) | Прибыль (₽)       | Маржа (%)     | Заказов | Часов |
| ------------ | ----------- | ----------- | ----------------- | ------------- | ------- | ----- |
| ООО "Альфа"  | 500,000.00  | 350,000.00  | **150,000.00** 🟢 | **30.00%** 🟢 | 50      | 500   |
| ООО "Бета"   | 300,000.00  | 240,000.00  | **60,000.00** 🟢  | **20.00%** 🟢 | 30      | 300   |
| ООО "Гамма"  | 200,000.00  | 175,000.00  | **25,000.00** 🟢  | **12.50%** 🟠 | 20      | 200   |
| ООО "Дельта" | 150,000.00  | 140,000.00  | **10,000.00** 🟢  | **6.67%** 🟡  | 15      | 150   |

## Business Logic Explanation

### How It Works

1. **Work Report Creation:**
   - Engineer submits work report for an order
   - Report contains: hours worked, hourly rate
   - System calculates `calculatedAmount` = engineer's payment

2. **Revenue Calculation:**
   - System looks up organization's rate from `organizations` table
   - Calculates: `totalRevenue = hours × organization.baseRate`
   - This is what the organization pays **TO US**

3. **Cost Calculation:**
   - Sum of all `calculatedAmount` from work reports
   - This is what we pay **TO ENGINEERS**

4. **Profit Calculation:**
   - `totalProfit = totalRevenue - totalCosts`
   - Shows our actual profit from each organization

5. **Margin Calculation:**
   - `profitMargin = (totalProfit / totalRevenue) × 100`
   - Shows profitability as percentage

### Example Scenario

**Organization "Alpha Service":**

- Has baseRate: 1000₽/час

**Engineer Ivan:**

- Has baseRate: 700₽/час
- Works 10 hours on Order #123 from Alpha Service

**Calculation:**

```
Revenue from Alpha Service:  10h × 1000₽ = 10,000₽
Cost to pay Ivan:            10h × 700₽  = 7,000₽
Profit:                      10,000₽ - 7,000₽ = 3,000₽
Margin:                      (3,000₽ / 10,000₽) × 100 = 30%
```

## Benefits

### For Administrators/Managers

1. **Complete Financial Picture:**
   - See exactly how much each organization brings in
   - See exactly how much each organization costs us
   - Know our profit margin immediately

2. **Business Intelligence:**
   - Identify most profitable organizations
   - Identify organizations with low margins
   - Make data-driven decisions about pricing

3. **Visual Clarity:**
   - Color-coded profit indicators
   - Easy to spot good vs. bad margins
   - Quick financial health assessment

4. **Detailed Metrics:**
   - Total hours worked per organization
   - Number of orders completed
   - Average order value

## Files Modified

### Shared:

- `shared/dtos/reports.dto.ts` - Updated `OrganizationEarningsData` interface

### Backend:

- `backend/src/modules/statistics/statistics.service.ts` - Updated calculation logic

### Frontend:

- `frontend/src/app/pages/statistics/statistics.component.ts` - Added columns and helper methods
- `frontend/src/app/pages/statistics/statistics.component.html` - Updated table structure
- `frontend/src/app/pages/statistics/statistics.component.scss` - Added financial table styles

## Testing Recommendations

1. **Test with multiple organizations:**
   - Create work reports for different organizations
   - Verify revenue = hours × org.baseRate
   - Verify costs = sum of calculatedAmounts
   - Verify profit = revenue - costs
   - Verify margin = (profit / revenue) × 100

2. **Test edge cases:**
   - Organization with negative profit (costs > revenue)
   - Organization with zero profit
   - Organization with very high margin (>50%)
   - Organization with zero orders

3. **Test color coding:**
   - Verify green for positive profit
   - Verify red for negative profit
   - Verify margin colors change appropriately

4. **Test data accuracy:**
   - Compare with manual calculations
   - Verify totals match sum of individual work reports

## Summary

Система теперь отображает **полный финансовый анализ** по каждой организации:

✅ **Выручка** - что организация платит нам  
✅ **Затраты** - что мы платим инженерам  
✅ **Прибыль** - наша прибыль (выручка - затраты)  
✅ **Маржа** - процент прибыли от выручки

Все данные представлены с визуальным кодированием цветом для быстрого понимания финансового состояния каждой организации-заказчика.
