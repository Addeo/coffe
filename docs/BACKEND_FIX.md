# Исправление ошибки 500 в backend

## Проблема

При загрузке страницы статистики возникала ошибка 500 на `/api/orders/stats`.

## Причина

В методе `getOrderStats` в `orders.service.ts` происходила попытка вызвать `.where()` несколько раз на одном `QueryBuilder`. Метод `.where()` перезаписывает предыдущие условия, поэтому повторные вызовы приводили к некорректным SQL-запросам.

## Решение

Использован метод `.clone()` для создания независимых копий QueryBuilder перед применением дополнительных условий.

### Было:
```typescript
const completedOrders = await paymentQuery
  .where('order.status IN (:...statuses)', { 
    statuses: [OrderStatus.COMPLETED, OrderStatus.PAID_TO_ENGINEER] 
  })
  .getCount();

const receivedFromOrg = await paymentQuery
  .where('order.status IN (:...statuses)', { ... })  // ← ПЕРЕЗАПИСЫВАЕТ ПРЕДЫДУЩЕЕ where!
  .andWhere('order.receivedFromOrganization = :received', { received: true })
  .getCount();
```

### Стало:
```typescript
const completedOrdersQuery = paymentQuery.clone();
const completedOrders = await completedOrdersQuery
  .andWhere('order.status IN (:...statuses)', { 
    statuses: [OrderStatus.COMPLETED, OrderStatus.PAID_TO_ENGINEER] 
  })
  .getCount();

const receivedFromOrgQuery = paymentQuery.clone();
const receivedFromOrg = await receivedFromOrgQuery
  .andWhere('order.status IN (:...statuses)', { ... })
  .andWhere('order.receivedFromOrganization = :received', { received: true })
  .getCount();
```

## Статус

✅ Исправлено в файле `backend/src/modules/orders/orders.service.ts`

## Для применения исправления

```bash
cd backend
npm run build
npm run start:dev
```

