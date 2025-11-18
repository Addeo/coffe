# Database Migration: Orders Relations Fix

## Проблема

При запросе списка заказов через API инженеры получали данные с пустыми relations:

- `organization: null` (вместо объекта Organization)
- `assignedEngineer: null` (вместо объекта Engineer)
- `createdBy: null` или неполные данные
- `assignedBy: null` или неполные данные

При этом поля `organizationId`, `assignedEngineerId`, `createdById`, `assignedById` были заполнены корректно.

## Причина

TypeORM entities используют snake_case для foreign key колонок (`organization_id`, `assigned_engineer_id`), но данные в базе были записаны в camelCase колонки (`organizationId`, `assignedEngineerId`).

Это произошло из-за того, что изначально в entity не были указаны `@JoinColumn({ name: 'snake_case_name' })`, и TypeORM создал дублирующие колонки.

## Решение

### 1. SQL Migration

Выполнена миграция данных из camelCase колонок в snake_case:

```sql
-- Миграция для таблицы orders
UPDATE orders
SET organization_id = organizationId
WHERE organization_id IS NULL AND organizationId IS NOT NULL;

UPDATE orders
SET assigned_engineer_id = assignedEngineerId
WHERE assigned_engineer_id IS NULL AND assignedEngineerId IS NOT NULL;

UPDATE orders
SET created_by = createdById
WHERE created_by IS NULL AND createdById IS NOT NULL;

UPDATE orders
SET assigned_by = assignedById
WHERE assigned_by IS NULL AND assignedById IS NOT NULL;
```

### 2. Verification

После миграции можно проверить результат:

```sql
SELECT
  id,
  organizationId, organization_id,
  assignedEngineerId, assigned_engineer_id,
  createdById, created_by,
  assignedById, assigned_by
FROM orders;
```

Обе колонки (camelCase и snake_case) должны содержать одинаковые значения.

## Результат

После миграции API корректно возвращает данные с заполненными relations:

```json
{
  "id": 5,
  "title": "Тестовый заказ для статистики",
  "status": "completed",
  "organization": {
    "id": 4,
    "name": "Вистекс",
    "baseRate": 700,
    "isActive": true
  },
  "assignedEngineer": {
    "id": 4,
    "user": {
      "id": 4,
      "firstName": "Stavropol",
      "lastName": "Stavropol",
      "email": "ingenerStavropol@mail.com"
    }
  },
  "createdBy": {
    "id": 1,
    "firstName": "Admin",
    "lastName": "User",
    "email": "admin@coffee.com"
  }
}
```

## Аналогичные проблемы

Эта же проблема наблюдалась и была исправлена в других таблицах:

1. **engineers** - `user_id` vs `userId`
2. **engineer_organization_rates** - `engineer_id` vs `engineerId`, `organization_id` vs `organizationId`
3. **work_reports** - `engineer_id` vs `engineerId`, `order_id` vs `orderId`

## Рекомендации для Production

### 1. Создать единую миграцию

Объединить все SQL-миграции в один файл и выполнить на production базе:

```sql
-- migration_fix_foreign_keys.sql

-- Orders
UPDATE orders SET organization_id = organizationId WHERE organization_id IS NULL;
UPDATE orders SET assigned_engineer_id = assignedEngineerId WHERE assigned_engineer_id IS NULL;
UPDATE orders SET created_by = createdById WHERE created_by IS NULL;
UPDATE orders SET assigned_by = assignedById WHERE assigned_by IS NULL;

-- Engineers
UPDATE engineers SET user_id = userId WHERE user_id IS NULL;

-- Engineer Organization Rates
UPDATE engineer_organization_rates
SET engineer_id = engineerId WHERE engineer_id IS NULL;

UPDATE engineer_organization_rates
SET organization_id = organizationId WHERE organization_id IS NULL;

-- Work Reports (если есть)
UPDATE work_reports SET engineer_id = engineerId WHERE engineer_id IS NULL;
UPDATE work_reports SET order_id = orderId WHERE order_id IS NULL;
```

### 2. Удалить дублирующие колонки (опционально)

После миграции можно удалить старые camelCase колонки, но **ВНИМАТЕЛЬНО**:

```sql
-- ВНИМАНИЕ: Выполнять только после полного тестирования!
-- SQLite не поддерживает DROP COLUMN напрямую, нужна пересоздание таблицы

-- Для других БД (PostgreSQL, MySQL):
-- ALTER TABLE orders DROP COLUMN organizationId;
-- ALTER TABLE orders DROP COLUMN assignedEngineerId;
-- и т.д.
```

### 3. Предотвратить будущие проблемы

В TypeORM entities всегда явно указывать имена колонок для foreign keys:

```typescript
@ManyToOne(() => Organization)
@JoinColumn({ name: 'organization_id' }) // ✅ Явное указание
organization: Organization;

@Column({ name: 'organization_id' }) // ✅ Явное указание
organizationId: number;
```

### 4. Добавить проверку в CI/CD

Создать скрипт для проверки консистентности данных:

```sql
-- check_data_consistency.sql
SELECT 'Orders with null organization' as issue, COUNT(*) as count
FROM orders WHERE organization_id IS NULL AND organizationId IS NOT NULL
UNION ALL
SELECT 'Orders with null engineer', COUNT(*)
FROM orders WHERE assigned_engineer_id IS NULL AND assignedEngineerId IS NOT NULL
UNION ALL
SELECT 'Engineers with null user', COUNT(*)
FROM engineers WHERE user_id IS NULL AND userId IS NOT NULL;
```

Если какой-то COUNT > 0, значит есть проблема.

## Статус

✅ **ИСПРАВЛЕНО** - Все relations в Orders теперь загружаются корректно
✅ **ПРОТЕСТИРОВАНО** - API возвращает полные данные для инженеров
✅ **ЗАДОКУМЕНТИРОВАНО** - Создана документация для production deployment

## См. также

- `STATISTICS_DASHBOARD_FIX.md` - Исправления статистики
- `STATISTICS_FIX_SUMMARY.md` - Общий обзор исправлений системы статистики
