# XLS Export Feature

## Overview

Added Excel export functionality to the Orders page, allowing users to download a comprehensive report of orders with financial details.

## Implementation Details

### Dependencies

- **Library**: `xlsx` (SheetJS)
- **Installation**: Installed with `--legacy-peer-deps` flag to avoid dependency conflicts

### Location

- **Component**: `frontend/src/app/pages/orders/orders.component.ts`
- **Template**: `frontend/src/app/pages/orders/orders.component.html`

## Exported Data Columns

The Excel export includes the following columns with detailed order information:

1. **ID заказа** - Order ID
2. **Название заказа** - Order title
3. **Организация-заказчик** - Client organization name
4. **Инженер** - Assigned engineer name
5. **Статус** - Order status
6. **Ставка оплаты от организации (₽/час)** - Organization base rate (₽/hour)
7. **Коэффициент переработки организации** - Organization overtime multiplier
8. **Ставка оплаты инженера (₽/час)** - Engineer base rate (₽/hour)
9. **Ставка переработки инженера (₽/час)** - Engineer overtime rate (₽/hour)
10. **Обычные часы** - Regular hours worked
11. **Часы переработки** - Overtime hours worked
12. **Всего часов** - Total hours (regular + overtime)
13. **Сумма к оплате от организации (₽)** - Total amount payable by organization
14. **Оплата инженеру за работу (₽)** - Engineer payment for work
15. **Доплата за автомобиль (₽)** - Car usage payment
16. **Всего к оплате инженеру (₽)** - Total engineer payment
17. **ДОХОД (₽)** - PROFIT (organization payment - engineer payment)
18. **Дата создания** - Order creation date
19. **Дата начала работ** - Work start date
20. **Дата завершения** - Work completion date

## Features

### Smart Data Export

- Exports all currently visible/filtered orders from the data table
- Respects active status filters
- Includes search/filter results

### User Experience

- **Button location**: Top right of the Orders page, next to "Refresh" and "Create Order" buttons
- **Button style**: Accent color with download icon
- **Validation**: Checks if data exists before export
- **Success notification**: Toast message confirms successful export
- **Error handling**: Shows error message if no data available

### File Details

- **Format**: Excel (.xlsx)
- **Filename pattern**: `orders_export_YYYY-MM-DD.xlsx`
- **Sheet name**: "Заказы" (Orders)
- **Column widths**: Pre-configured for optimal readability

## Usage

1. Navigate to the Orders page (`/orders`)
2. (Optional) Apply filters to narrow down the data
3. Click the "Скачать XLS" (Download XLS) button
4. The Excel file will be downloaded automatically to your default downloads folder

## Technical Implementation

### Method: `exportToExcel()`

```typescript
exportToExcel() {
  // 1. Validate data exists
  // 2. Map order data to export format
  // 3. Calculate totals and derived values
  // 4. Create Excel worksheet with formatted data
  // 5. Set column widths for readability
  // 6. Generate workbook and download file
  // 7. Show success notification
}
```

### Key Calculations

- **Total Hours**: `regularHours + overtimeHours`
- **Total Engineer Payment**: `calculatedAmount + carUsageAmount`
- **Profit**: `organizationPayment - engineerPayment` (or uses pre-calculated `order.profit`)

### Data Safety

- Uses nullish coalescing (`??`) to handle missing data
- Defaults numeric values to `0`
- Defaults strings to `'N/A'` or empty string
- Formats dates using Russian locale (`ru-RU`)

## Future Enhancements

Potential improvements for future development:

1. **Date range filtering**: Export orders within a specific date range
2. **Custom column selection**: Allow users to choose which columns to export
3. **Multiple formats**: Support for CSV, PDF exports
4. **Summary sheet**: Add a summary sheet with aggregated statistics
5. **Template customization**: Allow users to save export templates
6. **Scheduled exports**: Automatic periodic exports via email

## Notes

- The export uses the current data in `MatTableDataSource`, respecting any active filters
- Large datasets are handled efficiently by the `xlsx` library
- The export is client-side, no server processing required
- Date formatting follows Russian locale conventions

## Testing

To test the export functionality:

1. Ensure orders exist in the system
2. Apply different filters (status, search)
3. Click "Скачать XLS" and verify:
   - File downloads successfully
   - File opens in Excel/LibreOffice
   - All data is present and formatted correctly
   - Column widths are appropriate
   - Calculations are accurate (especially profit)
