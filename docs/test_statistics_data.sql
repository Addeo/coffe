-- Тестовые данные для проверки статистики
-- Используем существующих пользователей и организации

-- ============================================
-- ЗАКАЗ #1: Иванов И.И. для ООО "Альфа"
-- ============================================
-- Обычные часы: 8ч, Переработка: 2ч, Машина: 500₽
-- Инженер (индивидуальные ставки): 750₽/ч базовая, 1,125₽/ч переработка
-- Организация: 900₽/ч × 1.5 коэф.

UPDATE orders 
SET 
  status = 'completed',
  completionDate = '2025-10-05 18:00:00',
  actualStartDate = '2025-10-05 09:00:00',
  regularHours = 8,
  overtimeHours = 2,
  engineerBaseRate = 750,
  engineerOvertimeRate = 1125,
  organizationBaseRate = 900,
  organizationOvertimeMultiplier = 1.5,
  regularPayment = 6000,        -- 8 × 750
  overtimePayment = 2250,       -- 2 × 1,125
  calculatedAmount = 8250,      -- 6,000 + 2,250
  organizationRegularPayment = 7200,   -- 8 × 900
  organizationOvertimePayment = 2700,  -- 2 × 900 × 1.5
  organizationPayment = 9900,   -- 7,200 + 2,700
  carUsageAmount = 500,
  profit = 1650,                -- 9,900 - 8,250
  workNotes = 'Работа выполнена качественно, без замечаний'
WHERE id = 1;

-- ============================================
-- ЗАКАЗ #2: Петров П.П. для ООО "Бета"
-- ============================================
-- Обычные часы: 6ч, Переработка: 3ч, Машина: 400₽
-- Инженер (индивидуальные ставки): 700₽/ч базовая, 1,050₽/ч переработка
-- Организация: 800₽/ч × 1.5 коэф.

UPDATE orders 
SET 
  status = 'completed',
  completionDate = '2025-10-10 17:30:00',
  actualStartDate = '2025-10-10 10:00:00',
  regularHours = 6,
  overtimeHours = 3,
  engineerBaseRate = 700,
  engineerOvertimeRate = 1050,
  organizationBaseRate = 800,
  organizationOvertimeMultiplier = 1.5,
  regularPayment = 4200,        -- 6 × 700
  overtimePayment = 3150,       -- 3 × 1,050
  calculatedAmount = 7350,      -- 4,200 + 3,150
  organizationRegularPayment = 4800,   -- 6 × 800
  organizationOvertimePayment = 3600,  -- 3 × 800 × 1.5
  organizationPayment = 8400,   -- 4,800 + 3,600
  carUsageAmount = 400,
  profit = 1050,                -- 8,400 - 7,350
  workNotes = 'Переработка из-за сложности задачи'
WHERE id = 2;

-- ============================================
-- ЗАКАЗ #3: Сидоров С.С. для ООО "Гамма"
-- ============================================
-- Обычные часы: 10ч, Переработка: 0ч, Машина: 600₽
-- Инженер (базовые ставки): 800₽/ч базовая, 1,200₽/ч переработка
-- Организация: 1,000₽/ч × 2.0 коэф.

UPDATE orders 
SET 
  status = 'completed',
  completionDate = '2025-10-15 19:00:00',
  actualStartDate = '2025-10-15 09:00:00',
  regularHours = 10,
  overtimeHours = 0,
  engineerBaseRate = 800,
  engineerOvertimeRate = 1200,
  organizationBaseRate = 1000,
  organizationOvertimeMultiplier = 2.0,
  regularPayment = 8000,        -- 10 × 800
  overtimePayment = 0,          -- 0 × 1,200
  calculatedAmount = 8000,      -- 8,000 + 0
  organizationRegularPayment = 10000,  -- 10 × 1,000
  organizationOvertimePayment = 0,     -- 0 × 1,000 × 2.0
  organizationPayment = 10000,  -- 10,000 + 0
  carUsageAmount = 600,
  profit = 2000,                -- 10,000 - 8,000
  workNotes = 'Работа в пределах нормы'
WHERE id = 3;

-- ============================================
-- ЗАКАЗ #4: Иванов И.И. для ООО "Альфа"
-- ============================================
-- Обычные часы: 7ч, Переработка: 4ч, Машина: 450₽
-- Инженер (индивидуальные ставки): 750₽/ч базовая, 1,125₽/ч переработка
-- Организация: 900₽/ч × 1.5 коэф.

UPDATE orders 
SET 
  status = 'completed',
  completionDate = '2025-10-20 20:00:00',
  actualStartDate = '2025-10-20 09:00:00',
  regularHours = 7,
  overtimeHours = 4,
  engineerBaseRate = 750,
  engineerOvertimeRate = 1125,
  organizationBaseRate = 900,
  organizationOvertimeMultiplier = 1.5,
  regularPayment = 5250,        -- 7 × 750
  overtimePayment = 4500,       -- 4 × 1,125
  calculatedAmount = 9750,      -- 5,250 + 4,500
  organizationRegularPayment = 6300,   -- 7 × 900
  organizationOvertimePayment = 5400,  -- 4 × 900 × 1.5
  organizationPayment = 11700,  -- 6,300 + 5,400
  carUsageAmount = 450,
  profit = 1950,                -- 11,700 - 9,750
  workNotes = 'Много переработки, сложный заказ'
WHERE id = 4;

-- ============================================
-- ЗАКАЗ #5: Сидоров С.С. для ООО "Бета"
-- ============================================
-- Обычные часы: 9ч, Переработка: 1ч, Машина: 350₽
-- Инженер (базовые ставки): 800₽/ч базовая, 1,200₽/ч переработка
-- Организация: 800₽/ч × 1.5 коэф.

UPDATE orders 
SET 
  status = 'completed',
  completionDate = '2025-10-25 18:30:00',
  actualStartDate = '2025-10-25 09:00:00',
  regularHours = 9,
  overtimeHours = 1,
  engineerBaseRate = 800,
  engineerOvertimeRate = 1200,
  organizationBaseRate = 800,
  organizationOvertimeMultiplier = 1.5,
  regularPayment = 7200,        -- 9 × 800
  overtimePayment = 1200,       -- 1 × 1,200
  calculatedAmount = 8400,      -- 7,200 + 1,200
  organizationRegularPayment = 7200,   -- 9 × 800
  organizationOvertimePayment = 1200,  -- 1 × 800 × 1.5
  organizationPayment = 8400,   -- 7,200 + 1,200
  carUsageAmount = 350,
  profit = 0,                   -- 8,400 - 8,400 = 0 (нулевая прибыль!)
  workNotes = 'Стандартная работа'
WHERE id = 5;

-- ============================================
-- ПРОВЕРКА РЕЗУЛЬТАТОВ
-- ============================================

-- Статистика для Иванова И.И. (userId = 4 или assignedEngineerId из orders)
SELECT 
  'Иванов И.И.' as engineer,
  COUNT(*) as orders,
  SUM(regularHours + overtimeHours) as total_hours,
  SUM(calculatedAmount + carUsageAmount) as engineer_earnings,
  SUM(organizationPayment + carUsageAmount) as organization_payments,
  SUM(profit) as total_profit,
  ROUND((SUM(profit) * 100.0) / SUM(organizationPayment + carUsageAmount), 1) as profit_margin
FROM orders
WHERE assignedEngineerId = (SELECT id FROM engineer WHERE userId = 4)
  AND status = 'completed'
  AND completionDate >= '2025-10-01'
  AND completionDate < '2025-11-01';

-- Ожидаемый результат:
-- orders: 2
-- total_hours: 21
-- engineer_earnings: 18,950
-- organization_payments: 22,300
-- total_profit: 3,600
-- profit_margin: 16.1%

-- Общая статистика за октябрь
SELECT 
  COUNT(*) as total_orders,
  SUM(regularHours + overtimeHours) as total_hours,
  SUM(calculatedAmount + carUsageAmount) as total_engineer_earnings,
  SUM(organizationPayment + carUsageAmount) as total_organization_payments,
  SUM(profit) as total_profit,
  ROUND((SUM(profit) * 100.0) / SUM(organizationPayment + carUsageAmount), 1) as avg_margin
FROM orders
WHERE status = 'completed'
  AND completionDate >= '2025-10-01'
  AND completionDate < '2025-11-01';

-- Ожидаемый результат:
-- total_orders: 5
-- total_hours: 50
-- total_engineer_earnings: 44,050
-- total_organization_payments: 50,450
-- total_profit: 6,650
-- avg_margin: 13.2%

